# Obsidian ERP v4.0 — Phase 2f Handoff
# P0 Flow/Resolver Fixes + FlowRail Redesign + CRM Head (Lead → Opportunity)

> **Product:** Obsidian ERP
> **Company:** VersaLabs Studio
> **Document Version:** 4.0.0
> **Last Updated:** 2026-06-05
> **Audience:** Coding Agent (OpenCode mesh)
> **Depends On:** ARCHITECTURE_V4_PART2_UX_REVOLUTION §2 (SmartForm Wizard Engine), §6 (Flow Tracker), §8 (Golden Template); BUSINESS_WORKFLOW_PART1 §3 (Lead), §4 (Opportunity & Quotation), §6 (Procurement); BUSINESS_WORKFLOW_PART2_MODULE_SPECS (Lead/Opportunity field specs); DECISIONS.md (B3 idempotency, B5 error resolution)
> **Status of 2e:** APPROVE-WITH-FIXES — SO create flow, A2 field-lighting, A4 full-width, A5 MR prefill, and B1 right rail are **approved**. B1 is now the **golden template for all detail-page sidebar panels.** This phase fixes the P0 regressions found in manual testing, redesigns the FlowRail (rejected again), and opens the CRM head of Lead-to-Cash.

---

## 0. How to read this document

Three parts, in order:
- **Part A — P0 fixes** (must land first; re-verify each on a live Frappe dev server with a click-path, not a unit test).
- **Part B — FlowRail redesign** (hands-on design spec; build exactly to it).
- **Part C — New phase: CRM head** (Lead + Opportunity, on the fixed golden template).

**Standing acceptance criteria (every phase):** no raw/technical error text in the UI; no `bg-black`/`text-white`/invented hard or black borders; wizards full-width + padded; copy teaches; elevation-first surfaces, hairline `border-border/40` only; **every mutation routes errors through `resolveFrappeError` AND renders a `GuidedErrorDialog`**; **every resolver action is functional or a dismiss — no decorative no-ops, and every action conforms to the documented business workflow**; **every wizard step gates Next**; **every feature is provable from the UI, not only from a unit test.**

---

## PART A — P0 fixes (confirmed broken in 2e manual testing)

### A1 — BLOCKER: Work Order creation has no front-end error handler; the POST fails silently
**Symptom (user-confirmed):** clicking "Create Work Order(s)" on a submitted SO fires the POST, the request fails (terminal shows a **404**), and **nothing surfaces in the UI** — no dialog, no toast. The user only sees it in the terminal.

**Root cause #1 (the silent UI — fix first, it's certain).** `app/sales/sales-order/[name]/page.tsx` **imports** `GuidedErrorDialog` and calls `showError(resolveFrappeError(err, …))` in the WO `onError` (`:143`), but the component is **never rendered**. The page's JSX tail mounts three `<ConfirmDialog>`s and no `<GuidedErrorDialog>`, so the resolution state has nothing to display. Fix:

```tsx
// near the page root, alongside the ConfirmDialogs:
<GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
```

**Root cause #2 (the 404 itself — diagnose then fix).** A 404 on a Work Order create POST means the payload references something that doesn't resolve, or a mandatory link is missing. Instrument the failing request (log the final URL + body) and verify against `BUSINESS_WORKFLOW_PART1 §7` + the Work Order doctype: a Work Order requires a valid **`bom_no`** (default BOM for the `production_item`), **`company`**, **`fg_warehouse`**, **`wip_warehouse`**, and **`planned_start_date`**. The current payload (`:181-192`) sends `production_item`, `qty`, `fg_warehouse: item.warehouse || ""` (often **empty** — SO lines don't carry a warehouse), `sales_order`, and a cosmetic `idempotency_key` — but **no `bom_no`**. Resolve the default BOM per item before creating (or block with a guided message "No active BOM for {item} — create one first" routed through the resolver). Compare against the working Delivery Note create path, which uses the same factory client successfully.

**Audit (do not skip):** every detail/edit page that calls `showError` must also **render** `GuidedErrorDialog`. Grep: for each file matching `showError(` under `app/**`, confirm a `<GuidedErrorDialog` render exists in the same file. Fix every miss (this is the same class as A1 — 2e wired the call but not the render on SO).

