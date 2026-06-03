// app/api/stock/settings/item-price/route.ts
// Obsidian ERP v4.0 - Item Price API Routes (Factory Pattern)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";

/**
 * GET /api/stock/settings/item-price
 * List all item prices
 */
export const GET = createListHandler("Item Price", {
  allowedFields: [
    "name",
    "item_code",
    "item_name",
    "price_list",
    "price_list_rate",
    "buying",
    "selling",
    "currency",
    "uom",
    "customer",
    "supplier",
    "batch_no",
    "valid_from",
    "valid_upto",
    "modified",
  ],
  defaultSort: { field: "modified", order: "desc" },
  defaultLimit: 100,
  maxLimit: 500,
});

/**
 * POST /api/stock/settings/item-price
 * Create a new item price
 */
export const POST = createCreateHandler("Item Price");
