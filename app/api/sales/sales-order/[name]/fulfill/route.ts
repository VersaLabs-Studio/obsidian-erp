// app/api/sales/sales-order/[name]/fulfill/route.ts
// Obsidian ERP v4.0 — One-click "Deliver & Invoice" for a Sales Order (2Z).
//
// SME easing: the classic path is SO → DN wizard → create → submit → SI
// wizard → create → submit — four page hops for what a print-shop operator
// thinks of as ONE act ("the order left the shop, bill it"). This route
// collapses the chain server-side using ERPNext's OWN mappers (the same
// functions the desk buttons call), so every link field, tax row and
// per-item back-pointer is set by ERPNext, never hand-mapped:
//
//   1. make_delivery_note(SO)  → frappe.client.submit  (stock moves out)
//   2. make_sales_invoice(DN)  → frappe.client.submit  (billing raised)
//
// The optional `fs_number` body field stamps the client-mandated fiscal
// serial (`pana_fs_number` custom field) onto the Sales Invoice before it
// is submitted, so the fiscal reference is captured at creation time.
//
// Partial-failure contract: if the DN submits but the SI fails, we return
// 207-style success:false WITH the delivery_note name so the UI can say
// "Delivered — invoicing failed: …" and the operator can raise the invoice
// from the DN. The DN is never silently lost.
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). ERPNext
// runs its native DocPerm checks — the user needs create+submit on both
// Delivery Note and Sales Invoice.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const MAKE_DELIVERY_NOTE =
  "erpnext.selling.doctype.sales_order.sales_order.make_delivery_note";
const MAKE_SALES_INVOICE =
  "erpnext.stock.doctype.delivery_note.delivery_note.make_sales_invoice";

/** 9R.14 — mapped targets carry the SOURCE doc's payment_schedule, whose
 *  due dates were computed against the source's earlier transaction date;
 *  ERPNext then rejects the new doc ("Due Date … cannot be before Posting
 *  Date"). Empty the schedule (keeping the terms template) so ERPNext's
 *  set_payment_schedule() rebuilds fresh dates on validate. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resetPaymentSchedule(doc: any): void {
  doc.payment_schedule = [];
  doc.due_date = null;
  doc.payment_due_date = null;
}

/** Detect ERPNext's negative-stock rejection so the operator gets a guided
 *  "finish production first" message instead of a raw traceback. */
function isNegativeStockError(message: string): boolean {
  return (
    message.includes("NegativeStockError") ||
    message.includes("needed in Warehouse") ||
    (message.includes("Insufficient Stock") && !message.includes("Allow"))
  );
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
        details: "Sales Order name is required.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const salesOrderId = decodeURIComponent(name);

  const body = (await request.json().catch(() => ({}))) as {
    fs_number?: string;
  };

  // ---- Step 1: Delivery Note (build via ERPNext mapper, then submit) ------
  let dnName: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builtDN: any = await (client.call as any).get(MAKE_DELIVERY_NOTE, {
      source_name: salesOrderId,
    });
    const dnDoc = builtDN?.message ?? builtDN;
    if (!dnDoc || typeof dnDoc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `make_delivery_note returned no document for '${salesOrderId}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }
    resetPaymentSchedule(dnDoc);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submittedDN: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(dnDoc) },
    );
    dnName = (submittedDN?.message ?? submittedDN)?.name ?? null;
    if (!dnName) throw new Error("Delivery Note submit returned no name");
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    if (isNegativeStockError(errMessage)) {
      return NextResponse.json(
        {
          success: false,
          error: "FinishedGoodsNotInStock",
          details:
            "Finished goods are not in stock yet — finish production first " +
            "(use the Finish button on the Work Order), then Deliver & Invoice.",
          statusCode: 422,
        },
        { status: 422 },
      );
    }
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }

  // ---- Step 2: Sales Invoice from the submitted DN -------------------------
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builtSI: any = await (client.call as any).get(MAKE_SALES_INVOICE, {
      source_name: dnName,
    });
    const siDoc = builtSI?.message ?? builtSI;
    if (!siDoc || typeof siDoc !== "object") {
      throw new Error(
        `make_sales_invoice returned no document for '${dnName}'.`,
      );
    }
    resetPaymentSchedule(siDoc);
    if (body.fs_number && body.fs_number.trim()) {
      // Client-mandated fiscal serial — captured at creation, editable later.
      siDoc.pana_fs_number = body.fs_number.trim();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submittedSI: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(siDoc) },
    );
    const siName: string | null =
      (submittedSI?.message ?? submittedSI)?.name ?? null;

    return NextResponse.json(
      {
        success: true,
        data: { delivery_note: dnName, sales_invoice: siName },
        message: "Order delivered and invoiced.",
      },
      { status: 201 },
    );
  } catch (error) {
    // Partial success: the DN is real and submitted — surface it so the
    // operator can invoice from the DN instead of retrying the whole chain.
    const err = frappeClient.handleError(error);
    return NextResponse.json(
      {
        success: false,
        error: "InvoiceFailedAfterDelivery",
        details: `Delivery Note ${dnName} was created and submitted, but the Sales Invoice failed: ${err.details ?? err.error}`,
        data: { delivery_note: dnName, sales_invoice: null },
        statusCode: err.statusCode ?? 500,
      },
      { status: err.statusCode ?? 500 },
    );
  }
}
