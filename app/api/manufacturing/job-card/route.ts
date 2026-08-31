// app/api/manufacturing/job-card/route.ts
// Obsidian ERP v4.0 — Job Card list/create API route (2S Part 10).

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { JobCardCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Job Card", {
  allowedFields: [
    "name",
    "status",
    "work_order",
    "operation",
    "workstation",
    "for_quantity",
    "company",
    "employee",
    "time_logs",
    "scheduled_time_logs",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler("Job Card", JobCardCreateSchema);
