# Obsidian ERP v4.0 — Phase 2c Handoff (P0 Wizard UX + Error Architecture + Flow Rail Redesign + Buying)

> **For:** Coding agent
> **Status:** Phase 2b (Accounting) is functionally **approved** — the SO→DN→SI→Payment wizards work, persistence is real, the A1 gate is fixed at the template root, and `742cad2` cleared the JE/border findings. **But manual testing found P0 presentation failures that block sign-off.** This document fixes them at the golden-template level, adds a reusable server-error architecture, redesigns the Flow Rail, then builds Buying.
> **Order of work:** Part A (P0 wizard UX) → Part B (error architecture) → Part C (Flow Rail) → Part D (Buying). **Do not build Buying until A–C are merged and re-verified on the golden template.**
> **Date:** 2026-06-04 · **Branch:** continue on the 2b branch or cut `feat/v4-phase-2c-buying`.

> **Standing acceptance criteria (memorize — these recur every phase):** no raw/technical error text in the UI; no `bg-black`/`text-white`/invented black borders; wizards full-width with real padding; copy teaches the user; surfaces are elevation-first with hairline `border-border/40` only. The functionality bar is being met; **the presentation bar is what keeps failing.**

---

## PART A — P0 Wizard UX remediation (fix the golden template first)

### A1 — BLOCKER: kill the unprofessional error dump

**Root cause.** `components/flows/FlowWizard.tsx:192-210` renders a red panel listing **raw field keys** the instant a step is invalid — which is *on mount*, before the user types anything:

```tsx
// CURRENT — remove this entire block.
{currentValidation && !currentValidation.valid && (
  <motion.div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
    <p>Please fix the following errors:</p>
    <ul className="list-disc pl-4 text-xs text-destructive/80">
      {Object.entries(currentValidation.errors).map(([field, message]) => (
        <li key={field}><span>{field}:</span> {message}</li>   // "items.0.item_code: ..."
      ))}
    </ul>
  </motion.div>
)}
```

**Required UX (enterprise standard):**
1. **Errors are inline, per-field, and only after intent.** Each field renders its own error beneath it (red `border-destructive` + `text-destructive` message via RHF `FormMessage`) — shown only once the field is **touched** OR the user has **attempted Next**. Never on pristine mount, never as a global key dump.
2. **Add a `triedNext` gate in FlowWizard.** Clicking Next/Submit while invalid sets `triedNext = true`, then: (a) reveal inline errors for the current step, (b) **scroll to + focus the first invalid field**. Reset `triedNext` on step change.
3. **Optional neutral hint only** — beside the Next button you may show one calm line in `text-muted-foreground` (NOT destructive): "Complete the required fields to continue." No field keys, no red panel.
4. **Step indicator** may show a small destructive dot on a step only after `triedNext` for that step.
5. If a human-readable summary is ever needed, map field paths → labels (`items.0.item_code` → "Item code (row 1)"). But prefer inline-only.

The Next button stays disabled until valid (already correct). The point is: **the user is guided silently by inline cues, not scolded by a technical list.**

**Files:** `components/flows/FlowWizard.tsx` (the fix) + confirm every `renderStep` field uses `FormMessage`/`FieldWrap` so inline errors actually render. Golden template (`app/sales/sales-order/new`) is the proof page.

### A2 — Wizards must fill the container with real padding

