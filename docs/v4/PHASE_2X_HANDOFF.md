# Phase 2X — Manufacturing E2E Close-out + Warehouse-Default Unification

**Base branch:** `feat/v4-phase-2w-catalog-seed` (the 2W build — confirm current).
**Cut new branch:** `feat/v4-phase-2x-mfg-closeout`.
**Contract:** Read `docs/v4/MESH_REPORTING_CONTRACT.md`. End the build report with the **Rule 5** ordered manual live-retest checklist (route → action+values → expected → exact failure string) per the per-item lists below.
**Definition of Done:** every item works **end-to-end against live ERPNext** (`http://91.99.119.239`, company **Pana**, abbr **P**). Green `tsc`/`vitest` is the floor. **For a seed/automation task, DoD is a live query of the result, not the script exit code.** Capture the **exact** Frappe error string on any failure — never paraphrase.

## Live retest results carried into this round (from the user, against live)

| 2W item | Result |
|---|---|
| P0-6 Draft SO guard | ✅ pass |
| Notification CRUD context (redirect + show) | ✅ works — **UI is underwhelming, needs polish** (P1-A) |
| Catalog seed (items/BOMs/prices) | ✅ fully successful (BOMs submitted live by the brain; **script still has the submit bug** — fold the durable fix, P0-F) |
| JC auto-create | ❌ **still redirects to the job-card create page** (not inline) — P0-C |
| JC lifecycle Start/Complete | ❌ **`POST /api/method/frappe.client.set_value` → 404** — P0-B |
| JC employee assign | ⚠️ works, but **shows `HR-EMP-00001` instead of the employee name**; and must also appear on **WO detail + SO detail** — P0-D |
| Warehouse defaults (SE / PR / WO) | ❌ SE values **interchanged**; PR **no prefill at all**; WO **prefills wrong values** — P0-A |
| Shortfall dialog | ❌ still offers **"Create Material Request"** — must be **PO or PR** — P0-E |

---

## P0-A — Warehouse defaults: unify on the user's SAVED settings (root cause found)

**Root cause (confirmed against live + code):** there are **two** warehouse-default sources and every create form reads the wrong one.

- **Source of truth = the user's saved settings.** `lib/stock/warehouse-defaults.ts` → `/api/stock/settings/warehouse-defaults` reads the real ERPNext singles:
  - `sourceWarehouse` ← `Stock Settings.default_warehouse`
  - `fgWarehouse` ← `Manufacturing Settings.default_fg_warehouse`
  - `wipWarehouse` ← `Manufacturing Settings.default_wip_warehouse`
  - `scrapWarehouse` ← `Manufacturing Settings.default_scrap_warehouse`
  - **Live saved values right now:** source=`Stores - P`, **fg=`Stores - P`**, wip=`Work In Progress - P`, scrap=`Work In Progress - P`.
- **What the forms actually call** = `resolveCompanyWarehouses()` (`lib/settings/warehouses.ts` → `/api/stock/warehouses/defaults`), which **ignores the saved settings** and recomputes canonical names from the company abbr: stores=`Stores - P`, wip=`Work In Progress - P`, **fg=`Finished Goods - P`**, rawMaterials=`Raw Materials - P`.

The two diverge (e.g. saved fg=`Stores - P` vs canonical fg=`Finished Goods - P`) → "works but wrong values." SE maps from canonical stores/wip → "interchanged." `resolveCompanyWarehouses` also hits an **admin-role-gated** route (System/Stock Manager) so a non-admin user gets nothing.

**Required fix — one source of truth for prefill:** every create-form prefill reads `fetchWarehouseDefaults()` (the saved settings), and uses `resolveCompanyWarehouses()` canonical names **only as a per-field fallback when the saved value is blank**. Do NOT prefill directly from `resolveCompanyWarehouses()` anymore.

