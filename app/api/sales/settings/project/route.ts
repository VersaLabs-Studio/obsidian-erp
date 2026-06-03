// app/api/sales/settings/project/route.ts
// Obsidian ERP v4.0 - Project API Handlers

import { createListHandler, createCreateHandler } from "@/lib/api-factory";

/**
 * GET: List all projects
 */
export const GET = createListHandler("Project", {
  allowedFields: [
    "name",
    "project_name",
    "status",
    "company",
    "customer",
    "expected_end_date",
    "percent_complete",
    "`tabProject`.creation",
  ],
  defaultSort: { field: "`tabProject`.creation", order: "desc" },
});

/**
 * POST: Create a new project
 */
export const POST = createCreateHandler("Project");
