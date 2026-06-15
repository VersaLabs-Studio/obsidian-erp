# PHASE 2L — Universal Quick-Add/Cross-Flow Wire-In + Item Price Auto-Rate + Fold-Forward Fixes

> **READ `docs/v4/MESH_REPORTING_CONTRACT.md` FIRST AND LAST.** Every claim is audited against
> the real tree and the live dev server, not your DoD table.

**Sizing:** this is a **large progressive unit** (two real features + the fold-forward fixes),
gated as one. Per the project's handoff-sizing policy, only security-fail-open / data-corruption
/ build-red hard-block a merge; the open P0s below were **folded forward from Phase 2K**, not
bounced. Land the whole unit, then we regate once.

**Branch:** cut **`feat/v4-phase-2l-wirein-pricing`** off **`develop` @ `2db788d`** (Phase 2K is
merged). Commit plan at the end.

**Context — Phase 2K is co-signed and merged.** R1–R8 work, errors are readable, Quick-Add +
Cross-Flow components are **built and tested but not yet mounted anywhere.** 2L makes them live
and completes the pricing loop.

---

## Part 1 — Universal Quick-Add + Cross-Flow wire-in *(headline feature)*

The components exist (`components/quick-add/QuickAddField.tsx`, `components/quick-add/QuickAddModal.tsx`,
`components/cross-flow/CrossFlowActionsMenu.tsx`, `lib/flows/quick-add-registry.ts`,
`lib/flows/flow-adjacency.ts`) and are unit-tested. They render nothing because **no page uses
them.** Wire them in everywhere. They are factory-pattern — if a fix or prop is needed, update
the shared component once, not per-call-site.

### 1A — Quick-Add into every wizard's master/link fields

For **every transactional create + edit wizard**, replace the `FormFrappeSelect` on each
field that points at a quick-add-supported master with **`QuickAddField`** (same props pass
through; it adds the `＋ Create new <Doctype>` footer). Cover at minimum:

- Sales: Quotation, Sales Order, Sales Invoice, Delivery Note — Customer, Item (per row),
  Address, Contact.
- Buying: Purchase Order, Purchase Invoice, Purchase Receipt, RFQ, Supplier Quotation —
  Supplier, Item (per row), Warehouse.
- Stock: Material Request, Stock Entry — Item, Warehouse, UOM.
- Manufacturing: BOM, Work Order — Item, Warehouse.
- CRM: Lead → (none), Opportunity — Customer.

Supported doctypes are whatever `isQuickAddSupported()` returns (Customer, Supplier, Item,
Contact, Address, Lead, Warehouse, UOM, Item Group, Driver, Vehicle). A field whose doctype is
**not** supported keeps plain `FormFrappeSelect` — do not force a footer it can't fulfil.

**Acceptance (live):** open any wizard, open a master dropdown → footer shows `＋ Create new
<Doctype>` → click → modal → fill → submit → modal closes, new value is in the field, the rest
of the wizard's input is untouched. Verify the **nested** case (Address from inside Customer).

### 1B — Cross-Flow Actions on every transactional detail page

Mount **`<CrossFlowActionsMenu doctype="<Doctype>" name={doc.name} />`** in the sidebar of
**every transactional detail page** (the `[name]/page.tsx` for Quotation, SO, SI, DN, PE, PO,
PI, PR, RFQ, SQ, MR, SE, WO, BOM, Lead, Customer, Opportunity). It reads `flow-adjacency.ts`
and renders, per adjacent doctype: **"View <name>"** if a linked record already exists, else
**"Create <doctype>"** prefilled. Standalone doctypes (Stock Reconciliation, Stock Ledger, all
settings masters) get **no** menu — `flow-adjacency.ts` already excludes them; do not mount it
there.

**Acceptance (live):** on an SO **with** a Sales Invoice → shows "View ACC-SINV-…" (redirect,
no duplicate); on an SO **without** one → shows "Create Sales Invoice" (prefilled). Same
forward+backward for at least 3 doctypes.

### 1C — Close the 4 child-table back-link edges *(folded forward from 2K gap #4)*

`flow-adjacency.ts` has `backLink=null` for **SO→DN, DN→SI, SI→PE, RFQ→SQTN** because the
back-link lives on a **child table** (e.g. DN has no top-level `sales_order`; the link is on
`Delivery Note Item.against_sales_order` / `Sales Invoice Item.delivery_note`; PE→SI via
`Payment Entry Reference`). Today these 4 always show "Create" — the short-circuit can't fire.
Add **child-table-aware back-link queries** for these 4 edges so an existing downstream doc is
detected and "View" wins. Use the same child-table filter semantics already used in the detail
pages' downstream resolution (`Sales Invoice Item.delivery_note` etc.). Confirm each of the 4
flips to "View" when a real linked doc exists.

