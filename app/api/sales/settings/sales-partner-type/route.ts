import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { SalesPartnerTypeCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Sales Partner Type", {
  allowedFields: ["name", "creation"],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler(
  "Sales Partner Type",
  SalesPartnerTypeCreateSchema,
);
