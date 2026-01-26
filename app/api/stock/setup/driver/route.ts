// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { DriverCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Driver", {
  allowedFields: [
    "name",
    "full_name",
    "status",
    "license_number",
    "cell_number",
    "transporter",
    "employee",
    "expiry_date",
    "creation",
  ],
  defaultSort: { field: "full_name", order: "asc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Driver", DriverCreateSchema);
