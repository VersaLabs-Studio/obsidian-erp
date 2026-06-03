// app/api/crm/address/route.ts
// Obsidian ERP v4.0 - Address API (GET list, POST create)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { AddressCreateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/crm/address - List addresses
export const GET = createListHandler("Address", {
  allowedFields: [
    "name",
    "address_title",
    "address_type",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "country",
    "pincode",
    "is_primary_address",
    "is_shipping_address",
    "links",
    "`tabAddress`.creation",
  ],
  defaultSort: { field: "`tabAddress`.creation", order: "desc" },
  defaultLimit: 50,
});

// POST /api/crm/address - Create address
export const POST = createCreateHandler("Address", AddressCreateSchema);
