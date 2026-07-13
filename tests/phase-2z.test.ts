// tests/phase-2z.test.ts
// Phase 2Z — E2E easing round: WOs born submitted, one-click Deliver &
// Invoice, one-click Mark as Paid. File-content assertions in the repo's
// established style (see phase-2o.test.tsx) — they pin the ARCHITECTURE
// (canonical ERPNext mappers + frappe.client.submit via user-scoped server
// routes), not the pixels.

import { describe, it, expect } from "vitest";

const read = async (path: string) => {
  const fs = await import("fs/promises");
  return fs.readFile(path, "utf-8");
};

// =============================================================================
// D2 — POST /api/sales/sales-order/[name]/fulfill (Deliver & Invoice)
// =============================================================================

describe("2Z D2: fulfill route (Deliver & Invoice)", () => {
  const ROUTE = "app/api/sales/sales-order/[name]/fulfill/route.ts";

  it("exists and uses the user-scoped client, failing closed", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/getRequestClient\(request\)/);
    expect(content).toMatch(/status:\s*401/);
  });

  it("chains ERPNext's OWN mappers — never hand-builds the DN/SI", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/sales_order\.make_delivery_note/);
    expect(content).toMatch(/delivery_note\.make_sales_invoice/);
    // Insert + submit in one shot — draft docs can't back the chain.
    expect(content).toMatch(/frappe\.client\.submit/);
  });

  it("stamps the fiscal FS No (pana_fs_number) on the invoice when provided", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/pana_fs_number/);
    expect(content).toMatch(/fs_number/);
  });

  it("applies the 9R.14 payment_schedule reset to both mapped targets", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/payment_schedule\s*=\s*\[\]/);
  });

  it("never loses the DN: partial-failure payload carries delivery_note", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/InvoiceFailedAfterDelivery/);
    expect(content).toMatch(/delivery_note:\s*dnName,\s*sales_invoice:\s*null/);
  });

  it("guides the negative-stock case to 'finish production first'", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/FinishedGoodsNotInStock/);
    expect(content).toMatch(/finish production/i);
  });
});

// =============================================================================
// D3 — POST /api/accounting/payment/quick (Mark as Paid)
// =============================================================================

describe("2Z D3: quick payment route (Mark as Paid)", () => {
  const ROUTE = "app/api/accounting/payment/quick/route.ts";

  it("exists and uses the user-scoped client, failing closed", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/getRequestClient\(request\)/);
    expect(content).toMatch(/status:\s*401/);
  });

  it("builds the PE via ERPNext's canonical get_payment_entry mapper", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/payment_entry\.get_payment_entry/);
    expect(content).toMatch(/frappe\.client\.submit/);
  });

  it("reads Mode of Payment accounts from the FULL doc (child rows 500 in get_list)", async () => {
    const content = await read(ROUTE);
    expect(content).toMatch(/frappe\.client\.get\b/);
    // The mode's accounts[] child table must never be requested via get_list.
    expect(content).not.toMatch(/get_list[\s\S]{0,200}accounts/);
  });
});

// =============================================================================
// D1 — Work Orders born submitted + cockpit wiring
// =============================================================================

describe("2Z D1/D2 UI: SO cockpit", () => {
  const PAGE = "app/sales/sales-order/[name]/page.tsx";

  it("submits each Work Order right after creating it", async () => {
    const content = await read(PAGE);
    // create → submit in the same loop (docstatus: 1 via the update mutation).
    expect(content).toMatch(
      /createWOMutation\.mutateAsync[\s\S]{0,900}submitWOMutation\.mutateAsync[\s\S]{0,200}docstatus:\s*1/,
    );
  });

  it("offers one-click Deliver & Invoice wired to the fulfill route", async () => {
    const content = await read(PAGE);
    expect(content).toMatch(/Deliver & Invoice/);
    expect(content).toMatch(/\/fulfill/);
    // FS No capture in the confirm dialog.
    expect(content).toMatch(/fsNumber/);
    // The wizard path survives as the advanced option.
    expect(content).toMatch(/Delivery Note \(advanced\)/);
  });
});

describe("2Z D3 UI: SI detail", () => {
  const PAGE = "app/accounting/sales-invoice/[name]/page.tsx";

  it("offers Mark as Paid wired to the quick payment route", async () => {
    const content = await read(PAGE);
    expect(content).toMatch(/Mark as Paid/);
    expect(content).toMatch(/\/api\/accounting\/payment\/quick/);
    // The PE wizard survives as the partial/advanced path.
    expect(content).toMatch(/Create Payment Entry/);
  });
});

// =============================================================================
// Standing guardrail — no client-side Frappe-namespace fetches anywhere
// =============================================================================

describe("2Z guardrail: no /api/resource fetches in app/", () => {
  it("no file under app/ fetches the Frappe /api/resource namespace", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const offenders: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const content = await fs.readFile(full, "utf-8");
          if (/fetch\(\s*["'`]\/api\/resource\//.test(content)) offenders.push(full);
        }
      }
    };

    await walk("app");
    expect(offenders).toEqual([]);
  });
});
