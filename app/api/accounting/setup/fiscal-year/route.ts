import { createCrudHandlers } from "@/lib/api-factory";
// Fiscal Year doesn't have a complex schema yet, using generic
const { listHandler, createHandler } = createCrudHandlers("Fiscal Year", {
  listOptions: {
    allowedFields: [
      "name",
      "year",
      "year_start_date",
      "year_end_date",
      "disabled",
    ],
    defaultSort: { field: "year_start_date", order: "desc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
