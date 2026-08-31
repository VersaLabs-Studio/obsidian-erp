// app/api/buying/purchase-receipt/[name]/bill/route.ts
// Obsidian ERP v4.1 — One-click "Bill" for a Purchase Receipt (A3).
//
// When goods were received without billing (or the operator started at the
// receipt), the classic path is PR → Purchase Invoice wizard → create →
// submit. This route collapses it: ERPNext's OWN make_purchase_invoice mapper
// builds a fully-linked vendor bill from the receipt, and we submit it in one
// frappe.client.submit call. Every supplier, tax row and per-item back-link is
// set by ERPNext, never hand-mapped.
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). The user
// needs create+submit on Purchase Invoice.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const MAKE_PURCHASE_INVOICE =
  "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice";

/** 9R.14 — empty the inherited payment_schedule so ERPNext rebuilds fresh due
 *  dates against the new invoice's posting date. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resetPaymentSchedule(doc: any): void {
  doc.payment_schedule = [];
  doc.due_date = null;
  doc.payment_due_date = null;
}

/** 2Y-R3 — If the PI links back to a Purchase Order that is still a draft,
 *  ERPNext's `check_prev_docstatus` rejects the PI submit with "Purchase
 *  Order X is not submitted". Submit the PO first so the bill can land.
 *  The PO link lives on BOTH the PI header (`purchase_order`) and on each
 *  item row (`items[].purchase_order`) — ERPNext checks the item-level link,
 *  so we must scan both. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensurePOLinkSubmitted(client: any, piDoc: any): Promise<void> {
  const poNames = new Set<string>();
  if (piDoc?.purchase_order) poNames.add(String(piDoc.purchase_order));
  for (const row of Array.isArray(piDoc?.items) ? piDoc.items : []) {
    if (row?.purchase_order) poNames.add(String(row.purchase_order));
  }
  for (const poName of poNames) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const po: any = await (client.call as any).get("frappe.client.get", {
      doctype: "Purchase Order",
      name: poName,
    });
    const doc = po?.message ?? po;
    if (!doc || doc.docstatus === 1) continue; // already submitted (or missing)
    await (client.call as any).post("frappe.client.submit", {
      doc: JSON.stringify({ doctype: "Purchase Order", name: poName }),
    });
  }
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
        details: "Purchase Receipt name is required.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const purchaseReceiptId = decodeURIComponent(name);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builtPI: any = await (client.call as any).get(MAKE_PURCHASE_INVOICE, {
      source_name: purchaseReceiptId,
    });
    const piDoc = builtPI?.message ?? builtPI;
    if (!piDoc || typeof piDoc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `make_purchase_invoice returned no document for '${purchaseReceiptId}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }
    resetPaymentSchedule(piDoc);

    // 2Y-R3 — If the PI links to a Purchase Order (header or item row) that
    // is still a draft, submit it first (ERPNext rejects the PI otherwise).
    await ensurePOLinkSubmitted(client, piDoc);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submittedPI: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(piDoc) },
    );
    const piName: string | null =
      (submittedPI?.message ?? submittedPI)?.name ?? null;

    return NextResponse.json(
      {
        success: true,
        data: { purchase_invoice: piName },
        message: "Vendor bill raised.",
      },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
