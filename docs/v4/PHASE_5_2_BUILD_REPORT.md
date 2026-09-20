# Version 5.2-A — "One-Click Completion" — Build Report

**Branch:** `feat/v4-phase-2t-halfb-remediation` → PR chain to `main`
**Date:** 2026-09-14
**Round:** 5.2-A — finishes the 4.1.1 deferred queue (everything the v4.1.0
report explicitly parked for live-test feedback, plus what that earlier batch
half-wired).
**Gate:** `tsc --noEmit` 0 errors · `vitest run` 539/539 green (34 new, 1
re-pinned) · live E2E of every new server mechanic against the Pana VPS
(cleanup-verified).

---

## What 5.2-A is

v4.1.0 stamped one-click easing across the transactional flows and parked
eight deferred items pending Kidus's feedback. v4.1.1's first batch (shipped
inside `e5e43a5`) already landed D1/E1/E2/E3-partial/F1/G1/G2 — but with real
gaps this round closes:

| Deferred item | Was | Now |
|---|---|---|
| **D1 — Default Mode of Payment** | lib + route + settings page existed, but the field was never provisioned live (writes were silently dropped) and the SI/PI dialogs hardcoded `"Cash"` — bypassing the config every time | `payment-defaults` PUT self-provisions the Custom Field (idempotent); the settings hub links the page; SI + PI Mark-as-Paid dialogs hydrate the mode from `usePaymentDefaults()` |
| **E3 — WO-list inline/bulk** | card Finish was a stub toast ("mark from its detail page") | Finish runs the canonical `/complete` route (ERPNext Manufacture SE → WO Completed) with a per-card spinner; bulk bar gains **Finish Selected**; the old add-then-toggle selection flicker on card Start is gone |
| **Job Card auto-run** | Start → Complete, two clicks | **`run`** action: one click = employee-guarded append-closed-log (1-min span, from≠to validated live) → submit → 2Y-R6 WO auto-complete still fires when it was the last open JC. Re-run on a completed JC is an idempotent success. Surfaces: JC detail (Run Job primary, Start kept for real time-tracking), WO-detail JC table, SO cockpit JC rows |
| **Quick Item** | absent | `/api/stock/item/quick` — name in, working Item out (`item_code` = name, group defaults Products, `Services → is_stock_item 0`, UOM Nos, company + receiving warehouse written to `item_defaults`); idempotent. ⚡ Quick Item dialog beside **New Item** on the Inventory list |
| **Shortfall auto-PO** | deep-linked the 3-step PO wizard | `/api/buying/purchase-order/shortfall` — short lines grouped by each item's `item_defaults.default_supplier` (company row first, any-company fallback — ERPNext's own order), one PO per supplier, born submitted. PO items carry `schedule_date` (live-probe: 417 "Please enter Reqd by Date" without it); rates auto-fill from the price list (0 for unpriced items — ERPNext allows it). Missing supplier → plain-language 422 listing the items. **Order Shortfall (auto)** is now the modal's primary; wizard stays as "(advanced)"; the stale Material Request deep-link is removed (MR is deactivated) |
| **SE→DN chaining** | absent | Minimal honest scope: a **Completed** WO with a linked SO gets a primary **Deliver & Invoice** whatsNext that hands off to the SO cockpit (where the proven one-click DN+SI already lives) — no duplicate chain path |
| **D2 — PO auto-approve** | — | Already resolved by 4.1-C2 (dead Approve/Reject machinery removed; PO submit writes bare `docstatus`). Nothing built |
| **A5 — PI→PE mapper** | — | Already resolved by A1 (`payment/quick` party-agnostic = "Pay this bill" one-click). Nothing built |

## Live E2E evidence (service-account simulation of the exact route payloads)

- `Custom Field` `Accounts Settings-custom_default_mode_of_payment` created →
  write `"Cheque"` → `get_value` reads `"Cheque"` back → reset to empty for
  your test. Provisioned for real; the route's ensure is idempotent over it.
- Quick Item insert with the `item_defaults` row → `"ZZ-E2E-QUICK-52A"` created
  → deleted.
- Shortfall PO submit: `PUR-ORD-2026-00014` born `docstatus 1`, cancelled +
  deleted; supplier item deleted. (Rate auto-fill confirmed on priced items:
  probe filled 66.92.)
- JC run simulation on the seeded demo `PO-JOB00001`: Open → assign employee
  (`HR-EMP-00001`) → closed log → submit → **Completed / docstatus 1**, parent
  `MFG-WO-2026-00001` correctly stayed **Not Started** (its sibling JC is still
  open → no premature auto-complete). ⚠️ Side effect: `PO-JOB00001` is left
  Completed on the old demo WO — it was already dead seed data.
