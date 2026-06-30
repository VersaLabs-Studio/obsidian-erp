# PHASE 2S — HANDOFF (Brain → Mesh)

> **Branch to cut:** `feat/v4-phase-2s-flow-fix-automation` from current `feat/v4-phase-2r-procure-flowgraph` HEAD
> **Reporting contract:** Follow `docs/v4/MESH_REPORTING_CONTRACT.md` for the build report (Part-by-Part, `file:line`, before→after, static gates, KNOWN GAPS). Produce `docs/v4/PHASE_2S_BUILD_REPORT.md`.
> **Static gates that must stay green:** `tsc --noEmit = 0`, `vitest run` all-pass. **But note:** the 2R vitest suite passed 401/401 while the live rail was 100% broken — see Part 0. **You must add live-faithful resolver tests this phase (no mocked happy-path only).**

This phase has TWO halves:
- **HALF A — P0 REGRESSION + FIXES (Parts 0–9).** The flow rail regressed to fully dark. This is the gating work. **Land Half A, get the rail green on the live Pana instance, and only then start Half B.**
- **HALF B — NEW AUTOMATION FEATURES (Parts 10–17).** Warehouse simplification, HR + Job Cards, SO→WO automation, item configurator, payment terms, reports (with extensive filters + nested drill-down dashboard), and power features for the main list pages.

The mesh model is less able to reason about ERPNext field placement, so **every edge/field below is named explicitly and is real ERPNext v15.** Do not invent fields. When in doubt, read the generated types in `types/` and the live doctype, do not guess.

---

## BUILD ORDER (hard gates)

1. **Part 0** (flow resolver P0) → deploy → **retest the rail on 6 live docs (QTN, SO, DN, SI, PO, PR, PI)** → rail must light up upstream+downstream before continuing.
2. Parts 1–9 (the smaller P0/P1 fixes) in any order.
3. **Re-run the §C procure-to-pay + §B lead-to-cash live passes.** Confirm no regressions.
4. **Part 9R FIRST** — Half A live-retest remediation. Now includes the 2nd-retest residuals: **9R.14** (SO-from-Quotation make-from payment-schedule 417 — distinct from the scratch fix), **9R.15** (UOM toggle right-align), and the re-confirmed rail features (**9R.7** rail below header, **9R.12** per-doc CTA). Land + retest 9R green before any new feature work.
5. Half B features (Parts 10–17). Part 15 (configurator) is the largest — see its note; confirm the chosen approach with Kidus before building if anything is unclear.

---

# HALF A — P0 REGRESSION + FIXES

## PART 0 (P0, HEADLINE) — Flow resolver is fully broken on live data

### Symptom (from Kidus's dev logs)
Every `GET /api/flows/resolve?...` returns **417 DataError** or **404 DoesNotExistError**, on every doctype, so the rail is dark everywhere and the page is slow (React Query retries the failing call 4×). Representative log lines:
```
GET /api/flows/resolve?doctype=Quotation&name=SAL-QTN-2026-00012 417
  frappe.exceptions.DataError: Field not permitted in query: quotation
GET /api/flows/resolve?doctype=Purchase+Order&name=PUR-ORD-2026-00006 417
  frappe.exceptions.DataError: Field not permitted in query: purchase_order
GET /api/flows/resolve?doctype=Material+Request&name=MAT-MR-2026-00011 417
  frappe.exceptions.DataError: Field not permitted in query: material_request
GET /api/flows/resolve?doctype=Sales+Order&name=SAL-ORD-2026-00021 404
  DoesNotExistError: DocType  not found   (note the blank — empty doctype)
```

### ROOT CAUSE — three bugs, all confirmed in code

**BUG A — child-table fields modelled as parent header fields → invalid Frappe filter → 417 that aborts the WHOLE resolve.**
`lib/flows/flow-graph.ts → resolveBackLink()` (lines 305–332) builds `get_list(<parent>, [[edge.field, "=", anchor]])` whenever `returnParent` is false. But several **forward** edges in `lib/flows/flow-link-map.ts` point `field` at a column that lives on a CHILD table (or does not exist on the parent at all):

| Edge (flow-link-map.ts) | Current (WRONG) | Reality in ERPNext v15 |
|---|---|---|
| Quotation→Sales Order `:194` | `queryDoctype:"Sales Order", field:"quotation", returnParent:false` | `quotation` does **not exist** on Sales Order. Link is `Sales Order Item.prevdoc_docname` (+ `prevdoc_doctype="Quotation"`). |
| Material Request→Purchase Order `:409` | `queryDoctype:"Purchase Order", field:"material_request"` | `material_request` is on **Purchase Order Item**, not the PO parent. |
| Material Request→Request for Quotation `:418` | `queryDoctype:"Request for Quotation", field:"material_request"` | `material_request` is on **Request for Quotation Item**. |
| Supplier Quotation→Purchase Order `:438` | `queryDoctype:"Purchase Order", field:"supplier_quotation"` | `supplier_quotation` is on **Purchase Order Item**. |
| Purchase Order→Purchase Receipt `:446` | `queryDoctype:"Purchase Receipt", field:"purchase_order"` | `purchase_order` is on **Purchase Receipt Item**. |
| Purchase Receipt→Purchase Invoice `:455` | `queryDoctype:"Purchase Invoice", field:"purchase_receipt"` | `purchase_receipt` is on **Purchase Invoice Item**. |
| Purchase Order→Purchase Invoice `:464` | `queryDoctype:"Purchase Invoice", field:"purchase_order"` | `purchase_order` is on **Purchase Invoice Item**. |

Because there is **no per-edge try/catch**, the first edge that throws kills the entire `resolveFlowGraph` call → the route returns 417 → **all** stages go dark (even the ones whose edges are fine), and the client retries 4× (the slowness).

**BUG B — `returnParent:true` edges return the wrong column → silently resolve to null.**
`resolveBackLink` (line 324–331) queries the **parent** doctype `edge.to` with a child-table filter, then returns `rows[0].parent`. Parent rows have an empty `parent` column, so the result is always `null`. This silently kills DN→SI, SO→SI, SO→DN, SI→PE, RFQ→SQ even when the doc exists. **The correct behaviour:** when filtering a parent doctype by a child-table field, Frappe returns the parent rows — so return `rows[0].name`, NOT `rows[0].parent`.

**BUG C — no resilience + no empty-doctype guard.** The `DocType  not found` (blank doctype) 404 means an edge produced an empty `queryDoctype`/`to`. Combined with the missing try/catch, it blanks the whole page instead of skipping one edge.

### FIX — implement ALL of the following

**0.1 — Make edge resolution fault-isolated (the architectural fix that makes this class of regression impossible).**
In `flow-graph.ts`, wrap each edge's resolution in try/catch so one bad edge can never blank the rail:
```ts
// inside the for (const edge of outgoing) loop in resolveFlowGraph:
let candidate: string | null = null;
try {
  candidate = await resolveEdge(edge, doc, listDoc);
} catch (e) {
  // One malformed edge must NEVER abort the whole graph. Log + skip.
  console.warn(`[flow-graph] edge ${edge.from}→${edge.to} failed:`, e);
  continue;
}
if (!candidate) continue;
```
Also guard the I/O seam: in `serverGetDoc` / `serverListDoc` (route), if `doctype` is falsy/empty, return `null`/`[]` immediately and `console.warn` the offending edge — never call Frappe with an empty doctype.

