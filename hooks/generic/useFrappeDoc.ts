// hooks/generic/useFrappeDoc.ts
// Obsidian ERP v4.0 - Generic Single Document Query Hook

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getApiPath } from "@/lib/doctype-config";

/**
 * Generic hook for fetching a single Frappe document
 *
 * @example
 * ```tsx
 * import { Item } from "@/types/doctype-types";
 *
 * const { data, isLoading } = useFrappeDoc<Item>("Item", "ITEM-001");
 * ```
 */
export function useFrappeDoc<T>(
  doctype: string,
  name: string,
  queryOptions?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  // Build the API endpoint based on doctype (uses centralized config)
  const apiPath = getApiPath(doctype);

  return useQuery({
    queryKey: [doctype, "doc", name],
    queryFn: async (): Promise<T> => {
      const url = `/api/${apiPath}/${encodeURIComponent(name)}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.details || error.error || `Failed to fetch ${doctype}: ${name}`
        );
      }

      const json = await response.json();
      return json.data as T;
    },
    enabled: !!name,
    staleTime: 60 * 1000, // 1 minute
    ...queryOptions,
  });
}

export default useFrappeDoc;
