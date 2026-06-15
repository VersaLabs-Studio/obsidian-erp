# PHASE 2K — Re-fixes (2J live failures) + Two Core UX Features

> **READ `docs/v4/MESH_REPORTING_CONTRACT.md` FIRST AND LAST.** Your completion report is
> audited claim-by-claim against the real tree (`git show`, `grep`, dev-server observation),
> not against a DoD table. A claim that does not match the code is a failed deliverable.

**Branch:** continue on **`feat/v4-phase-2j-fixes-pricing`** (additive commits — do **not** cut
a new branch, do **not** rebase). Phase 2J's good work is kept and built upon; 2K layers the
re-fixes + features on top. The whole branch is co-signed as one unit after a clean live
retest.

**Model note:** the mesh now runs a more capable model. This handoff is written assuming you
will actually **run the dev server and click every path** before reporting — the entire reason
2J failed regate is that the static gates passed while the runtime was broken.

---

## 0. Gate result for Phase 2J — REJECTED (re-cycle)

Live retest by the owner found **F1, F2, F3, F7, F9 still broken**, plus a new failure
(Payment Entry) and two unreachable modules (Item Price / Price List not in nav). Verified in
code:

| 2J item | Reported | Reality in tree | Verdict |
|---|---|---|---|
| F1 error detail | "object-message extraction added" | True, but patched the **Frappe `_server_messages`** branch — the actual symptom is our **own Zod 400** (`details: fieldErrors` object), a different code path `extractFrappeMessage` never reads. | **Wrong branch fixed** |
| F2 PO create | "@ts-nocheck removed, types correct" | Removing `@ts-nocheck` is **compile-time cosmetic** — it cannot change a runtime 400. The 400 is a **local Zod rejection** (`title` Required). | **Non-fix** |
| F3 SR submit | "added `set_posting_time: 1`" | That value is added to a payload that is **rejected by Zod first** (`naming_series`, `posting_time` Required) — Frappe is never reached. | **Downstream of the real bug** |
| F4 SI | fixed | SI creates. ✅ | **Pass** |
| F5 prefill | "Customer quick-actions fixed" | Customer→Quotation/SI/PE prefill. **Customer→SO does not** (SO wizard reads only `?quotation=`). Billing-address dropdown 404s. | **Partial** |
| F6 Lead | fixed | ✅ | **Pass** |
| F7 notifications | "persistence + detail view + actions" | Click only marks-as-read; **no detail panel, no redirect**. Panel code exists but is never reached / notifications carry no `detail`/`actions`. | **Fail** |
| F8 logo | fixed | ✅ | **Pass** |
| F9 SLE detail | "detail page created" | Page created, but **no `[name]` API route** → page fetch 404s. A page without its data route. | **Fail** |
| Item Price / Price List | "masters built" | Pages exist but are **not in any sidebar / settings nav** → unreachable. | **Unreachable** |

**Why this passed `tsc 0 / vitest 96` and still failed:** every failure here is a runtime
contract mismatch (Zod payload shape, missing route file, missing nav entry, unwired click
handler). Static gates cannot see any of them. This is exactly the failure mode
`MESH_REPORTING_CONTRACT.md` rule 5 exists to stop — **the live retest was not actually run.**

---

## Part 1 — Re-fixes (must pass live)

### R1 [P0] — Over-strict `*CreateSchema` rejects valid wizard payloads locally *(root cause of F2, F3, and likely PE)*

**Diagnosis (verified):** `createCreateHandler` runs `schema.parse(body)` and returns a **400 in
~11 ms** (no Frappe round-trip — Frappe calls take 140–270 ms) when the payload is missing a
field the create-schema marks required. The wizards correctly omit Frappe-auto fields, but the
schemas demand them:

- `PurchaseOrderCreateSchema` (`lib/schemas/doctype-schemas.ts:2117`) requires **`title`**
  (`PurchaseOrderSchema:2003`, `.min(1)`). The PO wizard payload (`app/buying/purchase-order/new/page.tsx:276`)
  spreads `...values` which has **no `title`** → `title: Required` → 400.