- **Flagged, not touched (out of scope):** the cascade-cancel map still has no
  Work Order → Stock Entry edge (deferred by design in 5.1-A — cancelling an SE
  reverses stock). Add only if a cancel-chain actually hits it.

## Boundary / conventions

Factory idiom end-to-end: `getRequestClient` fail-closed 401 → named
`frappe.client.*` calls → Zod at both new route boundaries → partial-failure
contract on the multi-supplier PO loop (created names ride the error) → no
`/api/resource` in any touched file (pinned by test). Semantic tokens + the
SO-cockpit spinner/✓ vocabulary on every new button. No schema work; no locked
flow files touched.

## Files

**New:** `app/api/stock/item/quick/route.ts`,
`app/api/buying/purchase-order/shortfall/route.ts`, `tests/v5-2-oneclick.test.ts`.
**Edited:** JC lifecycle route (`run`), payment-defaults route (ensure field),
`use-job-card-lifecycle`, JC detail, WO detail (+CTA), WO list, SO cockpit,
item list, StartProductionModal, SI detail, PI detail, accounting settings
hub, `v4-1-1-loosen` test re-pin (E3 → `handleBulkRun`).

## Live-test checklist for Kidus

Run against `http://localhost:3000` with the VPS. One dev server only.

1. **Payment Defaults settings page reachable + saves.** `/accounting/settings`
   → the 4th card is **Payment Defaults** → open it → pick e.g. **Cheque** →
   **Save Defaults** → toast "Payment defaults saved". Reload the page → Cheque
   is still selected. **Failure:** the select resets to empty after reload →
   report the toast text you saw on save.
2. **Mark as Paid prefills the configured mode.** Open any submitted unpaid
   Sales Invoice → **Mark as Paid** → the Mode of Payment select shows
   **Cheque** (your saved default), not Cash. Change it to **Cash** → confirm →
   success toast names the mode; refresh → invoice status Paid, rail Payment
   stage lights. Repeat once on a Purchase Invoice (vendor bill → **Pay**).
   **Failure:** mode shows empty/Cash while a default is saved → "mode did not
   hydrate".
3. **Work Order list — Finish for real.** `/manufacturing/work-order` → an
   **In Process** card → **Finish** → spinner "Finishing…" → success toast
   "Work Order … finished" + card badge flips **Completed**. Then a **Not
   Started** card → **Start** → checkbox must NOT flicker. Select several cards
   (mix of statuses) → bulk bar → **Finish Selected** → only the In Process
   ones move; a skip-note toast appears if nothing was eligible. **Failure:**
   card still says "mark from its detail page" (stale bundle → hard refresh).
4. **Run Job (one click).** Open a WO with **Open** Job Cards (SO cockpit or
   WO detail): each JC row now shows **Run** (+ secondary **Start**). Pick an
   employee if none assigned, click **Run** → JC → Completed immediately
   (badge, no second click). Run the LAST open JC of a WO → toast also reports
   "Work Order … auto-completed". On the JC detail page the same shows as a
   **Run Job** primary button. **Failure:** "Assign an employee before running
   this Job Card." → assign via the picker next to the button and re-run.
5. **Quick Item.** `/stock/item` → **⚡ Quick Item** → type e.g.
   `Gloss Card 350gsm` → **Create Item** → success toast with an **Open**
   action → new item page; back on the list the item is present. Re-open the
   dialog and submit the SAME name → toast says it already existed (no
   duplicate). **Failure:** report the toast text.
6. **Shortfall auto-PO.** Open a submitted WO whose materials are short (or
   temporarily set a required item's on-hand below need via /stock item Adjust
   Stock) → **Start Production** → "Shortfall detected" box →
   **Order Shortfall (auto)** → success toast lists the PO(s) with a **View PO**
   action → PO detail is **submitted** (Received/Approved state per PO parity),
   remarks name the WO. If any short item has no Default Supplier you get the
   plain-language prompt naming them — the **PO wizard (advanced)** button must
   still be there for that case. The **Material Request** button is gone.
   **Failure:** paste the exact error string.
7. **WO → Deliver handoff.** A **Completed** WO with a linked Sales Order →
   right rail whatsNext shows primary **Deliver & Invoice** → click → lands on
   that SO's cockpit (whose existing one-click chain then does DN + SI).
   **Failure:** CTA missing on a Completed WO that has `Sales Order` — report
   the WO name.

## Explicitly NOT in scope
No cascade-map changes (WO→SE edge still deferred by design) · no changes to
flow-graph/resolve locked files · no MR reactivation · D2/A5 already resolved
(see table) · no new doctypes or schema · no UI redesign beyond the buttons +
dialog this queue names.
