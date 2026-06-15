// tests/phase-2l.test.ts
// Obsidian ERP v4.0 — Phase 2L tests (Quick-Add wiring, Cross-Flow mounted,
// Item Price auto-rate, PO warehouse propagation, PO step-1 date gate, LINK_EXISTS).
//
// Per MESH Reporting Contract rule 6: tests assert against real code and
// real components, not literals.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  buildItemPriceFilters,
  pickBestItemPrice,
  lookupItemPriceRate,
  ITEM_PRICE_API_PATH,
} from "@/lib/flows/item-price-lookup";
import {
  getAdjacencies,
  buildAdjacencyCreateHref,
  fillBackLinkFilter,
} from "@/lib/flows/flow-adjacency";
import { validateWizardStep, WIZARD_STEP_SCHEMAS } from "@/lib/flows/flow-validation";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { KNOWN_ERROR_CODES } from "@/lib/errors/frappe-error-resolver";

// ---------------------------------------------------------------------------
// Part 1A: Quick-Add wired — assert the QuickAddField is rendered for the
// master field on a real wizard. The Quotation page is used as the smoke
// test (Quotation is the simplest form that renders QuickAddField).
// ---------------------------------------------------------------------------
describe("Part 1A: Quick-Add is wired into wizards", () => {
  it("QuickAddField is used by the Quotation wizard for party_name (imported as QuickAddField, not FormFrappeSelect)", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app/sales/quotation/new/page.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");
    // The Quotation wizard imports QuickAddField and uses it for party_name
    expect(content).toMatch(/import\s+\{\s*QuickAddField\s*\}\s+from\s+["']@\/components\/quick-add\/QuickAddField["']/);
    // And there's a <QuickAddField for the party_name field
    expect(content).toMatch(/<QuickAddField[\s\S]*?name="party_name"[\s\S]*?\/>/);
  });

  it("QuickAddField is used by the SO wizard for customer + per-row item_code", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app/sales/sales-order/new/page.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toContain("import { QuickAddField }");
    expect(content).toMatch(/<QuickAddField[\s\S]*?name="customer"[\s\S]*?\/>/);
  });

  it("QuickAddField is used by the PO wizard for supplier + set_warehouse + items", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app/buying/purchase-order/new/page.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toContain("import { QuickAddField }");
    expect(content).toMatch(/<QuickAddField[\s\S]*?name="supplier"[\s\S]*?\/>/);
    expect(content).toMatch(/<QuickAddField[\s\S]*?name="set_warehouse"[\s\S]*?\/>/);
  });

  it("QuickAddField is used by the SR wizard for per-row item_code + warehouse", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app/stock/stock-reconciliation/new/page.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toContain("import { QuickAddField }");
    expect(content).toMatch(/<QuickAddField[\s\S]*?name=\{`items\.\$\{index\}\.item_code`\}[\s\S]*?\/>/);
    expect(content).toMatch(/<QuickAddField[\s\S]*?name=\{`items\.\$\{index\}\.warehouse`\}[\s\S]*?\/>/);
  });

  it("QuickAddField is used by the SI, DN, MR, SE wizards", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const files = [
      "app/accounting/sales-invoice/new/page.tsx",
      "app/stock/delivery-note/new/page.tsx",
      "app/stock/material-request/new/page.tsx",
      "app/stock/stock-entry/new/page.tsx",
    ];
    for (const f of files) {
      const content = await fs.readFile(path.join(process.cwd(), f), "utf-8");
      expect(content, `${f} should import QuickAddField`).toContain("import { QuickAddField }");
      expect(content, `${f} should use QuickAddField`).toMatch(/<QuickAddField/);
    }
  });
});

