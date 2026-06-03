// Obsidian ERP v4.0 - Employee API (GET list, POST create)
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { EmployeeCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Employee", {
  allowedFields: [
    "name",
    "employee_name",
    "employee",
    "company",
    "department",
    "designation",
    "status",
    "user_id",
    "creation",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Employee", EmployeeCreateSchema);
