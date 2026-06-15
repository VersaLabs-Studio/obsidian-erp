// app/api/stock/stock-entry/route.ts
// Obsidian ERP v4.0 — Stock Entry list/create API route.
//
// 2O Part 5 cleanup: removed `@ts-nocheck` — the route only consumes the
// typed `createListHandler` / `createCreateHandler` factories, so the
// suppression wasn't needed.

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { StockEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Stock Entry", {
  allowedFields: [
    "name",
    "naming_series",
    "stock_entry_type",
    "purpose",
    "posting_date",
    "posting_time",
    "work_order",
    "bom_no",
    "from_warehouse",
    "to_warehouse",
    "purchase_order",
    "delivery_note",
    "sales_invoice",
    "material_request",
    "fg_completed_qty",
    "total_outgoing_value",
    "total_incoming_value",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler("Stock Entry", StockEntryCreateSchema);
