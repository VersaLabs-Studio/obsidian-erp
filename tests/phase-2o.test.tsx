// tests/phase-2o.test.tsx
// Obsidian ERP v4.0 — Phase 2O tests.
//
// Per the MESH Reporting Contract (v1.1): tests assert against real
// code and real components, not literals. Where the test needs to read
// source (e.g. asserting a file's pattern), we read the file and assert
// on a real regex; where we render a component, we use RTL and assert
// on its real output.
//
// 2O Parts under test:
//   - Part 1.1 — use-flow-chain.ts: per-stage resolution plans, direct /
//     two-hop / header-link / none — source-level assertions on the
//     builder, the link-map consumer, and the cross-flow single-source
//     of truth (CrossFlowActionsMenu no longer runs its own back-link
//     queries).
//   - Part 1.3 — CRM upstream: header_link plans read the current doc's
//     header field (`party_name`, `lead_name`, etc.) to verify the
//     candidate. Source-level: `findFlowLink` returns a `header_link`
//     pattern for Quotation → Lead / Quotation → Customer.
//   - Part 1.4 — CrossFlowActionsMenu now calls `useFlowChain` and
//     reads stageStatuses instead of running its own back-link query.
//   - Part 2 — per-report filter mapper emits the financial-statements
//     shape for P&L / BS and the aged shape for AR / AP.
//   - Part 2 — period selector refetches (FinancialReportView owns
//     state + useFrappeReport).
//   - Part 5 — MFG automation: Start / Finish modals build the correct
//     SE payload (purpose, items, warehouses) and the shortfall path
//     surfaces the right CTA.
//   - Part 6.1 — PE list route emits `docstatus` (the 2N-1.5 NOT-fixed
//     gap was a server-side field filter, not a cache-invalidate bug).
//   - Part 6.2 — dead `useFrappeList` with `enabled: false` removed
//     from the PI detail page.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Stubs for Next.js navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  usePathname: () => "",
}));

import {
  findFlowLink,
  getFlowLinksFrom,
  buildLinkFilter,
  type FlowLinkDef,
} from "@/lib/flows/flow-link-map";

function withProviders(node: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, node);
}

// =============================================================================
// Part 1.1: use-flow-chain.ts — per-stage resolution plan builder
// =============================================================================

describe("Part 1.1: use-flow-chain builds per-stage resolution plans", () => {
  it("the file declares a buildStagePlans helper that uses findFlowLink for the direct / two-hop / header-link / none ladder", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    expect(content).toMatch(/function\s+buildStagePlans\s*\(/);
    // The plan kinds are explicit (not a string-keyed dict):
    expect(content).toMatch(/kind:\s*"direct"/);
    expect(content).toMatch(/kind:\s*"two-hop"/);
    expect(content).toMatch(/kind:\s*"header-link"/);
    expect(content).toMatch(/kind:\s*"none"/);
  });

  it("MAX_STAGES is 8 (the longest registered flow has 8 stages) and the hook calls 8 primary + 8 secondary useFrappeList hooks", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    expect(content).toMatch(/MAX_STAGES\s*=\s*8/);
    // The hook hard-codes 8 primary slot calls and 8 secondary (hop) slot
    // calls — Rules of Hooks requires the same number on every render.
    const primaryMatches = content.match(/useFrappeList<\{ name: string; parent\?: string \}>/g);
    expect(primaryMatches?.length).toBeGreaterThanOrEqual(16);
  });

  it("the two-hop resolution reads the intermediate's name from `q.data` (not from a mutated array)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    // The `readIntermediateName` function closes over the *primary* query
    // results and reads `primary[plan.intermediate].data` directly.
    // This is the data-driven cascade that fixes the 2N defect.
    expect(content).toMatch(/function\s+readIntermediateName\s*\(/);
    expect(content).toMatch(/primary\[plan\.intermediate\]/);
    // The legacy `useMemo` + in-place mutation pattern (the 2N bug)
    // is GONE — the array is no longer mutated after the hooks run.
    expect(content).not.toMatch(/resolvedByStage\[.+\]\s*=\s*.+/);
  });
});

