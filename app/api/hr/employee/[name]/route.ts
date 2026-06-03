// Obsidian ERP v4.0 - Employee Single Doc API
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { EmployeeUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Employee");
export const PUT = createUpdateHandler("Employee", EmployeeUpdateSchema);
export const DELETE = createDeleteHandler("Employee");
