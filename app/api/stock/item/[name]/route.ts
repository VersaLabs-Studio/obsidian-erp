// app/api/stock/item/[name]/route.ts
// Obsidian ERP v4.0 - Single Item API Routes (Factory Pattern)

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { ItemUpdateSchema } from "@/lib/schemas/doctype-schemas";

/**
 * GET /api/stock/item/[name]
 * Fetch a single item by name/ID
 */
export const GET = createGetHandler("Item");

/**
 * PUT /api/stock/item/[name]
 * Update an item
 *
 * Body: ItemUpdateRequest (validated with Zod)
 */
export const PUT = createUpdateHandler("Item", ItemUpdateSchema);

/**
 * DELETE /api/stock/item/[name]
 * Delete an item
 */
export const DELETE = createDeleteHandler("Item");
