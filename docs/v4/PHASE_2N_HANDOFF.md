# PHASE 2N HANDOFF — Dashboards · Financial Reporting · Manufacturing v4 · Stabilization

> **READ `docs/v4/MESH_REPORTING_CONTRACT.md` FIRST AND LAST.** Every claim in your
> completion report is audited against the real tree (`git show`/`grep`/`read`), not your
> DoD table. Claim = code = diff. No orphan abstraction modules, no `__init__.ts`, honor
> every guardrail, tests assert against real rendered components — not literals.
>
> **Dev-server ownership (Contract v1.1):** you do **NOT** run a dev server and must never
> report live results you didn't produce. **Kidus runs the dev server and does the live
> retest manually.** You **ALWAYS** end your report with the ordered MANUAL LIVE-RETEST
> CHECKLIST in Part 6 (route → action+values → expected → failure string), filled in for
> exactly what you changed.

- **Branch:** `feat/v4-phase-2n-dashboards-reporting-mfg` (already cut off `develop` `335df8b`, pushed). Commit onto it.
- **Merge target:** `develop` (Brain merges after Kidus's live retest). `main` stays at `dede055`.
- **Scope:** ONE large progressive unit, four parts, strictly ordered. Part 1 (stabilization) is the prerequisite — the dashboards and reporting consume the data layer it repairs.
- **Golden templates to clone (do not reinvent):** detail/master = `app/crm/customer/[name]/page.tsx`; transactional wizard = `app/sales/sales-order/new/page.tsx` + `app/sales/sales-order/[name]/page.tsx`; sidebar chrome = the **B1** pattern (`bg-card rounded-2xl shadow-sm shadow-black/5 border-border/40 p-6`).
- **FlowRail is BRAIN-OWNED.** `components/flows/FlowRail.tsx` was just redesigned by the Brain (commit `cb7de20`). **Do NOT edit its markup.** You only change *what data feeds it* (the `result`/`isLoading` props). The Part 1.1 unified hook is a data-layer change; FlowRail's JSX is untouched. The Part 5 regression test must confirm FlowRail still exports unchanged.
- **Premium-UI bar (hard stops):** OKLCH semantic tokens only — no `text-indigo-600`, no `bg-emerald-500/5`, no **dynamic** Tailwind (`bg-${x}` does not compile). No `bg-white`/`bg-black`. No `rounded-[2.5rem]`/`shadow-2xl`/black borders. Skeletons, not spinners. Dual-theme + 375px + reduced-motion before "done."

---

## Build order (commit boundaries)

1. **Commit 1 — Part 1.0** (Item/Supplier-360 crash). Isolated, independently retestable; unblocks the two new master pages.
2. **Commit 2 — Part 1.1** (unified flow resolution). The architectural centerpiece; everything cross-flow depends on it.
3. **Commit 3 — Parts 1.2–1.6** (remaining stabilization).
4. **Commit 4 — Part 2** (Global Dashboard + module hubs).
5. **Commit 5 — Part 3** (Financial Reporting).
6. **Commit 6 — Part 4** (Manufacturing v4 refactor).
7. **Commit 7 — Part 5** (tests).

Do not collapse all parts into one commit — the per-part boundaries are how Kidus retests and how the Brain audits.

---

# PART 1 — STABILIZATION (fold-forward from the 2M live retest)

Every item below is a confirmed root cause, verified in-tree by the Brain at `335df8b`. The
file:line anchors are exact.

## 1.0 — Item-360 & Supplier-360 crash on load (Rules of Hooks) — DO FIRST

**Symptom (live):** opening `/stock/item/<code>` or `/buying/supplier/<name>` throws
*"React has detected a change in the order of Hooks called by ItemMasterHub / SupplierMasterHub."*

**Root cause:** `useFrappeDelete` is called **after** the early returns.
- `app/stock/item/[name]/page.tsx:300` — `const deleteMutation = useFrappeDelete("Item", …)` sits below the guards at `:290` (`if (isLoading) return <SkeletonDetail />`) and `:291` (`if (error || !item) return …`).
- `app/buying/supplier/[name]/page.tsx:403` — same: `useFrappeDelete("Supplier", …)` below the guards at `:393`/`:394`.

On the first render (`isLoading === true`) the component returns before reaching the delete
hook; on the next render it calls it → hook count changes → React throws. The error log's
"60. useMemo → 61. undefined→useContext" is exactly `stockKpis` (last legal hook) followed by
the now-extra delete-mutation hooks.

**Fix:** move the `deleteMutation` hook (and **any** other hook) **above** both early returns —
up with the other top-level hooks, before any conditional `return`. This is the iron Rule of
Hooks: *all hooks run unconditionally, every render, before any branch that can return.* Grep
both files (and every other `[name]/page.tsx`) for any `use*(` that appears after an early
`return` and lift it. Add a guard test (Part 5) that renders `ItemMasterHub` with a loading
mock then a data mock — it must not throw.

## 1.1 — Unified flow resolution (`useFlowChain`) — the centerpiece

**Symptoms (live, all one root cause):** "flow rail is just disabled in every doc except
SI→PE"; "created an SI from an SO, went back to the SO, cross-flow prompts me to create it
again"; "2 of 8 stages complete — at current stage even though the invoice was paid, it still
prompts to create a PE"; "no skeletons on FlowRail or cross-flow."

**Root cause — there are two parallel, incomplete resolution systems:**
1. **FlowRail** is fed a `stageStatuses` map that each detail page *hand-builds*, resolving
   only its immediate neighbors. `app/sales/sales-order/[name]/page.tsx:94-120` resolves
   Quotation (upstream) + Work Order (downstream) and **nothing past Work Order** — so the
   Delivery Note / Sales Invoice / Payment Entry stages stay `pending` forever even after they
   exist. Most other pages pass an even smaller map (or none), so the rail looks "disabled."
   `lib/flows/flow-chain-resolver.ts:184` `resolveStageStatuses()` is literally a `return {}`
   stub ("In production, this would query Frappe for linked documents").
2. **CrossFlowActionsMenu** does its *own* per-edge back-link query
   (`components/cross-flow/CrossFlowActionsMenu.tsx:176`) via `lib/flows/flow-adjacency.ts`.
   It only short-circuits to "View" when `edge.backLink` finds a record. For edges whose link
   lives on a child row, the filter must target the child doctype (2L closed SO→DN / DN→SI /
   SI→PE / RFQ→SQ this way) — but forward chains beyond one hop, and any edge whose backLink is
   missing, fall through to "Create" → duplicate prompt.

The two systems disagree, which is why SI→PE "works" (the PE references table reliably links
the SI) while SO→SI doesn't.

**Fix — one source of truth, consumed by both surfaces:**

**(a) New `lib/flows/flow-link-map.ts`** — a declarative map of how to resolve the document at
each ordered pair of doctypes in a flow. **Do not invent Frappe semantics — consolidate the
link definitions that already exist** in `flow-adjacency.ts` (the `backLink` filters closed in
2L) and the per-page `useFrappeList` resolutions (e.g. SO page `:68-120`). Each entry:

```ts
// from → to, and how to find the `to` document given the `from` document's name
interface FlowLink {
  from: string;            // e.g. "Sales Order"
  to: string;              // e.g. "Sales Invoice"
  // where the back-reference lives:
  queryDoctype: string;    // the doctype (or child doctype) to filter — e.g. "Sales Invoice Item"
  field: string;           // the field holding the `from` name — e.g. "sales_order"
  returnParent: boolean;   // true when queryDoctype is a child table (return row.parent)
}
```

Cover every edge in the three live flows (Lead-to-Cash, Procure-to-Pay, the manufacturing
spine). Header links use `returnParent:false` (e.g. `Work Order.sales_order`); child-table
links use `returnParent:true` (`Sales Invoice Item.sales_order`, `Sales Invoice Item.delivery_note`,
`Payment Entry Reference.reference_name`). These exact filters already exist — lift them, don't
re-derive.

**(b) New `hooks/flows/use-flow-chain.ts`** — `useFlowChain(doctype, name)` returns
`{ result: FlowChainResult, isLoading: boolean }`:
- Get the flow definition (`getFlowForDocType`).
- **Walk outward from the current stage.** Anchor on the current doc; resolve each adjacent
  stage from the nearest already-resolved document name via the link map, gating each
  `useFrappeList` on `enabled: !!anchorName` so it fires only once its anchor is known. Build
  the full `stageStatuses` map (status `completed` for resolved stages, `current` for this doc,
  `pending` for genuinely-absent ones), then call the existing `resolveFlowChain(doctype, name,
  stageStatuses)`.
- `isLoading` = any query in the walk still in-flight.
- Respect React's rules — a fixed number of hooks. The flow length is static per doctype, so
  build the per-stage queries from the (stable) flow definition; do **not** call hooks in a
  variable-length loop driven by runtime data.

**(c) Rewire every detail page.** Replace each page's hand-rolled `stageStatuses` block +
`resolveFlowChain(...)` call with:
```ts
const { result: chain, isLoading: chainLoading } = useFlowChain("Sales Order", name);
…
<FlowRail result={chain} currentDocName={name} sourceDoctype="Sales Order" isLoading={chainLoading} />
```
Delete the now-dead per-page resolution (e.g. SO `:68-120`). All 17 transactional detail pages.

**(d) CrossFlowActionsMenu shares the same truth.** Refactor `flow-adjacency.ts` /
`CrossFlowActionsMenu` so existing-record detection reads the **same `flow-link-map.ts`** the
hook uses (or consumes the resolved `useFlowChain` result directly). The "View vs Create"
decision must be identical to what FlowRail shows — no second opinion. After this, standing on
an SO that already has an SI shows "View SI-…", not "Create Sales Invoice", on **both** surfaces.

**(e) Skeletons.** Because `isLoading` now flows from the hook, FlowRail's existing skeleton
and CrossFlow's `isLoading` skeleton (`CrossFlowActionsMenu.tsx:79`) finally render. Pass
`isLoading` to `<WhatsNext>` too where the page already loads async. Verify on first paint the
three sidebars show skeletons, not blank panels.

> **Guardrail:** do not touch `FlowRail.tsx` markup. This entire item changes only the *data*
> feeding it.

## 1.2 — Quick-Add double label + double field registration (global)

**Symptom (live, screenshot):** the Quick-Add Customer modal shows "Customer type *" then a
second "Customer type" above the select. Same on Supplier — it's global to every select field.

**Root cause:** `components/quick-add/QuickAddModal.tsx` `QuickAddFieldRow` (`:216-264`) wraps
every field in a `FormField`→`FormItem` that renders its own `labelEl` (`:223-237`), **and** for
`select` fields it then renders `<FormSelect … label={field.label} />` (`:240-246`), which
renders **its own** label via `DataField` (`components/form/form-select.tsx:77`). Two labels;
also two nested `FormField` registrations on the same `name` (the outer one + FormSelect's
internal one) — a latent RHF bug.

**Fix:** branch at the top of `QuickAddFieldRow`. For `select`, render `FormSelect` **standalone**
— it already provides label + required asterisk + message via `DataField`/`FormItem`:
```tsx
if (field.type === "select" && field.options) {
  return (
    <FormSelect control={control} name={field.name} label={field.label}
      required={field.required} placeholder={field.placeholder} options={field.options} />
  );
}
```
Keep the existing `FormField` + `labelEl` + `Input` wrapper **only** for the text branch. This
removes both the duplicate label and the duplicate registration.

## 1.3 — Quick-Add: richer field set + modal polish

**Ask (live):** "bring up the number of fields" and "make the modal look better."

- **More fields:** extend the per-doctype field sets in `lib/flows/quick-add-registry.ts` so the
  most-used create fields are present inline (not just name + type). Customer: add
  `customer_group`, `territory`, `mobile_no`/`email_id` (optional). Supplier: add
  `supplier_group`, `country`, `mobile_no` (optional). Keep the modal short — required fields
  first, 2-4 optional. Reuse `FormFrappeSelect` for the link-typed ones (Customer Group, etc.)
  so they load real options. **Prereq:** these still POST through the same `*CreateSchema`s — keep
  the optional ones `.optional()` so Quick-Add doesn't trip the over-strict-schema class.
- **Polish:** the modal already uses glass chrome (`QuickAddModal.tsx:151`). Tighten field
  spacing to `space-y-4`, ensure the select trigger matches the input height (`h-12 rounded-xl`),
  and verify dual-theme. No black borders.

## 1.4 — Loading skeletons everywhere (folded into 1.1)

Covered by 1.1(e): FlowRail, CrossFlowActionsMenu, and WhatsNext must render their skeletons on
first paint, driven by the `isLoading` from `useFlowChain` / the page's async load. Confirm no
sidebar renders blank or with a bare spinner.

## 1.5 — Payment Entry list shows "Draft" for a submitted PE (global stale-cache)

**Symptom (live):** submitted `ACC-PAY-2026-00002`; the detail page shows "Submitted" but the
list page still shows "Draft."

**Root cause:** the mapping is correct — `app/accounting/payment-entry/page.tsx:59-61` derives
Draft/Submitted/Cancelled from `docstatus`, and `docstatus` is in the fetch fields (`:246`). So
the list is serving a **stale cached** `docstatus=0`: the submit mutation on the detail page
never invalidates the list query.

**Fix:** ensure the submit/cancel mutations invalidate the list query key for that doctype.
Audit this **globally** — every detail-page submit/cancel/delete must
`queryClient.invalidateQueries` the list key (the same `[doctype]` / `getApiPath(doctype)` keys
QuickAdd already invalidates at `QuickAddModal.tsx:123-125`). Prefer fixing it once in the
generic `useFrappeUpdate`/submit mutation (`hooks/generic/useFrappeMutation.ts`) so every
doctype benefits, rather than per-page. Verify on PE, then SO and SI.

## 1.6 — Guided error needs action buttons on "must be submitted"

**Symptom (live):** creating a PE against a draft SI surfaces *"Sales Invoice
ACC-SINV-2026-00007 must be submitted"* — correct, but the dialog has no action button / no way
to go fix it. "The error is correct, I just needed an action button."

**Fix:** add a resolver strategy in `lib/errors/frappe-error-resolver.ts` for the
"must be submitted" / "is not submitted" Frappe message class — `LINKED_DOC_NOT_SUBMITTED`.
Parse the referenced doctype + name out of the message (you already parse names for
`LINKED_DOC_EXISTS`), and surface a **navigate** action ("Open Sales Invoice ACC-SINV-… to submit
it", `href` → the SI detail) plus Dismiss. Reuse the existing `ResolutionAction.href` →
notification-store plumbing. No `()=>{}` no-ops.

---

# PART 2 — GLOBAL DASHBOARD + MODULE HUBS (master §4.2 + §4.1)

**Current state:** `components/dashboard/GlobalDashboard.tsx` is a **fabricated mockup** — it
must be rebuilt on real data, not polished. Confirmed fabrications to remove: hardcoded revenue
`1240500` (`:365`); the "Enterprise v3.0" badge (`:275`); fake "Active Users 24 / Open Tasks 12 /
System Load Low" tiles (`:304-340`); the fake Audit Log ("John Doe", "Global Tech", "Acme Corp",
`:511-543`); the fake "Infrastructure / Prediction Engine" panel (`:605-654`); `leads?.length ?
"150+" : "156"` placeholder counts (`:251-254`). It also violates the premium bar:
`text-indigo-600`/`bg-emerald-500/5` literals, `bg-${sys.color}` **dynamic** classes that don't
compile, and `rounded-[2.5rem]`/`rounded-[2rem]`.

## 2.1 — Global Home Dashboard (`app/dashboard/page.tsx` → rebuilt `GlobalDashboard`)

Build the §4.2 layout on **real `useFrappeList` aggregates** (the same rollups Customer-360 /
Supplier-360 use):
- **Today's Focus** band: real counts — orders needing attention (SO `docstatus=0` or
  `status="To Deliver and Bill"`), unpaid invoices (SI `outstanding_amount > 0`), WO in progress
  (`status="In Process"`), deliveries scheduled. Each tile links to the filtered list.
