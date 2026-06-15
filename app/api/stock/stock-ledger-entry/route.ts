import { createListHandler } from "@/lib/api-factory";

export const GET = createListHandler("Stock Ledger Entry", {
  allowedFields: [
    "name", "item_code", "warehouse", "posting_date", "posting_time",
    "actual_qty", "qty_after_transaction", "valuation_rate",
    "voucher_type", "voucher_no",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});
