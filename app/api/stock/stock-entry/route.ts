// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { StockEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Stock Entry", {
  allowedFields: [
    "name",
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
