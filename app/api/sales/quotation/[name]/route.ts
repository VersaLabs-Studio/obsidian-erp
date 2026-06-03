// app/api/sales/quotation/[name]/route.ts
// Obsidian ERP v4.0 - Single Quotation API Routes

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { QuotationUpdateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/sales/quotation/[name] - Get single quotation
export const GET = createGetHandler("Quotation");

// PUT /api/sales/quotation/[name] - Update quotation
export const PUT = createUpdateHandler("Quotation", QuotationUpdateSchema);

// DELETE /api/sales/quotation/[name] - Delete quotation
export const DELETE = createDeleteHandler("Quotation");
