// app/api/sales/taxes-template/[name]/route.ts
// Obsidian ERP v4.0 - Single Sales Taxes Template API Routes

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { z } from "zod";

// Basic schema for Tax Template update
const SalesTaxesTemplateUpdateSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  is_default: z.union([z.literal(0), z.literal(1)]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  taxes: z.array(z.unknown()).optional(),
});

// GET /api/sales/taxes-template/[name] - Get single tax template
export const GET = createGetHandler("Sales Taxes and Charges Template");

// PUT /api/sales/taxes-template/[name] - Update tax template
export const PUT = createUpdateHandler(
  "Sales Taxes and Charges Template",
  SalesTaxesTemplateUpdateSchema
);

// DELETE /api/sales/taxes-template/[name] - Delete tax template
export const DELETE = createDeleteHandler("Sales Taxes and Charges Template");
