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
// Scope: the buying chain (MR → PO → PR/PI → PE). Sales-side (SO → DN/SI)
// can be registered here the same way when requested.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErpClient = { db: any; call: any };

interface DownstreamLink {
  doctype: string;
  /** Child table whose rows point at the parent document. */
  childDoctype: string;
  /** Field on the child row carrying the parent's name. */
  childField: string;
}

const DOWNSTREAM_LINKS: Record<string, DownstreamLink[]> = {
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
    const rows: Array<{ name: string; docstatus?: number }> =
      await client.db.getDocList(link.doctype, {
        fields: ["name", "docstatus"],
        filters: [[link.childDoctype, link.childField, "=", name]],
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
