// Obsidian ERP v4.0 - Designation Single Doc API
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { DesignationUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Designation");
export const PUT = createUpdateHandler("Designation", DesignationUpdateSchema);
export const DELETE = createDeleteHandler("Designation");