Add a shared helper (so the mapping lives in one place, P3):
```ts
// lib/stock/warehouse-defaults.ts
export async function resolvePrefillWarehouses() {
  const saved = await fetchWarehouseDefaults();                 // user settings
  const canon = await resolveCompanyWarehouses().catch(() => ({} as any)); // fallback
  return {
    source: saved.sourceWarehouse || canon.rawMaterials || canon.stores || "",
    stores: saved.sourceWarehouse || canon.stores || "",
    wip:    saved.wipWarehouse   || canon.wip || "",
    fg:     saved.fgWarehouse    || canon.fg || "",
    scrap:  saved.scrapWarehouse || canon.wip || "",
  };
}
```

Per-form mapping (replace the `resolveCompanyWarehouses().then(...)` effects):
- **Stock Entry** (`app/stock/stock-entry/new/page.tsx`):
  - Material Transfer / Transfer for Manufacture → `from = source`, `to = wip`
  - Manufacture → `from = wip`, `to = fg`
  - Material Receipt → `to = stores` (source)
  - Material Issue → `from = stores` (source)
- **Work Order** (`app/manufacturing/work-order/new/page.tsx`): `fg_warehouse = fg`, `wip_warehouse = wip`, `source_warehouse = source`, `scrap_warehouse = scrap`. (Today it pulls `wh.fg`/`wh.rawMaterials` → wrong.)
- **Material Request** (`app/stock/material-request/new/page.tsx`): Transfer → `set_from_warehouse = source`, `set_warehouse = wip`; Purchase/Issue → `set_warehouse = stores`.
- **Purchase Receipt** (`app/stock/purchase-receipt/new/page.tsx`): `set_warehouse = stores`. **AND** render a visible `QuickAddField name="set_warehouse"` on the form (it currently exists only in the read-only summary as `v.set_warehouse`, so the prefill is invisible — that's why "PR doesn't work at all"). Verify the prefill survives a non-admin session (the saved-settings route is user-scoped, so reading from it also removes the admin-gate 403 that silently killed PR).

Keep the fields visible + editable (prefill, don't lock).

**Retest:** A-RETEST #1.

---

## P0-B — Job Card lifecycle: `frappe.client.set_value` 404

**Root cause:** the lifecycle calls `POST /api/method/frappe.client.set_value`, but `/api/*` is the Next.js app's own route namespace — there is **no** `/api/method/...` route, so it 404s (the app never proxies raw Frappe method calls there). Employee assign works because it uses `useFrappeUpdate` (a resource PUT through the SDK), which targets the real ERP backend.

**Required fix:** drive Start/Complete through the **same mechanism that already works** — a resource update, not a method call:
- **Start** (status `Open`): `useFrappeUpdate("Job Card", name, { status: "Work In Progress", time_logs: [...existing, { employee: <selectedId>, from_time: <now>, completed_qty: 0 }] })`. Require an assigned employee first (guided message if none).
- **Complete** (status `Work In Progress`): update the open time-log row with `to_time: <now>` + `completed_qty: <for_quantity>`, set `status: "Completed"`, then **submit** via the full-doc pattern (GET the doc → `POST /api/method/frappe.client.submit` with `{doc: <full doc>}` **against the ERP backend through the SDK/`.call()`, not the Next `/api` proxy**). See [[frappe-rest-submit-needs-full-doc]].
- Button label + status badge must flip on each transition (the user reported "no UX change, just shows Start again"). Drive purely off `status` with optimistic refetch.
- Surface any Frappe error verbatim via `GuidedErrorDialog`.

> If a raw Frappe method call is genuinely needed elsewhere, add a thin Next route (e.g. `/api/manufacturing/job-card/[name]/transition`) that server-side calls the ERP — never call `/api/method/...` from the client.

**Retest:** A-RETEST #2.

---

## P0-C — Job Card auto-create still redirects (must be inline)

**Symptom:** creating Job Cards from the WO still navigates to the job-card create page. The 2W inline-create fix did not land on the WO-detail path.

**Required fix (`app/manufacturing/work-order/[name]/page.tsx`):** `handleCreateJobCards` must create the Job Card(s) **inline** via the create mutation and stay on the WO page — **no `router.push` to `/manufacturing/job-card/new`**. Prefill each JC with `operation` + `workstation` from the WO routing; if the WO has no routing, auto-provision the single default operation `Print & Finish` @ `Pana Print Floor` (both exist on live now) and proceed. Grep the whole file for any `router.push`/`<Link>` to a job-card create URL and remove it from this flow. The SME never sees a blank JC form.

**Retest:** A-RETEST #3.

---

## P0-D — Job Card employee: show NAME, surface on WO + SO detail

1. **Display name, not ID.** The assign chip shows `HR-EMP-00001`. The employee query already fetches `["name","employee_name"]` — render `employee_name` (keep `name` as the option value). Fix the chip + the selected-value renderer on the JC detail page and anywhere the assigned employee is shown.
2. **Surface the assign control on WO detail + SO detail** (the user asked for it in both):
   - **WO detail** (`app/manufacturing/work-order/[name]/page.tsx`): the JC table rows get the inline employee FrappeSelect (write the union array `employee: [{employee: id}]`, display `employee_name`), same as the JC detail page.
   - **SO detail** (`app/sales/sales-order/[name]/page.tsx`): within the Manufacturing card, for each linked Work Order's Job Cards, show the assigned employee (read) + allow assigning (the SO is the SME's primary cockpit). If a full inline editor is too heavy here, render the assigned employee name read-only with a deep-link to the JC; confirm the intended depth in the report.

**Retest:** A-RETEST #4.

---

## P0-E — Shortfall error dialog: route to PO/PR, not Material Request

**Symptom:** the stock-shortfall error (e.g. *"You need 10.0 more units of PAPER-300GSM in Stores - P …"*) still offers **"Create Material Request."** This is the ERPNext shortfall **error** surface (the `GuidedErrorDialog` raised when the transfer/manufacture fails), distinct from the StartProductionModal pre-check that 2V already moved to PO.

**Required fix:** find the shortfall `GuidedErrorDialog` action(s) (grep for the shortfall/insufficient-stock message handling and the "Create Material Request" CTA) and change the primary CTA to **Create Purchase Order** (`/buying/purchase-order/new?work_order=<WO>&shortfall=<item:qty,...>`), with **Create Purchase Receipt** as the secondary (for stock already received but not entered). Material Request becomes tertiary or is dropped. Reuse the 2V shortfall-param parser already wired into the PO create page. Ensure the PO/PR prefill also sets the receiving warehouse (the saved `stores`/source default from P0-A).

**Retest:** A-RETEST #5.

---

## P1-A — Notification CRUD detail: premium UI pass

The CRUD context now shows + deep-links (✅), but the panel is a plain text dump:
```
CRUD Operation
created · Sales Order · SAL-ORD-2026-00041
Created Sales Order SAL-ORD-2026-00041
[Open document] [Dismiss]
```
**Required (premium-ui skill):** redesign `components/notifications/notifications-panel.tsx` CRUD detail to enterprise standard — an operation badge (color-coded: create=emerald, update=amber, delete=red, submit=blue), the doctype + doc name as a prominent linked title, a muted timestamp, the summary as secondary text, and a primary "Open document" button with a secondary "Dismiss." Use the OKLCH tokens + existing badge/Button primitives; no raw hex, no generic stacked text. Keep it compact (fits the panel width).

**Retest:** A-RETEST #6.

---

## P0-F — Seed-script durability (fold the live-fixed bugs back into the script)

The catalog data is correct on live because the brain hand-fixed it, but `scripts/seed-pana-catalog.js` is still wrong for the **Pana production re-run / next environment**. Fix all three:
1. **BOM submit via full doc:** GET the created BOM → `POST /api/method/frappe.client.submit` with `{doc: <full doc object>}` (not `{name}`). The current call fails with `TypeError: submit() missing 1 required positional argument: 'doc'`. See [[frappe-rest-submit-needs-full-doc]].
2. **Heal on re-run:** the submit step must run for **already-existing draft BOMs**, not only inside the create branch — otherwise an idempotent re-run never submits drafts left behind by a prior failed run.
3. **Env loading:** add `require("dotenv").config({ path: ".env" })` at the top (or document the inline-env invocation). Today a bare `pnpm seed:catalog` exits `Missing ERP_API_KEY` because plain Node doesn't load `.env`.

**Bonus (optional, flag if done):** add a `scripts/seed-stock.js` + `"seed:stock"` that loads opening stock for all stock items across all non-group warehouses, since that's a recurring demo/retest need. Working pattern (verified live): create a **Stock Reconciliation** per warehouse, `purpose: "Opening Stock"`, `expense_account: "Temporary Opening - P"` (the Asset-type account — omitting it throws `OpeningEntryAccountError`), rows `{item_code, warehouse, qty, valuation_rate}` (valuation_rate must be > 0; default 10 for unvalued items), then submit each via the full-doc pattern.

**Retest:** B-RETEST #7.

---

## Guardrails

- **Locked / do-not-touch** unless a fix requires it (then surgical): `lib/flows/flow-graph.ts`, `app/api/flows/resolve/route.ts`, `tests/flow-resolver.test.ts` mock incl. `check_parent_permission`. The warehouse **settings** route (`/api/stock/settings/warehouse-defaults`) and the bootstrap route (`/api/stock/warehouses/defaults`) both stay — P0-A changes which one the **forms** consume, not the routes themselves.
- **No `any`** in production paths, **no `@ts-nocheck`**, **no invented abstractions** — extend existing patterns (`useFrappeUpdate`, FrappeSelect, GuidedErrorDialog, the warehouse-defaults lib).
- Currency **ETB**; company **Pana** (abbr **P**) — resolve, don't hardcode.
- Respect the orphaned-registry rule (BUILT_MODULES + getDocTypeRoute) for any surface touched.

---

## Required return (Rule 5 — ordered manual live-retest checklist)

### A-RETEST (manufacturing + warehouse defaults)
1. **Warehouse defaults match SAVED settings** — set distinct values in Stock/Manufacturing settings, then open `/stock/stock-entry/new` (Material Transfer), `/manufacturing/work-order/new`, `/stock/material-request/new`, `/stock/purchase-receipt/new`. **Expected:** every prefilled warehouse equals the **saved** default (e.g. WO `fg_warehouse` = `Stores - P` since that's saved, NOT `Finished Goods - P`); PR shows a visible, prefilled warehouse field. **Failure:** "field shows <canonical> not <saved>" / "PR field absent or empty."
2. **JC lifecycle** — `/manufacturing/work-order/<WO>` JC row (and `/manufacturing/job-card/<JC>`): Start → badge "Work In Progress", button "Complete"; Complete → "Completed", submitted. **Expected:** no 404; transitions persist. **Failure:** "<paste exact error>" / "404 on <url>".
3. **JC auto-create inline** — `/manufacturing/work-order/<WO with BOM>` → Create Job Cards. **Expected:** JC(s) created inline, `operation`/`workstation` prefilled, stays on WO page. **Failure:** "redirected to /manufacturing/job-card/new."
4. **Employee name + placement** — assign an employee on a JC from WO detail and SO detail. **Expected:** chip shows the employee **name** (not `HR-EMP-…`), persists across refetch, available in both places. **Failure:** "shows ID" / "assign absent on <WO|SO> detail."
5. **Shortfall → PO/PR** — trigger a real shortfall transfer. **Expected:** error dialog primary CTA = **Create Purchase Order** (prefilled shortfall + receiving warehouse), secondary = Purchase Receipt; no Material Request as primary. **Failure:** "still offers Create Material Request."
6. **Notification CRUD UI** — trigger a create; open the Bell → the notification. **Expected:** color-coded operation badge, linked doctype+name title, timestamp, summary, primary Open button — premium, not a text dump. **Failure:** "still plain text."

### B-RETEST (seed durability)
7. **Seed re-run heals + submits** — on a clean instance (or after deleting the BOMs), `pnpm seed:catalog`. **Expected:** all 15 BOMs end **docstatus 1** straight from the script (no manual submit); re-run is idempotent + heals any drafts; no `Missing ERP_API_KEY`. **Failure:** "<paste exact error and step>".

---

**End of Phase 2X handoff.** This closes the manufacturing E2E loop (lifecycle, auto-create, employee, shortfall routing), fixes the warehouse-default source-of-truth split, polishes the notification UI, and makes the catalog seed durable for the Pana redeploy. Report back with the build report + Rule 5 results and I'll gate against live before merge.
