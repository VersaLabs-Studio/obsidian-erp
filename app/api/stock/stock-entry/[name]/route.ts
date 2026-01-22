// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { StockEntryUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Stock Entry");
export const PUT = createUpdateHandler("Stock Entry", StockEntryUpdateSchema);
export const DELETE = createDeleteHandler("Stock Entry");