- `StockReconciliationCreateSchema` (`:3016`) requires **`naming_series`** (`:2993`) and
  **`posting_time`** (`:2997`). The SR payload (`app/stock/stock-reconciliation/new/page.tsx:164`)
  sends neither → 400. (`set_posting_time: 1` is irrelevant — it's stripped/ignored before
  Frappe is reached.)

**Fix:** Frappe **auto-generates** `name`/`title`/`naming_series` and defaults `posting_time`.
Make these **optional in the CREATE schemas** (not the base doctype schema). Concretely:
- Drop `title` from `PurchaseOrderCreateSchema`'s required set (omit it from the pick, or
  `.partial({ title: true })`-equivalent — make it `.optional()`).
- Make `naming_series` and `posting_time` `.optional()` in `StockReconciliationCreateSchema`.

**Then audit EVERY `*CreateSchema`** for the same disease and fix all of them — do not stop at
PO/SR. For each create schema, the rule is: **a field that Frappe auto-fills on insert
(`name`, `title`, `naming_series`, `posting_time`, auto-calculated totals) must NOT be required
at create.** Cross-check each create schema against the field set its wizard actually submits.
List every schema you changed in your report.

**Acceptance:** PO create and SR submit succeed against live Frappe and land on the new
record's detail page. Report the created doc names you observed.

---

### R2 [P0] — Surface our own validation errors *(the REAL F1)*

**Diagnosis (verified):** the dialog text the user sees — *"Something went wrong / The server
rejected this action / An unexpected error occurred"* — is `resolveFrappeError`'s **generic
fallback** (`lib/errors/frappe-error-resolver.ts:319-322`), where `details: [rawMessage]` and
`rawMessage = extractFrappeMessage(err)`. When the error is **our own** `ApiErrorResponse`
(`{ success:false, error:"Validation Error", details: { title:["Required"] } }`, from
`api-factory.ts:204-211`), `extractFrappeMessage` has **no branch** for the Zod `fieldErrors`
object shape — it only understands Frappe `_server_messages` — so it returns the generic
string. 2J's extractor change improved the Frappe branch but never touched this one.

**Fix:** make the client surface our own validation `details` object. Add a branch (in the
fetch/error wrapper that builds `err`, or in `extractFrappeMessage`) that, when the response is
an `ApiErrorResponse` with a `Validation Error` and an object `details`, renders it as readable
lines — e.g. `title: Required · naming_series: Required`. The user must see **which field**
failed, never "An unexpected error occurred."

**Acceptance:** trigger a validation error on purpose (submit a wizard with a required field
blank) and confirm the dialog names the field(s). Once R1 lands, real submits succeed; R2 is
the safety net so the *next* schema mismatch is legible instead of silent.

---

### R3 [P0] — Payment Entry create fails

**Diagnosis:** `PaymentEntryCreateSchema` (`:5060`) requires `paid_from`, `paid_to`,
`paid_amount`, `received_amount` (all non-optional). From Customer→PE the party prefills but
these accounts are almost certainly missing → same local Zod 400 as R1. **Investigate live**
(after R2, the dialog will tell you the exact field). Fix by either deriving sensible defaults
in the PE wizard (default bank/cash `paid_to`, party receivable `paid_from`) or correcting the
required set if Frappe auto-resolves them. Report the exact field that was failing and the fix.

---

### R4 [P1] — Stock Ledger Entry detail 404 *(F9)*

**Diagnosis (verified):** `app/stock/stock-ledger/[name]/page.tsx` fetches
`/api/stock/stock-ledger-entry/<name>` but **only `app/api/stock/stock-ledger-entry/route.ts`
exists** — there is **no `[name]/route.ts`** (confirmed by file listing). The page renders, its
data fetch 404s.

**Fix:** create `app/api/stock/stock-ledger-entry/[name]/route.ts` →
`export const GET = createGetHandler("Stock Ledger Entry");`. SLE is read-only/system-generated
— GET only, no POST/PUT/DELETE.

**Acceptance:** open a real SLE from the ledger list; the detail page loads the entry.

---

### R5 [P1] — Customer → Sales Order prefill *(F5a)*

