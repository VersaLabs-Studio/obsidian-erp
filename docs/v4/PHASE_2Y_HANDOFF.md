# Phase 2Y — Simplification & Sales-Driven Manufacturing + FS/Reporting/Print

**Base branch:** the tip that contains your completed **Phase 2X** build (warehouse-default unification `resolvePrefillWarehouses`, JC lifecycle via `useFrappeUpdate`, JC auto-create inline, shortfall→PO/PR). If 2X is not yet merged, **build/merge 2X first** — Parts P3 and P8 below assume it. Confirm by grepping `resolvePrefillWarehouses` in `lib/stock/warehouse-defaults.ts` and `2X P0-D` in `app/sales/sales-order/[name]/page.tsx` (the latter is already present).
**Cut new branch:** `feat/v4-phase-2y-simplification`.
**Contract:** Read `docs/v4/MESH_REPORTING_CONTRACT.md`. End the build report with the **Rule 5** ordered manual live-retest checklist (route → action + values → expected → exact failure string) per the per-part lists below.
**Definition of Done:** every item works **end-to-end against live ERPNext** (`http://91.99.119.239`, company **Pana**, abbr **P**, currency **ETB**). Green `tsc`/`vitest` is the floor, not done. **Custom fields, seeds, and print templates are DoD-verified by a live round-trip (create → GET the doc back → confirm the field/data persisted), not by script exit code.** Capture the **exact** Frappe error string on any failure — never paraphrase.

> **This is a large, progressive phase** (a P0 hotfix + 8 parts). Land it in waves of PRs on the one branch if that's cleaner for review, but treat it as a single phase. Suggested build order (dependency-driven): **P0 (hotfix, do first) → P5-seed → P1 → P2 → P8 → P3 → P4 → P6 → P7.**

## Assumptions carried in (correct me in the next turn if wrong)
- **FS No = a manually-entered fiscal/receipt number** (Ethiopian fiscal-device "FS No" the client records against each invoice). Implemented as an ERPNext **Custom Field**, optional, editable on create/edit, shown on detail + print. Not auto-generated.
- **"No accounting tails" on manufacturing = hide accounting UI, keep valuation.** Perpetual inventory / valuation stays (stock value must stay correct); the SME simply never sees accounts/cost-centers/GL on manufacturing surfaces. We do **not** disable perpetual inventory.
- **Reports "full-blown" = a reusable Reports hub + a first flagship wave** (4 reports), with the long tail folded forward — not every conceivable report in one round.

---

## P0 — HOTFIX: Job Card list 500 + auto-provision 404 (blocks all of P3)

Live retest of the current (post-2X) build shows the WO-detail (and by extension SO-detail) Job Card surface is **completely dead** — no JC list loads, no create, no assign. Two independent root causes, both confirmed against the code:

### P0-a — `time_logs` / `employee` requested in `get_list` `fields` → SQL `1054 Unknown column`

**Evidence:** `app/manufacturing/work-order/[name]/page.tsx:107`:
```ts
fields: ["name", "operation", "status", "workstation", "total_completed_qty", "for_quantity", "employee", "time_logs"],
```
`time_logs` (Table → *Job Card Time Log*) and `employee` (Table MultiSelect) are **child tables, not columns on `tabJob Card`.** Requesting them in a `frappe.client.get_list` `fields` array makes Frappe emit `SELECT … time_logs …`, which MariaDB rejects:
```
pymysql.err.OperationalError: (1054, "Unknown column 'time_logs' in 'SELECT'")  → HTTP 500
```
So the JC list query 500s on every render → the card shows nothing → the user "can't create a JC or assign an employee." (This is the [[frappe-get-list-no-child-fields]] gotcha — the `fields` cousin of the [[flow-resolver-child-field-gotcha]] filter bug.)

**Required fix:**
- **List query** (`useFrappeList("Job Card", …)`): request **parent columns only** — `["name", "operation", "status", "workstation", "total_completed_qty", "for_quantity", "work_order"]`. **Remove `time_logs` and `employee`.**
- **Child-table data** (the `time_logs` array the Start/Complete lifecycle reads at lines ~282/321, and the `employee` rows the assign chip renders): fetch the **full Job Card doc** per row via `useFrappeDoc("Job Card", jc.name)` / a `get_doc` (resource GET) — the full doc includes all child tables. There are only a handful of JCs per WO, so fetch-on-demand (or fetch full docs for the visible rows) is fine. Do **not** re-introduce child fields into any `get_list`.
- **Audit every other `get_list`** for child-table fieldnames and apply the same rule — grep the codebase for `get_list`/`useFrappeList` calls that name a Table/Table-MultiSelect field (Job Card `time_logs`/`employee`/`items`, and the SO-detail JC query which currently requests `employee`). The SO-detail cockpit (P3) **must not** repeat this — it reads employee assignments via full doc.

