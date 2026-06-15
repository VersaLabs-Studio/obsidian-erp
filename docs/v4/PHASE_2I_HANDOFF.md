# PHASE 2I HANDOFF — Stock Module Completion: Stock Reconciliation + Stock Visibility

> Brain (Opus 4.8) → OpenCode mesh. Parallel track to the round-2 fixes on
> `feat/v4-phase-2h-followups`. Build this on a SEPARATE branch.

## 0. Why this module
All three transactional spines (Order-to-Cash, Procure-to-Pay, Manufacturing — 18 doctypes in
`BUILT_MODULES`) **move** stock (Stock Entry, Delivery Note, Material Request, Purchase Receipt),
but the app has **no on-hand visibility** and **no opening-stock / adjustment document**. You can
create stock movements but cannot see the resulting quantity. This phase closes that gap:

- **Part A — Stock Reconciliation** — a transactional doc to set/adjust on-hand qty + valuation
  (opening stock, physical-count corrections). Full CRUD.
- **Part B — Stock Balance** — a read-only on-hand view (qty + value by item × warehouse).
- **Part C — Stock Ledger** — a read-only movement history (P2, include if time permits).

## 1. Branch & merge
- Branch off `feat/v4-phase-2h-followups` @ `510e13c` → **`feat/v4-phase-2i-stock-visibility`**.
- Merge **after** the round-2 fix branch merges to `develop`.
- This branch **only ADDS** to shared registries. It must **not** edit `FlowRail.tsx`,
  `flow-auto-fill.ts`, `extract-frappe-message.ts`, or the company-field wizards — those are owned
  by the fix branch. Any merge conflict on a registry file will be **additive** — keep both sides.

## 2. Pillar compliance (non-negotiable)
P1 schema-first (§4) · P2 factory (reuse `useFrappe*` generic hooks + `@/components/*`) ·
P3 modular · P4 premium UI (clone golden templates) · P5 this doc · P6 **zero `@ts-nocheck`**,
full end-to-end types.

---

## 3. Part A — Stock Reconciliation (transactional doc, full CRUD)

**Closest golden template to clone: `app/stock/purchase-receipt/*`** (a stock doc with an items
child table). **KEY DIFFERENCE:** Stock Reconciliation is **standalone** — no upstream/downstream
flow chain. So:
- **NO FlowRail** on the detail page.
- **NO `flow-auto-fill` mapping**, **NO `flow-definitions` stage**.
- WhatsNext = **Submit only** (draft); no downstream "Create X".

### 3.1 Frappe doctype (ERPNext v15) — `Stock Reconciliation`
Header:
| Field | Notes |
|---|---|
| `naming_series` | default `"MAT-RECO-.YYYY.-"` — do NOT hardcode in the form; omit and let Frappe default (lesson from F5) |
| `purpose` | select: `"Opening Stock" \| "Stock Reconciliation"`, default `"Stock Reconciliation"` |
| `company` | **inject `getActiveCompany()` at submit — NOT a form field** (B7) |
| `posting_date` | default today |
| `posting_time` | default now |
| `set_warehouse` | optional default warehouse |
| `expense_account` | optional in UI; Frappe may require on submit — let the server validate and surface via GuidedErrorDialog |
| `docstatus`, `status` | standard |

Child table `Stock Reconciliation Item`:
| Field | Notes |
|---|---|
| `item_code` | **required** (Item select) |
| `item_name` | auto from item |
| `warehouse` | **required** (Warehouse select, `is_group=0`) |
| `qty` | the counted/target qty (number; **0 is valid** for reconciliation) |
| `valuation_rate` | optional number |
| `amount` | qty × valuation_rate (compute client-side for display; server recomputes) |

> v1: do **not** fetch `current_qty` client-side. (Optional enhancement: fetch on-hand from `Bin`
> for the selected item+warehouse and show it read-only beside the input.)

### 3.2 Pages (clone the PR equivalents)
1. **`app/stock/stock-reconciliation/page.tsx`** — list. Clone `purchase-receipt/page.tsx`:
   card grid, KPI bar (Total / Draft / Submitted / This-month), status filter pills, delete
   (draft only), `CommandPalette`, `StatusBadge`, premium card styling.
