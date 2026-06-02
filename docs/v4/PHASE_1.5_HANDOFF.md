# Obsidian ERP v4.0 — Phase 1.5 Handoff (Golden Template Reconciliation)

> **For:** Coding agent
> **From:** Architecture review + product owner (Kidus) visual pass
> **Branch:** continue on `feat/v4-phase-0-foundation` (or branch `feat/v4-phase-1.5-golden-template` off it)
> **Status:** REQUIRED before Phase 2. Phase 2 is BLOCKED until this passes.
> **Date:** 2026-06-02

---

## 0. Why this phase exists

Phase 1 delivered real, good work — the **list page** (KPI bar + SmartTable + inline status changes) is strong, the flow-engine **libraries and components were built** (FlowWizard, FlowTracker, flow-auto-fill registry, status machines), the **DECISIONS.md (B1–B4)** is excellent, tests pass, rebrand is ~done.

**But the golden template is not actually V4.** Verified findings:

1. **`FlowWizard` is imported by zero pages.** It was built and left on the shelf.
2. **The `flow-auto-fill` registry is consumed by zero pages.** Built, unused.
3. **The Sales Order create page (`app/sales/sales-order/new/page.tsx`) is still the V3 single-page InfoCard form** — its own header comment literally says *"v3.0 Sales Order Creation Logic."* Same for the edit page.
4. **Both `new/page.tsx` and `[name]/edit/page.tsx` carry `// @ts-nocheck`** — they opt out of type safety. This is why `tsc` "passes."
5. **The detail-page Flow Tracker is not good** (product owner): it renders the stages but you **cannot click upstream stages** to navigate to where the order came from, and it has **design problems** (below).
6. **POST / action operations do nothing but show a success toast.** Submit, Create Work Order, status changes, etc. fire toast notifications but **do not persist anything**. The generic mutation plumbing (`useFrappeMutation`, the factory `POST`) is correct — so the bug is **placeholder/stub action handlers** that toast without calling a real, awaited mutation, and/or create writes failing silently against Frappe.
7. **Invented design that violates the system:** the agent added a **hard black border on main components** that exists in **neither** the V3 nor V4 UI guidelines, plus **off-palette colors** (raw `text-blue-500`, `text-amber-500`, `text-emerald-500`, `text-purple-500`, `text-indigo-500` on icons). The design system is **OKLCH semantic tokens only** with glassmorphism — no invented borders, no rainbow icons.

**The danger:** Phase 2 replicates the Sales Order template across ~65 doctypes. If we replicate it now, we propagate a non-wizard, `@ts-nocheck`, non-persisting, off-design form **65 times**. That is exactly what the golden template exists to prevent. Fix it here, once, correctly.

**Do it right this time** means: follow the master docs, not your own instincts. Before writing code, **load these skills and obey them**: `architectural-dna`, `premium-ui`, `ui-auditor`. Read **ARCHITECTURE_V4_PART2_UX_REVOLUTION.md §1, §2, §3, §6, §8** and **BUSINESS_WORKFLOW_PART3_AUTOMATION.md §1, §2, §4** before touching the create flow. Do not invent UI. If a visual decision isn't in the docs or the skills, match the existing V3 premium components — do not freelance.

---

## 1. Scope (P0 — all required)

### Task A — Migrate the ENTIRE Sales Order create/edit flow to the V4 SmartForm wizard
This is the priority. The whole create experience must change per **Part 2 §2 (SmartForm Wizard Engine), §3.3 (Create Page Template), §8 (Golden Template)**.

- Rebuild `app/sales/sales-order/new/page.tsx` and `app/sales/sales-order/[name]/edit/page.tsx` to use the **`FlowWizard`** component you already built — 3 steps: **Customer & Dates → Order Items → Review & Confirm** (Part 2 §2.3 has the exact `salesOrderFlow` definition).
- Drive auto-fill from the **`flow-auto-fill` registry** (`Quotation->Sales Order` mapping, Workflow P3 §1) — **delete the inline ad-hoc mapping** in the current page and the raw `fetch('/api/sales/quotation/...')`. Use a hook (`useFrappeDoc`) for the source quotation, then the registry to map. One source of truth for auto-fill.
- Wizard behavior required (Part 2 §2): per-step **Zod validation gates "Next"**; auto-filled fields render **read-only with the 🔒 source indicator**; step 3 is a **review/confirm** with a summary card; the confirm action is what creates the document.
- **Remove `// @ts-nocheck`** from both files and fix the React-Hook-Form + Zod typing properly (the `FlowWizard` generic should carry the schema type; if RHF inference is the pain point, type the resolver/`useForm<z.infer<typeof schema>>` explicitly — do not silence the compiler).
- The list page is good — **leave it as-is** except where shared components change.

