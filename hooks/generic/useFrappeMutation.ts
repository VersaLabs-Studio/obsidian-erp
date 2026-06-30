// hooks/generic/useFrappeMutation.ts
// Obsidian ERP v4.0 - Generic Mutation Hook for CRUD Operations

import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { getApiPath } from "@/lib/doctype-config";
// 2T §7 — Use the unified notification sink instead of direct toast calls.
// Every CRUD mutation now auto-persists to the notification panel.
import { notify } from "@/lib/stores/notification-store";
// 2W A3 — CRUD context for the notification panel detail view.
import { getDocTypeRoute } from "@/lib/flows/flow-chain-resolver";

type MutationOperation = "create" | "update" | "delete";

interface MutationConfig<TData, TVariables> {
  /** Success callback */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Error callback */
  onError?: (error: Error, variables: TVariables) => void;
  /** Additional query keys to invalidate on success */
  invalidateKeys?: string[][];
  /** Show toast notifications */
  showToast?: boolean;
  /** Custom success message */
  successMessage?: string | ((data: TData) => string);
  /** Custom error message */
  errorMessage?: string | ((error: Error) => string);
}

/**
 * Generic hook for Frappe document mutations (Create, Update, Delete)
 *
 * @example Create
 * ```tsx
 * const createMutation = useFrappeMutation<Item, ItemCreateRequest>(
 *   "Item",
 *   "create",
 *   { successMessage: "Item created successfully" }
 * );
 *
 * createMutation.mutate({ item_code: "NEW-001", item_name: "New Item", ... });
 * ```
 *
 * @example Update
 * ```tsx
 * const updateMutation = useFrappeMutation<Item, { name: string; data: ItemUpdateRequest }>(
 *   "Item",
 *   "update"
 * );
 *
 * updateMutation.mutate({ name: "ITEM-001", data: { item_name: "Updated Name" } });
 * ```
 *
 * @example Delete
 * ```tsx
 * const deleteMutation = useFrappeMutation<{ message: string }, string>(
 *   "Item",
 *   "delete"
 * );
 *
 * deleteMutation.mutate("ITEM-001");
 * ```
 */
export function useFrappeMutation<TData = unknown, TVariables = unknown>(
  doctype: string,
  operation: MutationOperation,
  config?: MutationConfig<TData, TVariables>,
  mutationOptions?: Omit<
    UseMutationOptions<TData, Error, TVariables>,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();
  const apiPath = getApiPath(doctype);
  const showToast = config?.showToast ?? true;

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables): Promise<TData> => {
      let url: string;
      let method: string;
      let body: string | undefined;

      switch (operation) {
        case "create":
          url = `/api/${apiPath}`;
          method = "POST";
          body = JSON.stringify(variables);
          break;

        case "update":
          // Expect variables to have { name: string, data: object }
          const updateVars = variables as { name: string; data: unknown };
          url = `/api/${apiPath}/${encodeURIComponent(updateVars.name)}`;
          method = "PUT";
          body = JSON.stringify(updateVars.data);
          break;

        case "delete":
          // Expect variables to be the document name
          url = `/api/${apiPath}/${encodeURIComponent(String(variables))}`;
          method = "DELETE";
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        // R2: ApiErrorResponse from api-factory.ts can carry `details` as an
        // object (Zod fieldErrors). The legacy FrappeError shape uses a
        // string. Detect both and format the message so callers
        // (resolveFrappeError) can surface real field names instead of
        // "[object Object]".
        const formatted = formatErrorMessage(error);
        const err = new Error(formatted);
        // Preserve the raw details for strategies that need structured access
        if (error && typeof error === "object") {
          (err as Error & { details?: unknown }).details = error.details;
          (err as Error & { error?: string }).error = error.error;
          // 2M Part 2B: preserve the original Frappe error (with
          // `_server_messages` JSON) so the resolver can check each entry's
          // `indicator` field and route green/blue (info) messages as a
          // non-error INFO resolution rather than a GuidedErrorDialog
          // rejection. The previous flatten step lost this metadata.
          (err as Error & { _originalError?: unknown })._originalError =
            (error as { frappeError?: unknown }).frappeError ?? error;
        }
        throw err;
      }

      return response.json() as Promise<TData>;
    },

    onSuccess: (data, variables) => {
      // 2N Part 1.5: invalidate the list query key for this doctype so a
      // detail-page submit/cancel/delete immediately shows on the list page
      // (previously the PE list still showed "Draft" after a submit because
      // the mutation never invalidated the list cache). We match both the
      // `[doctype]` prefix (used by `useFrappeList`'s queryKey) AND the
      // `[getApiPath(doctype)]` key (used by QuickAdd and any other consumer
      // that keys on the API path). `refetchType: "all"` forces active
      // queries to refetch immediately, not just on next mount — so a list
      // page already-mounted in the background (e.g. via tab keep-alive)
      // picks up the new docstatus without a remount.
      queryClient.invalidateQueries({ queryKey: [doctype], refetchType: "all" });
      queryClient.invalidateQueries({
        queryKey: [getApiPath(doctype)],
        refetchType: "all",
      });
      config?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key, refetchType: "all" });
      });

      // 2T §7 — Show success toast + persist to notification panel
      // 2W A3 — Populate CRUD context (doctype, docName, operation,
      // summary) so the notification panel detail view can render a real
      // "CRUD Operation" block + a clickable deep-link to the doc. The
      // 2V change extended the store shape but never wired producers.
      if (showToast) {
        const message =
          typeof config?.successMessage === "function"
            ? config.successMessage(data)
            : config?.successMessage || `${doctype} ${operation}d successfully`;

        // Derive the doc name:
        //   - create: response payload's `name` field (the new doc id)
        //   - update: `variables.name`
        //   - delete: `variables` (the doc name string)
        let docName: string | undefined;
        if (operation === "create" && data && typeof data === "object") {
          const d = data as { name?: unknown; data?: { name?: unknown } };
          if (typeof d.name === "string") docName = d.name;
          else if (d.data && typeof d.data.name === "string") docName = d.data.name;
        } else if (operation === "update" && variables && typeof variables === "object") {
          const v = variables as { name?: unknown };
          if (typeof v.name === "string") docName = v.name;
        } else if (operation === "delete") {
          docName = String(variables ?? "");
        }

        // Past-tense for the CRUD context (the store enum):
        const opTense =
          operation === "create" ? "created"
          : operation === "update" ? "updated"
          : "deleted";

        const summary = docName
          ? `${opTense.charAt(0).toUpperCase() + opTense.slice(1)} ${doctype} ${docName}`
          : `${opTense.charAt(0).toUpperCase() + opTense.slice(1)} ${doctype}`;

        const href = docName
          ? `/${getDocTypeRoute(doctype)}/${encodeURIComponent(docName)}`
          : undefined;

        notify("success", {
          message,
          doctype,
          docName,
          operation: opTense,
          summary,
          href,
        });
      }

      config?.onSuccess?.(data, variables);
    },

    onError: (error, variables) => {
      // 2T §7 — Show error toast + persist to notification panel
      // 2W A3 — Carry the same CRUD context on failure so the panel can
      // show what was attempted (e.g. "Failed to create Sales Order").
      if (showToast) {
        const message =
          typeof config?.errorMessage === "function"
            ? config.errorMessage(error)
            : config?.errorMessage || error.message;

        // Best-effort docName extraction (update + delete carry it; create
        // failed before the server assigned a name).
        let docName: string | undefined;
        if (operation === "update" && variables && typeof variables === "object") {
          const v = variables as { name?: unknown };
          if (typeof v.name === "string") docName = v.name;
        } else if (operation === "delete") {
          docName = String(variables ?? "");
        }

        const opTense =
          operation === "create" ? "created"
          : operation === "update" ? "updated"
          : "deleted";

        notify("error", {
          message: `Failed to ${operation} ${doctype}`,
          detail: message,
          doctype,
          docName,
          operation: opTense,
          summary: docName
            ? `Failed to ${operation} ${doctype} ${docName}`
            : `Failed to ${operation} ${doctype}`,
        });
      }

      config?.onError?.(error, variables);
    },

    ...mutationOptions,
  });
}

