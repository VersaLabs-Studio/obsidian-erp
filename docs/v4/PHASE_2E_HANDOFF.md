# Obsidian ERP v4.0 — Phase 2e Handoff (SO→WO Wiring + Flow/Rail UX + Carry-Over Fixes)

> **For:** Coding agent
> **Status:** Phase 2d (Manufacturing + error-wiring completion) is **APPROVE-WITH-FIXES.** Manual dev testing confirmed A3 (Review step) and A4-for-SO-create landed, and the guided error dialog is liked. But four 2d gaps are confirmed broken, plus two UI surfaces need a hands-on redesign. This phase closes them — **no new doctypes**, it finishes and polishes what 2d shipped half-wired.
> **Order:** Part A (confirmed P0 gaps) → Part B (Flow/Rail UX redesign) → Part C (DoD tightening — apply to your own verification). Re-verify each item with a **user-reachable click-path**, not a helper unit test.
> **Date:** 2026-06-04 · **Branch:** continue on `feat/v4-phase-2a-sales-stock` (note: 2b–2d all stacked here; keep going or cut `feat/v4-phase-2e-flow-ux`).

> **Standing acceptance criteria (every phase):** no raw/technical error text in the UI; no `bg-black`/`text-white`/invented hard or black borders; wizards full-width + padded; copy teaches; elevation-first surfaces, hairline `border-border/40` only; **every mutation routes errors through `resolveFrappeError`**; **every multi-create automation is idempotent (B3)**; **every feature must be reachable and provable from the UI, not only from a unit test.**

---

## PART A — Confirmed P0 gaps from the 2d manual test

### A1 — BLOCKER (headline): wire Sales Order → Work Order. It is currently a dead stub.

This is the feature Phase 2d was named for, and it does nothing.

```tsx
// app/sales/sales-order/[name]/page.tsx:158-164  — CURRENT (broken)
isSubmitted && {
  label: "Create Work Order(s)",
  description: "Phase 2 — production automation",
  onClick: () => {},                       // ← no-op
  disabled: !isModuleBuilt("Work Order"),  // ← now FALSE, so it's enabled but does nothing
  disabledReason: "Coming in Phase 2",     // ← stale copy
},
```

Everything needed already exists and is unused: `AUTO_FILL_REGISTRY["Sales Order->Work Order"]` (`lib/flows/flow-auto-fill.ts:70`), `bom`/`workOrderStepSchemas`, and the idempotency trio `buildIdempotencyKey` / `getAutomationGuard` / `guardDuplicateCreation` (`lib/flows/idempotency.ts`). **They are tested in isolation but never called from the app.** Wire them:

**Behaviour.** From a *submitted* SO, "Create Work Order(s)" creates **one Work Order per SO line that has a BOM / is manufacturable**, each linked via `sales_order`, qty = SO line qty (apply UOM round-up). Show a small confirm step listing what will be created ("3 Work Orders will be created for SO-0001") before firing — do not silently bulk-mutate.

**Idempotency (B3 — the whole point of the test).** Key the run with `buildIdempotencyKey("Sales Order", soName, "create_work_orders")` and guard with `guardDuplicateCreation` (config from `getAutomationGuard`). Re-running the action, or a double-click, must **not** create duplicates — it detects the existing Work Orders (by the `sales_order` link) and no-ops with a "Work Orders already created" message. After creation, the WhatsNext action flips to "View Work Orders".

**Errors.** Route every mutation through `resolveFrappeError` (BOM-not-found, insufficient raw material, over-production all throw here).

**Done-check (user-reachable):** submit an SO with 2+ lines → click "Create Work Order(s)" → confirm → exactly N Work Orders exist, each linked to the SO, visible in the SO's FlowRail as completed. Click the action **again** → zero new Work Orders, a clear "already created" message. Remove all "Coming in Phase 2" copy.

### A2 — BLOCKER: finish the field "light up" (only half of A2 shipped in 2d)
The red hint landed (`FlowWizard.tsx:237` is `text-destructive` ✓), but the per-field lighting was **not** built. `FieldWrap` still has no error channel:

