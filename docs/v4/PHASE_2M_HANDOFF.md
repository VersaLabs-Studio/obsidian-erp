# Phase 2M — Stabilize the Wire-In + Globalize Cross-Flow Prefill

> **Branch:** `feat/v4-phase-2m-stabilize-crossflow` (cut off `develop` after the 2L merge)
> **Base:** `develop` @ the 2L merge commit
> **Reporting:** Read `docs/v4/MESH_REPORTING_CONTRACT.md` FIRST and LAST. Every claim is audited
> against the working tree. Static gates (tsc + vitest) are your responsibility and are necessary
> but NOT sufficient — 2L shipped green static gates while both flagship features crashed at runtime.
>
> **Who runs the dev server:** Kidus runs the dev server and performs the live click-through retest
> **manually himself** — you (the mesh) do NOT start a dev server and must NOT claim live results you
> did not produce. **Your obligation instead: ALWAYS end your final report with a complete, ordered
> MANUAL LIVE-RETEST CHECKLIST** — numbered steps, exact routes/URLs, the action to take, and the
> expected result + the specific failure string to watch for — so Kidus can execute it directly. This
> is a STANDING requirement for every handoff from now on (see Reporting Contract). The 12-step
> checklist at the bottom of this doc is the template; keep it current with whatever you actually
> changed.

---

## 0. Why this phase exists (context for the builder)

Phase 2L wired Quick-Add, Cross-Flow, and Item-Price auto-rate across the app. Static gates were
green (tsc 0, vitest 163/163) **but the live retest found the two flagship features crash with
"Maximum update depth exceeded" the moment they're used.** Per the project's gating policy
(large units, fold-forward, only security/corruption/build-red hard-block), 2L was **co-signed and
merged** — these are severe-but-contained runtime bugs, not hard-blocks — and the fixes roll
forward here as the FIRST priority.

**Phase 2M is one large unit with a strict internal order:** Part 0 (the render-loop fixes) MUST
land and be live-verified before Parts 1-4, because every downstream item depends on Quick-Add /
auto-rate actually mounting without crashing.

This phase carries the full live-retest verdict. The 12-step checklist at the bottom is the
acceptance gate.

---

## PART 0 — CRITICAL: kill the two render loops (do this FIRST)

### 0A. QuickAddModal infinite loop — *opening any Quick-Add crashes*

**Symptom (live):** open the Customer/party_name/item_code dropdown footer "＋ Create new …" in
SO / Quotation / SR / DN → `Maximum update depth exceeded` originating at
`QuickAddModal.tsx` (DialogContent → QuickAddModal in the stack).

**Root cause:** `components/quick-add/QuickAddModal.tsx`
- Line 78-80: `defaultValues` is rebuilt via `Object.fromEntries(entry.fields.map(...))` on **every
  render** → new object reference every time.
- Line 88-92: the reset effect lists `defaultValues` (and `seed`) in its dependency array, and its
  body calls `reset(...)`. While `open === true`: render → new `defaultValues` ref → effect fires →
  `reset()` mutates form state → re-render → new `defaultValues` ref → effect fires → **infinite**.

**Fix (mesh):**
1. Memoize `defaultValues` with `useMemo` keyed on a *stable* signal — the field-name list, not the
   array identity. e.g. `useMemo(() => Object.fromEntries(entry.fields.map(f => [f.name, ""])),
   [entry.fields])` — and if `entry.fields` itself is re-created per render upstream, key on
   `entry.doctype` instead (the field set is static per doctype in the registry).
2. Stabilize `seed`: callers pass `quickAddSeed` object literals; either memoize at the call site or,
   simpler and self-contained, serialize for the dep — depend on `JSON.stringify(seed)` (seeds are
   tiny flat string maps) rather than the object identity.
3. Reset only on the **false→true open transition**, not on every render. Track the previous `open`
   with a ref, or gate: `useEffect(() => { if (open) reset(merged); }, [open])` with `merged`
   memoized per (2). The effect body may reference `reset`/`merged` without listing the unstable
   ones — that is the intended RHF pattern.

**Acceptance:** open Quick-Add in every wired wizard → modal opens, no console error, form is empty
(or seeded), submit creates + writes the name back, host wizard state intact.

