// app/api/erpnext/make-from/route.ts
// Obsidian ERP v4.0 — Server-side ERPNext `make_*` mappers (2P Part 1.3,
// 2P-FINAL Part C).
//
// The recommended path (per Phase 2P handoff): instead of hand-building
// the new doctype's payload from the source's `auto-fill` registry, call
// ERPNext's own server-side mapper for the link doc. ERPNext's
// `make_sales_invoice(so)`, `make_delivery_note(so)`, etc. returns a
// fully-mapped draft — every link field, tax row, pricing rule, and
// pricing-list conversion ERPNext expects is set; the new doc is ready
// to be reviewed + submitted by the operator.
//
// Why this is better than hand-mapping:
//   - ERPNext's mappers know the per-item back-links (`sales_order` +
//     `so_detail` on Sales Invoice Item; `delivery_note` + `dn_detail`;
//     `purchase_order` + `po_detail`; etc.). The hand-mapping registry
//     in `lib/flows/flow-auto-fill.ts` is correct in 2P, but the
//     server-side mapper is the canonical source.
//   - The mapper runs all the field-required checks (e.g. "Item has no
//     default BOM"; "Price List not found"; "Item is not a stock item").
//     The wizard UI sees those errors as guided messages, not as silent
//     500s.
//
// 2P-FINAL Part A.3 — USER CLIENT. This route is a per-user mapping
// read (the operator is creating THEIR own SI / DN / PI from a source
// doc), so it uses the user-scoped FrappeApp (`getRequestClient`) and
// forwards the `sid` as a Cookie. ERPNext runs its native perm check
// for the user — they need at least READ on the source and CREATE on
// the target. Fail closed (401) when no session.
//
// 2P-FINAL Part C — CANONICAL PATH. The SI "new" page now calls this
// route FIRST and hydrates the wizard from the returned draft. The
// hand-mapping prefill in `app/accounting/sales-invoice/new/page.tsx`
// is preserved as a silent fallback for the route-error case.
//
// Supported transitions (URL: POST /api/erpnext/make-from):
//   { sourceDoctype: "Sales Order",       targetDoctype: "Sales Invoice"   }
//   { sourceDoctype: "Sales Order",       targetDoctype: "Delivery Note"   }
//   { sourceDoctype: "Delivery Note",      targetDoctype: "Sales Invoice"   }
//   { sourceDoctype: "Quotation",         targetDoctype: "Sales Order"     }
//   { sourceDoctype: "Purchase Order",     targetDoctype: "Purchase Receipt" }
//   { sourceDoctype: "Purchase Order",     targetDoctype: "Purchase Invoice" }
//   { sourceDoctype: "Purchase Receipt",   targetDoctype: "Purchase Invoice" }
//   { sourceDoctype: "Material Request",   targetDoctype: "Purchase Order"   }
//   { sourceDoctype: "Purchase Invoice",   targetDoctype: "Payment Entry"   } // future
//
// The route returns the draft as JSON: `{ doctype, doc }`. The wizard
// hydrates from it. (The draft is NOT persisted — that's the wizard's
// responsibility on "Create".)

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";

// ---------------------------------------------------------------------------
// Mapper table — (source, target) → ERPNext dotted-path + method name.
// Each entry is the dotted Python path on the ERPNext server and the
// function name to call via `frappeClient.call`.
// ---------------------------------------------------------------------------
type MapperKey = `${string}->${string}`;

const MAPPERS: Record<MapperKey, { method: string }> = {
  "Sales Order->Sales Invoice": {
    method: "erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice",
  },
  "Sales Order->Delivery Note": {
    method: "erpnext.selling.doctype.sales_order.sales_order.make_delivery_note",
  },
  "Delivery Note->Sales Invoice": {
    method:
      "erpnext.stock.doctype.delivery_note.delivery_note.make_sales_invoice",
  },
  // 2R Part 2 — the missing Quotation→SO canonical mapper. ERPNext's
  // `make_sales_order(source_name, target_doc=None)` carries every line
  // and the per-item back-pointer; the wizard hydrates from this draft.
  "Quotation->Sales Order": {
    method:
      "erpnext.selling.doctype.quotation.quotation.make_sales_order",
  },
  "Purchase Order->Purchase Receipt": {
    method:
      "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt",
  },
  "Purchase Order->Purchase Invoice": {
    method:
      "erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_invoice",
  },
  // 2R Part 2 — the missing PR→PI canonical mapper. ERPNext's
  // `make_purchase_invoice(source_name, target_doc=None)` carries every
  // received line, the supplier, and the per-item back-link.
  "Purchase Receipt->Purchase Invoice": {
    method:
      "erpnext.stock.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice",
  },
  // 2R Part 2 — the missing MR→PO canonical mapper. ERPNext's
  // `make_purchase_order(source_name, target_doc=None)` carries every
  // requested item, sets `material_request` on each row, and the per-
  // item back-link propagates status to the MR on submit.
  "Material Request->Purchase Order": {
    method:
      "erpnext.stock.doctype.material_request.material_request.make_purchase_order",
  },
};

