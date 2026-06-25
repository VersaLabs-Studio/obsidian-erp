// lib/flows/flow-link-map.ts
// Obsidian ERP v4.0 — Flow Link Map (master §12.6 + 2N Part 1.1).
//
// The single source of truth for "how to resolve a `to` document given I'm at
// a `from` document with name `X`" for every ordered doctype pair in the
// three live flows (Lead-to-Cash, Procure-to-Pay, the manufacturing spine).
//
// Replaces the ad-hoc per-page `stageStatuses` blocks and the parallel
// back-link table in `flow-adjacency.ts` with one declarative registry. The
// FlowRail (data side only), the CrossFlowActionsMenu, and the new
// `useFlowChain` hook all read from this map — so the "View vs Create"
// decision on CrossFlow and the resolved stage on FlowRail can never disagree.
//
// Three resolution patterns per edge:
//
//   (A) BACK_LINK — "query `to` (or its child table) for rows that reference
//       `from`." This is the dominant pattern (DN→SI, SI→PE, SO→WO, etc.).
//       The filter is on the `to` side.
//
//   (B) HEADER_LINK — "the link lives on the `from` doc's header field; read
//       it directly." Used when the current doc carries the back-pointer
//       (e.g. SO has a `quotation` header field). We still verify the
//       candidate with a cheap list query (limit 1) so the rail stays
//       consistent with reality.
//
//   (C) CURRENT_CHILD — "the link lives on a row in the CURRENT doc's OWN
//       child table (e.g. `Sales Order Item.prevdoc_docname`)." Used when
//       ERPNext stores the back-pointer only on a child row of the current
//       doc — there is no header field to read, and querying the *target*
//       parent's child table for it is invalid (the back-pointer child
//       table does not belong to the target). Read `currentDoc[childTable]`,
//       find the first row matching the optional `childWhere` filter, take
//       `row[childField]` as the candidate, then verify with a cheap list
//       query (limit 1) against `verifyDoctype`.
//
//       Example: Sales Order → Quotation. ERPNext stores the source Quotation
//       on `Sales Order Item.prevdoc_docname` (with `prevdoc_doctype =
//       "Quotation"`), NOT on a SO header field. Reading `so.quotation`
//       returns nothing.
//
// Contract rule 4: no invented edges. Every entry below is a real ERPNext
// field on a real doctype.

import type { FlowDirection } from "./flow-adjacency";

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

export type FlowLinkPattern = "back_link" | "header_link" | "current_child";

export interface FlowLinkDef {
  /** Source doctype (the one we're currently on, e.g. "Sales Order") */
  from: string;
  /** Target doctype (the stage we want to resolve, e.g. "Delivery Note") */
  to: string;
  /** Which way along the flow this edge runs */
  direction: FlowDirection;

  /** Resolution pattern */
  pattern: FlowLinkPattern;

  // --- back_link fields ---------------------------------------------------
  /** Doctype (or child table) to filter on — e.g. "Delivery Note Item" */
  queryDoctype?: string;
  /** Field on `queryDoctype` that holds the from-name — e.g. "against_sales_order" */
  field?: string;
  /**
   * When `queryDoctype` is a child table, the first matching row's
   * `parent` is the resolved name. Header queries return the row's `name`.
   */
  returnParent?: boolean;
  /** Fields to fetch (default ["name"], or ["name", "parent"] for child tables) */
  selectFields?: string[];

  // --- header_link fields -------------------------------------------------
  /**
   * Header field on the `from` doc that holds the `to` name — e.g.
   * "quotation" on Sales Order. We read `fromDoc[field]` and verify with
   * a list call to `to` (limit 1) so the rail shows real docs only.
   */
  headerField?: string;

