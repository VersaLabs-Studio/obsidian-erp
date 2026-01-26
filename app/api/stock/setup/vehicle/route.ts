// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { VehicleCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Vehicle", {
  allowedFields: [
    "name",
    "license_plate",
    "make",
    "model",
    "fuel_type",
    "acquisition_date",
    "location",
    "creation",
  ],
  defaultSort: { field: "license_plate", order: "asc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Vehicle", VehicleCreateSchema);