---

## Part 2 — Item Price auto-rate integration (§10.4) *(headline feature)*

The Item Price + Price List masters shipped in 2K. Activate the **auto-rate** loop the master
doc §10.4 specifies (it was deliberately deferred from 2J).

**Behavior:** when an item is selected (or the price list changes) in a transactional wizard,
look up the matching **Item Price** and auto-fill that row's **rate**:
- Selling wizards (Quotation, Sales Order, Sales Invoice, Delivery Note): match on
  `item_code` + the doc's **selling** price list + `currency`, `selling = 1`.
- Buying wizards (Purchase Order, Purchase Invoice, RFQ, Supplier Quotation): match on
  `item_code` + the doc's **buying** price list (`buying_price_list`, default "Standard
  Buying") + `currency`, `buying = 1`.

**Contract:**
- Reuse the existing Item Price API (`app/api/stock/settings/item-price/route.ts`) — **no new
  abstraction layer.**
- The filled rate is **editable, not locked** — pricing is a suggestion the user can override
  (unlike party fields, which lock). If no Item Price exists, leave the rate as-is (manual).
- A price-list change re-prices all rows; a per-row item change re-prices that row.
- If multiple Item Prices match, take the most specific / most recent (document the rule you
  chose).

**Acceptance (live):** add an item that has an Item Price for the active price list → its rate
auto-fills; change the price list → rates update; type over a rate → your value sticks; add an
item with no Item Price → rate stays manual (no error).

---

## Part 3 — Fold-forward fixes (from the 2K live retest)

### P0-A — Purchase Order: per-item warehouse required by Frappe
**Root cause (verified):** R1/R2 now let the PO payload reach Frappe, which rejects
`Row #1: Warehouse is required`. Our step gate doesn't catch it — `purchaseOrderStepSchemas.step2`
(`flow-validation.ts:277`) has `warehouse: optional`. The user fills the **header** "Set Target
Warehouse" (`set_warehouse`, `purchase-order/new/page.tsx:79`) but Frappe wants `warehouse` on
**each** Purchase Order Item.
**Fix:** on submit, propagate the header warehouse to each row that lacks one —
`items.map(it => ({ ...it, warehouse: it.warehouse || values.set_warehouse }))`. Optionally also
expose a per-row warehouse (via QuickAddField from Part 1A) for mixed-warehouse orders.
**Acceptance:** PO with a header warehouse + 1 item → creates, lands on PO detail.

### P0-B — Purchase Order: a selected date still flags "required"
**Root cause (verified):** `purchaseOrderStepSchemas.step1` (`flow-validation.ts:268`)
hard-requires **`schedule_date`** ("Required By") — but ERPNext does **not** mandate it on the
PO header, and the wizard's "Date" field the user filled is `transaction_date`. This is the
**step-schema twin of the R1 over-strict bug** (R1 fixed the API `*CreateSchema`s; the wizard
**step** schemas in `flow-validation.ts` were never swept).
**Fix:** (1) make `schedule_date` `.optional()` in `purchaseOrderStepSchemas.step1`, and **audit
every step schema in `flow-validation.ts` for header dates that ERPNext doesn't actually mandate**
(e.g. `materialRequestStepSchemas.step1:145` `schedule_date`) — relax them. (2) **Then verify the
date binding**: confirm `FormDatePicker` writes the selected value into react-hook-form state and
the gate reads it via `useWatch` (the recurring A1/A2/F4 class) — if a filled date still reads
empty in `getValues()`, fix the `Controller` binding. Report which of the two was the actual
cause.
**Acceptance:** PO step 1 with only the "Date" set → Next is enabled; no false "Required by date".

### P1 — Stock Reconciliation: no redirect on success
SR creates but stays on the form. **Fix:** on create success, `router.push` to the new SR
detail page (or the SR list). Match the redirect pattern the other create wizards use.

### P1 — Payment Entry: account fields invisible
The PE error `paid_from / paid_to: required` is correct and readable (R2 works) but **the wizard
never renders those fields**, so the user can't satisfy it. **Fix:** render `paid_from` and
`paid_to` account selects in the PE wizard (QuickAddField/FormFrappeSelect against Account), AND
prefer to **auto-resolve defaults** — on party + mode-of-payment selection, fetch the default
bank/cash account (ERPNext `get_default_bank_cash_account`) and the party's receivable/payable
so the common path needs no manual entry. At minimum the fields must be visible and fillable.
**Acceptance:** Record Payment from a Customer → either auto-resolves or shows the account
fields → submits.