```tsx
// app/sales/sales-order/new/page.tsx:601  — CURRENT (no error prop)
function FieldWrap({ auto, loading, children }: { auto?: boolean; loading?: boolean; children: React.ReactNode }) { ... }
```

Give `FieldWrap` an `error?: string` prop. When present (only after `triedNext` for the step): render the wrapped control with a destructive ring/border (`aria-invalid` + `border-destructive` via a class passed to the input, or a wrapper ring) **and** a `text-destructive text-xs mt-1` message beneath it. Wire from the page: `error={triedNextSteps.has(stepIndex) ? validationResults[stepId]?.errors[fieldName] : undefined}`. Replicate across **every** create/edit wizard (SO, DN, SE, MR, SI, PE, PI, JE, PO, RFQ, SQ, BOM, WO).

**Done-check:** click Next on an empty step → red hint (✓ already) **and** every empty required field shows a red border + inline message, focus on the first.

### A3 — BLOCKER: the resolver was re-broken in the new Manufacturing pages
A1-of-2d wired the resolver across the 11 established modules but the **two new** detail pages 2d itself shipped still raw-toast — the exact pattern A1 was meant to kill, reintroduced the same phase:

```
app/manufacturing/bom/[name]/page.tsx:109         toast.error("Submit failed", { description: e.message })
app/manufacturing/bom/[name]/page.tsx:124,127     toast.error("Delete failed")
app/manufacturing/work-order/[name]/page.tsx:156  toast.error("Submit failed", …)
app/manufacturing/work-order/[name]/page.tsx:222  toast.error("Cancel failed", …)
app/manufacturing/work-order/[name]/page.tsx:237,240  toast.error("Delete failed")
```

Wire `useGuidedError` + `resolveFrappeError` into every mutation `onError` on both pages (submit, cancel, delete), render `<GuidedErrorDialog>` once near root — same pattern as `delivery-note/[name]`.

**Done-check:** `git grep -nE "toast\.error\(\"(Submit|Delete|Cancel) failed" -- app` → **empty**.

### A4 — finish full-width: 5 create wizards + 2 edit wizards are still capped
SO *create* was uncapped in 2d (✓ confirmed), but the rest still wear a `max-w` cage:

```
app/buying/purchase-order/new/page.tsx:303          <InfoCard className="max-w-5xl">
app/buying/request-for-quotation/new/page.tsx:285   <InfoCard className="max-w-5xl">
app/buying/supplier-quotation/new/page.tsx:279      <InfoCard className="max-w-5xl">
app/accounting/journal-entry/new/page.tsx:152       <InfoCard className="max-w-4xl">
app/accounting/purchase-invoice/new/page.tsx:210    <InfoCard className="max-w-3xl">
app/sales/sales-order/[name]/edit/page.tsx:187      <InfoCard className="max-w-3xl">
app/stock/delivery-note/[name]/edit/page.tsx:214    <InfoCard className="max-w-3xl">
```

Remove the cap on all seven so they fill the content column like SO create. **Done-check:** open Purchase Order create + Journal Entry create at 1440px → full width.

### A5 — guided error: right doctype ✓, but the data does NOT prefill
The "Create Material Request" action is liked and routes to the correct doctype, but the prefill is broken end-to-end:

1. **MR `new` ignores the params.** `resolveFrappeError` navigates to `/stock/material-request/new?item=…&qty=…&warehouse=…` (`frappe-error-resolver.ts:71-78`), but `app/stock/material-request/new/page.tsx` has **no `useSearchParams`** — it never reads them, so the form opens blank. Add a param read on mount that seeds the MR: a first item row with `item_code` + `qty`, and the warehouse into `set_from_warehouse` (the field already exists at `:48`).
2. **`item` is code+name fused.** The resolver captures `"FG-BCARD-STD: Standard Business Cards"`, which is not a valid Item link. Split on the first `": "` → pass `item_code` (the part before the colon) for the link field; keep the name only for display. Update the parser in `frappe-error-resolver.ts:47-55` and the param it emits (`item_code=…&item_name=…`).
3. **Qty semantics.** Emit the **shortfall** as `qty` (the dialog already frames it as "Short by: N"); make sure the number passed is the short-by amount, not the total required, so the MR asks for the right quantity.