### Task B — Rework the Flow Tracker (detail page) to be genuinely good + navigable
The current tracker is not acceptable. Per **Part 2 §6 (Flow Tracker)** and **Workflow P3 §4 (Flow Tracker config + resolution)**:

- **Completed/upstream stages MUST be clickable links** to the actual upstream document (Part 2 §6.2: "Completed (green, clickable — links to actual document)"). From a Sales Order, clicking **Quotation / Opportunity / Lead** navigates to that document so the user can see where the order came from. This is the explicit product-owner request.
- Follow the full **`LEAD_TO_CASH_FLOW`** (Workflow P3 §4.1): Lead → Opportunity → Quotation → Sales Order → **Work Order** → Delivery Note → Sales Invoice → Payment Entry. **Work Order is currently missing** from the rendered tracker — include it with the correct **optional/skipped** visual state when absent (Part 2 §6.2 states: `◌ Skipped (dashed, gray)`).
- Use the **`flow-chain-resolver`** you built to resolve real upstream/downstream document names (Workflow P3 §4.2). The tracker must show real linked doc IDs, not placeholders.
- Visual states per spec §6.2: `● Completed` (clickable), `◉ Current` (brand, subtle pulse — respect `prefers-reduced-motion`), `○ Pending` (next step shows a "Create →" action), `◌ Skipped`.
- Redesign the visual quality to premium standard (see Task D). It should look like the rest of the system, not a debug widget.

### Task C — Make POST / actions actually work (no fake toasts)
Every action that claims to do something must do it and reflect the **real** result:

- Audit **every** action handler on the SO detail page and the wizard: Submit, Cancel, Amend, Create Work Order(s), Create Delivery Note, Create Invoice, inline status changes, "What's Next" buttons. Any handler that currently just calls `toast.success(...)` without an awaited mutation is a **stub — wire it to a real mutation** (`useFrappeUpdate` / the relevant factory route) or, if its downstream automation belongs to Phase 2, **disable the button with a "Coming in Phase 2" tooltip — do NOT show a success toast for something that didn't happen.**
- Toasts must be driven by the **actual mutation result**: success toast only in the mutation's real `onSuccess` (post-2xx), error toast in real `onError`. No optimistic "success" decoupled from persistence.
- **Prove persistence:** after Create and after Submit, the record must exist/changed in Frappe (verify via the list refetch and by reloading the detail page — the new/updated doc is really there). Cache invalidation must refresh the list without a manual reload.
- If create is silently failing against Frappe, find out why (check the factory `createCreateHandler` → `frappe-client` path, env keys, required fields, Frappe validation errors) and surface the real error to the user instead of a success toast.

### Task D — Fix the design system violations
Load `premium-ui` + `ui-auditor` and conform. **The agent invented styling that isn't in any guideline — remove it.**

- **Remove the hard black border** added to main components. It is not in V3 or V4 guidelines. Cards/surfaces use the established premium pattern (glassmorphism: subtle `border-border/50` or token-based soft borders, `bg-card`, backdrop blur where appropriate) — match the existing V3 components (`InfoCard`, the list page), do not introduce new border treatments.
- **Remove off-palette colors.** No raw `text-blue-500`, `text-amber-500`, `text-emerald-500`, `text-purple-500`, `text-indigo-500`, no raw hex, no `text-gray-*`/`bg-gray-*`. **OKLCH semantic tokens only** (`text-primary`, `text-muted-foreground`, `text-destructive`, `bg-secondary`, etc.). Icons use semantic tokens.
- Verify **light AND dark** themes look correct on the create wizard, detail page, and tracker. No near-black borders bleeding in light mode; no unreadable contrast.
- Framer Motion animations must have a `useReducedMotion()` fallback.
- Every data view keeps **skeleton / empty / error** states.

