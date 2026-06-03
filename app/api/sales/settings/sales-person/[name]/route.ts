// Obsidian ERP v4.0 - Sales Person Single Doc API
import { createGetHandler, createUpdateHandler, createDeleteHandler } from "@/lib/api-factory";
import { SalesPersonUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Sales Person");
export const PUT = createUpdateHandler("Sales Person", SalesPersonUpdateSchema);
export const DELETE = createDeleteHandler("Sales Person");