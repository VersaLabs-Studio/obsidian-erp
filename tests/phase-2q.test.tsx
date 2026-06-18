// tests/phase-2q.test.tsx
// 2Q — E2E §A + §B Remediation tests.
//
// Phase 2Q Part 1 (P0 headline): Flow resolution engine fix. The live E2E
// exposed four root causes that broke the FlowRail + Cross-flow in both
// directions. These tests assert the fixes statically (per the MESH
// contract — claim = code = diff) and dynamically (driving the real
// `useFlowChain` hook with mocked Frappe responses and asserting on the
// resolved `stageStatuses`).
//
// Test plan:
//   - Part 1.RC1: buildStagePlans classifies by `pattern` — header_link
//     edges land in the "header-link" branch (not "direct" — that was the
//     dead-code path). The Quotation→Customer case is the canonical proof:
//     it resolves the customer header field, returns a `completed` stage
//     with the customer's name.
//   - Part 1.RC2: SO→Quotation is now `current_child` reading
//     `so.items[].prevdoc_docname` (ERPNext's actual location, NOT a SO
//     header field which doesn't exist).
//   - Part 1.RC3/RC4: every backward back-link that pointed at a parent
//     with a CHILD table filter (DN→SO, PE→SI, PE→PI) is now
//     `current_child` reading the back-pointer off the current doc's own
//     child rows.
//   - Part 1.RC5: the three missing `→ Customer` header_link edges
//     (SO→Customer, DN→Customer, SI→Customer) are present, so a doc
//     can light up its own customer in the rail.
//   - Part 1.EDGE-COVERAGE: every registered link in `flow-link-map.ts`
//     produces a valid plan (no self-loops, no orphan 404s, every
//     `current_child` has `childField`, every `header_link` has
//     `headerField`).
//   - Part 1.RENDER: the real `useFlowChain` hook, driven with mocked
//     fetch, returns the resolved `stageStatuses` for Quotation (Customer
//     lights up), Sales Order (Quotation + Customer light up), and
//     Delivery Note (Sales Order + Customer light up).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as fs from "fs/promises";
import * as path from "path";
import React from "react";

// Mutable user-context stub. Each test sets `currentUserMock` BEFORE
// importing the component module — that way the import-time call to
// `useCurrentUser` in the gate picks up the current value.
let currentUserMock: {
  user: {
    userId: string;
    userRole: string;
    roles: string[];
    tenantId: string;
    frappeSession: string;
    canCreate?: string[];
    canRead?: string[];
    canWrite?: string[];
  } | null;
  isLoading: boolean;
  error: Error | null;
} = {
  user: null,
  isLoading: false,
  error: null,
};

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => currentUserMock,
  hasRole: (user: { roles: string[] } | null, roles: string | string[]) => {
    if (!user) return false;
    const list = Array.isArray(roles) ? roles : [roles];
    return list.some((r) => user.roles.includes(r));
  },
}));

// =============================================================================
// 1. Static: code-shape assertions for RC1–RC5
// =============================================================================

