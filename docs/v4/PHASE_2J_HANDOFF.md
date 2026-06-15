# PHASE 2J HANDOFF — 2I live-test fixes + Item Price/Price List module + test fast-follow

> **READ `docs/v4/MESH_REPORTING_CONTRACT.md` FIRST AND LAST.** Your completion report is
> audited claim-by-claim against the real tree. Quote `file:line` + before→after for every
> fix; run the dev server and report what you saw; do not claim what the code does not contain.

## Context
Phase 2I (Stock Visibility + G1–G5) was audited in-code and **co-signed** into `develop`
(`0ac0b94`) after live testing by Kidus. The G1–G5 fixes are real and stayed. Live testing
surfaced the findings below; per Kidus's direction they are bundled with one new module and
the test fast-follow into a single phase, to be **regated as a whole** after you finish.

## Base & branch
- Branch off `develop` @ **`0ac0b94`** → **`feat/v4-phase-2j-fixes-pricing`**.
- Suggested commits: (1) Part 1 F-series fixes, (2) Part 2 Item Price/Price List module,
  (3) Part 3 fast-follow tests. Separate commits per part.
- Merge target: `develop`. `main` stays at `dede055`.

## Pillars (non-negotiable)
P1 schema-first · P2 factory (reuse `useFrappe*` + `@/components/*`, **no new abstraction
layers**) · P3 lean modules (no orphan files, no `__init__.ts`) · P4 premium UI · P5 this doc
· P6 zero `@ts-nocheck`, full types.

---

# PART 1 — Live-test fixes (F-series)

Each root cause below was verified by the Brain against the tree at `0ac0b94` (`file:line`).
Fix the **root cause**, not the symptom.

## F1 — [P0] Server errors collapse to "An unexpected error occurred" (detail loss)
**This is the headline — it blocks F2 and F3.** `lib/errors/extract-frappe-message.ts`: the
`_server_messages` path maps each entry with `typeof msg === "string" ? stripHtml(msg) :
String(msg)` (≈ lines 70 & 80). When `entry.message` is an **object** (the real Frappe shape,
e.g. `{code, field}`), `String(msg)` → `"[object Object]"`; the final
`sanitizeResult(parts.join(" · "))` (line 84) then catches it and returns the generic
`"An unexpected error occurred"` — **discarding the real reason.** That is why PO create and
Stock Reconciliation both show generic text instead of the actual missing-field message.
**Fix:** when `entry.message` (or `parsed.message`) is an object, **extract a readable string
from it** before it can become `[object Object]` — check `.message` / `.error` / `.exception`
/ `.field` / `.code`, else `JSON.stringify` the meaningful subset. `sanitizeResult` stays as
the final safety net but should now rarely fire. **Test:** the `serverMessagesObjectMessage`
fixture already exists at `extract-frappe-message.ts:174` — write a real test asserting the
output contains the field/code (e.g. `"company"`), and **never** `"[object Object]"` nor the
bare generic fallback.
**DoD (live):** trigger a PO/SR rejection → the guided error shows the **actual Frappe reason**.

## F2 — [P0] Purchase Order create → 400
Live: `POST /api/buying/purchase-order 400`, dialog shows generic error (hidden by F1).
**Fix F1 first so the real reason is visible**, then audit the payload independently:
- `purchase-order/new` `onSubmit` (≈ line 220) → confirm **`company: getActiveCompany()`** is
  in the POST body (G3 removed the visible field; injection must remain) and is non-empty.
- Cross-check `PurchaseOrderCreateSchema` (`lib/schemas/doctype-schemas.ts:2117`) and Frappe PO
  mandatories: each **item** typically needs `schedule_date`/`required_by` + `warehouse`;
  header needs `currency`/`conversion_rate` (defaults present).
- `app/api/buying/purchase-order/route.ts` carries **`// @ts-nocheck`** (P6 violation) — remove
  it and fix whatever it was hiding.
**DoD:** PO create succeeds (report the created PO name) **or** shows the real guided error.

