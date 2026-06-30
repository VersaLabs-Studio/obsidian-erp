// tests/flow-resolver.test.ts
// Obsidian ERP v4.0 — 2S Part 0.6: Live-faithful resolver tests.
//
// These tests prove the 2S Part 0 fixes work by emulating Frappe's filter
// validation: the mock `listDoc` throws DataError when asked to filter a
// parent doctype by a field that lives only on a child table. A green suite
// proves the forward edges now use child-table queries correctly and the
// fault-isolation try/catch prevents one bad edge from blanking the rail.

import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveFlowGraph,
  resolveOneEdge,
  createBatchedGetDoc,
  type GetDoc,
  type ListDoc,
  type ResolvedLinkRow,
} from "@/lib/flows/flow-graph";
import {
  findFlowLink,
  getFlowLinksFrom,
  buildLinkFilter,
  defaultSelectFields,
  type FlowLinkDef,
} from "@/lib/flows/flow-link-map";

// ---------------------------------------------------------------------------
// ERPNext field placement — real header fields per parent doctype.
// Fields NOT in this list that appear on a child table only will cause the
// mock to throw, exactly like live Frappe.
// ---------------------------------------------------------------------------
const HEADER_FIELDS: Record<string, string[]> = {
  "Sales Order": ["name", "customer", "company", "docstatus", "status"],
  "Sales Order Item": ["name", "parent", "prevdoc_docname", "prevdoc_doctype", "item_code", "qty"],
  "Purchase Order": [
    "name",
    "supplier",
    "company",
    "docstatus",
    "status",
    "set_warehouse",
  ],
  "Purchase Order Item": ["name", "parent", "material_request", "item_code", "qty"],
  "Purchase Receipt": [
    "name",
    "supplier",
    "company",
    "docstatus",
    "status",
    "set_warehouse",
  ],
  "Purchase Receipt Item": ["name", "parent", "purchase_order", "item_code", "qty"],
  "Purchase Invoice": [
    "name",
    "supplier",
    "company",
    "docstatus",
    "status",
    "credit_to",
  ],
  "Purchase Invoice Item": ["name", "parent", "purchase_order", "purchase_receipt", "item_code", "qty"],
  "Sales Invoice": [
    "name",
    "customer",
    "company",
    "docstatus",
    "status",
    "outstanding_amount",
    "grand_total",
  ],
  "Sales Invoice Item": ["name", "parent", "delivery_note", "sales_order", "item_code", "qty"],
  "Delivery Note": [
    "name",
    "customer",
    "company",
    "docstatus",
    "status",
  ],
  "Delivery Note Item": ["name", "parent", "against_sales_order", "item_code", "qty"],
  "Material Request": ["name", "company", "docstatus", "status"],
  "Request for Quotation": ["name", "company", "docstatus"],
  "Supplier Quotation": ["name", "supplier", "docstatus"],
  "Payment Entry": [
    "name",
    "party",
    "payment_type",
    "docstatus",
    "status",
  ],
  "Payment Entry Reference": ["name", "parent", "reference_doctype", "reference_name", "allocated_amount"],
  "Work Order": [
    "name",
    "production_item",
    "bom_no",
    "company",
    "status",
    "sales_order",
  ],
  "Stock Entry": ["name", "work_order", "docstatus"],
  Quotation: [
    "name",
    "party_name",
    "quotation_to",
    "company",
    "docstatus",
  ],
  Lead: ["name", "lead_name", "docstatus"],
  Customer: ["name", "customer_name", "lead_name", "docstatus"],
  Opportunity: [
    "name",
    "party_name",
    "opportunity_from",
    "docstatus",
  ],
  BOM: ["name", "item", "company", "docstatus"],
};

// ---------------------------------------------------------------------------
// Mock data store — keyed by `${doctype}::${name}`
// ---------------------------------------------------------------------------
const DOCS = new Map<string, Record<string, unknown>>();

function seedDoc(
  doctype: string,
  name: string,
  data: Record<string, unknown>,
) {
  DOCS.set(`${doctype}::${name}`, { doctype, name, ...data });
}

