import { createCrudHandlers } from "@/lib/api-factory";
import { SalesInvoiceCreateSchema } from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers("Sales Invoice", {
  createSchema: SalesInvoiceCreateSchema,
  updateSchema: SalesInvoiceCreateSchema.partial(),
  listOptions: {
    allowedFields: [
      "name",
      "customer",
      "customer_name",
      "posting_date",
      "due_date",
      "status",
      "grand_total",
      "outstanding_amount",
      "currency",
      "company",
    ],
    defaultSort: { field: "posting_date", order: "desc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