**Done-check (user-reachable):** trigger insufficient-stock on a Delivery Note submit → "Create Material Request" → MR opens with the item row, qty, and warehouse **already filled**, item link valid.

---

## PART B — Flow/Rail UX redesign (hands-on spec)

Two surfaces the user has now rejected on look-and-feel. Treat these specs as the design; build to them.

### B1 — Detail-page right rail (WhatsNext + ActivityTimeline): kill the hard border, breathe

Root cause: both use `rounded-xl border bg-card p-4` — the bare `border` (no opacity/color) reads as a hard/black line in both themes, and `p-4` is cramped.

Apply to `components/smart/WhatsNext.tsx:58-61` and `components/smart/ActivityTimeline.tsx:88,107,121`:
- **Surface:** elevation-first — `bg-card rounded-2xl shadow-sm shadow-black/5 p-6` (or `p-5` minimum). **No bare `border`** — if a hairline is wanted, `border border-border/40` only. The loading and empty states must match (the empty state's `border-dashed` is fine but bump to `border-border/40 rounded-2xl p-8`).
- **WhatsNext header:** give the title row more room (`mb-4`), and each action button real vertical padding so the label + description don't crowd (`h-auto py-3`). Keep the standard `<Button>` variants (already correct). The primary action should read as the hero — it's the one thing the user does next.
- **Activity:** the `Activity` heading + items already use semantic tokens (good) — just inherit the new surface + padding and increase row spacing to `space-y-5`.
- **Section grouping:** if WhatsNext, FlowRail, and Activity stack in the same column, give them consistent `gap-4`/`gap-6` rhythm and identical corner radius so the rail reads as one designed system, not three different cards.

**Done-check:** the right rail shows no hard/black border in either theme, has generous padding, and the three panels share one visual language.

### B2 — FlowRail → **horizontal, compact, user-friendly** (replaces the tall 8-row list)

The current `FlowRail.tsx` is a vertical spine with one full row per stage — at 8 stages (Lead → Opportunity → Quotation → Sales Order → Work Order → Delivery → Invoice → Payment) it's a long, heavy column. Redesign it as a **single horizontal band**: a stepper, not a list.

**Layout (one `bg-card rounded-2xl shadow-sm p-5`, no hard border):**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  Order Journey                                                  4 of 8 complete  │
│                                                                                  │
│   ✓ ──── ✓ ──── ✓ ──── ◉ ╌╌╌╌ ○ ╌╌╌╌ ○ ╌╌╌╌ ○ ╌╌╌╌ ○                            │
│  Lead   Opp.   Quote   SO     WO     Deliv  Inv.   Pay                            │
│                        ▲                                                          │
│                     you are here                                                 │
│                                                                                  │
│   Up next: Work Order                                        [ Create → ]        │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Spec:**
- **Header row:** title left, `{completed} of {total} complete` right (keep). Optionally a 1.5px progress bar can stay, but it's now somewhat redundant with the filled connectors — keep it thin or drop it.
- **The band:** a horizontal flex row of nodes joined by connector segments. Each segment is **filled `bg-primary`** when the stage before it is completed, **`bg-border/40` dashed/solid** otherwise (animate the fill left-to-right on mount with `useReducedMotion` guard).
- **Node (compact, ~28–32px):** reuse the existing `StageNode` status glyphs (completed = primary check, current = pulsing ring+clock, pending = muted circle, blocked = destructive, skipped = muted skip). Label beneath in `text-[11px] font-medium`, truncate long names. Current node gets `font-semibold text-foreground` + a subtle `you are here` caption; others `text-muted-foreground`.
- **One surfaced action, not eight.** Don't put a Create/View link on every node. Instead, **below the band**, surface a single contextual line: the **next buildable** stage as `Up next: <Stage>` with one primary `Create →` button (gated by `isModuleBuilt`, same logic as today's `nextBuildableIndex`). Completed nodes are **clickable** (whole node is a link to `documentUrl`) and show the doc name + relative time in a small popover/tooltip on hover/focus — keeps the band compact while preserving "click to view".
- **Responsive:** on narrow widths, `overflow-x-auto` with horizontal scroll-snap on nodes; the band never wraps to multiple rows. Nodes keep a `min-w` so labels stay legible.
- **Accessibility:** each node is a `button`/`a` with an accessible label (`"Sales Order — in progress"`); current node `aria-current="step"`. Connectors are decorative (`aria-hidden`).
- **Motion:** stagger the nodes in (`MOTION.normal`, `staggerChildren: 0.05`); animate connector fill; respect `useReducedMotion`.

