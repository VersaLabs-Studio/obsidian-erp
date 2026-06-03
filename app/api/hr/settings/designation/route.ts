// Obsidian ERP v4.0 - Designation API (GET list, POST create)
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { DesignationCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Designation", {
  allowedFields: ["name", "designation_name", "description", "creation"],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Designation", DesignationCreateSchema);