**Done-check (click-path):** submit an SO whose items have an active BOM → Create Work Order(s) → confirm → WOs are created (or, if a BOM is missing, the **guided dialog** explains exactly that). No silent failure, ever. Re-click → "already created", no duplicates.

### A2 — BLOCKER: wizard "Next" does not gate on several non-SO wizards (Material Request confirmed)
**Symptom (user-confirmed):** the Material Request create wizard advances past step 1 with required fields empty. The red-border field-lighting that works on SO does **not** fire here.

**Root cause.** The schema (`materialRequestStepSchemas`, `flow-validation.ts:145`) and the reactive `useWatch` gate (`material-request/new:130-143`) are both present and correct — so the failure is the **step-id ↔ `validationResults`-key mismatch.** `FlowWizard` looks up `validationResults?.[currentStepData.id]` and **defaults `isCurrentStepValid` to `true` when the lookup misses** (`FlowWizard.tsx:142-144`). The page keys results as `step1`/`step2` (`material-request/new:139`); if that wizard's `steps` array uses different `id`s (e.g. `"type"`, `"items"`), every lookup misses and the gate silently passes. SO works only because its step ids are literally `step1/2/3`.

**Fix (systemic, not one page):**
1. Make every wizard's `steps[].id` **exactly match** the keys used in its `validationResults` object. Audit all wizards: SO, DN, SE, MR, SI, PE, PI, JE, PO, RFQ, SQ, BOM, WO.
2. Harden `FlowWizard`: when `validationResults` is provided but the current step's id is **missing** from it, treat the step as **invalid** (fail-closed), not valid — and `console.warn` the mismatch in dev so this can never silently regress again.
3. Confirm each step schema's required set matches the doctype's **true mandatory fields** per `BUSINESS_WORKFLOW_PART2_MODULE_SPECS` (don't mark auto-defaulted fields as the only "required" ones, or the gate feels like a no-op to the user).

**Done-check (click-path) + test:** clear step-1 required fields on **MR, RFQ, SQ, PO, JE, PI** → Next is blocked, hint is red, fields light up. Add one regression test **per wizard**: `validateWizardStep(doctype, "step1", {})` → `valid === false`, and a `FlowWizard` test asserting an unknown step id is treated invalid.

### A3 — BLOCKER: error resolver gives dead-ends and no-op CTAs; align every action to the workflow
Two confirmed problems:

**(a) "Cannot cancel because submitted Stock Entry MAT-STE-2026-00011 exists" falls through to GENERIC_FALLBACK** ("Something went wrong… Dismiss") — no guidance, no path. This is a core Frappe business rule (you must cancel downstream documents before upstream). Add a strategy:

```
code: "LINKED_DOC_EXISTS"
match: /cannot cancel because.*exists/i  ||  /linked with submitted/i  ||  /is linked with/i
resolve:
  - parse the linked doctype + name from the message (e.g. "Stock Entry" + "MAT-STE-2026-00011")
  - title: "Cancel the linked document first"
  - explanation: "This can't be cancelled while {Doctype} {name} is still submitted. Cancel {name} first, then return here."
  - actions:
      • { label: "Open {Doctype} {name}", kind: "navigate", variant: "default",
          run: → router to that doctype's detail route }   // REAL deep-link, route via the doctype→path map
      • { label: "Dismiss", kind: "dismiss", variant: "ghost" }
```

**(b) Remove every no-op / anti-workflow CTA. Audit all strategies** in `lib/errors/frappe-error-resolver.ts`; each `ResolutionAction.run` must do something real or be a plain dismiss:
- `INSUFFICIENT_STOCK`: **remove "Reduce quantity"** — it is a `run: () => {}` no-op and it contradicts the procure-to-fulfill workflow (`BUSINESS_WORKFLOW_PART1 §6/§11`: shortfalls are resolved by procurement/MR, not by silently shrinking demand). Keep "Create Material Request" (real, prefills) + "Dismiss".
- `MANDATORY_MISSING`: "Go to field" currently `() => {}` — either wire it to focus the named field on the originating page, or remove it; keep "Dismiss".
- `LINK_VALIDATION`: "Pick another" `() => {}` — remove (dismiss already covers it).
- `DUPLICATE`: "Open existing" `() => {}` — wire it to navigate to the existing record (parse the name), or remove; "Change entry"→dismiss is fine.

**Principle to log in DECISIONS.md (extend B5):** *every `ResolutionAction` is either (i) a functional `navigate`/`prefill`/`mutate` with a real `run`, or (ii) a `dismiss`. No decorative buttons. Every offered resolution must conform to the documented business workflow — never offer an action the workflow forbids.*

**Done-check (click-path):** trigger a cancel-with-linked-doc → guided dialog with a working "Open Stock Entry …" link. Inspect every resolver action → none is a silent no-op.

### A4 — minor: drop the cosmetic `idempotency_key` from the WO payload
`idempotency_key` (`sales-order/[name]:191`) is not a Work Order field; Frappe silently drops it. The real duplicate guard is the existing-WO check + `["Work Order"]` invalidation (verified working). Remove the dead field to avoid implying server-side idempotency that doesn't exist. (If true server-side idempotency is wanted later, that's a backend custom-field decision — out of scope here.)

