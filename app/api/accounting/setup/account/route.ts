import { createCrudHandlers } from "@/lib/api-factory";
import {
  AccountCreateSchema,
  AccountUpdateSchema,
} from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers("Account", {
  createSchema: AccountCreateSchema,
  updateSchema: AccountUpdateSchema,
  listOptions: {
    allowedFields: [
      "name",
      "account_name",
      "account_number",
      "parent_account",
      "company",
      "root_type",
      "report_type",
      "account_type",
      "account_currency",
      "is_group",
      "freeze_account",
      "balance_must_be",
      "disabled",
    ],
    defaultSort: { field: "account_name", order: "asc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
