// hooks/generic/useFrappeMutation.ts
// Obsidian ERP v4.0 - Generic Mutation Hook for CRUD Operations

import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiPath } from "@/lib/doctype-config";

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
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: [doctype] });
      config?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Show success toast
      if (showToast) {
        const message =
          typeof config?.successMessage === "function"
            ? config.successMessage(data)
            : config?.successMessage || `${doctype} ${operation}d successfully`;
        toast.success(message);
      }

      config?.onSuccess?.(data, variables);
    },

    onError: (error, variables) => {
      // Show error toast
      if (showToast) {
        const message =
          typeof config?.errorMessage === "function"
            ? config.errorMessage(error)
            : config?.errorMessage || error.message;
        toast.error(`Failed to ${operation} ${doctype}`, {
          description: message,
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
