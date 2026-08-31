// app/api/stock/purchase-receipt/route.ts
// Obsidian ERP v4.0 — Purchase Receipt REST surface (Stock module).
//
// Mirrors the Delivery Note route (same factory pattern). This file was
// MISSING — the doctype-config pointed the client at `stock/purchase-receipts`
// (a stray plural; every sibling is singular) and no route existed at either
// path, so the wizard's POST 404'd. The apiPath is now corrected to the
// singular `stock/purchase-receipt` (matching the error-resolver + flow-chain
// maps), and this handler answers it. RBAC is enforced by the factory via
// per-request `sid` forwarding → ERPNext DocPerm (Purchase User / Stock roles).
//
// 2Y-R3 — PO-style server-side warehouse backfill: ERPNext requires
// `warehouse` per PR item row. The wizard no longer exposes a warehouse
// picker (implicit), so we resolve the default "Stores" warehouse here and
// fill any blank rows before calling frappe.client.insert.
import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { createListHandler } from "@/lib/api-factory";
import { PurchaseReceiptCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Purchase Receipt", {
  allowedFields: [
    "name",
    "supplier",
    "supplier_name",
    "supplier_delivery_note",
    "posting_date",
    "posting_time",
    "status",
    "currency",
    "grand_total",
    "base_grand_total",
    "total_qty",
    "per_billed",
    "per_returned",
    "is_return",
    "return_against",
    "set_warehouse",
    "company",
    "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
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
      PurchaseReceiptCreateSchema.parse(body);
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

    const data = await client.db.createDoc("Purchase Receipt", body);

    return NextResponse.json(
      { success: true, data, message: "Purchase Receipt created successfully" },
      { status: 201 },
    );
  } catch (error) {
    const errorResponse = frappeClient.handleError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode || 500 });
  }
}