interface MakeFromRequest {
  sourceDoctype: string;
  sourceName: string;
  targetDoctype: string;
  /**
   * Optional list of item rows to include (by row name on the source's
   * child table). If omitted, ERPNext includes all rows. The wizard UI
   * can use this to let the operator pick a subset (e.g. partial DN).
   */
  itemRows?: string[];
  /**
   * Optional target doctype field overrides the wizard wants pre-applied
   * (e.g. `set_posting_time: 1`, `posting_date: "2026-06-13"`).
   */
  overrides?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  // 2P-FINAL Part A.3 — per-request user-scoped client. The operator
  // is creating THEIR own SI/DN/PI from a source doc, so this is a
  // user action — use the user client and fail closed (401).
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
  let body: MakeFromRequest;
  try {
    body = (await request.json()) as MakeFromRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", statusCode: 400 },
      { status: 400 },
    );
  }

  if (!body?.sourceDoctype || !body?.sourceName || !body?.targetDoctype) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields",
        details:
          "Provide sourceDoctype, sourceName, and targetDoctype in the request body.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  const key: MapperKey = `${body.sourceDoctype}->${body.targetDoctype}`;
  const mapper = MAPPERS[key];
  if (!mapper) {
    return NextResponse.json(
      {
        success: false,
        error: "Unsupported transition",
        details: `No server-side mapper for '${key}'. Supported: ${Object.keys(MAPPERS).join(", ")}`,
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  try {
    // ERPNext's `make_sales_invoice(source_name)` returns a doc dict
    // (not a list). For multi-source variants the API may return a list
    // — we accept both shapes and unwrap.
    const args: Record<string, unknown> = {
      source_name: body.sourceName,
    };
    if (body.itemRows && body.itemRows.length > 0) {
      args.item_rows = body.itemRows;
    }
    if (body.overrides) {
      args.target_doc = body.overrides;
    }

    // 2P-FINAL A.3 — user-scoped call. ERPNext runs its native
    // permission check; a user without READ on the source gets 403
    // (PermissionError), mapped to a clean 403 via handleError.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await (client.call as any).get(mapper.method, args);
    const doc = Array.isArray(raw) ? raw[0] : raw?.message ?? raw;

    if (!doc || typeof doc !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Empty draft from ERPNext",
          details: `Mapper '${mapper.method}' returned no document for source '${body.sourceName}'.`,
          statusCode: 502,
        },
        { status: 502 },
      );
    }

    // 9R.14 — Date-validated targets carry stale payment_schedule rows
    // from the source document. Their due_dates were computed against the
    // source's earlier transaction_date, so ERPNext rejects them with
    // "Due Date in the Payment Terms table cannot be before Posting Date".
    // Fix: zero the schedule rows + null out due dates while KEEPING the
    // payment_terms_template. ERPNext's set_payment_schedule() rebuilds
    // fresh dates from the template against the NEW doc's posting_date
    // during validate — but ONLY when payment_schedule is empty.
    const DATE_VALIDATED_TARGETS = new Set([
      "Sales Order",
      "Purchase Invoice",
      "Sales Invoice",
      "Delivery Note",
      "Purchase Receipt",
    ]);
    if (DATE_VALIDATED_TARGETS.has(body.targetDoctype)) {
      doc.payment_schedule = [];
      doc.due_date = null;
      doc.payment_due_date = null;
    }

    return NextResponse.json({
      success: true,
      data: { doctype: body.targetDoctype, doc },
    });
  } catch (error) {
    const err = frappeClient.handleError(error);
    return NextResponse.json(err, { status: err.statusCode ?? 500 });
  }
}