### 0B. QuickAddField — Rules-of-Hooks violation (`useCallback` inside a render prop)

**Root cause:** `components/quick-add/QuickAddField.tsx:121` calls `useCallback` **inside the
`FormField` `render={({ field }) => { … }}` callback** (the Controller render prop). Hooks must not
be called inside a render prop — it's an unstable hook site and a latent contributor to the loop /
dev double-invoke instability.

**Fix (mesh):** remove the `useCallback`. The success handler does not need memoization — define it
as a plain inline `const handleQuickAddSuccess = (result) => { … }` inside the render prop (a new
function ref per render is harmless here; `QuickAddModal` does not put `onSuccess` in an unstable
effect dep after 0A). Do **not** lift hooks into the render prop. Verify no other hook is called
inside any `render={…}` callback in this file.

### 0C. ItemRateAutoFill infinite loop — *auto-rate writes then re-writes forever*

**Symptom (live):** `Maximum update depth exceeded` at `lib/flows/item-price-lookup.ts:247`
(`setValue(...)` inside the effect), surfaced from SO row mounts. Note: SO auto-rate *did* fill the
rate (feature works) — but the same effect then loops.

**Root cause:** `lib/flows/item-price-lookup.ts:240-248`
- The effect writes `setValue(ratePath, rate, { shouldDirty: true })` with **no value-equality
  guard** — so once it writes, the resulting re-render re-evaluates the effect and writes again.
- `formCtx` (from `useFormContext`) and the `setValue` derivation are in the dep array; combined with
  `shouldDirty` re-renders this re-fires.

**Fix (mesh) — the idempotency guard is the definitive break:**
```ts
useEffect(() => {
  if (rate === undefined || !setValue) return;
  const current = Number(getValues(ratePath)) || 0;   // read current via a stable getter
  if (!overwrite && current > 0) return;
  if (current === rate) return;                        // ← STOP: value already correct, do not write
  setValue(ratePath as any, rate as any, { shouldDirty: true });
}, [rate, ratePath, setValue, overwrite]);             // ← drop formCtx from the deps
```
- Pull `getValues` from the same resolved source as `setValue` (the prop or `formCtx`) **once**,
  outside the effect, so it isn't an unstable dep. Reference it inside the effect without listing it.
- The `current === rate` guard makes the effect idempotent: after the first correct write it no-ops,
  so no further re-render is triggered. This is robust regardless of upstream reference churn.

**Acceptance:** select a priced item in SO/Quotation/SI/DN (selling) and PO (buying) → rate fills
once, no loop, no console error; typing over the rate sticks; changing the price list re-prices.

### 0D. After 0A-0C — full Quick-Add + auto-rate live sweep

With the loops fixed, the following 2L items the retest reported "doesn't work" should now work
(they were all collateral of the crashes). **Verify each live, don't assume:**
- Quotation `party_name` Quick-Add, Quotation per-row `item_code` Quick-Add
- SO per-row `item_code` Quick-Add, SO `customer` Quick-Add
- SR per-row `item_code` + `warehouse` Quick-Add
- DN `customer` + per-row `item_code` Quick-Add

---

## PART 1 — Globalize cross-flow PREFILL + bidirectional linked-doc display

The retest: *"no autofill in SO to SI flow for customer and other fields"*, *"in SI to PE flow the
paid amount is not prefilled → Difference Amount must be zero"*, and *"I wanted to reroute to SO
from this SI and no info exists whatsoever … make sure this feature is globalized where linked docs
are clearly stated in the cross-flow."*

### 1A. SO → SI prefill is silently dropped

**Root cause:** `app/accounting/sales-invoice/new/page.tsx:116-117` reads only `delivery_note` and
`customer` search params and has a DN→SI prefill effect (153-185). It does **not** read
`sales_order`, so the cross-flow / WhatsNext `?sales_order=…` href is ignored — no customer, no
items.

**Fix:** add a `sales_order` param read + a prefill effect mirroring the DN→SI one, using
`getAutoFillMapping("Sales Order", "Sales Invoice")` (verify the mapping exists in the autofill
registry; if absent, add it — header: customer, currency, selling_price_list; items:
item_code/qty/rate/uom/warehouse). `useFrappeDoc("Sales Order", salesOrderId)` gated on the param.
Toast "Loaded from Sales Order …".