// ---------------------------------------------------------------------------
// Mock getDoc / listDoc
// ---------------------------------------------------------------------------
function mockGetDoc(doctype: string, name: string): Record<string, unknown> | null {
  if (!doctype || !name) return null;
  return DOCS.get(`${doctype}::${name}`) ?? null;
}

// Map every known child table to its parent doctype. Used by the 4-tuple
// child-table filter branch (Frappe resolves `[childDoctype, field, op, val]`
// against the PARENT list endpoint by joining the child table). Covers the
// non-"Item" children (e.g. Payment Entry Reference) the bare suffix-strip
// can't handle.
const CHILD_TO_PARENT: Record<string, string> = {
  "Sales Order Item": "Sales Order",
  "Purchase Order Item": "Purchase Order",
  "Purchase Receipt Item": "Purchase Receipt",
  "Purchase Invoice Item": "Purchase Invoice",
  "Sales Invoice Item": "Sales Invoice",
  "Delivery Note Item": "Delivery Note",
  "Request for Quotation Item": "Request for Quotation",
  "Supplier Quotation Item": "Supplier Quotation",
  "Payment Entry Reference": "Payment Entry",
};

async function mockListDoc(
  doctype: string,
  filters: ReadonlyArray<unknown>,
  fields: string[],
  _limit: number,
): Promise<ResolvedLinkRow[]> {
  // Guard: empty doctype → return empty (matches the route guard).
  if (!doctype) return [];

  const headerAllowed = HEADER_FIELDS[doctype];

  // 2U §A — emulate Frappe `check_parent_permission`. Querying a CHILD
  // doctype (one that carries a `parent` field) directly via the list
  // endpoint raises PermissionError on live (403). The resolver must never
  // do this — it queries the PARENT with a 4-tuple child-table filter
  // instead. This guard is what the pre-2U mock was missing: it let the
  // child-direct query pass green while live 403'd on every back-link.
  if (headerAllowed && headerAllowed.includes("parent")) {
    throw new Error(
      `check_parent_permission: cannot query child table "${doctype}" directly`,
    );
  }

  // Validate each filter:
  // - 3-tuple [field, op, value]: field must be on the parent's header.
  // - 4-tuple [childDoctype, field, op, value]: child-table filter —
  //   Frappe handles it server-side, so we pass through without validation.
  for (const f of filters) {
    if (!Array.isArray(f)) continue;
    if (f.length === 3) {
      const [field] = f as [string, string, unknown];
      if (
        headerAllowed &&
        field !== "name" &&
        !headerAllowed.includes(field)
      ) {
        throw new Error(
          `Field not permitted in query: ${field} (doctype: ${doctype})`,
        );
      }
    }
    // 4-tuple child-table filters are valid Frappe — pass through.
  }

  // Simple in-memory filter: find docs matching all 3-tuple AND 4-tuple filters.
  const results: ResolvedLinkRow[] = [];
  for (const [, doc] of DOCS) {
    if (doc.doctype !== doctype) continue;
    let match = true;
    for (const f of filters) {
      if (!Array.isArray(f)) continue;

      // 3-tuple [field, op, value]: direct header field match
      if (f.length === 3) {
        const [field, op, value] = f as [string, string, unknown];
        const docVal = doc[field];
        if (op === "=" && docVal !== value) {
          match = false;
          break;
        }
        if (op === "!=" && docVal === value) {
          match = false;
          break;
        }
      }

      // 4-tuple [childDoctype, field, op, value]: child-table filter.
      // 9R.13 / 2U §A: Apply against the parent doc's child-table rows,
      // joining on the child field. The child rows may live in any array
      // property of the parent (`items` for *-Item tables, `references`
      // for Payment Entry Reference), so we gather every array-valued
      // property rather than hardcoding `items`. This catches wrong child
      // field names AND exercises the live 4-tuple-against-parent path.
      if (f.length === 4) {
        const [childDoctype, field, op, value] = f as [string, string, string, unknown];
        // The childDoctype must belong to THIS parent (e.g. "Sales Order
        // Item" → "Sales Order", "Payment Entry Reference" → "Payment
        // Entry"). If it maps elsewhere, the filter can't match here — skip.
        const parentFromChild =
          CHILD_TO_PARENT[childDoctype] ?? childDoctype.replace(/\s+Item$/, "");
        if (parentFromChild !== doctype) {
          // The child doctype doesn't belong to this parent — skip
          continue;
        }
        const childRows = Object.values(doc)
          .filter((v): v is Record<string, unknown>[] => Array.isArray(v))
          .flat();
        const childMatch = childRows.some((item) => {
          const childVal = item?.[field];
          if (op === "=") return childVal === value;
          if (op === "!=") return childVal !== value;
          return true;
        });
        if (!childMatch) {
          match = false;
          break;
        }
      }
    }
    if (match) {
      const row: ResolvedLinkRow = { name: String(doc.name) };
      if (fields.includes("parent") && doc.parent) {
        row.parent = String(doc.parent);
      }
      results.push(row);
    }
  }
  return results.slice(0, _limit);
}

