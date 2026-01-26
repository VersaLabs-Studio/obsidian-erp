// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { DeliveryNoteUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Delivery Note");
export const PUT = createUpdateHandler(
  "Delivery Note",
  DeliveryNoteUpdateSchema,
);
export const DELETE = createDeleteHandler("Delivery Note");
