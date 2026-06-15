# Obsidian ERP v4.0 — Phase 2h Handoff
# Finish 2g Hardening (Company Injection + Wizard Markers + Real Tests) + New Module: Purchase Receipt

> **Product:** Obsidian ERP
> **Company:** VersaLabs Studio
> **Document Version:** 4.0.0
> **Last Updated:** 2026-06-05
> **Audience:** Coding Agent (OpenCode mesh)
> **Depends On:** BUSINESS_WORKFLOW_PART1_LEAD_TO_CASH §6 (Stage 4: Procurement — the **PO → Purchase Receipt → Purchase Invoice** spine, §6.2); BUSINESS_WORKFLOW_PART2_MODULE_SPECS §4.5 (Delivery Note — the structural mirror to clone), §5.2 (Purchase Order — "CREATES DOWNSTREAM: Purchase Receipt, Purchase Invoice"), §7.2 (Purchase Invoice — "AUTO-FILL FROM: Purchase Order, Purchase Receipt"); BUSINESS_WORKFLOW_PART3_AUTOMATION §1 (Auto-Fill Registry — `Purchase Order→Purchase Receipt` & `Purchase Receipt→Purchase Invoice` mappings already exist), §2 (status state machines); ARCHITECTURE_V4_PART2_UX_REVOLUTION §8 (Golden Template); DECISIONS.md (B3 idempotency, B5/B5-ext error resolution, B6 wizard-gate, B7 implicit company)
> **Status of 2g:** **APPROVED** (git ledger verified: `develop` = `2afd6fa`, pushed; commits `75745d7`/`c883118`/`f75a4fc`; foundation files present). 2g delivered `extractFrappeMessage`, the WO payload fix, guided dialogs on 7 create pages, the CRM pivot (Lead→Customer, Opportunity demoted), the Notifications Center, and the implicit-company foundation. **It shipped with four self-flagged carry-overs — one of which is a live regression (see Part A).** This phase finishes those, then builds the one remaining gap in a core transactional spine: **Purchase Receipt.**

---

## 0. How to read this document

- **Part A — finish 2g (carried, must land first).** Includes a **live regression** (company injection) that currently breaks core create flows. Non-negotiable, proven live.
- **Part B — new module: Purchase Receipt.** Greenfield pages; clone Delivery Note and invert (inbound goods); activates auto-fill mappings that already exist.
- **Part C — DoD.**  **Part D — Git.**  **Part E — Decisions.**  **Part F — Security.**

**After this phase:** Kidus will run a **deep audit + extensive manual dev verification** (not the light pass used for 2g). Build accordingly — assume every claim will be checked against a live Frappe server and the worktree.

**Standing acceptance criteria (unchanged, audit-enforced):** no raw/technical error text in UI; no `bg-black`/`text-white`/invented hard or black borders; wizards full-width + padded; copy teaches; elevation-first surfaces, hairline `border-border/40`; every mutation routes errors through `resolveFrappeError`/`extractFrappeMessage` **and renders `GuidedErrorDialog`**; **no `onClick:()=>{}` / `run:()=>{}` outside a genuine dismiss**; **every wizard step gates Next against the fields Frappe actually requires, with per-field red markers**; **every feature provable from the UI.**

---

## PART A — FINISH 2g (carried-over, land first)

### A-1 — BLOCKER (live regression): inject `company` on the 11 remaining create pages
**Why this is a blocker, not "mechanical follow-up":** 2g Part E removed `company` from all 16 wizard schemas/forms but only injected `company: getActiveCompany()` into **3** payloads (JE, PE, WO). The other create pages now build payloads with **no company at all** → Frappe rejects them with "Company is required." **Creating a Sales Order, Material Request, Delivery Note, Sales Invoice, etc. is broken right now.**
**Action:** inject `company: getActiveCompany()` into the mutation payload of **every** remaining create (and edit, where company is persisted) page: at minimum **SO, Quotation, MR, SE, DN, SI, PI, PO, RFQ, SQ, BOM, Customer, Lead** — audit the full set. The injection happens at submit, from `lib/settings/company.ts`, never from a form field.
**Acceptance:** grep proves every `useFrappeCreate`/`useFrappeUpdate` payload that persists a company includes `company: getActiveCompany()`; live-create one document per module returns **200** with the correct company set.

