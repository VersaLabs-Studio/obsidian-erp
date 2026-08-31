// app/api/manufacturing/job-card/[name]/route.ts
// Obsidian ERP v4.0 — Job Card get/update/delete API route (2S Part 10).

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { JobCardUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Job Card");
export const PUT = createUpdateHandler("Job Card", JobCardUpdateSchema);
export const DELETE = createDeleteHandler("Job Card");
