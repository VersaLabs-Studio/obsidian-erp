import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { StockReconciliationCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Stock Reconciliation");
export const PUT = createUpdateHandler("Stock Reconciliation", StockReconciliationCreateSchema);
export const DELETE = createDeleteHandler("Stock Reconciliation");
