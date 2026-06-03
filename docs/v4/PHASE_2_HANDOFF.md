# Obsidian ERP v4.0 — Phase 2 Handoff (Module Completeness)

> **For:** Coding agent
> **Prereq:** Phase 1.5 golden template merged & approved (branch `feat/v4-phase-0-foundation`, SO rebuild commit `a8e9944`).
> **Goal:** Bring every module to 100% by **replicating the locked Sales Order golden template** across ~65 doctypes / 9 modules.
> **Date:** 2026-06-03

---

## 0. The golden template is LOCKED — copy it, do not reinvent

The Sales Order module is the canonical reference. Every transactional doctype copies these four files' patterns **exactly**:

| Page | File | Pattern to copy |
|------|------|-----------------|
| List | `app/sales/sales-order/page.tsx` | KPI bar + SmartTable + inline status change |
| Create | `app/sales/sales-order/new/page.tsx` | `FlowWizard` (3-step, Zod gating via `validateWizardStep`) + `AUTO_FILL_REGISTRY` consumption |
| Edit | `app/sales/sales-order/[name]/edit/page.tsx` | `FlowWizard` edit mode, load via `useFrappeDoc`, persist via `useFrappeUpdate`, Draft-only guard |
| Detail | `app/sales/sales-order/[name]/page.tsx` | `FlowTracker` (real chain resolution) + `WhatsNext` + `ActivityTimeline` + status-machine actions |

