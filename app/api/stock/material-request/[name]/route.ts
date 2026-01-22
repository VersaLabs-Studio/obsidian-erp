// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { MaterialRequestUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Material Request");
export const PUT = createUpdateHandler(
  "Material Request",
  MaterialRequestUpdateSchema,
);
export const DELETE = createDeleteHandler("Material Request");