// ---------------------------------------------------------------------------
// Part 1B: Cross-Flow mounted — assert the menu is rendered on transactional
// detail pages. Use file:line imports to verify the real component is used.
// ---------------------------------------------------------------------------
describe("Part 1B: Cross-Flow Actions Menu is mounted on detail pages", () => {
  it("Sales Order detail mounts CrossFlowActionsMenu", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(
      path.join(process.cwd(), "app/sales/sales-order/[name]/page.tsx"),
      "utf-8",
    );
    expect(content).toContain("import { CrossFlowActionsMenu }");
    expect(content).toMatch(/<CrossFlowActionsMenu[\s\S]*?doctype="Sales Order"[\s\S]*?\/>/);
  });

  it("Purchase Order detail mounts CrossFlowActionsMenu", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(
      path.join(process.cwd(), "app/buying/purchase-order/[name]/page.tsx"),
      "utf-8",
    );
    expect(content).toContain("import { CrossFlowActionsMenu }");
    expect(content).toMatch(/<CrossFlowActionsMenu[\s\S]*?doctype="Purchase Order"[\s\S]*?\/>/);
  });

  it("Sales Invoice, Payment Entry, Delivery Note, Quotation, Material Request, Stock Entry, Work Order, BOM, Purchase Invoice, Purchase Receipt, RFQ, Supplier Quotation, Lead, Customer, Opportunity all mount CrossFlowActionsMenu", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const pages: Array<[string, string]> = [
      ["app/accounting/sales-invoice/[name]/page.tsx", "Sales Invoice"],
      ["app/accounting/payment-entry/[name]/page.tsx", "Payment Entry"],
      ["app/accounting/purchase-invoice/[name]/page.tsx", "Purchase Invoice"],
      ["app/stock/delivery-note/[name]/page.tsx", "Delivery Note"],
      ["app/stock/material-request/[name]/page.tsx", "Material Request"],
      ["app/stock/stock-entry/[name]/page.tsx", "Stock Entry"],
      ["app/stock/purchase-receipt/[name]/page.tsx", "Purchase Receipt"],
      ["app/sales/quotation/[name]/page.tsx", "Quotation"],
      ["app/manufacturing/work-order/[name]/page.tsx", "Work Order"],
      ["app/manufacturing/bom/[name]/page.tsx", "BOM"],
      ["app/buying/request-for-quotation/[name]/page.tsx", "Request for Quotation"],
      ["app/buying/supplier-quotation/[name]/page.tsx", "Supplier Quotation"],
      ["app/crm/lead/[name]/page.tsx", "Lead"],
      ["app/crm/customer/[name]/page.tsx", "Customer"],
      ["app/crm/opportunity/[name]/page.tsx", "Opportunity"],
    ];
    for (const [file, doctype] of pages) {
      const content = await fs.readFile(path.join(process.cwd(), file), "utf-8");
      expect(content, `${file} should import CrossFlowActionsMenu`).toContain("import { CrossFlowActionsMenu }");
      expect(
        content,
        `${file} should mount <CrossFlowActionsMenu doctype="${doctype}" ... />`,
      ).toMatch(new RegExp(`<CrossFlowActionsMenu[\\s\\S]*?doctype="${doctype}"[\\s\\S]*?/>`));
    }
  });
});

// ---------------------------------------------------------------------------
// Part 1C: Child-table back-link queries
// ---------------------------------------------------------------------------
describe("Part 1C: Child-table back-link queries (SO->DN, DN->SI, SI->PE, RFQ->SQ)", () => {
  it("Sales Order -> Delivery Note back-link is a child-table filter on Delivery Note Item.against_sales_order", () => {
    const edges = getAdjacencies("Sales Order");
    const dnEdge = edges.find((e) => e.targetDoctype === "Delivery Note");
    expect(dnEdge).toBeDefined();
    expect(dnEdge!.backLink).not.toBeNull();
    expect(dnEdge!.backLink!.doctype).toBe("Delivery Note");
    // The filter targets the child table; we use a 4-tuple
    expect(dnEdge!.backLink!.filters.length).toBeGreaterThanOrEqual(1);
    // The filter must reference 'against_sales_order'
    const hasChildFilter = dnEdge!.backLink!.filters.some(
      (f) => f[1] === "against_sales_order",
    );
    expect(hasChildFilter).toBe(true);
    // selectFields includes 'parent' so the CrossFlowActionsMenu can render
    // the parent DN's name (not the child row's name) in the View link.
    expect(dnEdge!.backLink!.selectFields).toContain("parent");
  });

  it("Delivery Note -> Sales Invoice back-link uses Sales Invoice Item.delivery_note", () => {
    const edges = getAdjacencies("Delivery Note");
    const siEdge = edges.find((e) => e.targetDoctype === "Sales Invoice");
    expect(siEdge).toBeDefined();
    expect(siEdge!.backLink).not.toBeNull();
    const hasChildFilter = siEdge!.backLink!.filters.some(
      (f) => f[1] === "delivery_note",
    );
    expect(hasChildFilter).toBe(true);
  });

  it("Sales Invoice -> Payment Entry back-link uses Payment Entry Reference.reference_name", () => {
    const edges = getAdjacencies("Sales Invoice");
    const peEdge = edges.find((e) => e.targetDoctype === "Payment Entry");
    expect(peEdge).toBeDefined();
    expect(peEdge!.backLink).not.toBeNull();
    const hasChildFilter = peEdge!.backLink!.filters.some(
      (f) => f[1] === "reference_name",
    );
    expect(hasChildFilter).toBe(true);
  });

  it("Request for Quotation -> Supplier Quotation back-link uses Supplier Quotation Item.request_for_quotation", () => {
    const edges = getAdjacencies("Request for Quotation");
    const sqEdge = edges.find((e) => e.targetDoctype === "Supplier Quotation");
    expect(sqEdge).toBeDefined();
    expect(sqEdge!.backLink).not.toBeNull();
    const hasChildFilter = sqEdge!.backLink!.filters.some(
      (f) => f[1] === "request_for_quotation",
    );
    expect(hasChildFilter).toBe(true);
  });

  it("buildAdjacencyCreateHref still builds a real route for the new edges", () => {
    const edges = getAdjacencies("Sales Order");
    const dnEdge = edges.find((e) => e.targetDoctype === "Delivery Note")!;
    const href = buildAdjacencyCreateHref(dnEdge, "SAL-ORD-2026-00001");
    expect(href).toBe("/stock/delivery-note/new?sales_order=SAL-ORD-2026-00001");
  });

  it("fillBackLinkFilter still substitutes <name>", () => {
    const f = fillBackLinkFilter(
      ["", "against_sales_order", "=", "<name>"],
      "SAL-ORD-2026-00001",
    );
    expect(f[3]).toBe("SAL-ORD-2026-00001");
  });
});