**Non-negotiable rules carried from the template (these are the things the earlier attempts got wrong — do not repeat them):**
1. **Real wizard.** Create/edit MUST use `FlowWizard`. No single-page mega-forms.
2. **No `@ts-nocheck`, no `any`.** Type the form with a local interface; drive step validation via `validateWizardStep` (don't fight `zodResolver` over `z.array(z.unknown())`). The factory route's Zod is the server gate.
3. **Consume the registry.** Auto-fill from upstream uses `getAutoFillMapping`/`applyAutoFill`/`applyItemAutoFill` — never inline ad-hoc field mapping.
4. **Real persistence only.** Every action calls a real `useFrappe{Create,Update,Delete}` mutation; toasts fire on the **real** mutation result. Downstream automations not yet built are **disabled with a "Phase 2" tooltip** via `WhatsNext` `disabled`/`disabledReason` — NEVER a fake success toast.
5. **Real flow tracker.** Resolve the chain from actual linked documents (upstream link fields like `prevdoc_docname`; downstream via `useFrappeList` filtered on the header link field) and pass `stageStatuses` to `resolveFlowChain`. Completed stages must be clickable (`documentUrl`).
6. **Premium UI, OKLCH only.** Semantic tokens (`bg-card`, `border-border/50`, `text-primary`, `text-muted-foreground`). **No invented borders, no off-palette colors** (`text-blue-700`, `bg-amber-100`, raw hex). Glassmorphism per `premium-ui`. Framer Motion via the flow components (which already handle `useReducedMotion`). Dual theme + 375px.
7. **Factory pattern.** API routes are `createListHandler`/`createCreateHandler`/etc. with `allowedFields`. Data flows through `hooks/generic` — pages never call `frappe-client`/axios directly.

**Known cleanup to fold in:** the SO **list page** still has off-palette status colors (`text-blue-700` etc.); normalize list/detail status rendering to the shared `StatusBadge` component as you templatize the list pattern.

---

## 1. Pre-Phase-2 gates (must hold before each sub-phase)
- **B3 idempotency** (`docs/v4/DECISIONS.md`) implemented for any multi-create/cron automation a sub-phase introduces (SO→WO, SO→DN, etc.). Double-trigger = single effect.
- **B4 module specs**: re-read the relevant doctype in `BUSINESS_WORKFLOW_PART2_MODULE_SPECS.md` and resolve its listed gap (G1–G4) before building it.
- Load `architectural-dna`, `premium-ui`, `ui-auditor` before any UI work.

---

## 2. Sub-phases (each independently shippable; parallelizable after the template is locked)
- **2a — Sales/Stock fulfillment:** finish Stock Entry, Material Request; build Delivery Note (Driver/Vehicle, Gate Pass print). Wire SO→DN auto-fill + idempotency. End-to-end: SO → DN.
- **2b — Accounting suite:** Sales Invoice, Purchase Invoice, Payment Entry (outstanding auto-fetch, P1 §10.3), Journal Entry (balance validation). End-to-end: DN → Sales Invoice → Payment.
- **2c — Buying:** Purchase Order approval workflow + auto-repeat; RFQ + Supplier Quotation (new).
- **2d — Manufacturing:** BOM (Quality Inspection, scrap/loss, fixed-time op), Work Order UOM roundup; wire SO→WO with idempotency. End-to-end: SO → WO → Stock Entry(Manufacture).
- **2e — Masters & new:** Customer/Lead/Item/Project master upgrades; Product Bundle, Item Price, Tax/Terms masters, Quality Inspection.

Wire the full `AUTO_FILL_REGISTRY`, status machines, notification rules, cron tasks, cross-module validations, and KPI calcs (Workflow P3 §1–§9) as their doctypes land.

---

## 3. Per-doctype Definition of Done
**Automated:**
- [ ] `tsc --noEmit` clean; **zero `@ts-nocheck`** (`git grep @ts-nocheck` on the new files = empty); no `any`.
- [ ] `git grep -lI "FlowWizard"` includes the new create/edit pages; auto-fill registry consumed where an upstream exists.
- [ ] Off-palette grep clean on the new files: `git grep -nE "text-(blue|amber|emerald|purple|indigo|gray|red|green)-[0-9]|#[0-9a-fA-F]{3,6}"` → empty.
- [ ] Doctype in `DocTypeConfigV4` (flow/ai/ux metadata); Zod schema generated via `pnpm generate-types`.
- [ ] Factory routes (list/get/create/update/delete) with Zod + `allowedFields`; contract tests pass.
- [ ] Unit tests: its `AUTO_FILL_REGISTRY` entry, status-machine transitions (legal + illegal), cross-module validations, idempotency guard (double-trigger = one effect).
- [ ] `vitest run` green; `ui-auditor` run, score recorded, findings resolved.

**Manual (run against a real Frappe dev site — see §4):**
- [ ] Create via wizard from upstream → auto-fill correct (🔒 read-only), only `userMustFill` editable; **document really persists** in Frappe (reload to confirm).
- [ ] Submit / status actions really transition (verify by reload) or are disabled with a Phase-2 tooltip — no fake toasts.
- [ ] Flow Tracker resolves the chain; completed upstream stages click through to the real document.
- [ ] Illegal action blocked with the exact Workflow P3 §7 error.
- [ ] Double-click create-downstream → exactly one document.
- [ ] Dark mode + 375px + skeleton/empty/error states.

**Sign-off:** fill `IMPLEMENTATION_HANDOFF.md` §9 for the sub-phase; reviewer will grep + run, not trust the summary.

---

## 4. Manual verification environment (IMPORTANT)
The golden template was verified by `tsc` + unit tests + code inspection, **not** against a live Frappe instance (none runs in the build environment). Before Phase 2 work is trusted as functional, stand up a Frappe v15 + ERPNext dev site (`DEV_SETUP.md`), seed it (`scripts/seed-data.js`), point `NEXT_PUBLIC_FRAPPE_URL` at it, and run the manual DoD against real data. Persistence/flow behavior is only proven at runtime.

---

## 5. Security carry-forward (before Phase 3, not Phase 2)
`lib/auth/resolve-user.ts` is still a dev stub returning Administrator; `createScopedFrappeClient` throws. Per-user RBAC (B1(a)) MUST be implemented before the AI phase, or AI inherits a god service account. Track it; do not let Phase 3 start without it.
