# PHASE 2V — Manufacturing E2E Hardening + Deferred Features

**Branch base:** `feat/v4-phase-2t-halfb-remediation` → cut `feat/v4-phase-2v-mfg-e2e`
**Reporting contract:** This build MUST follow `docs/v4/MESH_REPORTING_CONTRACT.md` in full. In particular **Rule 5** — the completion report MUST end with an ordered, manual **live-retest checklist** (route → action + concrete values → expected result → exact failure string), one block per work item below.
**Definition of Done:** A work item is DONE only when the user action works **end-to-end against live ERPNext**. Green `tsc` + `vitest` is the floor, not the finish line. Every item here is an *orphaned-wiring / wrong-key* class defect — the implementations mostly exist; they are mis-keyed, mis-routed, or hidden. Do **not** rewrite working engines; wire them.

Brain (Opus 4.8) verified every root cause below against the real tree at the cited `file:line`. Trust these citations; confirm before changing adjacent behavior.

---

## ARCHITECTURE DECISIONS (read first — they constrain the build)

### ADR-1 — BOM cannot be disabled; make it *automatic* instead
ERPNext **hard-requires `bom_no` on a Work Order** (mandatory; a WO cannot be submitted without one). "Disable BOM" is therefore not implementable while we use Work Orders. The SME-friendly posture is:

- **BOM becomes invisible/automatic.** When a production item has no BOM, offer a one-click **"Quick BOM"** that creates a minimal single-level BOM (the production item + the raw materials the user names, default qty 1) and submits it — so the SME never hand-builds a BOM doc. The WO create flow should call this transparently when `bom_no` is missing.
- **BOM *routing* (operations) stays OPTIONAL.** Routing is what spawns Job Cards. No routing → no Job Cards → simpler flow (correct for most print jobs). Only shops wanting per-operation tracking add operations. Do **not** force operations.
- Net rule for the build: never block a production action on "no BOM" with a dead-end — always offer Quick BOM. Never imply Job Cards are required.