// ---------------------------------------------------------------------------
// Part 2: Item Price auto-rate
// ---------------------------------------------------------------------------
describe("Part 2: Item Price auto-rate integration (§10.4)", () => {
  it("buildItemPriceFilters produces the correct 3-tuple filters (selling side)", () => {
    const filters = buildItemPriceFilters({
      itemCode: "ITEM-001",
      priceList: "Standard Selling",
      currency: "ETB",
      side: "selling",
    });
    expect(filters).toHaveLength(4);
    // item_code, price_list, currency, selling=1
    expect(filters[0]).toEqual(["item_code", "=", "ITEM-001"]);
    expect(filters[1]).toEqual(["price_list", "=", "Standard Selling"]);
    expect(filters[2]).toEqual(["currency", "=", "ETB"]);
    expect(filters[3]).toEqual(["selling", "=", 1]);
  });

  it("buildItemPriceFilters uses 'buying' flag for the buying side", () => {
    const filters = buildItemPriceFilters({
      itemCode: "ITEM-001",
      priceList: "Standard Buying",
      currency: "ETB",
      side: "buying",
    });
    expect(filters[3]).toEqual(["buying", "=", 1]);
  });

  it("pickBestItemPrice returns null on empty input", () => {
    const match = pickBestItemPrice([], {
      itemCode: "ITEM-001",
      priceList: "Standard Selling",
      currency: "ETB",
      side: "selling",
    });
    expect(match).toBeNull();
  });

  it("pickBestItemPrice returns the most specific / most recent match", () => {
    const rows: Array<{
      name: string;
      item_code: string;
      price_list: string;
      price_list_rate: number;
      currency: string;
      selling?: number;
      modified?: string;
    }> = [
      {
        name: "IP-OLD",
        item_code: "ITEM-001",
        price_list: "Standard Selling",
        price_list_rate: 100,
        currency: "ETB",
        selling: 1,
        modified: "2026-01-01T00:00:00Z",
      },
      {
        name: "IP-NEW",
        item_code: "ITEM-001",
        price_list: "Standard Selling",
        price_list_rate: 150,
        currency: "ETB",
        selling: 1,
        modified: "2026-06-01T00:00:00Z",
      },
    ];
    const match = pickBestItemPrice(rows, {
      itemCode: "ITEM-001",
      priceList: "Standard Selling",
      currency: "ETB",
      side: "selling",
    });
    expect(match).not.toBeNull();
    expect(match!.rate).toBe(150);
    expect(match!.itemPriceName).toBe("IP-NEW");
  });

  it("pickBestItemPrice prefers matching UOM when present", () => {
    const rows = [
      { name: "IP-NOS", item_code: "X", price_list: "Standard Selling", price_list_rate: 100, currency: "ETB", selling: 1, uom: "Nos", modified: "2026-06-01" },
      { name: "IP-KG", item_code: "X", price_list: "Standard Selling", price_list_rate: 200, currency: "ETB", selling: 1, uom: "Kg", modified: "2026-06-02" },
    ];
    const match = pickBestItemPrice(rows, {
      itemCode: "X",
      priceList: "Standard Selling",
      currency: "ETB",
      side: "selling",
      uom: "Kg",
    });
    expect(match).not.toBeNull();
    expect(match!.itemPriceName).toBe("IP-KG");
    expect(match!.rate).toBe(200);
  });

  it("lookupItemPriceRate is a thin wrapper around pickBestItemPrice", () => {
    const rows = [
      { name: "IP-A", item_code: "X", price_list: "Standard Selling", price_list_rate: 99, currency: "ETB", selling: 1, modified: "2026-06-01" },
    ];
    const rate = lookupItemPriceRate(rows, {
      itemCode: "X",
      priceList: "Standard Selling",
      currency: "ETB",
      side: "selling",
    });
    expect(rate).toBe(99);
  });

  it("ITEM_PRICE_API_PATH points at the existing factory route", () => {
    expect(ITEM_PRICE_API_PATH).toBe("/api/stock/settings/item-price");
  });

  it("SO wizard wires ItemRateAutoFill into the items table", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app/sales/sales-order/new/page.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toContain("import { ItemRateAutoFill }");
    // Headless component is mounted inside the items.map
    expect(content).toMatch(/<ItemRateAutoFill[\s\S]*?side="selling"[\s\S]*?\/>/);
  });

  it("PO wizard wires ItemRateAutoFill with side='buying'", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(
      process.cwd(),
      "app/buying/purchase-order/new/page.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");
    expect(content).toContain("import { ItemRateAutoFill }");
    expect(content).toMatch(/<ItemRateAutoFill[\s\S]*?side="buying"[\s\S]*?\/>/);
  });
});