---

## PART B — FlowRail redesign (the journey visualization). Build to this spec exactly.

**Why again:** the current FlowRail still reads as a tall, repetitive vertical list — it renders each stage's label **twice** (label + the `aria`/"you are here" caption leaking as visible text), stacks vertically, and feels neither premium nor engaging. Replace it with a **horizontal pipeline ribbon.** This is the single most-rejected surface in v4; treat the spec below as binding.

### B.1 Target design

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Procurement Flow                                                    ◔  3 / 7       │
│                                                                                    │
│      ✓━━━━━━━━✓━━━━━━━━●────────○────────○────────○────────○                        │
│   Material     RFQ    Supplier  Purchase Purchase Purchase  Payment                │
│   Request             Quotation  Order    Receipt  Invoice                         │
│                          ▲ Now                                                      │
│                                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────┐  │
│   │  Up next · Purchase Order                                       [ Create → ] │  │
│   └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Legend: `✓` completed (primary check) · `●` current (pulsing ring) · `○` pending (muted) · `━` filled pipe (`bg-primary`) · `─` empty pipe (`bg-border/40`).

### B.2 Component anatomy
- **Container:** one card — `bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40 p-5 sm:p-6`. Matches the B1 golden template. No bare/black border.
- **Header row** (`flex items-center justify-between mb-5`):
  - Left: flow name — `text-sm font-semibold text-foreground` (e.g. "Procurement Flow", "Lead-to-Cash Flow").
  - Right: a compact progress meter — a 20px conic/ring or a short 1.5px bar, plus `text-xs text-muted-foreground tabular-nums` "3 / 7".
- **The ribbon** (the hero) — a single horizontal track, `overflow-x-auto scroll-smooth snap-x`, inner `flex items-start min-w-max`:
  - **Stage unit** (`shrink-0`, centered column, `min-w-[84px] max-w-[112px]`):
    - **Node** (32px circle) with the status glyph. Reuse status semantics: completed = filled `bg-primary text-primary-foreground` check; current = `bg-primary/10 ring-2 ring-primary/40` clock/dot, **pulsing** (`scale [1,1.12,1]`, 2s loop, `useReducedMotion` guard); pending = `bg-muted` muted dot; blocked = `bg-destructive/10` ban; skipped = muted skip.
    - **Label BELOW the node** — `text-[11px] font-medium`, **one line**, `truncate`, centered. Current = `text-foreground font-semibold`; completed = `text-muted-foreground`; pending = `text-muted-foreground/60`. **Render the label exactly once.** Do **not** render the stage name a second time, and do **not** render the `aria-label`/"you are here" string as visible text.
    - **"Now" pill** above the current node only — a tiny `text-[9px] uppercase tracking-wider text-primary bg-primary/10 rounded-full px-1.5 py-0.5`. This — not repeated text — is how "you are here" is conveyed.
  - **Connector** between two stages — a rounded bar (`h-1 rounded-full flex-1 self-center`), filled `bg-primary` if the left stage is completed, else `bg-border/40`. Node + connector sit on one visual baseline so it reads as a continuous pipe. `aria-hidden` on connectors.
- **Action zone** (below the ribbon, `mt-5`): a slim bar `flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3`. Left: `Up next · {Stage}` (`text-xs`); right: **one** primary `Create →` button (the single next buildable stage, gated by `isModuleBuilt`). If the flow is complete, show a done state ("All stages complete ✓") instead. Never render more than one action.

