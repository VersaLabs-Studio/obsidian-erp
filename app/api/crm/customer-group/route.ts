// app/api/crm/customer-group/route.ts
// Obsidian ERP v4.0 - Customer Group API (GET list for options)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { CustomerGroupCreateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/crm/customer-group - List customer groups
export const GET = createListHandler("Customer Group", {
  allowedFields: [
    "name",
    "customer_group_name",
    "parent_customer_group",
    "is_group",
  ],
  defaultSort: { field: "customer_group_name", order: "asc" },
  defaultLimit: 100,
});

// POST /api/crm/customer-group - Create customer group
export const POST = createCreateHandler(
  "Customer Group",
  CustomerGroupCreateSchema
);