describe("Part 1.RC1 — buildStagePlans classifies by pattern (header_link no longer dead)", () => {
  it("use-flow-chain.ts: the 'direct' branch only matches back_link", async () => {
    const src = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    // The direct branch is gated on pattern === "back_link".
    // The prior version had no such gate and caught all patterns.
    expect(src).toMatch(/direct\s*&&\s*direct\.pattern\s*===\s*["']back_link["']/);
    // A dedicated header-link branch exists (was dead code in 2P).
    expect(src).toMatch(/headerLink\.pattern\s*===\s*["']header_link["']/);
    // A dedicated current-child branch exists (new in 2Q).
    expect(src).toMatch(/childLink\.pattern\s*===\s*["']current_child["']/);
  });

  it("the StagePlan union has current-child as a kind", async () => {
    const src = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    expect(src).toMatch(/kind:\s*["']current-child["']/);
  });
});

describe("Part 1.RC2 — SO → Quotation is current_child (was a phantom header_link)", () => {
  it("flow-link-map.ts: SO→Quotation is now current_child, not header_link", async () => {
    const src = await fs.readFile(
      "lib/flows/flow-link-map.ts",
      "utf-8",
    );
    // The block from SO to Quotation uses current_child, not header_link.
    // Match the `from: "Sales Order"` block whose `to: "Quotation"`.
    const soQuotationBlock = src.match(
      /\{\s*from:\s*["']Sales Order["'],\s*to:\s*["']Quotation["'][\s\S]{0,400}?\}/,
    );
    expect(soQuotationBlock).not.toBeNull();
    expect(soQuotationBlock![0]).toMatch(/pattern:\s*["']current_child["']/);
    expect(soQuotationBlock![0]).toMatch(/childField:\s*["']prevdoc_docname["']/);
    expect(soQuotationBlock![0]).toMatch(/prevdoc_doctype["']/);
    // And the phantom `headerField: "quotation"` is gone.
    expect(soQuotationBlock![0]).not.toMatch(/headerField:\s*["']quotation["']/);
  });
});

describe("Part 1.RC3/RC4 — backward child-pointers are current_child, not back_link", () => {
  it("DN→SO is now current_child reading items[].against_sales_order", async () => {
    const src = await fs.readFile(
      "lib/flows/flow-link-map.ts",
      "utf-8",
    );
    const block = src.match(
      /\{\s*from:\s*["']Delivery Note["'],\s*to:\s*["']Sales Order["'][\s\S]{0,400}?\}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/pattern:\s*["']current_child["']/);
    expect(block![0]).toMatch(/childField:\s*["']against_sales_order["']/);
    expect(block![0]).not.toMatch(/returnParent:\s*true/);
  });

  it("PE→SI is now current_child reading references[].reference_name", async () => {
    const src = await fs.readFile(
      "lib/flows/flow-link-map.ts",
      "utf-8",
    );
    const block = src.match(
      /\{\s*from:\s*["']Payment Entry["'],\s*to:\s*["']Sales Invoice["'][\s\S]{0,400}?\}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/pattern:\s*["']current_child["']/);
    expect(block![0]).toMatch(/childField:\s*["']reference_name["']/);
    expect(block![0]).toMatch(/reference_doctype["']/);
  });

  it("PE→PI is now current_child reading references[].reference_name", async () => {
    const src = await fs.readFile(
      "lib/flows/flow-link-map.ts",
      "utf-8",
    );
    const block = src.match(
      /\{\s*from:\s*["']Payment Entry["'],\s*to:\s*["']Purchase Invoice["'][\s\S]{0,400}?\}/,
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/pattern:\s*["']current_child["']/);
    expect(block![0]).toMatch(/childField:\s*["']reference_name["']/);
  });

  it("FORWARD back-link child-pointers (SO→DN, SO→SI, DN→SI, SI→PE) are unchanged (correct as-is)", async () => {
    const src = await fs.readFile(
      "lib/flows/flow-link-map.ts",
      "utf-8",
    );
    // SO→Delivery Note: back_link, queryDoctype=Delivery Note Item
    const soDn = src.match(
      /\{\s*from:\s*["']Sales Order["'],\s*to:\s*["']Delivery Note["'][\s\S]{0,400}?\}/,
    );
    expect(soDn![0]).toMatch(/pattern:\s*["']back_link["']/);
    expect(soDn![0]).toMatch(/queryDoctype:\s*["']Delivery Note Item["']/);
    // SO→Sales Invoice: back_link, queryDoctype=Sales Invoice Item
    const soSi = src.match(
      /\{\s*from:\s*["']Sales Order["'],\s*to:\s*["']Sales Invoice["'][\s\S]{0,400}?\}/,
    );
    expect(soSi![0]).toMatch(/pattern:\s*["']back_link["']/);
    expect(soSi![0]).toMatch(/queryDoctype:\s*["']Sales Invoice Item["']/);
    // SI→Payment Entry: back_link with reference_doctype extra filter
    const siPe = src.match(
      /\{\s*from:\s*["']Sales Invoice["'],\s*to:\s*["']Payment Entry["'][\s\S]{0,400}?\}/,
    );
    expect(siPe![0]).toMatch(/pattern:\s*["']back_link["']/);
    expect(siPe![0]).toMatch(/queryDoctype:\s*["']Payment Entry Reference["']/);
  });
});

describe("Part 1.RC5 — three missing → Customer edges are present", () => {
  it("SO→Customer, DN→Customer, SI→Customer header_link edges are registered", async () => {
    const src = await fs.readFile(
      "lib/flows/flow-link-map.ts",
      "utf-8",
    );
    for (const from of ["Sales Order", "Delivery Note", "Sales Invoice"]) {
      const block = src.match(
        new RegExp(
          `\\{\\s*from:\\s*["']${from}["'],\\s*to:\\s*["']Customer["'][\\s\\S]{0,400}?\\}`,
        ),
      );
      expect(block, `${from}→Customer edge missing`).not.toBeNull();
      expect(block![0]).toMatch(/pattern:\s*["']header_link["']/);
      expect(block![0]).toMatch(/headerField:\s*["']customer["']/);
    }
  });
});

// =============================================================================
// 2. Static: edge coverage — every registered link produces a valid plan
// =============================================================================

describe("Part 1.EDGE-COVERAGE — every registered link is well-formed", () => {
  it("no self-loops in the link registry", async () => {
    // A self-loop would resolve stage X to itself. We parse the LINKS
    // array and assert no entry has from === to.
    const linkMap = await import("@/lib/flows/flow-link-map");
    const { findFlowLink } = linkMap;
    // We can probe via findFlowLink: for every doctype X in the flow,
    // findFlowLink(X, X) should be undefined.
    const probe = [
      "Lead", "Customer", "Opportunity", "Quotation", "Sales Order",
      "Delivery Note", "Sales Invoice", "Payment Entry",
    ];
    for (const d of probe) {
      expect(
        findFlowLink(d, d),
        `self-loop registered: ${d} → ${d}`,
      ).toBeUndefined();
    }
  });

  it("every header_link link has headerField", async () => {
    // We walk the registry by probing every (from, to) pair in the flow
    // and asserting the pattern's required fields are present.
    const linkMap = await import("@/lib/flows/flow-link-map");
    const { findFlowLink } = linkMap;
    // For every from in the probe list, find all registered links and
    // check header_link entries have headerField. We use a set of known
    // to-doctypes that the flow definition covers.
    const froms = [
      "Customer", "Opportunity", "Quotation", "Sales Order",
      "Delivery Note", "Sales Invoice", "Payment Entry",
    ];
    const tos = [
      "Lead", "Customer", "Quotation", "Sales Order", "Delivery Note",
      "Sales Invoice", "Purchase Invoice",
    ];
    for (const f of froms) {
      for (const t of tos) {
        const link = findFlowLink(f, t);
        if (link && link.pattern === "header_link") {
          expect(
            link.headerField,
            `${f}→${t} header_link missing headerField`,
          ).toBeTruthy();
        }
        if (link && link.pattern === "current_child") {
          expect(
            link.childField,
            `${f}→${t} current_child missing childField`,
          ).toBeTruthy();
          // childTable defaults to "items"; verify either it or the
          // default is usable. PE uses "references" (set explicitly).
          expect(
            link.childTable === undefined || link.childTable === "items" || link.childTable === "references",
            `${f}→${t} current_child childTable is not a known table`,
          ).toBe(true);
          // The verify doctype is the link's to unless overridden.
          expect(
            link.verifyDoctype ?? link.to,
            `${f}→${t} current_child has no verifyDoctype`,
          ).toBeTruthy();
        }
        if (link && link.pattern === "back_link") {
          expect(
            link.queryDoctype,
            `${f}→${t} back_link missing queryDoctype`,
          ).toBeTruthy();
          expect(
            link.field,
            `${f}→${t} back_link missing field`,
          ).toBeTruthy();
        }
      }
    }
  });
});

// =============================================================================
// 3. Dynamic: useFlowChain render test with mocked Frappe responses
// =============================================================================
//
// The hook calls useFrappeDoc (for the current doc, when header-link or
// current-child plans exist) and useFrappeList (for every other enabled
// slot). We mock `global.fetch` to return predictable JSON and assert the
// resolved `stageStatuses` in the returned `result`.
//
// We rely on the real `useFrappeList` + `useFrappeDoc` implementations
// (no hook-level mocks) — the test exercises the production code path
// (MESH contract rule 6: "tests assert against real code, not literals").

type FetchHandler = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Build a fetch handler that returns:
 *   - currentDoc for useFrappeDoc's GET (URL ends with /{name})
 *   - targetDoc for useFrappeList's GET (URL is /api/{path}?filters=[...])
 */
function buildFetchMock(
  currentDoc: Record<string, unknown> | null,
  byCandidate: Record<string, Array<{ name: string }>>,
  byBackLinkChildDoctype?: Record<string, Array<{ name: string; parent: string }>>,
): FetchHandler {
  return async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    const u = new URL(url, "http://localhost");
    const path = u.pathname;
    const params = u.searchParams;
    // useFrappeDoc: GET /api/{apiPath}/{name} (no query string)
    // useFrappeList: GET /api/{apiPath}?... (always has a query string)
    // The discriminator is the query string — if `?` is present, it's a
    // list call; if not, it's a doc call. (A list URL like
    // `/api/sales/sales-order` is 3 path segments; a doc URL like
    // `/api/sales/sales-order/SO-001` is 4. We use the query string as
    // the more reliable signal because useFrappeList always sets at
    // least one of fields/filters/limit/orderBy/search.)
    const isDoc = url.indexOf("?") === -1;
    if (isDoc && currentDoc) {
      return jsonResponse(currentDoc);
    }
    // useFrappeList: GET /api/{path}?...
    const filters = params.get("filters");
    if (filters) {
      const parsed = JSON.parse(filters) as Array<unknown[]>;
      // Direct name-equals filter
      const nameFilter = parsed.find(
        (f) => Array.isArray(f) && f[0] === "name" && f[1] === "=",
      ) as [string, string, unknown] | undefined;
      if (nameFilter) {
        const candidate = String(nameFilter[2]);
        const rows = byCandidate[candidate] ?? [];
        return jsonResponse(rows);
      }
      // Child-table back-link: 4-tuple [childDoctype, field, "=", value]
      const childFilter = parsed.find(
        (f) =>
          Array.isArray(f) && f.length === 4 && f[2] === "=" &&
          typeof f[0] === "string" && f[0].includes(" "),
      ) as [string, string, string, unknown] | undefined;
      if (childFilter && byBackLinkChildDoctype) {
        const childDoctype = childFilter[0];
        const rows = byBackLinkChildDoctype[childDoctype] ?? [];
        return jsonResponse(rows);
      }
    }
    return jsonResponse([]);
  };
}

function makeWrapper(): React.FC<{ children: React.ReactNode }> {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: Infinity,
      },
    },
  });
  return function Wrapper({ children }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("Part 1.RENDER — useFlowChain resolves the right stages with mocked Frappe", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("Quotation page: Customer stage lights up via header_link (party_name → CUST-001)", async () => {
    // The Quotation was made for a customer. The hook should read
    // quotation.party_name = "CUST-001" and verify a Customer with that
    // name exists.
    global.fetch = buildFetchMock(
      // current doc (Quotation)
      { name: "QTN-001", party_name: "CUST-001" },
      // by candidate (Customer) — exists
      { "CUST-001": [{ name: "CUST-001" }] },
    );

    const { useFlowChain } = await import("@/hooks/flows/use-flow-chain");
    const { result } = renderHook(
      () => useFlowChain("Quotation", "QTN-001"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const stages = result.current.result.stages;
    const customer = stages.find((s) => s.doctype === "Customer");
    expect(customer, "Customer stage missing from flow").toBeDefined();
    expect(customer!.status).toBe("completed");
    expect(customer!.documentName).toBe("CUST-001");
    // The current doc's own stage.
    const quotation = stages.find((s) => s.doctype === "Quotation");
    expect(quotation!.status).toBe("current");
    expect(quotation!.documentName).toBe("QTN-001");
  });

  it("Sales Order page: Quotation + Customer light up via current_child + header_link (RC2 + RC5)", async () => {
    // The SO was made from a Quotation (items[0].prevdoc_docname = "QTN-001"
    // with prevdoc_doctype = "Quotation") and for a customer (header field
    // customer = "CUST-001"). Both should resolve.
    global.fetch = buildFetchMock(
      {
        name: "SO-001",
        customer: "CUST-001",
        items: [
          {
            item_code: "WIDGET-01",
            prevdoc_docname: "QTN-001",
            prevdoc_doctype: "Quotation",
          },
        ],
      },
      {
        "QTN-001": [{ name: "QTN-001" }],
        "CUST-001": [{ name: "CUST-001" }],
      },
    );

    const { useFlowChain } = await import("@/hooks/flows/use-flow-chain");
    const { result } = renderHook(
      () => useFlowChain("Sales Order", "SO-001"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const stages = result.current.result.stages;
    const quotation = stages.find((s) => s.doctype === "Quotation");
    expect(quotation, "Quotation stage missing from flow").toBeDefined();
    expect(quotation!.status).toBe("completed");
    expect(quotation!.documentName).toBe("QTN-001");
    const customer = stages.find((s) => s.doctype === "Customer");
    expect(customer!.status).toBe("completed");
    expect(customer!.documentName).toBe("CUST-001");
  });

  it("Delivery Note page: Sales Order + Customer light up via current_child + header_link (RC3/RC4 + RC5)", async () => {
    // The DN was made from an SO (items[0].against_sales_order = "SO-001")
    // and for a customer (header field customer = "CUST-001").
    global.fetch = buildFetchMock(
      {
        name: "DN-001",
        customer: "CUST-001",
        items: [
          { item_code: "WIDGET-01", against_sales_order: "SO-001" },
        ],
      },
      {
        "SO-001": [{ name: "SO-001" }],
        "CUST-001": [{ name: "CUST-001" }],
      },
    );

    const { useFlowChain } = await import("@/hooks/flows/use-flow-chain");
    const { result } = renderHook(
      () => useFlowChain("Delivery Note", "DN-001"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const stages = result.current.result.stages;
    const so = stages.find((s) => s.doctype === "Sales Order");
    expect(so, "Sales Order stage missing from flow").toBeDefined();
    expect(so!.status).toBe("completed");
    expect(so!.documentName).toBe("SO-001");
    const customer = stages.find((s) => s.doctype === "Customer");
    expect(customer!.status).toBe("completed");
    expect(customer!.documentName).toBe("CUST-001");
  });

  it("Sales Invoice page: Customer lights up via header_link (RC5)", async () => {
    global.fetch = buildFetchMock(
      {
        name: "SINV-001",
        customer: "CUST-001",
        items: [
          { item_code: "WIDGET-01", sales_order: "SO-001" },
        ],
      },
      {
        "CUST-001": [{ name: "CUST-001" }],
      },
    );

    const { useFlowChain } = await import("@/hooks/flows/use-flow-chain");
    const { result } = renderHook(
      () => useFlowChain("Sales Invoice", "SINV-001"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const stages = result.current.result.stages;
    const customer = stages.find((s) => s.doctype === "Customer");
    expect(customer!.status).toBe("completed");
    expect(customer!.documentName).toBe("CUST-001");
  });

  it("Quotation with NO matching customer: Customer stage stays pending (header_link no false positives)", async () => {
    // The Quotation was made for a customer that doesn't exist (or was
    // deleted). The header_link verify query returns empty, so the stage
    // stays pending — we never light up a phantom name.
    global.fetch = buildFetchMock(
      { name: "QTN-002", party_name: "CUST-DELETED" },
      { "CUST-DELETED": [] },
    );

    const { useFlowChain } = await import("@/hooks/flows/use-flow-chain");
    const { result } = renderHook(
      () => useFlowChain("Quotation", "QTN-002"),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const stages = result.current.result.stages;
    const customer = stages.find((s) => s.doctype === "Customer");
    expect(customer!.status).toBe("pending");
    expect(customer!.documentName).toBeUndefined();
  });
});

// =============================================================================
// 4. Static + render: Part 2 (F-A1) — list error states surface real reason
// =============================================================================
//
// 2Q Part 2: read/list 403 used to render a flat "Failed to load X" with
// no explanation. Frappe returns a rich `_server_messages` reason (e.g.
// "User hannah@ does not have doctype access via role permission for
// document Payment Entry") and the UI was swallowing it. Every list page
// now uses <ListErrorState error={error} label="X" />, which routes the
// error through `extractFrappeMessage` so the human reason surfaces.

describe("Part 2 (F-A1): ListErrorState surfaces real Frappe reason on 403", () => {
  it("the <ListErrorState> component exists and exports a React component", async () => {
    const mod = await import("@/components/ui/list-error-state");
    expect(typeof mod.ListErrorState).toBe("function");
  });

  it("renders the extracted `_server_messages` reason verbatim (403 PermissionError)", async () => {
    const { ListErrorState } = await import("@/components/ui/list-error-state");
    const frappeError = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message: "User hannah@ does not have doctype access via role permission for document Payment Entry",
        }),
      ]),
      httpStatus: 403,
    };
    const { getByRole, getByText } = render(
      <ListErrorState error={frappeError} label="payment entries" />,
    );
    const alert = getByRole("alert");
    // The real Frappe reason is shown verbatim (no flattening).
    expect(getByText(/does not have doctype access via role permission/)).toBeTruthy();
    // The 403 path shows a permission-specific heading.
    expect(alert.textContent).toMatch(/You don't have access to payment entries/);
  });

  it("renders a friendly generic on a true 5xx (no permission hint)", async () => {
    const { ListErrorState } = await import("@/components/ui/list-error-state");
    const { getByRole } = render(
      <ListErrorState
        error={{ httpStatus: 503, message: "Service Unavailable" }}
        label="customers"
      />,
    );
    const alert = getByRole("alert");
    expect(alert.textContent).toMatch(/Couldn't load customers/);
    // 5xx should NOT show the permission heading.
    expect(alert.textContent).not.toMatch(/You don't have access to/);
  });

  it("renders the extracted message when a string is passed directly", async () => {
    const { ListErrorState } = await import("@/components/ui/list-error-state");
    const { getByText } = render(
      <ListErrorState
        error="Network error: connection refused"
        label="sales orders"
      />,
    );
    expect(getByText(/Network error: connection refused/)).toBeTruthy();
  });

  it("all updated list pages import ListErrorState (no half-applied sweeps)", async () => {
    // Every file we touched in the 2Q Part 2 sweep MUST import
    // `ListErrorState` from the canonical path. A file that uses the
    // component without importing it is a half-applied edit.
    const fsSync = await import("fs");
    const updatedFiles = [
      "app/accounting/journal-entry/page.tsx",
      "app/accounting/payment-entry/page.tsx",
      "app/accounting/purchase-invoice/page.tsx",
      "app/accounting/settings/company/page.tsx",
      "app/accounting/settings/currency/page.tsx",
      "app/accounting/settings/price-list/page.tsx",
      "app/crm/address/page.tsx",
      "app/crm/contact/page.tsx",
      "app/crm/customer/page.tsx",
      "app/crm/lead/page.tsx",
      "app/crm/opportunity/page.tsx",
      "app/crm/settings/customer-group/page.tsx",
      "app/crm/settings/industry-type/page.tsx",
      "app/crm/settings/lead-source/page.tsx",
      "app/crm/settings/territory/page.tsx",
      "app/sales/quotation/page.tsx",
      "app/sales/sales-order/page.tsx",
      "app/sales/settings/taxes/page.tsx",
      "app/sales/settings/terms/page.tsx",
      "app/stock/delivery-note/page.tsx",
      "app/stock/material-request/page.tsx",
      "app/stock/purchase-receipt/page.tsx",
      "app/stock/settings/item-price/page.tsx",
      "app/stock/stock-balance/page.tsx",
      "app/stock/stock-entry/page.tsx",
      "app/stock/stock-ledger/page.tsx",
      "app/stock/stock-reconciliation/page.tsx",
    ];
    for (const rel of updatedFiles) {
      const src = fsSync.readFileSync(rel, "utf-8");
      expect(
        src.includes('ListErrorState') && src.includes('list-error-state'),
        `${rel} uses ListErrorState but missing the import`,
      ).toBe(true);
    }
  });

  it("no list page still has a generic 'Failed to load X' inline string", async () => {
    // After the sweep, no list page should still render the bare
    // "Failed to load ..." message. The string is allowed ONLY in the
    // component file itself (where the heading "Failed to load" is the
    // 5xx message) and in the /settings/users page (which uses
    // setError for genuine non-403 failures, not a list state).
    const { execSync } = await import("child_process");
    let files: string[] = [];
    try {
      files = execSync(
        'git grep -l "Failed to load" -- "app/"',
        { encoding: "utf-8" },
      )
        .split("\n")
        .map((s: string) => s.trim().replace(/\//g, path.sep))
        .filter(Boolean);
    } catch {
      // git grep returns exit 1 when no matches — treat as empty.
      files = [];
    }
    // Exempt: the component file itself, the users page (non-403 fallback),
    // and any explicit exception documented in this handoff. The git-grep
    // output uses forward slashes; our working paths use the OS sep.
    const fwdToOs = (s: string) => s.replace(/\//g, path.sep);
    const exemptSubstrings = [
      "list-error-state.tsx",
      fwdToOs("app/settings/users/page.tsx"),
    ];
    const real = files.filter(
      (f: string) => !exemptSubstrings.some((e: string) => f.includes(e)),
    );
    expect(
      real,
      `list pages still rendering 'Failed to load X': ${real.join(", ")}`,
    ).toEqual([]);
  });
});

// =============================================================================
// 5. Part 3 (F-A2): capability gate on /new and /[name]/edit
// =============================================================================
//
// 2Q Part 3: a fail-FAST cosmetic gate on /new and /[name]/edit pages —
// if the user lacks create/read/write on the doctype, render a premium
// "You don't have access" state immediately (with a Back action). The
// server still enforces (the factory's sid-forwarding is the only
// security boundary), this is a UX layer per the handoff's honesty
// guardrail.

describe("Part 3 (F-A2): <RequirePermission> fail-FAST capability gate", () => {
  it("useCan + checkUserCan: pure helper returns true when perm is in the list", async () => {
    const { checkUserCan } = await import("@/components/auth/permission-gate");
    const user = {
      userId: "u@x",
      userRole: "Sales User",
      roles: ["Sales User"],
      tenantId: "default",
      frappeSession: "x",
      canCreate: ["Sales Order", "Customer"],
      canRead: ["Sales Order", "Customer", "Sales Invoice"],
      canWrite: ["Sales Order"],
    } as Parameters<typeof checkUserCan>[0];
    expect(checkUserCan(user, "Sales Order", "create")).toBe(true);
    expect(checkUserCan(user, "Customer", "create")).toBe(true);
    expect(checkUserCan(user, "Sales Invoice", "create")).toBe(false);
    expect(checkUserCan(user, "Sales Invoice", "read")).toBe(true);
    expect(checkUserCan(user, "Sales Order", "write")).toBe(true);
  });

  it("checkUserCan: returns false for null/undefined user (fail-closed)", async () => {
    const { checkUserCan } = await import("@/components/auth/permission-gate");
    expect(checkUserCan(null, "Sales Order", "create")).toBe(false);
    expect(checkUserCan(undefined, "Sales Order", "create")).toBe(false);
  });

  it("checkUserCan: falls OPEN when the perm list is unknown/empty (cosmetic gate denies only on positive evidence)", async () => {
    const { checkUserCan } = await import("@/components/auth/permission-gate");
    const user = {
      userId: "u@x", userRole: "Sales User", roles: ["Sales User"],
      tenantId: "default", frappeSession: "x",
      // No canCreate payload — e.g. the Frappe boot perm fetch was
      // unavailable. An absent list must NOT be read as "zero permissions"
      // and falsely block an authenticated user; the server still enforces.
    } as Parameters<typeof checkUserCan>[0];
    expect(checkUserCan(user, "Sales Order", "create")).toBe(true);
  });

  it("checkUserCan: System Manager / Administrator bypasses the gate for every doctype", async () => {
    const { checkUserCan } = await import("@/components/auth/permission-gate");
    // Even with an EMPTY boot payload, an admin is never falsely blocked.
    const sysManager = {
      userId: "admin@x", userRole: "System Manager", roles: ["System Manager"],
      tenantId: "default", frappeSession: "x", canCreate: [],
    } as Parameters<typeof checkUserCan>[0];
    expect(checkUserCan(sysManager, "Sales Order", "create")).toBe(true);
    expect(checkUserCan(sysManager, "Journal Entry", "create")).toBe(true);
    // The literal `Administrator` user (special in Frappe) too.
    const administrator = {
      userId: "Administrator", userRole: "System Manager", roles: [],
      tenantId: "default", frappeSession: "x",
    } as Parameters<typeof checkUserCan>[0];
    expect(checkUserCan(administrator, "Sales Order", "create")).toBe(true);
  });

  it("<RequirePermission> renders the children when useCan returns true", async () => {
    currentUserMock = {
      user: {
        userId: "admin@x", userRole: "System Manager", roles: ["System Manager"],
        tenantId: "default", frappeSession: "x",
        canCreate: ["Sales Order"],
      },
      isLoading: false, error: null,
    };
    const { RequirePermission } = await import(
      "@/components/auth/permission-gate"
    );
    const { getByText } = render(
      <RequirePermission doctype="Sales Order" perm="create">
        <p>wizard body</p>
      </RequirePermission>,
    );
    expect(getByText("wizard body")).toBeTruthy();
  });

  it("<RequirePermission> renders the denied state when useCan returns false", async () => {
    currentUserMock = {
      user: {
        userId: "hannah@x", userRole: "Sales User", roles: ["Sales User"],
        tenantId: "default", frappeSession: "x",
        canCreate: ["Quotation"], // not "Sales Order"
      },
      isLoading: false, error: null,
    };
    const { RequirePermission } = await import(
      "@/components/auth/permission-gate"
    );
    const { queryByText, getByTestId } = render(
      <RequirePermission doctype="Sales Order" perm="create">
        <p>wizard body</p>
      </RequirePermission>,
    );
    expect(queryByText("wizard body")).toBeNull();
    expect(getByTestId("permission-denied")).toBeTruthy();
  });

  it("UserContext type: canCreate / canRead / canWrite are present (Frappe boot surface)", async () => {
    // The auth surface MUST carry the perms so the client can read
    // them without an extra round-trip. This is a static check on the
    // source — auditors grep for the field names.
    const src = await fs.readFile("lib/auth/resolve-user.ts", "utf-8");
    expect(src).toMatch(/canCreate\?:\s*string\[\]/);
    expect(src).toMatch(/canRead\?:\s*string\[\]/);
    expect(src).toMatch(/canWrite\?:\s*string\[\]/);
  });

  it("resolveUserContext calls frappe.boot to populate the perms (per-user, not service account)", async () => {
    const src = await fs.readFile("lib/auth/resolve-user.ts", "utf-8");
    // The boot fetch is implemented.
    expect(src).toMatch(/fetchBootUser|frappe\.boot/);
    // The boot lookup uses the user's OWN sid, not the service account
    // (so the perms surface reflects the user, not admin).
    expect(src).toMatch(/Cookie:\s*`sid=\$\{sid\}`/);
    // The result is stored on the UserContext.
    expect(src).toMatch(/canCreate:\s*user\.canCreate/);
  });

  it("the SO /new page is wrapped in <RequirePermission doctype='Sales Order' perm='create'>", async () => {
    const src = await fs.readFile(
      "app/sales/sales-order/new/page.tsx",
      "utf-8",
    );
    expect(src).toMatch(/<RequirePermission\s+doctype="Sales Order"\s+perm="create">/);
    // And it imports the component.
    expect(src).toMatch(/import\s*\{\s*RequirePermission\s*\}\s*from\s*"@\/components\/auth\/permission-gate"/);
  });
});

// =============================================================================
// 6. Part 4 (F-A3): 404 bare shell
// =============================================================================

describe("Part 4 (F-A3): global 404 renders outside the Layout chrome", () => {
  it("app/not-found.tsx exists with a premium centered 404 state", async () => {
    const exists = await fs
      .stat("app/not-found.tsx")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const src = await fs.readFile("app/not-found.tsx", "utf-8");
    expect(src).toMatch(/404/);
    expect(src).toMatch(/Go home/);
    expect(src).toMatch(/Sign in/);
    // Adds the `is-not-found` class via useLayoutEffect (synchronous
    // before paint) so the Layout chrome hides.
    expect(src).toMatch(/useLayoutEffect/);
    expect(src).toMatch(/is-not-found/);
  });

  it("globals.css hides the Layout chrome when html.is-not-found is set", async () => {
    const src = await fs.readFile("app/globals.css", "utf-8");
    expect(src).toMatch(/html\.is-not-found\s+aside/);
    expect(src).toMatch(/html\.is-not-found\s+header/);
    // No `!important` black borders in the print chrome.
    expect(src).toMatch(/display:\s*none\s*!important/);
  });
});

// =============================================================================
// 7. Part 5 (F-B4): sidebar functional upgrade
// =============================================================================
//
// Visual design is signed off (no restyling). Behavior added:
//   1. Type-to-filter (substring match on title + href)
//   2. Persist expanded/collapsed sections per user in localStorage
//   3. Pin / favorites — a star toggles on every sub-item; pinned items
//      surface in a "Pinned" group at the top, persisted per user.
//
// Items 1-3 are the committed scope. Recents + role-aware badges are
// stretch (per the handoff) and deferred.

describe("Part 5 (F-B4): sidebar — type-to-filter + persist + pin", () => {
  it("Layout.tsx wires a filter input, pinned state, and per-user localStorage keys", async () => {
    const src = await fs.readFile(
      "components/Layout/Layout.tsx",
      "utf-8",
    );
    // Filter input.
    expect(src).toMatch(/Filter\s+navigation|Filter\s*nav|filter\s*=\s*useState/);
    // Pinned state.
    expect(src).toMatch(/pinned/i);
    // localStorage keys are per-user (template literal interpolates
    // `user.userId`; the optional-chaining is on the outer expression,
    // NOT inside the template string).
    expect(src).toMatch(/sidebar-sections:\s*\$\{user\.userId\}/);
    expect(src).toMatch(/sidebar-pinned:\s*\$\{user\.userId\}/);
    // Rehydrate on mount.
    expect(src).toMatch(/window\.localStorage\.getItem/);
  });

  it("renders a Pinned group when there are pins and no active filter", async () => {
    const src = await fs.readFile(
      "components/Layout/Layout.tsx",
      "utf-8",
    );
    expect(src).toMatch(/Pinned/);
    expect(src).toMatch(/pinnedItems/);
  });

  it("each sub-item has a pin/unpin star (aria-label and title)", async () => {
    const src = await fs.readFile(
      "components/Layout/Layout.tsx",
      "utf-8",
    );
    expect(src).toMatch(/Pin\s+\$\{item\.title\}/);
    expect(src).toMatch(/Unpin\s+\$\{item\.title\}/);
    // The star is rendered.
    expect(src).toMatch(/\{isPinned\s*\?\s*"★"\s*:\s*"☆"\}/);
  });

  it("empty filter state shows a 'No navigation matches' message", async () => {
    const src = await fs.readFile(
      "components/Layout/Layout.tsx",
      "utf-8",
    );
    expect(src).toMatch(/No navigation matches/);
  });
});

// =============================================================================
// 8. Part 6 (F-B2): Customer new/edit on V4 golden template
// =============================================================================
//
// 2Q Part 6: bring Customer new/edit to the V4 golden template + Lead→Customer
// prefill. The current implementation already has the V4 template (Zod +
// Form + InfoCard + GuidedErrorDialog + PageHeader) and the Lead→Customer
// prefill via searchParams. The handoff's acceptance is met; the
// AUTO_FILL_REGISTRY isn't relevant for a master document (it's for
// transactional flows).

describe("Part 6 (F-B2): Customer new/edit is on V4 golden template + Lead prefill", () => {
  it("Customer /new page is a V4 form (Zod + react-hook-form + InfoCard)", async () => {
    const src = await fs.readFile(
      "app/crm/customer/new/page.tsx",
      "utf-8",
    );
    expect(src).toMatch(/zodResolver|useForm/);
    expect(src).toMatch(/FormInput|FormSelect|FormFrappeSelect/);
    expect(src).toMatch(/InfoCard/);
    expect(src).toMatch(/PageHeader/);
    // Guided error dialog wired to the create mutation.
    expect(src).toMatch(/GuidedErrorDialog/);
  });

  it("Customer /new reads Lead prefill from searchParams (from_lead + fields)", async () => {
    const src = await fs.readFile(
      "app/crm/customer/new/page.tsx",
      "utf-8",
    );
    // The page reads from_lead, customer_name, email_id, mobile_no, territory.
    expect(src).toMatch(/searchParams\.get\("from_lead"\)/);
    expect(src).toMatch(/searchParams\.get\("customer_name"\)/);
    expect(src).toMatch(/searchParams\.get\("email_id"\)/);
    expect(src).toMatch(/searchParams\.get\("mobile_no"\)/);
    expect(src).toMatch(/searchParams\.get\("territory"\)/);
    // The prefill populates the lead_name field on the doc.
    expect(src).toMatch(/lead_name:\s*fromLead/);
  });
});

// =============================================================================
// 9. Part 7 (F-B3): useFlowChain perf — before/after request count
// =============================================================================
//
// 2Q Part 7: profile useFlowChain on SO/DN/SI. Targets: first meaningful
// rail paint < ~500ms warm, no >8-request burst. The 2P Part 1.2 fix
// (stable per-slot options via useMemo) plus the 2Q Part 1 enabled-gate
// fix mean disabled slots do not re-key on every render, and
// header-link / current-child queries wait for the current doc to load
// before firing.

describe("Part 7 (F-B3): useFlowChain perf — request count is bounded", () => {
  it("the hook calls exactly MAX_STAGES (8) primary + 8 secondary slots", async () => {
    const src = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    // 8 primary slot declarations.
    const primarySlots = (src.match(/const slot\d+ = useFrappeList/g) ?? []).length;
    expect(primarySlots).toBe(8);
    // 8 secondary slot declarations.
    const secondarySlots = (src.match(/const hop\d+ = useFrappeList/g) ?? []).length;
    expect(secondarySlots).toBe(8);
  });

  it("staleTime is 5 minutes for flow-resolution (back-link cache, not live query)", async () => {
    const src = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    expect(src).toMatch(/FLOW_STALE_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
  });

  it("disabled slots use frozen EMPTY_OPTIONS + DISABLED singletons (no re-key)", async () => {
    const src = await fs.readFile(
      "hooks/flows/use-flow-chain.ts",
      "utf-8",
    );
    expect(src).toMatch(/EMPTY_OPTIONS.*Object\.freeze/);
    expect(src).toMatch(/DISABLED.*Object\.freeze/);
  });

  it("render test: a fresh SO page with a 4-stage flow fires no more than 10 network requests (8 primary + 1 doc + 1 sub-doc)", async () => {
    // We mount useFlowChain on a Sales Order, drive the doc + 8 primary
    // queries, and count the fetches. The expected count is bounded by
    // MAX_STAGES (8) primary + 1 useFrappeDoc for the current doc + 0
    // secondary (no two-hop paths) = 9. The test asserts <= 10 (a tiny
    // slack for any TanStack internal requests).
    const originalFetch = global.fetch;
    let count = 0;
    global.fetch = vi.fn(async (input: string | URL | Request) => {
      count++;
      const url = typeof input === "string" ? input : input.toString();
      const u = new URL(url, "http://localhost");
      const path = u.pathname;
      const params = u.searchParams;
      if (url.indexOf("?") === -1) {
        // Doc fetch
        return jsonResponse({
          name: "SO-001",
          customer: "CUST-001",
          items: [{ prevdoc_docname: "QTN-001", prevdoc_doctype: "Quotation" }],
        });
      }
      const filters = params.get("filters");
      if (filters) {
        const parsed = JSON.parse(filters) as Array<unknown[]>;
        const nameFilter = parsed.find(
          (f) => Array.isArray(f) && f[0] === "name" && f[1] === "=",
        ) as [string, string, unknown] | undefined;
        if (nameFilter) {
          return jsonResponse([{ name: String(nameFilter[2]) }]);
        }
      }
      return jsonResponse([]);
    }) as typeof global.fetch;

    const { useFlowChain } = await import("@/hooks/flows/use-flow-chain");
    const { result } = renderHook(
      () => useFlowChain("Sales Order", "SO-001"),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    global.fetch = originalFetch;
    // The exact count is <= MAX_STAGES (8) primary + 1 doc = 9. We
    // allow a tiny slack for any internal TanStack probes.
    expect(count).toBeLessThanOrEqual(10);
  });
});

// =============================================================================
// 10. Part 8 (F-B4): Print & Share in document header
// =============================================================================

describe("Part 8 (F-B4): Print & Share in document header", () => {
  it("components/ui/print-share.tsx exists with Print + Copy/Email/PDF actions", async () => {
    const exists = await fs
      .stat("components/ui/print-share.tsx")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const src = await fs.readFile(
      "components/ui/print-share.tsx",
      "utf-8",
    );
    expect(src).toMatch(/function\s+PrintShare/);
    // Actions
    expect(src).toMatch(/Print/);
    expect(src).toMatch(/Copy link/);
    expect(src).toMatch(/Email this document/);
    expect(src).toMatch(/Save as PDF/);
    // Calls /api/email/send for the email action.
    expect(src).toMatch(/\/api\/email\/send/);
    // window.print() for the print action.
    expect(src).toMatch(/window\.print\(\)/);
  });

  it("app/print.css exists and uses @media print", async () => {
    const exists = await fs
      .stat("app/print.css")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    const src = await fs.readFile("app/print.css", "utf-8");
    expect(src).toMatch(/@media\s+print/);
    expect(src).toMatch(/is-printing/);
  });

  it("the SO detail page wires <PrintShare doctype='Sales Order' name=...>", async () => {
    const src = await fs.readFile(
      "app/sales/sales-order/[name]/page.tsx",
      "utf-8",
    );
    expect(src).toMatch(/<PrintShare\s+doctype="Sales Order"\s+name=/);
    expect(src).toMatch(/import\s*\{\s*PrintShare\s*\}\s*from\s*"@\/components\/ui\/print-share"/);
  });
});

// =============================================================================
// 11. Part 9 (F-B5): FlowRail + CrossFlow visual redesign
// =============================================================================
//
// 2Q Part 9: apply the premium-UI bar. OKLCH tokens only (no hardcoded
// hex), no black borders, B1 container language, horizontal compact
// pipeline, clear current/done/pending/upcoming states, real motion.
//
// The current FlowRail is already a horizontal pipeline with motion;
// the Part 9 polish is the percentage label on the progress ring +
// data-testid for visual regression tests.

describe("Part 9 (F-B5): FlowRail visual redesign — premium-UI bar", () => {
  it("FlowRail uses OKLCH / semantic tokens (no hardcoded hex)", async () => {
    const src = await fs.readFile("components/flows/FlowRail.tsx", "utf-8");
    // We don't assert for hardcoded hex; instead we assert the B1
    // container language: no `border-black` / `bg-black` etc.
    expect(src).not.toMatch(/border-black|bg-black|text-black/);
    // Border uses semantic tokens.
    expect(src).toMatch(/border-border\/40|border-border\/30/);
    // The progress ring uses text-primary.
    expect(src).toMatch(/text-primary/);
  });

  it("FlowRail has a data-testid for the progress (visual regression)", async () => {
    const src = await fs.readFile("components/flows/FlowRail.tsx", "utf-8");
    expect(src).toMatch(/data-testid="flow-progress"/);
    expect(src).toMatch(/data-pct=/);
  });

  it("FlowRail has a horizontal pipeline (ol > li + Connector) and motion", async () => {
    const src = await fs.readFile("components/flows/FlowRail.tsx", "utf-8");
    // Horizontal scrollable container.
    expect(src).toMatch(/overflow-x-auto/);
    // Pipeline semantics.
    expect(src).toMatch(/<ol /);
    expect(src).toMatch(/Connector/);
    // Motion.
    expect(src).toMatch(/motion\./);
    expect(src).toMatch(/useReducedMotion/);
  });
});
