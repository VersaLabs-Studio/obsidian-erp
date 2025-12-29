// lib/schemas/item-group.ts
import { z } from "zod";
import { ItemGroup } from "@/types/item-group";

export const itemGroupFormSchema = z.object({
  item_group_name: z.string().min(1, "Item group name is required"),
  parent_item_group: z.string().min(1, "Parent item group is required"),
  is_group: z.boolean(),
  default_price_list: z.string().optional(),
  default_warehouse: z.string().optional(),
  default_buying_cost_center: z.string().optional(),
  default_selling_cost_center: z.string().optional(),
  default_expense_account: z.string().optional(),
  default_income_account: z.string().optional(),
  default_supplier: z.string().optional(),
  default_item_tax_template: z.string().optional(),
  tax_category: z.string().optional(),
});

export type ItemGroupFormData = z.infer<typeof itemGroupFormSchema>;

export const defaultItemGroupFormValues: ItemGroupFormData = {
  item_group_name: "",
  parent_item_group: "All Item Groups",
  is_group: false,
  default_price_list: "",
  default_warehouse: "",
  default_buying_cost_center: "",
  default_selling_cost_center: "",
  default_expense_account: "",
  default_income_account: "",
  default_supplier: "",
  default_item_tax_template: "",
  tax_category: "",
};

// Convert form (boolean) to Frappe API (0/1)
export function formToFrappe(
  data: ItemGroupFormData
): Record<string, string | number> {
  return {
    ...data,
    is_group: data.is_group ? 1 : 0,
  };
}

// Convert Frappe API (0/1) to form (boolean)
export function frappeToForm(doc: ItemGroup): ItemGroupFormData {
  return {
    item_group_name: doc.item_group_name || "",
    parent_item_group: doc.parent_item_group || "All Item Groups",
    is_group: Boolean(doc.is_group),
    default_price_list: doc.default_price_list || "",
    default_warehouse: doc.default_warehouse || "",
    default_buying_cost_center: doc.default_buying_cost_center || "",
    default_selling_cost_center: doc.default_selling_cost_center || "",
    default_expense_account: doc.default_expense_account || "",
    default_income_account: doc.default_income_account || "",
    default_supplier: doc.default_supplier || "",
    default_item_tax_template: doc.default_item_tax_template || "",
    tax_category: doc.tax_category || "",
  };
}
