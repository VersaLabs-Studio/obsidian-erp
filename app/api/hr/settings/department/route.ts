// Obsidian ERP v4.0 - Department API (GET list, POST create)
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { DepartmentCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Department", {
  allowedFields: [
    "name",
    "department_name",
    "parent_department",
    "company",
    "is_group",
    "creation",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Department", DepartmentCreateSchema);
