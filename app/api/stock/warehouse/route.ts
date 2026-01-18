import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { WarehouseCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Warehouse", {
  allowedFields: [
    "name",
    "warehouse_name",
    "parent_warehouse",
    "is_group",
    "warehouse_type",
    "company",
    "disabled",
    "city",
    "lft",
    "rgt",
    "creation",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Warehouse", WarehouseCreateSchema);
