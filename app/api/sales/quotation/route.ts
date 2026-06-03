// app/api/sales/quotation/route.ts
// Obsidian ERP v4.0 - Quotation API Routes (Phase 2: Sales Module)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { QuotationCreateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/sales/quotation - List quotations
export const GET = createListHandler("Quotation", {
  allowedFields: [
    "name",
    "naming_series",
    "quotation_to",
    "party_name",
    "customer_name",
    "transaction_date",
    "valid_till",
    "order_type",
    "status",
    "grand_total",
    "currency",
    "company",
  ],
  defaultSort: { field: "transaction_date", order: "desc" },
  defaultLimit: 50,
});

// POST /api/sales/quotation - Create quotation
export const POST = createCreateHandler("Quotation", QuotationCreateSchema);
