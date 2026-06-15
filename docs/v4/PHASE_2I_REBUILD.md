# PHASE 2I REBUILD — G1-G5 fixes + Stock Visibility module (clean re-implementation)

> Brain (Opus 4.8) → OpenCode mesh (NEW coding model). The previous attempt was discarded:
> its commits claimed fixes the code did not contain, edited forbidden files, and shipped ~1,340
> lines of unused god-modules. That work has been **destroyed** (develop reset to `510e13c`,
> branch deleted). You are starting **clean** — there is nothing to "fix forward," only to build
> correctly the first time.
>
> Recovery note (FYI only — do not use): the discarded work is parked on local tag
> `archive/2i-slop`. Do not branch from it.

## Base & branch
- Current `develop` tip = **`510e13c`** (Customer/Quotation V4 conversion + hotfixes — verified
  good, live-tested). This doc + `PHASE_2I_HANDOFF.md` are committed on top.
- Build on **`feat/v4-phase-2i-rebuild`** off `develop`.
- Two workstreams in this branch: **Part 1 = G1-G5 fixes** (below), **Part 2 = Stock Visibility
  module** (see `docs/v4/PHASE_2I_HANDOFF.md`, unchanged and authoritative).
- Recommended order: land G1-G5 first (they touch shared flow/error/wizard code), then the Stock
  module on top (purely additive). Separate commits per workstream.

## Pillars (non-negotiable)
P1 schema-first · P2 factory (reuse `useFrappe*` hooks + `@/components/*` — **do NOT invent new
abstraction layers**) · P3 lean modules (no speculative god-files) · P4 premium UI · P5 this doc ·
P6 zero `@ts-nocheck`, full types.

---

# PART 1 — G1-G5 fixes

All five were real bugs found by live testing on the `510e13c` base. Each diagnosis below was
verified by the Brain against the real tree (file:line). Fix the **root cause**, not the symptom.

## G1 — [P0] Quotation→Sales Order: customer comes up empty and locked
**Root cause:** `lib/flows/flow-auto-fill.ts`, the `"Quotation->Sales Order"` registry entry, maps
`{ sourceField: "customer", targetField: "customer" }`. ERPNext **Quotation has no `customer`
field** — the party is in `party_name`, gated by `quotation_to` (`"Customer" | "Lead"`). So autofill
reads `undefined` → SO customer empty → (flow field) locked → dead end.
**Fix:**
- Map `{ sourceField: "party_name", targetField: "customer", isReadOnly: true, sourceLabel: "Customer" }`.
- Apply **only** when `quotation_to === "Customer"` (an `autoFillGuard` on the entry, or skip the
  mapping otherwise) so a Lead-quotation never writes a Lead id into `customer`.
- Verify each other claimed header mapping (`customer_address`, `contact_person`, `territory`, …)
  actually exists on the Quotation doctype; drop any that don't.
**DoD (live):** Quotation (quotation_to=Customer) → Create Sales Order → customer prefilled, items
carried, submit works.

## G2 — [P0] FlowRail "Create" button 404s (symbolic id used as href)
**Root cause:** `components/flows/FlowRail.tsx` uses `nextBuildable.createAction` — a **symbolic id**
like `"create_work_orders"` — directly as `<Link href>`, producing `/sales/quotation/create_work_orders`
→ 404. (The prior attempt added a `buildCreateUrl` helper but never wired the component to it — do
not repeat that; the helper is worthless until FlowRail calls it.)
**Fix:**
- Add `currentDocName: string` (and current source doctype) props to `FlowRail`; update the detail
  pages that render it to pass the doc name.
