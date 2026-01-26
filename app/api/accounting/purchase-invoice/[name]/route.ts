import { createCrudHandlers } from "@/lib/api-factory";
import { PurchaseInvoiceCreateSchema } from "@/lib/schemas/doctype-schemas";

const { getHandler, updateHandler, deleteHandler } = createCrudHandlers(
  "Purchase Invoice",
  {
    createSchema: PurchaseInvoiceCreateSchema,
    updateSchema: PurchaseInvoiceCreateSchema.partial(),
  },
);

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
