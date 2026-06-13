# PHASE 2P HANDOFF — Enterprise Readiness + SME Automation + Ship

> **The final mega-phase.** After 2P is built, co-signed, and live-E2E-tested, v4 ships to the
> single production VPS for the printing-business pilot. Scope is large by design (Kidus:
> "make subsequent handoffs as vast scoped as possible"). Build in the Part order below —
> Parts 1–2 are the make-or-break; Parts 5 & 8 are the ship gate; Parts 6–7 are P1.

---

## §0 — Orientation & Boundaries (READ FIRST, AND LAST)

- **Branch:** create `feat/v4-phase-2p-enterprise-ship` off `develop` (current tip after 2O
  co-sign — confirm with `git log -1 develop`). Do NOT branch off the 2O feature branch.
- **Reporting contract:** `docs/v4/MESH_REPORTING_CONTRACT.md` is binding. In particular:
  **claim = code = diff** (every ✅ must point at a real diff); **no orphan modules / no
  `__init__.ts` / no god-modules**; **you do NOT run a dev server** — Kidus runs the live
  retest; your report MUST end with the filled-in Part 11 checklist and HONEST KNOWN GAPS
  (undone > falsely-claimed-done). The last four phases failed co-sign on "gates green,
  runtime broken / claim ≠ code" — verify every fix against the running shapes you can, and
  where you cannot (no live Frappe), say so explicitly.
- **FlowRail ownership:** `components/flows/FlowRail.tsx` **visual chrome is Brain-owned**
  (commit `cb7de20`) — do NOT restyle nodes/focus-zone/skeleton/motion. You MAY consume its
  data props and edit resolution/next-action LOGIC (granted since 2O). `CrossFlowActionsMenu`
  is yours.
- **Six Pillars enforced:** P1 Schema-First, P2 Factory, P3 Extreme Modularization (helpers
  in `lib/`, not inlined in pages), P4 Premium UI (OKLCH tokens only — no `bg-${x}` dynamic
  Tailwind, no black borders, no AI/perf "slop" labels), P5 Docs-first, P6 end-to-end types.
- **Commit per Part.** Independently retestable. Static gates each commit: `pnpm tsc --noEmit`
  (0 errors) + `pnpm vitest run` (no regressions; `--pool=forks` if the thread pool flakes).
- **Brain hotfixes already on the branch base** (do not redo): the flow-resolution Rules-of-Hooks
  crash, the `["",field]`→3-tuple header filter, child-table links querying the parent, the
  `reference_doctype` child-extra-filter 417, and the SI/PI paid-invoice PE-prompt gate.
  These are in `use-flow-chain.ts`, `flow-link-map.ts`, and the SI/PI detail pages — build on
  them, don't revert them.

**"v4 shipped" = all P0 Parts (1,2,3,4,5,8,9) live-verified + Parts 6,7 functional.**

---

## PART 1 — [P0] Flow Resolution: Finish + Make It Fast

The 2O+hotfix work made the chain *correct*; 2P makes it *complete and fast*. Three items.

### 1.1 — Skeletons everywhere (THIRD time requested — make it real this time)
**Symptom (Kidus, live):** "flow rail, cross flow skeletons are still missing… very slow to load."
**Root expectation:** every flow surface shows a skeleton while `useFlowChain().isLoading` is
true, never a blank panel or a popped-in empty state.

- Audit ALL 17 transactional detail pages. Each must pass `isLoading={chainLoading}` (from
  `useFlowChain`) into `<FlowRail>`, and render `<CrossFlowActionsMenu isLoading={chainLoading}>`
  and `<WhatsNext>` skeletons on the same flag. Grep for detail pages that destructure
  `chainLoading` but don't forward it — that's the leak.
- `FlowRail` already has a Brain-owned skeleton; confirm it actually renders when `isLoading`
  (don't restyle it — just verify the prop reaches it and the page doesn't short-circuit to
  content first).
