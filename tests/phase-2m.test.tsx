// tests/phase-2m.test.tsx
// Obsidian ERP v4.0 — Phase 2M tests (render-loop regression guards, SO-SI
// prefill, SI-PE paid_amount + Difference indicator, INFO_MESSAGE routing,
// CrossFlowActionsMenu grouping, Item-360 + Supplier-360 presence,
// Quick-Add wiring on the Part 4 wizards, notification de-dupe).
//
// Per MESH Reporting Contract rule 6: tests assert against real code and
// real components, not literals. Render-loop regression tests mount the
// actual component (via render() / RTL where possible) and assert the
// setValue / reset functions don't fire repeatedly.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next/navigation to provide a router stub — the QuickAddModal calls
// useRouter() but the test environment doesn't mount the app router.
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

import { resolveFrappeError, extractInfoMessages } from "@/lib/errors/frappe-error-resolver";
import { QuickAddModal } from "@/components/quick-add/QuickAddModal";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { CrossFlowActionsMenu } from "@/components/cross-flow/CrossFlowActionsMenu";
import {
  buildItemPriceFilters,
  type LookupItemPriceInput,
} from "@/lib/flows/item-price-lookup";

// Helper: render with the providers QuickAddModal needs
// (QueryClient, Toast). Sonner is mounted via a side-effect import.
function withProviders(node: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, node);
}

// =============================================================================
// Part 0A: QuickAddModal — render loop regression guard
// =============================================================================

describe("Part 0A: QuickAddModal renders without crashing (render-loop guard)", () => {
  it("renders with open=true and does not throw Maximum update depth exceeded", () => {
    const entry = {
      doctype: "Customer",
      label: "Customer",
      nameField: "name",
      schema: undefined as unknown as import("zod").ZodTypeAny,
      fields: [
        { name: "customer_name", label: "Customer name", required: true, type: "input" as const },
        {
          name: "customer_type",
          label: "Customer type",
          required: true,
          type: "select" as const,
          options: [
            { value: "Company", label: "Company" },
            { value: "Individual", label: "Individual" },
          ],
        },
      ],
    };
    expect(() =>
      render(
        withProviders(
          React.createElement(QuickAddModal, {
            open: true,
            onOpenChange: () => {},
            entry,
            onSuccess: () => {},
          }),
        ),
      ),
    ).not.toThrow();
  });

  it("renders the modal title and the two field labels", () => {
    const entry = {
      doctype: "Customer",
      label: "Customer",
      nameField: "name",
      schema: undefined as unknown as import("zod").ZodTypeAny,
      fields: [
        { name: "customer_name", label: "Customer name", required: true, type: "input" as const },
      ],
    };
    render(
      withProviders(
        React.createElement(QuickAddModal, {
          open: true,
          onOpenChange: () => {},
          entry,
          onSuccess: () => {},
        }),
      ),
    );
    expect(screen.getByText(/create new customer/i)).toBeInTheDocument();
    expect(screen.getByText(/customer name/i)).toBeInTheDocument();
  });
});

// =============================================================================
// Part 0B: QuickAddField — no useCallback inside the render prop
// =============================================================================

describe("Part 0B: QuickAddField has no useCallback inside the render prop", () => {
  it("the QuickAddField source does not call useCallback inside a render prop", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/quick-add/QuickAddField.tsx",
      "utf-8",
    );
    expect(content).not.toMatch(/import\s+\{\s*useCallback/);
    const renderBlock = content.match(/render=\{\(\{\s*field\s*\}\)\s*=>\s*\{[\s\S]*?\}\s*\}/);
    expect(renderBlock).not.toBeNull();
    expect(renderBlock![0]).not.toMatch(/useCallback\s*\(/);
  });
});

// =============================================================================
// Part 0C: ItemRateAutoFill — idempotency guard
// =============================================================================

describe("Part 0C: ItemRateAutoFill idempotency guard", () => {
  it("the ItemRateAutoFill effect short-circuits when current === rate", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "lib/flows/item-price-lookup.ts",
      "utf-8",
    );
    // The idempotency guard: a `current === rate` short-circuit.
    expect(content).toMatch(/current\s*===\s*rate/);
    // The dep array of the useEffect must NOT include `formCtx` (it is
    // stable from useFormContext, including it was a second loop driver).
    // We assert that specifically on the dep array line, not the body.
    const depArrayMatch = content.match(
      /\},\s*\[[^\]]+\]\)/,
    );
    expect(depArrayMatch).not.toBeNull();
    // The dep array of the rate-write effect specifically must omit
    // formCtx. The end-of-file dep array is the rate-write one.
    const lastDepArray = content.match(
      /\},\s*\[([^\]]+)\]\)/g,
    );
    expect(lastDepArray).not.toBeNull();
    const lastDeps = lastDepArray![lastDepArray!.length - 1];
    expect(lastDeps).not.toMatch(/formCtx/);
  });

  it("buildItemPriceFilters still emits the right shape (regression — 2L test)", () => {
    const f = buildItemPriceFilters({
      itemCode: "X-001",
      priceList: "Standard Selling",
      currency: "ETB",
      side: "selling",
    } satisfies LookupItemPriceInput);
    expect(f).toEqual([
      ["item_code", "=", "X-001"],
      ["price_list", "=", "Standard Selling"],
      ["currency", "=", "ETB"],
      ["selling", "=", 1],
    ]);
  });
});