**Diagnosis (verified):** `app/sales/sales-order/new/page.tsx:135` reads only
`searchParams.get("quotation")`. The Customer-360 link correctly sends `?customer=…` (and
Quotation's wizard reads it at `app/sales/quotation/new/page.tsx:125`) but the SO wizard
ignores it.

**Fix:** the SO wizard must also read `?customer=` and prefill+lock the customer (mirror the
Quotation wizard's `customerId` path). This is the **prefill contract** of master §12.5 — a
param a link emits that the target ignores is a silent half-fix.

---

### R6 [P1] — Billing/shipping address dropdown 404 *(F5b)*

**Diagnosis (verified):** the address-options query filters Address by
`["Address Linked Document","link_name","=", <party>]`. **"Address Linked Document" is not a
real ERPNext doctype** — Address links through the **`Dynamic Link`** child table
(`link_doctype`, `link_name`). The malformed filter makes the list route error → 404. Affects
the address select on Quotation / Sales Order / Delivery Note.

**Fix:** query addresses for a party using the correct ERPNext relation — filter on the
`Dynamic Link` child (`link_doctype = "Customer"`, `link_name = <party>`), or use ERPNext's
standard linked-address query. Verify the dropdown loads options for a customer that has an
address.

---

### R7 [P1] — Notification detail + redirect *(F7)*

**Diagnosis:** clicking a notification only marks it read; no detail panel, no redirect. The
panel/detail code was added in 2J but is **not reached** — either notifications are emitted
**without** `detail`/`actions`, so the click has nothing to show and falls through to
mark-read, or the click handler never routes to the detail view.

**Fix:** (a) when notifications are **emitted**, populate `detail` (human explanation) and
`actions` (at least one deep-link `href`); (b) clicking an item with `detail`/`actions` opens
the detail view with a working **redirect** action and a Back button. Verify with a real
emitted notification end-to-end — click it, see detail, click the action, land on the target.

---

### R8 [P1] — Item Price / Price List unreachable

**Diagnosis:** the Phase 2J pages exist (`app/stock/settings/item-price/*`,
`app/accounting/settings/price-list/*`) but are in **no sidebar / settings nav**, so the owner
could not find or test them.

**Fix:** add nav entries so both masters are reachable (Stock settings → Item Price; Accounting
settings → Price List). Confirm you can navigate to each list, open `new`, create one, and open
its detail — report what you saw. (Masters stay **standalone** — no FlowRail, per guardrail.)

---

## Part 2 — Two core UX features *(new build — specs are canonical in the master doc)*

Both features are now specified in **`docs/v4/ARCHITECTURE_V4_PART2_UX_REVOLUTION.md`** — build
to that spec, not to this summary. Reuse existing hooks/components; **no new abstraction
layers** (Reporting Contract rule 2).

### Feature A — Inline Quick-Add (master §11)

Create-in-context modal so a wizard never forces the user to leave to create a dependency.
- `<QuickAddField>` wraps `FormFrappeSelect`; dropdown footer/empty-state shows
  **`＋ Create new <Doctype>`**.
- `<QuickAddModal>` — Radix Dialog overlay (**no route change**); minimal create form from
  `lib/flows/quick-add-registry.ts`; POSTs via the **existing** create handler; resolves
  `{ name }` back to the field; invalidates the select query.
- **Reuses `*CreateSchema`** — so R1 is a prerequisite (a quick-add must not hit the same false
  400). Coverage: Customer, Supplier, Item, Contact, Address, Lead, Warehouse, UOM, Item Group.
- Must compose nested (Address from inside Customer). ESC/backdrop → resolve `null`, field
  unchanged.

### Feature B — Universal Cross-Flow Actions (master §12)

Generalize Customer-360 "Quick Actions" to **every** transactional doctype.
- A **UI surface over existing libs** — `AUTO_FILL_REGISTRY` (field copy + lock) and
  `resolveFlowChain` (chain + existing-record detection). **Not a new flow engine.**
- Two surfaces, one data source: the FlowRail ribbon **and** a detail-sidebar "Actions" menu,
  each listing valid forward/backward adjacent docs.
- **Existing-record short-circuit (headline):** before offering **Create**, check the back-link
  via `resolveFlowChain` — if an adjacent record exists, show **"View <name>"** (redirect),
  never a duplicate-create.
- Prefill via `buildCreateUrl(...)`; every target wizard must **read its param** (the R5 SO bug
  is this contract half-wired — fix it universally).
- New `FLOW_ADJACENCY` map (forward + backward targets per doctype) derived from Lead-to-Cash +
  Procure-to-Pay. **Only ERPNext-real edges** — no invented edges (Reporting Contract rule 4).
  Standalone doctypes (Stock Reconciliation, Stock Ledger, masters) have no adjacency.

---

## Part 3 — FlowRail: DO NOT TOUCH (Brain-owned)

Per master **§13**, the FlowRail **visual layer is off-limits to the mesh this phase.** The
owner is redesigning it hands-on. You may only **consume FlowRail's logic props**
(`createHref`, existing-record "View" links from Feature B). Do **not** restyle, replace, or
refactor the component's markup/CSS. Touching it is an architectural reject (Reporting Contract
rule 4).

---

## Part 4 — Tests (vitest count MUST increase)

Static gates are necessary, not sufficient — but the right tests would have caught 2J. Add:

1. **Schema-payload guard (the big one):** for each transactional wizard, a test that builds the
   **exact payload the wizard submits** and asserts `CreateSchema.safeParse(payload).success ===
   true`. This is the regression net for R1 — it fails loudly if a create schema drifts stricter
   than its wizard. Cover at minimum PO, SR, PE, SO, SI, Quotation, DN.
2. **Validation-error surfacing (R2):** feed `extractFrappeMessage` / the resolver an
   `ApiErrorResponse` with `details: { title: ["Required"] }` and assert the output **names the
   field**, not the generic string.
3. **SLE detail route (R4):** assert the `[name]` route module exists and its `GET` is defined
   (import it; don't assert a literal).
4. **Address link query (R6):** unit-test the address-options query builder asserts it filters
   on `Dynamic Link` / `link_doctype` + `link_name`, never `"Address Linked Document"`.
5. **Quick-Add + Cross-Flow (Features A/B):** RTL tests that **render the real component** —
   QuickAdd opens the modal and returns a name to the field; Cross-Flow renders "View" (not
   "Create") when an adjacent record exists. Assert on rendered output, not simulated lookups
   (Reporting Contract rule 6).

---

## Commit plan

1. `fix(v4/phase-2k): R1-R8 live-test re-fixes` (schemas, error surfacing, SLE route, SO param,
   address query, notifications, nav)
2. `feat(v4/phase-2k): inline Quick-Add (master §11)`
3. `feat(v4/phase-2k): universal cross-flow actions (master §12)`
4. `test(v4/phase-2k): schema-payload guards + feature RTL tests`

---

## Live retest checklist (run the dev server — report what you SEE)

1. New **Purchase Order** → fill supplier + 1 item → submit → **lands on PO detail** (R1).
2. New **Stock Reconciliation** → 1 item + warehouse → submit → **lands on SR detail** (R1).
3. **Payment Entry** from a Customer → submit succeeds, or dialog **names the missing field**
   (R2/R3).
4. Submit any wizard with a required field blank → dialog **names the field**, not "unexpected
   error" (R2).
5. **Customer → Sales Order** quick action → SO wizard opens with **customer prefilled + locked**
   (R5).
6. On Quotation/SO, open the **billing address** dropdown → **options load** (R6).
7. **Stock Ledger** list → open an entry → **detail page loads** (R4).
8. Trigger a notification → click it → **detail + working redirect** (R7).
9. **Item Price** and **Price List** reachable from nav → create one of each (R8).
10. A wizard with an empty link field → **`＋ Create new`** → modal → create → returns to wizard
    **with the new value filled, prior input intact** (Feature A).
11. On a Sales Order with an existing Sales Invoice → cross-flow shows **"View SI-…"** (redirect),
    **not** Create; on one without → shows **Create** (Feature B).

If something is not done, **say so** in KNOWN GAPS. An honest "PE still fails, dialog says
`paid_to: Required`, I could not resolve the default account" is worth more than a false
"✅ PE works." **Re-read `docs/v4/MESH_REPORTING_CONTRACT.md` before writing your report.**