**0.2 — Fix the canonical "query a parent by a child-table field" path.** Introduce ONE correct helper used by every child-table back-link, replacing both the broken `returnParent` branch and the mis-modelled forward edges. Semantics:
- To resolve a parent `P` whose child table `P Item` has a column `f` pointing back to the anchor: `get_list("P", filters=[["P Item", f, "=", anchor]], fields=["name"])` → return `rows[0].name`.
- Model these as `pattern:"back_link"`, `queryDoctype:"<P> Item"`, `field:"f"`, `returnParent:true`, and in `resolveBackLink` return `rows[0].name` (the parent), querying `edge.to` (the parent doctype). **Delete the `rows[0].parent` return.**

**0.3 — Correct the seven mis-modelled forward edges** in `flow-link-map.ts` to use the child-table form above:

| Edge | New definition |
|---|---|
| Quotation→Sales Order | `queryDoctype:"Sales Order Item", field:"prevdoc_docname", returnParent:true, extraFilters:[["Sales Order Item","prevdoc_doctype","=","Quotation"]]` — but **relax** like the reverse edge: if the discriminator yields zero rows, fall back to the same filter without `prevdoc_doctype`. |
| Material Request→Purchase Order | `queryDoctype:"Purchase Order Item", field:"material_request", returnParent:true` |
| Material Request→Request for Quotation | `queryDoctype:"Request for Quotation Item", field:"material_request", returnParent:true` |
| Supplier Quotation→Purchase Order | `queryDoctype:"Purchase Order Item", field:"supplier_quotation", returnParent:true` |
| Purchase Order→Purchase Receipt | `queryDoctype:"Purchase Receipt Item", field:"purchase_order", returnParent:true` |
| Purchase Receipt→Purchase Invoice | `queryDoctype:"Purchase Invoice Item", field:"purchase_receipt", returnParent:true` |
| Purchase Order→Purchase Invoice | `queryDoctype:"Purchase Invoice Item", field:"purchase_order", returnParent:true` |

