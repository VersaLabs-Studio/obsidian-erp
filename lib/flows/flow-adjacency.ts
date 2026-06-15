// lib/flows/flow-adjacency.ts
// Obsidian ERP v4.0 — Flow Adjacency Registry (master §12.6).
//
// Per-doctype list of valid FORWARD and BACKWARD adjacent doctypes, derived
// from the Lead-to-Cash and Procure-to-Pay graphs. Only edges that exist in
// ERPNext are listed — no invented edges (Reporting Contract rule 4).
// Standalone doctypes (Stock Reconciliation, Stock Ledger, masters) have
// NO adjacency and are NOT in the map.
//
// 2N Part 1.1: this module is now a *derivation* over `flow-link-map.ts`.
// The link map is the single source of truth; the `FlowAdjacency` shape
// below is the legacy wrapper that `CrossFlowActionsMenu` and its
// `useFrappeList` back-link caller still depend on. We build it from the
// link map on first use and cache the result.
//
// For each edge we also describe the BACK-LINK query: how to detect that an
// adjacent record already exists for the current source. When the back-link
// check resolves to a real record, the UI shows "View <name>" (redirect)
// instead of "Create" (master §12.4 — existing-record short-circuit).

import { getDocTypeRoute } from "./flow-chain-resolver";
import {
  findFlowLink,
  getFlowLinksFrom,
  type FlowLinkDef,
} from "./flow-link-map";

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------
export type FlowDirection = "forward" | "backward";

export interface BackLinkQuery {
  /** Doctype to query (the doctype of the existing adjacent record) */
  doctype: string;
  /** Frappe filter — 4-tuple [doctype, field, operator, value] */
  filters: [string, string, string, unknown][];
  /** Fields to fetch (default: ["name"]) */
  selectFields?: string[];
}

export interface FlowAdjacency {
  /** Doctype we're on */
  sourceDoctype: string;
  /** The adjacent doctype */
  targetDoctype: string;
  direction: FlowDirection;
  /** Human label for the menu button, e.g. "Create Work Order", "View DN-001" */
  label: string;
  /**
   * Back-link query. When non-null, the UI runs it; if a record exists it
   * shows "View <name>" (deep link to the existing record), never "Create".
   * null = no reliable back-link query; the UI always shows "Create".
   */
  backLink: BackLinkQuery | null;
  /**
   * URL param name for the Create flow (used in buildCreateUrl). Defaults
   * to sourceDoctype.toLowerCase().replace(/\s+/g, "_") via getAutoFillParam.
   * Only used when direction === "forward".
   */
  createUrlParam?: string;
}

// ---------------------------------------------------------------------------
// Human labels for the menu — keep this mapping in this module (UI concern)
// ---------------------------------------------------------------------------
const EDGE_LABELS: Record<string, string> = {
  "Lead>Customer": "Convert to Customer",
  "Customer>Quotation": "New Quotation",
  "Opportunity>Quotation": "New Quotation",
  "Quotation>Sales Order": "Create Sales Order",
  "Sales Order>Quotation": "Source Quotation",
  "Sales Order>Work Order": "Create Work Order",
  "Work Order>Stock Entry": "Create Stock Entry",
  "BOM>Work Order": "Create Work Order",
  "Sales Order>Delivery Note": "Create Delivery Note",
  "Delivery Note>Sales Order": "Source Sales Order",
  "Delivery Note>Sales Invoice": "Create Sales Invoice",
  "Sales Order>Sales Invoice": "Create Sales Invoice",
  "Sales Invoice>Payment Entry": "Receive Payment",
  "Payment Entry>Sales Invoice": "Source Sales Invoice",
  "Payment Entry>Purchase Invoice": "Source Purchase Invoice",
  "Material Request>Purchase Order": "Create Purchase Order",
  "Material Request>Request for Quotation": "Create RFQ",
  "Request for Quotation>Supplier Quotation": "Create Supplier Quotation",
  "Supplier Quotation>Purchase Order": "Create Purchase Order",
  "Purchase Order>Purchase Receipt": "Create Purchase Receipt",
  "Purchase Receipt>Purchase Invoice": "Create Purchase Invoice",
  "Purchase Order>Purchase Invoice": "Create Purchase Invoice",
};

function edgeKey(from: string, to: string): string {
  return `${from}>${to}`;
}

// ---------------------------------------------------------------------------
// Backward-compat helpers for the (3-tuple) filter shorthand that
// `flow-adjacency.ts` historically exposed. We translate from the link map.
// ---------------------------------------------------------------------------
function f3(field: string, op: "=" | "!=", value: unknown): [string, string, unknown] {
  return [field, op, value];
}

/**
 * Convert a FlowLinkDef to a BackLinkQuery. For back_link child-table
 * patterns, the filter is the 4-tuple `[childDoctype, field, "=", anchor]`
 * form. For header-link patterns, the back-link is null (the caller
 * supplies the candidate from the current doc's header field).
 */
