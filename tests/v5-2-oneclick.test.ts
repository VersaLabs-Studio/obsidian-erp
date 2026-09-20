// tests/v5-2-oneclick.test.ts
// Version 5.2-A — "One-Click Completion": finishes the 4.1.1 deferred queue.
// File-content assertions (the repo's established style) pinning architecture:
//   D1-finish — configured Default Mode of Payment reaches SI/PI + settings hub
//   E3-finish — WO-list inline/bulk Finish is a real /complete call
//   Run Job   — JC auto-run (route action + hook + all three surfaces)
//   Quick Item— 1-field fast path (route + list dialog)
//   Shortfall — auto-PO route (supplier groups, schedule_date, guided 422)
//   SE→DN     — WO detail Deliver & Invoice handoff to the SO cockpit
//   Guardrails— fail-closed user clients, no bespoke /api/resource calls

import { describe, it, expect } from "vitest";

const read = async (path: string) => {
  const fs = await import("fs/promises");
  return fs.readFile(path, "utf-8");
};

const TOUCHED = [
  "app/api/manufacturing/job-card/[name]/lifecycle/route.ts",
  "app/api/stock/item/quick/route.ts",
  "app/api/buying/purchase-order/shortfall/route.ts",
  "app/api/accounting/settings/payment-defaults/route.ts",
  "hooks/manufacturing/use-job-card-lifecycle.ts",
  "app/manufacturing/job-card/[name]/page.tsx",
  "app/manufacturing/work-order/[name]/page.tsx",
  "app/manufacturing/work-order/page.tsx",
  "app/sales/sales-order/[name]/page.tsx",
  "app/stock/item/page.tsx",
  "components/manufacturing/StartProductionModal.tsx",
  "app/accounting/sales-invoice/[name]/page.tsx",
  "app/accounting/purchase-invoice/[name]/page.tsx",
  "app/accounting/settings/page.tsx",
];

