// app/api/stock/settings/uom/route.ts
// Obsidian ERP v4.0 - UOM (Unit of Measure) API Routes (Factory Pattern)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";

/**
 * GET /api/stock/settings/uom
 * List all units of measure
 */
export const GET = createListHandler("UOM", {
  allowedFields: [
    "name",
    "uom_name",
    "enabled",
    "must_be_whole_number",
    "creation",
    "modified",
  ],
  defaultSort: { field: "name", order: "asc" },
  defaultLimit: 200,
  maxLimit: 500,
});

/**
 * POST /api/stock/settings/uom
 * Create a new unit of measure
 */
export const POST = createCreateHandler("UOM");
