// app/api/buying/material-request/[name]/order/route.ts
// Obsidian ERP v4.1 — One-click "Order (auto)" for a Material Request (A4).
//
// The common SME case is "order everything requested, from the default
// supplier." The classic path is MR → Purchase Order wizard (3 steps) →
// create → submit. This route collapses it: ERPNext's OWN make_purchase_order
// mapper carries every requested line and sets `material_request` +
// `material_request_item` per row (so status propagates back to the MR on
// submit), and we submit it in one frappe.client.submit call.
//
// A Purchase Order has no payment_schedule, so no 9R.14 reset is needed. The
// PO is created submitted; the multi-step wizard stays as the advanced path
// (choose supplier per line, split across suppliers, adjust rates).
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). The user
// needs create+submit on Purchase Order.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const MAKE_PURCHASE_ORDER =
  "erpnext.stock.doctype.material_request.material_request.make_purchase_order";

// 2Y-R3 — Warehouse backfill for PO items when the MR has no warehouse.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function backfillPOWarehouses(poDoc: any, storesWarehouse: string): void {
  if (!storesWarehouse) return;
  const rows: any[] = Array.isArray(poDoc?.items) ? poDoc.items : [];
  for (const row of rows) {
    if (!row.warehouse) row.warehouse = storesWarehouse;
  }
  if (!poDoc.set_warehouse) poDoc.set_warehouse = storesWarehouse;
}

// 2Y-R3 — Resolve the receiving warehouse for backfill. Honors the UI
// warehouse-defaults setting (Stock Settings.default_warehouse) first, then
// falls back to the canonical "Stores - <abbr>" name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveReceivingWarehouse(client: any, company: string): Promise<string> {
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const client = getRequestClient(request);
  if (!client) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
        details: "No valid session.",
        statusCode: 401,
      },
      { status: 401 },
    );
  }

  const { name } = await params;
  if (!name) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing Parameter",
        details: "Material Request name is required.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const materialRequestId = decodeURIComponent(name);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builtPO: any = await (client.call as any).get(MAKE_PURCHASE_ORDER, {
      source_name: materialRequestId,
    });
    const poDoc = builtPO?.message ?? builtPO;
    if (!poDoc || typeof poDoc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `make_purchase_order returned no document for '${materialRequestId}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }

    // Guided error: ERPNext's mapper rejects when no supplier can be resolved
    // for the requested items (no default supplier on the Item). Surface a
    // plain-language hint instead of a raw traceback.
    if (!poDoc.supplier) {
      return NextResponse.json(
        {
          success: false,
          error: "SupplierRequired",
          details:
            "No default supplier is set on the requested item(s). Set a " +
            "Default Supplier on the Item (or use the Purchase Order wizard " +
            "to pick one), then order.",
          statusCode: 422,
        },
        { status: 422 },
      );
    }

    // 2Y-R3 — Backfill warehouse on PO items (the MR might not have one).
    // Honors the UI warehouse-defaults setting, canonical fallback second.
    const storesWarehouse = await resolveReceivingWarehouse(client, poDoc.company);
    backfillPOWarehouses(poDoc, storesWarehouse);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submittedPO: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(poDoc) },
    );
    const poName: string | null =
      (submittedPO?.message ?? submittedPO)?.name ?? null;

    return NextResponse.json(
      {
        success: true,
        data: { purchase_order: poName },
        message: "Purchase Order created and submitted.",
      },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