### Task E — Cleanup
- Fix the **1 residual "Pana" string** in `app/sales/quotation/[name]/page.tsx`.
- (Track, not block) `lib/auth/resolve-user.ts` is still a dev stub and `createScopedFrappeClient` throws "not implemented." That's acceptable for now, but **per-user RBAC (B1(a)) MUST be implemented before Phase 3**, not Phase 4. Add a TODO referencing B1 and note it in the Phase 3 entry of the handoff.

---

## 2. Out of scope (do NOT do here)
- Building other modules (that's Phase 2).
- Implementing SO→WO / SO→DN automations end-to-end (Phase 2) — for now those buttons either work as a real single create through the registry **with the B3 idempotency guard**, or are disabled with a "Phase 2" tooltip. Decide per button, but never fake them.
- Multi-tenant / auth full implementation (Phase 4).
- AI (Phase 3).

---

## 3. Acceptance criteria (Definition of Done)

**Automated:**
- [ ] `tsc --noEmit` passes with **zero `@ts-nocheck`** in `app/sales/sales-order/**` (grep proves none).
- [ ] `vitest run` green; add tests: wizard step-gating (Zod blocks Next), `Quotation->Sales Order` registry mapping (incl. child-table items), flow-chain resolver upstream/downstream resolution.
- [ ] `git grep -nI "FlowWizard" -- app/sales/sales-order` returns matches (wizard is actually used).
- [ ] `git grep -nI "AUTO_FILL_REGISTRY\|flow-auto-fill" -- app/sales/sales-order` returns matches (registry is actually consumed).
- [ ] Zero off-palette color classes in changed files: `git grep -nE "text-(blue|amber|emerald|purple|indigo|gray|red|green)-[0-9]|bg-gray-|#[0-9a-fA-F]{3,6}" -- app/sales/sales-order components/flows components/dashboard` returns nothing (except where a semantic token genuinely requires it — justify any hit).
- [ ] Zero "Pana"/"VersaForge" strings in `app/`, `lib/`, `components/`.
- [ ] `ui-auditor` skill run on the SO module — score recorded, findings resolved.

**Manual (the agent runs this against a dev Frappe site before declaring done):**
- [ ] Create: click **New Sales Order** → a real **3-step wizard** appears (not a single long form). Cannot advance a step until its required fields validate.
- [ ] Auto-fill: open create with `?quotation=QTN-…` → customer + items auto-fill, shown **read-only with 🔒**; only delivery date is user-required. The values come from the registry mapping.
- [ ] Confirm step → **the Sales Order is actually created in Frappe** (reload detail + see it in the list). Success toast only fires after the real 2xx.
- [ ] Force a failure (e.g. missing required field server-side) → **error toast with the real Frappe error**, no false success, no navigation.
- [ ] Detail Flow Tracker: **click Quotation / Lead** → navigates to that upstream document. Work Order shows as skipped/optional when none exists. States render per §6.2.
- [ ] Submit / status actions: each either **really persists** (verify by reload) or is **disabled with a Phase-2 tooltip** — none fake a success toast.
- [ ] Design: **no black borders**, all colors are semantic tokens, light + dark both correct, reduced-motion respected, skeleton/empty/error states present.
- [ ] 375px mobile: wizard steps are full-width and usable; tracker scrolls.

**Sign-off:** fill in the §9 template in `IMPLEMENTATION_HANDOFF.md` for "Phase 1.5" — and this time, **the claims must match reality** (the reviewer will grep and run, not trust the summary).

---

## 4. Guardrails for the coding agent (read before starting)
1. **Load and obey** `architectural-dna`, `premium-ui`, `ui-auditor`. They override your defaults.
2. **Read the spec sections named above** before writing the wizard or tracker. Build to the spec, not to your imagination.
3. **Do not invent UI.** No new border treatments, no new color choices, no decorative flourishes absent from V3 components or the skills. When unsure, copy the existing premium pattern.
4. **Never show a success toast for an operation that did not persist.** Toasts follow real mutation results.
5. **No `@ts-nocheck`, no `any` in new/changed code.** If types fight you, solve the types.
6. **Verify against a real dev Frappe site** before claiming done. Reload and confirm data really changed.
7. Keep the **list page** behavior — it's good; don't regress it.

When complete, report with: the grep outputs proving wizard + registry are wired, the `ui-auditor` score, and a note on which detail-page action buttons are live vs. Phase-2-disabled.
