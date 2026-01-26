import { createCrudHandlers } from "@/lib/api-factory";
import { PaymentEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

const { getHandler, updateHandler, deleteHandler } = createCrudHandlers(
  "Payment Entry",
  {
    createSchema: PaymentEntryCreateSchema,
    updateSchema: PaymentEntryCreateSchema.partial(),
  },
);

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