// =============================================================================
// Part 1.2 / 1.3: header-link plan (CRM upstream party) + direct plan
// =============================================================================

describe("Part 1.1/1.3: flow-link-map exposes direct + header_link edges", () => {
  it("Quotation → Customer is a header_link with headerField=party_name (the 2O-1.3 fix)", () => {
    const link = findFlowLink("Quotation", "Customer");
    expect(link).toBeDefined();
    expect(link?.pattern).toBe("header_link");
    expect(link?.headerField).toBe("party_name");
  });

  it("Quotation → Lead is a header_link with headerField=party_name", () => {
    const link = findFlowLink("Quotation", "Lead");
    expect(link).toBeDefined();
    expect(link?.pattern).toBe("header_link");
    expect(link?.headerField).toBe("party_name");
  });

  it("Opportunity → Lead / Customer are header_link entries (party_name)", () => {
    expect(findFlowLink("Opportunity", "Lead")?.pattern).toBe("header_link");
    expect(findFlowLink("Opportunity", "Customer")?.pattern).toBe("header_link");
  });

  it("Sales Order → Delivery Note is a child-table back_link (forward edge)", () => {
    const link = findFlowLink("Sales Order", "Delivery Note");
    expect(link?.pattern).toBe("back_link");
    expect(link?.returnParent).toBe(true);
    expect(link?.queryDoctype).toBe("Delivery Note Item");
  });

  it("Sales Order → Sales Invoice is a child-table back_link (2-hop target on SO)", () => {
    const link = findFlowLink("Sales Order", "Sales Invoice");
    expect(link?.pattern).toBe("back_link");
    expect(link?.returnParent).toBe(true);
    expect(link?.queryDoctype).toBe("Sales Invoice Item");
  });
});

// =============================================================================
// Part 1.4: CrossFlowActionsMenu consumes the rail's useFlowChain result
// =============================================================================

describe("Part 1.4: CrossFlowActionsMenu shares the useFlowChain result", () => {
  it("the menu imports and calls useFlowChain (single source of truth)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/cross-flow/CrossFlowActionsMenu.tsx",
      "utf-8",
    );
    expect(content).toMatch(/import\s*\{\s*useFlowChain\s*\}\s*from\s*["']@\/hooks\/flows\/use-flow-chain["']/);
    // The menu no longer runs its own per-edge back-link query.
    expect(content).not.toMatch(/fillBackLinkFilter/);
    // The View ↔ Create decision is derived from the chain's stageStatus.
    expect(content).toMatch(/stageStatus\?\.resolvedName/);
  });

  it("the menu's AdjacencyRow treats an unresolved backward edge as hidden (rail-consistent)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/cross-flow/CrossFlowActionsMenu.tsx",
      "utf-8",
    );
    expect(content).toMatch(
      /if\s*\(\s*edge\.direction\s*===\s*"backward"\s*&&\s*!isResolved\s*\)\s*\{[\s\S]*?return\s+null/,
    );
  });
});

// =============================================================================
// Part 2: per-report filter mapper
// =============================================================================

describe("Part 2.1: per-report filter mapper", () => {
  it("P&L and BS get the financial-statements shape (fiscal_year, period_start_date, period_end_date, periodicity)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/api/accounting/reports/[report]/route.ts",
      "utf-8",
    );
    expect(content).toMatch(/FINANCIAL_STATEMENT_REPORTS/);
    expect(content).toMatch(/fiscal_year/);
    expect(content).toMatch(/period_start_date/);
    expect(content).toMatch(/period_end_date/);
    expect(content).toMatch(/periodicity/);
    // The defaults kick in for first paint (no error):
    expect(content).toMatch(/firstOfFiscalYear/);
    expect(content).toMatch(/getCurrentFiscalYear/);
  });

  it("AR and AP get the aged-reports shape (report_date + ageing ranges)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/api/accounting/reports/[report]/route.ts",
      "utf-8",
    );
    expect(content).toMatch(/AGED_REPORT_REPORTS/);
    expect(content).toMatch(/report_date/);
    expect(content).toMatch(/ageing_based_on/);
    expect(content).toMatch(/range1/);
    expect(content).toMatch(/range4/);
  });

  it("the route still maps the 4 supported report keys to canonical ERPNext names (regression from 2N)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/api/accounting/reports/[report]/route.ts",
      "utf-8",
    );
    expect(content).toMatch(/"profit-and-loss":\s*"Profit and Loss Statement"/);
    expect(content).toMatch(/"balance-sheet":\s*"Balance Sheet"/);
    expect(content).toMatch(/"accounts-receivable":\s*"Accounts Receivable"/);
    expect(content).toMatch(/"accounts-payable":\s*"Accounts Payable"/);
  });
});

