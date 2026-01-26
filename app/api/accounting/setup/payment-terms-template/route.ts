import { createCrudHandlers } from "@/lib/api-factory";
import { PaymentTermsTemplateCreateSchema } from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers(
  "Payment Terms Template",
  {
    createSchema: PaymentTermsTemplateCreateSchema,
    updateSchema: PaymentTermsTemplateCreateSchema.partial(),
    listOptions: {
      allowedFields: [
        "name",
        "template_name",
        "allocate_payment_based_on_payment_terms",
      ],
      defaultSort: { field: "template_name", order: "asc" },
    },
  },
);

export const GET = listHandler;
export const POST = createHandler;