2. **`app/stock/stock-reconciliation/new/page.tsx`** — 3-step `FlowWizard`. Clone
   `purchase-receipt/new/page.tsx`:
   - **Step 1 "Setup"**: `purpose` (select), `posting_date`, `posting_time`, `set_warehouse`.
     **No company field.**
   - **Step 2 "Count Items"**: items table — `item_code` (Item `FormFrappeSelect`, fetch
     `valuation_rate`/`stock_uom`/`item_name` via `extraFields`), `warehouse`
     (Warehouse select, `is_group=0`), `qty` (number), `valuation_rate` (number, optional).
     **Per-field `FieldWrap` markers gated on `triedNextSteps`** for `item_code` + `warehouse`
     (the F2 pattern — wire it from the start, don't repeat the gap).
   - **Step 3 "Review"**: header summary + items table + total value `tfoot`.
   - `company: getActiveCompany()` injected at submit; `GuidedErrorDialog` + `resolveFrappeError`
     wired on `onError`.
3. **`app/stock/stock-reconciliation/[name]/page.tsx`** — detail. Clone PR detail **but DROP the
   FlowRail card entirely** (standalone doc). Keep: header `DataPoint`s (purpose, posting_date,
   company, warehouse), items table (qty + valuation + amount + total), **B1 sidebar**
   (`bg-card rounded-2xl shadow-sm shadow-black/5 p-6 border-border/40`): Status panel,
   `WhatsNext` (Submit only when draft), `ActivityTimeline`; `ConfirmDialog` for submit/delete;
   `GuidedErrorDialog`.
4. **`app/stock/stock-reconciliation/[name]/edit/page.tsx`** — clone PR edit: **draft-only guard**,
   per-field markers, `company` injected at submit.

### 3.3 Schemas (P1)
- `lib/flows/flow-validation.ts`:
  ```
  export const stockReconciliationStepSchemas = {
    step1: z.object({ purpose: z.string().min(1), posting_date: z.string().min(1, "Posting date is required") }),
    step2: z.object({ items: z.array(z.object({
      item_code: z.string().min(1, "Item is required"),
      warehouse: z.string().min(1, "Warehouse is required"),
      qty: z.number(),                       // 0 allowed
      valuation_rate: z.number().min(0).optional(),
    })).min(1, "Add at least one item") }),
    step3: z.object({ confirmed: z.boolean().optional() }),
  };
  ```
  Register in `WIZARD_STEP_SCHEMAS["Stock Reconciliation"]`.
- `lib/schemas/doctype-schemas.ts`: add the `Stock Reconciliation` Zod schema (mirror Purchase
  Receipt's schema block).

### 3.4 Registry wiring
- `lib/doctype-config.ts`: add `"Stock Reconciliation"` (clone the **Stock Entry** entry shape):
  `apiPath: "stock/stock-reconciliation"`, `module: "Stock"`, `flow: { hasFlow: false }`,
  appropriate `searchFields` (`["name","purpose","posting_date"]`).
- `lib/flows/module-availability.ts`: `BUILT_MODULES += "Stock Reconciliation"`.
- `lib/errors/frappe-error-resolver.ts`: add `"MAT-RECO" → "stock/stock-reconciliation"` to the
  series→route map **and** `"Stock Reconciliation" → "stock/stock-reconciliation"` to the
  doctype→route map (LINKED_DOC_EXISTS / DUPLICATE).
- **No** `flow-auto-fill` mapping. **No** `flow-definitions` stage.

### 3.5 API routes (clone `app/api/stock/stock-entry/*`)
- `app/api/stock/stock-reconciliation/route.ts` — GET list + POST create.
- `app/api/stock/stock-reconciliation/[name]/route.ts` — GET / PUT / DELETE.

---

## 4. Part B — Stock Balance (read-only on-hand visibility)

**Source doctype: Frappe `Bin`** — one row per item × warehouse with `actual_qty`,
`valuation_rate`, `projected_qty`, `reserved_qty`, `ordered_qty`.

- **API: `app/api/stock/bin/route.ts`** (GET list, proxy `Bin`) — clone a simple list route such
  as `app/api/stock/warehouse/route.ts`.
- `lib/doctype-config.ts`: add `"Bin"` read-only entry, `apiPath: "stock/bin"`.
- **Page: `app/stock/stock-balance/page.tsx`** — premium read-only table:
  - **Filters**: item (`FormFrappeSelect` Item), warehouse (Warehouse select). Client-side filter
    over the fetched list, or pass as `filters` to `useFrappeList<Bin>("Bin", …)`.
  - **KPI bar** (`KPICard`): Total SKUs (distinct `item_code`), Total Stock Value
    (Σ `actual_qty × valuation_rate`), Warehouses (distinct), Out-of-stock (count `actual_qty <= 0`).
  - **Table**: Item · Warehouse · On Hand (`actual_qty`) · Reserved (`reserved_qty`) ·
    Available (`actual_qty - reserved_qty`) · Valuation Rate · Value. `tabular-nums`; sort by item
    then warehouse; `StatusBadge`/muted row for zero/negative on-hand.
  - **Loading/empty**: `LoadingState` / `EmptyState` (no ad-hoc spinners).
  - Extract the value-aggregation into a pure helper (`computeStockKPIs(bins)`) and **unit-test it**.

- **Nav**: add **Stock Balance** + **Stock Reconciliation** to the Stock section of the sidebar
  (`components/Layout/Layout.tsx` — find the Stock nav group).

---

## 5. Part C — Stock Ledger (read-only movement history) — P2, include if time

**Source doctype: Frappe `Stock Ledger Entry`** — `item_code`, `warehouse`, `posting_date`,
`posting_time`, `actual_qty` (Δ), `qty_after_transaction`, `valuation_rate`, `voucher_type`,
`voucher_no`.

- **API: `app/api/stock/stock-ledger-entry/route.ts`** (GET list, default `orderBy` posting_date desc).
- **Page: `app/stock/stock-ledger/page.tsx`** — chronological table/timeline; filter by
  item / warehouse / date range; **link `voucher_no` to its source doc** via
  `getDocTypeRoute(voucher_type)`. Read-only.

---

## 6. Definition of Done
- `tsc --noEmit` = 0 (**zero `@ts-nocheck` anywhere in the new files**); `vitest` green.
- **New tests**: `stockReconciliationStepSchemas` validation (item + warehouse required, qty=0
  allowed); module availability (`"Stock Reconciliation"` ∈ `BUILT_MODULES`); `computeStockKPIs`
  aggregation.
- **Manual click-path**: create a Stock Reconciliation (purpose = Opening Stock) → submit →
  open **Stock Balance** → the on-hand qty/value reflects it; **Stock Ledger** shows the entry.
- **Premium UI**: full-width wizard (no `max-w` cap), OKLCH tokens only, B1 sidebar panels, no
  black borders, no off-palette colors, `Skeleton*`/`LoadingState` for all loading states.

## 7. Explicit non-goals / guardrails
- Do **not** edit `FlowRail.tsx`, `flow-auto-fill.ts`, `extract-frappe-message.ts`, or any
  company-field wizard — owned by the round-2 fix branch.
- Do **not** add a flow chain to Stock Reconciliation — it is standalone.
- Do **not** compute `current_qty` server-side logic in the client; collect target qty only.
