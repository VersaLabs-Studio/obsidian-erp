# Obsidian ERP v4.0 — Phase 2g Handoff
# P0 Hardening (WO create + Global Wizard Gate) + CRM Pivot (Lead → Customer) + Notifications Center + Implicit Company

> **Product:** Obsidian ERP
> **Company:** VersaLabs Studio
> **Document Version:** 4.0.0
> **Last Updated:** 2026-06-05
> **Audience:** Coding Agent (OpenCode mesh)
> **Depends On:** ARCHITECTURE_V4_PART1_FOUNDATION §(multi-tenant / DB-per-tenant, Pana = first tenant); ARCHITECTURE_V4_PART2_UX_REVOLUTION §2 (SmartForm Wizard Engine), §6 (Flow Tracker), §8 (Golden Template); BUSINESS_WORKFLOW_PART1_LEAD_TO_CASH §3 (Stage 1: Lead Capture & Qualification — **"Convert to Customer"**, line 192; `converted_to → Customer`, status→"Converted"); BUSINESS_WORKFLOW_PART2_MODULE_SPECS (Lead / Customer field specs); BUSINESS_WORKFLOW_PART3_AUTOMATION §1 (Auto-Fill Registry); DECISIONS.md (B3 idempotency, B5 error resolution, B6 wizard-gate)
> **Status of 2f:** **APPROVE-WITH-FIXES.** Verified directly against the worktree (commit `e4f7179`, merged to `develop` `37cc26b`, pushed): tsc 0, vitest 60/60. **Approved:** A3 (`LINKED_DOC_EXISTS` guided modal + DN insufficient-stock prefill), A4, FlowRail rewrite mechanics (label-once, no aria leak), CRM CRUD scaffolding. **FlowRail design is DEFERRED** (see Part B). This phase fixes the two items that are still broken on a live server (A1 WO create, A2 wizard gate — both now understood to be **global**), pivots the CRM head from Opportunity to **Lead → Customer**, and adds two new features (Notifications Center, Implicit Company).

---

## 0. How to read this document

Parts, in order. **Part A must land first and is non-negotiable** — these are the same P0s carried from 2e/2f and they are still broken on a live Frappe dev server. Do **not** mark Part A done from a unit test; each item requires a live click-path proof (screenshot/GIF).

- **Part A — P0 hardening** (A1 Work Order create end-to-end; A2 global wizard gate). Highest priority.
- **Part B — FlowRail** (deferred this phase; logged design debt — do **not** spend build time here).
- **Part C — CRM pivot** (demote Opportunity; build Lead → Customer; replicate + improve the duplicate/unique guided modal).
- **Part D — New feature: Notifications Center.**
- **Part E — New feature: Implicit Company field (default "Pana").**
- **Part F — Defects found in audit (F1–F3).**
- **Part G — Definition of Done (tightened — real component tests this time).**
- **Part H — Git.**  **Part I — Decisions to log.**  **Part J — Security carry-forward.**

**Standing acceptance criteria (every phase, enforced by audit grep + live click-path):** no raw/technical error text in the UI; no `bg-black`/`text-white`/invented hard or black borders; wizards full-width + padded; copy teaches; elevation-first surfaces, hairline `border-border/40` only; **every mutation routes errors through `resolveFrappeError` AND renders a `GuidedErrorDialog`**; **every interactive control does something real or is removed — no `onClick: () => {}` / `run: () => {}` outside a genuine dismiss**; **every wizard step gates Next against the fields Frappe actually requires**; **every feature is provable from the UI, not only from a unit test.**

---

## PART A — P0 HARDENING (still broken on a live server)

### A1 — BLOCKER: Work Order creation still fails (HTTP 400) and the dialog shows "[object Object]"

**Symptom (user-confirmed, 2f dev test):** On a submitted SO, "Create Work Order(s)" now renders the `GuidedErrorDialog` (the 2f dialog-render fix worked ✓), but the body reads:
> Something went wrong — The server rejected this action. See the technical details below or try again. **[object Object]**

