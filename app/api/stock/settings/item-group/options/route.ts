// app/api/stock/settings/item-group/options/route.ts
import { NextRequest } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { handleApiRequest, withEndpointLogging } from "@/lib/api-template";
import { ItemGroupOptions } from "@/types/item-group";

// GET - Fetch options for dropdowns
export async function GET(request: NextRequest) {
  return handleApiRequest<ItemGroupOptions>(
    withEndpointLogging("/api/stock/settings/item-group/options - GET")(
      async () => {
        // Fetch item groups
        const itemGroups = await frappeClient.db.getDocList("Item Group", {
          fields: ["name", "item_group_name", "is_group"],
          orderBy: { field: "item_group_name", order: "asc" as const },
        });

        // Fetch price lists
        const priceLists = await frappeClient.db.getDocList("Price List", {
          fields: ["name"],
          filters: [["enabled", "=", 1]],
          orderBy: { field: "name", order: "asc" as const },
        });

        // Fetch warehouses
        const warehouses = await frappeClient.db.getDocList("Warehouse", {
          fields: ["name"],
          filters: [["is_group", "=", 0]],
          orderBy: { field: "name", order: "asc" as const },
        });

        // Fetch cost centers
        const costCenters = await frappeClient.db.getDocList("Cost Center", {
          fields: ["name"],
          filters: [["is_group", "=", 0]],
          orderBy: { field: "name", order: "asc" as const },
        });

        // Fetch expense accounts
        const expenseAccounts = await frappeClient.db.getDocList("Account", {
          fields: ["name"],
          filters: [
            ["account_type", "=", "Expense Account"],
            ["is_group", "=", 0],
          ],
          orderBy: { field: "name", order: "asc" as const },
        });

        // Fetch income accounts
        const incomeAccounts = await frappeClient.db.getDocList("Account", {
          fields: ["name"],
          filters: [
            ["account_type", "=", "Income Account"],
            ["is_group", "=", 0],
          ],
          orderBy: { field: "name", order: "asc" as const },
        });

        // Fetch suppliers
        const suppliers = await frappeClient.db.getDocList("Supplier", {
          fields: ["name", "supplier_name"],
          filters: [["disabled", "=", 0]],
          orderBy: { field: "supplier_name", order: "asc" as const },
        });

        // Fetch tax templates
        const taxTemplates = await frappeClient.db.getDocList(
          "Item Tax Template",
          {
            fields: ["name"],
            orderBy: { field: "name", order: "asc" as const },
          }
        );

        // Fetch tax categories
        const taxCategories = await frappeClient.db.getDocList("Tax Category", {
          fields: ["name"],
          orderBy: { field: "name", order: "asc" as const },
        });

        return {
          item_groups: itemGroups,
          price_lists: priceLists.map((p) => ({
            value: p.name,
            label: p.name,
          })),
          warehouses: warehouses.map((w) => ({ value: w.name, label: w.name })),
          cost_centers: costCenters.map((c) => ({
            value: c.name,
            label: c.name,
          })),
          expense_accounts: expenseAccounts.map((a) => ({
            value: a.name,
            label: a.name,
          })),
          income_accounts: incomeAccounts.map((a) => ({
            value: a.name,
            label: a.name,
          })),
          suppliers: suppliers.map((s) => ({
            value: s.name,
            label: s.supplier_name || s.name,
          })),
          tax_templates: taxTemplates.map((t) => ({
            value: t.name,
            label: t.name,
          })),
          tax_categories: taxCategories.map((t) => ({
            value: t.name,
            label: t.name,
          })),
        };
      }
    )
  );
}
