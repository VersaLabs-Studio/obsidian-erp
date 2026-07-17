// app/api/accounting/payment/quick/route.ts
// Obsidian ERP v4.0 — One-click "Mark as Paid" (2Z) · party-agnostic (4.1 A1).
//
// SME easing: cash settlement is the norm for the Pana print shop, yet the
// classic path is Invoice → Payment Entry wizard → pick accounts → create →
// submit. This route collapses it: ERPNext's OWN `get_payment_entry` mapper
// (the function behind the desk "Payment" button) builds a fully-correct PE
// draft — party, references[], outstanding/paid amounts, exchange rates and
// the company's default receivable/payable + cash accounts — and we submit it
// in one `frappe.client.submit` call.
//
// 4.1 A1 — the mapper is PARTY-AGNOSTIC. The same route now settles both a
// customer receipt (Sales Invoice → payment_type "Receive") and a vendor bill
// (Purchase Invoice → payment_type "Pay"). Pass `doctype` to choose; it
// defaults to "Sales Invoice"/"Receive" so the 2Z sales behaviour is byte-for-
// byte unchanged. ERPNext infers party_type + payment_type from the reference
// doctype, so we read the direction back off the built draft and override the
// correct cash-account side:
//   • Receive → money lands IN  → override `paid_to`
//   • Pay     → money goes  OUT → override `paid_from`
//
// Mode of Payment: defaults to "Cash". When the chosen mode carries a
// company-specific default account (Mode of Payment → accounts[] child rows —
// readable ONLY via the full doc, never get_list), we override the cash side
// with it; otherwise ERPNext's mapper default stands.
//
// RBAC: per-request, sid-forwarded user client (fail closed 401). The user
// needs create+submit on Payment Entry.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

const GET_PAYMENT_ENTRY =
  "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry";

export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => ({}))) as {
    invoice?: string;
    doctype?: string;
    mode_of_payment?: string;
  };
  if (!body.invoice) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields",
        details: "Provide `invoice` (the invoice name) in the body.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  // 4.1 A1 — default to Sales Invoice so existing 2Z callers are unchanged.
  const invoiceDoctype = body.doctype?.trim() || "Sales Invoice";
  const modeOfPayment = body.mode_of_payment?.trim() || "Cash";

  try {
    // 1) ERPNext builds the Payment Entry — references, amounts, accounts,
    //    party_type + payment_type (inferred from the reference doctype).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const built: any = await (client.call as any).get(GET_PAYMENT_ENTRY, {
      dt: invoiceDoctype,
      dn: body.invoice,
    });
    const peDoc = built?.message ?? built;
    if (!peDoc || typeof peDoc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `get_payment_entry returned no document for '${body.invoice}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }

    peDoc.mode_of_payment = modeOfPayment;

    // 2) If the mode has a default account for this company, route the cash
    //    side through it. Child rows (accounts[]) are only on the full doc —
    //    get_list on a child-table field 500s (SQL 1054), so read via
    //    frappe.client.get. The side depends on the payment direction:
    //    Receive → paid_to (in), Pay → paid_from (out).
    const isPay = peDoc.payment_type === "Pay";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modeResp: any = await (client.call as any).get("frappe.client.get", {
        doctype: "Mode of Payment",
        name: modeOfPayment,
      });
      const modeDoc = modeResp?.message ?? modeResp;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountRow = (modeDoc?.accounts as any[] | undefined)?.find(
        (r) => r?.company === peDoc.company && r?.default_account,
      );
      if (accountRow?.default_account) {
        if (isPay) peDoc.paid_from = accountRow.default_account;
        else peDoc.paid_to = accountRow.default_account;
      }
    } catch {
      // Mode lookup failed (missing doc / no perm) — keep the mapper's
      // default account; the payment still posts correctly.
    }

    // 3) Insert + submit in one server call. on_submit updates the invoice's
    //    outstanding_amount and status (→ "Paid" when fully settled).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submitted: any = await (client.call as any).post(
      "frappe.client.submit",
      { doc: JSON.stringify(peDoc) },
    );
    const result = submitted?.message ?? submitted;

    return NextResponse.json(
      {
        success: true,
        data: {
          name: result?.name ?? null,
          paid_amount: result?.paid_amount ?? peDoc.paid_amount ?? null,
        },
        message: `Payment recorded (${modeOfPayment}).`,
      },
      { status: 201 },
    );
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
