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
        throw new Error(error.details || error.error || `${operation} failed`);
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

export default useFrappeMutation;
