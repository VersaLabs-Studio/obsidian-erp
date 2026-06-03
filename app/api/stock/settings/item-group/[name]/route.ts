// app/api/stock/settings/item-group/[name]/route.ts
// Obsidian ERP v4.0 - Single Item Group API Routes (Factory Pattern)

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";

/**
 * GET /api/stock/settings/item-group/[name]
 * Fetch a single item group by name
 */
export const GET = createGetHandler("Item Group");

/**
 * PUT /api/stock/settings/item-group/[name]
 * Update an item group
 */
export const PUT = createUpdateHandler("Item Group");

/**
 * DELETE /api/stock/settings/item-group/[name]
 * Delete an item group
 */
export const DELETE = createDeleteHandler("Item Group");
