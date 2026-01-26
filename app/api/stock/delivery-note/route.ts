// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { DeliveryNoteCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Delivery Note", {
  allowedFields: [
    "name",
    "customer",
    "customer_name",
    "posting_date",
    "posting_time",
    "status",
    "grand_total",
    "total_qty",
    "per_billed",
    "per_returned",
    "transporter",
    "transporter_name",
    "driver",
    "driver_name",
    "vehicle_no",
    "lr_no",
    "shipping_address_name",
    "set_warehouse",
    "is_return",
    "return_against",
    "company",
    "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Delivery Note",
  DeliveryNoteCreateSchema,
);
