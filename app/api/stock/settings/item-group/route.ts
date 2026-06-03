// app/api/stock/settings/item-group/route.ts
// Obsidian ERP v4.0 - Item Group API Routes (Factory Pattern)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";

/**
 * GET /api/stock/settings/item-group
 * List all item groups
 */
export const GET = createListHandler("Item Group", {
  allowedFields: [
    "name",
    "item_group_name",
    "parent_item_group",
    "is_group",
    "lft",
    "rgt",
    "creation",
    "modified",
  ],
  defaultSort: { field: "lft", order: "asc" },
  defaultLimit: 500,
  maxLimit: 1000,
});

/**
 * POST /api/stock/settings/item-group
 * Create a new item group
 */
export const POST = createCreateHandler("Item Group");
