// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { MaterialRequestCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Material Request", {
  allowedFields: [
    "name",
    "material_request_type",
    "status",
    "per_ordered",
    "per_received",
    "company",
    "transaction_date",
    "schedule_date",
    "work_order",
    "sales_order",
    "project",
    "set_warehouse",
    "set_from_warehouse",
    "transfer_status",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Material Request",
  MaterialRequestCreateSchema,
);
