// app/api/sales/taxes-template/route.ts
// Obsidian ERP v4.0 - Sales Taxes and Charges Template API Routes

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
// Note: We'll use a basic schema since this DocType has complex child tables
import { z } from "zod";

// Basic schema for Tax Template creation
const SalesTaxesTemplateCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().optional(),
  is_default: z
    .preprocess(
      (v) => (typeof v === "boolean" ? (v ? 1 : 0) : v),
      z.union([z.literal(0), z.literal(1)])
    )
    .optional(),
  disabled: z
    .preprocess(
      (v) => (typeof v === "boolean" ? (v ? 1 : 0) : v),
      z.union([z.literal(0), z.literal(1)])
    )
    .optional(),
  taxes: z.array(z.unknown()).optional(),
});

// GET /api/sales/taxes-template - List tax templates
export const GET = createListHandler("Sales Taxes and Charges Template", {
  allowedFields: ["name", "title", "company", "is_default", "disabled"],
  defaultSort: { field: "title", order: "asc" },
  defaultLimit: 100,
});

// POST /api/sales/taxes-template - Create tax template
export const POST = createCreateHandler(
  "Sales Taxes and Charges Template",
  SalesTaxesTemplateCreateSchema
);