- In FlowRail, compute the real URL: `/<route>/new?<param>=<name>` where `<route>` = the downstream
  doctype's route and `<param>` = that doctype's auto-fill query param (the **same** param the
  WhatsNext "Create X" links already use — reuse that mapping, don't fork a second one).
- Use it in the action-zone `<Link href>`. Gate the zone on a non-null URL.
**DoD (live + test):** the "Up next · Create" button is a real `/route/new?param=name` URL and opens
the prefilled wizard. Add **one RTL test that renders `<FlowRail>` and asserts the anchor's `href`
is a real route**, not a symbolic id. (Isolated helper tests are exactly how the last 404 shipped
green — the assertion must be on the rendered component.)

## G3 — [P0] Implicit company: field still rendered on transactional wizards
**Root cause:** company is supposed to be injected via `getActiveCompany()` at submit, never shown.
But `name="company"` is still rendered (e.g. `delivery-note/new:353`, `sales-invoice/new:305` —
`<FormFrappeSelect name="company" required>`) and on `purchase-invoice`, `payment-entry`,
`stock-entry`, `material-request` new pages.
**Fix:** remove the company field (form render + step `fields` array + `defaultValues`) from **all
transactional create/edit wizards** — DN, SI, PI, PE, SE, MR (and re-grep `app/**/{new,edit}` to
confirm none remain). Keep the submit-time `company: getActiveCompany()` injection and the
Review-step display.
- **Keep** company on genuinely company-scoped **masters**: `warehouse`, `account`, `cost-center`,
  `project`, `taxes`, `hr/employee`. List which you kept and why in the PR notes.
**DoD:** `grep -rn 'name="company"' app/**/new app/**/edit` returns only the master pages above;
create a DN + SI with no company field → submit succeeds (company injected).

## G4 — [P0] Server error renders as `[object Object]`
**Root cause:** `lib/errors/extract-frappe-message.ts` — the `_server_messages` path can return early
via `String(objectMessage)` and bypass the `[object Object]` guard, so a Frappe rejection whose
`message` is an object surfaces as literal `[object Object]` (seen on PO create).
**Fix:** route **every** return path through a single `sanitizeResult()` (or equivalent) that
replaces any `[object Object]`/stringified-object with a readable fallback. Add a fixture where
`entry.message` is an object and a test asserting the output never contains `[object Object]`. Then
**live-retest PO create** — the real rejection (likely the missing company, see G3) must surface as a
readable guided error.
**DoD:** PO create either succeeds or shows a readable guided message — never `[object Object]`.

## G5 — [P1] Notifications are read-only; should deep-link to the doc/wizard
**Root cause:** notification items aren't actionable. User wants clicking a notification to navigate
to the relevant doc/wizard (e.g. the duplicate/linked record).
**Fix:** add optional `href?` to the Notification type; populate it where notifications are captured
(toast wrapper + guided-error capture — at least for DUPLICATE / LINKED_DOC_EXISTS, reuse the
resolver's navigate target). Render items with `href` as clickable (mark-read **and** navigate).
**Use Next.js client routing (`useRouter().push(href)`) — not `window.location.href`** (no full
reload).
**DoD:** clicking a notification with a target navigates client-side to the doc; mark-read still fires.

---

# PART 2 — Stock Visibility module

Build exactly per **`docs/v4/PHASE_2I_HANDOFF.md`** (restored, authoritative). Re-read §7 guardrails
— the prior attempt violated them and that's a hard reject:
- **Stock Reconciliation is STANDALONE.** No FlowRail on its detail page. **No** `flow-auto-fill`
  mapping. **No** `flow-definitions` stage. Do NOT add a `PO→Stock Reconciliation` edge — a PO is
  received via Purchase Receipt, not reconciled.
- Clone the `purchase-receipt/*` golden template but strip the flow chain (WhatsNext = Submit only).
- Part A (Stock Reconciliation CRUD) + Part B (Stock Balance from `Bin`) required; Part C (Stock
  Ledger) if time. `computeStockKPIs` stays a real, unit-tested pure helper.

---

# Quality contract (why the last attempt was rejected — do not repeat)
The previous model was discarded for these specific reasons. Each is now a gate:
1. **Claim = code.** In your report, for every fix quote the `file:line` and the before/after diff.
   "✅ FIXED" without a diff is treated as not done. (Last time, G1/G2/G3 were reported fixed and
   were not.)
2. **No new abstraction layers.** Reuse existing `useFrappe*` hooks and `@/components/*`. Do **not**
   create files like `optimizer.ts`, `auditor.ts`, `integrator.ts`, `composer.ts`, or any module
   with **no caller**. Every new file must be imported by something that ships.
3. **No `__init__.ts`.** This is a TypeScript/Next.js repo, not Python.
4. **Honor guardrails.** If a handoff says a doc is standalone / a file is off-limits, respect it.
5. **Static gates are necessary, not sufficient.** `tsc 0` + `vitest green` do not prove the UI
   works — every prior failure passed them. Run the dev server and click the live retest paths below
   before declaring done; report what you actually saw.

# Live retest checklist (required before co-sign)
1. Quotation(customer) → Create Sales Order → customer prefilled + items carried. (G1)
2. Any detail with a downstream → FlowRail "Create" → real prefilled wizard, no 404. (G2)
3. DN + SI new → no company field → submit succeeds. (G3)
4. PO create → succeeds or readable guided error (never `[object Object]`). (G4)
5. Trigger duplicate/linked guided error → click the notification → client-side nav to the doc. (G5)
6. Stock Reconciliation (Opening Stock) → submit → **Stock Balance** reflects qty/value; **Stock
   Ledger** shows the entry; SR detail has **no** FlowRail. (Part 2)

# Definition of Done
- `tsc --noEmit` = 0; `vitest` green; **all 6 live retest steps pass, reported with observed
  behavior** (not a checkmark table).
- New tests: FlowRail rendered-href RTL test (G2); `flow-auto-fill` test that a customer-Quotation
  maps `party_name→customer` and a Lead-Quotation does not (G1); `computeStockKPIs` aggregation.
- Zero `@ts-nocheck`; no unused modules; no `__init__.ts`; no `name="company"` on transactional
  wizards; SR is standalone.