describe("5.2-A: guardrails", () => {
  for (const path of TOUCHED) {
    it(`${path}: no raw /api/resource escape hatches`, async () => {
      const content = await read(path);
      expect(content).not.toMatch(/["'`]\/api\/resource/);
    });
  }
});

// ============================================================================
// D1-finish — the configured default actually reaches the operator
// ============================================================================

describe("D1-finish: Default Mode of Payment wiring", () => {
  it("payment-defaults route self-provisions the custom field (PUT ensures before write)", async () => {
    const content = await read(
      "app/api/accounting/settings/payment-defaults/route.ts",
    );
    expect(content).toContain("ensureModeOfPaymentField");
    expect(content).toContain("Custom Field");
    expect(content).toContain("custom_default_mode_of_payment");
  });

  it("settings hub links the Payment Defaults page (was orphaned)", async () => {
    const content = await read("app/accounting/settings/page.tsx");
    expect(content).toContain("/accounting/settings/payment-defaults");
    expect(content).toContain("Payment Defaults");
  });

  for (const page of [
    "app/accounting/sales-invoice/[name]/page.tsx",
    "app/accounting/purchase-invoice/[name]/page.tsx",
  ]) {
    it(`${page}: payMode hydrates from usePaymentDefaults, not a hardcoded Cash`, async () => {
      const content = await read(page);
      expect(content).toContain("usePaymentDefaults");
      expect(content).toContain('useState("")');
      expect(content).not.toContain('useState("Cash")');
      // The select shows the configured default as its placeholder.
      expect(content).toContain("defaultModeOfPayment");
    });
  }
});

// ============================================================================
// E3-finish — WO list Finish is real
// ============================================================================

describe("E3-finish: WO-list inline + bulk Finish", () => {
  const page = "app/manufacturing/work-order/page.tsx";

  it("card Finish posts /complete (the canonical Manufacture SE route), not a stub toast", async () => {
    const content = await read(page);
    expect(content).toContain("runWoAction");
    expect(content).toContain('action === "start" ? "start" : "complete"');
    // eslint-disable-next-line no-template-curly-in-string
    expect(content).toContain("/${endpoint}");
    expect(content).not.toContain("from its detail page");
  });

  it("bulk bar carries Start Selected AND Finish Selected via handleBulkRun", async () => {
    const content = await read(page);
    expect(content).toContain("handleBulkRun");
    expect(content).toContain("Finish Selected");
    expect(content).toContain("Start Selected");
  });

  it("bulk run filters by live status (Not Started / In Process)", async () => {
    const content = await read(page);
    expect(content).toContain('"Not Started"');
    expect(content).toContain('"In Process"');
  });

  it("inline card action has a per-WO busy spinner state", async () => {
    const content = await read(page);
    expect(content).toContain("woAction");
    expect(content).toContain("actionBusy");
  });
});

// ============================================================================
// Run Job — JC auto-run
// ============================================================================

describe("5.2-A: Job Card auto-run (`run`)", () => {
  it("lifecycle route: run action parses, guards (409 done / 412 employee), completes", async () => {
    const content = await read(
      "app/api/manufacturing/job-card/[name]/lifecycle/route.ts",
    );
    expect(content).toContain(`"start" | "complete" | "run" | "assign_employee"`);
    // Re-running an already-submitted JC is an idempotent success, not an error.
    expect(content).toContain("is already completed");
    expect(content).toContain("Assign an employee before running");
    expect(content).toContain('action === "complete" || action === "run"');
    // The appended closed log spans a minute (from_time must precede to_time).
    expect(content).toContain("startedAt");
  });

  it("hook exposes handleRunJob for every surface", async () => {
    const content = await read("hooks/manufacturing/use-job-card-lifecycle.ts");
    expect(content).toContain("handleRunJob");
    expect(content).toContain('lifecycle(jc, "run")');
  });

  it("JC detail page: Run Job primary + Start secondary, one shared runner", async () => {
    const content = await read("app/manufacturing/job-card/[name]/page.tsx");
    expect(content).toContain("runLifecycle");
    expect(content).toContain("Run Job");
    expect(content).toContain(`body: JSON.stringify({ action })`);
  });

  it("WO detail JC table row fires handleRunJob", async () => {
    const content = await read("app/manufacturing/work-order/[name]/page.tsx");
    expect(content).toContain("lifecycle.handleRunJob(doc)");
  });

  it("SO cockpit JC rows fire handleRunJob", async () => {
    const content = await read("app/sales/sales-order/[name]/page.tsx");
    expect(content).toContain("lifecycle.handleRunJob(doc)");
  });
});

// ============================================================================
// Quick Item
// ============================================================================

describe("5.2-A: Quick Item 1-field fast path", () => {
  it("route: fail-closed user client + Zod name + idempotent + frappe.client.insert", async () => {
    const content = await read("app/api/stock/item/quick/route.ts");
    expect(content).toMatch(/getRequestClient\(request\)/);
    expect(content).toMatch(/statusCode.*401/);
    expect(content).toContain("z.object");
    expect(content).toContain("item_name");
    expect(content).toContain("frappe.client.insert");
    // Services are non-stock (the one inference that keeps ERPNext consistent).
    expect(content).toContain('"Services"');
  });

  it("item list page: Quick Item dialog posts the route", async () => {
    const content = await read("app/stock/item/page.tsx");
    expect(content).toContain("/api/stock/item/quick");
    expect(content).toContain("Quick Item");
    expect(content).toContain("handleQuickCreate");
  });
});

// ============================================================================
// Shortfall auto-PO
// ============================================================================

describe("5.2-A: Shortfall auto-PO", () => {
  const route = "app/api/buying/purchase-order/shortfall/route.ts";

  it("route: fail-closed user client + positive-qty Zod", async () => {
    const content = await read(route);
    expect(content).toMatch(/getRequestClient\(request\)/);
    expect(content).toMatch(/statusCode.*401/);
    expect(content).toContain("z.number().positive()");
  });

  it("route: default supplier from item_defaults (company row, any-company fallback)", async () => {
    const content = await read(route);
    expect(content).toContain("item_defaults");
    expect(content).toContain("default_supplier");
    expect(content).toContain("SupplierRequired");
  });

  it("route: schedule_date backfill + warehouse from Stock Settings + partial-failure list", async () => {
    const content = await read(route);
    expect(content).toContain("schedule_date");
    expect(content).toContain("default_warehouse");
    expect(content).toContain("purchase_orders: created");
  });

  it("StartProductionModal: Order Shortfall (auto) is primary; MR deep-link gone; wizard kept as advanced", async () => {
    const content = await read("components/manufacturing/StartProductionModal.tsx");
    expect(content).toContain("/api/buying/purchase-order/shortfall");
    expect(content).toContain("Order Shortfall (auto)");
    expect(content).toContain("PO wizard (advanced)");
    expect(content).not.toContain("/stock/material-request/new");
  });
});

// ============================================================================
// SE→DN (minimal honest scope: WO → SO cockpit handoff)
// ============================================================================

describe("5.2-A: WO detail Deliver & Invoice handoff", () => {
  it("Completed WO with a linked SO offers Deliver & Invoice → the cockpit", async () => {
    const content = await read("app/manufacturing/work-order/[name]/page.tsx");
    expect(content).toContain("Deliver & Invoice");
    expect(content).toContain("wo.sales_order");
    expect(content).toContain("/sales/sales-order/");
  });
});
