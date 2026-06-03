// app/api/crm/salutation/route.ts
// Obsidian ERP v4.0 - Salutation API (GET list for options)

import { createListHandler } from "@/lib/api-factory";

// GET /api/crm/salutation - List salutations
export const GET = createListHandler("Salutation", {
  allowedFields: ["name", "salutation"],
  defaultSort: { field: "salutation", order: "asc" },
  defaultLimit: 50,
});