### P0-b — auto-provision hits `POST /api/resource/<doctype>` (404) with phantom master names

**Evidence:** `ensureMaster` (`work-order/[name]/page.tsx:392–424`) does `GET /api/resource/<doctype>/<name>` then `POST /api/resource/<doctype>`, provisioning the hardcoded defaults `DEFAULT_WORKSTATION = "Pana Print Floor"` and `DEFAULT_OPERATION = "Print & Finish"` (lines 389–390). Live:
```
GET  /api/resource/Workstation/Pana%20Print%20Floor   404   (never seeded)
POST /api/resource/Workstation                         404   (no such Next route)
GET  /api/resource/Operation/Print%20%26%20Finish      404
POST /api/resource/Operation                           404
```
`/api/*` is the **Next app's** namespace; there is no generic `/api/resource/<doctype>` **POST** handler, so provisioning can never succeed — and the names don't match the 8 workstations we're seeding in P5a anyway.

**Required fix:**
- **Seed masters ahead of time (P5a is the source of truth).** Once the 8 Workstations + matching Operations exist, JC auto-create should **reference an existing seeded master**, never create one at runtime. Replace the phantom defaults with a real seeded default (e.g. operation/workstation `"Design Studio"`, or make the WO's default configurable) — and prefer the WO's BOM routing first row when present.
- **Delete the runtime `/api/resource` POST provisioning.** `ensureMaster` becomes a pure existence check at most; if the referenced master is somehow missing, surface a clean `GuidedErrorDialog` ("Workstation not provisioned — seed the shop floor") rather than a silent 404. If runtime provisioning is ever genuinely needed, add a real server route (`/api/manufacturing/provision-master`) that inserts via the service account — **never** `POST /api/resource/<doctype>` from the client. (Confirm whether `/api/resource/<doctype>/<name>` **GET** is even a real route on this app; if not, the existence check must use `useFrappeDoc`/the SDK, not raw `fetch`.)
- JC creation itself must go through the working `useFrappeCreate("Job Card", …)` path (the same SDK path that already succeeds elsewhere), not `/api/resource` POST.

**DoD:** on a WO with the seeded shop floor, the JC list loads (no 500), **Create Job Card** produces a JC inline (no 404, no redirect), and **Assign employee** + **Assign workstation** persist — verified from **both** WO detail and SO detail.

**Retest:** 2Y-RETEST #0 (gates P3 — do not sign off P3 until #0 is green).

---

## P1 — FS No field on Sales Invoice + Purchase Invoice

**Goal:** an FS-number field asserted in the SI and PI payloads (client requirement).

**Backend (one-time, idempotent bootstrap):** create a **Custom Field** on both doctypes. Add a seed step (extend `scripts/seed-*.js` or a small `scripts/seed-custom-fields.js`, and/or a guarded admin route) that inserts a Custom Field doc via `POST /api/method/frappe.client.insert` with:
```json
{ "doc": { "doctype": "Custom Field", "dt": "Sales Invoice", "fieldname": "custom_fs_no",
           "label": "FS No", "fieldtype": "Data", "insert_after": "po_no", "translatable": 0 } }
```
…and the same with `"dt": "Purchase Invoice"` (insert_after an existing PI reference field — confirm the PI field order live). **Verify the exact round-trip fieldname:** after insert, create a doc with `custom_fs_no` set, GET it, and confirm the key comes back as `custom_fs_no` (Frappe does **not** re-prefix a Custom Field you name explicitly, but confirm on this instance — this is the DoD, not the insert call).

**Frontend:**
- `app/accounting/sales-invoice/new/page.tsx`: add `custom_fs_no?: string` to `SIForm`, render a `FormInput name="custom_fs_no" label="FS No"` in **step1** (next to `po_no`), and add `"custom_fs_no"` to the step1 `fields` array. The payload already spreads `...values`, so no mutate change is needed — but confirm it's present in the POST body.
- Mirror in `app/accounting/sales-invoice/[name]/edit/page.tsx`, and show it on `app/accounting/sales-invoice/[name]/page.tsx` (detail) + the SI print template.
- Same four touchpoints for Purchase Invoice (`purchase-invoice/new`, `[name]`, `[name]` has no edit dir today — add the field to whatever create/detail surfaces exist; check `app/accounting/purchase-invoice/`).

**Retest:** 2Y-RETEST #1.

---

## P2 — Global unsubmitted-form persistence (draft autosave)

**Goal:** inserted-but-unsubmitted create/edit form data survives reload and navigation away/back. Greenfield — **no existing lib** (`lib/**` has no draft/autosave).

**Build `lib/forms/use-form-persistence.ts`:**
```ts
export function useFormPersistence<T extends FieldValues>(
  form: UseFormReturn<T>,
  draftId: string,            // stable per form, e.g. `draft:Sales Order:new`
  opts?: { exclude?: string[] } // fields never persisted
): { clear: () => void; restored: boolean }
```
Behavior:
- **Key** = `obsidian:${getActiveCompany()}:${draftId}` (namespace by company to prevent cross-tenant bleed; guard `typeof window === "undefined"`).
- **Write**: subscribe to `form.watch()`, **debounced ~500ms**, JSON-serialize the values (drop `opts.exclude` + any `File`/blob) to `localStorage`.
- **Hydrate on mount**: if a saved draft exists and the form is still at defaults, `form.reset(saved)` and set `restored = true`. Do **not** clobber a URL-prefill (make-from / `?sales_order=` etc.) — if the page hydrated from a source doc, skip restore for that render.
- **Clear** on successful submit (call `clear()` in each mutation's `onSuccess`) and on explicit discard.
- **UX**: when `restored`, show a subtle dismissible chip near the PageHeader — `"Restored unsaved changes · Discard"` (Discard calls `clear()` + `form.reset(defaults)`). Premium-ui tokens, not a browser `alert`.

**Apply globally:** add one `useFormPersistence(form, "draft:<Doctype>:<mode>")` call (+ `clear()` in `onSuccess`, + the restored chip) to **every create and edit page**. Enumerate them from `app/**/new/page.tsx` and `app/**/[name]/edit/page.tsx` (accounting, crm, sales, stock, manufacturing, buying). This is mechanical and scriptable — list every file you wired in the report so I can gate coverage. Wizard pages (SI/SO/PO/DN/PR) persist the whole `watchedAll` object.

**Guardrails:** never persist passwords/secrets (none in these forms, but honor `exclude`); cap serialized size (skip write if > ~1MB); a corrupt/legacy draft must `try/catch` → ignore, never crash the form.

**Retest:** 2Y-RETEST #2.

---

## P3 — Sales Order as the manufacturing cockpit (deepen)

**Goal:** the sales user runs the entire shop-floor lifecycle from SO detail — **no trips into the manufacturing module.** Build on the existing Manufacturing card in `app/sales/sales-order/[name]/page.tsx` (already: WO multi-create, WO submit → JC generation, employee assign with `employee_name`).

> **P0 is a hard prerequisite for this part.** The SO cockpit reads JC `employee`/`time_logs` via the **full doc**, never via `get_list` `fields` (P0-a), and assigns only **seeded** workstations/operations (P0-b + P5a). Do not sign off P3 until 2Y-RETEST #0 is green from SO detail.

Add, inline in that card, per Job Card row:
1. **Workstation assignment** — inline `FrappeSelect doctype="Workstation"` (filtered to the 8 seeded workstations from P5) writing `workstation` on the JC via `useFrappeUpdate("Job Card", …)`. Show the current workstation as a chip.
2. **Employee assignment restricted to manufacturing staff** — the existing assign control, but filter the Employee query to shop-floor employees. **Query distinct `department` values live first** (`Employee` grouped by department) and filter to the manufacturing/production department(s); if Pana has none set, fall back to all employees and note it in the report. Keep showing `employee_name` (not `HR-EMP-…`).
3. **Progress control (mark done, don't create)** — Start / Complete each JC in place, reusing the 2X JC-lifecycle mechanism (`useFrappeUpdate` status transitions: `Open → Work In Progress → Completed`, with the full-doc `frappe.client.submit` on complete — see [[frappe-rest-submit-needs-full-doc]]). When **all** JCs for a WO reach `Completed`, surface a single **"Complete Work Order"** action (submit the manufacture completion). Buttons flip on status; optimistic refetch.
4. **JC automation** — when a WO is submitted from the SO and its BOM has no routing, auto-provision the default operation + workstation so a Job Card still appears (ties to P5 seeded Operations/Workstations). The sales user never lands on a blank JC form (this is the 2X P0-C inline-create rule, extended to the SO-driven path).

**Minimize everything else:** the card exposes only assign-employee, assign-workstation, and mark-progress (Start/Complete/Complete WO). No "new Job Card" form, no manual SE, no BOM links, no deep manufacturing navigation from here.

**Retest:** 2Y-RETEST #3.

---

## P4 — Remove stock-level on SO + enrich Stock Balance drill-down

**P4a — Remove the stock-level affordance from SO create** (`app/sales/sales-order/new/page.tsx`): remove the `StockLevelModal` import (line ~54), the `stockModalOpen` state (~152–153), the **"Check Stock"** button (~585–598), and the modal render (~682–688). If `sales-order/[name]/edit` mirrors it, remove there too. Leave `StockLevelModal` component in place (still used elsewhere? grep before deleting the file — only remove the SO usage).

**P4b — Stock Balance data-richness** (`app/stock/stock-balance/page.tsx` already has KPIs + status pills + reorder). Add depth:
- **Make each row click through** to a **stock detail drill-down** — new `app/stock/stock-balance/[item]/page.tsx` (item-scoped) showing:
  - **Where** — per-warehouse breakdown for the item (on-hand, reserved, projected, valuation rate, stock value per warehouse) from `Bin`.
  - **When** — the **movement timeline** from `Stock Ledger Entry` (filter `item_code`): posting date/time, voucher type + no (linked), warehouse, in/out qty, running **balance qty**, valuation rate, value. Reuse patterns from `app/stock/stock-ledger/page.tsx`.
  - **Current status** — total on-hand across warehouses, total value, reorder status, last movement date.
- Keep it read-only + premium (OKLCH tokens, tabular-nums). This is surfacing existing ERPNext data (Bin + Stock Ledger Entry + reorder), not new schema.

**Retest:** 2Y-RETEST #4.

---

## P5 — Clamp down the manufacturing module (ease + automate)

**Goal:** the parent Manufacturing module becomes minimal and automatic. The SME never manually touches Stock Entry or BOM; manufacturing docs show no accounting.

**P5a — Seed 8 workstations (+ matching operations).** Add a seed step (`scripts/seed-workstations.js` or fold into the catalog seed) that idempotently inserts these **Workstations**:
`Digital Paper Print`, `Offset Print`, `Banner Print`, `UV Print`, `DTF Print`, `CNC & Laser`, `Signage`, `Design Studio`.
For each, also insert a matching **Operation** of the same name defaulting to that workstation, so JC provisioning (P3.4) can pick operation→workstation with zero routing setup. Insert via the full-doc `frappe.client.insert` pattern; verify live (`Workstation` list returns all 8). These are the values the sales master assigns during job-card provisioning.

**This seed is what makes P0-b's fix possible** — once these 8 exist, JC auto-create references a seeded default (replace the phantom `"Pana Print Floor"`/`"Print & Finish"`) and never provisions a master at runtime. Pick one seeded pair as the fallback default (e.g. `Design Studio`) for WOs whose BOM carries no routing.

**P5b — Automate/hide Stock Entry.** Remove all **manual** SE entry points from the SME surface (manufacturing nav, WO-detail "create stock entry" actions). Material movement happens automatically: rely on ERPNext **backflush** (`Manufacturing Settings.backflush_raw_materials_based_on = "BOM"` or "Material Transferred for Manufacture" — pick and document) and auto stock entry on WO/JC completion. Keep SE routes reachable by direct URL for admin, but **remove SE from the nav/BUILT_MODULES surfacing** — respect the orphaned-registry rule (a doctype hidden from nav must not 404 its own detail route if still linked). Document exactly what you hid vs. removed.

**P5c — Hide BOM from the SME.** BOM is auto-created (configurator/Quick BOM emits it — see [[configurator-is-bom-emitter]] and [[bom-mandatory-constraint]]). Remove BOM from the manufacturing nav; auto-provision behind the scenes when a manufacturable item is ordered. Do **not** delete the BOM doctype/routes (WO still needs a BOM); just stop making the SME navigate it.

**P5d — Valuation-only, no accounting tails.** On every manufacturing surface (WO create/detail, JC, the auto SE), **hide** account / expense-account / cost-center / GL fields from the UI. Valuation rates still flow (perpetual inventory intact); the SME just never sees the accounting. Configure the default expense/COGS/stock accounts once (company defaults) so the automatic entries post without user input. **Do not disable perpetual inventory or valuation.**

**Retest:** 2Y-RETEST #5.

---

## P6 — Delivery Note print templates (customer copy + gate pass)

**Current state:** printing is **browser-print** via `components/ui/print-share.tsx` + `app/print.css` (letterhead, chrome suppressed). There is **no** DN customer template and **no** gate pass. Stay consistent with the browser-print approach (do not introduce ERPNext server Print Formats).

Implement, on the DN detail page (`app/stock/delivery-note/[name]/page.tsx`), a **Print** menu with two React print views (each toggled into a print mode that `app/print.css` renders clean):
1. **Customer Delivery Note** — Pana letterhead, DN no + date, customer + shipping address, items (code, description, qty, uom), totals, "Received in good condition" signature block. This is the copy the customer gets.
2. **Gate Pass** — security/gate-out doc: DN no, date/time, items + qty, **vehicle no**, **driver name**, destination, "Authorized by" + "Security" signature lines. Capture vehicle/driver either via a small pre-print dialog or optional DN custom fields (`custom_vehicle_no`, `custom_driver_name` — same Custom Field pattern as P1); render whatever is available.

Both templates: OKLCH-neutral print styling, no app chrome, fit A4. Verify by printing a real submitted DN and confirming both layouts render with live data.

**Retest:** 2Y-RETEST #6.

---

## P7 — Reports module expansion

**Current state:** `app/accounting/reports/*` (AR, AP, balance-sheet, P&L, inventory, manufacturing, sales, payables, receivables). Expand into a **system-wide reporting hub** with a reusable scaffold + a flagship first wave (rest folds forward).

**P7a — Reusable report scaffold** (`components/reports/…` + `lib/reports/…`): a report shell taking `{ title, filters (date range + entity selects), fetch (aggregation), columns, chart, exporters (CSV + print) }`. Prefer ERPNext data via `frappe.client.get_list` aggregation or the Query Report runner (`/api/method/frappe.desk.query_report.run` — add a thin server route if used; never call `/api/method/*` from the client, per the 2X lesson). Charts via the existing chart lib (recharts).

**P7b — Flagship wave (build these four on the scaffold):**
1. **Sales Analytics** — revenue by period / customer / item, order-to-cash funnel (SO→DN→SI), top customers.
2. **Manufacturing Throughput** — WO/JC completion over time, JC by **workstation** and by **employee**, on-time vs late, WIP snapshot.
3. **Stock Movement & Valuation** — ledger movement, valuation over time, ageing/slow-movers, value by warehouse (complements P4b).
4. **Financial Summary** — P&L + Balance-Sheet headline + cash position (enrich/link the existing accounting reports, don't duplicate).

Add a top-level **Reports hub landing** linking all reports (existing + new); respect the orphaned-registry rule for any new route. Every report: filters, a table, at least one chart, CSV export, print. Note in the report which additional reports you're deferring to a later wave.

**Retest:** 2Y-RETEST #7.

---

## P8 — Make warehouse management fully implicit

**Goal:** the SME never picks a warehouse. Build on the 2X unified source of truth (`resolvePrefillWarehouses()` — saved settings first, canonical fallback).

- On every create form that currently shows a warehouse picker (Stock Entry, Work Order, Material Request, Purchase Receipt, Stock Reconciliation, Delivery Note; SO has none): **hide the warehouse input** and set the value programmatically from `resolvePrefillWarehouses()`. Show the resolved warehouse **read-only in the review/summary step** (transparent, not editable) so the user can see where stock is going without choosing.
- Keep a single **"Advanced"** escape hatch (admin-only, collapsed by default) that reveals the warehouse fields for the rare override — do not hard-remove the capability, just hide it from the default flow.
- Confirm the implicit resolution still respects the user's **saved** defaults (the 2X fix), not the canonical recompute. See [[warehouse-defaults-two-sources]].

**Retest:** 2Y-RETEST #8.

---

## Guardrails
- **Locked / do-not-touch** unless a fix requires it (then surgical): `lib/flows/flow-graph.ts`, `app/api/flows/resolve/route.ts`, `tests/flow-resolver.test.ts` mock incl. `check_parent_permission`.
- **No `any`** in production paths, **no `@ts-nocheck`**, **no invented abstractions** — extend existing patterns (`useFrappeUpdate`, FrappeSelect, QuickAddField, GuidedErrorDialog, the warehouse-defaults lib, `print-share`/`print.css`).
- Currency **ETB**; company **Pana** (abbr **P**) — resolve, don't hardcode.
- **Orphaned-registry rule:** any module hidden from nav (SE, BOM) must not 404 its own still-linked detail routes; any new route (stock-balance/[item], reports hub, new reports) must be added to BUILT_MODULES + getDocTypeRoute as applicable.
- **`/api/*` is the Next app namespace** — never call `/api/method/frappe.*` from the client (that 404'd in 2X). Add a thin server route when a raw Frappe method is needed.
- Custom Fields, workstations/operations, and any seed must be **idempotent** (heal on re-run) and **live-verified**.

---

## Required return (Rule 5 — ordered manual live-retest checklist)

0. **JC surface alive (P0 gate)** — on a WO with the seeded shop floor: `/manufacturing/work-order/<WO>` loads its Job Card list with **no 500** (previously `1054 Unknown column 'time_logs'`); **Create Job Card** creates one inline with **no `/api/resource` 404** and no redirect; assign an employee + a workstation and both persist — repeat from `/sales/sales-order/<SO>`. **Failure:** "<paste exact 500/404>" / "list empty / create failed / had to navigate."
1. **FS No round-trips** — `/accounting/sales-invoice/new`: fill items + **FS No = `FS-TEST-001`**, create → open the SI → FS No shows; GET the doc from ERPNext → `custom_fs_no` = `FS-TEST-001`. Repeat for Purchase Invoice. **Failure:** "field absent in payload / not persisted / wrong key `<paste>`."
2. **Draft persists** — `/sales/sales-order/new`: enter a customer + 2 items, **reload the page** and **navigate away then back**. **Expected:** fields restored, "Restored unsaved changes" chip shown; after a successful create the draft is cleared (reopening `/new` is blank). **Failure:** "fields lost on <reload|nav>." List every create/edit page wired.
3. **SO cockpit full lifecycle** — `/sales/sales-order/<SO with a manufacturable item>`: create WO → submit → JC appears; assign a **manufacturing employee** (name shown, not ID) and a **workstation** from the 8; **Start** then **Complete** the JC; **Complete Work Order** when all JCs done — all without leaving the SO. **Failure:** "<paste exact error>" / "had to navigate to <url>."
4. **SO stock-level gone + Stock drill-down** — `/sales/sales-order/new` has **no "Check Stock"** button/modal. `/stock/stock-balance` → click a row → detail page shows per-warehouse breakdown + Stock Ledger movement timeline + current status. **Failure:** "Check Stock still present" / "no drill-down / empty timeline."
5. **Manufacturing clamped** — SME nav shows **no Stock Entry, no BOM**; creating/completing a WO from the SO moves stock automatically (Bin qty changes) with **no accounting fields shown** and valuation intact; the 8 workstations exist live. **Failure:** "SE/BOM still in nav" / "accounting fields visible" / "stock didn't move" / "workstation missing: <name>."
6. **DN print templates** — `/stock/delivery-note/<submitted DN>` → Print → **Customer Delivery Note** and **Gate Pass** both render clean (letterhead, live items, signatures; gate pass has vehicle/driver). **Failure:** "template missing / app chrome visible / no live data."
7. **Reports** — open the Reports hub → each flagship report (Sales Analytics, Manufacturing Throughput, Stock Movement & Valuation, Financial Summary) loads with live data, filters, a chart, CSV export, print. **Failure:** "report errors / empty / export broken — <paste>." List deferred reports.
8. **Implicit warehouse** — the warehouse picker is **absent** from SE/WO/MR/PR/Stock-Reconciliation/DN create flows; the resolved warehouse shows read-only in review and matches the user's **saved** defaults; the docs still post to the correct warehouse. **Failure:** "picker still shown / wrong warehouse / posts to canonical not saved."

---

**End of Phase 2Y handoff.** This round simplifies the operator's world (implicit warehouses, clamped manufacturing, no stock-picker noise, autosaved drafts), makes the Sales Order the single manufacturing cockpit, and adds the client's FS number, the DN customer/gate-pass prints, and a real reporting hub. Report back with the build report + Rule 5 results and I'll gate against live before the next Pana deploy.
