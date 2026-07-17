# Version 4.1 — "Automation & Downscaling" — Build Report

**Branch:** `feat/v4-phase-2t-halfb-remediation` → PR to `main` (origin only)
**Date:** 2026-07-17
**Round:** 4.1.0 (the mechanical-application batch; 4.1.1 deferred to post-live-feedback)
**Gate:** `tsc --noEmit` 0 errors · `vitest run` 477/477 green (37 new) · locked files untouched · no secrets · no new `/api/resource` calls in touched files.

---

## What v4.1 is

Phase 2 (2Z) eased the **sales** half of the ERP to ~2–4 clicks: SO → one-click **Deliver & Invoice** → one-click **Mark as Paid**. v4.1's entire remit — Kidus gave the con, no per-feature sign-off — was to stamp that *exact* easing across **every remaining transactional flow**. No new domains, no schema work: pure downscaling and automation of paths that already existed but carried too much ceremony.

The whole ERP had exactly **two** repeating ceremony shapes, and both collapse with the **same** proven server idiom (already shipped 3× in 2Z: `fulfill`, `payment/quick`, `make-stock-entry`):

- **Ceremony A — draft-then-submit:** a doc is born `docstatus:0`, then a second trip to the detail page + a ConfirmDialog to submit it.
- **Ceremony B — manual doctype chaining:** a "What's Next" action *deep-links into a prefilled wizard* instead of just performing the transition.

**The idiom:** `getRequestClient(request)` (fail-closed 401) → ERPNext's OWN `make_*`/`get_*` mapper via `client.call.get(...)` → optional `resetPaymentSchedule()` → `frappe.client.submit({ doc: JSON.stringify(doc) })` (insert+submit in one call) → partial-failure contract returning the first submitted doc's name so a half-done chain is never lost. On the client, the born-submitted create is a two-call `mutateAsync` create → `docstatus:1` submit, with the submit half wrapped so a failure **degrades to a draft** and never loses the operator's input.

Because the purchasing mappers were **already wired** in `app/api/erpnext/make-from/route.ts`, most of v4.1 was *applying a validated pattern*, not new integration. Low risk, high breadth.

---

## Shipped features (10 of 12 planned)

### Workstream A — Procure-to-Pay parity
| # | Feature | Surface | Mapper |
|---|---|---|---|
| A1 | **Mark as Paid** generalized to Purchase Invoice (party-agnostic `dt` + `payment_type`) | edit `app/api/accounting/payment/quick/route.ts` + PI detail | `get_payment_entry` |
| A2 | **Receive & Bill** one-click on PO detail (PR→submit→PI→submit) | new `.../purchase-order/[name]/receive-and-bill/route.ts` + PO detail | `make_purchase_receipt` + `make_purchase_invoice` |
| A3 | **Bill** one-click on PR detail (PI→submit) | new `.../purchase-receipt/[name]/bill/route.ts` + PR detail | `make_purchase_invoice` |
| A4 | **Order (auto)** one-click on MR detail (PO→submit) | new `.../material-request/[name]/order/route.ts` + MR detail | `make_purchase_order` |

A1 defaults to `"Sales Invoice"`/`"Receive"` so the 2Z sales behaviour is byte-for-byte unchanged; the same route now also settles a vendor bill (`"Purchase Invoice"` → `"Pay"`), reading the direction off the built draft to override the correct cash-account side (`paid_to` in / `paid_from` out). A2 carries the sales `fulfill` partial-failure contract: if the PR submits but the PI fails, it returns `BillFailedAfterReceipt` **with the `purchase_receipt` name**, so the receipt is never lost.

