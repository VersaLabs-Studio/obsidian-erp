// app/api/stock/item/route.ts
// Obsidian ERP v4.0 - Item API Routes (Factory Pattern)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { ItemCreateSchema } from "@/lib/schemas/doctype-schemas";

/**
 * GET /api/stock/item
 * List all items with filtering, sorting, and pagination
 *
 * Query Parameters:
 * - fields: JSON array of fields to fetch
 * - filters: JSON array of Frappe filters
 * - order_by: "field asc|desc"
 * - limit: number (max 500)
 * - offset: number
 * - search: string (searches name and item_code)
 */
export const GET = createListHandler("Item", {
  allowedFields: [
    "name",
    "item_code",
    "item_name",
    "item_group",
    "stock_uom",
    "brand",
    "is_stock_item",
    "is_fixed_asset",
    "disabled",
    "description",
    "valuation_rate",
    "standard_rate",
    "last_purchase_rate",
    "creation",
    "modified",
  ],
  defaultSort: { field: "modified", order: "desc" },
  defaultLimit: 100,
  maxLimit: 500,
});

/**
 * POST /api/stock/item
 * Create a new item
 *
 * Body: ItemCreateRequest (validated with Zod)
 */
export const POST = createCreateHandler("Item", ItemCreateSchema);