### 1B. SI → PE leaves `paid_amount` unset → "Difference Amount must be zero"

**Root cause:** `app/accounting/payment-entry/new/page.tsx:159-197`. The prefill builds a reference
row with `allocated_amount = outstanding` and sets `references:[ref]`, but the `reset({...})` at
178-184 **never sets `paid_amount`** (it stays the default `0`, line 129). Frappe then computes
`difference_amount = paid_amount(0) − allocated(X) ≠ 0` → rejects.

**Fix:**
- In the same `reset`, set `paid_amount: ref.allocated_amount` (the `received_amount` sync effect at
  200-202 will mirror it for ETB).
- Surface the difference **in the UI** so the user is never blind to it: render a read-only
  "Difference" indicator on the allocation step = `paid_amount − Σ allocated_amount`, styled
  success when 0, warning otherwise. The retest explicitly asked: *"no indication of a difference …
  let's make sure it's always prefilled with SI flow."*

### 1C. Bidirectional linked-doc display in CrossFlowActionsMenu

Today the menu shows forward edges (SO→DN→SI→PE) and, after 2L's 1C, resolves existing forward
docs. The retest wants the **backward** direction surfaced too: from an SI, clearly show the Sales
Order it came from ("View SAL-ORD-…"), globally, for every doctype with a known source edge.

**Fix:** for each detail doc, in addition to forward adjacencies, resolve and render its **source
links** — read the back-link fields already modeled in `lib/flows/flow-adjacency.ts` in reverse
(e.g. SI has `items[].sales_order` / `items[].delivery_note`; PE has `references[].reference_name`).
Render a distinct "Created from" group above/below the forward "Up next" group so linked docs are
clearly stated in both directions. Keep it data-driven from the adjacency table — no per-page
hardcoding. Standalone doctypes (no edges) still early-return null.

---

## PART 2 — Buying-side auto-rate + Frappe info-message mis-surfaced as error (PO)

### 2A. PO buying auto-rate does not fill

**Symptom:** *"tested auto fill on PO create, it doesn't work, rate is entered manually."* The loop
fix (0C) addresses the crash; this is a *no-match* bug.

**Investigate + fix:** confirm the PO call site passes the **buying** header values to
`ItemRateAutoFill` — `priceList` must be the PO header's `buying_price_list` (not a selling list or
empty) and `currency` the PO currency, with `side="buying"`. If the header field is named
differently or empty at mount, the `buildItemPriceFilters` query returns nothing → no fill. Verify
against a real buying Item Price (the retest had one: "RM-CARD-A4 … Standard Buying"). Report the
exact header field used.

### 2B. "Item Price added for RM-CARD-A4 in Price List Standard Buying" shown as a rejection

**Symptom:** PO create surfaced *"The server rejected this action … Item Price added for RM-CARD-A4
in Price List Standard Buying."* That string is an ERPNext **info `msgprint`** (a green-indicator
server message emitted when a buying rate differs and auto-create/update Item Price is enabled) —
**not** an error. The `frappe-error-resolver` is catching the `_server_messages` payload and routing
a successful/info message into the GuidedErrorDialog as a hard failure, which also masked whatever
real reason the PO create failed.

**Fix:** in `lib/errors/frappe-error-resolver.ts`, do not treat green/info `_server_messages`
(indicator `green`/`blue`, or `raise_exception` falsy) as errors — only red/`raise_exception` true
messages are failures. Info messages should pass through (optionally as a toast), never as a
GuidedErrorDialog rejection. Then re-test PO create end-to-end and confirm whether a *real* error
remains underneath (if so, fix it — likely the warehouse/date propagation from 2L Part 3; verify
P0-A/P0-B actually took).

---

## PART 3 — Fold-forward P1/P2 polish

