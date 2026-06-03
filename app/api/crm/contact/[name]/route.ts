// app/api/crm/contact/[name]/route.ts
// Obsidian ERP v4.0 - Contact Single Doc API (GET, PUT, DELETE)

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";

// GET /api/crm/contact/[name] - Get single contact
export const GET = createGetHandler("Contact");

// PUT /api/crm/contact/[name] - Update contact
export const PUT = createUpdateHandler("Contact");

// DELETE /api/crm/contact/[name] - Delete contact
export const DELETE = createDeleteHandler("Contact");
