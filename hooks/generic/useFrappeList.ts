// hooks/generic/useFrappeList.ts
// Pana ERP v3.0 - Generic List Query Hook

import { useQuery, UseQueryOptions } from "@tanstack/react-query";

/**
 * Options for Frappe list queries
 */
export interface FrappeListOptions {
  /** Fields to fetch (default: all) */
  fields?: string[];
  /** Frappe filter format: [field, operator, value] */
  filters?: [string, string, unknown][];
  /** Order by field and direction */
  orderBy?: { field: string; order: "asc" | "desc" };
  /** Number of records to fetch */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Search term for name/title fields */
  search?: string;
}

/**
 * Generic hook for fetching a list of Frappe documents
 *
 * @example
 * ```tsx
 * import { Item } from "@/types/doctype-types";
 *
 * const { data, isLoading } = useFrappeList<Item>("Item", {
 *   filters: [["item_group", "=", "Raw Materials"]],
 *   orderBy: { field: "creation", order: "desc" },
 *   limit: 50,
 * });
 * ```
 */
export function useFrappeList<T>(
  doctype: string,
  options?: FrappeListOptions,
  queryOptions?: Omit<UseQueryOptions<T[], Error>, "queryKey" | "queryFn">
) {
  // Build the API endpoint based on doctype
  const apiPath = doctypeToApiPath(doctype);

  return useQuery({
    queryKey: [doctype, "list", options],
    queryFn: async (): Promise<T[]> => {
      const params = new URLSearchParams();

      if (options?.fields) {
        params.set("fields", JSON.stringify(options.fields));
      }
      if (options?.filters && options.filters.length > 0) {
        params.set("filters", JSON.stringify(options.filters));
      }
      if (options?.orderBy) {
        params.set(
          "order_by",
          `${options.orderBy.field} ${options.orderBy.order}`
        );
      }
      if (options?.limit) {
        params.set("limit", String(options.limit));
      }
      if (options?.offset) {
        params.set("offset", String(options.offset));
      }
      if (options?.search) {
        params.set("search", options.search);
      }

      const url = `/api/${apiPath}${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.details || error.error || `Failed to fetch ${doctype} list`
        );
      }

      const json = await response.json();
      return json.data as T[];
    },
    staleTime: 60 * 1000, // 1 minute
    ...queryOptions,
  });
}

/**
 * Convert DocType name to API path
 * e.g., "Item" -> "stock/item", "Sales Order" -> "crm/sales-order"
 */
function doctypeToApiPath(doctype: string): string {
  // Define module mappings
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

  // Return mapped path or convert to kebab-case
  if (moduleMap[doctype]) {
    return moduleMap[doctype];
  }

  // Fallback: convert to lowercase kebab-case
  return doctype.toLowerCase().replace(/\s+/g, "-");
}

export default useFrappeList;
