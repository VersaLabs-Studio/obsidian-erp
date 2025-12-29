// app/api/accounting/options/route.ts
import { NextRequest } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { handleApiRequest, withEndpointLogging } from "@/lib/api-template";

interface AccountingOptions {
  companies: Array<{ name: string; company_name: string }>;
  suppliers: Array<{ name: string; supplier_name: string }>;
  customers: Array<{ name: string; customer_name: string }>;
  items: Array<{
    name: string;
    item_code: string;
    item_name: string;
    description: string;
    stock_uom: string;
    standard_rate: number;
    is_stock_item: number;
  }>;
  warehouses: Array<{ name: string; warehouse_name: string }>;
  accounts: Array<{
    name: string;
    account_name: string;
    account_type: string;
    root_type: string;
  }>;
  expenseTypes?: Array<{ name: string; description: string }>; // Optional - Expense Claim Type may not be available
  paymentMethods: Array<{ name: string; mode_of_payment: string }>;
}

export async function GET(request: NextRequest) {
  return handleApiRequest<{ options: AccountingOptions }>(
    withEndpointLogging("/api/accounting/options - GET")(async () => {
      const { searchParams } = new URL(request.url);
      const module = searchParams.get("module"); // purchases, expenses, payments, etc.

      // Fetch companies
      const companies = await frappeClient.call.get("frappe.client.get_list", {
        doctype: "Company",
        fields: ["name", "company_name"],
        limit: 100,
      });

      // Fetch suppliers
      const suppliers = await frappeClient.call.get("frappe.client.get_list", {
        doctype: "Supplier",
        fields: ["name", "supplier_name"],
        limit: 100,
      });

      // Fetch customers
      const customers = await frappeClient.call.get("frappe.client.get_list", {
        doctype: "Customer",
        fields: ["name", "customer_name"],
        limit: 100,
      });

      // Fetch items
      const items = await frappeClient.call.get("frappe.client.get_list", {
        doctype: "Item",
        fields: [
          "name",
          "item_code",
          "item_name",
          "description",
          "stock_uom",
          "standard_rate",
          "is_stock_item",
        ],
        filters: [["disabled", "=", 0]],
        limit: 1000,
      });

      // Fetch warehouses
      const warehouses = await frappeClient.call.get("frappe.client.get_list", {
        doctype: "Warehouse",
        fields: ["name", "warehouse_name"],
        limit: 100,
      });

      // Fetch accounts
      const accounts = await frappeClient.call.get("frappe.client.get_list", {
        doctype: "Account",
        fields: ["name", "account_name", "account_type", "root_type"],
        limit: 1000,
      });

      // Fetch expense types
      // const expenseTypes = await frappeClient.call.get("frappe.client.get_list", {
      //   doctype: "Expense Claim Type",
      //   fields: ["name", "description"],
      //   limit: 100,
      // });

      // Fetch payment methods
      const paymentMethods = await frappeClient.call.get(
        "frappe.client.get_list",
        {
          doctype: "Mode of Payment",
          fields: ["name", "mode_of_payment"],
          limit: 100,
        }
      );

      // Process the data
      const processedCompanies =
        companies.message?.map((company: any) => ({
          name: company.name,
          company_name: company.company_name,
        })) || [];

      const processedSuppliers =
        suppliers.message?.map((supplier: any) => ({
          name: supplier.name,
          supplier_name: supplier.supplier_name,
        })) || [];

      const processedCustomers =
        customers.message?.map((customer: any) => ({
          name: customer.name,
          customer_name: customer.customer_name,
        })) || [];

      const processedItems =
        items.message?.map((item: any) => ({
          name: item.name,
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          stock_uom: item.stock_uom,
          standard_rate: item.standard_rate,
          is_stock_item: item.is_stock_item,
        })) || [];

      const processedWarehouses =
        warehouses.message?.map((warehouse: any) => ({
          name: warehouse.name,
          warehouse_name: warehouse.warehouse_name,
        })) || [];

      const processedAccounts =
        accounts.message?.map((account: any) => ({
          name: account.name,
          account_name: account.account_name,
          account_type: account.account_type,
          root_type: account.root_type,
        })) || [];

      // const processedExpenseTypes = expenseTypes.message?.map((type: any) => ({
      //   name: type.name,
      //   description: type.description,
      // })) || [];

      const processedPaymentMethods =
        paymentMethods.message?.map((method: any) => ({
          name: method.name,
          mode_of_payment: method.mode_of_payment,
        })) || [];

      const options: AccountingOptions = {
        companies: processedCompanies,
        suppliers: processedSuppliers,
        customers: processedCustomers,
        items: processedItems,
        warehouses: processedWarehouses,
        accounts: processedAccounts,
        // expenseTypes: processedExpenseTypes,
        paymentMethods: processedPaymentMethods,
      };

      return { options };
    })
  );
}
