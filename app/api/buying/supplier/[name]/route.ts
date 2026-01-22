// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { SupplierUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Supplier");
export const PUT = createUpdateHandler("Supplier", SupplierUpdateSchema);
export const DELETE = createDeleteHandler("Supplier");
