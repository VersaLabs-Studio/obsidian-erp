// lib/flows/flow-adjacency.ts
// Obsidian ERP v4.0 — Flow Adjacency Registry (master §12.6).
//
// Per-doctype list of valid FORWARD and BACKWARD adjacent doctypes, derived
// from the Lead-to-Cash and Procure-to-Pay graphs. Only edges that exist in
// ERPNext are listed — no invented edges (Reporting Contract rule 4).
// Standalone doctypes (Stock Reconciliation, Stock Ledger, masters) have
// NO adjacency and are NOT in the map.
//
// For each edge we also describe the BACK-LINK query: how to detect that an
// adjacent record already exists for the current source. When the back-link
// check resolves to a real record, the UI shows "View <name>" (redirect)
// instead of "Create" (master §12.4 — existing-record short-circuit).

import { getDocTypeRoute } from "./flow-chain-resolver";

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
// Per-edge registry
// ---------------------------------------------------------------------------

/**
 * Build a 4-tuple filter for a top-level field match.
 * Use `[doctype, field, operator, value]` form when Frappe needs the
 * explicit doctype prefix (child-table fields); use the 3-tuple shorthand
 * when the field is on the queried doctype.
 */
function f(field: string, op: "=" | "!=", value: unknown): [string, string, string, unknown] {
  return ["", field, op, value];
}

