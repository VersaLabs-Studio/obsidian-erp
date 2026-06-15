// app/api/accounting/payment-entry/route.ts
// Obsidian ERP v4.0 — Payment Entry list/create API route.
//
// 2O Part 6.1 — added `docstatus` to the list `allowedFields`. The list
// page renders the status badge from `entry.docstatus` (the canonical
// source) rather than `entry.status` (a free-form string). Without this
// field, every row showed "Draft" because `docstatus` was undefined on
// the list payload. The 2N mutation invalidate was correct — the
// remaining gap was the server-side field filter.

import { createCrudHandlers } from "@/lib/api-factory";
import { PaymentEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers("Payment Entry", {
  createSchema: PaymentEntryCreateSchema,
  updateSchema: PaymentEntryCreateSchema.partial(),
  listOptions: {
    allowedFields: [
      "name",
      "posting_date",
      "payment_type",
      "party_type",
      "party",
      "paid_amount",
      "received_amount",
      "status",
      "docstatus",
      "mode_of_payment",
      "company",
    ],
    defaultSort: { field: "posting_date", order: "desc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