Terminal:
```
GET  /api/manufacturing/bom?filters=[["item","in",[...]],["is_default","=",1]]&limit=2   200
GET  /api/manufacturing/work-order?filters=[["sales_order","=","SAL-ORD-2026-00015"]]    200
POST /api/manufacturing/work-order   400   (fires twice — once per item)
```

There are **two independent bugs** here; fix both.

**Root cause #1 — the WO payload is missing Frappe-mandatory fields → 400.**
`app/sales/sales-order/[name]/page.tsx` (`executeCreateWorkOrders`, ~`:217-229`) builds:
```ts
const woPayload = {
  ...header,                         // SO→WO auto-fill
  production_item: item.item_code,
  item_name:       item.item_name,
  qty:             item.qty,
  fg_warehouse:    item.warehouse || "",   // ← empty string when item has no warehouse
  sales_order:     name,
  bom_no:          bomNo,
  naming_series:   "MFG-WO-.YYYY.-",
  status:          "Draft",
  docstatus:       0,
};
```
ERPNext **Work Order** mandatory fields not reliably present here: **`company`**, **`planned_start_date`**, **`wip_warehouse`** (required unless `skip_transfer = 1`), and **`fg_warehouse`** must be a real warehouse (an empty string is invalid). Fix:
- Inject **`company`** from the new implicit-company source (Part E) — never an empty string.
- Set **`planned_start_date`** to now (ISO `yyyy-mm-dd HH:mm:ss`), or the SO `delivery_date` if present.
- Resolve a real **`fg_warehouse`**: prefer `item.warehouse`, else the SO `set_warehouse`, else the company default FG warehouse; if none can be resolved, **block with a guided dialog** ("No finished-goods warehouse set for {item}…") exactly as the no-BOM path already does — do **not** POST an empty string.
- Set **`wip_warehouse`** the same way (company default WIP warehouse), **or** set `skip_transfer: 1` if the business flow doesn't stage WIP (confirm against BUSINESS_WORKFLOW_PART2 manufacturing spec — pick one and document it).
- Drop `status`/`docstatus` from the insert body if Frappe rejects them on create (let the doc default to Draft); keep them only if a live insert succeeds with them present.
- **Verify on a live server**: the POST must return **200** and the WO must appear in the SO's downstream Work Orders list and on the FlowRail. A green unit test is **not** acceptance for A1.

**Root cause #2 — `resolveFrappeError` can't read the frappe-js-sdk error shape → "[object Object]".**
`lib/errors/frappe-error-resolver.ts` extracts the message with:
```ts
const rawMessage = err instanceof Error ? err.message : typeof err === "string" ? err : "An unexpected error occurred";
```
frappe-js-sdk throws an **object** whose human-readable content lives in `_server_messages` (a JSON-encoded **array of strings**), `exception`, or `message` (which itself may be an object/array). The current code stringifies that object → **"[object Object]"**. Harden the extractor into a dedicated helper, e.g. `extractFrappeMessage(err): string`, that, in order:
1. If `err._server_messages` exists → `JSON.parse` it, then for each entry `JSON.parse` again if needed, collect `.message` fields, strip HTML tags, join with " · ".
2. Else if `err.exception` (string) → take the part after the last `:` (the human message).
3. Else if `err.message` is a string → use it; if it's an object/array → recurse / `JSON.stringify` only as a last resort.
4. Else `err.httpStatus`/`httpStatusText` → "The server rejected this action (400)."
5. Never return `[object Object]` — assert this in a test with a realistic frappe-js-sdk error fixture.

This single fix improves **every** guided dialog and every toast across the app (it's why A2's submit errors are also unreadable). Treat it as foundational, not WO-specific.

---

### A2 — BLOCKER: the wizard gate is broken **globally** (toast instead of inline validation, and Next proceeds with required fields empty)

