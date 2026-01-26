import { createCrudHandlers } from "@/lib/api-factory";
import {
  CostCenterCreateSchema,
  CostCenterUpdateSchema,
} from "@/lib/schemas/doctype-schemas";

const { getHandler, updateHandler, deleteHandler } = createCrudHandlers(
  "Cost Center",
  {
    createSchema: CostCenterCreateSchema,
    updateSchema: CostCenterUpdateSchema,
  },
);

export const GET = getHandler;
export const PUT = updateHandler;
export const DELETE = deleteHandler;
