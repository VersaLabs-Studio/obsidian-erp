// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { DriverUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Driver");
export const PUT = createUpdateHandler("Driver", DriverUpdateSchema);
export const DELETE = createDeleteHandler("Driver");
