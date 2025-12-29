// hooks/generic/useFrappeOptions.ts
// Pana ERP v3.0 - Generic Options Query Hook for Dropdowns

import { useQuery, UseQueryOptions } from "@tanstack/react-query";

/**
 * Options structure for dropdown data
 */
export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Generic hook for fetching dropdown options from a Frappe DocType
 * Commonly used for Link fields
 *
 * @example
 * ```tsx
 * const { data: itemGroups } = useFrappeOptions("Item Group", {
 *   labelField: "item_group_name",
 * });
 *
 * // Returns: [{ value: "Raw Materials", label: "Raw Materials" }, ...]
 * ```
 */
export function useFrappeOptions(
  doctype: string,
  options?: {
    /** Field to use as display label (default: "name") */
    labelField?: string;
    /** Field to use as value (default: "name") */
    valueField?: string;
    /** Additional filters */
    filters?: [string, string, unknown][];
    /** Limit number of options */
    limit?: number;
  },
  queryOptions?: Omit<
    UseQueryOptions<DropdownOption[], Error>,
    "queryKey" | "queryFn"
  >
) {
  const labelField = options?.labelField || "name";
  const valueField = options?.valueField || "name";
  const apiPath = doctypeToApiPath(doctype);

  return useQuery({
    queryKey: [doctype, "options", options],
    queryFn: async (): Promise<DropdownOption[]> => {
      const params = new URLSearchParams();
      params.set("fields", JSON.stringify([valueField, labelField]));

      if (options?.filters && options.filters.length > 0) {
        params.set("filters", JSON.stringify(options.filters));
      }
      if (options?.limit) {
        params.set("limit", String(options.limit));
      } else {
        params.set("limit", "500"); // Default high limit for dropdowns
      }

      const url = `/api/${apiPath}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${doctype} options`);
      }

      const json = await response.json();
      const data = json.data as Record<string, string>[];

      return data.map((item) => ({
        value: item[valueField],
        label: item[labelField] || item[valueField],
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - options change less frequently
    ...queryOptions,
  });
}

/**
 * Convert DocType name to API path
 */
function doctypeToApiPath(doctype: string): string {
  const moduleMap: Record<string, string> = {
    Item: "stock/item",
    "Item Group": "stock/settings/item-group",
    Warehouse: "stock/settings/warehouse",
    UOM: "stock/settings/uom",
    Brand: "stock/settings/brand",
    Customer: "crm/customer",
    Supplier: "purchasing/supplier",
  };

  if (moduleMap[doctype]) {
    return moduleMap[doctype];
  }

  return doctype.toLowerCase().replace(/\s+/g, "-");
}

export default useFrappeOptions;
