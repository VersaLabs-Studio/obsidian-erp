// app/api/sales/terms/[name]/route.ts
// Obsidian ERP v4.0 - Single Terms and Conditions API Routes

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { TermsAndConditionsUpdateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/sales/terms/[name] - Get single terms
export const GET = createGetHandler("Terms and Conditions");

// PUT /api/sales/terms/[name] - Update terms
export const PUT = createUpdateHandler(
  "Terms and Conditions",
  TermsAndConditionsUpdateSchema
);

// DELETE /api/sales/terms/[name] - Delete terms
export const DELETE = createDeleteHandler("Terms and Conditions");