| # | Item | Where | Fix |
|---|------|-------|-----|
| 3A | **PE detail missing Edit affordance** | `app/accounting/payment-entry/[name]/page.tsx` | PE is the ONLY transactional detail page lacking the Edit button that all 10 siblings have (SO/SI/Quotation/DN/SE/SR/PI/PR/Lead/Opp). Add the golden Edit affordance, **draft-only** (`docstatus === 0`), linking to `/accounting/payment-entry/${name}/edit`. Keep Cancel-for-submitted; **no hard delete** of a posted payment (financial immutability — correct). This answers the user's "is it deliberate?": no — it's an inconsistency; the *absence of delete on a submitted PE* is correct, the *absence of Edit on a draft PE* is the bug. |
| 3B | **DN rows missing ItemRateAutoFill** | `app/stock/delivery-note/new/page.tsx` | Mount `<ItemRateAutoFill side="selling" …/>` per item row, same pattern as SO/SI. Retest: *"NO itemrateautofill on DN item add list."* |
| 3C | **Notification action buttons — ugly + double Dismiss** | `components/notifications/notifications-panel.tsx` + the guided-error/notification action renderer | (1) Remove the black borders — restyle action buttons to the premium token system (use `Button` variants, not raw bordered elements; rounded, theme-aware, dark-mode legible). (2) There are **two Dismiss buttons** rendered — de-dupe to one. Load the `premium-ui` standard; no hardcoded black. |
| 3D | **Loading skeletons for the smart sidebar mounts** | `WhatsNext`, `CrossFlowActionsMenu` (FlowRail already has one) | Each must render a skeleton while its `useFrappeList`/`useFrappeDoc` is in flight, matching FlowRail's `FlowRailSkeleton` style (`SkeletonLine`, same card chrome). Retest: *"same goes for the what's next and cross flow mounts they need loading skeletons."* |

---

## PART 4 — Complete the wiring (after Part 0 proves the pattern)

### 4A. Quick-Add on the remaining wizards (2L Known Gap #1)
Apply the **same** `FormFrappeSelect → QuickAddField` swap (one import + tag swap per master field)
to the wizard `new/page.tsx` files NOT done in 2L:
**BOM, Work Order, RFQ, Supplier Quotation, Purchase Invoice, Purchase Receipt, Opportunity, Lead,
Customer, Supplier.** Mechanical; the pattern is asserted in `tests/phase-2l.test.ts`. Only wire
doctypes present in `QUICK_ADD_REGISTRY`; leave others as plain selects (the field no-ops the footer
when unsupported, but prefer not swapping where there's nothing to add).

### 4B. Fully wire Payment Entry (retest: "let's fully wire PE as well")
- Quick-Add on the PE `party` field (Customer/Supplier per `party_type`).
- Cross-flow prefill (1B) + bidirectional links (1C) confirmed on PE.
- Edit affordance (3A).

---

## PART 5 — FlowRail redesign — **BRAIN-OWNED. DO NOT IMPLEMENT IN THE MESH.**

> Per the standing rule, FlowRail's visual layer (`components/flows/FlowRail.tsx` and any
> FlowRail-rendering markup) is **owned by the Brain harness**. The mesh must **not** edit it.
> This section is the committed design (Pillar 5: Documentation First); the Brain executes it as a
> focused hands-on turn. Mesh: treat FlowRail as untouchable, exactly as in 2L's guardrails.

**User mandate (verbatim intent):** "one last chance to design it properly, make it functional,
easy to use, display a loading skeleton, clickable actions, show each flow with more data and info
on what it's displaying. If it's still hideous I have no choice but to discard it."

**Current state** (`components/flows/FlowRail.tsx`): single horizontal ribbon of 32px node circles,
progress ring, animated connectors, one "Up next → Create" action. It already has a skeleton and
reduced-motion support, but: nodes carry no per-stage data (just an icon + truncated label), only
completed nodes are clickable, and there's a single surfaced action.

**Redesign requirements (Brain to implement):**
1. **Every stage node is interactive & informative** — each node shows: stage label, status, and
   when resolved the **doc name + key fact** (date/amount/qty as available). Completed → links to the
   doc; the next-buildable pending → inline "Create" affordance on the node itself, not only the
   footer; blocked → tooltip explaining why.