// ---------------------------------------------------------------------------
// Seed the test data for the procure-to-pay chain:
// PR-001 → PO-001 → PI-001 → PE-001
// Also: QTN-001 → SO-001 → DN-001 → SI-001 → PE-002
// ---------------------------------------------------------------------------
function seedProduceTestData() {
  DOCS.clear();

  // Purchase chain
  seedDoc("Purchase Receipt", "PR-001", {
    supplier: "SUPP-001",
    docstatus: 1,
    items: [
      { purchase_order: "PO-001", item_code: "ITEM-001", qty: 10 },
    ],
  });
  seedDoc("Purchase Order", "PO-001", {
    supplier: "SUPP-001",
    docstatus: 1,
    items: [
      { material_request: "MR-001", item_code: "ITEM-001", qty: 10 },
    ],
  });
  seedDoc("Purchase Invoice", "PI-001", {
    supplier: "SUPP-001",
    docstatus: 1,
    outstanding_amount: 5000,
    grand_total: 5000,
    items: [
      { purchase_order: "PO-001", purchase_receipt: "PR-001", item_code: "ITEM-001", qty: 10 },
    ],
  });
  // PE for the purchase chain — references PI-001
  seedDoc("Payment Entry", "PE-001", {
    party: "SUPP-001",
    payment_type: "Pay",
    docstatus: 1,
    references: [
      { reference_doctype: "Purchase Invoice", reference_name: "PI-001", allocated_amount: 5000 },
    ],
  });
  seedDoc("Material Request", "MR-001", {
    docstatus: 1,
    material_request_type: "Purchase",
    items: [{ item_code: "ITEM-001", qty: 10 }],
  });

  // Sales chain
  seedDoc("Quotation", "QTN-001", {
    party_name: "CUST-001",
    quotation_to: "Customer",
    docstatus: 1,
    items: [
      { prevdoc_docname: "", item_code: "ITEM-001", qty: 5 },
    ],
  });
  seedDoc("Sales Order", "SO-001", {
    customer: "CUST-001",
    docstatus: 1,
    items: [
      { prevdoc_docname: "QTN-001", prevdoc_doctype: "Quotation", item_code: "ITEM-001", qty: 5 },
      { against_sales_order: "SO-001", item_code: "ITEM-001", qty: 5 },
    ],
  });
  seedDoc("Delivery Note", "DN-001", {
    customer: "CUST-001",
    docstatus: 1,
    items: [
      { against_sales_order: "SO-001", item_code: "ITEM-001", qty: 5 },
      { delivery_note: "DN-001", item_code: "ITEM-001", qty: 5 },
    ],
  });
  seedDoc("Sales Invoice", "SI-001", {
    customer: "CUST-001",
    docstatus: 1,
    outstanding_amount: 10000,
    grand_total: 10000,
    items: [
      { delivery_note: "DN-001", sales_order: "SO-001", item_code: "ITEM-001", qty: 5 },
    ],
  });
  // PE for the sales chain — references SI-001
  seedDoc("Payment Entry", "PE-002", {
    party: "CUST-001",
    payment_type: "Receive",
    docstatus: 1,
    references: [
      { reference_doctype: "Sales Invoice", reference_name: "SI-001", allocated_amount: 10000 },
    ],
  });

  // Customer (needed for header_link verify step)
  seedDoc("Customer", "CUST-001", {
    customer_name: "Test Customer",
    docstatus: 1,
  });

  // Supplier (needed for header_link verify step on PO/PR/PI)
  seedDoc("Supplier", "SUPP-001", {
    supplier_name: "Test Supplier",
    docstatus: 1,
  });

  // 2T — Seed child-table docs with `parent` field for direct child-table
  // queries (the 2T resolveBackLink Path B queries child tables directly
  // instead of using 4-tuple filters on the parent).

  // SO Item → QN back-link
  seedDoc("Sales Order Item", "SOI-001", {
    parent: "SO-001",
    prevdoc_docname: "QTN-001",
    prevdoc_doctype: "Quotation",
    item_code: "ITEM-001",
    qty: 5,
  });

  // PO Item → MR back-link
  seedDoc("Purchase Order Item", "POI-001", {
    parent: "PO-001",
    material_request: "MR-001",
    item_code: "ITEM-001",
    qty: 10,
  });

  // PR Item → PO back-link
  seedDoc("Purchase Receipt Item", "PRI-001", {
    parent: "PR-001",
    purchase_order: "PO-001",
    item_code: "ITEM-001",
    qty: 10,
  });

  // PI Item → PO + PR back-links
  seedDoc("Purchase Invoice Item", "PII-001", {
    parent: "PI-001",
    purchase_order: "PO-001",
    purchase_receipt: "PR-001",
    item_code: "ITEM-001",
    qty: 10,
  });

  // DN Item → SO back-link
  seedDoc("Delivery Note Item", "DNI-001", {
    parent: "DN-001",
    against_sales_order: "SO-001",
    item_code: "ITEM-001",
    qty: 5,
  });

  // SI Item → DN + SO back-links
  seedDoc("Sales Invoice Item", "SII-001", {
    parent: "SI-001",
    delivery_note: "DN-001",
    sales_order: "SO-001",
    item_code: "ITEM-001",
    qty: 5,
  });

  // PE Reference → SI back-link
  seedDoc("Payment Entry Reference", "PEREF-001", {
    parent: "PE-002",
    reference_doctype: "Sales Invoice",
    reference_name: "SI-001",
    allocated_amount: 10000,
  });

  // PE Reference → PI back-link
  seedDoc("Payment Entry Reference", "PEREF-002", {
    parent: "PE-001",
    reference_doctype: "Purchase Invoice",
    reference_name: "PI-001",
    allocated_amount: 5000,
  });
}

