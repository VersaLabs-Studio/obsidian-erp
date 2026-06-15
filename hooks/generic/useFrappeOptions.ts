// hooks/generic/useFrappeOptions.ts
// Obsidian ERP v4.0 - Generic Options Query Hook for Dropdowns

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getApiPath, getLabelField } from "@/lib/doctype-config";

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
    /** Field to use as display label (default: config's labelField or "name") */
    labelField?: string;
    /** Field to use as value (default: "name") */
    valueField?: string;
    /** Extra fields to fetch */
    extraFields?: string[];
    /** Additional filters */
    filters?: ([string, string, unknown] | [string, string, string, unknown])[];
    /** Order by field and direction (use table prefix for joins, e.g. "`tabAddress`.name") */
    orderBy?: { field: string; order?: "asc" | "desc" };
    /** Limit number of options */
    limit?: number;
    /** Whether to show code in label (e.g. "Item Name (Code)") */
    showCode?: boolean;
  },
  queryOptions?: Omit<
    UseQueryOptions<DropdownOption[] | any[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const labelField = options?.labelField || getLabelField(doctype);
  const valueField = options?.valueField || "name";
  const apiPath = getApiPath(doctype);

  return useQuery({
    queryKey: [doctype, "options", options],
    queryFn: async (): Promise<any[]> => {
      const fieldsToFetch = [valueField, labelField];

      // Always include item_name for Item doctype to ensure proper display
      if (doctype === "Item" && !fieldsToFetch.includes("item_name")) {
        fieldsToFetch.push("item_name");
      }
      // Always include item_code for Item doctype
      if (doctype === "Item" && !fieldsToFetch.includes("item_code")) {
        fieldsToFetch.push("item_code");
      }
      // Always include workstation_name for Workstation doctype
      if (
        doctype === "Workstation" &&
        !fieldsToFetch.includes("workstation_name")
      ) {
        fieldsToFetch.push("workstation_name");
      }

      if (options?.extraFields) {
        fieldsToFetch.push(...options.extraFields);
      }

      const params = new URLSearchParams();
      params.set("fields", JSON.stringify([...new Set(fieldsToFetch)]));

      if (options?.filters && options.filters.length > 0) {
        params.set("filters", JSON.stringify(options.filters));
      }
      // Use order_by with table prefix when specified (important for Dynamic Link joins)
      if (options?.orderBy) {
        params.set(
          "order_by",
          `${options.orderBy.field} ${options.orderBy.order || "asc"}`,
        );
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
      const data = json.data as Record<string, any>[];

      return data.map((item) => {
        const val = item[valueField];
        let label = item[labelField] || val;
        let subtitle: string | undefined = undefined;

        // Custom formatting for Items, BOMs, or Workstations to emphasize Names
        const isEmphasizedDocType = ["Item", "BOM", "Workstation"].includes(
          doctype,
        );

        if (options?.showCode !== false && isEmphasizedDocType) {
          const code = item.item_code || item.name || val;
          const name =
            item.item_name || item.workstation_name || item[labelField];

          if (name && name !== code) {
            // Emphasize Name with Code in parenthesis
            label = `${name} (${code})`;
            subtitle = code;
          } else {
            label = code;
          }
        }

        return {
          ...item,
          value: val,
          label: label,
          subtitle: subtitle, // For components that want to display code separately
          item_name: item.item_name, // Ensure item_name is always available
          item_code: item.item_code || item.name, // Ensure item_code is always available
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - options change less frequently
    ...queryOptions,
  });
}

export default useFrappeOptions;
