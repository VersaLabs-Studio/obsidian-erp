import { createCrudHandlers } from "@/lib/api-factory";
import { SalesInvoiceCreateSchema } from "@/lib/schemas/doctype-schemas";

const { getHandler, updateHandler, deleteHandler } = createCrudHandlers(
  "Sales Invoice",
  {
    createSchema: SalesInvoiceCreateSchema,
    updateSchema: SalesInvoiceCreateSchema.partial(),
  },
);

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
