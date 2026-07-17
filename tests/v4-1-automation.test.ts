// tests/v4-1-automation.test.ts
// Version 4.1 — "Automation & Downscaling" round. File-content assertions in
// the repo's established style (see phase-2z.test.ts / phase-2o.test.tsx) —
// they pin the ARCHITECTURE (canonical ERPNext mappers + frappe.client.submit
// via user-scoped fail-closed server routes, born-submitted create paths, and
// the primary/advanced whatsNext split), not the pixels.
//
// v4.1 collapses the whole ERP's two ceremony shapes with ONE proven idiom:
//   A — draft-then-submit  → create then submit in the same action
//   B — manual doctype chaining → server route drives ERPNext's own make_* map
// so every test below checks that a flow that used to take N page-hops now
// runs through a single route or a single button.

import { describe, it, expect } from "vitest";

const read = async (path: string) => {
  const fs = await import("fs/promises");
  return fs.readFile(path, "utf-8");
};

// A route that fronts ERPNext must (a) run under the operator's own session,
// failing closed, and (b) never hand-build the target doc — it calls ERPNext's
// own mapper and submits the returned draft verbatim.
const expectUserScopedFailClosed = (content: string) => {
  expect(content).toMatch(/getRequestClient\(request\)/);
  expect(content).toMatch(/status:\s*401/);
};

// =============================================================================
// Workstream A — Procure-to-Pay parity (mirror the sales easing)
// =============================================================================

describe("4.1 A1: payment/quick generalized to Purchase Invoice (Mark as Paid)", () => {
  const ROUTE = "app/api/accounting/payment/quick/route.ts";

  it("is user-scoped and fails closed", async () => {
    expectUserScopedFailClosed(await read(ROUTE));
  });

  it("drives ERPNext's own get_payment_entry mapper + submits in one call", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/payment_entry\.get_payment_entry/);
    expect(content).toMatch(/frappe\.client\.submit/);
  });

  it("stays party-agnostic: defaults to Sales Invoice so 2Z sales is unchanged", async () => {
    const content = await read(ROUTE);
    // Default preserves the byte-for-byte 2Z behaviour when `doctype` is absent.
    expect(content).toMatch(/body\.doctype\?\.trim\(\)\s*\|\|\s*"Sales Invoice"/);
    // The mapper is fed whatever doctype the caller passes.
    expect(content).toMatch(/dt:\s*invoiceDoctype/);
  });

  it("branches the cash-account side on payment direction (Receive vs Pay)", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/payment_type\s*===\s*"Pay"/);
    // Pay routes the money-out side (paid_from); Receive the money-in (paid_to).
    expect(content).toMatch(/isPay\)\s*peDoc\.paid_from/);
    expect(content).toMatch(/else\s*peDoc\.paid_to/);
  });

  it("reads Mode-of-Payment accounts[] via the full doc, never get_list", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/frappe\.client\.get\b/);
    // No get_list CALL (child-table field in get_list 500s, SQL 1054). The
    // prose comment may mention get_list; only an actual `get_list(` invocation
    // is a violation.
    expect(content).not.toMatch(/get_list\(/);
  });
});

describe("4.1 A2: PO receive-and-bill (PR→submit→PI→submit chain)", () => {
  const ROUTE =
    "app/api/buying/purchase-order/[name]/receive-and-bill/route.ts";

  it("is user-scoped and fails closed", async () => {
    expectUserScopedFailClosed(await read(ROUTE));
  });

  it("chains ERPNext's OWN mappers — never hand-builds the PR/PI", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/purchase_order\.make_purchase_receipt/);
    expect(content).toMatch(/purchase_receipt\.make_purchase_invoice/);
    expect(content).toMatch(/frappe\.client\.submit/);
  });

  it("applies the 9R.14 payment_schedule reset to the mapped targets", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/payment_schedule\s*=\s*\[\]/);
  });

  it("never loses the PR: partial-failure payload carries purchase_receipt", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/BillFailedAfterReceipt/);
    expect(content).toMatch(/purchase_receipt:\s*prName,\s*purchase_invoice:\s*null/);
  });
});

describe("4.1 A3: PR bill (PI from receipt, one click)", () => {
  const ROUTE = "app/api/buying/purchase-receipt/[name]/bill/route.ts";

  it("is user-scoped and fails closed", async () => {
    expectUserScopedFailClosed(await read(ROUTE));
  });

  it("drives make_purchase_invoice + submits, with the schedule reset", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/purchase_receipt\.make_purchase_invoice/);
    expect(content).toMatch(/frappe\.client\.submit/);
    expect(content).toMatch(/payment_schedule\s*=\s*\[\]/);
  });
});

describe("4.1 A4: MR order (PO from request, submitted)", () => {
  const ROUTE = "app/api/buying/material-request/[name]/order/route.ts";

  it("is user-scoped and fails closed", async () => {
    expectUserScopedFailClosed(await read(ROUTE));
  });

  it("drives make_purchase_order + submits in one call", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/material_request\.make_purchase_order/);
    expect(content).toMatch(/frappe\.client\.submit/);
  });

  it("guides the no-default-supplier case to a plain-language 422", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/SupplierRequired/);
    expect(content).toMatch(/statusCode:\s*422/);
    expect(content).toMatch(/Default Supplier/);
  });
});

