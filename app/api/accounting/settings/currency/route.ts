// app/api/accounting/currency/route.ts
// Obsidian ERP v4.0 - Currency API

import { createListHandler, createCreateHandler } from "@/lib/api-factory";

// GET /api/accounting/currency - List currencies
export const GET = createListHandler("Currency", {
  allowedFields: [
    "name",
    "currency_name",
    "enabled",
    "fraction",
    "fraction_units",
    "symbol",
  ],
  defaultSort: { field: "name", order: "asc" },
  defaultLimit: 100,
});

// POST /api/accounting/currency - Create currency
export const POST = createCreateHandler("Currency");
