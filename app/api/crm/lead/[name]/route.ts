// app/api/crm/lead/[name]/route.ts
// Obsidian ERP v4.0 - Lead Single Doc API (GET, PUT, DELETE)

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { LeadUpdateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/crm/lead/[name] - Get single lead
export const GET = createGetHandler("Lead");

// PUT /api/crm/lead/[name] - Update lead
export const PUT = createUpdateHandler("Lead", LeadUpdateSchema);

// DELETE /api/crm/lead/[name] - Delete lead
export const DELETE = createDeleteHandler("Lead");