### A-2 — A2 Gap 2: wire per-field red markers on EVERY wizard (not just Sales Order)
2g extracted `FieldWrap` to a shared component but only Sales Order actually passes the `error` prop. Every other wizard shows the red *hint* but its fields don't light up — the exact failure Kidus has rejected repeatedly.
**Action:** on **every** create/edit wizard, each field passes `error={triedNextSteps.has(step) ? validationResults?.stepN?.errors?.<field> : undefined}` so empty required fields render the red border + inline message. Verify the gate actually computes `validationResults` (reactive `useWatch`) and passes it to `FlowWizard` with **step ids that match the results keys** — confirm on **Quotation, MR, SE, Lead, Customer** specifically (these are the live-tested-failing ones / newest).
**Acceptance (live, per wizard): ** empty required field → Next blocked + field red + inline message; no toast for a client-knowable miss.

### A-3 — Real RTL component tests (Part G of 2g, deferred — "Task tool was broken")
The suite is still helpers/simulations; the only RTL test renders a throwaway `SmokeComponent`. This is how the F1 no-op CTA shipped green.
**Action:** add tests that **`render()` the real components** and assert DOM state:
- `FlowWizard` with an incomplete step → **Next is disabled** and the inline field error node is in the DOM (drives A-2).
- `WhatsNext` (or a detail page) → **no rendered action has an empty handler**.
- `GuidedErrorDialog` rendered with a realistic **frappe-js-sdk error fixture** (object with `_server_messages`) → the **readable message** appears and the string **"[object Object]" does not** (drives `extractFrappeMessage`).
Delete/upgrade the `SmokeComponent` test. These must be true feature-path tests, not logic mirrors.

### A-4 — Live A1 proof (carry the verification, not new code)
2g's WO payload fix (`company`/`planned_start_date`/`fg_warehouse`/`skip_transfer`) is unverified on a live server. Include a **click-path GIF/screenshot** in the PR showing the WO `POST` returning **200** and the Work Order appearing downstream on the SO. If it still 400s, diagnose against the live error (now readable via `extractFrappeMessage`) and fix before merge.

---

## PART B — NEW MODULE: Purchase Receipt (closes procure-to-pay)

**Doc rationale:** Part 1 §6.2 defines the procurement spine as **PO → Purchase Receipt → Purchase Invoice → Payment Entry.** Purchase Receipt is the **only** missing node in a core transactional flow — the sales spine (Lead→Customer→Quotation→SO→DN→SI→PE) is complete; buying currently dead-ends at PO with no goods-received step, and PI's documented "auto-fill from Purchase Receipt" (§7.2) is dormant. Purchase Receipt is the **inbound mirror of Delivery Note** (outbound goods) — clone the DN module and invert direction.

