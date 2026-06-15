# Obsidian ERP v4.0 — Phase 2d Handoff (Error-Wiring Completion + Manufacturing)

> **For:** Coding agent
> **Status:** Phase 2c (wizard UX, error architecture, FlowRail, Buying) is functionally **approved** — but verification found the new error architecture is wired **create-only**, so it does not cover the surface where business errors actually fire (document _submit_). Part A closes that gap; Part B builds Manufacturing.
> **Order:** Part A (P0 carry-over) → Part B (Manufacturing). Re-verify Part A on an existing detail page before building new doctypes.
> **Date:** 2026-06-04 · **Branch:** continue on the 2c branch or cut `feat/v4-phase-2d-manufacturing`.

> **Standing acceptance criteria (every phase):** no raw/technical error text in the UI; no `bg-black`/`text-white`/invented black borders; wizards full-width + padded; copy teaches; elevation-first surfaces, hairline `border-border/40` only; **every mutation routes errors through `resolveFrappeError` (Part B5)**; **every multi-create automation is idempotent (B3)**.

---

## PART A — P0 carry-over from the 2c audit

### A1 — BLOCKER: wire the error resolver where errors actually fire (detail/edit submit/cancel/delete)

**Root cause.** `resolveFrappeError` + `GuidedErrorDialog` are wired only into the **create** wizards (SO/PO/RFQ/SQ `new` pages). But creating a *draft* rarely throws business errors — **submitting** does (stock deduction, GL validation, mandatory links). Every detail/edit page still does:

```tsx
// app/stock/delivery-note/[name]/page.tsx:124  (and stock-entry, accounting, etc.)
onError: (e) => toast.error("Submit failed", { description: e.message }),   // raw 417 text
```

So the insufficient-stock error (*"1.0 units of … needed in Warehouse … to complete"*) — the exact case the reviewer hit on **Delivery Note submit** — still reaches the user as a raw toast. DECISIONS **B5** claims *"every `useFrappe{Create,Update,Delete}` onError calls `resolveFrappeError`"*; that promise is currently false.

**Fix.** Route **every** mutation `onError` on detail and edit pages through the resolver — submit, cancel, delete, approve, and any status transition. Pattern (already used in the create pages):

```tsx
const { resolution, showError, dismiss } = useGuidedError();
// ...
updateMutation.mutate(
  { name, data: { docstatus: 1 } },
  { onError: (err) => showError(resolveFrappeError(err, { doctype: DOCTYPE, values: doc })) },
);
// ...render once near the page root:
<GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
```

Apply to all detail/edit pages across **every** built module: sales-order, delivery-note, stock-entry, material-request, sales-invoice, payment-entry, purchase-invoice, journal-entry, purchase-order, request-for-quotation, supplier-quotation. Then **update DECISIONS B5** so the wording matches reality (it is now true for create *and* submit/cancel/delete).

**Done-check:** Submit a Delivery Note with insufficient stock → the **guided dialog** appears (Create Material Request, prefilled with item/qty/warehouse) — not a raw toast. `git grep -nE "toast\.error\([\"'](Submit|Delete|Cancel) failed" -- app` → empty (all replaced by the resolver).
**User-confirmed still broken (2c manual test):** submitting an SO produced only a raw toast — *"120.0 units of Item FG-BCARD-STD: Standard Business Cards needed in Warehouse Stores - P to complete this transaction."* This is the surface to fix.

### A2 — BLOCKER: the validation hint must be RED + visible, and invalid fields must light up (confirmed broken)
User-confirmed in 2c testing: the create panel is gone (good), but (a) the hint reads as muted gray and is easy to miss, and (b) **the empty fields don't light up** — there is no per-field feedback at all.

