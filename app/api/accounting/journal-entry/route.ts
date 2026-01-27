import { createCrudHandlers } from "@/lib/api-factory";
import { JournalEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers("Journal Entry", {
  createSchema: JournalEntryCreateSchema,
  updateSchema: JournalEntryCreateSchema.partial(),
  listOptions: {
    allowedFields: [
      "name",
      "voucher_type",
      "posting_date",
      "company",
      "total_debit",
      "total_credit",
      "user_remark",
      "docstatus",
    ],
    defaultSort: { field: "posting_date", order: "desc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