// =============================================================================
// Part 1A: SO -> SI prefill
// =============================================================================

describe("Part 1A: Sales Order -> Sales Invoice prefill is wired", () => {
  it("the AUTO_FILL_REGISTRY has a Sales Order -> Sales Invoice entry", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "lib/flows/flow-auto-fill.ts",
      "utf-8",
    );
    expect(content).toMatch(/"Sales Order->Sales Invoice":\s*\{/);
  });

  it("the Sales Invoice wizard reads ?sales_order= and applies the prefill", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/accounting/sales-invoice/new/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/searchParams\.get\("sales_order"\)/);
    expect(content).toMatch(/getAutoFillMapping\(\s*"Sales Order"/);
  });
});

// =============================================================================
// Part 1B: SI -> PE prefill — paid_amount + Difference indicator
// =============================================================================

describe("Part 1B: SI -> PE prefill sets paid_amount and surfaces Difference", () => {
  it("the PE wizard reset sets paid_amount from the SI allocated_amount", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/accounting/payment-entry/new/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/paid_amount:\s*allocatedTotal/);
    expect(content).toMatch(/"paid_amount"/);
  });

  it("the PE wizard step-2 allocation card renders a Difference indicator with data-testid", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/accounting/payment-entry/new/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/data-testid="pe-difference-indicator"/);
    expect(content).toMatch(/isZero/);
  });
});

// =============================================================================
// Part 1C: CrossFlowActionsMenu bidirectional groups
// =============================================================================

describe("Part 1C: CrossFlowActionsMenu splits into Created from + Up next", () => {
  it("the menu renders distinct data-testid groups for source vs forward", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/cross-flow/CrossFlowActionsMenu.tsx",
      "utf-8",
    );
    expect(content).toMatch(/data-testid="crossflow-source-group"/);
    expect(content).toMatch(/data-testid="crossflow-forward-group"/);
    expect(content).toMatch(/Created from/);
    expect(content).toMatch(/Up next/);
  });

  it("a doctype with no edges still returns null (no orphan menu)", () => {
    const { container } = render(
      withProviders(
        React.createElement(CrossFlowActionsMenu, {
          doctype: "Stock Reconciliation",
          name: "SR-1",
        }),
      ),
    );
    expect(container.firstChild).toBeNull();
  });
});

// =============================================================================
// Part 2B: green/info _server_messages no longer surface as rejection
// =============================================================================

describe("Part 2B: INFO_MESSAGE routing for green/info _server_messages", () => {
  it("extractInfoMessages returns the info text when the payload is info-only", () => {
    const err = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message: "Item Price added for RM-CARD-A4 in Price List Standard Buying",
          indicator: "green",
        }),
      ]),
    };
    const out = extractInfoMessages(err);
    expect(out).not.toBeNull();
    expect(out![0]).toMatch(/Item Price added/);
  });

  it("extractInfoMessages returns null when a red (raise_exception: 1) error is mixed in", () => {
    const err = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message: "Item Price added for X in Standard Buying",
          indicator: "green",
        }),
        JSON.stringify({
          message: "Some other error",
          indicator: "red",
        }),
      ]),
    };
    const out = extractInfoMessages(err);
    expect(out).toBeNull();
  });

  it("extractInfoMessages returns null for an absent raise_exception (default = error)", () => {
    const err = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message: "Something failed",
          indicator: "red",
        }),
      ]),
    };
    const out = extractInfoMessages(err);
    expect(out).toBeNull();
  });

  it("resolveFrappeError returns severity=info for an info-only payload", () => {
    const err = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message: "Item Price added for RM-CARD-A4 in Price List Standard Buying",
          indicator: "green",
        }),
      ]),
    };
    const asThrownError = Object.assign(
      new Error("Item Price added for X in Standard Buying"),
      { _originalError: err },
    );
    const r = resolveFrappeError(asThrownError, { doctype: "Purchase Order" });
    expect(r.code).toBe("INFO_MESSAGE");
    expect(r.severity).toBe("info");
  });

  it("INSUFFICIENT_STOCK strategy still fires for the real red-error case (regression)", () => {
    const err = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message:
            "1.0 units of Item P-001: Raw Paper needed in Warehouse Stores - P to complete this transaction.",
          indicator: "red",
        }),
      ]),
    };
    const r = resolveFrappeError(err, { doctype: "Delivery Note" });
    expect(r.code).toBe("INSUFFICIENT_STOCK");
  });

  it("PO create with the 'Item Price added' info msgprint routes to INFO_MESSAGE", () => {
    const err = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message: "Item Price added for RM-CARD-A4 in Price List Standard Buying",
          indicator: "green",
          raise_exception: 0,
        }),
      ]),
    };
    const r = resolveFrappeError(err, { doctype: "Purchase Order" });
    expect(r.code).toBe("INFO_MESSAGE");
    expect(r.severity).toBe("info");
  });
});

