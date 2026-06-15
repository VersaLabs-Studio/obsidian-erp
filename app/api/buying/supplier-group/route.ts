// app/api/buying/supplier-group/route.ts
// Obsidian ERP v4.0 - Supplier Group API (GET list for options)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { SupplierGroupCreateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/buying/supplier-group - List supplier groups
export const GET = createListHandler("Supplier Group", {
  allowedFields: [
    "name",
    "supplier_group_name",
    "parent_supplier_group",
    "is_group",
  ],
  defaultSort: { field: "supplier_group_name", order: "asc" },
  defaultLimit: 100,
});

// POST /api/buying/supplier-group - Create supplier group
export const POST = createCreateHandler(
  "Supplier Group",
  SupplierGroupCreateSchema
);
