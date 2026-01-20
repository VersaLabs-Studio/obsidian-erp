import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { WorkstationCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Workstation", {
  allowedFields: [
    "name",
    "workstation_name",
    "workstation_type",
    "plant_floor",
    "warehouse",
    "status",
    "production_capacity",
    "hour_rate",
    "hour_rate_labour",
    "hour_rate_electricity",
    "hour_rate_consumable",
    "hour_rate_rent",
    "description",
    "docstatus",
    "creation",
    "modified",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler("Workstation", WorkstationCreateSchema);
