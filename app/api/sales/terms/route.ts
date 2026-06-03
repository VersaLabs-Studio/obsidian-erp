// app/api/sales/terms/route.ts
// Obsidian ERP v4.0 - Terms and Conditions API Routes

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { TermsAndConditionsCreateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/sales/terms - List terms and conditions
export const GET = createListHandler("Terms and Conditions", {
  allowedFields: ["name", "title", "disabled", "selling", "buying", "terms"],
  defaultSort: { field: "title", order: "asc" },
  defaultLimit: 100,
});

// POST /api/sales/terms - Create terms and conditions
export const POST = createCreateHandler(
  "Terms and Conditions",
  TermsAndConditionsCreateSchema
);
