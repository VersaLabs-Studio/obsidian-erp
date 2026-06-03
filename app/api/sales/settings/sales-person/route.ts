// Obsidian ERP v4.0 - Sales Person API (GET list, POST create)
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { SalesPersonCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Sales Person", {
  allowedFields: ["name", "sales_person_name", "enabled", "parent_sales_person", "employee", "is_group", "creation"],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Sales Person", SalesPersonCreateSchema);