### B.3 Interaction & states
- **Completed nodes are links** to `documentUrl` (the whole stage unit is clickable/focusable). On hover/focus, a small popover/tooltip shows the doc name + relative time + "View →". Keeps the ribbon clean while preserving navigation.
- **Pending/blocked nodes** are non-interactive (or show a tooltip "Available after {prev}").
- **Loading:** a row of 5–7 circle skeletons joined by bar skeletons (horizontal), header skeleton above. **Empty/standalone:** a friendly single-node state, not "No flow data available".
- **Responsive:** the ribbon scrolls horizontally on narrow screens (`overflow-x-auto`, nodes `shrink-0`, `snap-start`); the header and action bar stay full-width. Never wrap the ribbon to multiple rows.

### B.4 Motion (premium feel)
- On mount: connectors fill left→right (`animate width 0→100%`, `MOTION.normal`), nodes stagger-fade-in (`staggerChildren: 0.05`, `y: 8→0`). Current-node ring pulses continuously. All motion respects `useReducedMotion`.

### B.5 Accessibility
- Render as an ordered list: `<ol>` → `<li>` per stage. Current stage `aria-current="step"`. Each interactive node has a real `aria-label` (`"Sales Order — completed, view"`) **that is not also printed as visible text** (this is the current bug). Connectors `aria-hidden`. Keyboard: nodes are tab-stops only when interactive.

### B.6 Reference
This realizes `ARCHITECTURE_V4_PART2_UX_REVOLUTION §6 (Flow Tracker Component)` — a horizontal, glanceable pipeline, not a vertical changelog. Keep the existing flow-chain resolution logic (`resolveFlowChain`, `nextBuildableIndex`, `isModuleBuilt`); only the presentation changes.

**Done-check:** the journey is one compact horizontal pipeline that fits above the fold; current stage obvious via the "Now" pill + pulse (no repeated text); completed nodes navigate; exactly one "Up next → Create" action; premium motion; both themes; no hard/black border.

---

## PART C — New phase: CRM head (Lead → Opportunity)

Build the front door of Lead-to-Cash on the fixed golden template, completing the top of the sales FlowRail (currently shown as pending "Lead → Opportunity → Quotation → Sales Order"). Spec: `BUSINESS_WORKFLOW_PART1 §3 (Lead)`, `§4 (Opportunity & Quotation)`, field-level detail in `BUSINESS_WORKFLOW_PART2_MODULE_SPECS`.

| Doctype | Build | Key spec points |
|---|---|---|
| **Lead** | List (KPICard + StatusBadge), Create (`FlowWizard`, real step schema + gate), Detail (B1 sidebar golden template + redesigned FlowRail + WhatsNext), Edit | Status machine (Lead → Open → Replied → Opportunity → Converted/Do Not Contact). Source, contact, company/territory. Convert action → Opportunity. |
| **Opportunity** | List, Create (`FlowWizard`), Detail, Edit | From Lead (auto-fill Lead→Opportunity). Opportunity type (Sales), stage/probability, expected close, items of interest. Convert action → Quotation (already built). |

**Required wiring (follow the established patterns):**
- **`AUTO_FILL_REGISTRY`**: `Lead->Opportunity`, `Opportunity->Quotation` (the Quotation create already exists; just feed it).
- **`WIZARD_STEP_SCHEMAS`**: real, gating step schemas for Lead and Opportunity — and confirm the **A2 step-id alignment** for them from day one (no mismatch).
- **`BUILT_MODULES`**: add `Lead`, `Opportunity` so the FlowRail surfaces them as buildable/clickable and stops showing them as permanently pending.
- **FlowRail**: Lead and Opportunity now appear as the first two stages of the Lead-to-Cash ribbon, completed→clickable, with the single "Up next → Create" affordance.
- **Resolver + dialog**: every mutation routes through `resolveFrappeError` **and renders `GuidedErrorDialog`** (apply the A1 audit rule to the new pages from the start).
- **Convert flows** (Lead→Opportunity→Quotation): if these are multi-create or status-transition automations, make them **idempotent** per DECISIONS B3 (re-trigger = one effect), and prove it with a feature-path test.