Keep the loading/error/empty states, but reflow them horizontally (skeleton = a row of 5–8 circle skeletons joined by line skeletons).

**Done-check:** the journey reads as one compact horizontal stepper that fits above the fold, the current stage is obvious, completed stages are clickable, and exactly one "Up next → Create" action is surfaced. No hard/black border; both themes.

---

## PART C — Definition of Done (tightened — apply to your own report)

This is the **third** consecutive phase where static gates were green while a headline feature (SO→WO) or a P0 carry-over (field lighting, manufacturing error wiring, MR prefill) was missing or half-wired. The failure mode is consistent: **a unit test is written against a pure helper, not against the user-reachable feature.** Fix the process, not just the bugs:

1. **Every claimed fix needs a user-reachable proof, not a helper test.** For each A-item and B-item, attach a screenshot or short GIF of the actual click-path (e.g., the two-click SO→WO creation + the re-click showing no duplicate; the empty-step red borders; the prefilled MR form). A passing `*.test.ts` that imports a helper is **not** acceptable proof that the feature works.
2. **Tests must exercise the feature path.** The SO→WO idempotency test must drive the *actual* create-work-orders action (mock the mutation, call the handler twice, assert one effect) — not just `buildIdempotencyKey` string equality. A resolver test must assert the emitted **navigation URL + params** for insufficient-stock, not just that a code matches.
3. **No "Coming in Phase X" copy may ship for a module that is in `BUILT_MODULES`.** If it's built, it's wired; if it's not wired, it's not built. Grep your diff for stale "Coming in" / "Phase 2" strings before reporting.
4. **DoD claims are per-file, not per-module.** "A4 — caps removed" must mean *every* wizard, verified by the grep in this doc returning empty — not "the one page I tested."

**Automated (show outputs):**
- `tsc --noEmit` 0 errors; no `@ts-nocheck`/`any` in touched files.
- `vitest run` green, including the **feature-path** tests from C.2 above.
- Greps empty on touched files: `toast\.error\(\"(Submit|Delete|Cancel) failed`, `max-w-(3xl|4xl|5xl)` in transactional `new`/`edit` wizards, `Coming in Phase`, `bg-black`, `text-white`, `rounded-\[`, `shadow-2xl`, `Please fix the following`.

**Manual (live Frappe — attach proof per item):**
- [ ] SO (2+ lines) → Create Work Order(s) → confirm → N WOs created & linked; re-click → no duplicates (proves A1 + B3)
- [ ] Next on empty step → red hint **and** red field borders + inline messages (proves A2)
- [ ] BOM / Work Order submit error → guided dialog, not raw toast (proves A3)
- [ ] Purchase Order + Journal Entry create are full width at 1440px (proves A4)
- [ ] Insufficient-stock → Create Material Request → MR opens **prefilled** (item/qty/warehouse), valid item link (proves A5)
- [ ] Detail right rail: no hard/black border, generous padding, unified look (proves B1)
- [ ] FlowRail is a compact horizontal stepper; current stage obvious; completed clickable; one Up-next action (proves B2)

---

## PART D — Tracked debt (do NOT fold in ad hoc)
The **non-transactional** pages remain off-palette/heavy and untouched since 2a: module landings (`accounting/page.tsx`, `crm/page.tsx`, `sales/dashboard`), `setup/*`, `settings/*`, masters (`buying/supplier`, `stock/item`), and the setup `new` pages with `bg-rose-600 … text-white font-black` buttons. These are real, but they are a **dedicated "non-transactional UI normalization" pass (Phase 2f)** — do not expand 2e scope into them. Just keep the list accurate.

## PART E — Security carry-forward (gates Phase 3)
`lib/auth/resolve-user.ts` is still a dev stub; `createScopedFrappeClient` throws. Per-user RBAC (B1) must land before the AI phase. Do not start Phase 3 without it.
