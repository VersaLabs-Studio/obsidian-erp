import { createListHandler } from "@/lib/api-factory";

export const GET = createListHandler("Bin", {
  allowedFields: [
    "name", "item_code", "warehouse", "actual_qty", "projected_qty",
    "reserved_qty", "ordered_qty", "valuation_rate",
  ],
  defaultSort: { field: "item_code", order: "asc" },
  defaultLimit: 200,
});
