// app/api/crm/address/route.ts
import { createListHandler, createCreateHandler } from "@/lib/api-factory";

// GET list, POST create
export const GET = createListHandler("Address", {
  allowedFields: ["name", "address_title", "address_line1", "city", "country"],
  defaultSort: { field: "creation", order: "desc" },
});

export const POST = createCreateHandler("Address");