## F3 — [P0] Stock Reconciliation submit → 400
Live: generic error (hidden by F1). After F1, audit the payload:
`stock-reconciliation/new` `onSubmit` (lines 164–178) sends
`purpose/posting_date/company/items[{item_code,warehouse,qty,valuation_rate,idx,doctype}]/docstatus`.
Frappe Stock Reconciliation commonly also needs **`expense_account`** (a company "Stock
Adjustment" default, required when values change) and **`set_posting_time: 1`** when
`posting_date` is custom. The GET route's `allowedFields` already list `expense_account` and
`set_warehouse` — confirm whether create requires them; cross-check
`StockReconciliationCreateSchema` (`doctype-schemas.ts:2976`).
**DoD:** SR (Opening Stock) submits → **Stock Balance** reflects qty/value; **Stock Ledger**
shows the entry.

## F4 — [P0] Sales Invoice: `posting_date` flagged "missing" though entered
`sales-invoice/new` step1 requires `posting_date` (`flow-validation.ts:119`) and defaultValues
sets today (`page:126`), so the gate should pass on mount. User types a date and it **still**
flags missing → the date input's value is not reaching the gate's source (`useWatch`/
`getValues`). **Fix:** ensure `posting_date` (and `due_date`) are **Controller-bound** so RHF
sees the value the gate reads (same class as the historical A1/A2 gate bugs). Secondary: if the
server rejects, it needs `set_posting_time: 1`. Add a gate-flip test; re-test live.
**DoD:** entering posting_date clears the error; SI submits.

## F5 — [P0] Customer-360 "create downstream" shortcuts don't prefill
Hand-written links on `app/crm/customer/[name]/page.tsx` use params the targets don't read:
| Link (`file:line`) | Sends | Target reads | Verdict |
|---|---|---|---|
| Create Quotation `:960` | `?party_name=` | `quotation/new:125` reads `?customer=` | ❌ mismatch |
| Create Invoice `:971` | `?customer=` | `sales-invoice/new` reads only `?delivery_note=` | ❌ not read |
| Receive Payment `:976` | `?party_type=&party=` | `payment-entry/new` reads only `?sales_invoice=` | ❌ not read |
| Create Sales Order `:966` | `?customer=` | `sales-order/new` reads `?customer=`(via flow) | ✅ keep |
| Add Address `:981` / Contact `:986` | `?link_doctype=&link_name=` | both read these | ✅ keep |
**Fix:** (a) Create Quotation link param `party_name` → `customer`. (b) Make `sales-invoice/new`
and `payment-entry/new` **also** read a direct convenience param (`customer`, and
`party_type`+`party`) and prefill — Customer is not their ERPNext upstream (DN→SI, SI→PE), so
document these as convenience prefills. Verify every param against the live wizard's
`searchParams.get(...)`. **DoD:** all 6 Customer quick-actions open prefilled.

## F6 — [P0] Converted-Lead FlowRail shows "Create Customer" (sidebar says "View Customer")
`app/crm/lead/[name]/page.tsx` feeds **only** the Opportunity stage into `resolveFlowChain`
(`:85-97`). The converted state — `lead.status === "Converted" && lead.customer` (already
computed at `:109`) — is never passed into the stage statuses, so the **Customer stage stays
"pending"** and the rail's `nextBuildable` = Customer → "Up next · Customer / Create", directly
contradicting the sidebar's "View Customer". **Fix:** when converted, add a Customer stage
status `{ status: "completed", documentName: lead.customer, documentUrl:
"/crm/customer/<name>" }` to the map passed to `resolveFlowChain`, so the rail marks Customer ✓
and advances "Up next" to Quotation. **DoD:** converted lead → rail shows Customer completed,
never "Create Customer"; rail and sidebar agree.

## F7 — [P1] Notifications lost on refresh + no detail/actionable view
`lib/stores/notification-store.ts` is a module-level in-memory array (`let _notifications = []`,
`:17`) — wiped on reload/redirect. And panel items only mark-read + nav; there's no detail
showing the guided explanation + actionable steps. **Fix:** (a) **persist** the store to
`localStorage`, hydrate on load — and keep a **stable `getServerSnapshot`** so SSR of `<Layout>`
does not crash (a prior phase hit "Missing getServerSnapshot" — do not regress it); keep the
100-item cap. (b) Add a notification **detail** view: clicking an item shows title +
explanation + the resolver's actionable steps (reuse `ResolutionAction[]` / the
GuidedErrorDialog action list), with the deep-link `href` as one action; mark-read still fires.
**DoD:** notifications survive a refresh; clicking one shows detail + actions; deep-link works.

## F8 — [P1] App logo 404
`components/Layout/Layout.tsx:383` → `src="/Obsidian-logo.png"`, but the asset is
`public/logo.png` → `GET /Obsidian-logo.png 404`. **Fix:** change the reference to
`/logo.png`. Do **not** rename the asset. Confirm no other `/Obsidian-logo.png` refs remain.

## F9 — [P1] Stock Ledger: add detail page + richer list
`app/stock/stock-ledger/page.tsx` renders movement rows correctly but has **no detail page**,
and the list can show more. **Fix:** add a read-only Stock Ledger Entry **detail page**
(SLE is system-generated — **no edit/mutations**) reachable from the list; enrich the list per
master §4 (voucher type, in/out qty split, balance-after, valuation). Keep strictly read-only.

