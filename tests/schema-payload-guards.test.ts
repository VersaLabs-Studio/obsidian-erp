// tests/schema-payload-guards.test.ts
// Obsidian ERP v4.0 — R1 regression net (Phase 2K).
//
// For every transactional create wizard, the exact payload the wizard sends
// MUST validate against the create schema. This is the test that fails loudly
// if a CreateSchema drifts stricter than its wizard — the disease that broke
// PO create, SR submit, and PE create in Phase 2J.
//
// To stay honest (MESH Reporting Contract rule 6 — no hardcoded literals), each
// test imports the *real* `*CreateSchema` and runs the real wizard payload
// shape (built by helper functions that mirror each wizard's `handleSubmit`).

import { describe, it, expect } from "vitest";
import {
  PurchaseOrderCreateSchema,
  StockReconciliationCreateSchema,
  SalesOrderCreateSchema,
  QuotationCreateSchema,
  DeliveryNoteCreateSchema,
  SalesInvoiceCreateSchema,
  PaymentEntryCreateSchema,
} from "@/lib/schemas/doctype-schemas";

// ---------------------------------------------------------------------------
// Helpers — build the EXACT payload each wizard's handleSubmit produces.
// (Mirrors the spread/mutate inside each new/page.tsx.)
// ---------------------------------------------------------------------------

function buildPOPayload() {
  return {
    naming_series: "PUR-ORD-.YYYY.-",
    supplier: "SUPP-001",
    transaction_date: "2026-06-11",
    schedule_date: "2026-06-25",
    company: "Pana",
    currency: "ETB",
    conversion_rate: 1,
    plc_conversion_rate: 1,
    price_list_currency: "ETB",
    items: [
      {
        item_code: "ITEM-001",
        item_name: "Test Item",
        qty: 10,
        rate: 100,
        amount: 1000,
        uom: "Nos",
        warehouse: "Stores - P",
      },
    ],
    status: "Draft",
  };
}

function buildSRPayload() {
  return {
    purpose: "Opening Stock",
    posting_date: "2026-06-11",
    set_posting_time: 1,
    company: "Pana",
    items: [
      {
        item_code: "ITEM-001",
        warehouse: "Stores - P",
        qty: 100,
        valuation_rate: 50,
        idx: 1,
        doctype: "Stock Reconciliation Item",
      },
    ],
    docstatus: 0,
  };
}

function buildSOPayload() {
  return {
    naming_series: "SAL-ORD-.YYYY.-",
    customer: "CUST-001",
    transaction_date: "2026-06-11",
    delivery_date: "2026-06-25",
    order_type: "Sales",
    company: "Pana",
    currency: "ETB",
    selling_price_list: "Standard Selling",
    price_list_currency: "ETB",
    conversion_rate: 1,
    plc_conversion_rate: 1,
    status: "Draft",
    items: [
      {
        item_code: "ITEM-001",
        qty: 5,
        rate: 100,
        amount: 500,
        uom: "Nos",
      },
    ],
  };
}

function buildQuotationPayload() {
  return {
    naming_series: "SAL-QTN-.YYYY.-",
    quotation_to: "Customer",
    party_name: "CUST-001",
    customer_name: "Abebe Trading",
    transaction_date: "2026-06-11",
    valid_till: "2026-07-11",
    company: "Pana",
    currency: "ETB",
    conversion_rate: 1,
    selling_price_list: "Standard Selling",
    price_list_currency: "ETB",
    plc_conversion_rate: 1,
    order_type: "Sales",
    status: "Draft",
    items: [{ item_code: "ITEM-001", qty: 1, rate: 100 }],
  };
}

function buildDNPayload() {
  return {
    naming_series: "MAT-DN-.YYYY.-",
    customer: "CUST-001",
    posting_date: "2026-06-11",
    company: "Pana",
    items: [
      { item_code: "ITEM-001", qty: 1, rate: 100, amount: 100, uom: "Nos" },
    ],
    set_warehouse: "Stores - P",
    currency: "ETB",
    conversion_rate: 1,
    print_without_amount: 1,
  };
}

function buildSIPayload() {
  return {
    naming_series: "ACC-SINV-.YYYY.-",
    customer: "CUST-001",
    posting_date: "2026-06-11",
    company: "Pana",
    items: [
      { item_code: "ITEM-001", qty: 1, rate: 100, amount: 100, uom: "Nos" },
    ],
    currency: "ETB",
    conversion_rate: 1,
    redeem_loyalty_points: 0,
    is_return: 0,
  };
}

function buildPEPayload() {
  return {
    naming_series: "ACC-PAY-.YYYY.-",
    payment_type: "Receive",
    posting_date: "2026-06-11",
    company: "Pana",
    party_type: "Customer",
    party: "CUST-001",
    paid_amount: 100,
    received_amount: 100,
    references: [
      {
        reference_doctype: "Sales Invoice",
        reference_name: "ACC-SINV-2026-00001",
        allocated_amount: 100,
        exchange_rate: 1,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests — the wizard payload must always pass the create schema
// ---------------------------------------------------------------------------

describe("Schema ↔ Wizard payload guards (Phase 2K R1)", () => {
  it("Purchase Order: wizard payload passes PurchaseOrderCreateSchema", () => {
    const payload = buildPOPayload();
    const result = PurchaseOrderCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error("PO parse errors:", result.error.flatten().fieldErrors);
    }
    expect(result.success).toBe(true);
  });

  it("Stock Reconciliation: wizard payload passes StockReconciliationCreateSchema (R1 root cause)", () => {
    const payload = buildSRPayload();
    const result = StockReconciliationCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error("SR parse errors:", result.error.flatten().fieldErrors);
    }
    expect(result.success).toBe(true);
  });

  it("Sales Order: wizard payload passes SalesOrderCreateSchema", () => {
    const payload = buildSOPayload();
    const result = SalesOrderCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error("SO parse errors:", result.error.flatten().fieldErrors);
    }
    expect(result.success).toBe(true);
  });

  it("Quotation: wizard payload passes QuotationCreateSchema", () => {
    const payload = buildQuotationPayload();
    const result = QuotationCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error("Quotation parse errors:", result.error.flatten().fieldErrors);
    }
    expect(result.success).toBe(true);
  });

  it("Delivery Note: wizard payload passes DeliveryNoteCreateSchema", () => {
    const payload = buildDNPayload();
    const result = DeliveryNoteCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error("DN parse errors:", result.error.flatten().fieldErrors);
    }
    expect(result.success).toBe(true);
  });

  it("Sales Invoice: wizard payload passes SalesInvoiceCreateSchema", () => {
    const payload = buildSIPayload();
    const result = SalesInvoiceCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error("SI parse errors:", result.error.flatten().fieldErrors);
    }
    expect(result.success).toBe(true);
  });

  it("Payment Entry: wizard payload passes PaymentEntryCreateSchema (R3 root cause)", () => {
    const payload = buildPEPayload();
    const result = PaymentEntryCreateSchema.safeParse(payload);
    if (!result.success) {
      console.error("PE parse errors:", result.error.flatten().fieldErrors);
    }
    expect(result.success).toBe(true);
  });
});
