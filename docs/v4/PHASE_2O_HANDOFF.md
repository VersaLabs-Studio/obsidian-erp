# Phase 2O Handoff — Stabilize + Intelligence + Automate

> **Mega-unit (Day 1 of the 2-day v4 finish).** Make the built core *actually work* and *shine*.
> **Branch:** `feat/v4-phase-2o-stabilize-intelligence-automate` (off `develop` `5617ceb`, already cut + pushed).
> **Merge target:** `develop` (`--no-ff`), regated as ONE unit per `[[phase-handoff-sizing-policy]]`.
> **Contract:** Read `docs/v4/MESH_REPORTING_CONTRACT.md` (v1.1) FIRST and LAST. Claim = code = diff. No orphan modules. No `__init__.ts`. No god-modules. Honor guardrails. Static gates (tsc/vitest) are necessary but NOT sufficient — every fix is a runtime contract, and **you do not run a dev server: end your report with the Part 8 MANUAL LIVE-RETEST CHECKLIST filled in, never a false ✅.**
> **Scope decision:** `docs/v4/DECISIONS.md` **B11** — AI + DB-per-tenant deferred to v4.1; this phase + 2P are the whole v4 ship.

---

## 0. Orientation — golden templates & ownership

**Clone, never invent.** The locked golden patterns:
- Transactional detail page: `app/sales/sales-order/[name]/page.tsx` (FlowRail + CrossFlow + WhatsNext + B1 sidebar).
- Transactional wizard: `app/sales/sales-order/new/page.tsx` + `app/sales/sales-order/[name]/edit/page.tsx` (FlowWizard, Zod gate, FieldWrap markers).
- 360 master: `app/crm/customer/[name]/page.tsx` (tabbed, KPI StatCards, linked-doc lists).
- B1 sidebar panel surface: `WhatsNext.tsx` / `ActivityTimeline.tsx` (`bg-card rounded-2xl shadow-sm shadow-black/5 p-6 border-border/40`).
- Module hub: `components/dashboard/ModuleHub.tsx` (2N).
- Report shell: `components/accounting/FinancialReportView.tsx` (2N).

**FlowRail ownership — CHANGED THIS PHASE.** The FlowRail **visual redesign** (`components/flows/FlowRail.tsx`, commit `cb7de20`) is Brain-owned and final — do **not** restyle it. **But Kidus has now granted you permission to change FlowRail's resolution-display + next-action LOGIC** (which stage shows as completed, which "Create" affordance renders, the "you are here / up next" gating) because that logic is wrong (Part 1). Rule for this phase: **you may edit FlowRail's data/prop-consumption and next-action logic; you may NOT change its chrome, node layout, focus-zone styling, skeleton, or motion.** When in doubt, fix the data feeding it (the hook) rather than the component.

---

## PART 1 — Flow Resolution Rewrite  ⟦P0-CRITICAL — DO FIRST⟧

**This is the headline. It is bigger than the mesh's 2N report admitted.** The 2N report claimed "downstream stages (SO, WO, DN, SI, PE) resolve correctly" and only CRM-upstream was a gap. **The live retest disproves that:** an SO with a real SI created from it still shows `0/8`, Invoice "Not started", and CrossFlow still says "Create Sales Invoice"; a fully-paid SI shows `0/8`, no SO/Customer link, and still prompts "Create Payment Entry." **The entire chain is broken, both directions.** Root-caused by the Brain in-tree at `5617ceb`:

### 1.1 — `hooks/flows/use-flow-chain.ts` has three compounding defects

**Defect A — anchor mis-wiring (`use-flow-chain.ts:189-213`).** Each query slot's anchor is computed from **`slot[N-1].targetStageIndex`** — the *previous slot in the flat steps array* — instead of from **`slot[N].anchorStageIndex`** (the stage adjacent toward the current doc, which `planSteps` already computes correctly at `:100` and `:111`). Because `planSteps` (`:83-116`) emits **all backward steps first, then all forward steps**, the first *forward* step (e.g. the Sales Invoice when standing on a Sales Order) is anchored on the **last backward step's** result (e.g. Lead) — which is null — so `enabled: !!anchorN` is permanently false. **The forward chain never fires.** That is exactly why SO→SI never lights up.