### ADR-2 — Per-employee Job Card assignment is standard ERPNext; surface it
Job Card has an `employee` **Table MultiSelect** child field. Write shape is **`employee: [{ employee: "<EMP-ID>" }, …]`** (one row per assignee; union, don't replace). `time_logs` rows also each carry an `employee`. This is native — we are only *exposing* it, not inventing it. The Zod schema already models it: `JobCardSchema.employee: z.array(z.unknown()).optional()` (`lib/schemas/doctype-schemas.ts:4045`).

---

## P0 — MANUFACTURING END-TO-END (the critical path; all of this must work live)

### P0-1 — "On hand: 0" despite full stock (shortfall false-positive)
**Symptom (live):** "Start production" modal reports a shortfall (`on hand: 0`) for an item the Stock Ledger shows thousands of (e.g. `P-002` = 6 000 in `Stores - P`). Production is blocked incorrectly.

**Root cause:** `components/manufacturing/StartProductionModal.tsx:187-219`. The `Bin` query fetches only `["item_code","actual_qty"]` with **no `warehouse` field and no warehouse filter**, then builds `binByItem` keyed by **`item_code` alone** (`m.set(b.item_code, …)` at :198-202). A `Bin` is per *(item, warehouse)* pair, so multiple rows exist for `P-002` (Raw Materials-P, Stores-P, WIP-P). The map is last-write-wins → it collapses to an arbitrary warehouse's qty (often 0).

**Required change:** Reuse the existing correct helper — **do not write a new one**. `lib/stock/bin-levels.ts` already exports `binLevelsByItemWarehouse(rows)` keyed `` `${item_code}::${warehouse}` `` and `checkReadiness(...)` scoped by source warehouse.
1. Add `warehouse` to the `Bin` query `fields`, and filter to the relevant source warehouse(s) (`["warehouse","=", sourceWh]` once `sourceWh` is resolved — note `sourceWh` is computed at :204).
2. Replace the `binByItem` map with `binLevelsByItemWarehouse(bins)` and look up `` `${line.item_code}::${sourceWh}` `` in `summaryLines` (:206-219).
3. If a required item carries its own `source_warehouse`, key on that; else fall back to `sourceWh`.

**Acceptance:** With `P-002` at 6 000 in `Stores - P`, the modal shows `on hand: 6000`, no shortfall, and "Transfer & start" proceeds. **Failure string to report:** "still shows on hand: 0 / shortfall when ledger has stock in the source warehouse."

### P0-2 — Shortfall should offer a prefilled **Purchase Order**, not Material Request
**Symptom (requested):** On a real shortfall, the user wants to procure via a **prefilled PO**, not an MR.

**Root cause / location:** `StartProductionModal.tsx:498-527` — the shortfall block currently offers "Create Material Request" (:503-515) and "Stock Reconciliation".

**Required change:**
- Make the **primary** shortfall CTA **"Create Purchase Order"**, routing to `/buying/purchase-order/new?work_order=<WO>&shortfall=<item:qty,item:qty>` (same `shortfall` payload shape already built at :504-507). Keep "Stock Reconciliation" as the secondary (count-correction) path. You may keep "Material Request" as a tertiary link, but PO is primary.
- Wire **`app/buying/purchase-order/new/page.tsx`** to parse `?shortfall=` (and `?work_order=`) into prefilled PO line items (item_code + qty from the shortfall pairs). **Supplier stays blank** for the user to pick (PO requires a supplier; do not guess one). If the page already accepts an items prefill param, reuse it; otherwise add the parser mirroring how `material-request/new` consumes `shortfall`.

**Acceptance:** Shortfall → "Create Purchase Order" → PO new form opens with the short item(s) and qty prefilled, supplier empty. **Failure string:** "PO opens blank / shortfall items not prefilled" or "still routes to Material Request as the primary action."

### P0-3 — Job Card module is hidden everywhere (`isModuleBuilt` gate)
**Symptom (live):** A Job Card linked to a WO never appears on the WO detail page; the SO-detail Manufacturing card's Job Cards never appear; employee assignment is "completely missing."

**Root cause:** `"Job Card"` is **absent from `BUILT_MODULES`** (`lib/flows/module-availability.ts:7-36`). The WO-detail Job Cards section is gated `{isModuleBuilt("Job Card") && …}` (`app/manufacturing/work-order/[name]/page.tsx:601`), and the SO-detail card gates the same way. With the gate false, the entire section (query + table + assignment UI) is never rendered — which reads as "no connection made."

**Required change:** Add `"Job Card"` to `BUILT_MODULES` (with a `// Phase 2V — Job Card UI` comment). Verify the WO-detail query filter is correct — it is: `[["work_order","=",name]]` (`work-order/[name]/page.tsx:105`).

**Acceptance:** A WO that has Job Cards shows them in the "Job Cards" InfoCard on its detail page, and in the SO-detail Manufacturing card. **Failure string:** "Job Cards section still not rendering on WO/SO detail."

### P0-4 — `/job-card/new` 404 (missing module prefix in route map)
**Symptom (live):** `GET /job-card/new?work_order=MFG-WO-… 404`. The real route is `/manufacturing/job-card/new`.

**Root cause:** `getDocTypeRoute` (`lib/flows/flow-chain-resolver.ts:132-156`) has **no "Job Card" entry**, so it falls to the default slug `doctype.toLowerCase().replace(/\s+/g,"-")` → `"job-card"` (no `manufacturing/`). Any flow-rail / cross-flow create affordance for Job Card builds the wrong URL.

**Required change:** Add `"Job Card": "manufacturing/job-card"` to the `routeMap`. (One line. Audit the map for any other built doctype missing — Job Card is the known gap.)

**Acceptance:** Every Job Card link/create affordance resolves to `/manufacturing/job-card/...`; no 404. **Failure string:** "still 404s on /job-card/new."

### P0-5 — WO flow rail shows no document connections
**Symptom (live):** The FlowRail on the Work Order detail page is "broken — no doc connections."

**Root cause (two-part):**
1. `getFlowForDocType("Work Order")` resolves to **`lead-to-cash`** (WO is a stage there, `flow-definitions.ts:53-60`), so the WO rail tries to render the full 8-stage Lead→Payment chain — wrong altitude for a manufacturing user, and mostly unresolved.
2. `lib/flows/flow-link-map.ts` only defines **WO → Job Card** (:298-306). It lacks WO's **upstream** edge to Sales Order (`Work Order.sales_order`) and **downstream** edge to Stock Entry (`Stock Entry.work_order`), so the BFS in `resolveFlowGraph` can't walk to neighbors → empty rail. This is the recurring child-field/link-map gotcha (see `memory/flow-resolver-child-field-gotcha.md`).

**Required change:**
1. **Add a dedicated `MANUFACTURING_FLOW`** to `flow-definitions.ts` and register it in `FLOW_DEFINITIONS` (:216-220). Stages (concise, manufacturing-scoped): **Sales Order → Work Order → Job Card → Stock Entry (Finished Goods)**. Mark Job Card `isOptional: true` (routing-dependent, per ADR-1). Mirror the existing `FlowDefinition` shape exactly.
2. **Thread `flowId="manufacturing"`** on the WO detail page: `useFlowChain("Work Order", name, undefined, "manufacturing")` (`work-order/[name]/page.tsx:117`). This uses the §3 four-point `flowId` plumbing already in place (`resolveFlowGraph` → `/api/flows/resolve` → `resolveFlowChain` → `useFlowChain`) — confirm all four still pass `flowId` through; if the rail is still empty, the projection point in `flow-graph.ts` is the suspect (see the §3 note in the memory file).
3. **Add the missing link-map edges** in `flow-link-map.ts`: `Work Order → Sales Order` (parent header `sales_order`) and `Work Order → Stock Entry` (child/back-link `work_order`). Emulate Frappe `validate_filters` semantics — header field vs child-table field placement is the exact thing that has repeatedly produced dark-rail 417s; get the `queryDoctype`/field side right.

**Acceptance:** Opening a WO created from an SO shows a populated rail: SO (done) → WO (current) → Job Card (pending/optional) → Stock Entry, with the real linked doc names and no 417/empty state. **Failure string:** "WO rail empty / shows 8-stage sales rail / 417 from /api/flows/resolve."

### P0-6 — Draft SO routes to a blank WO form (no prefill); fix the create affordance
**Symptom (live):** On a **non-submitted** Sales Order, the create-WO affordance navigates to `/manufacturing/work-order/new?sales_order=…` — a blank form with header-only prefill (can't represent a multi-line SO), forcing manual re-entry. The automated inline engine that worked this round is bypassed.

**Root cause:** The **FlowRail `nextAction`** for the SO→WO edge uses the generic `getDocTypeCreateUrl` (`flow-chain-resolver.ts:177-180`) → `/manufacturing/work-order/new?sales_order=`. The `lead-to-cash` `sales-order` stage declares `canCreateDownstream: true, createAction: "create_work_orders"` (`flow-definitions.ts:50-51`) but the rail renders it as a navigation, not the inline multi-create. Separately, the WhatsNext "Create Work Orders" action (`sales-order/[name]/page.tsx:423-427`) is the correct inline path and is already gated to a submitted SO (Edit D, prior round).

**Required change:**
1. **A Work Order is only creatable from a SUBMITTED Sales Order** (ERPNext rule). On a **draft** SO, there must be **no** WO-create navigation: the FlowRail SO→WO create affordance must be **disabled with reason "Submit the Sales Order first"** — never a link to the blank form.
2. On a **submitted** SO, the SO→WO create affordance (rail *and* WhatsNext) must invoke the **inline `executeCreateWorkOrders` engine** (one draft WO per line, prefilled `production_item/qty/fg_warehouse/bom_no/sales_order`) — the same engine wired this round (`sales-order/[name]/page.tsx`), **not** `router.push` to `/work-order/new`. Make the FlowRail's SO→WO `createAction` call back into the page's `handleCreateWorkOrders` (lift a callback into the rail, or intercept the `create_work_orders` action) rather than emitting a URL.
3. Apply ADR-1: if any line's item has no BOM, the engine should offer **Quick BOM** inline instead of failing.

**Acceptance:** Draft SO → no blank-form navigation (affordance disabled with the submit-first reason). Submitted SO → inline multi-create produces draft WOs with prefill, exactly as the P0 that now passes. **Failure string:** "draft SO still opens blank WO form" or "submitted SO navigates to /work-order/new instead of inline-creating."

### P0-7 — Job Card has no E2E lifecycle UX (status machine + employee assignment)
**Symptom (live):** "JC start works but no UX change — it just displays 'Start Job' again. No E2E flow exists. Assign-employee is completely missing." The WO-detail Job Cards table (`work-order/[name]/page.tsx:633-680`) is **read-only** (operation / workstation / status badge / link) — no lifecycle action, no employee column.

**Required change (build the lifecycle inline, on BOTH the WO-detail JC table and the SO-detail Manufacturing card):**
1. **Status machine action per row:** Open → "Start" (status `Work In Progress`) → "Complete" (status `Completed`), via `useFrappeUpdate("Job Card", …)`, with optimistic refetch so the button + badge reflect the new state immediately (the current bug is no refetch/re-render after start). Reuse the standalone JC detail page's machine (`app/manufacturing/job-card/[name]/page.tsx`) — extract a shared handler if cleaner; do not duplicate logic three ways.
2. **Employee assignment per row (ADR-2):** inline `FrappeSelect doctype="Employee" labelField="employee_name"` (the SO-detail card already has this pattern). On select, write **`employee: [...existingRows, { employee: <id> }]`** (union, dedup by id) via `useFrappeUpdate("Job Card", …)`; render assigned employees as chips. Add an `employee` field to the WO-detail JC query so existing assignees render (currently `fields` at :106 omits it).
3. Surface any ERPNext rejection of the `employee` write through `GuidedErrorDialog` (do not swallow). This is the one write-shape needing live confirmation; if Frappe rejects `[{employee:id}]`, report the exact field error.

**Acceptance:** From a WO (or SO) detail page: Start a Job Card → badge flips to "Work In Progress", button becomes "Complete" without a manual reload; assign an employee → chip appears and persists across refetch. **Failure string:** "Start does nothing / button stays 'Start'" or "employee assign throws `<paste Frappe field error>`."

---

## P1 — DEFERRED FEATURES (fold in this round, per the user's request)

### P1-1 — Notification detail-on-click (CRUD context, not just redirect)
**Requested behavior:** Clicking a notification should **both** redirect to the affected document **and** display *what CRUD operation happened* — which doctype, which action (create/update/submit/cancel), and the salient field(s) — so the user understands what changed, not just where.

**Where:** `lib/stores/notification-store.ts` (notification model/state) and the notification UI (`app/settings/notifications/page.tsx` + the bell/dropdown in the layout). Extend the notification record to carry `{ doctype, docName, operation, summary/fieldDeltas }` at emit time (where notifications are created on mutation success), and render a detail panel/expander on click that shows that context alongside the redirect link.

**Acceptance:** Click a notification → see "Created Sales Order SO-… / Submitted Work Order MFG-WO-… (qty 10)" style detail **and** navigate. **Failure string:** "notification still only redirects with no CRUD detail."

### P1-2 — Wire warehouse defaults into create pages that need them
**Context:** Warehouse defaults now resolve correctly (`lib/stock/warehouse-defaults.ts`, `app/api/stock/settings/warehouse-defaults/`). They must prefill the create forms that require a warehouse so the user isn't picking manually each time.

**Where (prefill initial form values from the resolved defaults):** `app/stock/stock-entry/new`, `app/stock/material-request/new`, `app/stock/purchase-receipt/new`, `app/manufacturing/work-order/new` (source/WIP/FG), and any SE/transfer wizard. Use the existing `fetchWarehouseDefaults` / `resolveCompanyWarehouses` helpers (already used by `StartProductionModal`); do not refetch redundantly.

**Acceptance:** Each listed create page opens with the company's default source/target/FG warehouse preselected (user can override). **Failure string:** "<page> still opens with empty warehouse fields."

---

## GUARDRAILS
- OKLCH tokens only; no `@ts-nocheck`; no `any`. Match the surrounding golden-template style on each page.
- Reuse existing helpers (`bin-levels.ts`, `warehouse-defaults.ts`, `frappe-error-resolver`, `GuidedErrorDialog`, `FrappeSelect`) — this round is wiring, not new infrastructure.
- The §3 `flowId` plumbing is locked (resolver tests 26/26). If you touch `flow-graph.ts` projection for the manufacturing flow, keep `tests/flow-resolver.test.ts` green and emulate Frappe `validate_filters` for any new link-map edge.
- Run the full suite with `--testTimeout=30000` (env setup under parallel load trips the default 5s on 2 unrelated smoke tests; 427/427 with the raised timeout).

## REQUIRED RETURN (Rule 5)
End the build report with a per-item live-retest checklist (P0-1 … P1-2), each as: **route → action + concrete values → expected → exact failure string**. Do not mark any item DONE on green gates alone — each must be confirmed against live ERPNext (Pana dataset).