**Symptom (user-confirmed, 2f dev test):** On **Material Request**, leaving "Reqd by Date" empty lets the user proceed; on submit a **toast** appears ("Please enter Reqd by Date") instead of inline, per-field validation. The **same failure repeats on Stock Entry, Lead, and Opportunity** new wizards — each lets you advance past a step with required fields empty, then surfaces a toast. **No red markers** appear on the missing fields.

This is **not** a one-page bug. The audit found three structural gaps; fix all three across **every** wizard:

**Gap 1 — Zod step schemas don't match Frappe's actual mandatory fields.**
`lib/flows/flow-validation.ts` marks `schedule_date` ("Reqd by Date") as `.optional()` (`:150`, `:162`, `:276`) while Frappe requires it. So the client gate reports the step **valid**, Next is allowed, and the server rejects on submit. **Action:** for every doctype in `WIZARD_STEP_SCHEMAS`, cross-check each step's required fields against the doctype's **actual** mandatory fields in Frappe (use BUSINESS_WORKFLOW_PART2 field specs as the source of truth; where the doc and Frappe disagree, Frappe wins and you note it). Make every Frappe-mandatory field `.min(1)` / required in the matching step. `schedule_date`/`Reqd by Date` is the known concrete miss — there will be others (e.g. SE `posting_date`, item-row `schedule_date`).

**Gap 2 — per-field red markers exist only on Sales Order.** Only `app/sales/sales-order/new/page.tsx` wires the `FieldWrap` `error` prop so empty required fields light red. **Action:** apply the **same** pattern to **every** create/edit wizard (MR, SE, Lead, the kept Customer/Quotation/SO/DN/JE/PE/PI/SI/PO/RFQ/SQ/BOM/WO): each field passes `error={triedNextSteps.has(step) ? validationResults?.stepN?.errors?.<field> : undefined}` and `FieldWrap` renders the red border + inline message. Extract the shared pattern so it can't drift per page.

**Gap 3 — 7 transactional create wizards never render a guided dialog → raw toasts on submit.** Audit (`showError/GuidedErrorDialog` per create page):
| Wired ✅ | Missing ❌ (raw-toast on server error) |
|---|---|
| PO, RFQ, SQ, Lead, Opportunity, BOM, WO, SO | **Journal Entry, Payment Entry, Purchase Invoice, Sales Invoice, Delivery Note, Material Request, Stock Entry** |
**Action:** on each ❌ page, wire `createMutation`'s `onError → showError(resolveFrappeError(err, { doctype }))` and **render `<GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />`** in the JSX. After this, the audit invariant becomes: *every create/edit/detail page that runs a Frappe mutation renders a `GuidedErrorDialog`.* (My 2f grep only checked "pages that call showError also render it" — it could not catch pages that should call it but don't. The new grep must assert the dialog is present on **every** page with a `useFrappeCreate/Update/Delete`/submit/cancel.)

**A2 acceptance (live, per wizard — MR, SE, Lead, Customer at minimum):** leave a required field empty → **Next is disabled/blocked**, the field shows a **red border + inline message**, and the hint is red. No toast for a client-side-knowable missing field. Server-side rejections (true 417/400) surface in the **guided dialog**, never a raw toast.

---

## PART B — FlowRail (DEFERRED — do not build this phase)

The 2f horizontal-pipeline rewrite fixed the correctness bugs (label rendered once, no aria-text leak, "Now" pill, single action bar) and is **approved as a non-blocker**, but Kidus still finds the **visual design** unsatisfying. We are **deferring the redesign** to a later phase to unblock higher-value work. **Action this phase: none** beyond leaving `FlowRail.tsx` as-is. Logged as standing design debt — a dedicated FlowRail visual pass will get its own handoff with a designed comp. Do not regress the 2f correctness fixes.

---

