// Obsidian ERP v4.0 - Department Single Doc API
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { DepartmentUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Department");
export const PUT = createUpdateHandler("Department", DepartmentUpdateSchema);
export const DELETE = createDeleteHandler("Department");
