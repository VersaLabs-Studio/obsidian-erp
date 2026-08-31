// app/api/buying/purchase-order/route.ts
// 2Y-R3 — PO create with server-side warehouse backfill.
// ERPNext requires `warehouse` per item row for stock items. The wizard
// exposes a header "Receipt Warehouse" that propagates to items, but users
// often skip it. Rather than reject, we resolve the company's default
// "Stores" warehouse server-side and fill ONLY the blanks before calling
// frappe.client.insert.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { createListHandler } from "@/lib/api-factory";
import { PurchaseOrderCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Purchase Order", {
  allowedFields: [
    "name",
    "supplier",
    "supplier_name",
    "status",
    "per_received",
    "per_billed",
    "company",
    "transaction_date",
    "schedule_date",
    "grand_total",
    "currency",
    "set_warehouse",
    "material_request",
    "project",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function backfillWarehouses(doc: any, storesWarehouse: string): void {
  if (!storesWarehouse) return;
  const rows: any[] = Array.isArray(doc?.items) ? doc.items : [];
  for (const row of rows) {
    if (!row.warehouse) row.warehouse = storesWarehouse;
  }
  if (!doc.set_warehouse) doc.set_warehouse = storesWarehouse;
}

// 2Y-R3 — Resolve the receiving warehouse for backfill. Honors the UI
// warehouse-defaults setting (Stock Settings.default_warehouse) first, then
// falls back to the canonical "Stores - <abbr>" name so backfill always has
// a target even when the setting is blank.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveReceivingWarehouse(client: any, company: string): Promise<string> {
  // 1) UI setting: Stock Settings.default_warehouse (the "source" warehouse
  //    the operator configures in Settings → Stock → Warehouse Defaults).
  try {
    const stockResp: any = await (client.call as any).get(
      "frappe.client.get_value",
      { doctype: "Stock Settings", filters: { name: "Stock Settings" }, fieldname: "default_warehouse" },
    );
    const saved = (stockResp?.message ?? stockResp)?.default_warehouse as string | undefined;
    if (saved) return saved;
  } catch {
    /* best-effort */
  }

  // 2) Canonical fallback: "Stores - <abbr>" from the Company doc.
  try {
    const companyResp: any = await (client.call as any).get(
      "frappe.client.get_value",
      { doctype: "Company", filters: { name: company }, fieldname: "abbr" },
    );
    const abbr = (companyResp?.message ?? companyResp)?.abbr as string | undefined;
    if (abbr) return `Stores - ${abbr}`;
  } catch {
    /* best-effort */
  }

  return "";
}

export async function POST(request: NextRequest) {
  const client = getRequestClient(request);
  if (!client) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", details: "No valid session.", statusCode: 401 },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    // Zod validation
    try {
      PurchaseOrderCreateSchema.parse(body);
    } catch (e) {
      if (e instanceof Error && "flatten" in e) {
        return NextResponse.json(
          { success: false, error: "Validation Error", details: (e as any).flatten().fieldErrors },
          { status: 400 },
        );
      }
      throw e;
    }

    // 2Y-R3 — Resolve the receiving warehouse (UI setting first, canonical
    // fallback second) and backfill any blank warehouses on item rows +
    // header before calling frappe.client.insert.
    const storesWarehouse = await resolveReceivingWarehouse(client, body.company);
    backfillWarehouses(body, storesWarehouse);

    const data = await client.db.createDoc("Purchase Order", body);

    return NextResponse.json(
      { success: true, data, message: "Purchase Order created successfully" },
      { status: 201 },
    );
  } catch (error) {
    const errorResponse = frappeClient.handleError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
