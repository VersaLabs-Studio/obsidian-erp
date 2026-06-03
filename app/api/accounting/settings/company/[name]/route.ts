// app/api/accounting/settings/company/[name]/route.ts
// Obsidian ERP v4.0 - Single Company API Routes

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { CompanyUpdateSchema } from "@/lib/schemas/doctype-schemas";

/**
 * GET /api/accounting/settings/company/[name]
 * Fetch a single company by name/ID
 */
export const GET = createGetHandler("Company");

/**
 * PUT /api/accounting/settings/company/[name]
 * Update a company
 */
export const PUT = createUpdateHandler("Company", CompanyUpdateSchema);

/**
 * DELETE /api/accounting/settings/company/[name]
 * Delete a company
 */
export const DELETE = createDeleteHandler("Company");