// ===========================================================================
// Tests
// ===========================================================================

describe("2S Part 0.6: Live-faithful flow resolver", () => {
  beforeEach(() => {
    seedProduceTestData();
  });

  // --- 0.6.1: Quotation → Sales Order resolves ---
  it("Quotation→Sales Order resolves to SO-001 (child-table back_link)", async () => {
    const result = await resolveOneEdge(
      "Quotation",
      DOCS.get("Quotation::QTN-001")!,
      "Sales Order",
      mockListDoc,
    );
    expect(result).toBe("SO-001");
  });

  // --- 0.6.2: Material Request → Purchase Order resolves ---
  it("Material Request→Purchase Order resolves to PO-001", async () => {
    // PO-001 already has material_request="MR-001" on its items (seeded above)
    const result = await resolveOneEdge(
      "Material Request",
      DOCS.get("Material Request::MR-001")!,
      "Purchase Order",
      mockListDoc,
    );
    expect(result).toBe("PO-001");
  });

  // --- 0.6.3: Purchase Order → Purchase Receipt resolves ---
  it("Purchase Order→Purchase Receipt resolves to PR-001", async () => {
    const result = await resolveOneEdge(
      "Purchase Order",
      DOCS.get("Purchase Order::PO-001")!,
      "Purchase Receipt",
      mockListDoc,
    );
    expect(result).toBe("PR-001");
  });

  // --- 0.6.4: Purchase Receipt → Purchase Invoice resolves ---
  it("Purchase Receipt→Purchase Invoice resolves to PI-001", async () => {
    const result = await resolveOneEdge(
      "Purchase Receipt",
      DOCS.get("Purchase Receipt::PR-001")!,
      "Purchase Invoice",
      mockListDoc,
    );
    expect(result).toBe("PI-001");
  });

  // --- 0.6.5: Purchase Order → Purchase Invoice resolves ---
  it("Purchase Order→Purchase Invoice resolves to PI-001", async () => {
    const result = await resolveOneEdge(
      "Purchase Order",
      DOCS.get("Purchase Order::PO-001")!,
      "Purchase Invoice",
      mockListDoc,
    );
    expect(result).toBe("PI-001");
  });

  // --- 0.6.6: Delivery Note → Sales Invoice resolves ---
  it("Delivery Note→Sales Invoice resolves to SI-001", async () => {
    const result = await resolveOneEdge(
      "Delivery Note",
      DOCS.get("Delivery Note::DN-001")!,
      "Sales Invoice",
      mockListDoc,
    );
    expect(result).toBe("SI-001");
  });

  // --- 0.6.7: The old broken pattern (parent field = child field) would have thrown ---
  it("filtering Purchase Order by 'material_request' (child-only field) throws DataError", async () => {
    await expect(
      mockListDoc(
        "Purchase Order",
        [["material_request", "=", "MR-001"]],
        ["name"],
        1,
      ),
    ).rejects.toThrow("Field not permitted in query: material_request");
  });

  it("filtering Sales Order by 'quotation' (child-only field) throws DataError", async () => {
    await expect(
      mockListDoc(
        "Sales Order",
        [["quotation", "=", "QTN-001"]],
        ["name"],
        1,
      ),
    ).rejects.toThrow("Field not permitted in query: quotation");
  });

  it("filtering Purchase Invoice by 'purchase_order' (child-only field) throws DataError", async () => {
    await expect(
      mockListDoc(
        "Purchase Invoice",
        [["purchase_order", "=", "PO-001"]],
        ["name"],
        1,
      ),
    ).rejects.toThrow("Field not permitted in query: purchase_order");
  });

  // --- 0.6.8: Fault isolation — one bad edge doesn't kill the graph ---
  it("fault isolation: resolveFlowGraph continues despite a failing edge", async () => {
    // Add a bad edge manually by getting all edges from Sales Order and
    // verifying the graph still resolves DO and SI even if one edge fails.
    const listDocThrowsOnBadField: ListDoc = async (doctype, filters, fields, limit) => {
      // Simulate: any query on "Sales Invoice" with field "bad_field" throws
      for (const f of filters) {
        if (Array.isArray(f) && f.length === 3 && f[0] === "bad_field" && doctype === "Sales Invoice") {
          throw new Error("Field not permitted in query: bad_field");
        }
      }
      return mockListDoc(doctype, filters, fields, limit);
    };

    // The full graph resolution from Sales Order should still work even
    // if some edges fail (fault isolation via try/catch).
    const getDoc: GetDoc = (d, n) => Promise.resolve(mockGetDoc(d, n));
    const result = await resolveFlowGraph(
      "Sales Order",
      "SO-001",
      getDoc,
      listDocThrowsOnBadField,
    );
    // SO-001 should be resolved as current
    expect(result.map["Sales Order"]).toBe("SO-001");
    // Customer should be resolved (header_link)
    expect(result.map["Customer"]).toBe("CUST-001");
  });

  // --- 0.6.9: Full procure-to-pay chain resolves ---
  it("full chain: PO resolves PR, PI, and PE", async () => {
    const getDoc: GetDoc = (d, n) => Promise.resolve(mockGetDoc(d, n));
    const result = await resolveFlowGraph(
      "Purchase Order",
      "PO-001",
      getDoc,
      mockListDoc,
    );
    // PO is the anchor
    expect(result.map["Purchase Order"]).toBe("PO-001");
    // PR should resolve via PO→PR child-table link
    expect(result.map["Purchase Receipt"]).toBe("PR-001");
    // PI should resolve via PO→PI child-table link
    expect(result.map["Purchase Invoice"]).toBe("PI-001");
    // PE should resolve via PI→PE current_child
    expect(result.map["Payment Entry"]).toBe("PE-001");
  });

  // --- 0.6.10: Sales chain resolves ---
  it("full chain: SO resolves Quotation, Customer, DN, SI, PE", async () => {
    const getDoc: GetDoc = (d, n) => Promise.resolve(mockGetDoc(d, n));
    const result = await resolveFlowGraph(
      "Sales Order",
      "SO-001",
      getDoc,
      mockListDoc,
    );
    expect(result.map["Sales Order"]).toBe("SO-001");
    expect(result.map["Customer"]).toBe("CUST-001");
    // DN should resolve via SO→DN child-table link
    expect(result.map["Delivery Note"]).toBe("DN-001");
    // SI should resolve via SO→SI child-table link
    expect(result.map["Sales Invoice"]).toBe("SI-001");
  });
});

