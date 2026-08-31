# Phase 2W — Manufacturing Remediation + Pana Catalog Seed

**Base branch:** `feat/v4-phase-2v-mfg-e2e` (the 2V build branch — confirm it's merged/current before cutting)
**Cut new branch:** `feat/v4-phase-2w-catalog-seed`
**Contract:** Read `docs/v4/MESH_REPORTING_CONTRACT.md` in full before starting. End your build report with the **Rule 5** ordered manual live-retest checklist (route → action+values → expected → exact failure string), per the per-item checklists at the end of this doc.
**Definition of Done:** a part is DONE only when the user action works **end-to-end against the live ERPNext instance**. Green `tsc --noEmit` + `vitest run --testTimeout=60000` (expect 427/427) is the floor, not the finish line. For every Frappe write, capture the **exact** server response on failure — do not paraphrase it.

This round has two parts. **PART A** fixes the four items that failed/changed in the 2V live retest. **PART B** is the net-new Pana product catalog seed (items + BOMs + configurator data). Do PART A first (it's small and unblocks manufacturing retest); PART B is the bulk.

---

## Retest result that drives PART A (from the user, against live ERPNext)

| 2V item | Live result |
|---|---|
| P0-1 Bin warehouse fix | ✅ passes |
| P0-2 Shortfall → prefilled PO | ✅ passes |
| P0-3 Job Card visible | ✅ visible — **but starting a Job Card errors**, and per-operation JC creation is overkill for an SME (see A2) |
| P0-5 WO flow rail | ✅ passes |
| P0-6 Draft SO blank-form guard | ❌ **FAILS** — a draft SO still redirects to a blank, non-prefilled WO create page |
| P0-7 Job Card lifecycle (WO detail + JC module) | ❌ **FAILS** — still broken in both places |
| P1-1 Notification CRUD context | ❌ **FAILS** — no CRUD context displayed at all |
| P1-2 Warehouse defaults prefill | ❌ **FAILS** — prefills nowhere, **especially the WO create module** |

---

# PART A — Manufacturing remediation (P0)

## A1 — P0-6: Draft Sales Order must NOT reach a blank Work Order form

**Symptom (live):** Opening a **draft** (docstatus 0) Sales Order, the flow still offers a Work-Order create affordance that navigates to `/manufacturing/work-order/new?...` with no prefill. The 2V `disableCreate` prop did not actually block it.

**Root-cause hypotheses — verify all three; the miss is almost certainly #2 or #3:**
1. `disableCreate` was wired to the FlowRail **focus zone** only, but the **ribbon node** for the "Work Order" stage still renders its own `<Link>`/router.push to `getDocTypeCreateUrl("Work Order", ...)` regardless of the flag.
2. There is a **second create affordance** on the SO detail page (the WhatsNext card and/or the Manufacturing card "Create Work Orders" button) that was never gated on docstatus.
3. `onCreateDownstream` only intercepts when a default BOM exists; when it doesn't, the handler falls through to navigation instead of staying inert.

**Required fix — gate EVERY create affordance on `docstatus === 1`:**
- Audit `app/sales/sales-order/[name]/page.tsx` for **all** paths that can create a downstream Work Order: FlowRail focus zone, FlowRail ribbon stage node, WhatsNext card, Manufacturing card button. There must be **zero** reachable `/work-order/new` link when the SO is a draft.
- For a draft SO, each affordance renders **inert + disabled** with tooltip **"Submit the Sales Order first."** No `<Link>`, no `router.push`, no `onClick` that navigates.
- For a submitted SO, the affordance calls the **inline** `executeCreateWorkOrders` engine (the one that passed P0 in 2V), never `getDocTypeCreateUrl`.
- In `components/flows/FlowRail.tsx`: when `disableCreate` is true, the ribbon stage node must render as a non-interactive disabled chip (no anchor, `aria-disabled`, tooltip), not just suppress the focus-zone button.

**Retest:** see A-RETEST #1.

---

## A2 — P0-3 follow-up + P0-7: Job Card automation + lifecycle (the SME ask)

The user's exact ask: *"automate the operations or auto-create one for each job card because for an SME this is overkill — automate and prefill the required operation and workstation fields then proceed to auto-create on the WO without redirecting to the job-create page."* Plus: starting a Job Card currently **errors**, and the lifecycle is dead on both the WO detail page and the standalone Job Card module.

This is one cohesive fix. ERPNext truths (confirm against live, but these are standard v15):
- A Work Order spawns Job Cards **only from its BOM's routing operations**. No operations → no Job Cards.
- A Job Card requires an **Operation** and a **Workstation**; both are mandatory masters.
- Job Card lifecycle: `Open` → (Start: append a `time_logs` row with `from_time` + `employee`, status → `Work In Progress`) → (Complete: set the open time log's `to_time` + `completed_qty`, status → `Completed`, then **submit** the Job Card, docstatus 0 → 1).

### A2.1 — Provision default manufacturing masters (so SMEs never hand-build them)
Auto-ensure these exist (idempotent — create only if absent). Seed them in PART B's script too, but the app must self-heal if missing:
- **Workstation** `Pana Print Floor` (no hour-rate complexity required; `hour_rate` 0 is fine).
- **Operation** `Print & Finish` (the single catch-all operation for the print shop).

### A2.2 — One Job Card per Work Order, auto-created inline, no redirect
- The Quick BOM path (PART B + the 2V `ensureBomNo`) must attach **exactly one routing operation** row to the BOM: operation `Print & Finish`, workstation `Pana Print Floor`, `time_in_mins` a sane default (e.g. 30). This yields **one** Job Card per WO — not one per raw component.
- On the WO detail page (`app/manufacturing/work-order/[name]/page.tsx`), `handleCreateJobCards` must **create the Job Card inline** (via the create mutation) with `operation` and `workstation` **prefilled** from the WO's routing — and **must not** `router.push` to `/manufacturing/job-card/new`. If the WO has no routing (legacy WO), auto-provision the single default operation on the fly, then create the JC.
- Remove/disable any "Auto-Create Job Cards" affordance that errors when the BOM has no operations — it should instead provision the default operation and proceed.

### A2.3 — Job Card lifecycle (the Start error)
**First action for the mesh:** reproduce the Start error against live ERPNext and **paste the exact Frappe error string** into the build report. Do not guess-fix. Strong hypothesis: Start fails because the `time_logs` row is missing a mandatory field (`employee` and/or `from_time`), or because Start is being attempted on a JC with no workstation.

Implement a **two-button simplified lifecycle** on BOTH the WO-detail JC table row AND the standalone `app/manufacturing/job-card/[name]/page.tsx`:
- **Start** (visible when status is `Open`): write `status: "Work In Progress"` and append a `time_logs` row `{ employee: <selected or default>, from_time: <now>, completed_qty: 0 }`. Employee comes from the inline FrappeSelect (A2.4); if none selected, block with a guided message "Assign an employee to start." Use `useFrappeUpdate` with optimistic refetch.
- **Complete** (visible when status is `Work In Progress`): set the open time log's `to_time: <now>` and `completed_qty: <for_quantity>`, status → `Completed`, then **submit** the Job Card (docstatus → 1). Surface any backflush/validation error via `GuidedErrorDialog` with the verbatim Frappe message.
- The button label/badge must visibly change on each transition (the user explicitly reported "JC start works but no UX changes, it just displays Start again"). Drive the button purely off `status` so the optimistic update flips it immediately.

### A2.4 — Employee assignment (standard ERPNext, confirmed)
- Job Card `employee` is a **Table MultiSelect** child field. Write shape: `employee: [{ employee: "<EMP-ID>" }]` (append as a union row — do not clobber existing rows).
- Add `employee` to the JC query `fields` on the WO detail page (it was added in 2V — verify it's actually in the list and rendering).
- Inline FrappeSelect of `Employee` in the JC table row and on the JC detail page; on select, write the union array via `useFrappeUpdate`. Persist across refetch. Surface field errors verbatim.

**Retest:** see A-RETEST #2, #3, #4.

---

## A3 — P1-1: Notification CRUD context (producers were never wired)

**Symptom (live):** the 2V change extended the store shape (`doctype`, `docName`, `operation`, `summary`) and the panel UI, but **no CRUD context shows** — because the **producers** (the success handlers that emit notifications) were never updated to pass those fields. The store carries empty fields.

**Required fix:**
- In `hooks/generic/useFrappeMutation.ts` (and any other create/update/delete success path that calls `notify`/the notification store), populate the CRUD context on emit:
  - `doctype` = the doctype acted on
  - `docName` = the resulting/affected document name
  - `operation` = `"create" | "update" | "delete" | "submit" | "cancel"`
  - `summary` = a short human line (e.g. `"Created Sales Order SAL-ORD-2026-00042"`)
- Verify `components/notifications/notifications-panel.tsx` renders the "CRUD Operation" detail section only when these fields are present, and that clicking a notification both shows the detail AND (where applicable) deep-links to the doc via `getDocTypeRoute` (respect the orphaned-registry rule — Job Card route now resolves).
- Add/extend a unit test asserting that a create mutation emits a notification carrying `{doctype, docName, operation:"create", summary}`.

**Retest:** see A-RETEST #5.

---

## A4 — P1-2: Warehouse defaults must prefill the create forms (esp. Work Order)

**Symptom (live):** prefills nowhere, **especially the WO create module** (which was never touched in 2V).

**Root-cause checks:**
1. `work-order/new` was **not** modified in 2V → no prefill code exists there. Add it.
2. The 2V `resolveCompanyWarehouses` effect on `stock-entry/new` / `purchase-receipt/new` may be resolving names that don't match the live warehouse records, OR running before the form hydrates so the value is overwritten by an empty default. Root-cause with the live warehouse list.

**Required fix:**
- `app/manufacturing/work-order/new/page.tsx`: on mount (and when company resolves), prefill `source_warehouse` (= Stores), `wip_warehouse` (= WIP), `fg_warehouse` (= Finished Goods) from `resolveCompanyWarehouses` / `fetchWarehouseDefaults`. This is the highest-priority surface per the user.
- `app/stock/material-request/new/page.tsx`: prefill the target warehouse from defaults (2V left this as a known gap).
- Re-verify `stock-entry/new` and `purchase-receipt/new` actually apply the value on the live instance (set state **after** the form's initial hydration; guard so a user edit isn't clobbered on refetch).
- If a default can't be resolved, leave the field empty and **do not** throw — log once.

**Retest:** see A-RETEST #6, #7.

---

# PART B — Pana Product Catalog Seed (items + BOMs + configurator data)

**Goal:** stand up the **real Pana print-shop catalog** in Frappe so the Pana SME can quote/sell/produce every product, and the V4 configurator drives correct ETB pricing and correct BOM components. Source of truth for the catalog: `C:\Users\kidus\Documents\Projects\printonline-et\docs\client-data\Products list.pdf` (transcribed in full below — build from THIS doc, you don't need the PDF) and the e-commerce schema in `printonline-et/supabase/migrations` (option/matrix model).

## B0 — Architecture decisions (read before coding)

**ADR-B1 — Configurator and BOM share ONE source of truth.** `components/configurator/ItemConfigurator.tsx` reads `OPTION_SETS[itemCode]` and `resolveComponents()` already returns BOM lines from each selected choice's `component_item` + `qty_formula`. Therefore: each finished good's **default BOM = the components of its option-set's Common/default selections**. Do not invent a parallel BOM data model. `item_code` of each finished good === its `OPTION_SETS` key.

**ADR-B2 — Pricing is a matrix where the catalog is non-additive.** The live configurator did `basePrice + Σ price_delta`. Several products price as a **matrix** (the price of one option depends on another — e.g. lamination is +1.00 ETB on a 1-side card, +2.00 on a 2-side card). Extend the model with a `pricing` discriminator:
- `{ mode: "additive", basePrice }` — price = `basePrice + Σ price_delta`.
- `{ mode: "matrix", keyOrder, table }` — price = `table[key]`, where `key` = the `value` tokens of the groups named in `keyOrder`, joined by `"|"`.
- **Matrix products:** Business Cards, Flyers, Folders, Posters, Paper Sticker Sheets, Bookmarks.
- **Additive/flat:** Letterhead, Certificate, Envelopes, Gift Bags, Brochure.
- **Pricing TBD (PDF truncated — seed a placeholder base and flag in the report):** Saddle/Perfect/Spiral Booklets (page-count driven), Notebooks. Print-and-Cut Stickers is marked "Not Finished" in the source — seed as a made-to-order sales item with **no** default BOM, flagged.

**ADR-B3 — Finished goods are made-to-order, one default BOM each, one routing operation.** Each product is an `Item` with `is_sales_item=1`, `is_stock_item=1`, `include_item_in_manufacturing=1`. Each gets a **default BOM** (`is_default=1`, `is_active=1`, `with_operations=1`) carrying the Common-selection components and the single `Print & Finish` operation at `Pana Print Floor` (so exactly one Job Card spawns per WO — ties to A2). Raw-material Items = the union of all `component_item` codes.

**ADR-B4 — Idempotent, additive, non-destructive.** Reuse the existing `scripts/seed-data.js` conventions exactly (Node, `/api/resource/`, token auth, `createIfNotExists`). Never delete or overwrite existing docs. Safe to re-run.

## B1 — `lib/configurator/types.ts` (extend)

Add `value` and `is_default` to choices; add `pricing`, `category`, `min_qty` to the set; add the pricing discriminator. Keep existing fields for back-compat.

```ts
export interface OptionChoice {
  label: string;
  value?: string;          // stable token for matrix keys; defaults to label if absent
  price_delta: number;     // used in additive mode; 0 in matrix mode
  component_item?: string; // raw-material Item code consumed when chosen
  qty_formula?: number;    // qty of component per finished unit (default 1)
  is_default?: boolean;    // the "Common" selection — seeds the default BOM
}

export interface OptionGroup {
  name: string;
  type: "single" | "multi";
  choices: OptionChoice[];
}

export type Pricing =
  | { mode: "additive"; basePrice: number }
  | { mode: "matrix"; keyOrder: string[]; table: Record<string, number> };

export interface OptionSet {
  item_code: string;
  item_name: string;
  category: string;        // ERPNext Item Group
  min_qty: number;         // minimum order quantity (50 / 25 / 24)
  pricing: Pricing;
  options: OptionGroup[];
}

export interface ConfiguredLine {
  item_code: string;
  description: string;
  options: Record<string, string | string[]>;
  rate: number;
  components: Array<{ item_code: string; qty: number }>;
}
```

**Matrix key builder (add to the configurator):**
```ts
function matrixKey(set: OptionSet, selections: Selections): string {
  if (set.pricing.mode !== "matrix") return "";
  return set.pricing.keyOrder
    .map((groupName) => {
      const group = set.options.find((g) => g.name === groupName)!;
      const label = selections[groupName] as string;
      const choice = group.choices.find((c) => c.label === label)!;
      return choice.value ?? choice.label;
    })
    .join("|");
}
```

## B2 — `components/configurator/ItemConfigurator.tsx` (extend pricing)

- Initial selections must honor `is_default` (pick the default choice, not `choices[0]`):
  ```ts
  s[group.name] = group.type === "single"
    ? (group.choices.find((c) => c.is_default)?.label ?? group.choices[0].label)
    : [];
  ```
- Replace the `computedRate` logic:
  ```ts
  const computedRate = useMemo(() => {
    if (!optionSet) return 0;
    if (optionSet.pricing.mode === "matrix") {
      const key = matrixKey(optionSet, selections);
      return optionSet.pricing.table[key] ?? basePrice; // fallback flagged below
    }
    let delta = 0;
    for (const group of optionSet.options) {
      const sel = selections[group.name];
      const labels = group.type === "single" ? [sel as string] : (sel as string[]);
      for (const label of labels) {
        const choice = group.choices.find((c) => c.label === label);
        if (choice) delta += choice.price_delta;
      }
    }
    return optionSet.pricing.basePrice + delta;
  }, [optionSet, selections, basePrice]);
  ```
- If a matrix key misses the table, render a non-blocking inline warning ("Price unavailable for this combination — contact sales") and disable Confirm. Do **not** silently fall back to a wrong number.
- Show `min_qty` in the dialog ("Minimum order: {min_qty} units") and pass it through `ConfiguredLine` consumers where quantity is set (enforce at the SO line, not just visually).

## B3 — `lib/configurator/option-sets.ts` (REPLACE entirely with the 16 real products)

This is the curated catalog — transcribe **verbatim**; the prices are real ETB and customer-facing. `value` tokens are the matrix tokens. Mark each Common choice `is_default: true`. (Where pricing is TBD, the `basePrice` is a flagged placeholder — call it out in the report so the client can confirm.)

```ts
import type { OptionSet } from "./types";

export const OPTION_SETS: Record<string, OptionSet> = {
  // 1 ─────────────────────────────────────────────────────────────────────
  "BUSINESS-CARDS": {
    item_code: "BUSINESS-CARDS",
    item_name: "Business Cards",
    category: "Business Cards",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Print Sides", "Paper Thickness", "Lamination"],
      table: {
        "front|250|none": 3.5, "front|250|matte": 4.5, "front|250|glossy": 4.5,
        "front|300|none": 4.0, "front|300|matte": 5.0, "front|300|glossy": 5.0,
        "both|250|none": 7.0,  "both|250|matte": 9.0,  "both|250|glossy": 9.0,
        "both|300|none": 8.0,  "both|300|matte": 10.0, "both|300|glossy": 10.0,
      },
    },
    options: [
      { name: "Size", type: "single", choices: [
        { label: "Standard (8.5 × 5.5 cm)", value: "std", price_delta: 0, is_default: true },
        { label: "US Standard (9 × 5.4 cm)", value: "us", price_delta: 0 },
      ]},
      { name: "Print Sides", type: "single", choices: [
        { label: "Front Print Only", value: "front", price_delta: 0 },
        { label: "Both Side Print", value: "both", price_delta: 0, is_default: true },
      ]},
      { name: "Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1 },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1, is_default: true },
      ]},
      { name: "Corners", type: "single", choices: [
        { label: "Rounded", value: "rounded", price_delta: 0, is_default: true },
        { label: "Sharp Edge", value: "sharp", price_delta: 0 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 2 ─────────────────────────────────────────────────────────────────────
  "BROCHURE": {
    item_code: "BROCHURE",
    item_name: "Brochure (150gsm)",
    category: "Brochures",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 40 }, // A4 = 40, A3 = +40
    options: [
      { name: "Type", type: "single", choices: [
        { label: "Tri-fold", value: "tri", price_delta: 0, is_default: true },
        { label: "Bi-fold", value: "bi", price_delta: 0 },
        { label: "Z-fold", value: "z", price_delta: 0 },
      ]},
      { name: "Unfolded Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
        { label: "A3 (42 × 29.7 cm)", value: "a3", price_delta: 40, component_item: "PAPER-150GSM", qty_formula: 2 },
      ]},
    ],
  },

  // 3 ─────────────────────────────────────────────────────────────────────
  "FLYERS": {
    item_code: "FLYERS",
    item_name: "Flyers",
    category: "Flyers",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Size", "Paper Thickness", "Print Sides"],
      table: {
        "dl|80|front": 7,  "a6|80|front": 5,  "a5|80|front": 10, "a4|80|front": 20,
        "dl|80|both": 14,  "a6|80|both": 10,  "a5|80|both": 20,  "a4|80|both": 40,
        "dl|150|front": 9, "a6|150|front": 7, "a5|150|front": 14, "a4|150|front": 28,
        "dl|150|both": 18, "a6|150|both": 14, "a5|150|both": 28, "a4|150|both": 54,
      },
    },
    options: [
      { name: "Size", type: "single", choices: [
        { label: "DL (9.9 × 21 cm)", value: "dl", price_delta: 0, is_default: true },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0 },
      ]},
      { name: "Print Sides", type: "single", choices: [
        { label: "Front Print Only", value: "front", price_delta: 0, is_default: true },
        { label: "Both Side Print", value: "both", price_delta: 0 },
      ]},
      { name: "Paper Thickness", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 1 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
      ]},
    ],
  },

  // 4 ─────────────────────────────────────────────────────────────────────
  // Booklets: PDF price table truncated. basePrice is a FLAGGED PLACEHOLDER.
  "SADDLE-BOOKLET": {
    item_code: "SADDLE-BOOKLET",
    item_name: "Saddle-Stitched Booklet",
    category: "Booklets",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): page-count pricing
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Inside Paper Type", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 2 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 2, is_default: true },
        { label: "Same as cover paper", value: "same", price_delta: 0 },
      ]},
      // No of Pages: free numeric (multiple of 4). Model as a quantity-style input in the SO line, not a fixed choice.
    ],
  },

  // 5 ─────────────────────────────────────────────────────────────────────
  "PERFECT-BOOKLET": {
    item_code: "PERFECT-BOOKLET",
    item_name: "Perfect-Bound Booklet",
    category: "Booklets",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): page-count pricing
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Inside Paper Type", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 2 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 2, is_default: true },
        { label: "Same as cover paper", value: "same", price_delta: 0 },
      ]},
    ],
  },

  // 6 ─────────────────────────────────────────────────────────────────────
  "SPIRAL-BOOKLET": {
    item_code: "SPIRAL-BOOKLET",
    item_name: "Wire-Bound (Spiral) Booklet",
    category: "Booklets",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): page-count pricing
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, is_default: true },
        { label: "A3 (42 × 29.7 cm)", value: "a3", price_delta: 0 },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Binding Alignment", type: "single", choices: [
        { label: "Left", value: "left", price_delta: 0, is_default: true },
        { label: "Top", value: "top", price_delta: 0 },
        { label: "Right", value: "right", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Inside Paper Type", type: "single", choices: [
        { label: "80 gsm", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 2 },
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 2, is_default: true },
        { label: "Same as cover paper", value: "same", price_delta: 0 },
      ]},
      // Binding component: SPIRAL-COIL qty 1 — add to the default BOM (B4) since it's intrinsic to this product.
    ],
  },

  // 7 ─────────────────────────────────────────────────────────────────────
  "LETTERHEAD": {
    item_code: "LETTERHEAD",
    item_name: "Letterhead (80gsm, one side)",
    category: "Stationery",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 15 },
    options: [
      // No configurable options; fixed 80gsm one-side print.
      { name: "Paper", type: "single", choices: [
        { label: "80 gsm Plain", value: "80", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 1, is_default: true },
      ]},
    ],
  },

  // 8 ─────────────────────────────────────────────────────────────────────
  "GIFT-BAG": {
    item_code: "GIFT-BAG",
    item_name: "Premium Gift Bag",
    category: "Promotional",
    min_qty: 50,
    pricing: { mode: "additive", basePrice: 250 }, // A5 = 250, A4 = +100 (350)
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 2 },
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 100, component_item: "PAPER-300GSM", qty_formula: 2, is_default: true },
      ]},
      { name: "Orientation", type: "single", choices: [
        { label: "Portrait", value: "portrait", price_delta: 0, is_default: true },
        { label: "Landscape", value: "landscape", price_delta: 0 },
      ]},
      { name: "Handle Rope Colors", type: "single", choices: [
        { label: "White", value: "white", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1, is_default: true },
        { label: "Black", value: "black", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1 },
        { label: "Blue", value: "blue", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1 },
        { label: "Burgundy", value: "burgundy", price_delta: 0, component_item: "HANDLE-ROPE", qty_formula: 1 },
      ]},
    ],
  },

  // 9 ─────────────────────────────────────────────────────────────────────
  "FOLDER": {
    item_code: "FOLDER",
    item_name: "Presentation Folder (300gsm)",
    category: "Stationery",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Print Sides", "Pocket"],
      table: {
        "front|1": 350, "front|2": 380,
        "both|1": 400,  "both|2": 450,
      },
    },
    options: [
      { name: "Print Sides", type: "single", choices: [
        { label: "Front Print Only", value: "front", price_delta: 0, is_default: true },
        { label: "Both Side Print", value: "both", price_delta: 0 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      { name: "Pocket", type: "single", choices: [
        { label: "Right Side (1 pocket)", value: "1", price_delta: 0, is_default: true },
        { label: "Left & Right (2 pockets)", value: "2", price_delta: 0 },
      ]},
      // Body paper: PAPER-300GSM qty 1 — add in default BOM (B4).
    ],
  },

  // 10 ────────────────────────────────────────────────────────────────────
  "POSTER": {
    item_code: "POSTER",
    item_name: "Poster (A3)",
    category: "Large Format",
    min_qty: 50,
    pricing: {
      mode: "matrix",
      keyOrder: ["Paper Thickness", "Lamination"],
      table: {
        "150|none": 54, "150|matte": 70, "150|glossy": 70,
        "250|none": 70, "250|matte": 90, "250|glossy": 90,
      },
    },
    options: [
      { name: "Paper Thickness", type: "single", choices: [
        { label: "150 gsm", value: "150", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0, is_default: true },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1 },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 11 ────────────────────────────────────────────────────────────────────
  "ENVELOPE": {
    item_code: "ENVELOPE",
    item_name: "Envelope",
    category: "Stationery",
    min_qty: 25,
    pricing: { mode: "additive", basePrice: 25 }, // DL 25, A5 +10 (35), A4 +25 (50)
    options: [
      { name: "Size", type: "single", choices: [
        { label: "DL (9.9 × 21 cm)", value: "dl", price_delta: 0, component_item: "PAPER-150GSM", qty_formula: 1, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 10, component_item: "PAPER-150GSM", qty_formula: 1 },
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 25, component_item: "PAPER-150GSM", qty_formula: 1 },
      ]},
    ],
  },

  // 12 ────────────────────────────────────────────────────────────────────
  "STICKER-SHEET": {
    item_code: "STICKER-SHEET",
    item_name: "Paper Sticker Sheet",
    category: "Stickers & Labels",
    min_qty: 24,
    pricing: {
      mode: "matrix",
      keyOrder: ["Size", "Lamination"],
      table: {
        "a4|none": 50, "a4|matte": 60, "a4|glossy": 60,
        "a5|none": 25, "a5|matte": 30, "a5|glossy": 30,
        "a6|none": 13, "a6|matte": 15, "a6|glossy": 15,
      },
    },
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1, is_default: true },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1 },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1 },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0, is_default: true },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1 },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 13 ────────────────────────────────────────────────────────────────────
  "NOTEBOOK": {
    item_code: "NOTEBOOK",
    item_name: "Notebook",
    category: "Stationery",
    min_qty: 1,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): pricing not in source PDF
    options: [
      { name: "Size", type: "single", choices: [
        { label: "A4 (29.7 × 21 cm)", value: "a4", price_delta: 0 },
        { label: "A5 (21 × 14.85 cm)", value: "a5", price_delta: 0, is_default: true },
        { label: "A6 (14.85 × 10.5 cm)", value: "a6", price_delta: 0 },
      ]},
      { name: "Number of Sheets", type: "single", choices: [
        { label: "25 Sheets", value: "25", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 25 },
        { label: "50 Sheets", value: "50", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 50, is_default: true },
        { label: "100 Sheets", value: "100", price_delta: 0, component_item: "PAPER-80GSM", qty_formula: 100 },
      ]},
      { name: "Filler Paper", type: "single", choices: [
        { label: "Blank", value: "blank", price_delta: 0 },
        { label: "College Ruled", value: "ruled", price_delta: 0, is_default: true },
        { label: "Custom Full Color", value: "custom", price_delta: 0 },
      ]},
      { name: "Cover Page Print", type: "single", choices: [
        { label: "Cover Pages only", value: "cover", price_delta: 0, is_default: true },
        { label: "Print Including Cover Insides", value: "cover_inside", price_delta: 0 },
      ]},
      { name: "Cover Paper Thickness", type: "single", choices: [
        { label: "250 gsm", value: "250", price_delta: 0, component_item: "PAPER-250GSM", qty_formula: 1, is_default: true },
        { label: "300 gsm", value: "300", price_delta: 0, component_item: "PAPER-300GSM", qty_formula: 1 },
      ]},
      { name: "Cover Paper Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
    ],
  },

  // 14 ────────────────────────────────────────────────────────────────────
  // Print & Cut Stickers — marked "Not Finished" in source. Sales item, NO default BOM (B4 skips it).
  "PRINT-CUT-STICKER": {
    item_code: "PRINT-CUT-STICKER",
    item_name: "Print & Cut Stickers",
    category: "Stickers & Labels",
    min_qty: 1,
    pricing: { mode: "additive", basePrice: 0 }, // TODO(client): incomplete spec
    options: [
      { name: "Print Material", type: "single", choices: [
        { label: "Paper Sticker", value: "paper", price_delta: 0, component_item: "PAPER-STICKER", qty_formula: 1, is_default: true },
        { label: "Vinyl Sticker", value: "vinyl", price_delta: 0, component_item: "VINYL-STICKER", qty_formula: 1 },
      ]},
    ],
  },

  // 15 ────────────────────────────────────────────────────────────────────
  "CERTIFICATE": {
    item_code: "CERTIFICATE",
    item_name: "Certificate Paper (A4)",
    category: "Stationery",
    min_qty: 1,
    pricing: { mode: "additive", basePrice: 40 }, // White Hard 40, Textured/Golden 60
    options: [
      { name: "Paper Type", type: "single", choices: [
        { label: "White Hard Paper (300gsm)", value: "white", price_delta: 0, component_item: "CERT-WHITE-300", qty_formula: 1, is_default: true },
        { label: "Textured Paper (250gsm)", value: "textured", price_delta: 20, component_item: "CERT-TEXTURED-250", qty_formula: 1 },
        { label: "Golden Frame Paper", value: "golden", price_delta: 20, component_item: "CERT-GOLDEN", qty_formula: 1 },
      ]},
    ],
  },

  // 16 ────────────────────────────────────────────────────────────────────
  "BOOKMARK": {
    item_code: "BOOKMARK",
    item_name: "Bookmark (5 × 15 cm, 300gsm)",
    category: "Promotional",
    min_qty: 1,
    pricing: {
      mode: "matrix",
      keyOrder: ["Print Side", "Lamination"],
      table: {
        "front|none": 10, "front|matte": 12, "front|glossy": 12,
        "both|none": 20,  "both|matte": 24,  "both|glossy": 24,
      },
    },
    options: [
      { name: "Print Side", type: "single", choices: [
        { label: "Front Only", value: "front", price_delta: 0 },
        { label: "Both Side", value: "both", price_delta: 0, is_default: true },
      ]},
      { name: "Lamination", type: "single", choices: [
        { label: "None", value: "none", price_delta: 0 },
        { label: "Matte", value: "matte", price_delta: 0, component_item: "LAM-MATTE", qty_formula: 1, is_default: true },
        { label: "Glossy", value: "glossy", price_delta: 0, component_item: "LAM-GLOSSY", qty_formula: 1 },
      ]},
      // Body paper: PAPER-300GSM qty 1 — add in default BOM (B4).
    ],
  },
};
```

> **Yield note (deferred, flag in report):** `qty_formula` is kept at 1 sheet per finished unit for most cuts to keep the SME BOM legible. True sheet-yield (many business cards per A4 sheet, A5 = ½ A4, etc.) is a later refinement — do not block on it. Where a product intrinsically needs a non-default-choice component (Spiral coil, Folder body, Bookmark body), add it directly in the BOM table (B4), not via an option choice.

## B4 — `scripts/seed-pana-catalog.js` (the seed script)

Model on `scripts/seed-data.js` **exactly** (same `frappeRequest`, `createIfNotExists`, token auth from `ERP_API_KEY`/`ERP_API_SECRET`, `NEXT_PUBLIC_ERP_API_URL`). Idempotent and additive. Order of operations matters (dependencies):

**Step 1 — Item Groups** (create if absent; `is_group` parents first):
- Parents: `Pana Print Products` (is_group 1), `Pana Raw Materials` (is_group 1).
- Product groups under `Pana Print Products`: `Business Cards`, `Brochures`, `Flyers`, `Booklets`, `Stationery`, `Promotional`, `Stickers & Labels`, `Large Format`.
- Raw groups under `Pana Raw Materials`: `Paper Stock`, `Lamination`, `Binding & Finishing`.

**Step 2 — Manufacturing masters** (ties to A2):
- Workstation `Pana Print Floor`.
- Operation `Print & Finish`.

**Step 3 — Raw-material Items** (`is_stock_item=1, is_purchase_item=1, is_sales_item=0`, `stock_uom: "Nos"`, set a nominal `valuation_rate` so BOM cost ≠ 0). The full set (union of every `component_item` plus the intrinsic body components):

| item_code | item_name | item_group | valuation_rate (ETB, nominal) |
|---|---|---|---|
| PAPER-80GSM | Paper 80gsm (sheet) | Paper Stock | 1.0 |
| PAPER-150GSM | Paper 150gsm (sheet) | Paper Stock | 1.5 |
| PAPER-250GSM | Paper 250gsm (sheet) | Paper Stock | 2.0 |
| PAPER-300GSM | Paper 300gsm (sheet) | Paper Stock | 2.5 |
| LAM-MATTE | Matte Lamination Film (sheet) | Lamination | 0.5 |
| LAM-GLOSSY | Glossy Lamination Film (sheet) | Lamination | 0.5 |
| PAPER-STICKER | Paper Sticker Stock (sheet) | Paper Stock | 3.0 |
| VINYL-STICKER | Vinyl Sticker Stock (sheet) | Paper Stock | 5.0 |
| CERT-WHITE-300 | Certificate White Hard 300gsm (sheet) | Paper Stock | 4.0 |
| CERT-TEXTURED-250 | Certificate Textured 250gsm (sheet) | Paper Stock | 6.0 |
| CERT-GOLDEN | Certificate Golden Frame (sheet) | Paper Stock | 6.0 |
| HANDLE-ROPE | Gift Bag Handle Rope (set) | Binding & Finishing | 5.0 |
| SPIRAL-COIL | Spiral Binding Coil | Binding & Finishing | 3.0 |
| STAPLE-WIRE | Saddle Staple Wire (set) | Binding & Finishing | 0.5 |
| BIND-GLUE | Perfect-Bind Glue (unit) | Binding & Finishing | 1.0 |

**Step 4 — Finished-good Items** (one per OPTION_SETS key; `is_sales_item=1, is_stock_item=1, is_purchase_item=0, include_item_in_manufacturing=1`, `stock_uom: "Nos"`, `item_group` = the OptionSet `category`, `min_order_qty` = `min_qty`). Item names from the option-sets. **Do not** set `default_bom` yet (BOM doesn't exist until Step 6).

**Step 5 — Item Prices** (price list `Standard Selling`, currency ETB). Base selling rate = the Common-combination price for each product:

| item_code | base rate (ETB) | basis |
|---|---|---|
| BUSINESS-CARDS | 10.0 | both/300/matte |
| BROCHURE | 40.0 | A4 |
| FLYERS | 9.0 | DL/150/front |
| LETTERHEAD | 15.0 | flat |
| GIFT-BAG | 350.0 | A4 |
| FOLDER | 350.0 | front/1-pocket |
| POSTER | 54.0 | 150/none |
| ENVELOPE | 25.0 | DL |
| STICKER-SHEET | 50.0 | A4/none |
| CERTIFICATE | 40.0 | white |
| BOOKMARK | 24.0 | both/matte |
| SADDLE-BOOKLET / PERFECT-BOOKLET / SPIRAL-BOOKLET / NOTEBOOK / PRINT-CUT-STICKER | — | **skip** (pricing TBD; report it) |

**Step 6 — Default BOMs** (one per manufacturable finished good; **skip** `PRINT-CUT-STICKER` and any TBD-priced product only if you also want to skip its BOM — but a BOM with components is still useful for WO, so prefer to create BOMs for ALL except `PRINT-CUT-STICKER`). Each BOM:
- `item` = finished good code, `quantity` = 1, `currency` = "ETB", `company` = the active company, `is_default` = 1, `is_active` = 1, `with_operations` = 1.
- `operations` = `[{ operation: "Print & Finish", workstation: "Pana Print Floor", time_in_mins: 30 }]`.
- `items` = the **Common-selection components** for that product (derive from the option-set defaults), PLUS any intrinsic body component below.

Default BOM component tables (derived from the `is_default` choices + intrinsic bodies):

| finished good | BOM items (item_code × qty) |
|---|---|
| BUSINESS-CARDS | PAPER-300GSM ×1, LAM-MATTE ×1 |
| BROCHURE | PAPER-150GSM ×1 |
| FLYERS | PAPER-150GSM ×1 |
| SADDLE-BOOKLET | PAPER-250GSM ×1 (cover), PAPER-150GSM ×2 (inside), LAM-MATTE ×1, STAPLE-WIRE ×1 |
| PERFECT-BOOKLET | PAPER-250GSM ×1, PAPER-150GSM ×2, LAM-MATTE ×1, BIND-GLUE ×1 |
| SPIRAL-BOOKLET | PAPER-250GSM ×1, PAPER-150GSM ×2, LAM-MATTE ×1, SPIRAL-COIL ×1 |
| LETTERHEAD | PAPER-80GSM ×1 |
| GIFT-BAG | PAPER-300GSM ×2, HANDLE-ROPE ×1 |
| FOLDER | PAPER-300GSM ×1, LAM-MATTE ×1 |
| POSTER | PAPER-150GSM ×1 |
| ENVELOPE | PAPER-150GSM ×1 |
| STICKER-SHEET | PAPER-STICKER ×1 |
| NOTEBOOK | PAPER-250GSM ×1 (cover), PAPER-80GSM ×50 (sheets), LAM-MATTE ×1 |
| CERTIFICATE | CERT-WHITE-300 ×1 |
| BOOKMARK | PAPER-300GSM ×1, LAM-MATTE ×1 |
| PRINT-CUT-STICKER | — (no BOM; incomplete spec) |

- **Submit each BOM** after creation (BOM must be submitted, docstatus 1, to be selectable on a Work Order). Capture the exact error if submit fails (common: missing `valuation_rate` on a raw item → Step 3 sets it; missing company default warehouse → ensure company is configured).

**Step 7 — Back-fill `default_bom`** on each finished-good Item with its submitted BOM name (PUT the Item). This is what lets the SO→WO inline engine and Quick BOM resolve a BOM without prompting.

**Step 8 — Console summary**: counts created/skipped per step, and an explicit list of the **pricing-TBD** products and the **PRINT-CUT-STICKER no-BOM** skip, so the user knows exactly what needs client confirmation.

**Wire it up:** add `"seed:catalog": "node scripts/seed-pana-catalog.js"` to `package.json` scripts.

---

## Guardrails

- **Locked / do-not-touch** (untouched unless a fix explicitly requires it, and then surgically): `lib/flows/flow-graph.ts` (`resolveFlowGraph`/BFS), `app/api/flows/resolve/route.ts`, `tests/flow-resolver.test.ts` mock incl. the `check_parent_permission` guard at ~167-177, `lib/flows/flow-chain-resolver.ts` resolver internals beyond the routeMap, `lib/stock/warehouse-defaults.ts` core resolver, payment-allocation logic.
- **No `any`** in production paths. **No `@ts-nocheck`.** **No invented abstractions** — extend existing patterns (factory hooks, FrappeSelect, GuidedErrorDialog, `createIfNotExists`).
- The seed script is **additive + idempotent** — never delete/overwrite. Re-running must be safe.
- Respect the **orphaned-registry rule**: any new doctype surface must be present in BOTH `BUILT_MODULES` and `getDocTypeRoute` (Job Card already added in 2V — verify both still hold).
- Currency is **ETB** everywhere. Company is the active configured company — read it, don't hardcode `Obsidian Demo PLC` in the catalog script (resolve the default company).
- Pillars: P1 Schema-First (the `pricing` discriminator + option-sets are the schema), P2 Factory Pattern, P3 Modularization, P4 Premium UI, P6 End-to-End Type Safety.

---

## Required return (Rule 5 — ordered manual live-retest checklist)

End the build report with this, each step as route → action+values → expected → exact failure string.

### A-RETEST (manufacturing)
1. **P0-6 draft SO guard** — `/sales/sales-order/<draft SO>`: inspect every create affordance (FlowRail focus zone, FlowRail ribbon WO node, WhatsNext, Manufacturing card). **Expected:** all inert + disabled, tooltip "Submit the Sales Order first"; **no** navigation to `/manufacturing/work-order/new` anywhere. **Failure:** "still navigates to /work-order/new from a draft SO."
2. **JC auto-create, no redirect** — `/manufacturing/work-order/<WO with default BOM>`: click Create Job Cards → **Expected:** exactly one Job Card created inline with `operation=Print & Finish`, `workstation=Pana Print Floor` prefilled; stays on the WO page (no redirect to `/manufacturing/job-card/new`). **Failure:** "redirected to blank job-card form" or "errored: <paste exact Frappe error>".
3. **JC lifecycle Start/Complete** — same WO, JC row: click **Start** → badge flips to "Work In Progress", button becomes **Complete**; click **Complete** → badge "Completed", JC submitted (docstatus 1). **Expected:** both transitions persist across refetch. **Failure:** "Start does nothing / button stays Start" or "<paste exact Frappe error>".
4. **JC employee assign** — same JC row: select an Employee in the inline FrappeSelect → **Expected:** employee chip appears and persists across refetch; works on BOTH the WO-detail row and the standalone `/manufacturing/job-card/<JC>` page. **Failure:** "<paste exact Frappe field error>".
5. **P1-1 CRUD context** — perform any create (e.g. submit a Quotation) → open the Bell → click the notification. **Expected:** "CRUD Operation" section shows operation=create, doctype, doc name, summary; clicking deep-links to the doc. **Failure:** "no CRUD context shown."
6. **P1-2 WO warehouse defaults** — `/manufacturing/work-order/new`. **Expected:** `source_warehouse`=Stores, `wip_warehouse`=WIP, `fg_warehouse`=Finished Goods prefilled from company defaults. **Failure:** "warehouse fields empty on WO create."
7. **P1-2 other create forms** — `/stock/stock-entry/new`, `/stock/material-request/new`, `/stock/purchase-receipt/new` (no query param). **Expected:** warehouse fields prefilled per purpose. **Failure:** "<which form> warehouse empty."

### B-RETEST (catalog seed)
8. **Seed runs clean** — `pnpm seed:catalog` against live ERPNext. **Expected:** completes; summary lists Item Groups, 15 raw items, 16 finished items, Item Prices, BOMs created/skipped; explicitly names the pricing-TBD products + PRINT-CUT-STICKER no-BOM. Re-run → all "already exists", zero errors. **Failure:** "<paste exact Frappe error and the step it failed on>".
9. **Items + BOMs live** — `/stock/item/BUSINESS-CARDS`: item exists, `default_bom` set, BOM submitted (docstatus 1) with PAPER-300GSM + LAM-MATTE + one `Print & Finish` operation. **Failure:** "BOM not default / not submitted / wrong components."
10. **Configurator matrix pricing** — open the configurator for `BUSINESS-CARDS`: defaults = Standard / Both Side / 300gsm / Rounded / Matte; price shows **10.00 ETB**. Switch to Front + 250gsm + None → **3.50**. Switch to Both + 250 + Matte → **9.00**. **Failure:** "price shows <X> not <expected>" or "additive fallback used."
11. **Configurator → BOM components** — confirm a Flyers config (DL/150/Front) → the `ConfiguredLine.components` carries PAPER-150GSM. Default Business Cards → components carry PAPER-300GSM + LAM-MATTE. **Failure:** "components empty / wrong item_code."
12. **SO line uses configured rate + min qty** — add a configured Business Cards line to a Sales Order → rate = configured ETB price; quantity enforces `min_qty` 50. **Failure:** "rate not applied" or "min qty not enforced."

---

**End of Phase 2W handoff.** PART A is the gating manufacturing retest; PART B is the catalog foundation the Pana pilot needs to actually quote and produce. Report back with the build report + Rule 5 results and I'll gate it against the live tree before merge.
