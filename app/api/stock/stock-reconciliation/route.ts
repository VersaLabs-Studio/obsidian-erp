import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { StockReconciliationCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Stock Reconciliation", {
  allowedFields: [
    "name", "naming_series", "purpose", "company", "posting_date",
    "posting_time", "set_warehouse", "expense_account", "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler("Stock Reconciliation", StockReconciliationCreateSchema);