const EDGES: FlowAdjacency[] = [
  // ===== LEAD-TO-CASH =====
  {
    sourceDoctype: "Lead",
    targetDoctype: "Customer",
    direction: "forward",
    label: "Convert to Customer",
    backLink: {
      doctype: "Customer",
      filters: [f("lead_name", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Customer",
    targetDoctype: "Quotation",
    direction: "forward",
    label: "New Quotation",
    backLink: {
      doctype: "Quotation",
      filters: [
        f("party_name", "=", "<name>"),
        f("quotation_to", "=", "Customer"),
      ],
    },
  },
  {
    sourceDoctype: "Opportunity",
    targetDoctype: "Quotation",
    direction: "forward",
    label: "New Quotation",
    backLink: {
      doctype: "Quotation",
      filters: [f("opportunity", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Quotation",
    targetDoctype: "Sales Order",
    direction: "forward",
    label: "Create Sales Order",
    backLink: {
      doctype: "Sales Order",
      filters: [f("quotation", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Sales Order",
    targetDoctype: "Quotation",
    direction: "backward",
    label: "Source Quotation",
    backLink: {
      doctype: "Quotation",
      filters: [f("name", "=", "<quotation>")],
    },
  },
  {
    sourceDoctype: "Sales Order",
    targetDoctype: "Work Order",
    direction: "forward",
    label: "Create Work Order",
    backLink: {
      doctype: "Work Order",
      filters: [f("sales_order", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Work Order",
    targetDoctype: "Stock Entry",
    direction: "forward",
    label: "Create Stock Entry",
    backLink: {
      doctype: "Stock Entry",
      filters: [f("work_order", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "BOM",
    targetDoctype: "Work Order",
    direction: "forward",
    label: "Create Work Order",
    backLink: {
      doctype: "Work Order",
      filters: [f("bom_no", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Sales Order",
    targetDoctype: "Delivery Note",
    direction: "forward",
    label: "Create Delivery Note",
    // 2L 1C: child-table back-link — DN's link to SO lives on
    // `Delivery Note Item.against_sales_order`. Frappe requires the filter
    // doctype to match the queried parent's child table, so we query the
    // child table directly with a `parent` filter to discover the parent DN.
    backLink: {
      doctype: "Delivery Note",
      filters: [
        // ["Delivery Note Item", "against_sales_order", "=", "<name>"]
        // We then map the child rows to their parent Delivery Note below.
        ["Delivery Note Item", "against_sales_order", "=", "<name>"],
      ],
      selectFields: ["name", "parent"],
    },
  },
  {
    sourceDoctype: "Delivery Note",
    targetDoctype: "Sales Invoice",
    direction: "forward",
    label: "Create Sales Invoice",
    // 2L 1C: child-table back-link — SI's link to DN lives on
    // `Sales Invoice Item.delivery_note`. Query the child table to find the
    // parent SI that references the current DN.
    backLink: {
      doctype: "Sales Invoice",
      filters: [
        ["Sales Invoice Item", "delivery_note", "=", "<name>"],
      ],
      selectFields: ["name", "parent"],
    },
  },
  {
    sourceDoctype: "Sales Invoice",
    targetDoctype: "Payment Entry",
    direction: "forward",
    label: "Receive Payment",
    // 2L 1C: child-table back-link — PE's link to SI lives on
    // `Payment Entry Reference.reference_name` (parent is PE). Query the
    // child table to find the parent PE that allocates against this SI.
    backLink: {
      doctype: "Payment Entry",
      filters: [
        [
          "Payment Entry Reference",
          "reference_name",
          "=",
          "<name>",
        ],
        ["Payment Entry Reference", "reference_doctype", "=", "Sales Invoice"],
      ],
      selectFields: ["name", "parent"],
    },
  },

  // ===== PROCURE-TO-PAY =====
  {
    sourceDoctype: "Material Request",
    targetDoctype: "Purchase Order",
    direction: "forward",
    label: "Create Purchase Order",
    // PO has `material_request` at top level.
    backLink: {
      doctype: "Purchase Order",
      filters: [f("material_request", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Material Request",
    targetDoctype: "Request for Quotation",
    direction: "forward",
    label: "Create RFQ",
    backLink: {
      doctype: "Request for Quotation",
      filters: [f("material_request", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Request for Quotation",
    targetDoctype: "Supplier Quotation",
    direction: "forward",
    label: "Create Supplier Quotation",
    // 2L 1C: child-table back-link — SQ links to RFQ via
    // `Supplier Quotation Item.request_for_quotation` (parent is SQ).
    // Some Frappe versions also store the link top-level on SQ; we use the
    // child-table filter as the reliable cross-version path.
    backLink: {
      doctype: "Supplier Quotation",
      filters: [
        [
          "Supplier Quotation Item",
          "request_for_quotation",
          "=",
          "<name>",
        ],
      ],
      selectFields: ["name", "parent"],
    },
  },
  {
    sourceDoctype: "Supplier Quotation",
    targetDoctype: "Purchase Order",
    direction: "forward",
    label: "Create Purchase Order",
    backLink: {
      doctype: "Purchase Order",
      filters: [f("supplier_quotation", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Purchase Order",
    targetDoctype: "Purchase Receipt",
    direction: "forward",
    label: "Create Purchase Receipt",
    backLink: {
      doctype: "Purchase Receipt",
      filters: [f("purchase_order", "=", "<name>")],
    },
  },
  {
    sourceDoctype: "Purchase Receipt",
    targetDoctype: "Purchase Invoice",
    direction: "forward",
    label: "Create Purchase Invoice",
    backLink: {
      doctype: "Purchase Invoice",
      filters: [f("purchase_receipt", "=", "<name>")],
    },
  },

  // ===== BACKWARD EDGES (right-side of the canvas) =====
  {
    sourceDoctype: "Sales Order",
    targetDoctype: "Sales Invoice",
    direction: "forward",
    label: "Create Sales Invoice",
    backLink: {
      doctype: "Sales Invoice",
      filters: [f("sales_order", "=", "<name>")],
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the adjacency list for a doctype, in a stable order
 * (forward first, then backward).
 */
export function getAdjacencies(doctype: string): FlowAdjacency[] {
  return EDGES.filter((e) => e.sourceDoctype === doctype).sort((a, b) => {
    if (a.direction === b.direction) return 0;
    return a.direction === "forward" ? -1 : 1;
  });
}

/**
 * Whether the doctype has any adjacency. Standalone doctypes (Stock
 * Reconciliation, Stock Ledger, masters) return false.
 */
export function hasAdjacency(doctype: string): boolean {
  return EDGES.some((e) => e.sourceDoctype === doctype);
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
  new Set(EDGES.map((e) => e.sourceDoctype)),
);
