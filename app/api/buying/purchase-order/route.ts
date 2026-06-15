import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { PurchaseOrderCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Purchase Order", {
  allowedFields: [
    "name",
    "supplier",
    "supplier_name",
    "status",
    "per_received",
    "per_billed",
    "company",
    "transaction_date",
    "schedule_date",
    "grand_total",
    "currency",
    "set_warehouse",
    "material_request",
    "project",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Purchase Order",
  PurchaseOrderCreateSchema,
);
