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
      "mode_of_payment",
      "company",
    ],
    defaultSort: { field: "posting_date", order: "desc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