- **KPI row:** Revenue (Σ submitted SI `grand_total`, current month), Receivables (Σ SI
  `outstanding_amount`), Stock value (Σ Bin `actual_qty × valuation_rate` — reuse the Item-360
  `stockKpis` helper, extracted to `lib/kpi/`), Open Orders (count SO `docstatus=0`). Real
  trend only if you can compute it from data; otherwise omit the trend chip — **no fake trends.**
- **Module grid:** one card per module with **real** counts (Leads, SO, Items, WO, PO, Invoices)
  via `useFrappeList`. Each card links to that module's **hub** (Part 2.2), not a list.
- **Reserve, do not build, the AI slot.** §4.2 shows an "AI Assistant" panel — AI is Phase 3,
  gated behind RBAC. Leave a tasteful "Coming soon" placeholder or omit; do **not** wire a chat.

Counts: if `useFrappeList` has no count mode, add a small `useFrappeCount(doctype, filters)`
factory hook (thin wrapper over the list endpoint's total, or a `limit:0`/count call) — **one**
reusable hook, not per-page logic. Premium-UI: OKLCH tokens, `rounded-2xl`/`rounded-3xl` max,
B1-style cards, staggered entrance, real skeletons while loading.

## 2.2 — Module Hub Dashboards (§4.1) — new

Create a hub page per module at `/{module}/dashboard`:
`crm`, `sales`, `stock`, `manufacturing`, `buying`, `accounting`. Each = KPI row (module-specific
real aggregates) + Quick Actions (links to the module's `/new` wizards and lists, reuse
`components/dashboard/ActionCard.tsx`) + Recent + Alerts (recent docs via `useFrappeList orderBy
modified desc limit 5`; overdue via the relevant filter). Use `KPICard`/`ActionCard`/`FlowStatus`
(verify they're real and OKLCH-clean; fix if they carry the same fake/off-palette issues). Wire
the sidebar (`components/Layout/Layout.tsx`) so each module's parent entry links to its hub, and
fix the GlobalDashboard module cards (`:429` etc.) to point at `/{module}/dashboard`.

---

# PART 3 — FINANCIAL REPORTING (greenfield)

No report API exists. Build read-only financial statements that proxy ERPNext's **own** standard
reports (do not re-derive accounting in TS).

## 3.1 — API routes

`app/api/accounting/reports/[report]/route.ts` (createGetHandler-style). Server-side, call
Frappe's query-report runner via the existing client:
```ts
frappeClient.call.get("frappe.desk.query_report.run", { report_name, filters: JSON.stringify(filters) })
```
Map UI report keys → ERPNext report names:
- `profit-and-loss` → **"Profit and Loss Statement"**
- `balance-sheet` → **"Balance Sheet"**
- `accounts-receivable` → **"Accounts Receivable"**
- `accounts-payable` → **"Accounts Payable"**
- (P2, optional) `trial-balance` → **"Trial Balance"**, `general-ledger` → **"General Ledger"**

Filters always include `company` (`getActiveCompany()`, default "Pana") and the period
(`from_date`/`to_date` or `fiscal_year` + `periodicity`). Return the report's `columns` + `result`
normalized to a typed shape. Handle Frappe errors through the existing `frappeClient.handleError`
so failures surface as guided errors, not raw 500s. **Be honest in your report if a given
report_name/filters combo can't be verified without a live Frappe** — that's a checklist item for
Kidus, not a fabricated ✅.

## 3.2 — UI

Pages under `app/accounting/reports/`: `profit-and-loss`, `balance-sheet`, `accounts-receivable`,
`accounts-payable`. Each: a period/company selector header, a financial-statement table (account
rows — indented tree where the report returns one — with period/amount columns; aging buckets
0-30 / 31-60 / 61-90 / 90+ for AR/AP), totals row, and an Export (CSV) action. Thin
`hooks/accounting/use-frappe-report.ts` factory hook over the API route (TanStack Query, typed).
Reachable from the Accounting module hub (Part 2.2) **and** the sidebar (add a "Reports" group
under Accounting in `Layout.tsx`). Premium-UI, dual-theme, skeleton while the report loads,
empty-state when no data.

---

# PART 4 — MANUFACTURING v4 REFACTOR

**Current state:** 8 manufacturing pages carry `@ts-nocheck` and are pre-golden:
`work-order/[name]/page.tsx`, `work-order/[name]/edit/page.tsx`, `bom/[name]/page.tsx`,
`bom/[name]/edit/page.tsx`, and all four `operation/*` pages. The "ugly BOM UI" Kidus flagged
(`bom/new/page.tsx` — subtitle "Define a production recipe in three steps" `:252`, raw/cramped
step bodies) is a symptom of this incomplete conversion.

## 4.1 — Full v4 conversion (remove every `@ts-nocheck`)

Convert all Manufacturing pages to the golden template, the same way Quotation/Customer were
converted in 2h-followups:
- **BOM** (list/new/[name]/edit) and **Work Order** (list/new/[name]/edit): golden transactional
  pattern. Create/edit = `FlowWizard` with real per-step Zod schemas + `FieldWrap` per-field
  markers (the standing A2 gap — wire them, don't skip). Detail = `PageHeader` + StatusBadge +
  B1 sidebar + `useFlowChain` FlowRail (BOM and WO are flow stages) + WhatsNext +
  `GuidedErrorDialog` rendered on **all** mutations + SkeletonDetail. **Card-wrap the BOM step
  bodies** to match a golden wizard (diff `bom/new` step content against `sales-order/new` /
  `purchase-order/new` and bring field chrome, spacing, and `FormInput`/`FormFrappeSelect` usage
  to parity). Reconsider the BOM subtitle to match sibling wizard copy.
- **Operation** and **Workstation** (list/new/[name]/edit): these are **masters** (no flow). Use
  the master pattern (no FlowRail/auto-fill). Remove `@ts-nocheck`, real loading skeletons, B1
  sidebar where applicable, OKLCH/StatusBadge premium-UI, `getActiveCompany()` inject on
  Workstation if it carries company.
- Removing `@ts-nocheck` will surface real type errors that were hidden — fix them honestly
  (correct the types; do not re-add the suppression). `tsc --noEmit` must be 0 with zero
  `@ts-nocheck` remaining in `app/manufacturing/**`.

## 4.2 — Work Order execution spine (completes the manufacturing flow)

Wire the WO downstream actions so the manufacturing spine is reachable end to end:
- **Material transfer** — from a Work Order, "Transfer materials" creates a Stock Entry
  (`stock_entry_type="Material Transfer for Manufacture"`) prefilled from the WO required-items,
  via the cross-flow + auto-fill pattern (activate/extend the `Work Order → Stock Entry` mapping
  if dormant; only ERPNext-real edges — no invented flow).
- **Finish/Produce** — "Finish" creates the manufacture Stock Entry
  (`stock_entry_type="Manufacture"`) producing the FG qty.
- Surface these as WhatsNext / cross-flow actions on the WO detail, gated by `isModuleBuilt`.

> If time pressure forces a cut, 4.2 may ship in a follow-up commit — but say so explicitly in
> KNOWN GAPS. 4.1 (the `@ts-nocheck` removal + golden parity + BOM chrome) is **not** optional.

---

# PART 5 — TESTS (assert against real rendered code — Contract rule 6)

Add to `tests/` (RTL where a component is involved; import-and-call for helpers). No simulations,
no hardcoded literals standing in for behavior.
1. **1.0 guard:** render `ItemMasterHub`/`SupplierMasterHub` through a loading→loaded transition
   (mock the doc hook) — must not throw the hook-order error.
2. **1.1 unified resolution:** `flow-link-map` + `useFlowChain` resolve a known chain — e.g. an SO
   whose SI exists resolves the Invoice stage to `completed` with the SI name; assert FlowRail
   renders a "View SI-…" href and CrossFlow shows the same (not "Create"). Render the real
   FlowRail (keep the existing G2 rendered-href test green and unchanged).
3. **1.2:** render `QuickAddModal` for a doctype with a select field — assert the field label
   appears **exactly once**.
4. **1.5:** submitting a doc invalidates the list query (assert the invalidation call / refetch).
5. **1.6:** `resolveFrappeError` on a "must be submitted" message returns a navigate action with
   the correct `href`.
6. **Part 2:** GlobalDashboard renders real counts from mocked `useFrappeList` (assert it shows
   the mocked number, proving no hardcoded fallback).
7. **Part 3:** `use-frappe-report` parses a mocked query-report response into the typed shape.
8. **Part 4:** a converted MFG wizard gates Next on its step schema (render the real FlowWizard).

Report the before/after test count; a flat count means no real tests were added.

---

# PART 6 — ACCEPTANCE + MANUAL LIVE-RETEST CHECKLIST

## Definition of done (static — necessary, not sufficient)
- `tsc --noEmit` = 0, with **zero** `@ts-nocheck` remaining under `app/manufacturing/**`.
- `vitest run --pool=forks` green; count strictly increased (new tests landed).
- `FlowRail.tsx` markup unchanged (diff is empty); the Part 5.2 test confirms it still exports.
- No orphan modules, no `__init__.ts`, no dynamic Tailwind, no off-palette literals introduced.
- Every `showError` call still renders a `GuidedErrorDialog`.

## MANUAL LIVE-RETEST CHECKLIST (for Kidus — you do NOT run this; always include it, filled in)
Each step: **route → action + field values → expected → failure string to watch.**

1. **Item-360 / Supplier-360 load (1.0)** — `/stock/item/<code>` then `/buying/supplier/<name>` →
   page renders the 6-tab hub → *no* console error. **Fail:** "change in the order of Hooks."
2. **FlowRail full chain (1.1)** — create an SI from an SO, return to that SO → the rail shows
   Invoice as **completed with the SI name** and Payment as next; cross-flow shows **"View SI-…"**,
   not "Create Sales Invoice." **Fail:** Invoice still "Not started", or a re-create prompt.
3. **Paid invoice stops prompting (1.1)** — open an SI fully paid via a submitted PE → rail shows
   Payment completed; no "Create Payment Entry" prompt. **Fail:** "at current stage" with a PE
   create button while paid.
4. **Skeletons (1.1)** — hard-refresh any detail page with sidebars → FlowRail, cross-flow, and
   WhatsNext show skeletons on first paint, then content. **Fail:** blank panels or a spinner.
5. **Quick-Add single label (1.2)** — `/sales/sales-order/new` → open Customer dropdown → ＋ Create
   new Customer → "Customer type" appears **once**. **Fail:** label shown twice.
6. **Quick-Add richer fields (1.3)** — same modal shows the added fields (group/territory/contact);
   creating still succeeds. **Fail:** create 400s, or fields missing.
7. **PE list status (1.5)** — submit a draft PE on its detail page → go to `/accounting/payment-entry`
   → that row shows **Submitted**. **Fail:** still "Draft."
8. **Guided "must be submitted" (1.6)** — create a PE against a **draft** SI → dialog shows an
   "Open Sales Invoice …" action that navigates to the SI. **Fail:** dialog with only text/Dismiss.
9. **Global Dashboard real data (2.1)** — `/dashboard` → KPI numbers, module counts, and Today's
   Focus reflect **real** records (cross-check one count against the list). **Fail:** "156"/"v3.0"/
   "John Doe"/"Prediction Engine" still present, or numbers don't match the lists.
10. **Module hubs (2.2)** — click each module card → its `/dashboard` hub loads with real KPIs +
    quick actions + recent. **Fail:** 404 or fabricated numbers.
11. **Financial reports (3)** — `/accounting/reports/profit-and-loss` (and balance-sheet, AR, AP)
    → period selector + a populated statement table from Frappe. **Fail:** raw 500, blank, or
    "An unexpected error occurred."
12. **Manufacturing golden (4.1)** — `/manufacturing/bom/new` step bodies match the golden wizard
    chrome (card-wrapped, not raw/cramped); BOM/WO detail pages show B1 sidebar + FlowRail; no
    console type/runtime errors. **Fail:** the old cramped BOM form, or a crash.
13. **WO execution (4.2, if shipped)** — open a Work Order → "Transfer materials" / "Finish"
    create the prefilled Stock Entries. **Fail:** dead button, or no prefill. (If deferred, it's
    listed under KNOWN GAPS — skip.)
14. **Dual-theme + 375px + reduced-motion** — toggle dark mode, narrow to 375px, enable
    reduced-motion on the new dashboard/report/MFG pages → legible, token-correct, skeletons
    intact, no jank. **Fail:** off-palette color, dynamic-class gap, or animation jank.

## KNOWN GAPS
Be honest. Anything unverifiable without live Frappe (report_name/filters, WO execution POST),
anything deferred (4.2), or any half-fix — list it here. An honest gap costs nothing; a false ✅
costs the whole phase a re-cycle.

---

**BUILD COMPLETE → code-review (first pass) → Brain audit (Opus) → Kidus live retest → merge to `develop`.**
