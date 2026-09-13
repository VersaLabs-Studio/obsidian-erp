// lib/erp/cascade-cancel.ts
// 4.1-C3 — Implicit cascade cancellation for the procure-to-pay chain.
//
// WHY: ERPNext blocks cancelling a document while a SUBMITTED linked
// document exists ("Cancel PUR-ORD-2026-00011 first, then return here").
// The operator had to walk the chain manually, deepest-first. This helper
// walks the registered downstream links, cancels submitted children
// depth-first, then cancels the target document itself — mirroring the
// implicit automation posture of the lifecycle routes (auto-start,
// auto-complete, UOM self-heal).
//
// Cancel mechanics: the verified bare-PUT { docstatus: 2 } path (see the
// 4.1-C2 probe — routes through Frappe's cancel() cleanly and derives
// status "Cancelled").
//
// Scope: the buying chain (MR → PO → PR/PI → PE) and the sales chain
// (Quotation → Sales Order → DN/SI → PE). Sales-side links are registered
// 5.1-A3 in response to the F5 finding: a submitted SO linking a quotation
// blocks the bare cancel with LinkExistsError — the identical failure the
// buying side hit (4.1-C3).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErpClient = { db: any; call: any };

interface DownstreamLink {
  doctype: string;
  /**
   * How to find linked docs. Child-table links filter on
   * `[childDoctype, childField, "=", name]`; header links filter on
   * `[headerField, "=", name]` directly on the doctype (e.g. Work
   * Order.sales_order — 5.1-A4, the F5 chain finding).
   */
  childDoctype?: string;
  childField?: string;
  headerField?: string;
}

const DOWNSTREAM_LINKS: Record<string, DownstreamLink[]> = {
  // --- Sales chain (5.1-A3) ---
  Quotation: [
    {
      doctype: "Sales Order",
      childDoctype: "Sales Order Item",
      // ERPNext's SO→Quotation link is prevdoc_docname (LABEL "Quotation" —
      // the fieldname is NOT "quotation"; "Field not permitted in query"
      // 417 if you filter on the label, F5 finding).
      childField: "prevdoc_docname",
    },
  ],
  "Sales Order": [
    {
      // 5.1-A4 — Work Orders link via a HEADER field (sales_order), not a
      // child table. This was the missing edge in the F5 chain: QN → SO →
      // WO → JC blocked the whole cascade on the WO's LinkExistsError.
      doctype: "Work Order",
      headerField: "sales_order",
    },
    {
      doctype: "Delivery Note",
      childDoctype: "Delivery Note Item",
      childField: "against_sales_order",
    },
    {
      doctype: "Sales Invoice",
      childDoctype: "Sales Invoice Item",
      childField: "sales_order",
    },
  ],
  "Work Order": [
    {
      // WO → Job Cards: the JC carries a header link (work_order) back to
      // the WO. Submitted JCs block WO cancellation, so they cascade first.
      doctype: "Job Card",
      headerField: "work_order",
    },
  ],
  "Delivery Note": [
    {
      doctype: "Sales Invoice",
      childDoctype: "Sales Invoice Item",
      childField: "delivery_note",
    },
  ],
  "Sales Invoice": [
    {
      doctype: "Payment Entry",
      childDoctype: "Payment Entry Reference",
      childField: "reference_name",
    },
  ],

  // --- Buying chain (4.1-C3) ---
  "Purchase Order": [
    {
      doctype: "Purchase Invoice",
      childDoctype: "Purchase Invoice Item",
      childField: "purchase_order",
    },
    {
      doctype: "Purchase Receipt",
      childDoctype: "Purchase Receipt Item",
      childField: "purchase_order",
    },
  ],
  "Purchase Receipt": [
    {
      doctype: "Purchase Invoice",
      childDoctype: "Purchase Invoice Item",
      childField: "purchase_receipt",
    },
  ],
  "Purchase Invoice": [
    {
      doctype: "Payment Entry",
      childDoctype: "Payment Entry Reference",
      childField: "reference_name",
    },
  ],
};

const MAX_DEPTH = 5;

export interface CancelledDoc {
  doctype: string;
  name: string;
}

/**
 * Depth-first cascade cancel: submitted downstream docs first, then the
 * document itself. Already-cancelled docs are skipped (idempotent for
 * shared links); drafts are left untouched (delete them manually).
 *
 * @throws when a cancel is rejected by ERPNext (e.g. a non-registered
 *         blocker) — the caller shapes the error via frappeClient.handleError.
 */
export async function cascadeCancel(
  client: ErpClient,
  doctype: string,
  name: string,
  cancelled: CancelledDoc[] = [],
  depth = 0,
): Promise<CancelledDoc[]> {
  if (depth > MAX_DEPTH) {
    throw new Error(
      "Cancellation chain exceeds the depth guard — cancel the remaining documents manually.",
    );
  }

  for (const link of DOWNSTREAM_LINKS[doctype] ?? []) {
    // 5.1-A4 — two link shapes: child-table filters (most edges) and
    // header-field filters (Work Order.sales_order, Job Card.work_order).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = link.childDoctype
      ? [[link.childDoctype, link.childField!, "=", name]]
      : [[link.headerField!, "=", name]];

    const rows: Array<{ name: string; docstatus?: number }> =
      await client.db.getDocList(link.doctype, {
        fields: ["name", "docstatus"],
        filters,
        limit: 100,
      });

    for (const row of rows) {
      const isSubmitted = Number(row.docstatus ?? 0) === 1;
      const alreadyHandled = cancelled.some(
        (c) => c.doctype === link.doctype && c.name === row.name,
      );
      if (!isSubmitted || alreadyHandled) continue;
      await cascadeCancel(client, link.doctype, row.name, cancelled, depth + 1);
      cancelled.push({ doctype: link.doctype, name: row.name });
    }
  }

  await client.db.updateDoc(doctype, name, { docstatus: 2 });
  cancelled.push({ doctype, name });
  return cancelled;
}

/** Route-shared auth guard payload for the cancel routes. */
export function unauthorizedResponse(): {
  success: false;
  error: string;
  details: string;
  statusCode: number;
} {
  return {
    success: false,
    error: "Unauthorized",
    details: "No valid session.",
    statusCode: 401,
  };
}