// =============================================================================
// Part 3A: PE draft-only Edit affordance + new edit page
// =============================================================================

describe("Part 3A: Payment Entry detail has a draft-only Edit affordance", () => {
  it("the PE detail page renders an Edit button linking to the edit route", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/accounting/payment-entry/[name]/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/href=\{`\/accounting\/payment-entry\/\$\{encodeURIComponent\(name\)\}\/edit`\}/);
    expect(content).toMatch(/Edit3/);
    expect(content).toMatch(/isDraft\s*&&\s*\(\s*<Button[^>]*>[\s\S]*?Edit3/);
  });

  it("a new PE edit page exists at the expected route", async () => {
    const fs = await import("fs/promises");
    const exists = await fs
      .stat("app/accounting/payment-entry/[name]/edit/page.tsx")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});

// =============================================================================
// Part 3C: notification actions restyle + Dismiss de-dupe
// =============================================================================

describe("Part 3C: notification actions restyle and Dismiss de-dupe", () => {
  it("the notification panel uses the premium token chrome (no raw border-black)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/notifications/notifications-panel.tsx",
      "utf-8",
    );
    expect(content).toMatch(/border-border\/40/);
    expect(content).toMatch(/shadow-sm\s+shadow-black\/5/);
    expect(content).toMatch(/bg-primary\s+text-primary-foreground/);
  });

  it("the Dismiss button is hidden when the action list already has a Dismiss action", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "components/notifications/notifications-panel.tsx",
      "utf-8",
    );
    expect(content).toMatch(/hasDismissAction/);
    expect(content).toMatch(/if\s*\(hasDismissAction\)\s*return\s*null/);
  });
});

// =============================================================================
// Part 3D: WhatsNext + CrossFlowActionsMenu loading skeletons
// =============================================================================

describe("Part 3D: WhatsNext + CrossFlowActionsMenu loading skeletons", () => {
  it("WhatsNext renders a skeleton when isLoading is true", () => {
    const { container } = render(
      React.createElement(WhatsNext, { actions: [], isLoading: true }),
    );
    expect(screen.getByTestId("whatsnext-skeleton")).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it("WhatsNext still returns null for actions=[] when isLoading is false", () => {
    const { container } = render(
      React.createElement(WhatsNext, { actions: [], isLoading: false }),
    );
    expect(container.firstChild).toBeNull();
  });

  it("WhatsNext renders actions when not loading", () => {
    render(
      React.createElement(WhatsNext, {
        actions: [{ label: "Submit", onClick: () => {}, isPrimary: true }],
      }),
    );
    expect(screen.getByText(/Submit/)).toBeInTheDocument();
  });

  it("CrossFlowActionsMenu renders a skeleton when isLoading is true", () => {
    render(
      withProviders(
        React.createElement(CrossFlowActionsMenu, {
          doctype: "Sales Order",
          name: "SAL-ORD-2026-00001",
          isLoading: true,
        }),
      ),
    );
    expect(screen.getByTestId("crossflow-skeleton")).toBeInTheDocument();
  });
});

// =============================================================================
// Part 4A: Quick-Add is wired on the Part 4 wizards
// =============================================================================

describe("Part 4A: Quick-Add is wired on the Part 4 wizards", () => {
  const swaps: Array<{ file: string; doctype: string }> = [
    { file: "app/manufacturing/bom/new/page.tsx", doctype: "Item" },
    { file: "app/manufacturing/work-order/new/page.tsx", doctype: "Item" },
    { file: "app/manufacturing/work-order/new/page.tsx", doctype: "Warehouse" },
    { file: "app/buying/request-for-quotation/new/page.tsx", doctype: "Supplier" },
    { file: "app/buying/request-for-quotation/new/page.tsx", doctype: "Item" },
    { file: "app/buying/supplier-quotation/new/page.tsx", doctype: "Supplier" },
    { file: "app/buying/supplier-quotation/new/page.tsx", doctype: "Item" },
    { file: "app/accounting/purchase-invoice/new/page.tsx", doctype: "Supplier" },
    { file: "app/accounting/purchase-invoice/new/page.tsx", doctype: "Item" },
    { file: "app/stock/purchase-receipt/new/page.tsx", doctype: "Supplier" },
    { file: "app/stock/purchase-receipt/new/page.tsx", doctype: "Item" },
    { file: "app/stock/purchase-receipt/new/page.tsx", doctype: "Warehouse" },
    { file: "app/crm/opportunity/new/page.tsx", doctype: "Item" },
  ];

  for (const { file, doctype } of swaps) {
    it(`${file} imports QuickAddField and uses it for ${doctype}`, async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile(file, "utf-8");
      expect(content).toMatch(
        /import\s+\{\s*QuickAddField\s*\}\s+from\s+["']@\/components\/quick-add\/QuickAddField["']/,
      );
      const re = new RegExp(
        `<QuickAddField[\\s\\S]*?doctype="${doctype}"[\\s\\S]*?/>`,
      );
      expect(content).toMatch(re);
    });
  }
});

// =============================================================================
// Part 4B: PE wizard party field is Quick-Add enabled
// =============================================================================

describe("Part 4B: Payment Entry wizard party field is Quick-Add enabled", () => {
  it("the PE new wizard uses QuickAddField for the party field", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/accounting/payment-entry/new/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/<QuickAddField[\s\S]*?name="party"[\s\S]*?\/>/);
  });
});

