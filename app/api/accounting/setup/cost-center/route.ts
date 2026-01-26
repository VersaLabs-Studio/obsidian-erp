import { createCrudHandlers } from "@/lib/api-factory";
import {
  CostCenterCreateSchema,
  CostCenterUpdateSchema,
} from "@/lib/schemas/doctype-schemas";

const { listHandler, createHandler } = createCrudHandlers("Cost Center", {
  createSchema: CostCenterCreateSchema,
  updateSchema: CostCenterUpdateSchema,
  listOptions: {
    allowedFields: [
      "name",
      "cost_center_name",
      "cost_center_number",
      "parent_cost_center",
      "company",
      "is_group",
      "disabled",
    ],
    defaultSort: { field: "cost_center_name", order: "asc" },
  },
});

export const GET = listHandler;
export const POST = createHandler;