  // --- current_child fields ----------------------------------------------
  /**
   * The child table on the CURRENT doc that holds the back-pointer. Default
   * "items" (ERPNext convention). The first row matching `childWhere` is
   * taken; `row[childField]` is the candidate name. ERPNext-faithful: SO
   * items carry `prevdoc_docname` + `prevdoc_doctype`; DN/SI items carry
   * `against_sales_order` / `delivery_note` / `sales_order`; PE carries
   * `references[]` with `reference_name` + `reference_doctype`.
   */
  childTable?: string;
  /** Field on the child row that holds the `to` doctype's name. */
  childField?: string;
  /**
   * Optional sibling filter — `[field, op, value]` applied to each child
   * row. E.g. `["prevdoc_doctype", "=", "Quotation"]` to disambiguate SO
   * items that came from a Quotation vs. a Material Request.
   */
  childWhere?: [string, string, unknown];
  /**
   * Doctype to verify the candidate against. Defaults to `to`. We run a
   * list call (limit 1) so a stale child-row pointer does not light up
   * the rail with a deleted doc.
   */
  verifyDoctype?: string;

  // --- extras -------------------------------------------------------------
  /**
   * Extra static filters (e.g. `reference_doctype = "Sales Invoice"` on the
   * PE→SI link). Applies to back-link patterns only.
   */
  extraFilters?: Array<[string, string, string, unknown]>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const LINKS: FlowLinkDef[] = [
  // ===== LEAD-TO-CASH =====
  {
    from: "Lead",
    to: "Customer",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Customer",
    field: "lead_name",
    returnParent: false,
  },
  // Lead → Opportunity: Opportunity.party_name = lead.name AND
  // Opportunity.opportunity_from = "Lead" (the `opportunity_from` filter
  // disambiguates from Customer-sourced opportunities).
  {
    from: "Lead",
    to: "Opportunity",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Opportunity",
    field: "party_name",
    returnParent: false,
    extraFilters: [["", "opportunity_from", "=", "Lead"]],
  },
  // Customer → Lead: Customer has a `lead_name` header field (set when
  // the Customer was created via Lead → Customer conversion). Read it and
  // verify the candidate Lead exists.
  {
    from: "Customer",
    to: "Lead",
    direction: "backward",
    pattern: "header_link",
    headerField: "lead_name",
  },
  {
    from: "Customer",
    to: "Quotation",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Quotation",
    field: "party_name",
    returnParent: false,
    extraFilters: [["", "quotation_to", "=", "Customer"]],
  },
  {
    from: "Opportunity",
    to: "Quotation",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Quotation",
    field: "opportunity",
    returnParent: false,
  },
  // Opportunity → Lead / Customer: read `party_name` from the opportunity
  // and verify a Lead/Customer with that name exists. The hook will
  // resolve at most one (the one whose doctype matches the
  // `opportunity_from` discriminator on the Opportunity doc); the other
  // is naturally "no match" and the rail leaves it pending.
  {
    from: "Opportunity",
    to: "Lead",
    direction: "backward",
    pattern: "header_link",
    headerField: "party_name",
  },
  {
    from: "Opportunity",
    to: "Customer",
    direction: "backward",
    pattern: "header_link",
    headerField: "party_name",
  },
  // 2S Part 0.3 FIX — Quotation→Sales Order. The previous `back_link` with
  // `queryDoctype:"Sales Order", field:"quotation"` queried the SO header
  // for a `quotation` field that does not exist on Sales Order. The actual
  // link is `Sales Order Item.prevdoc_docname` (with `prevdoc_doctype =
  // "Quotation"`). Model as child-table back_link with returnParent:true.
  //
  // 9R.4: REMOVED the prevdoc_doctype discriminator — ERPNext often leaves
  // it EMPTY on the SO item, and the filter itself is not query-permitted
  // on the child table (causes 417 DataError on live). The prevdoc_docname
  // match alone is sufficient to identify the Quotation→SO link.
  {
    from: "Quotation",
    to: "Sales Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Sales Order Item",
    field: "prevdoc_docname",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // Quotation → Lead / Customer: read `party_name` from the quotation
  // and verify a Lead/Customer with that name exists. Same conditional
  // pattern as Opportunity — `quotation_to` discriminates at runtime.
  {
    from: "Quotation",
    to: "Lead",
    direction: "backward",
    pattern: "header_link",
    headerField: "party_name",
  },
  {
    from: "Quotation",
    to: "Customer",
    direction: "backward",
    pattern: "header_link",
    headerField: "party_name",
  },
  // SO → Quotation: child-table link on SO Item.prevdoc_docname (with
  // prevdoc_doctype = "Quotation"). ERPNext Sales Order has NO `quotation`
  // header field (a 2Q-RC2 finding — the prior `header_link, headerField:
  // "quotation"` resolved to nothing for every SO). Re-expressed as
  // current_child: read `so.items[].prevdoc_docname` and verify the Quotation
  // exists.
  //
  // 2R Part 1 — RELAX the discriminator. ERPNext's Quotation→SO mapping
  // sets `prevdoc_docname` but often leaves `prevdoc_doctype` EMPTY on
  // the SO item; the strict `prevdoc_doctype = "Quotation"` filter then
  // matches zero rows. We drop the discriminator and rely on the
  // `verifyDoctype: "Quotation"` verify step to confirm the back-pointer
  // is a real Quotation. (A SO can have items from MR + Quotation +
  // other sources; reading the first non-empty prevdoc_docname that
  // verifies as a Quotation is the correct canonical "source Quotation"
  // lookup — and if a non-Quotation doc happens to be the first row,
  // the verify step returns no match and the rail stays pending.)
  {
    from: "Sales Order",
    to: "Quotation",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "prevdoc_docname",
    verifyDoctype: "Quotation",
  },
  // SO/DN/SI → Customer: each carries its own `customer` header field. These
  // were the missing 2Q-RC5 edges — without them, no SO/DN/SI could light up
  // its own customer in the rail.
  {
    from: "Sales Order",
    to: "Customer",
    direction: "backward",
    pattern: "header_link",
    headerField: "customer",
  },
  {
    from: "Delivery Note",
    to: "Customer",
    direction: "backward",
    pattern: "header_link",
    headerField: "customer",
  },
  {
    from: "Sales Invoice",
    to: "Customer",
    direction: "backward",
    pattern: "header_link",
    headerField: "customer",
  },
  {
    from: "Sales Order",
    to: "Work Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Work Order",
    field: "sales_order",
    returnParent: false,
  },
  {
    from: "Work Order",
    to: "Stock Entry",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Stock Entry",
    field: "work_order",
    returnParent: false,
  },
  // 2S Part 10 — Work Order → Job Card: child-table back-link on
  // Job Card.work_order. The WO rail shows its job cards and their
  // completion roll-up.
  {
    from: "Work Order",
    to: "Job Card",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Job Card",
    field: "work_order",
    returnParent: false,
  },
  {
    from: "BOM",
    to: "Work Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Work Order",
    field: "bom_no",
    returnParent: false,
  },
  // SO → Delivery Note: child-table link on DN Item.against_sales_order.
  {
    from: "Sales Order",
    to: "Delivery Note",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Delivery Note Item",
    field: "against_sales_order",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // DN → SO: BACK-POINTER on the DN's OWN items[].against_sales_order
  // (current_child — 2Q-RC3/RC4 fix). The prior back_link tried to query
  // the SO parent with a Delivery Note Item filter, which is invalid (the
  // child table does not belong to Sales Order) and matched nothing. Read
  // it off the current doc and verify.
  {
    from: "Delivery Note",
    to: "Sales Order",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "against_sales_order",
    verifyDoctype: "Sales Order",
  },
  // DN → Sales Invoice: child-table link on SI Item.delivery_note.
  {
    from: "Delivery Note",
    to: "Sales Invoice",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Sales Invoice Item",
    field: "delivery_note",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // SO → Sales Invoice: child-table link on SI Item.sales_order.
  {
    from: "Sales Order",
    to: "Sales Invoice",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Sales Invoice Item",
    field: "sales_order",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // 2R Part 1 — SI → SO backward (the missing 2R edge). ERPNext stores
  // the back-pointer on Sales Invoice Item.sales_order, NOT on a SI
  // header field. Read `si.items[].sales_order` and verify the SO.
  {
    from: "Sales Invoice",
    to: "Sales Order",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "sales_order",
    verifyDoctype: "Sales Order",
  },
  // 2R Part 1 — SI → DN backward (also missing pre-2R). ERPNext stores
  // the back-pointer on Sales Invoice Item.delivery_note.
  {
    from: "Sales Invoice",
    to: "Delivery Note",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "delivery_note",
    verifyDoctype: "Delivery Note",
  },
  // SI → Payment Entry: child-table link on PE Reference.reference_name.
  {
    from: "Sales Invoice",
    to: "Payment Entry",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Payment Entry Reference",
    field: "reference_name",
    returnParent: true,
    selectFields: ["name", "parent"],
    extraFilters: [
      ["", "reference_doctype", "=", "Sales Invoice"],
    ],
  },
  // PE → Sales Invoice: BACK-POINTER on the PE's OWN references[] child
  // table (current_child — 2Q-RC3/RC4 fix). The prior back_link queried the
  // PE Reference child table for a Payment Entry parent with a
  // `reference_name = anchor` filter — that filter shape targets the PE
  // parent, not the SI. The actual back-pointer is `pe.references[]` rows.
  // Read the first row with `reference_doctype = "Sales Invoice"` and
  // verify the candidate SI exists.
  {
    from: "Payment Entry",
    to: "Sales Invoice",
    direction: "backward",
    pattern: "current_child",
    childTable: "references",
    childField: "reference_name",
    childWhere: ["reference_doctype", "=", "Sales Invoice"],
    verifyDoctype: "Sales Invoice",
  },
  {
    from: "Payment Entry",
    to: "Purchase Invoice",
    direction: "backward",
    pattern: "current_child",
    childTable: "references",
    childField: "reference_name",
    childWhere: ["reference_doctype", "=", "Purchase Invoice"],
    verifyDoctype: "Purchase Invoice",
  },
  // 2S Part 0.6 — PI → Payment Entry: forward edge (missing pre-2S).
  // Same pattern as SI→PE: query Payment Entry Reference for rows where
  // reference_name = PI name AND reference_doctype = "Purchase Invoice".
  {
    from: "Purchase Invoice",
    to: "Payment Entry",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Payment Entry Reference",
    field: "reference_name",
    returnParent: true,
    selectFields: ["name", "parent"],
    extraFilters: [
      ["", "reference_doctype", "=", "Purchase Invoice"],
    ],
  },

  // ===== PROCURE-TO-PAY =====
  // 2S Part 0.3 FIX — Material Request→Purchase Order. The previous
  // `queryDoctype:"Purchase Order", field:"material_request"` queried the
  // PO header for `material_request` which does not exist there. The actual
  // link is `Purchase Order Item.material_request`.
  {
    from: "Material Request",
    to: "Purchase Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Order Item",
    field: "material_request",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // 2S Part 0.3 FIX — Material Request→Request for Quotation. The previous
  // `queryDoctype:"Request for Quotation", field:"material_request"` queried
  // the RFQ header for `material_request` which does not exist there. The
  // actual link is `Request for Quotation Item.material_request`.
  {
    from: "Material Request",
    to: "Request for Quotation",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Request for Quotation Item",
    field: "material_request",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  {
    from: "Request for Quotation",
    to: "Supplier Quotation",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Supplier Quotation Item",
    field: "request_for_quotation",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // 2S Part 0.3 FIX — Supplier Quotation→Purchase Order. The previous
  // `queryDoctype:"Purchase Order", field:"supplier_quotation"` queried the
  // PO header for `supplier_quotation` which does not exist there. The
  // actual link is `Purchase Order Item.supplier_quotation`.
  {
    from: "Supplier Quotation",
    to: "Purchase Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Order Item",
    field: "supplier_quotation",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // 2S Part 0.3 FIX — Purchase Order→Purchase Receipt. The previous
  // `queryDoctype:"Purchase Receipt", field:"purchase_order"` queried the
  // PR header for `purchase_order` which does not exist there. The actual
  // link is `Purchase Receipt Item.purchase_order`.
  {
    from: "Purchase Order",
    to: "Purchase Receipt",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Receipt Item",
    field: "purchase_order",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // 2S Part 0.3 FIX — Purchase Receipt→Purchase Invoice. The previous
  // `queryDoctype:"Purchase Invoice", field:"purchase_receipt"` queried the
  // PI header for `purchase_receipt` which does not exist there. The actual
  // link is `Purchase Invoice Item.purchase_receipt`.
  {
    from: "Purchase Receipt",
    to: "Purchase Invoice",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Invoice Item",
    field: "purchase_receipt",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // 2S Part 0.3 FIX — Purchase Order→Purchase Invoice. The previous
  // `queryDoctype:"Purchase Invoice", field:"purchase_order"` queried the
  // PI header for `purchase_order` which does not exist there. The actual
  // link is `Purchase Invoice Item.purchase_order`.
  {
    from: "Purchase Order",
    to: "Purchase Invoice",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Invoice Item",
    field: "purchase_order",
    returnParent: true,
    selectFields: ["name", "parent"],
  },
  // 2R Part 1 — buying backward edges. Without these, PR/PI/PE rails
  // can never light up their upstream docs (no header_field carries the
  // back-pointer on PR/PI; the live Pana instance keeps it on the child
  // table only).
  // PR → PO: Purchase Receipt Item.purchase_order.
  {
    from: "Purchase Receipt",
    to: "Purchase Order",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "purchase_order",
    verifyDoctype: "Purchase Order",
  },
  // PI → PO: Purchase Invoice Item.purchase_order.
  {
    from: "Purchase Invoice",
    to: "Purchase Order",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "purchase_order",
    verifyDoctype: "Purchase Order",
  },
  // PI → PR: Purchase Invoice Item.purchase_receipt (the canonical ERPNext
  // back-pointer; `pr_detail` is the row-level pointer but for a single-
  // PR bill, purchase_receipt is set on the parent and surfaces here).
  {
    from: "Purchase Invoice",
    to: "Purchase Receipt",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "purchase_receipt",
    verifyDoctype: "Purchase Receipt",
  },
  // PO → MR backward: Purchase Order Item.material_request.
  {
    from: "Purchase Order",
    to: "Material Request",
    direction: "backward",
    pattern: "current_child",
    childTable: "items",
    childField: "material_request",
    verifyDoctype: "Material Request",
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a 3-tuple filter for a header field on the queried doctype.
 * 3-tuple shorthand = `[field, operator, value]`. Use the 4-tuple form
 * (with a leading doctype) when Frappe needs the explicit child-table
 * prefix — see the call sites in `use-flow-chain.ts`.
 */
function f3(field: string, op: "=" | "!=", value: unknown): [string, string, unknown] {
  return [field, op, value];
}

/**
 * Build a 4-tuple filter for a child-table field (or a header field whose
 * doctype must be disambiguated). 4-tuple = `[doctype, field, op, value]`.
 * Use `""` for the doctype when the field is on the parent (the API will
 * resolve it from the query's doctype).
 */
function f4(
  doctype: string,
  field: string,
  op: "=" | "!=",
  value: unknown,
): [string, string, string, unknown] {
  return [doctype, field, op, value];
}

/**
 * Look up the link definition for a (from, to) pair. Returns undefined if
 * no edge is registered — callers should treat that as "not resolvable via
 * the link map" (the rail will leave the stage pending).
 */
export function findFlowLink(from: string, to: string): FlowLinkDef | undefined {
  return LINKS.find((l) => l.from === from && l.to === to);
}

/**
 * All links outgoing from a doctype. Used by CrossFlowActionsMenu (via
 * `flow-adjacency.ts`) and by the per-page audits in the 2N retest.
 */
export function getFlowLinksFrom(doctype: string): FlowLinkDef[] {
  return LINKS.filter((l) => l.from === doctype);
}

/**
 * Render the Frappe list-filter for a link given the anchor name. The
 * result is a 3-tuple or 4-tuple suitable for `useFrappeList`'s `filters`.
 *
 * For `back_link` edges:
 *   - Child-table field (e.g. "Sales Invoice Item", "Delivery Note Item"):
 *     return `[queryDoctype, field, "=", anchorName]` (4-tuple).
 *   - Header field (e.g. "Work Order", "Purchase Order"): return
 *     `["", field, "=", anchorName]` so Frappe scopes the filter to the
 *     queried parent's header (4-tuple with empty doctype).
 *
 * For `header_link` edges, the filter is `[toDoctype, "name", "=", anchorName]`
 * (3-tuple), which is just a "does this name exist?" check.
 *
 * Caller passes `anchorName`. Caller may also pass extra static filters via
 * `def.extraFilters`; these are appended (AND'd) to the returned array.
 */
export function buildLinkFilter(
  def: FlowLinkDef,
  anchorName: string,
): Array<[string, string, unknown] | [string, string, string, unknown]> {
  if (def.pattern === "header_link") {
    // Verify the candidate exists. 3-tuple shorthand: doctype is implicit.
    const base: [string, string, unknown] = ["name", "=", anchorName];
    return [base];
  }
  // back_link
  // 2N Part 1.1 fix: the prior heuristic `queryDoctype.includes(" ")` was
  // wrong — it treated "Sales Order" (a 2-word *parent* doctype) as a
  // child table. The reliable signal is `returnParent: true`, which we
  // set ONLY for true child-table queries (Sales Invoice Item, Delivery
  // Note Item, Payment Entry Reference, …).
  const isChildTable = def.returnParent === true;
  if (isChildTable) {
    // 4-tuple: [childDoctype, field, "=", value]. This is a child-table
    // filter; Frappe resolves it against the PARENT doctype list endpoint
    // (the caller queries `def.to`, the parent, not the child table — see
    // resolveQueryDoctype in use-flow-chain.ts).
    const base: [string, string, string, unknown] = [
      def.queryDoctype!,
      def.field!,
      "=",
      anchorName,
    ];
    return def.extraFilters
      ? [base, ...def.extraFilters.map((f) => fillChildExtraFilter(f, def.queryDoctype!))]
      : [base];
  }
  // Header field on the queried parent (e.g. "Work Order", "Purchase Order").
  // The filter is on the parent's OWN field, so it is a 3-tuple
  // `[field, "=", value]` — the queried doctype is implicit. A leading ""
  // doctype is NOT valid Frappe filter syntax: it is parsed as a doctype
  // name and raises "DocType not found" (this was the 2O blank-flow / 404
  // regression on Work Order, Purchase Order, Sales Order, … header links).
  const base: [string, string, unknown] = [def.field!, "=", anchorName];
  return def.extraFilters
    ? [base, ...def.extraFilters.map(normalizeParentFilter)]
    : [base];
}

/**
 * Resolve the registry's `""`-doctype placeholder in an extra filter for a
 * HEADER / parent-field link. `["", field, op, value]` means "this field is
 * on the queried PARENT doctype" → collapse to the 3-tuple `[field, op,
 * value]` (a leading "" doctype is invalid Frappe syntax → DocTypeNotFound).
 * Genuine child-table extra filters (non-empty doctype) pass through.
 */
function normalizeParentFilter(
  f: [string, string, string, unknown],
): [string, string, unknown] | [string, string, string, unknown] {
  return f[0] === "" ? [f[1], f[2], f[3]] : f;
}

/**
 * Resolve the registry's `""`-doctype placeholder in an extra filter for a
 * CHILD-TABLE link. Here the extra field lives on the SAME child table as
 * the main filter (e.g. `reference_doctype` on `Payment Entry Reference`),
 * NOT on the queried parent — so `["", field, op, value]` must become the
 * 4-tuple `[childDoctype, field, op, value]`. Collapsing it to a 3-tuple
 * (the parent-field path) makes Frappe reject it: "Field not permitted in
 * query: reference_doctype" (the 417 that left paid invoices prompting a PE).
 */
function fillChildExtraFilter(
  f: [string, string, string, unknown],
  childDoctype: string,
): [string, string, string, unknown] {
  return f[0] === "" ? [childDoctype, f[1], f[2], f[3]] : f;
}

/**
 * The selectFields default if `def.selectFields` is not set. Header links
 * use `["name"]`; back-link child-table links use `["name", "parent"]` so
 * the calling page can read `row.parent` to get the parent doc name.
 */
export function defaultSelectFields(def: FlowLinkDef): string[] {
  if (def.selectFields) return def.selectFields;
  return def.pattern === "back_link" && def.returnParent
    ? ["name", "parent"]
    : ["name"];
}

// Re-export the helpers used by tests + flow-adjacency.ts
export { f3, f4 };