2. **Richer "what it's displaying"** — a one-line flow descriptor ("Sell flow · Quotation → Sales
   Order → Delivery → Invoice → Payment") and per-stage micro-context, so a new user understands the
   pipeline without prior knowledge.
3. **Clickable actions throughout**, not one terminal CTA — view any completed stage, create the
   next, jump to blocked-reason help.
4. **Premium skeleton** consistent with the WhatsNext/CrossFlow skeletons from 3D (shared visual
   language across all three sidebar mounts).
5. **Easy to use at 375px and in dark mode**, reduced-motion safe (keep the existing guards).
6. Functional data: keep using `flow-chain-resolver` / adjacency; no schema work — purely the
   presentation + interaction layer.

---

## PART 6 — Tests

- **Render-loop regressions (highest value):** a test that mounts `QuickAddModal` with `open=true`
  and asserts it renders without exceeding React's update depth (render once, assert no repeated
  `reset`/commit); a test for `ItemRateAutoFill` asserting `setValue` is called **at most once** for
  a stable `rate` (idempotency guard). These are the guards that would have caught 2L's crash.
- SO→SI prefill: given `?sales_order=X`, customer + items populate.
- SI→PE prefill: given `?sales_invoice=X`, `paid_amount === Σ allocated_amount` and difference === 0.
- Error resolver: a green/info `_server_messages` payload resolves to **non-error** (toast/pass),
  a red one resolves to a GuidedErrorDialog resolution.
- PE detail: Edit affordance present when `docstatus===0`, absent when submitted.
- Quick-Add wiring assertions for the Part 4A wizards (extend the 2L pattern test).
- Keep `--pool=forks` for the run (Windows thread-pool worker-timeout flake otherwise).

---

## PART 7 — NEW UNIT: Item-360 + Supplier-360 (the large-feature half)

> This is the new module/unit for the phase (per the sizing policy: a large progressive feature
> rides alongside the fold-forward fixes). User-picked. Master spec: §4.1 Item (Master Module
> Extension) and §5.1 Supplier. **Golden pattern to clone:** the existing Customer-360 at
> `app/crm/customer/[name]/page.tsx` (1,479 lines) — tabbed detail, KPI StatCards, outstanding
> rollup, per-relationship `useFrappeList` blocks, Quick Actions `InfoCard`. Item (379 lines) and
> Supplier (330 lines) detail pages are thin; bring both to the Customer-360 standard. **Standalone
> masters — no FlowRail / no flow-chain / no auto-fill edges** (same guardrail as Stock
> Reconciliation). Low overlap with Parts 0-4; land it as its own commit(s).

### 7A. Item-360 (`app/stock/item/[name]/page.tsx`) — master spec §4.1
Bring to the Customer-360 tabbed standard. Tabs + data (all read-only via `useFrappeList`, scoped to
`item_code`):
- **Overview** — Item Information InfoCard (code, name, group, stock_uom, type switches,
  valuation_method, default_warehouse/BOM) + a KPI StatCard row.
- **Prices** — all `Item Price` rows for this item across price lists (the §4.1 "Item Price tab";
  reuses the Item Price master just built — link each row to its price-list detail).
- **Stock Levels** — qty per warehouse from Frappe `Bin` (mirror the Stock Balance read already in
  `lib/kpi/compute-stock-kpis.ts`).
- **BOMs** — linked `BOM` where `item = this`.
- **Transactions** — recent `Sales Order Item` / `Purchase Order Item` / `Delivery Note Item`
  involving this item (child-table filter; reuse the 4-tuple pattern from 2L 1C).
- **Activity** — reuse `ActivityTimeline`.
- **KPIs (detail header StatCards):** on-hand qty, valuation value, # price lists, # open
  transactions. **List-page KPIs (§4.1):** Total Items / Stock Items / Service Items / Low Stock⚠ /
  New This Month.