## Minor (fold in, low priority)
- G1 audit nit: `flow-auto-fill.ts` sources `customer_name` from `party_name` (the ID). If the
  Quotation exposes its own `customer_name`, map that for the display name; else leave (server
  re-fetches).

---

# PART 2 — NEW module: Item Price + Price List (masters-only) — master §10.4

**Scope:** standalone master modules only. **Auto-rate lookup INTO Quotation/SO/PO item tables
is explicitly DEFERRED** to a future phase (it touches the wizard surface under repair this
round). Build the masters and their CRUD; do not wire transactional auto-pricing yet.

**EXPAND existing dormant scaffolding — reuse, do NOT duplicate (P2):**
- `app/api/stock/settings/item-price/route.ts` (+ `[name]/route.ts`) — list/get exist.
- `app/api/accounting/settings/price-list/route.ts` — list exists.
- `app/accounting/settings/price-list/page.tsx` — a settings page exists.
- `lib/doctype-config.ts` — `"Item Price"` (`:115`) and `"Price List"` (`:519`) entries exist.

**Build:**
- **Price List**: list / new / detail / edit. Fields: `price_list_name`, `currency`,
  `selling` + `buying` flags, `enabled`. Add create/update/delete API handlers (factory
  `createCreateHandler`/etc.) where missing.
- **Item Price**: list (filter by `price_list` + `item_code`) / new / detail / edit. Fields:
  `item_code`, `price_list`, `price_list_rate`, `currency`, `valid_from`, `valid_upto`, `uom`,
  `min_qty`. Add create/update/delete handlers (list + `[name]` exist).
- Premium UI (premium-ui skill): B1 sidebar on detail pages, OKLCH tokens only, FlowWizard for
  multi-field create, StatusBadge, real Loading/Empty states.
- **Standalone**: NO FlowRail, NO auto-fill flow stage (these are masters like
  warehouse/account). Register in `doctype-config`; these are masters, not BUILT_MODULES flow
  nodes.
- If you add any pure helper (e.g. resolve effective price by date/qty), put it in `lib/` and
  unit-test it against real imports.

---

# PART 3 — Fast-follow tests (owed from Phase 2I DoD)

Add these as real tests in `tests/**` (vitest include = `tests/**/*.{test,spec}.{ts,tsx}`).
Per contract rule 6: render the real component / import the real function — no literal-asserts.
1. **FlowRail rendered-href RTL** — render `<FlowRail>` with a built downstream stage +
   `currentDocName`/`sourceDoctype`; assert the "Create" anchor `href` is
   `/route/new?param=name`, **not** a symbolic id. (This is the test whose absence let the 404
   ship green last time.)
2. **flow-auto-fill guard** — assert a Customer-Quotation maps `party_name → customer`, and a
   Lead-Quotation (`quotation_to: "Lead"`) does **not** (guard returns only defaults).
3. **computeStockKPIs aggregation** — **first move it** out of `stock-balance/page.tsx:31` into
   `lib/kpi/compute-stock-kpis.ts` (mild P3 — a pure helper shouldn't live in a page), then
   import the real fn and assert totals/`outOfStock` over sample bins.
4. **extractFrappeMessage object-message** — using `serverMessagesObjectMessage`, assert the
   output contains the real field/code and never `[object Object]` nor the bare generic
   fallback (guards F1).

---

# Live retest checklist (required before you report done — run the dev server)
1. PO create → real guided error naming the missing field, or success. (F1, F2)
2. Stock Reconciliation (Opening Stock) → submit succeeds → Stock Balance + Stock Ledger
   reflect it. (F1, F3)
3. Sales Invoice → enter posting_date → no false "missing"; submit works. (F4)
4. Customer detail → each of the 6 quick-actions → wizard opens prefilled. (F5)
5. Converted Lead detail → FlowRail shows Customer completed, points to Quotation, never
   "Create Customer". (F6)
6. Fire a guided error → refresh the page → notification still present → click it → detail +
   actions shown → deep-link navigates. (F7)
7. Logo renders in the layout; no `/Obsidian-logo.png` 404. (F8)
8. Stock Ledger → open an entry's detail page; list shows the richer columns. (F9)
9. Item Price + Price List → create/list/detail/edit each works; no FlowRail on them. (Part 2)

# Definition of Done
- `tsc --noEmit` = 0; `vitest` green **with the 4 new tests added** (count must increase from
  96); **all 9 live retest steps pass, reported with observed behavior** (per the contract).
- Zero `@ts-nocheck` (incl. the PO route); no orphan modules; no `__init__.ts`.
- Item Price/Price List standalone (no FlowRail/flow stage); auto-rate integration NOT done
  (deferred, noted).
- Report follows `MESH_REPORTING_CONTRACT.md` format.