// =============================================================================
// Workstream B — Manufacturing run simplification
// =============================================================================

describe("4.1 B1: WO start route hardened to the user-scoped client", () => {
  const ROUTE = "app/api/manufacturing/work-order/[name]/start/route.ts";

  it("no longer uses the admin singleton — runs under the operator", async () => {
    const content = await read(ROUTE);
    expectUserScopedFailClosed(content);
    expect(content).toMatch(/work_order\.start_work/);
    // The admin frappeClient singleton must not drive the call itself.
    expect(content).not.toMatch(/frappeClient\.call/);
  });
});

describe("4.1 B2: standalone WO create is born submitted", () => {
  const PAGE = "app/manufacturing/work-order/new/page.tsx";

  it("creates then submits (docstatus:1) in the same action", async () => {
    const content = await read(PAGE);
    expect(content).toMatch(/useFrappeUpdate/);
    expect(content).toMatch(/mutateAsync/);
    expect(content).toMatch(/docstatus:\s*1/);
  });

  it("degrades to a draft (never a hard failure) if the submit fails", async () => {
    const content = await read(PAGE);
    expect(content).toMatch(/toast\.warning/);
  });
});

describe("4.1 B3: BOM detail one-click Submit & Create Work Order", () => {
  const PAGE = "app/manufacturing/bom/[name]/page.tsx";

  it("offers the combined submit-then-navigate primary action", async () => {
    const content = await read(PAGE);
    expect(content).toMatch(/Submit & Create Work Order/);
  });

  it("only lets a SUBMITTED + active BOM back a Work Order", async () => {
    const content = await read(PAGE);
    // The latent trap was an is_active-only gate that showed for draft BOMs.
    expect(content).toMatch(/isSubmitted && isActive/);
  });
});

// =============================================================================
// Workstream C — Stock quick-actions (born-submitted create paths)
// =============================================================================

describe("4.1 C1: stock create pages are born submitted", () => {
  const PAGES = [
    "app/stock/stock-entry/new/page.tsx",
    "app/stock/material-request/new/page.tsx",
    "app/stock/stock-reconciliation/new/page.tsx",
  ];

  for (const PAGE of PAGES) {
    it(`${PAGE}: create → submit → degrade-to-draft`, async () => {
      const content = await read(PAGE);
      // Pulls in the update hook for the follow-up submit.
      expect(content).toMatch(/useFrappeCreate,\s*useFrappeUpdate/);
      // create then submit — the two-call born-submitted idiom.
      expect(content).toMatch(/createMutation\.mutateAsync/);
      expect(content).toMatch(/submitMutation\.mutateAsync/);
      expect(content).toMatch(/docstatus:\s*1/);
      // The submit half is soft: a failure keeps the draft, never loses input.
      expect(content).toMatch(/toast\.warning/);
      // Single owned narrative — the factory's own toasts are suppressed.
      expect(content).toMatch(/showToast:\s*false/);
    });
  }
});

// =============================================================================
// Client wiring — primary automation action + advanced wizard kept as fallback
// =============================================================================

describe("4.1 detail pages: primary one-click action + advanced wizard path", () => {
  const CASES: Array<{ page: string; primary: RegExp; advanced: RegExp }> = [
    {
      page: "app/accounting/purchase-invoice/[name]/page.tsx",
      primary: /label:\s*"Mark as Paid"/,
      advanced: /Payment Entry \(advanced\)/,
    },
    {
      page: "app/buying/purchase-order/[name]/page.tsx",
      primary: /label:\s*"Receive & Bill"/,
      advanced: /Receive only \(advanced\)/,
    },
    {
      page: "app/stock/purchase-receipt/[name]/page.tsx",
      primary: /label:\s*"Bill"/,
      advanced: /Purchase Invoice \(advanced\)/,
    },
    {
      page: "app/stock/material-request/[name]/page.tsx",
      primary: /label:\s*"Order \(auto\)"/,
      advanced: /Purchase Order \(advanced\)/,
    },
  ];

  for (const c of CASES) {
    it(`${c.page}: registers the primary action and keeps the advanced wizard`, async () => {
      const content = await read(c.page);
      expect(content).toMatch(c.primary);
      expect(content).toMatch(c.advanced);
    });
  }
});

// =============================================================================
// Standing guardrail — no raw /api/resource fetches slipped into the new code
// =============================================================================

describe("4.1 guardrail: touched files never hit /api/resource directly", () => {
  const TOUCHED = [
    "app/api/accounting/payment/quick/route.ts",
    "app/api/buying/purchase-order/[name]/receive-and-bill/route.ts",
    "app/api/buying/purchase-receipt/[name]/bill/route.ts",
    "app/api/buying/material-request/[name]/order/route.ts",
    "app/accounting/purchase-invoice/[name]/page.tsx",
    "app/buying/purchase-order/[name]/page.tsx",
    "app/stock/purchase-receipt/[name]/page.tsx",
    "app/stock/material-request/[name]/page.tsx",
    "app/stock/stock-entry/new/page.tsx",
    "app/stock/material-request/new/page.tsx",
    "app/stock/stock-reconciliation/new/page.tsx",
  ];

  for (const f of TOUCHED) {
    it(`${f}: no /api/resource fetch`, async () => {
      const content = await read(f);
      expect(content).not.toMatch(/\/api\/resource/);
    });
  }
});