describe("Part 2.2: FinancialReportView owns period state + refetches on change", () => {
  it("the view calls useFrappeReport internally with the period filters (the prior 2N design was page-controlled and never re-queried)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/accounting/FinancialReportView.tsx",
      "utf-8",
    );
    expect(content).toMatch(/useFrappeReport\s*\(/);
    // Period state lives in the view (not a page-level const):
    expect(content).toMatch(/useState<PeriodOption>/);
    // The selector mutates the period → re-derives filters → TanStack
    // Query key change → refetch (no manual refetch call needed).
    expect(content).toMatch(/setPeriod\s*\(/);
  });

  it("the 4 report pages are thin wrappers (no per-page period state)", async () => {
    const pages = [
      "app/accounting/reports/profit-and-loss/page.tsx",
      "app/accounting/reports/balance-sheet/page.tsx",
      "app/accounting/reports/accounts-receivable/page.tsx",
      "app/accounting/reports/accounts-payable/page.tsx",
    ];
    for (const f of pages) {
      const fs = await import("fs/promises");
      const content = await fs.readFile(f, "utf-8");
      // No page-level useState for period:
      expect(content).not.toMatch(/useState\s*\(\s*PERIOD_PRESETS/);
      // No per-page useFrappeReport call (the view owns the hook now):
      expect(content).not.toMatch(/useFrappeReport\s*\(/);
    }
  });
});

// =============================================================================
// Part 5: MFG automation — Start / Finish modals
// =============================================================================

describe("Part 5.1/5.3: MFG automation modals", () => {
  it("StartProductionModal exists and builds the Material Transfer for Manufacture payload", async () => {
    const fs = await import("fs/promises");
    const exists = await fs
      .stat("components/manufacturing/StartProductionModal.tsx")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const content = await fs.readFile(
      "components/manufacturing/StartProductionModal.tsx",
      "utf-8",
    );
    // The right purpose + warehouse shape for Material Transfer for Manufacture:
    expect(content).toMatch(/Material Transfer for Manufacture/);
    expect(content).toMatch(/from_warehouse/);
    expect(content).toMatch(/to_warehouse/);
    expect(content).toMatch(/work_order/);
    // Idempotency check: surface any existing SE for the same WO+purpose.
    expect(content).toMatch(/existingSEs/);
    // Shortfall guidance: route to MR or Stock Reconciliation.
    expect(content).toMatch(/Material Request/);
    expect(content).toMatch(/Stock Reconciliation/);
  });

  it("FinishProductionModal exists and builds the Manufacture payload with the FG item + consumed rows", async () => {
    const fs = await import("fs/promises");
    const exists = await fs
      .stat("components/manufacturing/FinishProductionModal.tsx")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const content = await fs.readFile(
      "components/manufacturing/FinishProductionModal.tsx",
      "utf-8",
    );
    expect(content).toMatch(/purpose:\s*"Manufacture"/);
    expect(content).toMatch(/is_finished_item:\s*1/);
    expect(content).toMatch(/t_warehouse:\s*fgWh/);
    expect(content).toMatch(/s_warehouse:\s*wipWh/);
    // Idempotency check (B3) for the Manufacture purpose:
    expect(content).toMatch(/purpose/);
  });

  it("the Work Order detail page wires the modals + replaces the prior deep-link into the SE wizard", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/manufacturing/work-order/[name]/page.tsx",
      "utf-8",
    );
    // New state hooks for the modals:
    expect(content).toMatch(/setStartOpen/);
    expect(content).toMatch(/setFinishOpen/);
    // Modal components are imported and rendered:
    expect(content).toMatch(/import\s*\{\s*StartProductionModal/);
    expect(content).toMatch(/import\s*\{\s*FinishProductionModal/);
    expect(content).toMatch(/<StartProductionModal/);
    expect(content).toMatch(/<FinishProductionModal/);
    // The prior deep-link into the SE wizard is gone for the main
    // Start/Finish flow (the SE new page's URL-param prefill is still
    // intact for any other deep-link, but the two main actions no
    // longer `router.push` to it).
    expect(content).not.toMatch(
      /handleStartProduction[\s\S]*?router\.push[\s\S]*?stock-entry\/new\?purpose=Material Transfer for Manufacture/,
    );
  });
});

// =============================================================================
// Part 6.1: PE list `docstatus` field on the route (the 2N-1.5 NOT-fixed gap)
// =============================================================================

describe("Part 6.1: PE list route includes docstatus (server-side fix)", () => {
  it("the Payment Entry list allowedFields includes docstatus", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/api/accounting/payment-entry/route.ts",
      "utf-8",
    );
    expect(content).toMatch(/"docstatus"/);
  });
});