**Defect B — non-reactive cascade (`:161-164`, `:288-299`).** `resolvedByStage` is a `useMemo`-stabilized array that the extraction loop (`:288-299`) **mutates in place after** the `useFrappeList` hooks run. A mutation does not trigger a re-render, and anchors are read at the top of render *before* the extraction loop. So once a hop resolves, nothing re-renders to recompute the next hop's `enabled`. **The cascade advances at most one hop**, then stalls forever.

**Defect C — optional-stage stall.** Strict hop-by-hop adjacency means one missing *optional* stage (no Delivery Note in a direct SO→SI flow) nulls the anchor for everything downstream, killing the rest of the chain.

### 1.2 — The fix: resolve every stage DIRECTLY from the current doc, reactively

Stop the hop-by-hop render-cascade. The `flow-link-map.ts` already contains **direct edges from the current doc to most stages** (`Sales Order → Sales Invoice` at `:256`, `→ Delivery Note` at `:214`, `→ Work Order` at `:187`; `Sales Invoice → Payment Entry` at `:267`). Rewrite `useFlowChain` so that, for the current doctype, it resolves **each other stage independently** via its own link-map edge keyed off the **current doc's name** (a fixed set of `useFrappeList` calls, one per stage, all anchored on `name` — Rules-of-Hooks safe, all reactive because each reads its own `q.data` directly, no mutated array).

- For stages with a **direct edge** from the current doc (the common case): query that edge with `anchor = name`. Reactive, single hop, no cascade.
- For stages reachable only **two hops** away (e.g. on a Sales Order, the Payment Entry is referenced from the SI, not the SO): do a **genuine reactive two-stage** resolution — stage B's query reads stage A's resolved name **from `qA.data` directly** (not from a mutated array), so React re-renders and enables stage B when A resolves. This is the ONLY place a cascade is allowed, and it must be data-driven, not mutation-driven.
- Build `stageStatuses` from the live query results each render; feed `resolveFlowChain`. `isLoading` = any *enabled* query still loading (so skeletons render — Part 3).

**Acceptance:** standing on a Sales Order that has a submitted SI, the rail shows **Invoice = completed with the SI name** and **Payment = next**; standing on a paid SI, the rail shows **Payment = completed**, no "Create Payment Entry" prompt. Verified against the live docs in Part 8 (items 2-3).

### 1.3 — CRM upstream party resolution (close the 2N known gap)

For `Quotation → Customer/Lead`, `Opportunity → Customer/Lead`, `Lead → Opportunity`, the `header_link` pattern currently verifies the *to*-doctype by **name**, but the link lives in the *from* doc's `party_name`/`quotation_to`. The hook must **read the current doc's header field** (`party_name`, `quotation_to`, `lead`/`converted_to`, etc.) and resolve the upstream party from that value. Add this as a first-class capability of the rewritten hook (fetch the current doc once, read its header back-pointers) — NOT as per-page `extraResolutions` hacks on 3 pages. The Customer/Lead stage must light up on a Quotation that was raised for a known customer.

### 1.4 — FlowRail next-action + CrossFlow must agree (one source of truth)

Both surfaces already read `flow-link-map.ts`; the bug is they consume it through different resolvers. After 1.2, **CrossFlowActionsMenu** (`components/cross-flow/CrossFlowActionsMenu.tsx`) must derive its "View vs Create" decision from the **same `useFlowChain` result** the rail uses (pass it down or share the hook), so a resolved downstream doc renders **"View <Doc>"**, never "Create" a second one. **FlowRail next-action logic** (now editable per §0): when the immediate downstream stage is already `completed`, the "Up next · Create" bar must advance to the next *unbuilt* stage or disappear — never offer to create a doc that exists. Kill the "create the SI again" and "create PE while paid" prompts at the logic level.

