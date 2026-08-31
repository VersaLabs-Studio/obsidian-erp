# Phase 2Y-R2 — Fold-in & Re-do (the 2Y build failed live retest)

**Base branch:** current 2Y work branch (contains the mesh's 2Y commit). **Cut:** `feat/v4-phase-2y-r2`.
**Contract:** `docs/v4/MESH_REPORTING_CONTRACT.md`. End with the Rule 5 checklist.
**Definition of Done:** works **end-to-end against live ERPNext** (`http://91.99.119.239`, company **Pana**, abbr **P**, ETB). **Green `tsc`/`vitest` is NOT done.** The 2Y build reported "all 8 parts built as specified" and then failed live on almost every part because provisioning was never run and pages were never wired. **Every item below is signed off by a live action, and you paste the exact result.**

> **Why 2Y failed (read this):** the mesh wrote code but never executed the live side or wired the surfaces. Live queries proved: **0** of the 8 workstations existed, the FS **custom field was never created**, the report pages were **never surfaced in nav**, and the JC list still **500s** on a child-table field. This round is mostly *finishing* what was claimed.

---

## ✅ Already fixed LIVE by the Brain this round — DO NOT redo, just consume

1. **8 Workstations + 8 matching Operations seeded on live** (verified): `Digital Paper Print, Offset Print, Banner Print, UV Print, DTF Print, CNC & Laser, Signage, Design Studio`. Each Operation shares the workstation's name and defaults to it. These are the values the SO cockpit assigns.
2. **FS custom field provisioned on live**: `Custom Field` **`pana_fs_number`** (label "FS No", Data) on **Sales Invoice** (`insert_after: po_no`) and **Purchase Invoice** (`insert_after: bill_no`). The field now persists — the create forms already write `pana_fs_number`, so values save. **What's missing is display (see P1).**
3. **Print-document subsystem built + wired (P6 core done).** New files: `lib/print/print-config.ts` (per-doctype templates for SO/SI/PI/PO/PR/DN/Quotation/Payment Entry + DN gate-pass), `components/print/PrintDocument.tsx` (real letterhead→parties→items→totals→signatures, hidden on screen, print-only), `components/print/PrintMenu.tsx` (the one-line control). `app/print.css` rewritten to isolate `.print-document`. Wired on **Delivery Note** (Customer Copy + Gate Pass), **Sales Invoice**, **Sales Order**. The old CSS-only "letterhead" and the duplicate DN buttons are gone. **Your job is to replicate `<PrintMenu>` across the remaining modules (P6-replicate).**

**The seed script must still be made durable** so a fresh environment reproduces #1 and #2 — see P5/P1 durability notes. But live (Pana) is already correct; do not re-run destructively.

---

## P0 — Job Card surface still 500s → all of P3 is dead (HIGHEST PRIORITY)

**Confirmed live + in code, unchanged from the 2Y handoff — the mesh never applied it.** `app/manufacturing/work-order/[name]/page.tsx:107`:
```ts
fields: ["name","operation","status","workstation","total_completed_qty","for_quantity","employee","time_logs"],
```
`time_logs` and `employee` are **child tables**, not columns → `pymysql OperationalError (1054) Unknown column 'time_logs' in 'SELECT'` → **HTTP 500** on the JC list → the card renders nothing → "Start is greyed, no WS/JC/employee assign, no Complete WO." This is why P3 is a total fail. See [[frappe-get-list-no-child-fields]].

**Required fix:**
- JC list query → **parent columns only**: `["name","operation","status","workstation","total_completed_qty","for_quantity","work_order"]`. **Remove `time_logs` and `employee`.**
- Read child data (`time_logs` for the lifecycle at lines ~282/321; `employee` rows for the chip) from the **full doc** via `useFrappeDoc("Job Card", jc.name)` / `get_doc`.
- **Auto-create now references the seeded masters** (they exist live): replace `DEFAULT_WORKSTATION = "Pana Print Floor"` / `DEFAULT_OPERATION = "Print & Finish"` (lines 389–390) with a **seeded** default (e.g. `Design Studio`/`Design Studio`) or the WO BOM's routing first row. **Delete the `/api/resource/<doctype>` POST provisioning in `ensureMaster` (lines ~392–424)** — that route 404s (`/api/*` is the Next namespace) and is now unnecessary. If a master is somehow missing, show a `GuidedErrorDialog`, don't POST.
- Apply the same "no child fields in get_list" rule to the **SO-detail** JC query (P3) and anywhere else. Grep every `useFrappeList`/`get_list` for child fieldnames.

**Retest:** R2 #0 (gates P3).

---

## P3 — SO cockpit: BUILD it (only unblocked once P0 lands + masters exist)

User: *"SO cockpit is not enhanced at all — Start greyed, no WS/JC/Employee assign, no Complete WO button. Failed."* Root cause is P0 (dead list) + missing masters (now seeded). With those fixed, build the cockpit in `app/sales/sales-order/[name]/page.tsx` per the original 2Y P3, all inline (no navigation):
- Per Job Card row: **assign Workstation** (FrappeSelect over the 8 seeded workstations → write `workstation` via `useFrappeUpdate`), **assign manufacturing Employee** (show `employee_name`, filter to shop-floor employees — query distinct `department` live and filter; fall back to all + note it), **Start / Complete** (2X lifecycle: status transitions + full-doc `frappe.client.submit` on complete — [[frappe-rest-submit-needs-full-doc]]), and **Complete Work Order** when all JCs are `Completed`.
- Reads employee/time_logs via **full doc**, never `get_list` fields (P0).
- Minimize everything else — only assign + mark-progress; no "new JC form," no SE, no BOM, no manufacturing navigation. See [[manufacturing-clamp-direction]].

**Retest:** R2 #1.

---

## P1 — FS No: show it on the detail + edit surfaces (backend done)

The custom field exists live and the create forms save `pana_fs_number`. **Now render it:**
- **Sales Invoice detail** (`app/accounting/sales-invoice/[name]/page.tsx`) and **Purchase Invoice detail**: add a `DataPoint`/field showing **FS No** (`pana_fs_number`) in the header/summary card. This is the user's exact complaint ("I don't see the FS number on the SI/PI detail page").
- **Edit pages**: ensure the FS field is present and pre-populated so edits round-trip.
- The **print** already includes FS No (SI/PI templates) — no work needed there.
- **Seed durability:** the custom-field provisioning must live in the seed/bootstrap script (`require("dotenv")`, idempotent, heal-on-rerun) so a fresh env reproduces it. Live Pana is already provisioned — the script is for the next environment.

**Retest:** R2 #2.

---

## P5 — Manufacturing clamp: finish it (workstations seeded; nav/ops remain)

Workstations/Operations are live (done). Remaining:
- **Seed durability:** add the 8 Workstations + 8 Operations to the seed script (idempotent) so a fresh env matches live.
- **Hide BOM *and* Stock Entry from the SME nav** (2Y hid BOM only — confirm SE is hidden too), keeping detail routes reachable (orphaned-registry rule [[orphaned-module-registries]]).
- **Valuation-only:** hide account/cost-center/GL fields on WO/JC/SE surfaces; perpetual inventory stays.
- BOM operations should reference the seeded workstations where relevant.

**Retest:** R2 #3.

---

## P6-replicate — Wire `<PrintMenu>` across the remaining modules

The subsystem is built and proven on DN/SI/SO. Replicate the **exact** one-line pattern on every other transactional detail page, passing the full doc from its existing `useFrappeDoc`:
```tsx
import { PrintMenu } from "@/components/print/PrintMenu";
// in PageHeader actions, replacing the old <PrintShare .../> print button:
<PrintMenu doctype="Purchase Invoice" doc={pi as unknown as Record<string, unknown>} />
<PrintShare doctype="Purchase Invoice" name={pi.name} showPrint={false} />
```
- Modules to wire: **Purchase Invoice, Purchase Order, Purchase Receipt, Payment Entry, Quotation, Material Request, Work Order, Job Card** (and any other doc detail with a `PrintShare`). Each already has a `getPrintTemplate` entry or falls back to a correctly-labeled generic — **confirm the title reads right** ("PURCHASE ORDER" on PO, etc.). Add a config entry in `lib/print/print-config.ts` for any doctype that needs bespoke columns.
- **Set `showPrint={false}`** on every remaining `PrintShare` so there is exactly **one** Print control per page (the DN double-button bug must not recur anywhere).
- **Delete the now-dead `components/stock/DNPrintMenu.tsx`** (no longer imported).
- **Gate pass / customer variants:** DN is done. If any other doc needs a second variant, add it to `PrintMenu variants={[...]}`.
- **Visual match:** the client provided `public/export-format.pdf` as the target look — I could not render it locally to match pixel-for-pixel. Compare the printed output to that PDF and adjust the letterhead/spacing in `print-config.ts` + `app/print.css` (`.pd-*` classes) to match; the **structure** (per-doctype title, parties, items, totals, gate-pass no-prices, signatures) is already correct.

**Retest:** R2 #4.

---

## P7 — Reports: SURFACE them (they were built but never reachable)

User: *"none of the report modules were implemented — complete fail."* The mesh **did** create `app/reports/stock-balance`, `manufacturing-production`, `sales-performance`, `procurement-spend` + `components/reports/ReportScaffold.tsx` — but **never surfaced them in nav/routing**, so they don't exist to the user (classic orphaned-registry). Fix:
- **Add a Reports hub + sidebar entry** in `components/Layout/Layout.tsx` (and BUILT_MODULES / getDocTypeRoute as applicable) so `/reports` and each report are reachable. This is the whole reason P7 "failed."
- **Verify each report loads with LIVE data**, filters work, at least one chart renders, CSV export + print work. Fix any report that errors or shows empty against live.
- Confirm the four flagship reports cover Sales, Manufacturing, Stock, Procurement; note any deferred.

**Retest:** R2 #5.

---

## Guardrails
- **No child-table fields in any `get_list`** ([[frappe-get-list-no-child-fields]]); **never** call `/api/method/*` or `POST /api/resource/*` from the client (both 404 — `/api/*` is the Next namespace). Use the SDK hooks / a real server route.
- No `any` in production paths (the print subsystem casts the doc to `Record<string, unknown>` at the call site only — keep it there), no `@ts-nocheck`, no invented abstractions — extend `PrintMenu`/`print-config`, `useFrappeUpdate`, FrappeSelect.
- ETB; company Pana (abbr P) — resolve, don't hardcode.
- Locked: `lib/flows/flow-graph.ts`, `app/api/flows/resolve/route.ts`, `tests/flow-resolver.test.ts`.

---

## Required return (Rule 5 — ordered live-retest checklist)
0. **JC list alive** — `/manufacturing/work-order/<WO>`: JC list loads with **no 500** (was `1054 time_logs`); Create JC inline (no `/api/resource` 404, no redirect); assign WS + employee persist. Repeat from `/sales/sales-order/<SO>`. **Fail:** paste exact 500/404.
1. **SO cockpit** — from `/sales/sales-order/<SO>`: assign workstation (one of the 8) + manufacturing employee (name, not ID), Start → Complete JC, Complete WO — all inline. **Fail:** "Start greyed / no button / navigated away."
2. **FS No visible** — open a Sales Invoice + Purchase Invoice detail page → **FS No shows**; edit round-trips; GET confirms `pana_fs_number`. **Fail:** "absent on detail."
3. **Manufacturing clamped** — SME nav shows no BOM and no Stock Entry; WO/JC show no accounting fields; the 8 workstations are assignable. **Fail:** name what's still visible.
4. **Print, every module** — open SO, SI, PI, PO, PR, DN, Payment Entry, Quotation details → **one** Print button each; output is a real branded document titled correctly (SO→"SALES ORDER", SI→"TAX INVOICE" with FS No, DN→Customer Copy + Gate Pass with **no prices**). **Fail:** "two buttons / wrong title / blank / prices on gate pass."
5. **Reports reachable** — sidebar has Reports; each of the 4 opens with live data, filters, a chart, CSV export, print. **Fail:** "not in nav / errors / empty."

---
**End 2Y-R2.** The Brain has already landed the live provisioning (workstations, operations, FS field) and the print subsystem (built + wired on DN/SI/SO). The mesh's job is to finish: fix the P0 JC 500, build the SO cockpit on top of it, show FS on detail, clamp manufacturing nav, replicate PrintMenu, and surface the reports. Report back with Rule 5 live results — I gate against live before any Pana deploy.