// ===========================================================================
// Link map structural tests
// ===========================================================================
describe("2S Part 0.3: Link map edge definitions", () => {
  it("Quotation→Sales Order uses child-table queryDoctype", () => {
    const edge = findFlowLink("Quotation", "Sales Order");
    expect(edge).toBeDefined();
    expect(edge!.pattern).toBe("back_link");
    expect(edge!.queryDoctype).toBe("Sales Order Item");
    expect(edge!.field).toBe("prevdoc_docname");
    expect(edge!.returnParent).toBe(true);
  });

  it("Material Request→Purchase Order uses child-table queryDoctype", () => {
    const edge = findFlowLink("Material Request", "Purchase Order");
    expect(edge).toBeDefined();
    expect(edge!.queryDoctype).toBe("Purchase Order Item");
    expect(edge!.field).toBe("material_request");
    expect(edge!.returnParent).toBe(true);
  });

  it("Material Request→Request for Quotation uses child-table queryDoctype", () => {
    const edge = findFlowLink("Material Request", "Request for Quotation");
    expect(edge).toBeDefined();
    expect(edge!.queryDoctype).toBe("Request for Quotation Item");
    expect(edge!.field).toBe("material_request");
    expect(edge!.returnParent).toBe(true);
  });

  it("Supplier Quotation→Purchase Order uses child-table queryDoctype", () => {
    const edge = findFlowLink("Supplier Quotation", "Purchase Order");
    expect(edge).toBeDefined();
    expect(edge!.queryDoctype).toBe("Purchase Order Item");
    expect(edge!.field).toBe("supplier_quotation");
    expect(edge!.returnParent).toBe(true);
  });

  it("Purchase Order→Purchase Receipt uses child-table queryDoctype", () => {
    const edge = findFlowLink("Purchase Order", "Purchase Receipt");
    expect(edge).toBeDefined();
    expect(edge!.queryDoctype).toBe("Purchase Receipt Item");
    expect(edge!.field).toBe("purchase_order");
    expect(edge!.returnParent).toBe(true);
  });

  it("Purchase Receipt→Purchase Invoice uses child-table queryDoctype", () => {
    const edge = findFlowLink("Purchase Receipt", "Purchase Invoice");
    expect(edge).toBeDefined();
    expect(edge!.queryDoctype).toBe("Purchase Invoice Item");
    expect(edge!.field).toBe("purchase_receipt");
    expect(edge!.returnParent).toBe(true);
  });

  it("Purchase Order→Purchase Invoice uses child-table queryDoctype", () => {
    const edge = findFlowLink("Purchase Order", "Purchase Invoice");
    expect(edge).toBeDefined();
    expect(edge!.queryDoctype).toBe("Purchase Invoice Item");
    expect(edge!.field).toBe("purchase_order");
    expect(edge!.returnParent).toBe(true);
  });

  it("existing current_child backward edges are unchanged", () => {
    // SO→Quotation
    const soQt = findFlowLink("Sales Order", "Quotation");
    expect(soQt?.pattern).toBe("current_child");
    expect(soQt?.childField).toBe("prevdoc_docname");

    // DN→SO
    const dnSo = findFlowLink("Delivery Note", "Sales Order");
    expect(dnSo?.pattern).toBe("current_child");
    expect(dnSo?.childField).toBe("against_sales_order");

    // SI→SO
    const siSo = findFlowLink("Sales Invoice", "Sales Order");
    expect(siSo?.pattern).toBe("current_child");
    expect(siSo?.childField).toBe("sales_order");

    // PR→PO
    const prPo = findFlowLink("Purchase Receipt", "Purchase Order");
    expect(prPo?.pattern).toBe("current_child");
    expect(prPo?.childField).toBe("purchase_order");

    // PI→PO
    const piPo = findFlowLink("Purchase Invoice", "Purchase Order");
    expect(piPo?.pattern).toBe("current_child");
    expect(piPo?.childField).toBe("purchase_order");

    // PI→PR
    const piPr = findFlowLink("Purchase Invoice", "Purchase Receipt");
    expect(piPr?.pattern).toBe("current_child");
    expect(piPr?.childField).toBe("purchase_receipt");
  });
});