- **Quick Actions InfoCard:** Create Item Price, Create BOM, Adjust Stock (→ Stock Reconciliation).
- "Export" button may be a disabled "Phase 3" affordance (don't fake it) — match how other
  not-yet-built actions are stubbed in the codebase.

### 7B. Supplier-360 (`app/buying/supplier/[name]/page.tsx`) — master spec §5.1, 360 per §2.2 mirror
Master spec lists Supplier as "UX Overhaul," but the user chose the **360** treatment — mirror
Customer-360 for the **buying** side:
- **Overview** — Supplier Information (name, group, type, country, default_currency, payment_terms) +
  KPI StatCards.
- **Purchases** — linked `Purchase Order` + `Purchase Receipt` for this supplier.
- **Invoices** — linked `Purchase Invoice`, with **total outstanding payable** rollup (mirror the
  Customer outstanding-receivable reduce at `customer/[name]:532`).
- **Payments** — linked `Payment Entry` (party_type=Supplier).
- **Addresses / Contacts** — via Dynamic Link (same pattern Customer uses; reuse the 2K address
  Dynamic-Link fix — do NOT reintroduce the fake "Address Linked Document" doctype).
- **Activity** — `ActivityTimeline`.
- **Quick Actions InfoCard:** Create Purchase Order, Create Purchase Invoice, Record Payment
  (→ Payment Entry, party_type=Supplier, prefilled — reuse the Part 1 cross-flow prefill).
- **List-page KPIs:** Total Suppliers / Active This Month / Top Supplier by Spend / Total Payable.

### 7C. Consistency requirements (both)
- Premium-UI: OKLCH tokens only, `StatusBadge`, the B1 sidebar chrome
  (`bg-card rounded-2xl shadow-sm shadow-black/5 border-border/40`), no black borders, no `@ts-nocheck`.
- Loading: `SkeletonDetail` while the doc loads; each tab's list shows a skeleton while its
  `useFrappeList` is in flight (same standard as Part 3D).
- Dual-theme + 375px + reduced-motion clean.
- Wire Quick-Add (Part 4A) on the Supplier/Item **new** wizards too, so this dovetails with the
  wiring-completion work.

---

## Acceptance gate — MANUAL live-retest checklist (Kidus runs this himself)

> You (the mesh) do NOT run these — **reproduce this list verbatim in your final report** (updated
> for whatever you actually changed) so Kidus can click through it on his own dev server. Each step =
> route + action + expected result + the failure string to watch for.

1. **Quick-Add opens without crashing** in SO, Quotation, SR, DN (Part 0A/0B) — modal opens, create
   writes back, host state intact, **zero console errors**.
2. **Auto-rate fills once, no loop** — SO/Quotation/SI/DN (selling) **and PO (buying, Part 2A)**;
   typing over sticks; price-list change re-prices.
3. **PO create succeeds** — buying Item Price info message no longer shown as a rejection (Part 2B);
   header warehouse + date-only PO submits (2L P0-A/P0-B verified).
4. **SO → SI** via cross-flow → customer + items prefilled (Part 1A).
5. **SI → PE** via cross-flow → `paid_amount` prefilled, **Difference = 0**, difference indicator
   visible (Part 1B).
6. **SI shows "Created from → Sales Order"** and PE shows its source SI (Part 1C bidirectional).
7. **PE draft has an Edit button**; submitted PE shows Cancel only (Part 3A).
8. **DN rows auto-fill rate** (Part 3B).
9. **Notification actions** — premium styling, no black borders, **single** Dismiss (Part 3C).
10. **WhatsNext + CrossFlow show skeletons** while loading (Part 3D).
11. **Remaining wizards** (BOM/WO/RFQ/SQ/PI/PR/Opp/Lead/Customer/Supplier) expose Quick-Add (Part 4A).
12. **Dual-theme + 375px + reduced-motion** regression on every touched surface (P4).
13. **Item-360** (`/stock/item/<code>`) — tabs (Overview/Prices/Stock Levels/BOMs/Transactions/
    Activity) all render with real linked data + skeletons; KPI StatCards populate; Quick Actions
    navigate (Part 7A).
14. **Supplier-360** (`/buying/supplier/<name>`) — tabs (Overview/Purchases/Invoices/Payments/
    Addresses/Contacts/Activity) render; **Total Payable** rollup correct; Record Payment prefills a
    Supplier Payment Entry (Part 7B).

> FlowRail (Part 5) is **excluded** from the mesh acceptance — it is the Brain's deliverable and
> will be verified separately.

---

## Roll-forward / honesty ledger
- 2L co-signed green: tsc 0, vitest 163/163 (`--pool=forks`). Merged as a unit; these fixes are the
  fold-forward.
- If any Part 0 fix cannot be made without a deeper refactor of `useFrappeList` query-key stability,
  STOP and report — do not paper over a loop with `eslint-disable`.
- Report file:line + before→after for every item, per the Reporting Contract. Do NOT run a dev
  server or claim live results — end the report with the manual live-retest checklist for Kidus.
