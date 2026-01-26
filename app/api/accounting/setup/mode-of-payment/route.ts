import { createCrudHandlers } from "@/lib/api-factory";
import {
  ModeOfPaymentCreateSchema,
  ModeOfPaymentUpdateSchema,
} from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers("Mode of Payment", {
  createSchema: ModeOfPaymentCreateSchema,
  updateSchema: ModeOfPaymentUpdateSchema,
  listOptions: {
    allowedFields: ["name", "mode_of_payment", "type", "enabled"],
    defaultSort: { field: "mode_of_payment", order: "asc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
