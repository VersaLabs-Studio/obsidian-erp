// app/api/manufacturing/work-order/route.ts
// Obsidian ERP v4.0 — Work Order list/create API route.
//
// 2O Part 5 cleanup: removed `@ts-nocheck` — the route only consumes the
// typed `createListHandler` / `createCreateHandler` factories, so the
// suppression wasn't needed.

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { WorkOrderCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Work Order", {
  allowedFields: [
    "name",
    "status",
    "production_item",
    "item_name",
    "bom_no",
    "sales_order",
    "project",
    "company",
    "qty",
    "produced_qty",
    "fg_warehouse",
    "wip_warehouse",
    "source_warehouse",
    "planned_start_date",
    "planned_end_date",
    "expected_delivery_date",
    "actual_start_date",
    "actual_end_date",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler("Work Order", WorkOrderCreateSchema);