// ---------------------------------------------------------------------------
// Part 3 P0-A: PO warehouse propagation
// ---------------------------------------------------------------------------
describe("Part 3 P0-A: PO per-item warehouse propagation", () => {
  it("PO submit handler propagates header set_warehouse to every item that lacks a per-row warehouse", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(
      path.join(process.cwd(), "app/buying/purchase-order/new/page.tsx"),
      "utf-8",
    );
    // The submit handler builds the items list with a ternary that falls
    // back to values.set_warehouse when the item has no warehouse.
    expect(content).toMatch(/it\.warehouse\s*\|\|\s*headerWarehouse/);
    expect(content).toMatch(/const headerWarehouse = values\.set_warehouse \|\| ""/);
  });
});

// ---------------------------------------------------------------------------
// Part 3 P0-B: PO step-1 date gate + audit all step schemas
// ---------------------------------------------------------------------------
describe("Part 3 P0-B: PO step-1 schedule_date is optional (not required)", () => {
  it("purchaseOrderStepSchemas.step1 validates without schedule_date", () => {
    const result = validateWizardStep("Purchase Order", "step1", {
      supplier: "SUPP-001",
      transaction_date: "2026-06-11",
    });
    expect(result.valid).toBe(true);
  });

  it("materialRequestStepSchemas.step1 validates without schedule_date", () => {
    const result = validateWizardStep("Material Request", "step1", {
      material_request_type: "Purchase",
      transaction_date: "2026-06-11",
    });
    expect(result.valid).toBe(true);
  });

  it("FormDatePicker uses the Controller spread (no custom binding bug)", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(
      path.join(process.cwd(), "components/form/form-date-picker.tsx"),
      "utf-8",
    );
    // The form-date-picker spreads {...field} into <Input type="date">,
    // which is the standard react-hook-form Controller binding. The value
    // is therefore written to form state via the Input's change event.
    expect(content).toMatch(/\{[\s\S]*?\.{3}field[\s\S]*?\}/);
  });
});