### B-1 — Build to the golden template (4 pages), cloning Delivery Note
Create `app/buying/purchase-receipt/{page.tsx, new/page.tsx, [name]/page.tsx, [name]/edit/page.tsx}`, structurally mirroring `app/stock/delivery-note/**` (the built golden-template reference) but for **received** goods. Apply **every** Part A rule from day one (company implicit, per-field markers, guided dialog, gated wizard) — this module must not need a re-hardening pass.
- **List:** KPICards (Total / Draft / To Bill / Completed), `StatusBadge` with semantic tokens, card grid — match DN list.
- **Create:** multi-step `FlowWizard` (Supplier + warehouse + dates → items → review), auto-filled from a Purchase Order (see B-2). Review step shows the full item table + totals (Kidus's standing rule).
- **Detail:** B1 sidebar golden template (WhatsNext / ActivityTimeline / FlowRail card), flow-chain resolution (upstream PO via link, downstream PI), guided-error wiring on submit/cancel.
- **Edit:** pre-filled wizard.

### B-2 — Activate the auto-fill mappings (already in the registry)
`lib/flows/flow-auto-fill.ts` already defines **`Purchase Order→Purchase Receipt`** (`:191`) and **`Purchase Receipt→Purchase Invoice`** (`:216`) — read them and wire the pages to consume them:
- PO detail "Create Purchase Receipt" → opens the PR wizard prefilled from the PO (supplier, items, qty, warehouse) per the existing mapping. Make it **idempotent** (B3): if a PR already exists for the PO, the action becomes "View Purchase Receipt."
- PR detail "Create Purchase Invoice" → opens PI prefilled from the PR (this finally satisfies §7.2). PI's create page already exists — only the upstream link + autofill source needs activating.

### B-3 — DocType field spec (derive from PO + Delivery Note; Part 2 has no dedicated §)
Part 2 references Purchase Receipt but never gives it a field section — derive the spec from the **Purchase Order** source fields, the **Delivery Note** structure (§4.5), and the registry mappings. Core fields: `supplier`*, `supplier_name`, `company` (implicit), `posting_date`* (default today), `set_warehouse` (target/accepting warehouse), `purchase_order` (link, when created from PO), `items[]` (`item_code`*, `item_name`, `qty`*, `received_qty`, `rejected_qty`, `uom`, `warehouse`, `purchase_order`, `purchase_order_item`, `rate`, `amount`), `total_qty`, `grand_total`, `status`. Confirm each mandatory field against a live Frappe Purchase Receipt and gate it in the Zod step schema (the A-2 schema-completeness rule applies here too — e.g. `received_qty`/`warehouse` requirements).

### B-4 — Wiring
- `lib/flows/flow-validation.ts`: add `purchaseReceiptStepSchemas` (step ids `step1`/`step2` matching the gate), register in `WIZARD_STEP_SCHEMAS`.
- `lib/flows/module-availability.ts`: add **"Purchase Receipt"** to `BUILT_MODULES` (it is currently absent — so PO/PI "create downstream" correctly hides it until now).
- `flow-definitions.ts`: insert Purchase Receipt into the procurement FlowRail between Purchase Order and Purchase Invoice.
- Navigation/sidebar: add Purchase Receipt under Buying (or Stock, matching where DN lives — keep it consistent with the procurement grouping).

---

## PART C — Definition of Done (deep audit incoming — write for it)

1. **tsc** `--noEmit` → 0. **vitest run** → all green, **including the new RTL tests** (A-3).
2. **Live click-path proof** (GIF/screenshot, running Frappe) for: A-1 (a create per module returns 200 with company set), A-2 (gate+markers on Quotation/MR/SE/Lead/Customer), A-4 (WO POST 200), B (PO→PR→PI end-to-end, idempotent).
3. **Grep gates (must pass):** `onClick:\s*\(\)\s*=>\s*\{\}` and `run:\s*\(\)\s*=>\s*\{\}` outside `kind:"dismiss"` → none; every mutation page renders `GuidedErrorDialog`; no wizard schema lists `company`; every create payload injects `company: getActiveCompany()`; no `max-w-(3xl|4xl|5xl)` in wizards; no `bg-white|bg-black|text-white|border-black`; `extractFrappeMessage` never yields `[object Object]` (asserted by fixture test).
4. **No new module ships un-hardened:** Purchase Receipt must satisfy every standing criterion at birth — no carry-over.
5. **DECISIONS.md** updated (Part E).

---

## PART D — Git

- **Branch off `develop`** (`2afd6fa`): `feat/v4-phase-2h-pr-hardening`.
- Commit in chunks: Part A (hardening) first, then Part B (Purchase Receipt). Keep `main` untouched.
- **Merge to `develop`** (no-ff), **push to origin**, open PR into `develop`.

---

## PART E — Decisions to log (DECISIONS.md)

- **B7 completion:** implicit `company` is injected into **every** persisting mutation payload (not only JE/PE/WO); a document is never created without a company; the only place company changes is Settings.
- **B10 (Purchase Receipt):** procure-to-pay spine is PO → Purchase Receipt → Purchase Invoice → Payment Entry (per WORKFLOW_PART1 §6.2); Purchase Receipt is the inbound mirror of Delivery Note and consumes the pre-existing `PO→PR` / `PR→PI` auto-fill mappings idempotently.

---

## PART F — Security carry-forward (still blocking Phase 3)

`lib/auth/resolve-user.ts` remains a **dev stub**; `createScopedFrappeClient` throws. Per-user RBAC (DECISIONS B1) **must** land before Phase 3 (AI). Implicit-company (B7) is a UX default, **not** a tenant/user security boundary — do not conflate them.

---

### Build order (recommended)
1. **A-1** company injection (unblocks all create flows) → smoke-create one doc per module live.
2. **A-2** markers/gate on all wizards → **A-3** RTL tests that lock A-2 in.
3. **A-4** verify WO 200 live.
4. **B** Purchase Receipt (clone DN → invert → activate registry mappings → wire) → verify PO→PR→PI live.
5. **C** DoD greps + tests → **D** merge to develop.
