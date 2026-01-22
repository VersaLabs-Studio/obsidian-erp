// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { WorkOrderUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Work Order");
export const PUT = createUpdateHandler("Work Order", WorkOrderUpdateSchema);
export const DELETE = createDeleteHandler("Work Order");
