// app/api/stock/settings/uom/[name]/route.ts
// Obsidian ERP v4.0 — UOM individual route (2S Part 1).
// Supports GET (single), PUT (inline toggle for must_be_whole_number), DELETE.

import { createGetHandler, createUpdateHandler, createDeleteHandler } from "@/lib/api-factory";
import { z } from "zod";

const UomUpdateSchema = z.object({
  uom_name: z.string().min(1).optional(),
  must_be_whole_number: z.number().int().min(0).max(1).optional(),
  enabled: z.number().int().min(0).max(1).optional(),
});

/**
 * GET /api/stock/settings/uom/[name]
 */
export const GET = createGetHandler("UOM");

/**
 * PUT /api/stock/settings/uom/[name]
 * Used by the inline toggle on the UOM list page.
 */
export const PUT = createUpdateHandler("UOM", UomUpdateSchema);

/**
 * DELETE /api/stock/settings/uom/[name]
 */
export const DELETE = createDeleteHandler("UOM");
