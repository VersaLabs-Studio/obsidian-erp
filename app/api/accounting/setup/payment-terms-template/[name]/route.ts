import { createCrudHandlers } from "@/lib/api-factory";
import { PaymentTermsTemplateCreateSchema } from "@/lib/schemas/doctype-schemas";

const { getHandler, updateHandler, deleteHandler } = createCrudHandlers(
  "Payment Terms Template",
  {
    createSchema: PaymentTermsTemplateCreateSchema,
    updateSchema: PaymentTermsTemplateCreateSchema.partial(),
  },
);

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