Two concrete fixes:
1. **Hint:** `FlowWizard.tsx:236-239` renders the hint in `text-muted-foreground`. Change to a **clearly visible destructive** treatment — `text-destructive text-sm font-medium` (and show it on mobile too; drop the `hidden sm:block`). It should read as an error cue, not a whisper.
2. **Light up the fields (root cause):** `FieldWrap` (`app/sales/sales-order/new/page.tsx:575-594`) renders only the children + a lock icon — it has **no error prop and no error UI**, so fields can never go red. The Zod `validationResults[stepId].errors` are computed at page level but never reach the inputs. Fix: give `FieldWrap` an `error?: string` prop; when present (only after `triedNext`), render the input with `border-destructive` (pass `aria-invalid` / an error class down to the control) **and** a `text-destructive text-xs` message beneath it. Wire it from the page: `error={triedNext ? validationResults[stepId]?.errors[fieldName] : undefined}`. Replicate across every create/edit wizard. This is what makes "light up the missing fields' borders" actually work.

**Done-check:** Click Next on an empty step → the hint is red and obvious, every required-but-empty field shows a red border + inline message, and focus lands on the first one.

### A3 — BLOCKER: redesign the "Review & Confirm" step to show ALL details + the selected items
User-confirmed: the review step is thin — it lists Customer/Company/dates + an item *count* + Grand Total, but **not the actual items** (`app/sales/sales-order/new/page.tsx:505-538`), and it sits inside a bordered box (`border border-border/60`).