**DoD Part 1:** SO↔SI↔PE and the full Lead-to-Cash chain resolve bidirectionally on every detail page; CrossFlow and FlowRail never disagree; no "create again" prompt for an existing downstream doc; CRM upstream party lights up. RTL test renders a detail page with a mocked resolved chain and asserts completed-stage names + absence of duplicate-create CTAs.

---

## PART 2 — Financial Reports P0 (blank → populated)

**Root cause (verified against the live Frappe traceback in the 2N logs):** `app/api/accounting/reports/[report]/route.ts` sends the **same filter shape to all four reports** — `from_date`/`to_date` (`buildReportFilters`, `:94-101`). But ERPNext's **Profit & Loss Statement** and **Balance Sheet** are *financial-statement* reports: `financial_statements.get_period_list → validate_dates(period_start_date, period_end_date)` requires **`fiscal_year`, `period_start_date`, `period_end_date`, `periodicity`** (and `filter_based_on`). They ignore `from_date`/`to_date` → dates are null → `frappe.throw("From Date and To Date are mandatory")` → blank. AR/AP use a *different* shape entirely (`report_date` + ageing ranges).

### 2.1 — Per-report filter mapper

Replace the one-size `buildReportFilters` with a **per-report** builder:
- **Profit and Loss Statement / Balance Sheet:** `{ company, fiscal_year, period_start_date, period_end_date, periodicity, filter_based_on: "Date Range", accumulated_values, cost_center?, project? }`. Derive `fiscal_year` from the active company's default if not supplied; derive `period_start_date`/`period_end_date` from the period selector (map the UI's from/to → these keys).
- **Accounts Receivable / Accounts Payable:** `{ company, report_date, ageing_based_on: "Posting Date", range1: 30, range2: 60, range3: 90, range4: 120 }`.

Send a **valid default** when the UI hasn't picked a period yet (current fiscal year for statements, today for AR/AP) so the first paint is populated, not an error.

### 2.2 — Period selector → URL → refetch (close 2N known gaps #3/#9)

