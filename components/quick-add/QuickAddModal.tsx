"use client";

// components/quick-add/QuickAddModal.tsx
// Obsidian ERP v4.0 — Inline Quick-Add Modal (master §11).
//
// A Radix Dialog overlay that renders a registry-driven minimal create form,
// POSTs via the existing create handler, and resolves `{ name }` to the
// caller. The host wizard's react-hook-form state is never unmounted — only
// the modal is mounted/unmounted on top.
//
// Supports nested quick-add (Address from inside Customer) via a recursive
// `<QuickAddModal>` keyed by a separate context id. The host's open/close
// is owned by the parent `QuickAddField` or any other caller.

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { FormSelect } from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { getApiPath } from "@/lib/doctype-config";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { cn } from "@/lib/utils";
import type {
  QuickAddEntry,
  QuickAddFieldSpec,
} from "@/lib/flows/quick-add-registry";

// ---------------------------------------------------------------------------
// Resolver type — the promise the modal resolves to on success
// ---------------------------------------------------------------------------
export type QuickAddResult = { name: string; doctype: string };

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: QuickAddEntry;
  /** Optional seed values (e.g. parent link_doctype + link_name for Address) */
  seed?: Record<string, unknown>;
  /** Called on success with the new record's name */
  onSuccess?: (result: QuickAddResult) => void;
  /** Optional pre-existing nested call so the modal can render a small note */
  nested?: boolean;
}

export function QuickAddModal({
  open,
  onOpenChange,
  entry,
  seed,
  onSuccess,
  nested = false,
}: QuickAddModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolution, showError, dismiss } = useGuidedError();

  // 2M Part 0A: memoize `defaultValues` against the entry's *field-name list*
  // (not the array identity — every parent render rebuilds the fields array).
  // The field set per doctype is static in the registry, so keying on
  // `entry.doctype` is the safest stable signal.
  const defaultValues = useMemo(() => {
    return Object.fromEntries(
      entry.fields.map((f) => [f.name, ""]),
    ) as Record<string, string>;
  }, [entry.doctype, entry.fields]);

  // 2M Part 0A: serialize `seed` to a stable string for the dep array
  // (seeds are tiny flat string maps in practice).
  const seedKey = useMemo(
    () => (seed ? JSON.stringify(seed) : ""),
    [seed],
  );

  const form = useForm<Record<string, string>>({
    defaultValues: { ...defaultValues, ...(seed as Record<string, string>) },
  });
  const { control, handleSubmit, reset } = form;

  // 2M Part 0A: reset only on the false→true open transition (not every
  // render). Track the previous `open` with a ref so the effect's dep array
  // is just `[open]` and the body can reference `reset`/`merged` without
  // re-firing on a new `merged` ref.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (open && !wasOpen) {
      reset({ ...defaultValues, ...(seed as Record<string, string>) });
    }
  }, [open, reset, defaultValues, seed]);

  // POST via the existing create handler — same path the master "new" page uses
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >(entry.doctype, {
    showToast: false, // we'll surface our own toast/notification
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (!name) return;
      // Invalidate the select query so the new record appears immediately
      queryClient.invalidateQueries({ queryKey: [entry.doctype] });
      // Also invalidate any related doctype that might filter by this one
      queryClient.invalidateQueries({ queryKey: [getApiPath(entry.doctype)] });
      onSuccess?.({ name, doctype: entry.doctype });
      onOpenChange(false);
    },
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: entry.doctype })),
  });

  const onSubmit = useCallback(
    (values: Record<string, string>) => {
      createMutation.mutate(values as Record<string, unknown>);
    },
    [createMutation],
  );

  // ESC / backdrop → resolve null (host keeps prior value)
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) onSuccess?.(undefined as unknown as QuickAddResult); // not used by host
      onOpenChange(next);
    },
    [onOpenChange, onSuccess],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </span>
            Create new {entry.label}
          </DialogTitle>
          <DialogDescription>
            {nested
              ? "Create the dependency inline, then return to the parent form."
              : `Add a ${entry.label.toLowerCase()} without leaving this page.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
            noValidate
          >
            {entry.fields.map((field) => (
              <QuickAddFieldRow
                key={field.name}
                field={field}
                control={control}
              />
            ))}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>Create {entry.label}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Field row — uses the existing form components; no new abstraction
// ---------------------------------------------------------------------------
function QuickAddFieldRow({
  field,
  control,
}: {
  field: QuickAddFieldSpec;
  control: ReturnType<typeof useForm<Record<string, string>>>["control"];
}) {
  // 2N Part 1.2: for `select` fields, render `FormSelect` standalone — it
  // already supplies the label + required asterisk + message via the
  // `DataField`/`FormItem` wrapper. The previous code wrapped every
  // field in `FormField`+`FormItem` (rendering its own label) AND then
  // for selects rendered `<FormSelect ... label={...} />` (which renders
  // ANOTHER label via `DataField`). That produced two labels and two
  // nested `FormField` registrations on the same `name` — a latent RHF
  // bug. Branching here keeps the text branch unchanged.
  if (field.type === "select" && field.options) {
    return (
      <FormSelect
        control={control}
        name={field.name}
        label={field.label}
        required={field.required}
        placeholder={field.placeholder}
        options={field.options}
      />
    );
  }

  const labelEl = field.required ? (
    <FormLabel>
      {field.label} <span className="text-destructive">*</span>
    </FormLabel>
  ) : (
    <FormLabel>{field.label}</FormLabel>
  );

  return (
    <FormField
      control={control}
      name={field.name}
      render={({ field: f }) => (
    <FormItem>
      {labelEl}
      <FormControl>
        <Input
          {...f}
          placeholder={field.placeholder}
          className={cn(
            "h-12 rounded-xl bg-secondary/30 border-0",
          )}
          value={f.value ?? ""}
        />
      </FormControl>
      {field.helpText && <FormDescription>{field.helpText}</FormDescription>}
      <FormMessage />
    </FormItem>
      )}
    />
  );
}