## PART C — CRM PIVOT: demote Opportunity, build Lead → Customer

Kidus has **changed the CRM head direction.** The primary Lead-to-Cash entry is now **Lead → Convert to Customer → (Quotation / Sales Order)** — which matches BUSINESS_WORKFLOW_PART1 §3 line 192 ("Convert to Customer") more closely than Lead → Opportunity did.

### C1 — Demote Opportunity out of the main flow
- Move **Opportunity** out of the primary navigation / Lead-to-Cash FlowRail and park it under a **secondary settings/secondary area** (e.g. a CRM "Advanced" or settings sub-page). Keep the CRUD pages working (don't delete the code), but it is no longer a surfaced stage in the rail or the Lead's primary "What's Next".
- Remove the **Lead → Opportunity** auto-fill mapping and the Opportunity stage from `flow-definitions.ts`'s Lead-to-Cash rail. Remove Opportunity from the Lead detail `WhatsNext`.
- Keep `Opportunity` in `BUILT_MODULES` (the pages still exist), but it must not appear as a "next step" from Lead.

### C2 — Build the Lead → Customer conversion flow (primary)
Per BUSINESS_WORKFLOW_PART1 §3:
- On the **Lead detail** page, the primary `WhatsNext` action becomes **"Convert to Customer"** (gated by `isModuleBuilt("Customer")` — Customer pages already exist under `app/crm/customer/`).
- Implement the conversion: create a **Customer** from the Lead, then set the Lead's `converted_to = <customer name>` and `status = "Converted"`. Make it **idempotent** (B3): if the Lead is already converted, the action becomes **"View Customer"** (navigate to the linked Customer) — never create a duplicate.
- Add the **`Lead → Customer`** mapping to `AUTO_FILL_REGISTRY` (`lib/flows/flow-auto-fill.ts`) per the doc's field set: Name, **company** (now implicit — Part E), email, phone/mobile, territory, source. The Customer create wizard opens **prefilled** from the Lead.
- Update `flow-definitions.ts` Lead-to-Cash stages to: **Lead → Customer → Quotation → Sales Order → …** (keep the existing Quotation / Sales Order branch flows intact and connected). The Lead's FlowRail reflects the new path.
- Keep idempotent convert/create semantics and the B1 sidebar golden template on all CRM detail pages.

### C3 — Replicate + improve the duplicate/unique guided modal across all flows
Kidus liked the Lead-create guided modal:
> "Email Address must be unique, it is already used in CRM-LEAD-2026-00001"
This is the `DUPLICATE` strategy. Two actions:
1. **Replicate** it everywhere — every create flow that can hit a unique/duplicate constraint (Customer, Supplier, Item, Lead, etc.) must surface this guided modal (covered structurally by A2 Gap 3: wiring `showError` on all create pages).
2. **Improve** it (also resolves audit defect **F3**): the `DUPLICATE` resolution currently offers **only Dismiss** while its copy says "you can open the existing record." Add a real **"Open existing record"** `navigate` action that routes to the named existing doc — parse the doc name out of the message ("…already used in **CRM-LEAD-2026-00001**") and map its doctype → route exactly like `LINKED_DOC_EXISTS` does. After this, the copy and the available action match.

---

## PART D — NEW FEATURE: Notifications Center

**Context:** `components/Layout/Layout.tsx:554-561` already renders a **Bell button** (with a pulsing red dot) — but it has **no `onClick`** and does nothing. Wire it into a real notification history.

**Build:**
- A lightweight global **notification store** (e.g. a Zustand store or React context — match whatever global-state pattern the repo already uses; do not add a new state lib without cause) that **captures every user-facing notification**: each Sonner toast (success/error/info) **and** each `GuidedErrorDialog` resolution. Centralize this by wrapping the toast calls and the `showError` hook so capture is automatic — do **not** ask every page to register manually.
- Each entry: `id`, `kind` (success | error | info | guided), `title`, `message` (use the hardened `extractFrappeMessage` so errors are readable, never "[object Object]"), `timestamp`, optional `href` (deep-link to the related doc), and `read` flag.
- Clicking the Bell opens a **panel/modal** (B1 surface language: `bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40`, real padding, premium motion, dual-theme) listing entries **newest-first**, with relative timestamps (date-fns), an empty state ("No notifications yet"), per-item read state, and "Mark all read". The pulsing red dot reflects **unread count** (and disappears at zero) — right now it always pulses, which is fake.
- Persist across reloads is **optional** for this phase (in-memory session is acceptable) — but architect the store so a future persistence layer is a drop-in.
- a11y: focus-trap the panel, `aria-label` on the Bell with the unread count, Escape to close. **Do not** trigger any browser-native dialog.

---

## PART E — NEW FEATURE: Implicit Company field (default "Pana")

**Context:** Obsidian is **DB-per-tenant** (ARCHITECTURE_V4_PART1) — each tenant **is** one company, so making the user pick `company` on every document is wrong. "Pana" is the documented first tenant.

**Build:**
- Introduce a single **source of truth** for the active company (e.g. `lib/settings/company.ts` exposing `getActiveCompany()` / a `useActiveCompany()` hook), **defaulting to `"Pana"`**. Architect it to later read from a tenant/settings record, but a typed default constant is acceptable now.
- **Remove `company` from every create/edit wizard's visible fields** (SO, MR, SE, JE, PE, PI, SI, DN, PO, RFQ, SQ, BOM, WO, Customer, Lead, etc.). It must **no longer be a user-entered or gated field** — remove it from the corresponding Zod step schemas so it never blocks Next.
- **Inject `company` implicitly** into every mutation payload at submit time from `getActiveCompany()` — including the WO payload in A1, the Customer create in C2, and all others. No payload may send an empty or user-typed company.
- Add a **Settings** entry (under the existing settings module — e.g. `app/accounting/settings/company/` already exists, or a CRM/global settings page; pick the one consistent with the master docs) where the active company can be **viewed and changed**. Default shown: **Pana**.
- **Regression guard:** grep that no wizard step schema still lists `company` as required, and that every create mutation includes `company` from the implicit source. A document must never be created without a company.

---

## PART F — Defects found in the 2f audit (fold in here)

- **F1 (real no-op CTA):** `app/crm/lead/[name]/page.tsx:165` — the `WhatsNext` **"Change Status"** action has `onClick: () => {}` with `disabled: false`. It's a dead CTA that duplicates the working `StatusChangeMenu` in the page header. **Fix:** either wire it to open the real status-change control, or remove it from `WhatsNext`. Then extend the no-op audit grep to **page `onClick:` handlers**, not just resolver `run:` callbacks (that's how this slipped through).
- **F2 (test quality — recurring):** the "feature-path" tests are still **helpers/simulations** — the wizard-gate test *re-implements* the lookup instead of rendering `FlowWizard`, and the only RTL test renders a throwaway `SmokeComponent`. **No real app component is rendered in any test.** See Part G — this phase must add genuine component tests.
- **F3 (copy/action mismatch):** resolved by **C3** (add the "Open existing record" action to `DUPLICATE`).

