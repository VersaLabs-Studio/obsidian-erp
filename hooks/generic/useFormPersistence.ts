// hooks/generic/useFormPersistence.ts
// Obsidian ERP v4.0 — Phase 2Y Part 2: Global Draft Autosave.
//
// Persists form state to localStorage with a debounced write, restores on
// mount, and clears on successful submit. Survives reload + navigation.
//
// Usage:
//   const form = useForm<MyForm>({ defaultValues });
//   useFormPersistence(form, "Sales Invoice", "new");
//
// The hook stores under key `draft:<doctype>:<id>` (e.g.
// `draft:Sales Invoice:new` or `draft:Sales Invoice:SO-0001`).
// On mount it restores any persisted values. On change it debounces writes
// (1 s default). On a successful submit the caller invokes `clear()` or
// the hook auto-clears when `clearOnSubmit` is true.
//
// P2 — Factory Pattern. This is the ONE persistence hook for all forms.
// No bespoke save/restore logic per page.

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { UseFormReturn, FieldValues } from "react-hook-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseFormPersistenceOptions {
  /** Debounce interval in ms (default: 1000) */
  debounceMs?: number;
  /** Whether to auto-clear on unmount after a successful submit (default: true) */
  clearOnSubmit?: boolean;
  /** Whether to restore persisted data on mount (default: true) */
  restoreOnMount?: boolean;
  /** Maximum age in ms before a draft is considered stale (default: 7 days) */
  maxAgeMs?: number;
}

interface PersistedDraft<T extends FieldValues> {
  /** ISO timestamp of when the draft was persisted */
  savedAt: string;
  /** The form values snapshot */
  values: Partial<T>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DEBOUNCE_MS = 1000;
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_PREFIX = "draft:";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageKey(doctype: string, id: string): string {
  return `${STORAGE_PREFIX}${doctype}:${id}`;
}

function isStale(savedAt: string, maxAgeMs: number): boolean {
  try {
    return Date.now() - new Date(savedAt).getTime() > maxAgeMs;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Persist form state to localStorage with debounced writes.
 * Restores on mount, clears on submit.
 *
 * @param form — The react-hook-form instance returned by useForm()
 * @param doctype — The DocType name (e.g. "Sales Invoice")
 * @param id — The document id, or "new" for create forms
 * @param options — Configuration options
 */
export function useFormPersistence<T extends FieldValues>(
  form: UseFormReturn<T>,
  doctype: string,
  id: string,
  options?: UseFormPersistenceOptions,
): {
  /** Manually clear the persisted draft */
  clear: () => void;
  /** Check if a draft exists for this form */
  hasDraft: boolean;
} {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    clearOnSubmit = true,
    restoreOnMount = true,
    maxAgeMs = DEFAULT_MAX_AGE_MS,
  } = options ?? {};

  const key = storageKey(doctype, id);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringRef = useRef(false);
  const submittedRef = useRef(false);

  // -- Check for existing draft -------------------------------------------
  let hasDraft = false;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedDraft<T>;
        hasDraft = !isStale(parsed.savedAt, maxAgeMs);
      }
    } catch {
      hasDraft = false;
    }
  }

  // -- Clear function (stable reference) ----------------------------------
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage may be unavailable (incognito, quota, etc.)
    }
  }, [key]);

  // -- Restore on mount ---------------------------------------------------
  useEffect(() => {
    if (!restoreOnMount) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedDraft<T>;
      if (isStale(parsed.savedAt, maxAgeMs)) {
        localStorage.removeItem(key);
        return;
      }
      isRestoringRef.current = true;
      // Only restore fields that are currently empty — never overwrite
      // user-typed values (e.g. from a URL param prefill).
      const current = form.getValues();
      const restored: Partial<T> = {};
      for (const [k, v] of Object.entries(parsed.values)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentVal = (current as any)[k];
        // Restore if the current value is empty/undefined and the stored
        // value is not. Items array is always restored wholesale since it
        // represents user-added line items.
        if (k === "items" && Array.isArray(v) && v.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (restored as any)[k] = v;
        } else if (
          (currentVal === "" || currentVal === undefined || currentVal === null) &&
          v !== "" && v !== undefined && v !== null
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (restored as any)[k] = v;
        }
      }
      if (Object.keys(restored).length > 0) {
        form.reset({ ...current, ...restored } as T);
      }
      // Use a microtask to flip the restoring flag after the current
      // render cycle, so the first watch-triggered save is not suppressed.
      queueMicrotask(() => {
        isRestoringRef.current = false;
      });
    } catch {
      isRestoringRef.current = false;
    }
    // Only run on mount — do NOT re-run when form/doctype/id change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Debounced persist on form change -----------------------------------
  useEffect(() => {
    // When the form is submitted, clear and stop watching.
    if (submittedRef.current) return;

    const subscription = form.watch((values) => {
      // Skip writes triggered by the restore itself.
      if (isRestoringRef.current) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        try {
          const draft: PersistedDraft<T> = {
            savedAt: new Date().toISOString(),
            values: values as Partial<T>,
          };
          localStorage.setItem(key, JSON.stringify(draft));
        } catch {
          // Quota exceeded or unavailable — silently ignore.
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [form, key, debounceMs]);

  // -- Auto-clear on successful submit ------------------------------------
  useEffect(() => {
    if (!clearOnSubmit) return;

    const originalOnSuccess = form.handleSubmit(() => {});
    // We intercept the form's isSubmitSuccessful flag instead.
    // When a submit succeeds, clear the draft.
    const { isSubmitSuccessful } = form.formState;
    if (isSubmitSuccessful) {
      submittedRef.current = true;
      clear();
    }
  }, [form.formState.isSubmitSuccessful, clearOnSubmit, clear]);

  return { clear, hasDraft };
}

export default useFormPersistence;
