// app/api/stock/settings/item-price/[name]/route.ts
// Obsidian ERP v4.0 - Single Item Price API Routes (Factory Pattern)

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";

/**
 * GET /api/stock/settings/item-price/[name]
 * Fetch a single item price by name
 */
export const GET = createGetHandler("Item Price");

/**
 * PUT /api/stock/settings/item-price/[name]
 * Update an item price
 */
export const PUT = createUpdateHandler("Item Price");

/**
 * DELETE /api/stock/settings/item-price/[name]
 * Delete an item price
 */
export const DELETE = createDeleteHandler("Item Price");
