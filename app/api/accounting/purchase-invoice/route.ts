import { createCrudHandlers } from "@/lib/api-factory";
import { PurchaseInvoiceCreateSchema } from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers("Purchase Invoice", {
  createSchema: PurchaseInvoiceCreateSchema,
  updateSchema: PurchaseInvoiceCreateSchema.partial(),
  listOptions: {
    allowedFields: [
      "name",
      "supplier",
      "supplier_name",
      "posting_date",
      "due_date",
      "status",
      // 4.1-C3 — required by detail-page gating (docstatus === 1 checks);
      // the SI route needed this same whitelist entry (2Z-R7b).
      "docstatus",
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
