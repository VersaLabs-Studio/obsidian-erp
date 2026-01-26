import { createCrudHandlers } from "@/lib/api-factory";
import {
  ModeOfPaymentCreateSchema,
  ModeOfPaymentUpdateSchema,
} from "@/lib/schemas/doctype-schemas";

const { getHandler, updateHandler, deleteHandler } = createCrudHandlers(
  "Mode of Payment",
  {
    createSchema: ModeOfPaymentCreateSchema,
    updateSchema: ModeOfPaymentUpdateSchema,
  },
);

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