---

## PART G — Definition of Done (tightened — enforced, not aspirational)

A PR is **not** done until **all** of the following hold. The recurring failure is green static gates while a headline feature is half-wired — this DoD is written to make that impossible.

1. **tsc** `--noEmit` → 0 errors. **vitest run** → all green.
2. **Live click-path proof per P0** (A1, each A2 wizard, C2 conversion, D notifications, E company-injection): a **screenshot or GIF** from a running Frappe dev server attached to the PR. A1 specifically must show a **200** WO POST and the WO appearing downstream. No P0 may be marked done from a unit test alone.
3. **Real component tests (RTL), not simulations.** Add tests that **render the actual components**: (a) `FlowWizard` with a deliberately-incomplete step → assert **Next is disabled** and the inline field error is in the DOM; (b) a page (or the `WhatsNext` component) → assert **no rendered action has an empty handler**; (c) `GuidedErrorDialog` → render it with a realistic frappe-js-sdk error fixture and assert the **readable message** appears and **"[object Object]" does not**. Delete or upgrade the throwaway `SmokeComponent` test.
4. **Grep gates (all must return empty / pass):**
   - `onClick:\s*\(\)\s*=>\s*\{\}` and `run:\s*\(\)\s*=>\s*\{\}` outside a genuine `kind:"dismiss"` → **none**.
   - Every page invoking `useFrappeCreate|useFrappeUpdate|useFrappeDelete` or a submit/cancel/delete also renders `GuidedErrorDialog` → **enforced**.
   - No wizard step schema lists `company` as a field → **none** (Part E).
   - No `max-w-(3xl|4xl|5xl)` in any wizard step container.
   - No `bg-white|bg-black|text-white|border-black`; status colors are semantic tokens / `StatusBadge`.
   - `extractFrappeMessage` never yields `[object Object]` (asserted by test fixture).
