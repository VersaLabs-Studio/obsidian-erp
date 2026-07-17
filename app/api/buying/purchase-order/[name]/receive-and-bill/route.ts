// app/api/buying/purchase-order/[name]/receive-and-bill/route.ts
// Obsidian ERP v4.1 — One-click "Receive & Bill" for a Purchase Order (A2).
//
// The procure-to-pay mirror of the sales `fulfill` route. The classic path is
// PO → Purchase Receipt wizard → create → submit → Purchase Invoice wizard →
// create → submit — four page hops for what an operator thinks of as ONE act
// ("the goods arrived, book them and record the bill"). This route collapses
// the chain server-side using ERPNext's OWN mappers, so every link field, tax
// row and per-item back-pointer is set by ERPNext, never hand-mapped:
//
//   1. make_purchase_receipt(PO) → frappe.client.submit  (stock moves in)
//   2. make_purchase_invoice(PR) → frappe.client.submit  (vendor bill raised)
//
// Partial-failure contract: if the PR submits but the PI fails, we return
// success:false WITH the purchase_receipt name so the UI can say "Received —
// billing failed: …" and the operator can raise the invoice from the PR. The
// PR is never silently lost. (Same contract shape as sales `fulfill`.)
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). The user
// needs create+submit on both Purchase Receipt and Purchase Invoice.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const MAKE_PURCHASE_RECEIPT =
  "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt";
const MAKE_PURCHASE_INVOICE =
  "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice";

/** 9R.14 — mapped targets carry the SOURCE doc's payment_schedule, whose due
 *  dates were computed against the source's earlier transaction date; ERPNext
 *  then rejects the new doc. Empty the schedule (keeping the terms template)
 *  so set_payment_schedule() rebuilds fresh dates on validate. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resetPaymentSchedule(doc: any): void {
  doc.payment_schedule = [];
  doc.due_date = null;
  doc.payment_due_date = null;
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
        details: "Purchase Order name is required.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const purchaseOrderId = decodeURIComponent(name);

  // ---- Step 1: Purchase Receipt (build via ERPNext mapper, then submit) ----
  let prName: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builtPR: any = await (client.call as any).get(MAKE_PURCHASE_RECEIPT, {
      source_name: purchaseOrderId,
    });
    const prDoc = builtPR?.message ?? builtPR;
    if (!prDoc || typeof prDoc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `make_purchase_receipt returned no document for '${purchaseOrderId}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }
    resetPaymentSchedule(prDoc);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submittedPR: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(prDoc) },
    );
    prName = (submittedPR?.message ?? submittedPR)?.name ?? null;
    if (!prName) throw new Error("Purchase Receipt submit returned no name");
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }

  // ---- Step 2: Purchase Invoice from the submitted PR ----------------------
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builtPI: any = await (client.call as any).get(MAKE_PURCHASE_INVOICE, {
      source_name: prName,
    });
    const piDoc = builtPI?.message ?? builtPI;
    if (!piDoc || typeof piDoc !== "object") {
      throw new Error(
        `make_purchase_invoice returned no document for '${prName}'.`,
      );
    }
    resetPaymentSchedule(piDoc);

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
        data: { purchase_receipt: prName, purchase_invoice: piName },
        message: "Goods received and billed.",
      },
      { status: 201 },
    );
  } catch (error) {
    // Partial success: the PR is real and submitted — surface it so the
    // operator can bill from the PR instead of retrying the whole chain.
    const err = frappeClient.handleError(error);
    return NextResponse.json(
      {
        success: false,
        error: "BillFailedAfterReceipt",
        details: `Purchase Receipt ${prName} was created and submitted, but the Purchase Invoice failed: ${err.details ?? err.error}`,
        data: { purchase_receipt: prName, purchase_invoice: null },
        statusCode: err.statusCode ?? 500,
      },
      { status: err.statusCode ?? 500 },
    );
  }
}