---

## PART D — Definition of Done (tightened — this is now enforced, not advisory)

The last three phases passed static gates while a headline feature was missing or half-wired, because tests were written against pure helpers, not the user-reachable feature. **2e repeated this** (idempotency test still asserts only string equality; resolver test asserts `code` not the emitted MR URL/params). Close it now:

1. **Per-fix UI proof.** Every A/B/C item ships with a screenshot or short GIF of the actual click-path (e.g., WO create → guided dialog; MR empty step → blocked + red fields; cancel-linked → working "Open …" link; the new horizontal FlowRail). A passing `*.test.ts` importing a helper is **not** proof.
2. **Tests drive the feature path.** SO→WO: mock the mutation, invoke the actual create handler twice, assert one effect + that a missing-BOM produces a resolution. Resolver: assert the **emitted navigation URL + params** for `INSUFFICIENT_STOCK` and the parsed doctype/name for `LINKED_DOC_EXISTS`. Wizard gate: assert an unknown step id is treated **invalid**.
3. **No decorative no-ops.** Grep `run: () => {}` in `frappe-error-resolver.ts` → only allowed inside a `dismiss` action.
4. **Every `showError` has a rendered `GuidedErrorDialog`** in the same file.
5. **DoD claims are per-file, proven by the greps in this doc**, not "the one page I tested."

**Automated (show outputs):**
- `tsc --noEmit` 0; no `@ts-nocheck`/`any` in touched files.
- `vitest run` green, **including** the feature-path tests from D.2.
- Greps empty on touched files: `toast\.error\(\"(Submit|Delete|Cancel) failed`, `max-w-(3xl|4xl|5xl)` in transactional wizards, `Coming in Phase`, `bg-black`, `text-white`, `rounded-\[`, `shadow-2xl`, `Please fix the following`, and `run:\s*\(\)\s*=>\s*\{\}` outside dismiss actions.

**Manual (live Frappe — attach proof per item):**
- [ ] WO create → success or **guided dialog** (never silent); re-click → no duplicates (A1)
- [ ] MR/RFQ/SQ/PO/JE/PI empty step-1 → Next blocked, red hint + lit fields (A2)
- [ ] cancel-with-linked-doc → guided dialog with working "Open {Doctype} {name}" (A3a); no no-op CTAs anywhere (A3b)
- [ ] FlowRail is the horizontal pipeline per Part B; current stage obvious; completed clickable; one action; both themes (B2)
- [ ] Lead → Opportunity → (Quotation) create/list/detail render, persist, and appear in the FlowRail; convert flows idempotent (C)

---

## PART E — Process & git

- **Branch:** cut `feat/v4-phase-2f-crm-flowrail` from the current phase tip (`ce8b06e`).
- **Merge target — `develop`:** the user wants this work on `develop`. If `develop` does not exist yet, **create it from the current phase tip** (`ce8b06e`, which contains all of phase 0–2e) so `develop` carries the full history, then branch 2f from it. On completion, merge `feat/v4-phase-2f-crm-flowrail` into `develop` with `--no-ff`, and **push `develop` to origin.** Leave `main` as the stable line.
- **Branch-naming debt (flag, don't fix silently):** phases 2b–2e were all stacked on `feat/v4-phase-2a-sales-stock`. Going forward, one branch per phase off `develop`. Note this in the PR description.
- **PR:** open a PR into `develop` summarizing Part A proofs, the FlowRail before/after, and the CRM additions.

## PART F — Decisions to log (append to DECISIONS.md)
- **B5 extension:** every `ResolutionAction` is functional (`navigate`/`prefill`/`mutate`) or a `dismiss`; no decorative no-ops; every resolution conforms to the documented business workflow. Add `LINKED_DOC_EXISTS` as a known strategy. Every page that calls `showError` must render `GuidedErrorDialog`.
- **Wizard gate hardening:** `FlowWizard` fails **closed** when a step id is missing from `validationResults`; step ids must match the results keys (a structural invariant, dev-warned).

## PART G — Security carry-forward (gates Phase 3)
`lib/auth/resolve-user.ts` is still a dev stub; `createScopedFrappeClient` throws. Per-user RBAC (DECISIONS B1) must land before the AI phase. Do not start Phase 3 without it.