The period dropdown currently changes local state but never re-queries. Wire the selector so changing the period updates the query params (or the hook's filter key) and **refetches**. `use-frappe-report.ts`'s query key already includes the filters — the gap is the selector not pushing its selection into those filters. Make period changes observable.

### 2.3 — Column mapping robustness (2N gap #2)

`FinancialReportView` heuristically picks label/amount columns. Keep the heuristic but add explicit handling for the financial-statement shape (account tree with `indent`, period columns) vs the AR/AP shape (party + ageing buckets). Don't fall back to "last column" silently — if no amount column matches, surface a small diagnostic rather than a wrong number.

**DoD Part 2:** all four reports render **real populated tables** from the live Frappe instance (P&L revenue/expense tree, BS asset/liability tree, AR/AP aged party rows); changing the period refetches; no `417` / blank / "An unexpected error occurred." Verified in Part 8 item 13.

---

## PART 3 — Skeletons everywhere (loading contract)

**The 2N report claimed skeletons; the live test shows blank panels** on FlowRail, CrossFlow modals, and procurement flows. Establish a standing loading contract and apply it:

- Every async surface renders a **shimmer skeleton** (never a spinner, never a blank panel) while `isLoading`: FlowRail (already has one — confirm it actually shows now that `useFlowChain.isLoading` is correct after Part 1), **CrossFlowActionsMenu**, **WhatsNext**, the **report views**, the **dashboards/module hubs**, and the **Quick-Add / Cross-Flow modals** during their fetch.
- Skeleton shape must approximate the loaded content (rows for tables, node ribbon for the rail), per the premium-UI standard.
- After Part 1, the reason FlowRail was "disabled/blank" should be gone (the hook now reports loading correctly and then resolves) — but verify CrossFlow and procurement (MR/PO/PR) detail pages specifically.

**DoD Part 3:** hard-refresh any detail page → all sidebar/flow surfaces show skeletons on first paint, then content. No blank panels, no spinners. Part 8 item 4.

---

## PART 4 — Dashboard Upgrade (good → enterprise)

Kidus signed off the 2N dashboards on UI and guardedness (no AI/perf slop — **keep it that way**), but they're thin. **Upgrade on top of the current implementations** (do not rebuild from scratch):

### 4.1 — Global Dashboard (`components/dashboard/GlobalDashboard.tsx`)
Add, all from **real `useFrappeList` aggregates** (no fabrication, no slop labels):
- **Charts/graphs:** revenue trend (monthly, from submitted SIs), sales vs purchases, cash position. Use a charting lib already in the stack if present; otherwise a lightweight, theme-token-styled chart (OKLCH only — no off-palette).
- **Notification/alert tiles with CTAs:** **low-stock items** (Bin qty < reorder level → "Create Material Request"), **unpaid invoices** (outstanding > 0 → "Receive Payment"), **overdue invoices/POs**, **drafts needing submit**. Each tile is actionable — clicking routes to the filtered list or the create flow.
- **Projections:** simple, honest forward-looking tiles (e.g. expected receivables from due dates, open-order value) — labeled as estimates, not "AI predictions."
- **More CTAs:** quick-create row for the common docs.

### 4.2 — Per-module hubs (`components/dashboard/ModuleHub.tsx` + the 6 `/<module>/dashboard` pages)
The user has **v3 per-module dashboards** he wants upgraded into these hubs with a **unified UI** (one ModuleHub shell, consistent KPI row + quick actions + recent + alerts). Bring each module hub (CRM, Sales, Inventory, Buying, Manufacturing, Accounting) to parity: real KPIs, module-specific alert tiles (e.g. Manufacturing → WOs behind schedule; Buying → POs pending approval), recent records, and quick actions. Same chrome across all six.

**Anti-slop (hard):** semantic OKLCH tokens only; no `bg-${x}` dynamic Tailwind; no "Prediction Engine"/"Performance"/"AI" gimmick labels; no fabricated counts. Every number traces to a real query.

**DoD Part 4:** Global + 6 hubs show charts, actionable alert tiles, and real aggregates; cross-check one count against its list (Part 8 items 11-12); dual-theme + 375px clean.

---

## PART 5 — Manufacturing Automation (one-click production)

**New capability Kidus requested:** automate most of the MFG flow so an operator doesn't hand-build stock entries.

### 5.1 — Work Order "Start Production" → automatic material transfer
On a submitted Work Order, **"Start Production"** (currently routes to a prefilled SE wizard — 2N Part 4.2) becomes a **single-modal action**:
- Open a **confirmation modal** that auto-computes the required raw materials from the WO's BOM (the `Material Transfer for Manufacture` items + qty, source→WIP warehouse), shows a **concise summary of what will happen** ("Transfer 200 × Raw Paper from Stores → WIP; 5 × Ink from Stores → WIP"), and on confirm **creates + submits the Stock Entry** automatically (one click, no wizard).
- Honor **B3 idempotency** (`lib/flows/idempotency.ts`): guard against double-transfer for the same WO.

### 5.2 — Low-stock → guided MR or Reconciliation
If any required material is **short** when "Start Production" is pressed, **do not dead-end**. Detect the shortfall (Bin qty < required) and route through the existing **GuidedError** pattern (B5) to the **correct ERPNext flow**:
- Shortfall that needs **procurement** → "Create Material Request" (prefilled with the short items/qty) — the standard `INSUFFICIENT_STOCK` resolution.
- Stock **exists but is mis-counted** (system says short, operator knows it's there) → offer **Stock Reconciliation** (prefilled) to correct on-hand.
- Pick the flow that matches the situation; never offer an action the workflow forbids (B5 action rule).

### 5.3 — "Finish Production" → automatic manufacture entry
**"Finish Production"** (2N Part 4.2) becomes a single-modal action that auto-creates + submits the **`Manufacture` Stock Entry** (consume WIP, produce FG into the FG warehouse, per BOM), with a summary of the FG produced and materials consumed. Idempotency-guarded.

### 5.4 — Automate the rest of the MFG spine where safe
Where a step is mechanical and unambiguous (WO → MR for shortfalls, WO status transitions on SE submit), automate with a summary-on-confirm modal rather than a manual multi-step wizard. **Always show what was done** (the summary), and **always leave an undo path** (the created docs are visible/cancellable). Do not auto-submit anything financial without a confirmation modal.

**DoD Part 5:** from a Work Order, one click transfers materials (or guides to MR/Reconciliation on shortfall) and one click finishes production, each with a summary modal and idempotency. Part 8 item 15.

---

## PART 6 — Carry-forward fixes

- **6.1 — PE list stale status (2N-1.5 NOT fixed).** Kidus clarified this is a **list-page** bug, not detail: `/accounting/payment-entry` shows **Draft for a submitted PE** (e.g. ACC-PAY-2026-00002). The detail page is correct; the mapping (`payment-entry/page.tsx:59-61`) is correct. It's **stale cache** — the submit mutation doesn't invalidate the list query. 2N touched `useFrappeMutation` (`:140-153`) but it didn't take for the list. Verify the list query key actually matches what `invalidateQueries` targets (the API-path key vs the doctype key) and that **submit/cancel** both invalidate the **list** query with `refetchType: "all"`. Reproduce against a real submitted PE in the list.
- **6.2 — Dead-code cleanup (2N gap #8).** `app/accounting/purchase-invoice/[name]/page.tsx` has a disabled `useFrappeList` for `purchaseOrders` (`enabled: false`, "Placeholder") and an unused `loadingPO` — now fully dead since `useFlowChain` handles PO resolution. Remove it.
- **6.3 — PE submitted-stage display (2N gap #5).** After Part 1, a submitted PE (terminal stage) should read sensibly on the rail (completed when the flow is done), consistent across detail pages.
- **6.4 — Sweep the remaining 2N KNOWN GAPS** (#1 CRM upstream → covered by 1.3; #4/#5 → covered by Part 1; period sync → Part 2). Confirm each is closed, or disclose honestly if not.

---

## PART 7 — Tests

Per `MESH_REPORTING_CONTRACT` rule (tests assert real rendered components, not literals):
- **Flow resolution (Part 1):** render a detail page (or the `useFlowChain` consumer) with mocked `useFrappeList` returns for a real chain (SO with SI + PE); assert the rail shows completed SI/PE names and **no** duplicate-create CTA. Add a **forward-and-backward** resolution case (this is the test that would have caught the 2N defect).
- **Report filters (Part 2):** assert the per-report filter mapper emits `period_start_date`/`period_end_date`/`fiscal_year`/`periodicity` for P&L/BS and `report_date`/ranges for AR/AP.
- **MFG automation (Part 5):** assert the Start/Finish modals build the correct SE payload (purpose, items from BOM, warehouses) and the shortfall path routes to MR/Reconciliation.
- **PE list invalidation (Part 6.1):** assert submit invalidates the list query key.
- Keep the existing **FlowRail href** RTL test and the **FlowRail-export** regression guard (`cb7de20` must stay in tree) green.

---

## PART 8 — MANUAL LIVE-RETEST CHECKLIST (Kidus runs this; you fill it in for what you changed)

Each step: route/URL → action + values → expected → failure string to watch.
1. **SO→SI connection (1.1/1.4)** — open an SO that has a submitted SI → rail shows **Invoice = completed with the SI name**, Payment = next; CrossFlow shows **"View <SI>"**, not "Create Sales Invoice". → Fail: `0/8`, Invoice "Not started", or a re-create prompt.
2. **Paid SI stops prompting (1.1/1.4)** — open a fully-paid SI → rail shows **Payment = completed**, SO/Customer upstream lit; no "Create Payment Entry". → Fail: prompts a PE while paid, or no SO/Customer link.
3. **Full Lead-to-Cash chain (1.1/1.3)** — walk an order with Customer→Quotation→SO→…→PE → each created stage is completed with its doc name; CRM party lit. → Fail: any created stage shows "Not started".
4. **Skeletons (Part 3)** — hard-refresh any detail page → FlowRail/CrossFlow/WhatsNext show skeletons then content. → Fail: blank panel or spinner.
5. **Reports populated (Part 2)** — `/accounting/reports/profit-and-loss` (+ balance-sheet, AR, AP) → populated table; change the period → refetches. → Fail: blank / `417` / "From Date and To Date are mandatory".
6. **PE list status (6.1)** — submit a draft PE → `/accounting/payment-entry` → that row shows **Submitted**. → Fail: still "Draft".
7. **Dashboard upgrade (Part 4)** — `/dashboard` → charts + actionable alert tiles (low stock, unpaid, overdue); click a tile → routes correctly. → Fail: no charts, dead tiles, or any slop label.
8. **Module hubs unified (Part 4.2)** — each `/<module>/dashboard` → consistent chrome, real KPIs + module alerts. → Fail: divergent UI or fabricated numbers.
9. **MFG Start Production (5.1/5.2)** — Work Order → "Start Production" → modal summarizes the transfer → confirm creates+submits the SE; if short, guided to MR/Reconciliation prefilled. → Fail: dead button, no summary, or a raw wizard.
10. **MFG Finish Production (5.3)** — Work Order → "Finish Production" → modal summarizes FG/consumption → confirm creates+submits the Manufacture SE. → Fail: dead button or no entry.
11. **Idempotency (5.1/5.3)** — double-click Start/Finish → no duplicate Stock Entry. → Fail: two SEs.
12. **Dual-theme + 375px + reduced-motion** — dark mode, 375px, reduced-motion across the new dashboard/report/MFG/flow surfaces → token-correct, skeletons intact, no jank. → Fail: off-palette color or animation jank.

---

## Appendix — Phase 2P preview (Day 2: Enterprise Readiness + SME Ship)

Written in full once 2O is co-signed; previewed here so the whole 2-day path is visible.
- **2P.1 Full RBAC** — land B1(a)/B2: real `lib/auth/resolve-user.ts`, per-user scoped Frappe client (session-cookie forwarding), role-gated UI (hide/disable by permission) + API guards. Keep the AI slot reserved + RBAC-gated.
- **2P.2 Email integrations** — outbound transactional email (send Quotation/SO/Invoice/Payment receipt to party) + notification email (approvals, overdue) via Frappe's email infrastructure.
- **2P.3 Push notifications** — web-push transport over the existing Notifications Center store (approval needed, payment received, low stock, doc submitted).
- **2P.4 SME plug-and-play onboarding** — guided first-run setup (company / chart of accounts / first user / sample data), minimal-training empty states with CTAs, dashboards as home.
- **2P.5 Confirmed E2E** — full Lead-to-Cash + Procure-to-Pay + Plan-to-Produce run on the VPS instance, documented.
- **2P.6 Production wiring** — API-key config + packaging to plug into the printing-business pilot repo (single VPS instance; DB-per-tenant is v4.1).
- **Deferred to v4.1 (B11(d), disclosed):** Quality Inspection, Product Bundle, Activity Log doctype; Project + HR polish only if 2P has runway.

---

## Build order (commit-per-part)
1. `fix(2O)` Part 1 — flow-resolution rewrite (hook + CrossFlow agreement + FlowRail next-action logic). **DO FIRST; biggest blast radius.**
2. `fix(2O)` Part 2 — per-report filter mapper + period→refetch.
3. `feat(2O)` Part 3 — skeleton contract on all flow surfaces.
4. `feat(2O)` Part 4 — dashboard upgrade (global + 6 hubs).
5. `feat(2O)` Part 5 — MFG automation (Start/Finish modals + shortfall guidance).
6. `fix(2O)` Part 6 — carry-forward (PE list invalidation + cleanups).
7. `test(2O)` Part 7 — tests.

**End your report with Part 8 filled in. Honest KNOWN GAPS over false ✅s.**