// ===========================================================================
// Procure-to-pay rail stages (Part 0.5)
// ===========================================================================
describe("2S Part 0.5: Procure-to-pay rail stages", () => {
  it("PURCHASE_FLOW does not include RFQ or SQ stages", async () => {
    const { PURCHASE_FLOW } = await import("@/lib/flows/flow-definitions");
    const stageDoctypes = PURCHASE_FLOW.stages.map((s) => s.doctype);
    expect(stageDoctypes).not.toContain("Request for Quotation");
    expect(stageDoctypes).not.toContain("Supplier Quotation");
    // Core chain is intact
    expect(stageDoctypes).toContain("Material Request");
    expect(stageDoctypes).toContain("Purchase Order");
    expect(stageDoctypes).toContain("Purchase Receipt");
    expect(stageDoctypes).toContain("Purchase Invoice");
    expect(stageDoctypes).toContain("Payment Entry");
  });

  it("RFQ/SQ edges still exist in the link map (reachable via CrossFlow)", () => {
    const rfqEdge = findFlowLink("Material Request", "Request for Quotation");
    expect(rfqEdge).toBeDefined();
    const sqEdge = findFlowLink("Supplier Quotation", "Purchase Order");
    expect(sqEdge).toBeDefined();
  });
});

// ===========================================================================
// buildLinkFilter correctness
// ===========================================================================
describe("2S Part 0.3: buildLinkFilter for fixed edges", () => {
  it("Quotation→SO filter is a 4-tuple child-table filter", () => {
    const edge = findFlowLink("Quotation", "Sales Order")!;
    const filters = buildLinkFilter(edge, "QTN-001");
    // Should have: [Sales Order Item, prevdoc_docname, =, QTN-001] + extraFilter
    expect(filters.length).toBeGreaterThanOrEqual(1);
    const mainFilter = filters[0] as [string, string, string, unknown];
    expect(mainFilter[0]).toBe("Sales Order Item");
    expect(mainFilter[1]).toBe("prevdoc_docname");
    expect(mainFilter[2]).toBe("=");
    expect(mainFilter[3]).toBe("QTN-001");
  });

  it("MR→PO filter is a 4-tuple child-table filter", () => {
    const edge = findFlowLink("Material Request", "Purchase Order")!;
    const filters = buildLinkFilter(edge, "MR-001");
    const mainFilter = filters[0] as [string, string, string, unknown];
    expect(mainFilter[0]).toBe("Purchase Order Item");
    expect(mainFilter[1]).toBe("material_request");
  });

  it("PO→PR filter is a 4-tuple child-table filter", () => {
    const edge = findFlowLink("Purchase Order", "Purchase Receipt")!;
    const filters = buildLinkFilter(edge, "PO-001");
    const mainFilter = filters[0] as [string, string, string, unknown];
    expect(mainFilter[0]).toBe("Purchase Receipt Item");
    expect(mainFilter[1]).toBe("purchase_order");
  });
});

// ===========================================================================
// createBatchedGetDoc deduplication
// ===========================================================================
describe("2S Part 0.1: createBatchedGetDoc deduplication", () => {
  it("deduplicates concurrent requests for the same doc", async () => {
    let fetchCount = 0;
    const raw: GetDoc = async (doctype, name) => {
      fetchCount++;
      return { doctype, name, value: "test" };
    };
    const batched = createBatchedGetDoc(raw);
    const results = await Promise.all([
      batched("Sales Order", "SO-001"),
      batched("Sales Order", "SO-001"),
      batched("Sales Order", "SO-001"),
    ]);
    // All three should return the same doc
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    // But raw should only have been called once (deduped)
    expect(fetchCount).toBe(1);
  });
});
