// hooks/generic/useFrappeDoc.ts
// Pana ERP v3.0 - Generic Single Document Query Hook

import { useQuery, UseQueryOptions } from "@tanstack/react-query";

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
  // Build the API endpoint based on doctype
  const apiPath = doctypeToApiPath(doctype);

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

/**
 * Convert DocType name to API path
 */
function doctypeToApiPath(doctype: string): string {
  const moduleMap: Record<string, string> = {
    Item: "stock/item",
    "Item Group": "stock/settings/item-group",
    Warehouse: "stock/settings/warehouse",
    UOM: "stock/settings/uom",
    "Stock Entry": "stock/stock-entries",
    "Delivery Note": "stock/delivery-notes",
    "Purchase Receipt": "stock/purchase-receipts",
    Customer: "crm/customer",
    Supplier: "purchasing/supplier",
    "Sales Order": "crm/sales-order",
    "Purchase Order": "purchasing/purchase-order",
  };

  if (moduleMap[doctype]) {
    return moduleMap[doctype];
  }

  return doctype.toLowerCase().replace(/\s+/g, "-");
}

export default useFrappeDoc;