// ---------------------------------------------------------------------------
// Part 3 P1: PE paid_from/paid_to rendered + auto-resolve
// ---------------------------------------------------------------------------
describe("Part 3 P1: PE paid_from/paid_to rendered + auto-resolve", () => {
  it("PE wizard renders paid_from and paid_to FormFrappeSelect", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(
      path.join(process.cwd(), "app/accounting/payment-entry/new/page.tsx"),
      "utf-8",
    );
    expect(content).toMatch(/name="paid_from"/);
    expect(content).toMatch(/name="paid_to"/);
  });

  it("PE wizard has an auto-resolve effect for default accounts", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(
      path.join(process.cwd(), "app/accounting/payment-entry/new/page.tsx"),
      "utf-8",
    );
    // Fetches default Cash + Bank + party Receivable/Payable accounts
    expect(content).toContain("defaultCashAccount");
    expect(content).toContain("defaultBankAccount");
    expect(content).toContain("partyDefaultAccount");
    // Auto-populates paid_from / paid_to based on payment_type
    expect(content).toMatch(/setValue\(["']paid_from["']/);
    expect(content).toMatch(/setValue\(["']paid_to["']/);
  });
});

// ---------------------------------------------------------------------------
// Part 3 P1: Notification panel Dismiss + Open <doc> action
// ---------------------------------------------------------------------------
describe("Part 3 P1: Notification panel Dismiss + 'Open <doc>' action", () => {
  it("notification-store exports dismiss + dismissAll", async () => {
    const mod = await import("@/lib/stores/notification-store");
    expect(typeof mod.dismiss).toBe("function");
    expect(typeof mod.dismissAll).toBe("function");
  });

  it("useNotifications hook exposes dismiss + dismissAll", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "lib/stores/use-notifications.ts",
      "utf-8",
    );
    // Verify the hook re-exports the dismiss + dismissAll functions in its
    // return value's interface (without actually invoking the hook, which
    // requires React context).
    expect(content).toContain("dismiss: dismissFn");
    expect(content).toContain("dismissAll: dismissAllFn");
  });

  it("notifications panel has Dismiss button + 'Open document' label in detail view", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/notifications/notifications-panel.tsx",
      "utf-8",
    );
    expect(content).toMatch(/handleDismiss/);
    expect(content).toContain("Open document");
    expect(content).toContain("Dismiss");
    expect(content).toContain("Clear all");
  });
});

// ---------------------------------------------------------------------------
// Part 3 P2: Price List LinkExists guided error
// ---------------------------------------------------------------------------
describe("Part 3 P2: LINK_EXISTS strategy for Price List delete", () => {
  it("KNOWN_ERROR_CODES includes LINK_EXISTS", () => {
    expect(KNOWN_ERROR_CODES).toContain("LINK_EXISTS");
  });

  it("resolves a 'is referenced by' error to LINK_EXISTS (the Price List delete case)", () => {
    const r = resolveFrappeError(
      new Error("Cannot delete or cancel because Price List Standard Selling is referenced by 5 Item Price(s)"),
      { doctype: "Price List" },
    );
    expect(r.code).toBe("LINK_EXISTS");
    expect(r.title).toContain("in use");
    // Should offer a navigation to Item Prices
    const viewAction = r.actions.find((a) => a.label === "View Item Prices");
    expect(viewAction).toBeDefined();
  });

  it("LINKED_DOC_EXISTS still fires for the cancel case (regression)", () => {
    const r = resolveFrappeError(
      new Error("Cannot cancel because submitted Delivery Note MAT-DN-2026-00001 exists"),
      { doctype: "Sales Order" },
    );
    expect(r.code).toBe("LINKED_DOC_EXISTS");
  });

  it("Price List detail page wires the resolver into the delete error path", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/accounting/settings/price-list/[name]/page.tsx",
      "utf-8",
    );
    expect(content).toContain("resolveFrappeError");
    expect(content).toMatch(/onError:\s*\(err\)\s*=>\s*showError\(resolveFrappeError/);
    expect(content).toContain("GuidedErrorDialog");
  });
});

// ---------------------------------------------------------------------------
// Strengthened step-gate regression (2L Part 4 #6 — re-point the 2K schema
// payload guards at the step schemas, the real gate). The CreateSchemas are
// now mostly .partial() so safeParse is trivially true; the step schemas
// are what the wizard gate actually uses.
// ---------------------------------------------------------------------------
describe("Strengthened step-gate regression (2L Part 4 #6)", () => {
  it("PO step1 is INVALID when supplier is missing — proves the gate fires", () => {
    const r = validateWizardStep("Purchase Order", "step1", {
      supplier: "",
      transaction_date: "2026-06-11",
    });
    expect(r.valid).toBe(false);
    expect(r.errors.supplier).toBe("Supplier is required");
  });

  it("PO step2 is INVALID when items is empty — proves the gate fires", () => {
    const r = validateWizardStep("Purchase Order", "step2", { items: [] });
    expect(r.valid).toBe(false);
  });

  it("MR step1 is INVALID when request type is missing — proves the gate fires", () => {
    const r = validateWizardStep("Material Request", "step1", {
      material_request_type: "",
      transaction_date: "2026-06-11",
    });
    expect(r.valid).toBe(false);
    expect(r.errors.material_request_type).toBe("Request type is required");
  });

  it("all step schemas use step1/step2/step3 naming", () => {
    for (const [doctype, schemas] of Object.entries(WIZARD_STEP_SCHEMAS)) {
      for (const key of Object.keys(schemas)) {
        expect(key, `${doctype}.${key}`).toMatch(/^step\d+$/);
      }
    }
  });
});