5. **DECISIONS.md updated** (Part I).

---

## PART H — Git

- **Branch off `develop`** (currently `37cc26b`): `feat/v4-phase-2g-hardening-crm-customer`.
- Commit in logical chunks (A first, then C/D/E). Keep `main` untouched.
- **Merge to `develop`** (no-ff), **push `develop` to origin**, and open the PR into `develop`.
- Branch-naming/stacking debt from 2a–2f is acknowledged; this branch correctly cuts from `develop`.
- `gh` CLI is now installed on the maintainer's machine — you may reference `gh pr create` in the handoff-back, but the human runs auth.

---

## PART I — Decisions to log (DECISIONS.md)

- **B5 extension (error parsing):** all Frappe errors pass through `extractFrappeMessage` before display; the UI never shows `[object Object]` or a raw `_server_messages` blob. Every create/edit/detail mutation renders a `GuidedErrorDialog`; raw `toast.error(rawError)` is prohibited.
- **B7 (implicit company):** `company` is a tenant-implicit field sourced from `getActiveCompany()` (default "Pana"), injected at submit, never user-entered, changeable only in Settings. Rationale: DB-per-tenant ⇒ one company per tenant.
- **B8 (CRM head = Lead → Customer):** the Lead-to-Cash entry is Lead → Convert to Customer → Quotation/Sales Order (per WORKFLOW_PART1 §3). Opportunity is demoted to a secondary/settings area, not a surfaced stage.
- **B9 (notifications):** a global notification store captures every toast + guided resolution; the Layout Bell is its surface; the unread dot reflects real unread count.

---

## PART J — Security carry-forward (unchanged, still blocking Phase 3)

`lib/auth/resolve-user.ts` remains a **dev stub** and `createScopedFrappeClient` throws. Per-user RBAC (DECISIONS B1) **must** land before the AI phase (Phase 3). Do **not** begin Phase 3 without it. The implicit-company work in Part E is **not** a substitute for tenant/user scoping — it is a UX default, not a security boundary.

---

### Build order (recommended)
1. **A1 root-cause #2** (`extractFrappeMessage`) — unblocks readable errors everywhere.
2. **A2 Gap 3** (wire `showError` + dialog on the 7 missing pages) — depends on #1.
3. **A2 Gaps 1–2** (schema completeness + per-field markers, all wizards).
4. **Part E** (implicit company) — needed by A1 #1 and C2 payloads.
5. **A1 root-cause #1** (WO payload with company/warehouses/start date) — verify 200 live.
6. **Part C** (demote Opportunity, Lead → Customer, improve DUPLICATE).
7. **Part D** (Notifications Center).
8. **Part F** (F1 cleanup), **Part G** (tests), **Part H** (merge to develop).