**0.4 — Verify the existing `current_child` backward edges still work** (they read the anchor's own child rows, which is correct): SO→Quotation, DN→SO, SI→SO, SI→DN, PR→PO, PI→PO, PI→PR, PO→MR, PE→SI, PE→PI. These were the right pattern; do not change them.

**0.5 — REMOVE Supplier Quotation (SQ) and Request for Quotation (RFQ) from the rail** (Kidus's explicit request, "temporarily"). Keep the edges in the link map but **drop SQ and RFQ stages from the procure-to-pay flow definition** (`lib/flows/flow-chain-resolver.ts` / wherever the flow `stages` arrays live) so the rail renders MR → PO → PR → PI → PE only. Leave RFQ reachable in nav/cross-flow; just not on the rail.

**0.6 — Tests that would have caught this.** Add resolver tests whose `listDoc` mock **emulates Frappe's filter validation**: it must throw `DataError: Field not permitted in query: <field>` when asked to filter a parent doctype by a field that is not in an allow-list of that parent's real header fields. Seed the allow-list from the real ERPNext field placement (header vs child). A green suite must prove Quotation→SO, MR→PO, PO→PR, PR→PI, PO→PI, DN→SI resolve to a name. This is the anti-regression net for KNOWN GAP #5.

**0.7 — Secondary cleanup (P1, same part):** the logs show orphan client calls to non-existent routes like `GET /api/sales-order-item?...prevdoc_docname... 404`. These come from a non-rail caller (item "where-used" / CrossFlow adjacency). Find them (`grep` for `sales-order-item`, `purchase-order-item`, `delivery-note-item` route usage) and either point them at a real endpoint or remove them. They are not the rail bug but they spam 404s.

### Acceptance (must pass on the LIVE Pana instance, not just vitest)
- Open a Quotation that has a Sales Order made from it → rail shows Customer (back) + Sales Order (forward), no 417.
- Open that Sales Order → rail shows Quotation, Customer (back) and DN/SI (forward) if they exist.
- Open a Delivery Note with a Sales Invoice → both SO (back) and SI (forward) light up. "Billed" DN with an SI must show the SI on the rail.
- Open the PO→PR→PI chain from any node → all three light up in both directions.
- Zero `Field not permitted in query` and zero `DocType  not found` in the server log during a full rail browse.
- Rail resolves in ONE `/api/flows/resolve` call per page (no 4× retry storm); perceived latency back to acceptable.

---

## PART 1 (P0) — UOM "cannot be a fraction" blocks manufacturing

### Symptom
`POST /.../make-stock-entry 417 — Row 2: Quantity (0.6) cannot be a fraction. To allow this, disable 'Must be Whole Number' in UOM.` The Work Order's BOM has a raw-material row with fractional qty (0.6), but that item's UOM has `must_be_whole_number = 1`. ERPNext blocks fractional quantities on whole-number UOMs. For a printing shop (sheets, ml of ink, grams of toner, fractions of a "Set") fractional consumption is the norm, so this will recur constantly.

### Fix
1. **Data fix (immediate):** the offending UOM(s) must have `must_be_whole_number` unchecked. The 2R UOM settings page (`app/stock/settings/uom`) already surfaces this column — make the toggle **editable inline** (PUT `must_be_whole_number`) so Kidus can fix any UOM in one click. Confirm "Nos"/"Unit"/"Set" defaults for raw materials are fraction-allowing for this client.
2. **Provisioning fix (prevent recurrence):** when the warehouse/defaults provisioner or the item-create flow seeds UOMs for this client, default raw-material/consumable UOMs to `must_be_whole_number = 0`. Only keep whole-number on genuinely discrete finished goods if the client wants it.
3. **Guard (graceful):** in the make-stock-entry route, catch `UOMMustBeIntegerError` and surface a guided error ("Item X's UOM 'Y' must allow fractions — open Stock → Settings → UOM and untick 'Whole Number'") with a deep link, instead of the generic "Something went wrong."

### Acceptance
A WO whose BOM consumes 0.6 of a fraction-allowed UOM submits its Material Transfer stock entry with no 417.

---

## PART 2 (P1) — PR "Link to PO" does not prefill

On `app/stock/purchase-receipt/new?purchase_order=<PO>` everything prefills EXCEPT the visible "Link to Purchase Order" field. The make-from canonical draft already sets per-item `purchase_order` back-links (2R Part 2); the issue is the **header** link field on the PR form is not bound to the incoming `?purchase_order=` param. Bind the PR form's PO reference field to the query param on hydrate (mirror how supplier/items hydrate). Verify against generated types whether the PR header carries the link or whether it must be shown as a read-only "Created from PO-XXXX" chip (ERPNext keeps the PO link on `Purchase Receipt Item.purchase_order`, not a PR header field — if so, render a read-only source chip from the first item's `purchase_order`, do not add a fake header field).

### Acceptance
Creating a PR from a PO shows the source PO clearly (prefilled field or source chip), and the PR→PO rail edge lights up (Part 0).

---

## PART 3 (P1) — PI→PE: prefill paid amount + "Allocate Invoice" picker

Currently PE created from a PI does not prefill the paid amount and does not auto-allocate against the invoice. Kidus wants:
1. **Prefill** `paid_amount` and the `references[]` row (reference_doctype="Purchase Invoice", reference_name=PI, allocated_amount = outstanding) when arriving at PE with `?invoice=<PI>`.
2. Keep an explicit **"Allocate Invoice" button** that opens a picker of the party's open invoices (outstanding > 0) so the user can choose/adjust which invoice(s) this payment settles. This is the UX he likes — automate the common case, allow override.

This depends on Part 4 (partial payment) for the allocation math.

### Acceptance
PE from a PI lands with paid amount + allocation prefilled; the "Allocate Invoice" button lets the user pick from open invoices and edit allocated amounts.

---

## PART 4 (P1) — Payment terms / partial payments (1 invoice → many PEs)

### Problem
The system currently rejects a PE submission unless it pays the invoice in full. That's wrong — clients pay in installments.

### Build
- **Do NOT force full allocation.** Allow a PE whose `allocated_amount` < invoice `grand_total`. ERPNext already supports this natively (a PE Reference `allocated_amount` can be partial); the block is almost certainly client-side validation in our PE create/validation path — remove/relax it. Confirm no custom "must equal outstanding" check remains in `lib/flows/flow-validation.ts` or the PE page.
- **Invoice detail must show paid vs unpaid explicitly:** render `grand_total`, `outstanding_amount`, and paid = grand_total − outstanding, with a progress bar, on both Sales Invoice and Purchase Invoice detail pages. ERPNext maintains `outstanding_amount` automatically as PEs post.
- **Multiple PEs per invoice:** the references model already supports it; ensure our PE→SI / PE→PI rail and the invoice detail "Payments" section list ALL payment entries for the invoice (query Payment Entry Reference by reference_name).
- **Reminders (dashboard + reports):** add an "Overdue / Outstanding receivables & payables" widget to the relevant dashboards (SI with outstanding > 0 and due_date < today → receivable reminder; PI symmetric → payable). These feed Part 16 reports too.

### Acceptance
An invoice can be paid by two partial PEs; detail shows running paid/unpaid; dashboard shows outstanding reminders.

---

## PART 5 (P1) — Optional reference-number field on PI and SI

Add an optional reference number field to both invoices. **Use the native ERPNext fields — verify in `types/` first:**
- **Purchase Invoice:** `bill_no` (label "Supplier Invoice No") + `bill_date`. These are native, optional. Surface them in the PI create form (step 1) and on the detail page.
- **Sales Invoice:** `po_no` (label "Customer's Purchase Order") + `po_date` is the closest native optional reference. If Kidus wants a more generic "Reference No.", confirm whether a native field fits before adding a custom field; prefer native.

### Acceptance
Both invoices accept an optional reference number that round-trips (save → detail → edit) and appears on the printed document (Part 7).

---

## PART 6 (P1) — Customer create/edit pages to V4

2R reported Customer "already V4," but Kidus confirms the **create and edit** pages are NOT (detail page may be). Rebuild `app/crm/customer/new/page.tsx` and `app/crm/customer/[name]/edit/page.tsx` to the V4 golden-template standard (FlowWizard/multi-step, full ERPNext Customer field set: customer_name, customer_type, customer_group, territory, tax_id, default currency/price list, primary address + contact, credit limit), matching the premium-UI bar (see `ui-quality-bar` standards). Use the SO/Item V4 pages as the reference template. Do not regress the detail page.

### Acceptance
Customer create + edit match the V4 look and expose the full field set; no plain/legacy form remains.

---

## PART 7 (P1) — Print/PDF templates, system-wide, matching `public/export-format.pdf`

### Problem
The global Print & Share buttons work, but the generated PDF "looks like a screenshot" and is "hideous." "Looks like a screenshot" = the current approach rasterizes the DOM (html2canvas / dom-to-image). Kidus supplied the **target format at `public/export-format.pdf`** — open it and match it.

### Build
- **Replace the rasterize approach with a real document renderer.** Either (a) a dedicated print route per doctype that renders semantic HTML + a print stylesheet (`app/print.css` already rewritten in 2R — build on it) and uses the browser's native print-to-PDF, or (b) a server-side React PDF renderer (`@react-pdf/renderer`). Prefer the HTML+print-CSS route for fidelity and maintainability unless the mesh finds it can't match `export-format.pdf` — then use react-pdf.
- **Match `public/export-format.pdf`:** branded letterhead (logo, company block, ETB currency, document title + number, party block, line-item table with proper columns, totals block, terms/footer). Vector text, not a bitmap. The white-label rule still holds: branding comes from company settings, so Pana's logo/name on `deploy/pana`, Obsidian on origin — do not hard-code Pana.
- **Apply to all documents** that have Print & Share: Quotation, Sales Order, Delivery Note, Sales Invoice, Payment Entry, Purchase Order, Purchase Receipt, Purchase Invoice.

### 7.1 — Delivery Note: TWO distinct print formats (Gate Pass + signed Customer copy)

The Delivery Note detail page must expose **two separate print buttons**, both rendering the SAME `Delivery Note` document through different templates:

1. **"Print Gate Pass" (internal / SME use).** A stripped, internal goods-out authorization for the shop's own records and security/gate. Show: company letterhead, "GATE PASS" title, DN number + date, customer name + ship-to, the **item list with quantities and UOM ONLY — NO rates, amounts, or totals** (it must not expose pricing to the gate/driver), plus fields for **Vehicle No., Driver Name, Gate/Time Out, and a "Authorized By" + "Security/Gate" signature line**. This is the document that physically accompanies the goods leaving the premises.
2. **"Print Delivery Note" (customer copy, to be signed).** The full customer-facing DN: branded letterhead matching `export-format.pdf`, item table **with** rates/amounts/totals, terms, and a **"Received in good condition — Customer Name / Signature / Date" block** at the foot for the customer to sign on delivery.

Implementation notes:
- Both buttons live in the DN detail header next to the existing Print & Share control. Label them clearly ("Gate Pass" vs "Delivery Note").
- Build both as print-CSS/HTML templates (Part 7 renderer), parameterized by a `variant: "gate_pass" | "customer"` flag — one DN print route, two layouts. Do NOT duplicate the whole pipeline.
- The Gate Pass must hard-suppress every monetary field even if present on the doc.
- White-label rule still applies (branding from company settings).

### Acceptance
Each document's PDF is crisp vector output matching the supplied format; no rasterized screenshot; Pana branding only on the delivery branch. **The DN detail page shows two working buttons: a price-free internal Gate Pass (with vehicle/gate/security sign-off) and a fully-priced customer Delivery Note with a customer signature block.**

---

## PART 8 (P1) — Item Group list as a tree

Kidus wants the Item Group list page (`app/stock/settings/item-group`) to render **nested groups as a tree** (parent → children, expand/collapse), not a flat list. ERPNext Item Group is a nested-set (NSM) doctype: it has `parent_item_group`, `is_group`, `lft`, `rgt`. You already fetch `order_by=lft asc`. Build the tree client-side from `parent_item_group` (or use lft/rgt) and render an indented, collapsible tree with the V4 styling. New/edit unchanged.

### Acceptance
Nested item groups display as an expand/collapse tree reflecting the real hierarchy.

---

## PART 9 (P1) — Work Order create page to V4 styling

The Work Order create page is not converted to the V4 look — specifically its background color / surface treatment is off-template. Bring `app/manufacturing/work-order/new` to the V4 golden surface (OKLCH `var(--color-*)` tokens, premium-UI bar). Cosmetic only; do not change WO logic. (This also matters because Part 13 will draft Work Orders from the SO detail — the create page stays for manual cases.)

---

# HALF B — NEW AUTOMATION FEATURES

> Build these only after Half A is green and retested. They are large; sequence as listed. Parts 10/11 are foundations for 13/14.
> **⚠️ BUILD PART 9R FIRST — it is the Half A live-retest remediation. Several items are hard P0 blockers (cannot create SO, Customer page crash, UOM page crash). Land + retest 9R before any new feature work.**

---

## PART 9R — HALF A LIVE-RETEST REMEDIATION (BUILD THIS FIRST)

Half A passed `tsc`/`vitest` and the **SO / DN / SI / PE rails light up correctly on live Pana** — but the live E2E surfaced blockers and gaps. Each item below is root-caused against real code with `file:line`. **Do not guess; the cause is given.** Reproduce, fix, retest live.

### 9R.1 — [P0 BLOCKER] Cannot create ANY Sales Order — payment-schedule due date
**Symptom:** `POST /api/sales/sales-order` → 417 `ValidationError: Row 1: Due Date in the Payment Terms table cannot be before Posting Date` (ERPNext `accounts_controller.validate_payment_schedule_dates`).
**Root cause (verified):** `app/sales/sales-order/new/page.tsx:320` (`handleSubmit`) sends **no** `payment_terms_template` and **no** `payment_schedule`. So ERPNext is auto-applying a **default Payment Terms Template from the Customer (or Company)** and computing a payment schedule whose `due_date` precedes the SO `transaction_date` (which defaults to today, `:154`). This is **not** the flow-rail discriminator bug — a read-only resolver cannot break a POST; the two errors merely interleaved in the log.
**Fix (do both):**
1. **Make SO create resilient.** Reproduce on the offending customer; inspect its default **Payment Terms Template** (`Due Date Based On` + credit days). The create must never crash on this. Send `transaction_date` explicitly (already present) and ensure no payment schedule with a past due date is persisted — the cleanest path: on the SO create payload set `payment_terms_template: ""` (don't inherit the default at create time; the user can add terms on the detail page later), OR send the template **and** let ERPNext recompute the schedule from `transaction_date` (never send a stale `due_date`). Pick whichever reproduces clean on live; document which in the build report.
2. **Guided error.** Add this exact message to `lib/errors/frappe-error-resolver.ts` so the raw 417 never reaches the user: match `"Due Date in the Payment Terms table cannot be before"` → calm guided card ("This customer's payment terms produce a due date before the order date. Review the customer's default Payment Terms Template, or remove payment terms on this order.").
**Retest:** create a plain SO (no quotation) for the offending customer → succeeds.

### 9R.2 — [P0 BLOCKER] Customer create page crashes (`useFormContext` null)
**Symptom:** Runtime TypeError `Cannot destructure property 'getFieldState' of useFormContext() as it is null` at `components/ui/form.tsx:47` ← `FormMessage` ← `customer/new/page.tsx:227`.
**Root cause (verified, certain):** the Customer page renders `<InfoCard><FlowWizard>` with **no react-hook-form provider** (`app/crm/customer/new/page.tsx:201`). The SO **golden template** wraps its wizard in `<Form {...form}>` (= `FormProvider`, `app/sales/sales-order/new/page.tsx:352`). Without it, every `FormInput`→`FormMessage`→`useFormContext()` is null.
**Fix:** wrap the Customer wizard exactly like the SO golden template — `<Form {...form}> … </Form>` around the `<InfoCard><FlowWizard … /></InfoCard>` block. Import `Form` from `@/components/ui/form` (already imported on the SO page). One structural change; no field logic changes.
**Retest:** `/crm/customer/new` renders + creates; `/crm/customer/new?from_lead=…` conversion still works.

### 9R.3 — [P0 BLOCKER] UOM settings page crashes — server client imported into the page
**Symptom:** Runtime `Missing ERP API environment variables` at `lib/frappe-client.ts:55`, triggered by module-eval of `app/stock/settings/uom/page.tsx:25`.
**Root cause:** the Part 1 UOM page imports the **server-only** Frappe client (`FrappeClient.getInstance()` / `frappeClient`) at module top. That singleton throws when evaluated outside the server route context. A page must never import `lib/frappe-client.ts` directly.
**Fix:** the UOM page must read/write only through the API route you already built (`app/stock/settings/uom/[name]/route.ts`) via `fetch`/the generic hooks (`useFrappeList`/`useFrappeUpdate`). Remove the direct `frappe-client` import from the page. Match how every other settings page fetches.
**Retest:** `/stock/settings/uom` loads; toggling `Must be whole number` persists; then create a Work Order / Stock Entry with qty `0.6` → succeeds (or shows the guided UOM message).

### 9R.4 — [P0] Quotation→Sales Order forward edge: drop the discriminator (CONFIRMED live)
**Symptom (live log):** `[flow-graph] edge Quotation→Sales Order failed: DataError: Field not permitted in query: prevdoc_doctype`. Fault isolation worked (rail didn't go dark), but the Quotation-anchored rail never lights its SO.
**Root cause (verified):** the **forward** edge `Quotation → Sales Order` keeps `extraFilters: [["Sales Order Item", "prevdoc_doctype", "=", "Quotation"]]` (`lib/flows/flow-link-map.ts:202–212`). Live ERPNext rejects `prevdoc_doctype` in that filter position (it isn't query-permitted on the child here), and even when permitted it is **often empty** — the codebase's own backward-edge comment (`:237–246`) already documents this and **drops** the discriminator. The forward edge's claim that "BFS fallback logic handles zero-row matches" is false — `resolveBackLink` does a single query and returns `null` (`flow-graph.ts:357–364`).
**Fix:** delete the `extraFilters` from the forward Quotation→SO edge (rely on `prevdoc_docname` + the verify step, mirroring the backward edge). Add a resolver test asserting the forward edge resolves with `prevdoc_doctype` **empty** on the SO item (the live reality).
**Retest:** open a Quotation that has a downstream SO → SO stage lights.

### 9R.5 — [P0] Orphan `/api/sales-order-item` 404 caller still mounted (Part 0.7 NOT done)
**Symptom (live log, repeated):** `GET /api/sales-order-item?fields=["parent"]&filters=[["Sales Order Item","prevdoc_docname","=","SAL-QTN-…"]]&limit=5 → 404`. Part 0.7 was reported complete but a **client-side** caller survives.
**Root cause:** some still-mounted component performs a **client-side back-link probe**, slugifying a child doctype (`"Sales Order Item"` → `sales-order-item`) into a non-existent `/api/<slug>` route. The server BFS at `/api/flows/resolve` is now the single source of truth — no component should issue client item-table queries. Likely culprits to grep: `lib/flows/flow-adjacency.ts` and its consumer `components/cross-flow/CrossFlowActionsMenu.tsx` (a client "View vs Create" existence probe), or any `components/smart/data-field.tsx` usage. The signature is `fields:["parent"]`, `limit:5`, a 4-tuple child filter.
**Fix:** find the caller (grep for `buildLinkFilter`/`getFlowLinksFrom`/`defaultSelectFields` usages that feed a `useFrappeList`/`fetch` against a slugified doctype) and remove it — the CrossFlow View/Create decision must read the resolved map from `/api/flows/resolve`, not probe child routes. **Do not change CrossFlow visuals** (2P-FINAL off-limits); this is data-path only.
**Retest:** no `/api/*-item` 404s in the network log on any detail page.

### 9R.6 — [P1] "Create Sales Order" from a DRAFT Quotation → docstatus guided error + CTA gating
**Symptom (live log):** `POST /api/erpnext/make-from` → 417 `ValidationError: Cannot map because following condition fails: docstatus=1` (ERPNext `make_sales_order`).
**Root cause:** ERPNext's mapper refuses to build an SO from a **draft** (docstatus=0) Quotation; the source must be **submitted**.
**Fix:** (a) the flow CTA / WhatsNext "Create Sales Order" must be **disabled with a hint** ("Submit this Quotation first") when the source Quotation is draft; (b) the `make-from` route must catch `Cannot map because following condition fails: docstatus=1` and return the guided message instead of a raw 417. Apply the same guard to every make-from whose ERPNext mapper requires a submitted source.
**Retest:** draft Quotation → CTA explains submit-first; submitted Quotation → SO is created and prefilled.

### 9R.7 — [P1] FlowRail missing below the header on DN, SI, PI, MR detail pages
**Symptom:** resolution is correct (stages light), but the rail only appears in the sidebar — it is **not rendered below the page header** on **Delivery Note, Sales Invoice, Purchase Invoice, Material Request** detail pages. SO / PO / PE render it correctly.
**Fix:** add the `<FlowRail>` block below the header on those 4 detail pages, matching the SO detail golden placement exactly (same component, same props, same surface). Visual parity with SO — no bespoke styling.
**Retest:** each of DN/SI/PI/MR detail shows the rail directly under the header.

### 9R.8 — [P1] MR→PO not lighting from the Material Request side
**Symptom:** "MR to PO flow non-existent" (PO→MR backward works in PO detail).
**Root cause (most likely):** the MR detail page doesn't render the rail (same as 9R.7) and/or the forward edge isn't reached. The forward edge `Material Request→Purchase Order` (`flow-link-map.ts:440–449`) is correctly child-table modelled.
**Fix:** after 9R.7 adds the rail to MR detail, verify the forward MR→PO edge resolves on live (PO Item carries `material_request`). If still dark, check for an orphan `/api/purchase-order-item` 404 caller (same class as 9R.5).
**Retest:** open an MR with a downstream PO → PO stage lights.

### 9R.9 — [P1] PR→PI (and PO→PI) prefill missing
**Symptom:** PO→PR prefill works; **PR→PI prefill is completely missing.**
**Root cause:** the PI new page doesn't read `?purchase_receipt=` (nor `?purchase_order=`) and apply the registry mapping. The mapping **already exists**: `"Purchase Receipt->Purchase Invoice"` in `lib/flows/flow-auto-fill.ts:298`. Only the page wiring is missing.
**Fix:** wire `app/accounting/purchase-invoice/new/page.tsx` to read `?purchase_receipt=` / `?purchase_order=`, fetch the source, and apply `applyAutoFill`/`applyItemAutoFill` (mirror how PR new reads `?purchase_order=` from Part 2, and how SO new reads `?quotation=`). Ensure each PI item carries `purchase_receipt` / `purchase_order` so the PI→PR / PI→PO rail back-links light.
**Retest:** from a PR detail → Create Purchase Invoice → supplier + items prefilled; new PI rail lights PR and PO.

### 9R.10 — [P1] PI→PE prefill + Payment Entry stage missing on the procure side
**Symptom:** "PE for PR, PO, MR completely missing — no doc connection, no prefill." Largely a consequence of 9R.9 (can't easily reach a PI→PE) plus the PI detail rail gap (9R.7).
**Root cause:** the `Purchase Invoice→Payment Entry` mapping exists (`flow-auto-fill.ts:251`) and the forward edge exists (`flow-link-map.ts:418–433`). What's missing: the PI detail "Create Payment Entry" CTA passing the right param, and the PE new page applying the PI mapping (party=supplier, `payment_type:"Pay"`, allocate outstanding into `references[]`).
**Fix:** wire the PE new page to read `?purchase_invoice=` (Part 3 did this for SI; extend to PI), prefill paid_amount = PI outstanding and the reference allocation, keep the "Allocate Invoice" override button. Then the PI→PE rail stage lights once the PE is submitted.
**Retest:** PI detail → Create Payment Entry → paid_amount + reference prefilled; after submit, PI rail shows PE.

### 9R.11 — [P1] Missing edit pages: Sales Invoice (404) + Customer edit (not converted)
**Symptom:** `/accounting/sales-invoice/<name>/edit` → 404; Customer edit page still the old non-V4 form.
**Fix:** create the SI edit page (V4, mirror an existing edit page e.g. the Item edit golden) and convert the Customer edit page to the V4 FlowWizard — and once 9R.2 fixes the Customer **create** provider bug, reuse the same `<Form>`-wrapped wizard shape for edit. Both must wrap in `<Form {...form}>`.
**Retest:** edit + save an SI and a Customer.

### 9R.12 — [FEATURE] Make COMPLETED flow-rail stages clickable (navigate to the doc)
**Request:** uncreated/downstream stages already route to *create*; make **completed** stages clickable CTAs that route to **that document's detail page** (`/{route}/{documentName}`), using `getDocTypeRoute` (`lib/flows/flow-chain-resolver.ts:124`) + the resolved `documentName` from the map.
**Constraint:** **do not change the FlowRail visual design** (2P-FINAL off-limits). Add only the affordance: `cursor-pointer` + `onClick`/`Link` on completed stages, a subtle hover, and `aria-label`. Pending stages keep create behavior; the current stage is non-navigating.
**Retest:** on an SO detail, clicking the completed Quotation / Customer / DN / SI stage opens that document.

### 9R.13 — [TEST] Harden the resolver mock (close the silent-pass hole)
The new `tests/flow-resolver.test.ts` correctly **throws** on the old parent-by-child-field pattern (good — anti-regression intact). But its in-memory matcher **ignores 4-tuple child-table filters** (`:166–167`), so the forward "resolves to X" assertions pass only because each seeded doctype has one candidate — a wrong child **field name** would still pass. Make the mock apply 4-tuple child filters against the seeded child rows (join on `parent`) so a wrong child field fails the suite. Keep all existing assertions green.

### 9R.14 — [P0] SO **from a Quotation** still 417s on payment schedule (make-from path; scratch is fixed)
**Symptom (2nd live retest):** creating an SO **from scratch now works** (9R.1 landed) — but **Create Sales Order from a Quotation** still fails: `POST /api/sales/sales-order` → 417 `ValidationError: Row 1: Due Date in the Payment Terms table cannot be before Posting Date`. The guided "Remove payment terms from this order" button does nothing.
**Root cause (verified):** this is a **different data source** than 9R.1. The make-from path calls ERPNext's `make_sales_order` mapper (`app/api/erpnext/make-from/route.ts:193`, key `"Quotation->Sales Order"` `:76–79`), which copies the **source Quotation's `payment_schedule` rows verbatim** — their `due_date` was computed against the Quotation's **earlier** `transaction_date`. The route returns `doc` unaltered (`:208–211`); the SO new page hydrates the wizard from it and POSTs those **stale schedule rows** → `due_date < posting_date` → 417. 9R.1 only sanitized the *scratch* payload, so the make-from hydration still carries the bad rows.
**Fix (do all three):**
1. **Clear rows, keep the template — centrally, in the route.** In `make-from/route.ts`, after unwrapping `doc` (`:194`), for date-validated targets (Sales Order, Purchase Invoice, Sales Invoice, Delivery Note, Purchase Receipt) set `doc.payment_schedule = []` and null out `doc.due_date` / `doc.payment_due_date`, **while keeping `doc.payment_terms_template`**. ERPNext's `set_payment_schedule()` rebuilds the schedule from the template against the **new** doc's posting/transaction date during `validate` *only when `payment_schedule` is empty* — so zeroing the rows makes ERPNext recompute fresh dates. This is the single canonical choke point and also protects PO→PI, DN→SI, PR→PI from the identical staleness.
2. **Make the guided "Remove payment terms" button actually work.** Its handler must clear **both** `payment_terms_template` **and** `payment_schedule` from the submit payload and re-POST (today it likely only clears the template field in form state, not the hydrated schedule rows — hence "does nothing"). This is the operator's escape hatch; after fix #1 it is rarely needed but must function.
3. **Same guided message as 9R.1** already covers the raw 417 text — verify it also fires on the make-from submit, not only the scratch submit.
**Retest:** open a **submitted** Quotation that carries payment terms → Create Sales Order → SO is created with a freshly-computed schedule (no 417); the rail lights Quotation upstream.

### 9R.15 — [P2] UOM list: whole-number toggle floats mid-row; pin it right
**Symptom (live retest):** on `/stock/settings/uom`, the `must_be_whole_number` toggle sits at a different horizontal position per row — its x-position tracks the **UOM name length** instead of being right-aligned.
**Root cause (verified):** the row is `flex … justify-between` with **three** children — identity block (`page.tsx:208`), toggle group (`:222`), dropdown (`:254`). `justify-between` pins only the first and last to the edges and centers the **middle** child (the toggle) in the leftover space, so its position depends on the identity block's width (the name).
**Fix:** add `flex-1` to the identity block wrapper at `:208` (`"flex items-center gap-3 min-w-0"` → `"flex items-center gap-3 min-w-0 flex-1"`). That collapses the free space so the toggle + dropdown form a fixed cluster pinned hard right on every row. (Equivalent alternative: wrap toggle+dropdown in one `ml-auto` group — pick the `flex-1` one, it's the minimal diff.) No behavior change; cosmetic only.
**Retest:** all toggles align on a single right-hand column regardless of name length.

---

### Features re-confirmed for this gate (no new items — already specified above)
Kidus re-emphasized two flow-rail changes on the 2nd retest. **They are already in 9R and stay in this build-first gate:**
- **Flow rail rendered below the page header on every detail page** → **9R.7** (adds the rail under the header on DN/SI/PI/MR to match the SO/PO/PE golden placement).
- **A CTA to each doc in the rail** → **9R.12** (completed stages become clickable and navigate to that document's detail; uncreated stages already route to *create*; current stage is non-navigating). Visuals stay locked (2P-FINAL off-limits) — affordance only.

---

## PART 10 — Job Card module (missing entirely)

The **Job Card** doctype is absent from the sidebar and the whole flow. Implement it as a first-class V4 module:
- **Sidebar:** add "Job Cards" under Manufacturing (icon e.g. `ClipboardList`), `app/manufacturing/job-card/`.
- **List + detail + create** pages (V4 template). ERPNext `Job Card` links to a Work Order (`work_order`), an Operation (`operation`), a Workstation (`workstation`), and has `for_quantity`, `time_logs[]`, `status` (Open / Work In Progress / Completed / On Hold).
- **Employee workflow (the core of Part 14):** a Job Card assigned to an employee shows a big **Start** button (creates a time log / sets status Work In Progress) and a **Finish** button (closes the time log, sets Completed). All other fields automated/hidden for the shop-floor user. See Part 14 for assignment + Part 13 for how cards are generated from a WO.
- **Flow:** add Work Order → Job Card edges to the link map (`Job Card.work_order` back-link) so the WO rail shows its job cards and their completion.

### Acceptance
Job Cards appear in nav; a card can be Started and Finished by its assignee; the WO detail shows its cards and completion roll-up.

## PART 11 — Warehouse simplification (Stores + WIP, implicit & automated)

These clients run a single physical store. Reduce warehouse management to:
- **Stores** (every raw material, product, finished good) — the default for receipts, deliveries, stock.
- **Work In Progress (WIP)** — holds material transferred for manufacture; finished goods return to Stores.

Build:
- Provisioner ensures exactly these two non-group warehouses exist per company (`Stores - <abbr>`, `Work In Progress - <abbr>`), under the company's warehouse group. Reuse/extend `lib/settings/warehouses.ts` + `app/api/stock/warehouses/defaults`. (Note: that defaults route is currently 500-ing in the logs — `GET /api/stock/warehouses/defaults?company=Pana 500` — fix it as part of this.)
- **Make warehouse implicit:** default every item line's warehouse to Stores; default WO `wip_warehouse = WIP` and `fg_warehouse = Stores`; default PR/DN warehouse to Stores. The user should rarely pick a warehouse. Keep an override for advanced users but never block on a missing warehouse (the PO "Warehouse is mandatory for stock item" 417 in the logs must be prevented by defaulting Stores).
- Hide/de-emphasize warehouse pickers where they only ever take the default.

### Acceptance
A fresh company provisions Stores + WIP; creating PO/PR/DN/WO never prompts for a warehouse (defaults applied); the mandatory-warehouse 417 cannot occur.

## PART 12 — Stock-level view modal during SO and Quotation creation

A **display-only** (no permission gate) modal/panel the sales user can open during SO **and** Quotation creation to see live stock for the items they've selected. Fetch from `Bin` (actual_qty, reserved_qty, projected_qty per warehouse) for the line items' item_codes. Render item × warehouse on-hand. Pure read; never blocks. Add the same control to both `app/sales/sales-order/new` and `app/sales/quotation/new`.

### Acceptance
Selecting items in SO/Quotation create, the user can open a stock-levels view showing on-hand for those items; no gating.

## PART 13 — SO → Work Order automation (draft from SO detail, no create page)

From the **Sales Order detail** page, the sales user can assign/create a Work Order **without leaving for the create page**:
- A "Create Work Order" action that, for each manufacturable line item (item with a default BOM, or `is_stock_item` finished good that needs production), **drafts** a Work Order automatically: `production_item`, `bom_no` (default BOM), `qty` (from SO line), `sales_order` = SO, `company`, `wip_warehouse = WIP`, `fg_warehouse = Stores` (Part 11 implicit warehouses), `planned_start_date`. Leave it as a **draft** (docstatus 0) for review.
- **Smart "if it doesn't exist, make it" path:** if the SO product has no BOM yet, guide the user to create one (or auto-create a stub BOM from the configurator output in Part 15). Be explicit, not magical — show what will be created before committing.
- Surface the drafted WO(s) inline on the SO detail with status, and light them on the rail (SO→WO already an edge).

### Acceptance
From an SO with a manufacturable item, one action drafts a correctly-linked WO using implicit warehouses; the SO detail shows the WO and its status.

## PART 14 — HR module + employee job assignment (full ERPNext HR)

Implement the ERPNext **HR** module surfaces needed for shop-floor job execution, with full features in this handoff:
- **Employee** master (list/detail/create, V4): `employee_name`, `user_id` (links the login), `designation`, `department`, `company`, `status`. Each shop employee gets credentials via `user_id`.
- Sidebar "HR" section: Employees (and the standard HR docs ERPNext provides — Attendance, Leave, etc. — implement the core set; prioritize Employee + assignment over payroll).
- **Job assignment from the SO/WO:** when the sales user drafts a WO (Part 13), they can **assign each operation's Job Card to a specific employee** (`Job Card` has no native `employee` on the card header in all versions — use the standard assignment: set the Job Card's employee via `time_logs[].employee` or the ToDo/assignment, **verify the v15 field** in generated types). Three employees can hold three job cards for the same WO.
- **Completion roll-up:** when all of a WO's job cards are Completed, the WO shows Completed; this is reflected in BOTH the WO module and the SO detail (per-job completion for the same WO visible inside the SO). The sales user then confirms, which is the trigger to create DN/SI/PE (existing flow continues unchanged).

> **Sequencing note:** Parts 10, 13, 14 form one workflow — build them together and test the full path: SO → draft WO → generate Job Cards → assign to 3 employees → each employee Start/Finish → WO auto-completes → visible in SO → sales user creates DN/SI/PE.

### Acceptance
The end-to-end shop-floor loop above works with three distinct employee logins; WO completion is driven by job completion and shown in both WO and SO.

## PART 15 — Item configurator / option sets (printing options) — DESIGN + BUILD

### The need
Printing products (e.g. business cards) have configurable options: **size, print sides, paper thickness, lamination, corners**, etc. The user needs to pick these when creating a Quotation/SO/WO, have them priced, and feed manufacturing — without exploding the item master.

### Recommended approach (Brain's call — confirm with Kidus before building if unsure)
**A guided configurator that composes the order line + a per-order BOM. NOT ERPNext Item Variants.**

Why not the obvious routes:
- **Item Variants/Attributes** → combinatorial explosion (size×sides×paper×lamination×corners = dozens–hundreds of SKUs per product), each needing its own BOM/price. Unmanageable for made-to-order.
- **Product Bundle** → components are FIXED per bundle; you can't choose options at order time.

**The model:**
1. **Option Set definition** per configurable item (or item group). Fields per option group: `name` (e.g. "Lamination"), `type` (single/multi), and `choices[]` where each choice has: `label`, `price_delta` (additive to the line rate), optional `component_item` + `qty_formula` (a raw material consumed, feeding the BOM), and optional `attribute_tag` (free text recorded on the line). Start storage as a **seeded JSON config** keyed by item_code (no Frappe custom-doctype migration needed for v4); if it proves out, promote to a custom `Item Option Set` DocType in a later phase. Document this as a deliberate v4 choice.
2. **Configurator component** rendered in SO/Quotation/WO create when a configurable item is added. It reads the option set, lets the user pick, and on confirm:
   - sets the line `rate` = base price + Σ price_deltas,
   - writes the chosen options into the line `description` (human-readable) **and** a structured field (e.g. JSON in a custom line field or the line's `additional_notes`) so the choices are recoverable,
   - if the item is manufactured, assembles a **per-order BOM** from the chosen `component_item` + `qty_formula` rows (this is what Part 13's WO consumes).
3. **Fraction-safe:** component quantities will be fractional (0.6 sheets etc.) — depends on Part 1 (UOM fractions allowed).

### Acceptance
A user creating a Quotation/SO for "Business Cards" picks size/sides/paper/lamination/corners; the line is priced from base + deltas; the choices are recorded and recoverable; a manufacturable configured item yields a per-order BOM the WO can consume.

> **This is the one part with a genuine design fork.** If Kidus prefers ERPNext-native Variants despite the explosion (e.g. for reporting by SKU), say so before building — it changes everything downstream.

## PART 16 — Reports module (extensive, the priority deliverable)

Build a broad, detailed reports module — "every last detail a board/admin needs for decision-making." Implement properly with real date controls and explicit labels.

**Date controls (every report):** single day, selected date, week, month, quarter, year, **and year-on-year comparison**. Default to a sensible range; all selectable.

**Reports to ship (group under a Reports nav section):**
- **Sales:** sales by day/week/month/year + YoY; by customer; by item; by salesperson. Quotations issued vs converted (win rate).
- **Receivables (AR):** all customers, their invoices, paid vs unpaid, **delivered vs undelivered**, outstanding aging buckets (0–30/31–60/61–90/90+), overdue reminders.
- **Payables (AP):** all suppliers, PIs paid/unpaid, outstanding aging, due reminders.
- **Profit & Loss / Margins:** revenue, COGS, gross profit, by period + YoY; loss flags.
- **Purchases:** by day/week/month/year + YoY; by supplier; by item.
- **Stock:** current levels per item per warehouse, valuation, reorder/short flags, slow movers.
- **Manufacturing:** WOs by status, on-time vs late, job/employee throughput.

**Extensive filter system (every report, shared filter bar):**
Build ONE reusable, composable filter bar mounted on every report. Filters AND together, update results live, and are URL-persisted (shareable/bookmarkable links). The filter set:
- **Date range** — the full selector above (day / selected date / week / month / quarter / year / custom range / YoY compare). Include quick presets (Today, This Week, This Month, This Quarter, YTD, Last Year).
- **Party** — customer (multi-select), supplier (multi-select), salesperson/owner.
- **Document** — status (multi: Draft/Submitted/Paid/Unpaid/Overdue/Delivered/Cancelled), docstatus, company (implicit, default Pana).
- **Item dimension** — item, item group (tree-aware, from Part 8), brand, warehouse.
- **Money** — amount range (min/max), outstanding-only toggle, currency (ETB default).
- **Manufacturing** — work order status, employee/operation (for throughput reports).
- Each filter is optional; an empty filter = no constraint. Clearing all returns the full period view. Active filters render as removable chips above the table.

**Nested, detailed dashboard UI (richer than the existing dashboards):**
The reports landing is NOT a flat list of tables — build a **drill-down nested dashboard**:
- **Top tier:** KPI summary cards (total sales, purchases, gross profit, AR outstanding, AP outstanding, overdue count) for the active filter range, each with a period-over-period delta (▲/▼ vs previous period, green/red) and a sparkline.
- **Middle tier:** expandable section groups (Sales, Receivables, Payables, P&L, Purchases, Stock, Manufacturing). Each group is a collapsible panel (reuse the B1 sidebar/panel golden surface — `bg-card rounded-2xl shadow-sm p-6 border-border/40`) showing its headline chart + summary row.
- **Drill-down:** clicking a KPI card or a chart segment **expands inline / navigates into** the detailed line-item report for that slice with the filter pre-applied (e.g. click "AR Outstanding" → the receivables table filtered to outstanding>0; click a customer bar → that customer's invoices). Breadcrumbs let the user climb back up. This is the "nested dashboard-like but very detailed" experience — summary at the top, every underlying row reachable by drilling, never a dead-end number.
- Charts: use the project's existing chart lib (match what the current dashboards use); every chart has an accessible data-table fallback and respects the active filters.

**Build standards:**
- All amounts in ETB; all figures explicitly labelled (no bare numbers).
- Every report + the dashboard support the full filter bar and exports (CSV + the Part 7 PDF).
- Indicate success/failure signals explicitly (overdue in red, margin below threshold flagged, on-time vs late) — "all indications of fail/success should be indicated."
- Source from the same ERPNext queries the dashboards use; reuse, don't duplicate logic. Watch the permission errors seen in the logs (`item-reorder` / parent-permission 403) — query at the right doctype level and handle 403 gracefully (degrade the affected card, never blank the whole report).
- Performance: filters drive server-side queries (limit/aggregate in the API), not client-side filtering of huge result sets.

### Acceptance
A board user lands on a nested KPI dashboard, applies any combination of the filters (date/party/item/status/amount, incl. YoY), and drills from any summary number into the underlying line-item report with the filter carried through; all paid/unpaid/delivered/undelivered and AR/AP/P&L are explicit with success/failure indicators; everything exports and the filtered view is URL-shareable.

## PART 17 — Power features for the main module list pages

The main list pages are currently thin (a fetch + a basic table — visible in the logs). Upgrade them into capable working surfaces. **Build ONE reusable enhanced-list framework** (shared toolbar + table behaviours) and apply it to: **Sales Order, Quotation, Sales Invoice, Purchase Invoice, Delivery Note, Customer, and Item/Inventory** (and reuse it on Purchase Order, Material Request, Work Order where it fits cheaply).

Shared capabilities (all server-backed where the data is large — do not pull 100k rows to the client):
- **Filtering:** a per-list filter bar (reuse the Part 16 filter components) — by status, date range, party, amount range, item/group, warehouse, plus a **full-text search** box over the key text fields (name, party, item). Active filters as removable chips; URL-persisted.
- **Sorting:** click-to-sort on every meaningful column (date, amount, status, party, name), asc/desc, server-side `order_by`.
- **Column controls:** show/hide columns + remembered column choices; sensible defaults per doctype (e.g. SO: name, customer, date, delivery date, grand total, %delivered, %billed, status).
- **Status & money clarity:** StatusBadge with the semantic OKLCH tokens (no off-palette — see `ui-quality-bar`); for invoices show paid/outstanding inline (ties to Part 4); for SO/DN show per-delivered / per-billed progress.
- **Bulk actions:** row checkboxes + a bulk bar — at minimum bulk **Print/Export** (CSV + Part 7 PDF) and bulk status-safe operations where ERPNext allows (e.g. submit drafts). Guard every bulk op behind the server permission boundary (never a cosmetic gate).
- **Saved views:** let the user save a filter+sort+column combination as a named view (e.g. "Overdue invoices", "Undelivered SOs") — persist locally (or per-user) and surface as quick tabs at the top of the list. Seed a couple of useful defaults per module.
- **Row affordances:** quick-actions menu per row (View / Edit / Print / the relevant cross-flow "Make X"), and a clickable row → detail.
- **Pagination / load:** server-side pagination or infinite scroll with a total count; show "X of Y" — replace the hard `limit=100`/`limit=200` truncation visible in the logs so records past the cap are reachable.
- **Empty/error states:** graceful, branded empty states and the guided-error treatment on load failures (never the generic "Failed to load" — see F-A1 lineage); degrade on 403 with a clear reason.

Per-module specifics:
- **Customer:** add group/territory filter, outstanding-balance column, and last-activity; link to the 360 detail.
- **Item/Inventory:** add item-group (tree) filter, on-hand qty column (from Bin), reorder/short flags, and a stock-level quick view (ties to Part 12).
- **Invoices (SI/PI):** outstanding + due-date + overdue flag columns; "outstanding only" quick view.
- **DN:** per-billed + delivery status; quick Gate Pass / customer-DN print from the row (ties to Part 7.1).

### Acceptance
Each listed module has filtering, full-text search, sortable columns, column show/hide, bulk print/export, saved views, server-side pagination beyond the old caps, and clear status/money columns — all on the shared framework, all respecting the server permission boundary.

---

## CROSS-CUTTING NOTES FOR THE MESH

- **ERPNext fidelity is non-negotiable.** Every field named above is real v15; still verify against `types/` and the live doctype before use. Header vs child-table placement is exactly what broke Part 0 — double-check it for every new query.
- **Fault isolation everywhere:** no single bad edge/field/permission should blank a page. Catch + log + degrade. (Part 0's lesson generalized.)
- **Graceful errors:** keep using the PERMISSION / guided-error strategy from 2R; never show the generic "Something went wrong" for a known cause (UOM fraction, missing warehouse, 403).
- **White-label rule holds:** branding from company settings; Pana only on `deploy/pana`.
- **Off-limits unchanged:** do not alter `components/cross-flow/CrossFlowActionsMenu.tsx` visuals or the FlowRail look (2P-FINAL); Part 0 is data-layer only.
- **Tests:** add the live-faithful resolver tests (0.6). Keep the whole suite green.

## REPORT BACK (per MESH_REPORTING_CONTRACT.md)
Produce `docs/v4/PHASE_2S_BUILD_REPORT.md`: Part-by-Part table with `file:line` + before→after, static gates, a **live retest checklist** (rail green on 7 doctypes, UOM fraction WO, partial PE, configurator round-trip, employee job loop, each report), and KNOWN GAPS. Flag anything you could not verify against the live instance so Kidus can check it.



