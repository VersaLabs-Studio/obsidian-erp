import { createCrudHandlers } from "@/lib/api-factory";
import {
  AccountCreateSchema,
  AccountUpdateSchema,
} from "@/lib/schemas/doctype-schemas";

const { getHandler, updateHandler, deleteHandler } = createCrudHandlers(
  "Account",
  {
    createSchema: AccountCreateSchema,
    updateSchema: AccountUpdateSchema,
  },
);

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