function toBackLinkQuery(def: FlowLinkDef): BackLinkQuery | null {
  if (def.pattern === "header_link") return null;

  // 2N Part 1.1 fix: the prior heuristic `queryDoctype?.includes(" ")`
  // was wrong (it treated 2-word *parent* doctypes like "Sales Order" as
  // child tables). The reliable signal is `returnParent: true`. We also
  // use the same heuristic to decide whether the backLink.doctype
  // reported to the legacy `BackLinkQuery` API is the *parent* (the
  // caller wants to query the parent) or the *child* (the caller wants
  // to query the child table directly). The original 2L contract is
  // that `backLink.doctype` is the parent doctype (the consumer
  // filters on the child via the filter's 4-tuple leading slot).
  const isChildTable = def.returnParent === true;
  const filters: [string, string, string, unknown][] = [];
  const parentDoctype = def.to;

  if (isChildTable) {
    // 4-tuple filter: [childDoctype, field, "=", "<name>"]
    filters.push([def.queryDoctype!, def.field!, "=", "<name>"]);
  } else {
    // Header field on the queried parent — empty doctype prefix in
    // the 4-tuple so Frappe scopes the filter to the queried parent.
    filters.push(["", def.field!, "=", "<name>"]);
  }

  if (def.extraFilters) {
    for (const ef of def.extraFilters) filters.push(ef);
  }

  return {
    doctype: parentDoctype,
    filters,
    selectFields: def.selectFields ?? (def.returnParent ? ["name", "parent"] : ["name"]),
  };
}

// Build the legacy `EDGES` array lazily from the link map. Memoized.
let _CACHED_EDGES: FlowAdjacency[] | null = null;

function buildEdges(): FlowAdjacency[] {
  if (_CACHED_EDGES) return _CACHED_EDGES;
  const out: FlowAdjacency[] = [];
  // Source doctypes we care about — derived from the link map's `from` side.
  // All 13+ doctypes that appear in flows.
  const sources = new Set<string>();
  for (const def of [
    ...getFlowLinksFrom("Lead"),
    ...getFlowLinksFrom("Customer"),
    ...getFlowLinksFrom("Opportunity"),
    ...getFlowLinksFrom("Quotation"),
    ...getFlowLinksFrom("Sales Order"),
    ...getFlowLinksFrom("Delivery Note"),
    ...getFlowLinksFrom("Sales Invoice"),
    ...getFlowLinksFrom("Payment Entry"),
    ...getFlowLinksFrom("Work Order"),
    ...getFlowLinksFrom("BOM"),
    ...getFlowLinksFrom("Material Request"),
    ...getFlowLinksFrom("Request for Quotation"),
    ...getFlowLinksFrom("Supplier Quotation"),
    ...getFlowLinksFrom("Purchase Order"),
    ...getFlowLinksFrom("Purchase Receipt"),
  ]) sources.add(def.from);

  for (const source of sources) {
    const links = getFlowLinksFrom(source);
    for (const def of links) {
      out.push({
        sourceDoctype: def.from,
        targetDoctype: def.to,
        direction: def.direction,
        label: EDGE_LABELS[edgeKey(def.from, def.to)] ?? `${def.direction === "forward" ? "Create" : "View"} ${def.to}`,
        backLink: toBackLinkQuery(def),
      });
    }
  }
  _CACHED_EDGES = out;
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the adjacency list for a doctype, in a stable order
 * (forward first, then backward).
 */
export function getAdjacencies(doctype: string): FlowAdjacency[] {
  return buildEdges().filter((e) => e.sourceDoctype === doctype).sort((a, b) => {
    if (a.direction === b.direction) return 0;
    return a.direction === "forward" ? -1 : 1;
  });
}

/**
 * Whether the doctype has any adjacency. Standalone doctypes (Stock
 * Reconciliation, Stock Ledger, masters) return false.
 */
export function hasAdjacency(doctype: string): boolean {
  return buildEdges().some((e) => e.sourceDoctype === doctype);
}

/**
 * Build the Create URL for a forward adjacency edge.
 * Mirrors `buildCreateUrl` in flow-chain-resolver so the menu and FlowRail
 * emit the same URL pattern.
 */
export function buildAdjacencyCreateHref(
  edge: FlowAdjacency,
  sourceDocName: string,
): string | null {
  if (edge.direction !== "forward") return null;
  const param = edge.createUrlParam
    ?? edge.sourceDoctype.toLowerCase().replace(/\s+/g, "_");
  const route = getDocTypeRoute(edge.targetDoctype);
  return `/${route}/new?${param}=${encodeURIComponent(sourceDocName)}`;
}

/**
 * Build the View URL for an existing adjacent record.
 */
export function buildAdjacencyViewHref(
  edge: FlowAdjacency,
  existingName: string,
): string {
  const route = getDocTypeRoute(edge.targetDoctype);
  return `/${route}/${encodeURIComponent(existingName)}`;
}

/**
 * Fill `<name>` placeholders in a back-link filter with the source document
 * name. Returns a new filter array; the original is not mutated.
 */
export function fillBackLinkFilter(
  filter: [string, string, string, unknown],
  sourceDocName: string,
): [string, string, string, unknown] {
  return [
    filter[0],
    filter[1],
    filter[2],
    typeof filter[3] === "string" && filter[3] === "<name>"
      ? sourceDocName
      : filter[3],
  ];
}

/** All doctypes with adjacency (test/UI use). */
export const ADJACENT_DOCTYPES: string[] = Array.from(
  new Set(buildEdges().map((e) => e.sourceDoctype)),
);

// Re-export the link-map findFlowLink for callers that want raw access.
export { findFlowLink, getFlowLinksFrom };

// Suppress unused-import warning for the helper used by `use-flow-chain.ts`
// (it imports `f3` directly from `flow-link-map.ts`; this file just re-exports
// the pattern for legacy callers). Not exported again here.
void f3;
