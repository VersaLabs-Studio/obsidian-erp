# PHASE 2T HANDOFF — Half B Remediation + Half A Residuals

> **Author:** Brain (Opus 4.8) · **Builder:** OpenCode mesh
> **Branch to cut:** `feat/v4-phase-2t-halfb-remediation` off `main` (`fe06a05`)
> **Reporting contract:** `docs/v4/MESH_REPORTING_CONTRACT.md` — read it before reporting. The Definition of Done below OVERRIDES the default "green gates = complete" reflex.
> **Prior round:** Phase 2S shipped to `main` (PR #5). Static gates were green (tsc 0, 427/427) but the **live retest exposed Half B as largely non-functional scaffolding.** This phase makes it actually work.

---

## 0. THE INTEGRITY PROBLEM — READ FIRST

Phase 2S was reported **"Parts 10–17 complete, 427/427 tests green."** The live retest found:

- B1 SO→WO automation — code present but **never produces a Work Order** (blocked precondition).
- B2 warehouse simplification — not functional.
- B3 Job Cards — module renders, **Start does nothing, no employee, no WO tie, no auto-create.**
- B4 HR — module renders, **no v4 create/edit, no dashboard, no employee selector, no ERPNext HR menus.**
- Part 12 stock modal — component exists, **not mounted anywhere.**
- Print templates — **do not exist** for docs despite being requested.

**Files existed; behavior did not.** vitest stayed green because tests asserted on file shape and types, not live ERPNext round-trips. This is the thing to fix culturally this round.

### DEFINITION OF DONE (this phase, non-negotiable)

A part is **DONE only when the described user action works end-to-end against live ERPNext.** For every part below you MUST, in your BUILD REPORT:

1. State the exact **wiring path** (file → handler → API route → ERPNext method) you implemented.
2. List the **manual steps you performed** to confirm the action works (the doc names/IDs you created).
3. If you could not verify a step live, **say so explicitly** — do NOT report it as complete. A stub reported as done is the single worst outcome and costs a full re-audit cycle.

`tsc --noEmit` = 0 and `vitest run` green are **floor gates, not done gates.** Green-on-stub is a failure.

**This is not a new rule — it is `MESH_REPORTING_CONTRACT.md` Rule 5, which the 2S report violated.** The 2S report ended with "want me to trigger code-review?" and **no manual live-retest checklist** — which is exactly how the stubs passed as complete. Rule 5 requires every completion report to end with an **ordered manual live-retest checklist** (route → action + field values → expected result → failure string) covering everything you changed. A report without it is incomplete and will be rejected unread. This is the 5th consecutive "gates green, runtime broken" cycle — the checklist is the thing that stops it.

---

## 1. HALF A RESIDUALS (P1 — small, do these first to clear the deck)

### 1A.2 — Quotation→Sales Order flow edge does not light
- **Symptom:** From a Quotation, the forward edge to the created Sales Order does **not** light up; from the SO, the backward edge to the Quotation **does** light correctly. Asymmetric.
- **Where:** flow-rail directional resolution — `lib/flows/flow-link-map.ts` + the resolver. The SO→QN (backward, header `quotation` field) resolves; the QN→SO (forward) edge is the missing direction.
- **Fix:** make the forward resolution (Quotation → its child Sales Orders) light the edge, mirroring how SO→WO forward resolution already works (children linked by header field). Do NOT alter CrossFlow/FlowRail **visuals** (2P-FINAL lock) — this is a data-path/resolver fix only.
- **Acceptance:** On a Quotation that has a downstream SO, the SO node on the rail is lit and clickable.

### 1A.3 — Payment terms are invisible in Quotation + Sales Order create
- **Symptom:** User sees **no payment-terms template picker or options** in either Quotation create or Sales Order create, so the feature is undiscoverable. (Payment-terms **template management** already exists at `app/accounting/setup/payment-terms` — only the in-document selector is missing.)
- **Required:**
  1. Add a **Payment Terms** control to the Quotation create and Sales Order create forms: a select bound to `payment_terms_template` (list from `Payment Terms Template`), plus a read-only preview of the resulting schedule (due dates / %), and a clear/none option. Keep it consistent with the 9R.14 behavior (selecting a template lets ERPNext recompute the schedule against the doc date; never POST a stale `payment_schedule`).
  2. Ensure the chosen template **flows downstream** via make-from (SO→SI/PI etc.) without re-triggering the 9R.14 417.
- **Also (explicit user requirement):** verify the user can **make a PARTIAL Payment Entry against a Sales Invoice and a Purchase Invoice** — i.e., pay less than the outstanding, leave a balance, and the SI/PI shows partially-paid with correct outstanding. If the PE create flow forces full payment, fix it to accept a user-entered `paid_amount` < outstanding.
- **Acceptance:** payment terms are selectable and visible in QN + SO create; a partial PE against an SI and a PI both submit and leave a correct outstanding balance.

### 1A.4 — make-from prefill broken for PO→PI and PR→PI + DN→SI edge + controlled-input console errors
- **Symptoms:**
  - **PO → Purchase Invoice** prefill **does not work at all** (no hydration).
  - **PR → Purchase Invoice** prefill **does not work at all.**
  - **DN → Sales Invoice** create/prefill **works**, BUT the **DN→SI flow edge does not light** (inverse of 1A.2 — here the create works but the rail doesn't).
  - **Console errors on make-from redirect:**
    - `A component is changing a controlled input to be uncontrolled … value changing from defined to undefined`
    - `` `value` prop on `input` should not be null. ``
- **Root-cause guidance:**
  - For PO→PI / PR→PI: audit `app/api/erpnext/make-from/route.ts` MAPPERS for the `Purchase Order->Purchase Invoice` and `Purchase Receipt->Purchase Invoice` keys and confirm (a) the ERPNext mapper method name is correct (`make_purchase_invoice`), (b) the route returns the mapped doc, and (c) the **PI create wizard actually hydrates** from the returned doc (the SI wizard does — diff against it). The DN→SI path works, so the PI wizard hydration is the likely gap.
  - For the null console errors: the make-from'd doc contains `null` fields that get fed into controlled `<input value={...}>`. **Coalesce `null`/`undefined` → `""`** at the hydration boundary (or use `?? ""` on each bound value). This must be fixed for ALL make-from targets, not just PI.
  - For the DN→SI edge: same directional-resolver fix family as 1A.2.
- **Acceptance:** PO→PI and PR→PI both prefill the PI wizard with the source lines; no controlled/uncontrolled console warnings on any make-from redirect; DN→SI edge lights on the rail.

### 1A.5 — Cross-flow sidebar missing on Purchase Invoice
- **Symptom:** The cross-flow sidebar (present on other docs) is **absent on the PI detail page** only. DN/SI/MR are fine; rail-below-header + clickable stages all confirmed good.
- **Fix:** mount the same cross-flow sidebar component the SI/DN detail pages use onto the PI detail page. Visuals unchanged — parity only.
- **Acceptance:** PI detail shows the cross-flow sidebar identical in behavior to SI.

---

## 2. SHOP-FLOOR VERTICAL SLICE (P0 — the heart of this round)

> Build T1→T2→T3→T4 **as ONE workflow** and test it end-to-end as one slice. Do not report any of T2–T4 "done" until the whole chain runs: **SO → drafted WO → Job Cards → assigned employees → Start/Finish → WO auto-completes → status visible on SO → DN/SI/PE.** This is exactly the B1–B5 retest path that failed.

### T1 — Global Default-Warehouse Settings (the unblock; build FIRST)

This is the user's explicit redesign of "warehouse simplification" (old Part 11) and it **unblocks T2**.

- **Problem it solves:** Many docs require warehouses as mandatory (source, target/FG, WIP). Today SO→WO bails because no finished-goods warehouse is set (`app/sales/sales-order/[name]/page.tsx` ~line 219). Users shouldn't hand-pick warehouses on every doc.
- **Build:**
  1. A **settings page** (recommend `app/stock/settings/warehouse-defaults/page.tsx`, linked from Stock settings) where the user assigns the system-wide default warehouses: **Source**, **Target/Finished-Goods (Stores)**, **WIP**, and **Scrap/Rejected** (cover the mandatory set ERPNext asks for).
  2. **Persistence — schema-first, reuse ERPNext singles where they exist:** ERPNext **Manufacturing Settings** already has `default_wip_warehouse`, `default_fg_warehouse`, `default_scrap_warehouse`; **Stock Settings** has `default_warehouse`. Read/write those single doctypes from this page so the defaults are real ERPNext config (not a parallel store). For any default not covered by an ERPNext single, persist via a small app config doc — but prefer the native singles.
  3. A **config lib** (`lib/stock/warehouse-defaults.ts`) that fetches these once and exposes typed getters.
  4. **Auto-prefill into create forms:** every create form that requires a warehouse (Work Order, Stock Entry, Purchase Receipt, Delivery Note, Material Request, etc.) **prefills the warehouse fields from the config** — fields remain **visible and editable**, just pre-populated. The user described this exactly: "fields visible in the create forms but prefilled with the existing config by the system."
- **Acceptance:** set defaults once on the settings page → open WO/PR/DN/Stock Entry create → warehouse fields are pre-filled with those defaults, editable, and submitting works without manual warehouse entry.

### T2 — SO → Work Order drafting (unblock the existing code)

- **What exists:** `app/sales/sales-order/[name]/page.tsx` already has `createWOMutation`, `handleCreateWorkOrders`, `executeCreateWorkOrders`, BOM + warehouse validation, a "Create Work Orders" confirm dialog, and "View/Create Work Order" CTAs. It is gated by `isModuleBuilt("Work Order")` and bails when an item lacks a default BOM or FG warehouse.
- **Why it reads as "not implemented":** the warehouse precondition (and possibly the module gate / missing default BOM) makes it silently refuse. With **T1** in place the warehouse precondition is satisfied.
- **Fix:**
  1. Confirm `isModuleBuilt("Work Order")` returns true (Work Order module IS built) so the CTA isn't disabled.
  2. With T1 defaults, the FG/WIP warehouse checks pass; verify the WO is actually **drafted (docstatus 0)** with `production_item`, `bom_no`, `qty`, `sales_order` link, `wip_warehouse`, `fg_warehouse`, `planned_start_date`.
  3. Surface clear, **actionable** errors when an item genuinely has no BOM (link to create one) rather than a silent no-op.
  4. Add the **WO status + controls on the SO detail** the user asked for: show each linked WO's status and give Create/View controls (the "View/Create Work Order" CTAs exist — make them work and show status).
- **Acceptance:** submit an SO for a BOM-backed item → a draft WO is created and visible from the SO with its status; the WO carries all the fields above.

### T3 — Job Cards (wire the stub end-to-end)

- **What exists:** `app/manufacturing/job-card/{page,new,[name]}`, `app/api/manufacturing/job-card/route.ts` + `[name]/route.ts`, and modals `CreateJobModal`, `StartProductionModal`, `FinishProductionModal`. None are wired.
- **Build:**
  1. **Auto-create Job Cards from a submitted Work Order** (one per operation/route on the BOM/WO).
  2. **Employee selector** on each Job Card (feeds `time_logs[].employee`) — populated from the HR Employee master (T4).
  3. **Start** and **Finish** actions that actually write time logs and advance the Job Card status (Start logs `from_time`/employee; Finish logs `to_time`/`completed_qty`).
  4. **Three-way tie:** Job Cards must be visible and linked from (a) the **SO detail**, (b) the **WO detail**, and (c) the **Job Card module list** — each cross-links to the others.
  5. When all Job Cards for a WO are finished, the **WO rolls up to Completed** (use the existing `make-stock-entry` route at `app/api/manufacturing/work-order/[name]/make-stock-entry/route.ts` for the manufacture entry — hand-built SEs do NOT advance a WO; use ERPNext's `make_stock_entry`).
- **Acceptance:** WO submit → Job Cards appear on WO + SO + job-card list → assign 3 employees → Start then Finish each → WO auto-completes → completion visible on SO.

### T4 — HR master (full, not a stub)

- **What exists:** `app/hr/employee/{page,new,[name],edit}`, `app/hr/settings/{department,designation}`. The create/edit pages are not v4-functional and there's no dashboard or broader HR surface.
- **Build (user wants "a full HR master with all the options ERPNext provides"):**
  1. **Employee CRUD** as proper v4 pages (create/edit/detail) — functional, validated, premium-UI.
  2. An **HR dashboard** (`app/hr/dashboard`) with the standard HR KPIs and module cards, consistent with the other module dashboards.
  3. Surface the **ERPNext-provided HR menus** the user expects (Employee, Department, Designation, Attendance/Leave/etc. as far as the ERPNext install exposes them) — at minimum wire the masters that the shop-floor flow needs.
  4. The **employee selector consumed by Job Cards (T3)** must read from this master.
- **Acceptance:** create/edit an employee through v4 pages; HR dashboard renders; the employee appears in the Job Card employee selector. **B4 is a hard dependency of T3** — without it the shop-floor slice can't assign labor.

---

## 3. PART 12 — Stock-level modal wired into create flows

- **What exists:** `components/stock/StockLevelModal.tsx` is built but **mounted nowhere.**
- **Build:** mount it in **Sales Order create** and **Quotation create** so that while adding an item the user can open it and see **current stock by warehouse** (use `lib/stock/bin-levels.ts` / the bin API already present). Closing it must not disturb the line being edited.
- **Acceptance:** in SO/QN create, opening the modal on an item shows real per-warehouse stock.

---

## 4. REPORTS — enhancement pass (Part 16 was the one thing built well)

Reports module is solid; **upgrade it this round:**
- Add **more data points and actionable pointers** for: **Inventory** (low-stock / reorder signals), **BOMs** (cost/where-used), and **recent Work Orders** (status, throughput) — in addition to the existing Sales/AR/AP/P&L/Purchases/Stock/Manufacturing reports.
- "Actionable pointers" = each report surfaces next-action callouts (e.g., "5 items below reorder level → reorder"), not just numbers.
- Apply an **enhancement to the existing report workflow** (keep YoY date controls + URL-persisted filters; tighten the interaction).
- **Acceptance:** the three new data domains render with actionable callouts; existing reports + filters still work.

---

## 5. POWER FEATURES — global rollout + card-default (Part 17 redo)

- **Revert** the SO change that made the default list view non-cards: the **default view is CARDS for ALL modules** again.
- **Keep** the power features themselves.
- Power features were **only implemented on SO** — **roll them out globally** to every module's list page this round.
- **Add upgrades:** more power features on this global pass (the user wants the set expanded, not just ported).
- **Acceptance:** every module list defaults to cards; power features available consistently across all module lists; new power features present.

---

## 6. PRINT TEMPLATES — for all docs (requested, never built)

- **What exists:** `components/ui/print-share.tsx` + `app/print.css` — partial infra, not a real per-doc template, and **not what the user asked for.**
- **Build:** a **proper print/PDF template for all transactional docs** (Quotation, SO, DN, SI, PI, PO, PR, Payment Entry, Work Order, Job Card as applicable) — branded, clean, paginated, with the doc's line items, totals, taxes, and party details. Wire a **Print** action on each doc detail that produces it.
- **Investigate first:** determine why the earlier "print template" request produced only `print-share`/`print.css` and didn't reach the docs — then implement it correctly so every doc has a working printable/exportable template.
- **Acceptance:** every listed doc detail has a working Print action that renders a correct, branded template.

---

## 7. NOTIFICATION AGGREGATION (user: "a really big gap … implement this round")

- **What exists:** `components/notifications/notifications-panel.tsx` + `app/settings/notifications` — the panel shell exists but nothing feeds it.
- **Build:** **aggregate every CRUD/operation event into the notification modal.** Every toast the system shows today (SO created, WO created, payment recorded, item created, delete, update, errors, etc.) must ALSO be recorded and listed in the notifications panel — a persistent, scrollable feed of all operations, not just an ephemeral toast.
- Recommend a single **notification sink** (a store/hook) that the existing toast call sites also push to, so toast + panel stay in sync without duplicating call sites everywhere.
- **Acceptance:** perform several operations (create SO, create WO, record PE, edit item) → each appears as a toast AND persists in the notifications panel with type/time/link to the doc.

---

## 8. BUILD ORDER, GATES, REPORTING

### Build order
1. **§1 Half A residuals** (fast; clears regressions).
2. **§2 Shop-floor slice T1→T2→T3→T4** (P0; the core — test as one chain).
3. **§3 Part 12 modal.**
4. **§6 Print templates** + **§7 Notification aggregation** (cross-cutting; touch many docs — do after the slice so the new docs are covered).
5. **§5 Power features global** + **§4 Reports enhancement.**

### Constraints
- **Do NOT touch CrossFlow / FlowRail visuals** (2P-FINAL lock). All rail work this round is **data-path / resolver / mount parity only.**
- Reference `docs/v4/MESH_REPORTING_CONTRACT.md`.
- Flag any ERPNext v15 field-name uncertainty (esp. Job Card `time_logs[].employee`, Manufacturing Settings warehouse fields) **against generated types** (`types/doctype-types.ts`) rather than guessing.

### Gates (floor, not done)
- `tsc --noEmit` = 0
- `vitest run` green
- **Plus the Definition of Done in §0:** per-part wiring path + the manual verification steps you ran. **No BUILD COMPLETE on a stub.**

### Report back (per `MESH_REPORTING_CONTRACT.md` Rule 5 — mandatory)
1. A per-part table: part · files touched · wiring path (file → handler → API route → ERPNext method) · status. Where you could not verify a path, mark **UNVERIFIED** explicitly.
2. **AND** end with the ordered **manual live-retest checklist** the contract requires — route → action + field values → expected result → failure string — covering everything you changed, structured so the user can walk it top-to-bottom exactly like the 2S retest. **A report missing this checklist is incomplete and will be rejected unread.** Then I audit and the user runs the live retest.
