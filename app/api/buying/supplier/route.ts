// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { SupplierCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Supplier", {
  allowedFields: [
    "name",
    "supplier_name",
    "supplier_group",
    "supplier_type",
    "country",
    "default_currency",
    "default_price_list",
    "disabled",
    "creation",
  ],
  defaultSort: { field: "supplier_name", order: "asc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Supplier", SupplierCreateSchema);