**Implementation plan (apply to every doctype's step 3):**
1. **Header summary** — group all entered header fields as label/value pairs in a responsive grid: party, company, dates, addresses, contact, PO/reference, price list, currency — whatever the doctype captures (not just four fields). Skip empties cleanly.
2. **Line-items table** — render the full selected items: code/name, qty, UOM, rate, amount, warehouse (and any doctype-specific columns), with a totals row (subtotal, taxes if present, **Grand Total**). Reuse the same item-table styling as step 2 so review matches entry.
3. **Surface** — elevation-first per the system: `bg-card/40 rounded-2xl` (or grouped sections with `divide-y divide-border/40`), **no hard `border-border/60` box**. Generous padding.
4. **Tone** — a short confirming line ("Review everything below, then create the order — you can still go back to edit."). The items must be visible *before* the user commits.

**Done-check:** Step 3 shows every entered field + the full item list with totals, in an elevated borderless surface; nothing the user typed is hidden at confirm time.

### A4 — BLOCKER: the wizard is still not full width
User-confirmed: still narrow. Root cause — the page wraps the wizard in `<InfoCard className="max-w-5xl">` (`app/sales/sales-order/new/page.tsx:290`), a 1024px cap that leaves wide margins. **Remove the max-width cap** so the wizard fills the content column like the list/detail pages (`w-full`, no `max-w-*`; if some breathing room is wanted on ultra-wide, cap at the same width the detail pages use, not narrower). Verify on a 1440px+ screen the wizard spans the content area. Apply to every create/edit page that inherited the cap.

### A5 — Detail-page confirmation modal (`ConfirmDialog`) reimplementation
User-confirmed: the submit/delete modal on detail pages "still has awful UI — missing padding, black borders, generic button pattern per v3." Rework `components/smart/confirm-dialog.tsx`:
- **Padding:** the content has only `py-2` around children and relies on default dialog padding — give it real internal padding (`p-6`+), comfortable spacing between header/body/footer.
- **Surface:** drop `shadow-2xl` → `shadow-xl shadow-black/5`; reduce `rounded-3xl` → `rounded-2xl`; ensure no hard/black border (glass `bg-popover/95 backdrop-blur-xl` + hairline `border-border/40` only). Verify nothing renders a black border in either theme.
- **Buttons:** replace the generic `rounded-full` pill pair with the app's standard `<Button>` variants (primary/destructive + ghost/secondary cancel) so it matches every other action surface — consistent, not bespoke.
- Keep it a controlled Radix `AlertDialog`; just bring it to the premium-ui bar.

### A6 — Minor style miss
`app/accounting/journal-entry/new/page.tsx:382` still has `rounded-[1.5rem] border-2` → normalize to `rounded-2xl` + hairline/no border, per the surface system.

### A7 — Tracked debt (do NOT silently expand scope; flag for scheduling)
The **non-transactional** pages — accounting/buying/stock **module landings, `setup/*`, `settings/*`, masters** — are still off-palette and heavy (e.g. `accounting/page.tsx`, `accounting/setup/*`, `accounting/settings/*`). No phase has targeted them. Do **not** fold them into 2d ad hoc; note them so they get a dedicated "non-transactional UI normalization" pass (candidate for 2e or its own mini-phase).

---

## PART B — Phase 2d scope: Manufacturing

Build on the fixed golden template. End-to-end target: **Sales Order → Work Order → Stock Entry (Manufacture)**.

| Doctype | Notes / B4 spec gaps to resolve |
|---|---|
| **BOM** (Bill of Materials) | Quality Inspection link, scrap/loss items, fixed-time operations; resolve the BOM gaps in `BUSINESS_WORKFLOW_PART2_MODULE_SPECS.md`. Costing rollup (raw material + operating cost). |
| **Work Order** | UOM round-up on required qty; from Sales Order (auto-fill SO→WO). Status machine (Draft→Submitted→In Process→Completed). Add to `BUILT_MODULES`. |
| **Stock Entry (Manufacture)** | Already built (2a) — extend its purpose handling so a WO can issue **Material Transfer for Manufacture** and **Manufacture** entries; wire WO→SE. |
| **Quality Inspection** | If not already present, minimal create/detail; link from BOM/WO/receipt. |

Required wiring:
- **`AUTO_FILL_REGISTRY`**: Sales Order→Work Order, Work Order→Stock Entry (Manufacture), BOM→Work Order (items/operations).
- **`WIZARD_STEP_SCHEMAS`**: real step schemas for BOM and Work Order (registered, gating — like the existing ones).
- **B3 idempotency (critical here):** SO→WO is the canonical multi-create automation. A double-trigger (or a re-run of the create-work-orders action) must create **exactly one** Work Order per line. Use the deterministic idempotency key + `guardDuplicateCreation` from DECISIONS B3; test double-trigger = one effect.
- **FlowRail**: Work Order appears as a stage in the chain between Sales Order and Delivery (per `PURCHASE_FLOW`/sales flow); completed WO clickable, "Create →" gated by `isModuleBuilt`.
- **Part A1/B5 resolver** on every mutation (manufacturing throws plenty of business errors — BOM not found, insufficient raw material, WO over-production).

---

## PART C — Definition of Done & process

**One pass:** finish Part A and re-verify on an existing detail page, then build Part B.

**Automated (show outputs):**
- `tsc --noEmit` 0 errors; no `@ts-nocheck`/`any` in touched files.
- `vitest run` green, **plus**: SO→WO idempotency test (double-trigger = one WO); a resolver test for at least one manufacturing error class (e.g. insufficient raw material).
- Greps empty on touched files: `(text|bg|border)-(blue|amber|emerald|purple|indigo|teal|orange|rose|green)-[0-9]`, `bg-black`, `text-white`, `rounded-\[`, `shadow-2xl`, `Please fix the following`, and `toast\.error\(["'](Submit|Delete|Cancel) failed`.
- Factory-only: no `frappe-client`/`axios` in pages.

**Manual (live Frappe — attach proof):**
- [ ] Delivery Note / Sales Order submit with insufficient stock → guided dialog (Create MR prefilled), **not** a raw toast (proves A1)
- [ ] Click Next on an empty step → **red, visible** hint + every empty required field shows a **red border + inline message**, focus on the first (proves A2)
- [ ] Review & Confirm step shows **all** entered fields **and the full line-items table** with totals, in a borderless elevated surface (proves A3)
- [ ] Create wizard spans the full content width at 1440px+ (proves A4)
- [ ] Detail-page submit/delete confirm modal: real padding, no black borders, standard app buttons, lighter shadow — both themes (proves A5)
- [ ] Manufacturing end-to-end: BOM → Work Order (from SO) → Stock Entry (Manufacture); FlowRail shows the WO stage; stock moves correctly
- [ ] Double-trigger create-Work-Orders → exactly one WO per line
- [ ] BOM costing rollup correct; UOM round-up applied on WO required qty

**Report** grep/test outputs + screenshots: the guided dialog on a real stock error, the manufacturing end-to-end, and the idempotency proof.

---

## PART D — Security carry-forward (gates Phase 3)
`lib/auth/resolve-user.ts` is a dev stub; `createScopedFrappeClient` throws. Per-user RBAC (B1) must land before the AI phase. Do not start Phase 3 without it.
