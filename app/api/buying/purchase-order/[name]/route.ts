// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { PurchaseOrderUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Purchase Order");
export const PUT = createUpdateHandler(
  "Purchase Order",
  PurchaseOrderUpdateSchema,
);
export const DELETE = createDeleteHandler("Purchase Order");
