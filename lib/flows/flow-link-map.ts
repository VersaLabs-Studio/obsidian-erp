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
// Two resolution patterns per edge:
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
// Contract rule 4: no invented edges. Every entry below is a real ERPNext
// field on a real doctype.

import type { FlowDirection } from "./flow-adjacency";

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

export type FlowLinkPattern = "back_link" | "header_link";

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
  {
    from: "Quotation",
    to: "Sales Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Sales Order",
    field: "quotation",
    returnParent: false,
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
  // SO ← Quotation: link is on the SO header. Read `so.quotation` then verify.
  {
    from: "Sales Order",
    to: "Quotation",
    direction: "backward",
    pattern: "header_link",
    headerField: "quotation",
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
  // DN → SO: header field on DN item row, walk back to parent SO.
  // We use the DN doc itself (it has `items[].against_sales_order`); the
  // header-link pattern handles reading the first item's back-pointer.
  {
    from: "Delivery Note",
    to: "Sales Order",
    direction: "backward",
    pattern: "back_link",
    // Look for the SO whose name appears on any DN item.
    // We query the child table for the first row, then take its parent
    // (the DN), and rely on the calling page to read `dn.items[0].against_sales_order`
    // (DN has the field on its child table; we surface it via a back-link
    // to the child table itself and let the page's memoized lookup do the
    // header field read). This is a pragmatic mix: the link map defines
    // the *existence* check; the page supplies the field read.
    queryDoctype: "Delivery Note Item",
    field: "against_sales_order",
    returnParent: true,
    selectFields: ["name", "parent"],
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
  // PE → Sales Invoice: header-link via the PE's `references` child rows.
  // The first reference of doctype "Sales Invoice" or "Purchase Invoice" is
  // the resolved target. We expose this as a back-link against
  // `Payment Entry Reference` (no field on the row) so the cascade can
  // still produce a result; the calling page (PE detail) reads
  // `entry.references[]` directly to build the stageStatuses.
  {
    from: "Payment Entry",
    to: "Sales Invoice",
    direction: "backward",
    pattern: "back_link",
    queryDoctype: "Payment Entry Reference",
    field: "reference_name",
    returnParent: true,
    selectFields: ["name", "parent"],
    extraFilters: [
      ["", "reference_doctype", "=", "Sales Invoice"],
    ],
  },
  {
    from: "Payment Entry",
    to: "Purchase Invoice",
    direction: "backward",
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
  {
    from: "Material Request",
    to: "Purchase Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Order",
    field: "material_request",
    returnParent: false,
  },
  {
    from: "Material Request",
    to: "Request for Quotation",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Request for Quotation",
    field: "material_request",
    returnParent: false,
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
  {
    from: "Supplier Quotation",
    to: "Purchase Order",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Order",
    field: "supplier_quotation",
    returnParent: false,
  },
  {
    from: "Purchase Order",
    to: "Purchase Receipt",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Receipt",
    field: "purchase_order",
    returnParent: false,
  },
  {
    from: "Purchase Receipt",
    to: "Purchase Invoice",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Invoice",
    field: "purchase_receipt",
    returnParent: false,
  },
  {
    from: "Purchase Order",
    to: "Purchase Invoice",
    direction: "forward",
    pattern: "back_link",
    queryDoctype: "Purchase Invoice",
    field: "purchase_order",
    returnParent: false,
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