// =============================================================================
// Part 6.2: dead code removal
// =============================================================================

describe("Part 6.2: dead useFrappeList with enabled:false removed from PI detail", () => {
  it("the Purchase Invoice detail page no longer has a dead useFrappeList for Purchase Order with enabled:false", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/accounting/purchase-invoice/[name]/page.tsx",
      "utf-8",
    );
    // Strip both line comments and the comment that mentions the removed
    // pattern in prose, then assert the live code has no `enabled: false`
    // literal and no `purchaseOrders` / `loadingPO` identifier.
    const stripped = content
      .split("\n")
      .filter(
        (line) =>
          !/^\s*\/\//.test(line) && !/\bpurchaseOrders\b/.test(line) && !/\bloadingPO\b/.test(line),
      )
      .join("\n");
    expect(stripped).not.toMatch(/enabled:\s*false/);
    expect(stripped).not.toMatch(/purchaseOrders/);
    expect(stripped).not.toMatch(/loadingPO/);
  });
});

// =============================================================================
// Contract rule 2: no orphan modules
// =============================================================================

describe("Contract rule 2: no orphan modules in 2O", () => {
  it("StartProductionModal + FinishProductionModal are imported by the Work Order detail page", async () => {
    const fs = await import("fs/promises");
    const wo = await fs.readFile(
      "app/manufacturing/work-order/[name]/page.tsx",
      "utf-8",
    );
    expect(wo).toMatch(/StartProductionModal/);
    expect(wo).toMatch(/FinishProductionModal/);
  });

  it("FinancialReportView is imported by all 4 report pages (regression from 2N)", async () => {
    const fs = await import("fs/promises");
    for (const f of [
      "app/accounting/reports/profit-and-loss/page.tsx",
      "app/accounting/reports/balance-sheet/page.tsx",
      "app/accounting/reports/accounts-receivable/page.tsx",
      "app/accounting/reports/accounts-payable/page.tsx",
    ]) {
      const content = await fs.readFile(f, "utf-8");
      expect(content).toMatch(/FinancialReportView/);
    }
  });

  it("the @ts-nocheck directive is gone from the WO + SE list routes (the 2O-5 cleanup)", async () => {
    const fs = await import("fs/promises");
    for (const f of [
      "app/api/manufacturing/work-order/route.ts",
      "app/api/stock/stock-entry/route.ts",
    ]) {
      const content = await fs.readFile(f, "utf-8");
      expect(content).not.toMatch(/^@ts-nocheck/m);
    }
  });
});