**Symptom:** "wizard doesn't take full container space; this section has 0 padding."
**Fix:**
- The page wrapper currently caps the wizard at `max-w-3xl` inside `InfoCard`. **Remove the narrow cap** — let the wizard use the content column (`max-w-5xl` or full, matching the detail pages' grid width).
- Guarantee internal padding: the wizard step content wrapper gets `p-6 sm:p-8`; the item table and any sub-section get their own `p-4`+ — no edge-to-edge zero-padding sections.
- Two-column field grids on `md+` (`grid md:grid-cols-2 gap-5`), single column on mobile.

### A3 — Surfaces: remove black borders, apply the elevation-first system

**Symptom (3rd time):** "outer containers have black borders, UI is awful."
**Fix — one surface system across all wizard chrome:**
| Element | Recipe |
|---|---|
| Wizard card (outer) | `bg-card shadow-sm rounded-2xl` — **no border** |
| Step content section | `bg-card` / `bg-card/40` + padding; group rows with `divide-y divide-border/40`, not boxes |
| Item table | `rounded-xl bg-card/40` + row dividers `divide-border/40`; header `bg-muted/30` — no hard outer border |
| Nav separator | `border-t border-border/40` hairline (not `border-border`) |
Hard stops: no `border-black`, no default-weight `border-border` on dark surfaces, no nested bordered boxes. Verify both themes.

### A4 — Copy that teaches

Every step: a clear `StepHeading` title + one plain-language sentence on what the user is doing and why ("Pick the customer and delivery date — we'll pull pricing from their price list."). Field labels are nouns a non-accountant understands; add `helperText` where a field is non-obvious (e.g., "Posting date — when stock leaves your warehouse"). The Review step is a clean, scannable summary (label/value pairs grouped by section), not a raw object.

**A done-check (all wizards):** open a fresh create wizard → **no red error panel appears**; click Next on an empty step → inline errors appear under the empty fields and the first one is focused; the card is full-width, padded, borderless-but-elevated; copy explains each step.

---

## PART B — NEW ARCHITECTURE: Server-Error Guided Resolution (log it; reuse forever)

**Problem.** Frappe rejects business-rule violations (HTTP 417 / `ValidationError`) with technical strings flashed as raw toasts, e.g.:
> *"1.0 units of Item P-001: Raw Paper needed in Warehouse Stores - P to complete this transaction."*
The user is then left to navigate to the data point and fix it manually. That is not enterprise UX, and these errors will multiply across every future phase. **This needs a reusable pattern, designed once and logged.**

### B.1 Design
A small resolver layer that turns a raw Frappe error into a **typed, human, actionable** resolution — surfaced in a dialog/inline panel, never a raw toast.

```
lib/errors/frappe-error-resolver.ts
  type ResolutionAction = { label: string; kind: "navigate"|"prefill"|"mutate"|"dismiss"; run: () => void | Promise<void> };
  type Resolution = {
    code: string;                 // e.g. "INSUFFICIENT_STOCK"
    title: string;                // "Not enough stock to deliver"
    explanation: string;          // plain language, no Frappe jargon
    details?: string[];           // structured specifics (item, qty short, warehouse)
    severity: "warning"|"error";
    actions: ResolutionAction[];  // guided next steps
  };
  resolveFrappeError(err: unknown, ctx: { doctype: string; values?: unknown }): Resolution
```

`resolveFrappeError` matches the error against an ordered list of **strategies** (regex/exception-type signatures). Ship these to start:

| Code | Signature | Guided resolution (actions) |
|---|---|---|
| `INSUFFICIENT_STOCK` | "units of … needed in Warehouse … to complete" | Explain the shortfall (item, qty short, warehouse). Actions: **Create Material Request** for the shortfall (prefill the wizard with item+qty+warehouse); **Change warehouse**; **Reduce quantity**; Dismiss. |
| `MANDATORY_MISSING` | "is mandatory" / "Mandatory fields required" | Name the field in plain language; action: **Go to field** (focus it in the wizard). |
| `LINK_VALIDATION` | "Could not find" / "<X> not found" | Explain the missing link; action: **Create <X>** (if module built) or **Pick another**. |
| `DUPLICATE` | "Duplicate" / "already exists" | Offer **Open existing** vs **Change identifier**. |
| `GENERIC_FALLBACK` | anything else | Clean error card: friendly title + the raw message in a `<details>` "Technical details" disclosure (collapsed). Still no bare toast. |

### B.2 Surface
- `components/errors/GuidedErrorDialog.tsx` — a Radix dialog (glass panel, elevation, semantic tokens) rendering a `Resolution`: icon by severity, title, explanation, `details` list, and the action buttons. One primary action, rest secondary/ghost. Dismiss closes.
- Wire it through the mutation layer: `useFrappe{Create,Update}` `onError` calls `resolveFrappeError` and opens the dialog instead of `toast.error(raw)`. A thin `useGuidedError()` hook can own the open/Resolution state so any page opts in with two lines.
- For the stock case specifically, the **Create Material Request** action deep-links to the MR wizard prefilled (`?item=&qty=&warehouse=`) so the user resolves the shortfall in-flow, then returns.

### B.3 Logging requirement (do not skip)
Add **`docs/v4/DECISIONS.md` → B5: Server-Error Guided Resolution** documenting the resolver contract, the strategy table, and the rule: *no raw Frappe error may reach the user as a toast; all errors pass through `resolveFrappeError`.* Every future phase adds strategies as it meets new error classes. Add a unit test per strategy (signature → expected `code`/actions).

**Done-check:** trigger the insufficient-stock 417 on a Delivery Note submit → a guided dialog explains the shortfall and offers "Create Material Request" (prefilled), not a raw toast. Unknown errors show the clean fallback card with collapsed technical details.

---

## PART C — Flow Rail premium redesign (concrete spec — build to this)

The current `FlowRail` is a flat list of glyph+label+"View" and reads as "awful." Also fix a bug: the `canCreate` "Create" affordance (`FlowRail.tsx:123-127`) is computed but **never rendered** — dead code. Rebuild to the spec below.

### C.1 Target look — "Journey Rail" card
A single elevated card (no border) titled with a thin progress header, then a vertical timeline where one continuous spine runs *through* the nodes (not disconnected stubs), filled primary for completed progress and fading to `border/40` for the rest. Each stage is a generously-spaced row: node · (label + status eyebrow + doc id/meta) · one trailing action. The current stage row gets a subtle tinted background and a pulsing ringed node.

```
┌─────────────────────────────────────────────────────────┐
│  Order Journey                         4 of 7 complete   │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░  (thin progress bar)      │
│                                                          │
│   ●  Quotation                 Completed      View →     │
│   │   SAL-QTN-2026-0012 · 5d ago                         │
│   ●  Sales Order               Completed      View →     │
│   │   SAL-ORD-2026-0007 · 3d ago                         │
│  (◉) Delivery Note             In progress               │  ← current row: bg-primary/[0.04], ring node, pulse
│   │   MAT-DN-2026-0002 · you are here                    │
│   ○  Sales Invoice             Up next      Create →     │  ← next buildable: primary-tinted action
│   ┆   Not created yet                                    │
│   ○  Payment                   Pending                   │
│   ┆                                                      │
│   ⦸  (blocked example)         Blocked      Why?         │
└─────────────────────────────────────────────────────────┘
```

### C.2 Exact spec
- **Container:** `bg-card shadow-sm rounded-2xl p-6`, no border. Header row: title `text-sm font-semibold`, right-aligned `text-xs text-muted-foreground` "N of M complete". Under it a 1.5px progress bar: track `bg-muted`, fill `bg-primary` width = completed/total, `rounded-full`, animate width on mount (`MOTION.normal`).
- **Spine:** one continuous vertical line at the node centerline (`left` aligned to node center), drawn behind nodes. Completed segment `bg-primary/40`, remainder `bg-border/40`. Use a relative container with an absolute spine, not per-gap stubs.
- **Node sizes:** 32px (`h-8 w-8`) rounded-full. completed = `bg-primary text-primary-foreground` check; current = `ring-2 ring-primary/40 bg-primary/10` clock with the existing scale pulse; pending = `bg-muted text-muted-foreground/40` dot; skipped = same muted + `SkipForward`, row `opacity-60`; blocked = `bg-destructive/10 text-destructive` ban.
- **Row:** `py-3 gap-3`, label `text-sm font-medium` (current `font-semibold`), a status **eyebrow** above or beside it (`text-[10px] uppercase tracking-wider text-muted-foreground` — "Completed"/"In progress"/"Up next"/"Pending"/"Blocked"), and a mono meta sub-line (`text-[11px] text-muted-foreground`) with doc id + relative time, or "you are here" for current, "Not created yet" for pending.
- **Current row emphasis:** wrap the current row in `rounded-xl bg-primary/[0.04] -mx-2 px-2`.
- **Action slot (exactly one, right-aligned):**
  - completed + `documentUrl` → ghost "View →" link.
  - the **next buildable** stage (first pending stage whose `isModuleBuilt(doctype)` is true and whose upstream is satisfied) → a primary-tinted button "Create →" that deep-links to that wizard with the upstream id prefilled. **Render this — it's the dead-code bug.** Gate strictly by `isModuleBuilt`; never offer create on the current/own stage.
  - blocked → a muted "Why?" that reveals the block reason (use the Part B explanation style).
  - otherwise → nothing.
- **Motion:** stagger rows in on mount (`staggerChildren: 0.05`, item `y:8→0`), respect `useReducedMotion`. Spine fill + progress bar animate width once.
- **States:** keep skeleton (content-shaped, already good), error, empty — restyle to the borderless card.
- **Mobile:** stays vertical (do **not** switch to the old cramped horizontal scroll). Full width, same spine.
- **JE/standalone docs:** a single-stage rail is fine; if a doc has no chain, render a compact "Standalone document" state instead of an empty rail.

**Done-check:** the rail reads as a premium timeline (progress header, continuous spine, status eyebrows, one clear action per row), the "Create" action actually renders for the next buildable stage and deep-links prefilled, and it looks right in both themes at 1440px and 375px.

---

## PART D — Phase 2c scope: Buying

Build on the **fixed** template (post A–C). Doctypes:

| Doctype | Notes / spec |
|---|---|
| **Purchase Order** | Approval workflow (Draft → Pending Approval → Approved → Submitted) per status machine; **auto-repeat** (recurring PO) per Workflow spec. Add to `BUILT_MODULES`. |
| **Request for Quotation (RFQ)** | New doctype: multi-supplier RFQ from Material Request; supplier table. |
| **Supplier Quotation** | New doctype: from RFQ; compare/select to feed PO. Auto-fill RFQ→Supplier Quotation→PO via `AUTO_FILL_REGISTRY`. |

For each: schema-first (Zod + `DocTypeConfigV4`), `WIZARD_STEP_SCHEMAS` real step gates, status machine (legal+illegal transitions tested), factory routes with `allowedFields`, `AUTO_FILL_REGISTRY` entries, **B3 idempotency** on creates-from-upstream and on auto-repeat (a repeat run must not double-create), and the **Part B resolver** on every mutation. End-to-end target: **Material Request → RFQ → Supplier Quotation → Purchase Order**.

---

## PART E — Definition of Done & process

**This is one pass.** Finish A–C and re-verify the SO golden template before opening any Buying doctype.

**Automated (show outputs in your report):**
- `tsc --noEmit` 0 errors; no `@ts-nocheck`/`any` in touched files.
- `vitest run` green, **plus**: a test that the wizard shows **no** errors on pristine state and surfaces them after a Next attempt; a test per Part B resolver strategy.
- Greps empty on touched files: `(text|bg|border)-(blue|amber|emerald|purple|indigo|teal|orange|rose|red|green)-[0-9]`, `bg-black`, `text-white`, `bg-white`, `rounded-\[`, `shadow-2xl`, `Please fix the following errors`.
- Factory-only: no `frappe-client`/`axios` in pages.

**Manual (live Frappe v15 + ERPNext — attach proof):**
- [ ] Fresh create wizard: **no red error panel on load**; Next on empty step → inline field errors + first field focused.
- [ ] Wizard is full-width, padded, elevation-only (no black borders), copy explains each step — both themes, 375px + 1440px.
- [ ] Insufficient-stock submit → **guided dialog** (Create Material Request prefilled), not a raw toast; unknown error → clean fallback card.
- [ ] Flow Rail matches the Part C spec; "Create →" renders for the next buildable stage and deep-links prefilled; no self-create; no 404.
- [ ] Buying end-to-end: MR → RFQ → Supplier Quotation → PO; approval workflow transitions; auto-repeat creates exactly one PO per cycle (double-run = one doc).

**Report** the grep/test outputs + screenshots of: a wizard with inline errors, the guided-error dialog, the redesigned Flow Rail, and the Buying end-to-end. We review by re-running.

---

## PART F — Security carry-forward (still gating Phase 3)
`lib/auth/resolve-user.ts` is a dev stub; `createScopedFrappeClient` throws. Per-user RBAC (B1) must land before the AI phase. Do not start Phase 3 without it.
