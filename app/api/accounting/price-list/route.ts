// app/api/accounting/price-list/route.ts
// Pana ERP v3.0 - Price List API

import { createListHandler, createCreateHandler } from "@/lib/api-factory";

// GET /api/accounting/price-list - List price lists
export const GET = createListHandler("Price List", {
  allowedFields: [
    "name",
    "price_list_name",
    "enabled",
    "buying",
    "selling",
    "currency",
  ],
  defaultSort: { field: "name", order: "asc" },
  defaultLimit: 100,
});

// POST /api/accounting/price-list - Create price list
export const POST = createCreateHandler("Price List");