/**
 * Convenience hooks for specific operations
 */

export function useFrappeCreate<TData = unknown, TVariables = unknown>(
  doctype: string,
  config?: MutationConfig<TData, TVariables>
) {
  return useFrappeMutation<TData, TVariables>(doctype, "create", config);
}

export function useFrappeUpdate<
  TData = unknown,
  TVariables = { name: string; data: unknown }
>(doctype: string, config?: MutationConfig<TData, TVariables>) {
  return useFrappeMutation<TData, TVariables>(doctype, "update", config);
}

export function useFrappeDelete<TData = { message: string }>(
  doctype: string,
  config?: MutationConfig<TData, string>
) {
  return useFrappeMutation<TData, string>(doctype, "delete", config);
}

// ---------------------------------------------------------------------------
// R2: Format an API error response into a human-readable string.
// Handles two shapes:
//   1. ApiErrorResponse  → `{ success:false, error:"Validation Error", details: { field:[msg] } }`
//      → "field: msg · field: msg"
//   2. Legacy FrappeError → `{ details: "string" | object }`
//      → string (or JSON-stringify of meaningful subset)
// Always returns a string (never "[object Object]").
// ---------------------------------------------------------------------------
function formatErrorMessage(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    return String(raw ?? "Request failed");
  }
  const obj = raw as {
    success?: boolean;
    error?: string;
    details?: unknown;
    message?: unknown;
  };

  // Validation Error with object details (Zod fieldErrors) — show each field
  if (
    obj.error === "Validation Error" &&
    obj.details &&
    typeof obj.details === "object" &&
    !Array.isArray(obj.details)
  ) {
    const lines: string[] = [];
    for (const [field, msgs] of Object.entries(obj.details)) {
      if (Array.isArray(msgs)) {
        for (const m of msgs) lines.push(`${field}: ${m}`);
      } else if (typeof msgs === "string") {
        lines.push(`${field}: ${msgs}`);
      }
    }
    if (lines.length > 0) return lines.join(" · ");
  }

  // Other object details — render a meaningful subset
  if (obj.details && typeof obj.details === "object") {
    const o = obj.details as Record<string, unknown>;
    const lines: string[] = [];
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        lines.push(`${k}: ${v}`);
      } else if (Array.isArray(v)) {
        lines.push(`${k}: ${v.join(", ")}`);
      }
    }
    if (lines.length > 0) return lines.join(" · ");
  }

  if (typeof obj.details === "string" && obj.details) return obj.details;
  if (typeof obj.error === "string" && obj.error) return obj.error;
  if (typeof obj.message === "string" && obj.message) return obj.message;
  return "Request failed";
}

export default useFrappeMutation;
