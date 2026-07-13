# Phase 2Y-R2/R3 + 2Z — Build Report

**Branch:** `feat/v4-phase-2t-halfb-remediation`
**Status:** ✅ Complete · `tsc --noEmit` clean · **440/440 tests green**
**Scope:** Finalize Phase 2 — close the 2Y remediation remainders, then ease/shorten/automate the order-to-cash E2E flow for the Pana SME.

---

## 1. What shipped

### 2Y-R2/R3 remediation (already in the working tree, verified this round)
- Job Card list 500 fixed (parent-columns-only query + `useJobCardLifecycle`).
- SO cockpit: create/submit Work Orders, assign workstation/employee, Start/Complete, Create-JC modal.
- FS No (`pana_fs_number`) surfaced on SI/PI detail + edit forms.
- BOM & Stock Entry hidden from nav (valuation-only, automated).
- `<PrintMenu>` replicated across all transactional pages (`DNPrintMenu` deleted); Material Request print template added.
- Reports hub + flagship reports surfaced in nav.
- Implicit-warehouse defense (WO creation via `resolvePrefillWarehouses` + make-stock-entry backfill).
- **Quick BOM** — `POST /api/manufacturing/bom/quick`: builds + submits a real single-level BOM (lines from `OPTION_SETS` default choices, placeholder RM fallback), idempotent. Replaced the broken client `POST /api/resource/BOM` (404 + item-less + never submitted).
- NOTEBOOK pricing closed: seed `ITEM_PRICES.NOTEBOOK = 470`; configurator converted to a real pricing **matrix** (a5/a6 × 50/100).

### 2Z — E2E easing (this round's new work)
The happy path went from **~14 clicks across 6 pages** to **~6 clicks across 2 pages** by removing ceremony, not safety. All three collapses use ERPNext's OWN server-side mappers via user-scoped Next routes + `frappe.client.submit` (the proven make-stock-entry pattern) — never hand-mapped payloads.

| Decision | Change | File(s) |
|---|---|---|
| **D1 — WOs born submitted** | After each `createWOMutation`, immediately submit (docstatus 1). Submit-failure degrades gracefully to a draft the per-WO Submit button still covers. | `app/sales/sales-order/[name]/page.tsx` |
| **D2 — One-click Deliver & Invoice** | New route chains `make_delivery_note` → submit → `make_sales_invoice` → submit, with optional FS No stamped on the SI. Partial-failure contract preserves the DN. Guided negative-stock error. Wizard kept as "Delivery Note (advanced)". | `app/api/sales/sales-order/[name]/fulfill/route.ts` + SO page |
| **D3 — One-click Mark as Paid** | New route builds a PE via `get_payment_entry`, sets mode (default Cash), overrides `paid_to` from the Mode of Payment's company account row (read from the full doc), submits. PE wizard kept for partial/bank cases. | `app/api/accounting/payment/quick/route.ts` + SI page |

### Incidental defect fixed during the gate audit
Two client `DELETE` calls hit a non-existent `/api/resource/*` namespace (would 404). They used **template-literal** URLs, so the historic double-quote guardrail grep never caught them. Repointed to the real module routes.
- `app/manufacturing/work-order/[name]/page.tsx` → `/api/manufacturing/work-order/…`
- `app/manufacturing/bom/[name]/page.tsx` → `/api/manufacturing/bom/…`

The new 2Z guardrail test uses an all-quote-styles regex so this class of bug can't reappear silently.

---

## 2. Gate audit

- `npx tsc --noEmit` → 0 errors.
- `npx vitest run` → **440 passed / 440** (13 new in `tests/phase-2z.test.ts`).
- Guardrails: zero `/api/resource` fetches remain in `app/` (any quote style); no child-table fields in touched `useFrappeList` field arrays; every `PrintShare` on pages with a `PrintMenu` carries `showPrint={false}`.
- Locked files untouched (`git diff` empty): `lib/flows/flow-graph.ts`, `app/api/flows/resolve/route.ts`, `tests/flow-resolver.test.ts`.
- No secrets in the diff; `.env` remains gitignored.

---

## 3. Live verification checklist (user)

1. **Rerun the seed** on live (idempotent) to add the NOTEBOOK Item Price (470 ETB).
2. **SO cockpit:** Submit → **Create Work Orders** (they arrive *submitted*, not draft) → Start / Finish production.
3. **Deliver & Invoice:** click it, optionally enter an **FS No** → a Delivery Note and Sales Invoice are both created and submitted; the SI detail shows the FS No.
4. **SI detail:** **Mark as Paid** (mode defaults to Cash) → Payment Entry submitted, invoice `outstanding_amount` → 0, status Paid.
5. Full order-to-cash should take ~6 clicks from 2 pages.

---

## 4. Known TBDs (awaiting client data)

- Prices for SADDLE-BOOKLET, PERFECT-BOOKLET, SPIRAL-BOOKLET (out-of-stock upstream) and PRINT-CUT-STICKER — still in `PRICING_TBD`.
- NOTEBOOK A4 / 25-sheet matrix combos — surface the configurator pricing warning until priced.
