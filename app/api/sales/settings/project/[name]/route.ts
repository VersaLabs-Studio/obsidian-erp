// app/api/sales/settings/project/[name]/route.ts
// Obsidian ERP v4.0 - Project Detail API Handlers

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";

/**
 * GET: Fetch a single project by name
 */
export const GET = createGetHandler("Project");

/**
 * PUT: Update a project
 */
export const PUT = createUpdateHandler("Project");

/**
 * DELETE: Delete a project
 */
export const DELETE = createDeleteHandler("Project");