### Workstream B — Manufacturing run simplification
| # | Feature | Change |
|---|---|---|
| B1 | WO **Start** route hardened to the per-request user-scoped client (fail-closed 401), now the single canonical Start wired from both the SO cockpit and WO detail | `.../work-order/[name]/start/route.ts` |
| B2 | Standalone WO create **born submitted** (create → `docstatus:1`, degrade to draft on failure) | `app/manufacturing/work-order/new/page.tsx` |
| B3 | BOM detail **Submit & Create Work Order** one-click; the "Create Work Order" affordance now gated on `isSubmitted && isActive` (closes a latent trap where draft BOMs that can't back a WO still showed the button) | `app/manufacturing/bom/[name]/page.tsx` |

### Workstream C — Stock quick-actions
| # | Feature | Change |
|---|---|---|
| C1 | **Create & Submit** (born submitted) for Stock Entry, Material Request, and Stock Reconciliation — create then submit in one action, degrade to draft on submit failure | the 3 `new` pages |

### Cross-cutting cleanups (incidental, while in the files)
- PO detail: relabeled "Submit for Approval" → **Submit Order** (the approval sub-ceremony was already half-dead — `handleSubmit` sets status "To Receive and Bill", never "Pending Approval"), demoted "Receive items" → "Receive only (advanced)".
- PI detail: removed the duplicate Edit button.
- PR detail: removed the duplicate header "Create Invoice" link (and its now-unused `Receipt` icon import).

Every primary automation action keeps the original wizard deep-link, relabeled **"(advanced)"**, as the fallback for the non-default case (split suppliers, per-line accounts, manual approve).

---

## Deferred to 4.1.1 (pending Kidus's live-test feedback)

These each carry a genuine UX judgment call or a schema decision — exactly the set the live test should inform:

- **D1 — Default Mode of Payment config** (extend the warehouse-defaults pattern) so quick-pay uses the shop's configured mode instead of hardcoded "Cash". *Deferred: needs a settings-surface decision.*
- **D2 — PO born-approved** (collapse Pending-Approval→Approve/Reject). *Partially addressed via the D2 relabel above; full auto-approve deferred pending confirmation the SME wants zero approval step.*
- **A5 — PI→PE mapper entry** in `make-from`. *Deferred: signature-incompatible with the current table; A1 already delivers the user-facing outcome.*
- **B1 semantics / C2 valuation — Item-hub "Adjust Stock"** one-click reconciliation. *Deferred: single-row valuation default needs live validation.*
- **Job Card auto-run / hide-for-SME**, **Quick Item 1-field fast-path**, **WO-list inline Start/Finish + bulk**, **shortfall auto-MR/PO**, **SE→DN chaining.**

**Split rationale:** 4.1.0 = everything that is a mechanical application of an already-validated pattern (safe to ship blind). 4.1.1 = everything with a real UX judgment call, matching Kidus's stated loop (notify → live checklist → feedback).

---

## Tests

`tests/v4-1-automation.test.ts` — 37 file-content assertions in the repo's established style (pins architecture, not pixels):
- Each new route uses `getRequestClient(request)`, fails closed 401, calls its **named** ERPNext mapper, and `frappe.client.submit`.
- `payment/quick` still drives `get_payment_entry` + submit (no 2Z regression) and now branches on `payment_type` (Pay→`paid_from` / Receive→`paid_to`), reading `accounts[]` via the full doc, never `get_list(`.
- A2 partial-failure contract carries `purchase_receipt` on PI failure.
- B2/C1 born-submitted pages: `mutateAsync` create → `docstatus:1` submit → `toast.warning` degrade.
- B3 gate is `isSubmitted && isActive`.
- All four detail pages register the primary action **and** keep the advanced wizard label.
- Guardrail: none of the 11 touched files contain `/api/resource`.

---

## Live-test checklist for Kidus

1. **Purchasing full chain in ~4 clicks:** MR → **Order (auto)** → PO **Receive & Bill** → PI **Mark as Paid**. Confirm the PR + PI both submitted, PI outstanding → 0. (If an item has no Default Supplier, **Order (auto)** returns a plain-language prompt to set one or use the wizard — expected.)
2. **Manufacturing:** create a WO from `work-order/new` → arrives *submitted*; **Start** (one action) → **Finish**; from a **draft** BOM, **Submit & Create Work Order** in one click; confirm a draft BOM no longer offers "Create Work Order" until submitted+active.
3. **Stock:** create a Stock Entry / Material Request / Stock Reconciliation via **Create & Submit** → each arrives submitted (or, if a submit-time guard trips, lands as a draft with a "review and submit it" toast — never lost).
4. Feed back which deferred **4.1.1** items you want next (Default Mode of Payment, PO auto-approve, Adjust Stock, Job Card auto-run, Quick Item, WO-list inline/bulk, shortfall auto-PO, SE→DN).

## Explicitly NOT in scope (4.1.0)
No schema/migration work · no locked-file edits (`lib/flows/flow-graph.ts`, `app/api/flows/resolve/route.ts`, `tests/flow-resolver.test.ts` untouched) · no live provisioning reruns · no pushes to the client remote (`upstream`/`deploy/pana`) · no branding changes · billing and payment stay distinct fiscal events (no auto-pay folded into Receive & Bill, mirroring the sales decision).

## Boundary note
This round is application code, which normally routes to OpenCode. Kidus gave the con and asked to "proceed straight to implementation" — a deliberate, scoped override (same as 2Z). Built inline, kept narrow to this batch; application code resumes routing to OpenCode afterward.
