// tests/v4-1-1-loosen.test.ts
// Version 4.1.1 — "Loosen & Complete" round.
// File-content assertions pinning the architectural changes from this round:
//   D1 — payment-defaults lib (no frappeClient import), route, settings page
//   G1 — allow_negative_stock persisted on Stock Settings single
//   E1 — Adjust Stock inline dialog replaces deep-link in Item hub
//   E2/E3 — WO detail Start button, WO card Start/Finish + bulk bar
//   F1 — happy-path actions fire directly (no confirm* gating); Cancel/Delete
//        still routed through ConfirmDialog (destructive)
//   G2 — create-form validators relaxed to company/party + ≥1 line only
//   Architecture guardrails enforced throughout

import { describe, it, expect } from "vitest";

const read = async (path: string) => {
  const fs = await import("fs/promises");
  return fs.readFile(path, "utf-8");
};

// ============================================================================
// D1 — Payment Defaults (lib + route + settings page)
// ============================================================================

describe("D1: Payment Defaults", () => {
  it("lib does NOT import server-only frappeClient (boundary fix)", async () => {
    const content = await read(
      "lib/accounting/payment-defaults.ts",
    );
    expect(content).not.toMatch(/from ["']@\/lib\/frappe-client["']/);
  });

  it("lib exposes usePaymentDefaults hook + fetch/PUT wrapper", async () => {
    const content = await read(
      "lib/accounting/payment-defaults.ts",
    );
    expect(content).toMatch(/usePaymentDefaults/);
    expect(content).toMatch(/useMutation/);
  });

  it("route uses getRequestClient fail-closed 401", async () => {
    const content = await read(
      "app/api/accounting/settings/payment-defaults/route.ts",
    );
    expect(content).toMatch(/getRequestClient\(request\)/);
    expect(content).toMatch(/statusCode.*401/);
  });

  it("route reads/writes custom_default_mode_of_payment on Accounts Settings", async () => {
    const content = await read(
      "app/api/accounting/settings/payment-defaults/route.ts",
    );
    expect(content).toMatch(/custom_default_mode_of_payment/);
    expect(content).toMatch(/Accounts Settings/);
  });

  it("settings page exists and mirrors warehouse-defaults pattern", async () => {
    const content = await read(
      "app/accounting/settings/payment-defaults/page.tsx",
    );
    expect(content).toContain("PaymentDefaults");
    expect(content).toContain("usePaymentDefaults");
    expect(content).toContain("useUpdatePaymentDefaults");
  });

  it("payment/quick route reads configured default before falling back to Cash", async () => {
    const content = await read(
      "app/api/accounting/payment/quick/route.ts",
    );
    // Should reference the saved default or Accounts Settings lookup
    expect(
      content.includes("Accounts Settings") ||
        content.includes("defaultModeOfPayment"),
    ).toBe(true);
    // Must still have "Cash" as the ultimate fallback
    expect(content).toContain('"Cash"');
  });
});

// ============================================================================
// G1 — Allow Negative Stock
// ============================================================================

describe("G1: Allow Negative Stock", () => {
  it("warehouse-defaults route reads/writes allow_negative_stock on Stock Settings", async () => {
    const content = await read(
      "app/api/stock/settings/warehouse-defaults/route.ts",
    );
    expect(content).toContain("allow_negative_stock");
  });

  it("warehouse-defaults page has an allow_negative_stock toggle", async () => {
    const content = await read(
      "app/stock/settings/warehouse-defaults/page.tsx",
    );
    expect(content).toContain("allowNegativeStock");
  });
});

// ============================================================================
// E1 — Adjust Stock inline dialog on Item hub
// ============================================================================

describe("E1: Adjust Stock inline dialog", () => {
  it("adjust route exists and is user-scoped/fail-closed", async () => {
    const content = await read(
      "app/api/stock/item/[name]/adjust/route.ts",
    );
    expect(content).toMatch(/getRequestClient\(request\)/);
    expect(content).toMatch(/statusCode.*401/);
  });

  it("adjust route builds a Stock Reconciliation via frappe.client.submit", async () => {
    const content = await read(
      "app/api/stock/item/[name]/adjust/route.ts",
    );
    expect(content).toContain('"Stock Reconciliation"');
    expect(content).toContain("frappe.client.submit");
  });

  it("Item hub no longer has stock-reconciliation/new deep-links (removed)", async () => {
    const content = await read(
      "app/stock/item/[name]/page.tsx",
    );
    // The three original deep-links should be gone
    expect(content).not.toContain('/stock/stock-reconciliation/new?item_code=');
  });

  it("Item hub has an Adjust Stock inline dialog (ConfirmDialog)", async () => {
    const content = await read(
      "app/stock/item/[name]/page.tsx",
    );
    expect(content).toMatch(/showAdjustDialog/);
    expect(content).toMatch(/handleAdjustSubmit/);
    expect(content).toContain("Adjust Stock");
  });
});

// ============================================================================
// E2 — WO detail Start button
// ============================================================================

describe("E2: WO detail Start button", () => {
  it("WO detail page has a direct start handler (not modal-only)", async () => {
    const content = await read(
      "app/manufacturing/work-order/[name]/page.tsx",
    );
    expect(content).toContain("/start");
    expect(content).toContain("handleDirectStart");
  });

  it("WO detail whatsNext includes primary Start action when Not Started", async () => {
    const content = await read(
      "app/manufacturing/work-order/[name]/page.tsx",
    );
    expect(content).toContain("Start Production");
  });

  it("WO detail header has a direct Start button", async () => {
    const content = await read(
      "app/manufacturing/work-order/[name]/page.tsx",
    );
    // Button text "Start" or handleDirectStart usage near header
    expect(content).toContain("handleDirectStart");
  });
});

// ============================================================================
// E3 — WO card Start/Finish + bulk bar
// ============================================================================

describe("E3: WO card + bulk operations", () => {
  it("WorkOrderCard accepts onStart/onFinish callbacks", async () => {
    const content = await read(
      "app/manufacturing/work-order/page.tsx",
    );
    expect(content).toMatch(/onStart.*?:/);
    expect(content).toMatch(/onFinish.*?:/);
  });

  it("WO card footer shows Start button for Not Started WOs", async () => {
    const content = await read(
      "app/manufacturing/work-order/page.tsx",
    );
    expect(content).toContain('displayStatus === "Not Started"');
    expect(content).toContain('onStart && ');
  });

  it("Bulk selection state + Start/Finish Selected bar exist", async () => {
    const content = await read(
      "app/manufacturing/work-order/page.tsx",
    );
    expect(content).toContain("selectedWos");
    // 5.2-A — handleBulkStartAll generalized to handleBulkRun("start" |
    // "finish"); the card Finish is now a real /complete call, not a stub.
    expect(content).toContain("handleBulkRun");
    expect(content).toContain("Start Selected");
    expect(content).toContain("Finish Selected");
    expect(content).toContain("/complete");
  });
});

// ============================================================================
// F1 — Drop confirm gating on happy-path actions
// ============================================================================

function expectDirectFire(content: string, label: string) {
  // Happy-path actions should fire handlers directly, not via setConfirm*
  // The handler name appears onClick without a confirm* setter
  expect(content).not.toMatch(new RegExp(`setConfirm(Submit|Paid|Bill|Order|Fulfill).*true\\)`));
}

function expectDestroyerUsesConfirm(content: string, actionName: string) {
  // Cancel, Delete, Reject must still route through ConfirmDialog
  expect(content).toContain(`setConfirm${actionName}`);
  expect(content).toContain(`confirm${actionName}`);
}

describe("F1: Direct-fire happy-path, ConfirmDialog retains destruction", () => {
  const PAGES = [
    { path: "app/buying/purchase-order/[name]/page.tsx", actions: ["Submit", "Approve"] },
    { path: "app/stock/purchase-receipt/[name]/page.tsx", actions: ["Submit", "Bill"] },
    { path: "app/stock/material-request/[name]/page.tsx", actions: ["Submit", "Order"] },
    {
      path: "app/accounting/purchase-invoice/[name]/page.tsx",
      actions: ["Submit", "Mark"],
    },
    {
      path: "app/accounting/sales-invoice/[name]/page.tsx",
      actions: ["Submit", "Mark"],
    },
    { path: "app/sales/sales-order/[name]/page.tsx", actions: ["Submit", "Fulfill"] },
    { path: "app/manufacturing/work-order/[name]/page.tsx", actions: ["Submit"] },
  ];

  for (const { path, actions } of PAGES) {
    it(`${path}: happy-path actions fire directly (no confirm gating)`, async () => {
      const content = await read(path);
      // After F1, Submit/Bill/Paid/Order/Fulfill calls should call handlers, not setConfirmX(true)
      // 4.1-C3 — EXCEPTION: the Purchase Order page's Submit deliberately
      // routes through a confirmation dialog (loading-modal parity with the
      // SO cockpit, per product feedback). Approve/Reject no longer exist on
      // that page (dead statuses removed).
      for (const label of actions) {
        if (
          path === "app/buying/purchase-order/[name]/page.tsx" &&
          label === "Submit"
        ) {
          expect(content).toContain("setConfirmSubmit(true)");
          continue;
        }
        expect(content).not.toMatch(new RegExp(`setConfirm(${label})\\(true\\)`));
      }
      // But Cancel/Reject/Delete still gated
      expectDestroyerUsesConfirm(content, "Cancel");
      expectDestroyerUsesConfirm(content, "Delete");
    });
  }
});

// ============================================================================
// G2: Relaxed validators — only company/party + ≥1 item required
// ============================================================================

describe("G2: Relaxed create-form validators", () => {
  it("Sales Order step2 rate is optional", async () => {
    const content = await read("lib/flows/flow-validation.ts");
    expect(content).toMatch(/rate:\s*z\.number\(\)\.optional\(\)/);
  });

  it("Delivery Note step2 warehouse is optional", async () => {
    const content = await read("lib/flows/flow-validation.ts");
    // Capture the DN step2 BLOCK (schema name → the step2 object's closing
    // brace at the next top-level "\n  },"), then assert warehouse sits in
    // it as optional. 4.1-C2 — the schema keys are canonical step1/step2/
    // step3 again, so anchor on "step2:" and scan its own body.
    const dnMatch = content.match(
      /deliveryNoteStepSchemas[\s\S]*?step2:\s*z\.object\(\{([\s\S]*?)\n  \}\),/,
    );
    expect(dnMatch).not.toBeNull();
    const step2 = dnMatch![1];
    expect(step2).toMatch(/warehouse:\s*z\.string\(\)\.optional\(\)/);
  });

  it("Purchase Invoice credit_to is optional at wizard gate", async () => {
    const content = await read("lib/flows/flow-validation.ts");
    expect(content).toMatch(/credit_to.*optional/);
  });

  it("Sales Invoice due_date is optional at wizard gate", async () => {
    const content = await read("lib/flows/flow-validation.ts");
    expect(content).toMatch(/due_date.*optional/);
  });
});