- **DoD:** hard-refresh any detail page → skeleton → content, on FlowRail + CrossFlow + WhatsNext.
  Never a blank card, raw `0/8`, or spinner-on-content.

### 1.2 — Kill the query storm (the real cause of "very slow")
**Root cause:** `use-flow-chain.ts` fires a FIXED 8 primary + 8 secondary `useFrappeList` calls
per detail page (`MAX_STAGES = 8`), most disabled but still mounted, and the enabled ones each
round-trip to Frappe (the logs show 600–900ms renders). That's the slowness.

- **Gate harder:** a primary/secondary slot whose plan is `none`/`current` must pass a STABLE
  `{ enabled: false }` and an empty queryKey so TanStack never schedules it (verify the disabled
  slots aren't still issuing requests — the logs show some firing).
- **Resolve in parallel, not in waterfall:** direct + header-link stages don't depend on each
  other; only the genuine two-hop (e.g. SO→PE via SI) waits. Confirm the only serialized
  dependency is the two-hop secondary. Everything else should fire on first render.
- **Cache:** bump `staleTime` for flow-resolution queries to 5 min (these back-links rarely
  change within a session) and ensure the same `(doctype,name)` mounted by FlowRail AND
  CrossFlow on one page shares the TanStack key (one fetch, not two). Today CrossFlow calls
  `useFlowChain` independently — confirm identical queryKeys so it dedupes.
- **DoD:** a detail page issues ≤ (number of resolvable stages) Frappe requests, not 16; the
  rail paints in < 400ms on a warm cache; no disabled-slot requests in the network log.

### 1.3 — SO→SI connection: the prefill must WRITE the link
**Symptom (Kidus, live):** DN↔SO now connects, but **SI↔SO still doesn't** — even though the
back-link query now returns 200. **Root cause:** the resolution works, but the SI *created from*
an SO via `/accounting/sales-invoice/new?sales_order=…` doesn't populate `sales_order` on its
**item rows**, so there's nothing to resolve. ERPNext's native "Create Invoice" uses
`make_sales_invoice(so)` which sets `sales_order` + `so_detail` per item; our custom prefill drops it.

- In `app/accounting/sales-invoice/new/page.tsx`, when `?sales_order=` is present, set
  `item.sales_order = <SO name>` (and `so_detail` if available) on each prefilled item row, in
  addition to the header customer. Mirror the same for `?delivery_note=` → `item.delivery_note`/
  `dn_detail` (so DN→SI resolves from the SI side too).
- Verify `SalesInvoiceCreateSchema` (and the wizard step schema) permits per-item `sales_order`/
  `delivery_note` (the 2K `.partial()` likely already does; confirm — don't let a Zod strip drop it).
- **Best-practice option (recommended):** instead of hand-mapping, call ERPNext's server-side
  `erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice` via `frappeClient.call`
  to get a fully-mapped SI draft, then hydrate the wizard from it. This guarantees every link +
  tax + pricing field ERPNext expects. Apply the same `make_*` pattern to SO→DN, DN→SI, PO→PR,
  PR→PI. (If you take this route, it also de-risks the over-strict-schema class of bugs.)
- **DoD:** create an SI from an SO → open the SO → Invoice stage lights up with the SI name;
  CrossFlow shows "View <SI>"; the SI's items carry `sales_order`.

---

## PART 2 — [P0] SME Manufacturing & Stock Automation (THE CENTERPIECE)

> Kidus: *"even I don't understand what to do when starting a production… for SME's this may be
> overkill… automate everything regarding here, especially how to receive materials, make
> transfers implicit and automated, and have the system itself reconcile and manage stock."*

**Design philosophy (build to this, not just the tickets):** The operator works in **three
business verbs** — *Receive*, *Start a job*, *Finish a job*. The system generates the correct
Frappe Stock Entries / Work Orders / Purchase Receipts underneath using **implicit warehouses**
and **safe defaults**. The user should never open a raw Stock Entry, pick a WIP warehouse, or
choose "Material Transfer for Manufacture" from a dropdown unless they deliberately go to the
advanced view. Every automated action shows a **plain-language summary** of what it did and
leaves an **undo path** (the underlying submitted doc is cancel-able).

This Part EXTENDS the 2O `StartProductionModal` / `FinishProductionModal` (already solid) — do
not rewrite them; wrap and complete them.

### 2.1 — Implicit warehouse model (foundation for everything else)
ERPNext requires a warehouse on every stock movement. Today the user must pick them, and blank
WIP/FG warehouses are why WO submits fail. Make them implicit, mirroring the `company.ts` pattern.

- **New `lib/settings/warehouses.ts`** (mirror `lib/settings/company.ts`): resolves the three
  default warehouses for the active company — `getStoresWarehouse()`, `getWipWarehouse()`,
  `getFgWarehouse()` — from session/Settings, with sensible name defaults
  (`Stores - <abbr>`, `Work In Progress - <abbr>`, `Finished Goods - <abbr>`; ERPNext suffixes
  warehouses with the company abbreviation — resolve the abbr, don't hardcode "Pana").
- **Auto-provision + Manufacturing Settings:** add a setup routine (run from onboarding Part 8,
  and idempotently from a Settings → "Operations" panel) that:
  - ensures the 3 warehouses exist (create via the `Warehouse` route if missing);
  - sets ERPNext **Manufacturing Settings**: `default_wip_warehouse`, `default_fg_warehouse`,
    `backflush_raw_materials_based_on = "Material Transferred for Manufacture"`,
    `material_consumption = 1` (so finishing a job auto-consumes what was transferred);
  - sets each stock Item's `default_warehouse = Stores` and FG/manufactured items' to Finished Goods.
- Every automated stock action (`StartProductionModal`, `FinishProductionModal`, Receive,
  Create Job) reads warehouses from `lib/settings/warehouses.ts` — NOT from user input. The
  advanced Stock-Entry wizard keeps the explicit pickers for power users.
- **DoD:** a fresh tenant runs onboarding once; thereafter Start/Finish/Receive never ask for a
  warehouse and never fail on a blank WIP/FG warehouse.

### 2.2 — The Production Cockpit (`/manufacturing` simplified workspace)
Replace the WO-list-centric mental model with a **Jobs** board. A "Job" IS a Work Order, but
presented as a simple lifecycle: **Planned → In Production → Done**.

- New `app/manufacturing/page.tsx` (or upgrade the existing `/manufacturing/dashboard`) = the
  **Jobs board**: cards grouped by status. Each card shows: FG item + qty, a material-readiness
  pill (**Ready** / **Short N items**, computed from Bin vs `required_items`), and the single
  next action button for its state:
  - Planned → **"Start job"** (opens `StartProductionModal`);
  - In Production → **"Finish job"** (opens `FinishProductionModal`);
  - Done → **"View output"** (link to the Manufacture SE / FG stock).
- Material readiness uses ONE batched Bin query for all visible jobs (not per-card) — reuse the
  `binByItem` pattern already in `StartProductionModal`, lifted to `lib/stock/bin-levels.ts`.
- Premium UI: B1 chrome, OKLCH status tones, skeletons, 375px + dark + reduced-motion. No
  raw WO jargon on the card face (the word "Work Order" can live in a subtitle/tooltip).
- **DoD:** an operator sees their jobs, knows at a glance which are ready, and runs the entire
  produce cycle from this one screen without opening a Stock Entry.

### 2.3 — One-click "Create Job" (hide BOM + WO complexity)
- A `CreateJobModal` (`components/manufacturing/CreateJobModal.tsx`): pick a **finished item** +
  **quantity** → on confirm, auto-create + submit a Work Order with: the item's **default BOM**
  (auto-looked-up via the existing `bom?filters=[["item","=",x],["is_default","=",1]]` query —
  already in the WO page; reuse it), implicit `wip_warehouse`/`fg_warehouse`/`source_warehouse`
  from `lib/settings/warehouses.ts`, `company` from `getActiveCompany()`, `planned_start_date =
  today`. If the item has **no default BOM**, surface the existing guided "Create default BOM"
  path (→ `/manufacturing/bom/new?item=`), don't dead-end.
- Idempotency: guard via `lib/flows/idempotency.ts` (don't create a second open WO for the same
  item+qty+day unless confirmed).
- **DoD:** "Create job → 100 × Business Cards → Start" works end-to-end with zero warehouse/BOM
  questions when a default BOM exists.

### 2.4 — Start Production (complete the 2O modal)
`StartProductionModal` is built (auto Material-Transfer SE Stores→WIP, shortfall detection,
idempotency). Complete it:
- **Auto-resolve warehouses** from `lib/settings/warehouses.ts` when the WO's are blank (today
  the confirm button disables on blank `sourceWh`/`targetWh` — fill them implicitly instead).
- **Shortfall → automatic procurement option:** the current shortfall path links to a blank MR.
  Upgrade: pre-build the MR with the exact short items + quantities (it already passes
  `?shortfall=item:qty,…`; make `material-request/new` consume it and prefill rows), and offer a
  one-click **"Order shortfall"** that creates the MR draft AND (optionally) a PO draft to the
  item's default supplier. Keep "Stock count" (Reconciliation) as the alternative.
- **DoD:** starting a job with everything in stock = one click, no questions; starting short =
  guided to a pre-filled order, never a blank form.

### 2.5 — Finish Production (complete the 2O modal)
`FinishProductionModal` is built (auto Manufacture SE). Complete it:
- Produce FG into the implicit **Finished Goods** warehouse; consume WIP per BOM (rely on the
  `backflush = "Material Transferred"` setting from 2.1 so consumed rows match what was
  transferred — avoids the "consumed ≠ transferred" 417 class).
- Idempotency: block a second Manufacture SE for a WO already finished; show "View output".
- On success: update the job card to **Done**, summarize "Produced N × FG into Finished Goods;
  consumed M materials."
- **DoD:** finishing a job moves FG into stock (visible in Stock Health 2.7) and consumes
  materials, in one click.

### 2.6 — Receive Materials (the "I got materials" verb)
Two entry points, both one-click, both implicit-warehouse:
- **From a PO** (`app/buying/purchase-order/[name]/page.tsx`): a "Receive items" action →
  `ReceiveMaterialsModal` → auto-create + submit a **Purchase Receipt** (recommend server-side
  `erpnext.buying.doctype.purchase_order.purchase_order.make_purchase_receipt(po)` to get a fully
  mapped draft), target = implicit Stores, with a received-lines summary + partial-receipt
  support. Idempotent (don't double-receive a fully-received PO; show per-item received vs
  ordered).
- **Standalone "Receive stock"** (no PO) from the Cockpit / Stock Health: pick item + qty → auto
  **Material Receipt** Stock Entry into Stores. This is the SME "I just bought supplies" path.
- **DoD:** receiving stock never requires choosing a warehouse or a doctype; on-hand rises and is
  visible immediately in Stock Health.

### 2.7 — System-managed stock: Stock Health + auto-reconcile + friendly count
- **Stock Health view** (upgrade `app/stock/stock-balance`): per-item on-hand (Bin `actual_qty`),
  reorder level, and a status tile (In stock / Low / Out). Low-stock rows get a one-click
  **"Reorder"** (pre-filled MR→PO to default supplier). This is "the system manages stock."
- **Auto-reorder (optional, behind a Settings toggle):** set Item `reorder_level`/`reorder_qty`
  during onboarding and enable ERPNext auto-reorder; surface the auto-created Material Requests
  as **notifications** (reuse the Notifications Center) rather than silent docs.
- **Friendly "Stock count"** (rename the Reconciliation flow for users): a `StockCountModal` that
  lets the user enter counted quantities for items and writes a **Stock Reconciliation** under the
  hood (the 2I module exists — wrap it, don't expose "Reconciliation" as the primary verb). This
  is the "system reconciles stock" path — used for opening balances and corrections.
- **DoD:** a non-technical user can answer "how much do I have?", "what's running low?", and "fix
  the count" without ever seeing the words Bin, Reconciliation, or Stock Ledger Entry.

### 2.8 — Automation guardrails (apply to ALL of Part 2)
- **Idempotency** on every auto-create (via `lib/flows/idempotency.ts`): never create a duplicate
  SE/PR/WO; show "View existing" instead.
- **Required-field auto-fill:** Frappe-mandatory fields (`company`, warehouses, `posting_date`,
  `naming_series`, `stock_entry_type`) are filled from defaults — never surfaced to the user. Audit
  each auto-create payload against the doctype's actual required fields (you can't hit live Frappe;
  read the `*CreateSchema` + ERPNext field requirements and list any you're unsure of as a KNOWN GAP).
- **Never half-create:** if a prerequisite is missing (no BOM, shortfall, blank default warehouse),
  STOP with a guided action — do not submit a partial document.
- **Always summarize + always reversible:** every modal shows what it did; the created doc is
  cancel-able from its detail page.
- **No new god-modules / `__init__.ts`.** Helpers go in `lib/stock/`, `lib/manufacturing/`,
  `lib/settings/`. Every new component is imported by something that renders.

> **Research note for the mesh:** this design maps 1:1 onto ERPNext's intended automation surface —
> default warehouses (Item/Manufacturing Settings), `make_stock_entry`/`make_purchase_receipt`/
> `make_sales_invoice` mappers, backflush-on-transfer, and auto-reorder. Prefer the server-side
> `make_*` mappers over hand-built payloads wherever a link doc is involved; they satisfy ERPNext's
> required-field + mapping rules for free and eliminate the over-strict-payload bug class.

---

## PART 3 — [P0] Financial Reports: Proper Page Rebuild

**Symptom (Kidus, live):** P&L + Balance Sheet fail with
`FiscalYearError: Date 31-12-2026 is not in any active Fiscal Year for Pana`; AR/AP load but the
pages are "plain tables… no skeletons, no strict UI patterns. A new implementation the mesh did —
I want them fixed asap, a proper page based on our engraved UI patterns."

**Root cause:** `FinancialReportView` hard-builds the period as the calendar year (`2026-01-01 …
2026-12-31`) and sends it regardless of which **Fiscal Years actually exist** on the instance.
Pana has no FY covering 2026 → ERPNext throws. AR/AP survive because they age by `report_date`.

- **Period selector driven by real Fiscal Years:** fetch the `Fiscal Year` doctype list
  (`useFrappeList("Fiscal Year", { fields: ["name","year_start_date","year_end_date"] })`) and
  build the period options from THAT — default to the FY containing today, else the latest FY.
  Never synthesize a period for a year with no Fiscal Year. Add periodicity (Yearly/Quarterly/
  Monthly) + an explicit FY picker.
- **Guided error, not a raw string:** when the report API returns a `FiscalYearError` (or any
  Frappe error), render the `GuidedErrorDialog`/inline guided block (reuse
  `extractFrappeMessage` + `resolveFrappeError`) with an action — e.g. "No fiscal year is set up
  for this period → Open Fiscal Year settings" — not "Failed to load report. Date 31-12-2026 is
  not in any active Fiscal Year for Pana".
- **Engraved UI:** B1 container, header with title + description, the period/FY controls in a
  premium control bar, a **skeleton** table while loading, OKLCH-toned hierarchical rows
  (indented account tree for P&L/BS; aged buckets for AR/AP), totals emphasized, empty-state when
  zero rows, CSV export kept. Match the look of the rest of the app — no bare HTML tables.
- Files: `components/accounting/FinancialReportView.tsx` (+ the 4 pages under
  `app/accounting/reports/`), `hooks/accounting/use-frappe-report.ts`,
  `app/api/accounting/reports/[report]/route.ts` (the route already maps the 4 reports — feed it
  the FY-derived filters).
- **DoD:** all four reports render real data inside the engraved UI with a skeleton; switching FY/
  period refetches; a missing-FY instance shows a guided fix, never a crash or a raw red string.

---

## PART 4 — [P0] Dashboards: Data-Richness Leap + EXACT Chart Specs

**Symptom (Kidus, live):** "global dashboard graphs are hideous… color palette + design good but
no data to display, I need them proper and rich in data. `/crm/dashboard` and ALL per-module hubs
not updated from 2N — UI good, no data richness, CTAs, actionables." Fold ALL dashboard upgrades
here.

**Charts — exact specs (implement to these, recharts, OKLCH tokens via CSS vars, no fixed hex):**
- **Revenue trend** — `AreaChart`, last 12 months, x = month, y = summed `grand_total` of
  submitted Sales Invoices; gradient fill `--color-primary` at 0.25→0 opacity; 2px line; tooltip
  with ETB formatting; rounded grid, no top/right axis lines; animated draw (respect
  reduced-motion). Empty → a centered "No revenue yet this year" state, not an empty grid.
- **Sales vs Purchases** — grouped `BarChart`, last 6 months, two series (SI total vs PI total),
  `--color-primary` / `--color-info`, rounded bars, shared tooltip.
- **Cash position** — `BarChart` or `LineChart`, net = payments in − payments out per month.
- **AR/AP aging** — small horizontal stacked bars (0–30/30–60/60–90/90+), `--color-success →
  warning → destructive` ramp.
Each chart: real `useFrappeList` aggregates computed in a `lib/kpi/*` helper (pure, tested), NEVER
hardcoded; loading skeleton; a header with a real KPI number + period.

**Actionable tiles (each a `<Link>` to a pre-filtered list or a create flow):** Low-stock items →
Stock Health; Unpaid invoices → SI list filtered `outstanding>0`; Overdue → past due_date; Draft
documents → drafts; Open jobs → Cockpit; Draft PEs. Real counts, click-through, no dead tiles.

**Per-module hubs (`/<module>/dashboard` for crm, sales, stock, buying, manufacturing,
accounting):** each gets module-scoped KPIs + 2–3 module charts + module actionables, all on the
**same** dashboard component system (one `DashboardShell` + config per module — P3, no copy-paste
six times). Unify the look with the global dashboard.

- **Anti-slop (hard rule):** no "AI prediction", no "performance score", no fabricated numbers, no
  `bg-${x}` dynamic classes. Projections, if any, are labeled "Estimate" and computed from real
  trailing data.
- **DoD:** global + all 6 hubs are data-rich, every chart reads live aggregates with a skeleton,
  every tile is a real click-through, palette/curves look premium, dual-theme/375px/reduced-motion.

---

## PART 5 — [P0] Full RBAC + Admin Onboarding (THE SHIP GATE)

> Kidus: *"the RBAC which we will need to fully implement and onboard admin side right on our
> Next.js frontend and plug-and-play feasibility. If we nail this we will have a great product."*

This lands the long-stubbed B1/B2 security foundation as real per-user RBAC, plus an admin surface
to manage it from the Next.js app (no bench/Desk required).

### 5.1 — Real per-user identity (`lib/auth/resolve-user.ts` is still a dev stub)
- Resolve the real Frappe user from the session cookie (forward the browser's `sid` to Frappe,
  call `frappe.auth.get_logged_user` / `frappe.client.get` on `User`), returning user + roles.
  Replace the dev stub; fail closed (no user → no privileged calls).
- **Per-user scoped Frappe client:** every API route uses a client bound to the requesting user's
  session (so ERPNext's own permission engine enforces row/doctype access) instead of a single
  service account. This is the core of "the AI/UI can't do what the user can't" — and the
  prerequisite that makes the v4.1 AI executor safe.

### 5.2 — Role-gated UI
- A `useCurrentUser()` hook (roles) + a `<Can role="…">`/`hasRole()` guard. Gate nav items,
  module access, and mutating affordances (create/submit/cancel/delete) by role. Map ERPNext roles
  (Sales User, Stock Manager, Accounts User, System Manager, …) to the app's surfaces.
- Hide vs disable: hide whole modules the role can't see; disable + tooltip individual actions.

### 5.3 — Admin user management on the Next.js frontend (plug-and-play)
- `app/settings/users/` (System-Manager-only): list users, invite/create a user, assign roles
  (checkbox matrix over the app's role set), enable/disable. Backed by the `User` doctype +
  role-profile APIs. This is the "onboard admin side right on our frontend" ask — an SME admin
  configures their team without ever opening Frappe Desk.
- Settings home: company profile, the implicit-warehouse config (Part 2.1), fiscal year, default
  supplier/price lists — the few things an admin must set once.

- **DoD:** logging in as a Sales User vs an Accounts User vs Admin shows correctly scoped nav +
  actions; an admin can create a user and assign roles entirely from the Next.js UI; privileged
  API calls fail closed without a valid session.

---

## PART 6 — [P1] Email Integrations
- Outbound transactional email via ERPNext's Email/Notification system (`frappeClient.call` to the
  email queue, or the `Notification` doctype) for the key events: invoice sent to customer, PO sent
  to supplier, payment receipt. A "Send by email" action on SI/PO/PE detail pages (prefilled
  recipient from the party's contact/email).
- Settings → Email: SMTP/account config surfaced read-only-or-editable as the instance allows.
- **DoD:** "Email invoice" sends a real email to the customer's address; failures surface via the
  guided error system, not a raw toast.

## PART 7 — [P1] Push Notifications
- Build on the existing Notifications Center (`lib/stores/notification-store.ts` + panel). Add
  **browser push** (Web Push API + service worker) for: payment received, low-stock reorder,
  job-shortfall, document submitted-by-someone-else. Opt-in permission prompt in Settings.
- Persist notifications (the store is in-memory — already flagged; persist to localStorage with a
  stable `getServerSnapshot` so the prior SSR crash doesn't return) and make each push deep-link to
  its doc (the `href` plumbing exists).
- **DoD:** with permission granted, a real OS/browser push fires on a payment received in another
  tab/session; clicking it opens the doc.

---

## PART 8 — [P0] SME Plug-and-Play Onboarding (THE SHIP GATE)

> "deploy v4 and plug and play immediately with minimal training."

A first-run onboarding wizard (`app/onboarding/` + a guard that redirects a fresh tenant here):
1. **Company** — name/abbr/currency/fiscal year (create the FY if missing — this also fixes the
   Part 3 root cause for new tenants).
2. **Operations** — run the Part 2.1 warehouse + Manufacturing Settings auto-provision (one click,
   explained in plain language).
3. **Team** — invite users + assign roles (Part 5.3).
4. **Catalog seed (optional)** — add first items / a default BOM / first supplier + customer, or
   skip.
5. **Done** — land on the dashboard with a short "what each module does" tour.
- Idempotent + resumable; a Settings entry to re-run any step.
- **DoD:** a brand-new instance, from a clean login, is fully operational (can receive stock, run a
  job, invoice a customer, take payment) after the wizard, with no Frappe Desk and minimal training.

---

## PART 9 — Confirmed End-to-End + Production Wiring
- **One scripted E2E pass (documented, for Kidus to run live):** Lead → Customer → Quotation → SO →
  (Start job → Finish job) → DN → SI → PE, and PO → Receive → PI → PE, asserting every FlowRail
  stage lights up, every cross-flow "View" resolves, dashboards + reports reflect the new data, and
  no 404/417 in the network log.
- **Production wiring to the VPS:** env/config for the single existing Frappe/ERPNext instance
  (API keys plugged into the repo per B11; no DB-per-tenant). Document the deploy steps for the
  printing-business pilot repo upstream.

---

## PART 10 — Tests
- `lib/kpi/*` aggregation helpers (revenue/sales-vs-purchases/aging/stock) — pure, unit-tested.
- Flow resolution: SO→SI resolves once the SI carries `sales_order` (fixture); the
  `reference_doctype` child-extra-filter builds the 4-tuple (guard the regression that caused the
  417); paid invoice gates the PE prompt off.
- Automation: `StartProductionModal`/`FinishProductionModal`/`CreateJobModal`/`ReceiveMaterialsModal`
  build correct payloads + are idempotent (mock the mutation, assert the payload + the "already
  exists" short-circuit).
- RBAC: `resolve-user` fails closed without a session; `hasRole` gating.
- Reports: FY-derived period builder picks the FY containing today; guided error on FiscalYearError.
- Tests assert REAL rendered components / real helper outputs (not literals) per the contract.

---

## PART 11 — Manual Live-Retest Checklist (fill in your run notes; Kidus verifies live)
1. Detail page hard-refresh → FlowRail + CrossFlow + WhatsNext skeleton → content; rail paints fast,
   no 16-request storm in the network tab.
2. Create SI from an SO → SO's Invoice stage lights up with the SI name; CrossFlow "View <SI>".
3. Paid SI/PI → no "Create Payment Entry" prompt anywhere; Payment stage shows the PE.
4. Reports: P&L + Balance Sheet render real trees inside the engraved UI with a skeleton; FY/period
   switch refetches; a missing-FY case shows a guided fix, not a raw error.
5. Dashboards (global + all 6 hubs): rich charts from live data + real actionable tiles; no slop.
6. Cockpit: Jobs board shows readiness; Create Job → Start → Finish runs with zero warehouse/BOM
   questions when a default BOM exists; shortfall → pre-filled order.
7. Receive: from a PO and standalone → on-hand rises; visible in Stock Health; idempotent.
8. Stock Health: on-hand + low-stock + one-click reorder; friendly Stock Count writes a Reconciliation.
9. RBAC: Sales vs Accounts vs Admin see correctly scoped nav/actions; admin creates a user + assigns
   roles from the Next.js UI; privileged calls fail closed without a session.
10. Onboarding: a fresh login completes the wizard → fully operational app.
11. Email: "Email invoice" sends to the customer.
12. Push: payment-received fires a real push; click deep-links to the doc.
13. Full E2E (Part 9) clean, no 404/417 in the log.
14. Dual-theme + 375px + reduced-motion across every new surface; OKLCH only, no black borders.

---

## Appendix — Sequencing, Decisions, Deferrals
- **Build order:** 1 → 2 → 3 → 4 → 5 → 8 → 9, then 6, 7. Parts 1–2 unblock the demo; 5 & 8 are the
  ship gate; 9 is the final E2E; 6–7 are P1 polish that can trail if time is tight (disclose).
- **Decisions to log in `docs/v4/DECISIONS.md`:** B12 implicit-warehouse model + Manufacturing
  Settings defaults (the SME automation contract); B13 RBAC via per-user scoped client (the v4.1-AI
  prerequisite); B14 reports period derived from real Fiscal Years.
- **Deferred to v4.1 (unchanged from B11):** AI transformation, DB-per-tenant, Quality Inspection /
  Product Bundle / Activity Log doctype; Project + HR polish only if runway remains.
- **Reminder:** reference `docs/v4/MESH_REPORTING_CONTRACT.md` at the start and end of your report;
  end with this Part 11 checklist filled in and honest KNOWN GAPS.