### P1 — Notification panel polish *(2K R7 was partial)*
Clicking works but: the **Dismiss button does nothing**, the **navigation action ("Open
<doc>") doesn't appear**, and there are no actionable steps. **Fix:** wire Dismiss to actually
remove/clear the item; for any notification carrying an `href`, render a working **"Open
<doc>"** action that `router.push`es; show the resolution steps (`detail`) in the detail view;
keep Back + mark-read. **Acceptance:** trigger a guided error → open its notification → see
explanation + a working "Open …" button + a working Dismiss.

### P2 — Price List delete (answer to "why is it greyed?")
**It's intentional, not a bug:** `price-list/[name]/page.tsx:141` sets
`disabled={priceList.enabled === 1}` and the WhatsNext action carries
`disabledReason: "Disable the price list before deleting"` — an *enabled* price list can't be
deleted; disable it first. **Decision for this phase:** keep the guard (it's a reasonable
guard-rail) **but also** handle the real ERPNext case — attempting to delete a price list that
has Item Prices returns a `LinkExistsError`; route that through the guided-error dialog ("in use
by N item prices") instead of a raw toast. So: keep the enabled-gate **and** add guided handling
for the link-exists rejection.

---

## Part 4 — Tests (vitest count must increase; assert real components)

1. **Quick-Add wired:** render a real wizard (e.g. Quotation) and assert the customer field's
   dropdown exposes the `＋ Create new Customer` footer (RTL, real component — not the registry
   in isolation, which 2K already covers).
2. **Cross-Flow mounted:** render a real detail page (or the menu with a stubbed list hook) and
   assert "View <name>" renders when an adjacent record exists and "Create" when it doesn't —
   **including one of the 4 child-table edges** (e.g. SO→DN) to prove 1C.
3. **Item Price auto-rate:** selecting an item with a known Item Price fills the row rate;
   changing the price list re-prices; a manual override is preserved.
4. **PO warehouse propagation:** the submit payload copies header `set_warehouse` into each
   item's `warehouse`.
5. **PO step-1 date gate:** `purchaseOrderStepSchemas.step1.safeParse({ supplier, transaction_date })`
   (no `schedule_date`) now succeeds.
6. **Strengthen the 2K schema-payload guards:** since the `*CreateSchema`s are now `.partial()`,
   `safeParse(payload).success` is trivially true and proves little. Re-point those guards at the
   **step schemas** (`flow-validation.ts`) — the real gate — or assert the specific fields that
   must remain required. Note this in your report.

---

## Commit plan
1. `feat(v4/phase-2l): wire Quick-Add + Cross-Flow into all wizards & detail pages (§11/§12)` (incl. 1C back-links)
2. `feat(v4/phase-2l): Item Price auto-rate integration (§10.4)`
3. `fix(v4/phase-2l): fold-forward 2K P0s (PO warehouse+date, SR redirect, PE accounts, notif polish, price-list delete)`
4. `test(v4/phase-2l): wired-component + auto-rate + step-gate tests`

---

## Live retest checklist (run the dev server — report what you SEE)
1. **PO** with header warehouse + 1 item, only the Date set → creates, lands on PO detail (P0-A, P0-B).
2. Any wizard master field → `＋ Create new` footer → modal → returns value, wizard intact (1A).
3. Nested quick-add: Address from inside Customer quick-add (1A).
4. SO **with** an SI → Cross-Flow shows "View SI-…"; SO **without** → "Create Sales Invoice" (1B).
5. A DN that has an SI → Cross-Flow shows "View" (1C child-table back-link).
6. Add a priced item to a Quotation → rate auto-fills; change price list → re-prices; override sticks (Part 2).
7. **SR** create → redirects to detail/list (P1).
8. **PE** from a Customer → accounts auto-resolve or are fillable → submits (P1).
9. Trigger a guided error → notification → working "Open <doc>" + working Dismiss (P1).
10. Enabled Price List → Delete greyed (tooltip); disable → Delete works; delete one with Item Prices → guided "in use" (P2).

If a step fails, paste the dev console + Network response into KNOWN GAPS. **Re-read
`docs/v4/MESH_REPORTING_CONTRACT.md` before writing your report** — quote `file:line` +
before→after for every item, and report live observations, not checkmarks.