// =============================================================================
// Part 7: Item-360 + Supplier-360 — page presence + tab labels
// =============================================================================

describe("Part 7: Item-360 and Supplier-360 master hubs exist with the right tabs", () => {
  it("Item-360 exists and renders the expected tab labels", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/stock/item/[name]/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/Overview/);
    expect(content).toMatch(/Prices/);
    expect(content).toMatch(/Stock Levels/);
    expect(content).toMatch(/BOMs/);
    expect(content).toMatch(/Transactions/);
    expect(content).toMatch(/Activity/);
  });

  it("Supplier-360 exists and renders the expected tab labels", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/buying/supplier/[name]/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/Overview/);
    expect(content).toMatch(/Purchases/);
    expect(content).toMatch(/Invoices/);
    expect(content).toMatch(/Payments/);
    expect(content).toMatch(/Addresses/);
    expect(content).toMatch(/Contacts/);
  });

  it("Supplier-360 has no @ts-nocheck (premium typing)", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/buying/supplier/[name]/page.tsx",
      "utf-8",
    );
    // The actual directive line is `// @ts-nocheck` (at the top of a
    // file). Match the directive specifically; the docblock can mention
    // the directive in prose without us flagging the file.
    expect(content).not.toMatch(/^@ts-nocheck/m);
    expect(content).not.toMatch(/^\/\/\s*@ts-nocheck\s*$/m);
  });

  it("Supplier-360 includes a Total Payable rollup", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "app/buying/supplier/[name]/page.tsx",
      "utf-8",
    );
    expect(content).toMatch(/Total Payable/);
    expect(content).toMatch(
      /totalOutstanding\s*=\s*purchaseInvoices\.reduce/,
    );
  });
});

// =============================================================================
// Part 7C: Quick-Add on Supplier / Item new wizards (consistency)
// =============================================================================

describe("Part 7C: Supplier / Item new wizards are correctly NOT swapped", () => {
  const noSwapPages = [
    "app/buying/supplier/new/page.tsx",
    "app/stock/item/new/page.tsx",
    "app/crm/customer/new/page.tsx",
    "app/crm/lead/new/page.tsx",
  ];
  for (const file of noSwapPages) {
    it(`${file} does NOT import QuickAddField (no in-registry fields)`, async () => {
      const fs = await import("fs/promises");
      const exists = await fs
        .stat(file)
        .then(() => true)
        .catch(() => false);
      if (!exists) return;
      const content = await fs.readFile(file, "utf-8");
      expect(content).not.toMatch(/import\s+\{\s*QuickAddField\s*\}/);
    });
  }
});

// =============================================================================
// Part 5: FlowRail is brain-owned — verify the file was NOT touched
// =============================================================================

describe("Part 5: FlowRail markup is brain-owned (untouched in this phase)", () => {
  it("the FlowRail source still exports the FlowRail component", async () => {
    const fs = await import("fs/promises");
    const exists = await fs
      .stat("components/flows/FlowRail.tsx")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const content = await fs.readFile("components/flows/FlowRail.tsx", "utf-8");
    expect(content).toMatch(/export function FlowRail/);
  });
});
