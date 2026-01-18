import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { SalesPartnerTypeUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Sales Partner Type");
export const PUT = createUpdateHandler(
  "Sales Partner Type",
  SalesPartnerTypeUpdateSchema,
);
export const DELETE = createDeleteHandler("Sales Partner Type");
