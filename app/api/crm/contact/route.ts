// app/api/crm/contact/route.ts
// Obsidian ERP v4.0 - Contact API (GET list, POST create)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";

// GET /api/crm/contact - List contacts
export const GET = createListHandler("Contact", {
  allowedFields: [
    "name",
    "first_name",
    "last_name",
    "full_name",
    "email_id",
    "phone",
    "mobile_no",
    "company_name",
    "designation",
    "is_primary_contact",
    "links",
    "`tabContact`.creation",
  ],
  defaultSort: { field: "`tabContact`.creation", order: "desc" },
  defaultLimit: 50,
});

// POST /api/crm/contact - Create contact
export const POST = createCreateHandler("Contact");
