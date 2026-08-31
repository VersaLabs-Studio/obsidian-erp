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

// ---------------------------------------------------------------------------
// 2Y-R3 — Warehouse backfill for PR items
// ---------------------------------------------------------------------------
// ERPNext's make_purchase_receipt copies warehouses FROM the PO into the PR
// rows. When the PO was created without set_warehouse or per-item warehouse
// (the prefill bug), those rows come back with an empty `warehouse`, and
// ERPNext's validate_mandatory rejects the doc. Rather than force the user
// to re-create the PO, we resolve the company's default "Stores" warehouse
// and fill ONLY the blanks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function backfillPRWarehouses(prDoc: any, storesWarehouse: string): void {
  if (!storesWarehouse) return;
  const rows: any[] = Array.isArray(prDoc?.items) ? prDoc.items : [];
  for (const row of rows) {
    if (!row.warehouse) row.warehouse = storesWarehouse;
  }
  // Header-level warehouse fallback.
  if (!prDoc.set_warehouse) prDoc.set_warehouse = storesWarehouse;
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
        details: "Purchase Order name is required.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  const purchaseOrderId = decodeURIComponent(name);

  // ---- Step 1: Purchase Receipt (build via ERPNext mapper, then submit) ----
  // 2Y-R3 — Guard: if the PO is already fully received, skip the PR step
  // and find the most recent submitted PR to bill from. ERPNext rejects
  // a second make_purchase_receipt with "over receipt / delivery" error.
  let prName: string | null = null;
  let alreadyReceived = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poDoc: any = await (client.call as any).get("frappe.client.get", {
      doctype: "Purchase Order",
      name: purchaseOrderId,
    });
    const po = poDoc?.message ?? poDoc;
    const perReceived = Number(po?.per_received ?? 0);
    if (perReceived >= 100) {
      // PO is fully received — find the most recent submitted PR for this PO.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prList: any = await (client.call as any).get(
        "frappe.client.get_list",
        {
          doctype: "Purchase Receipt",
          filters: [
            ["purchase_order", "=", purchaseOrderId],
            ["docstatus", "=", 1],
          ],
          fields: ["name"],
          order_by: "creation desc",
          limit: 1,
        },
      );
      const list = (prList?.message ?? prList) as { name: string }[] | undefined;
      if (Array.isArray(list) && list.length > 0 && list[0]?.name) {
        prName = list[0].name;
        alreadyReceived = true;
      }
    }
  } catch {
    /* best-effort — fall through to normal PR creation */
  }

  if (!alreadyReceived) {
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

      // 2Y-R3 — Resolve the receiving warehouse (UI setting first, canonical
      // fallback second) and backfill blanks on the PR items.
      const storesWarehouse = await resolveReceivingWarehouse(client, prDoc.company);
      backfillPRWarehouses(prDoc, storesWarehouse);

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
        data: { purchase_receipt: prName, purchase_invoice: piName },
        message: alreadyReceived
          ? "Vendor bill raised from existing receipt."
          : "Goods received and billed.",
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
