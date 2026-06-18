# PHASE 2R — Procure-to-Pay flow + Full-Depth Flow Graph (E2E §B residual + §C)

> **Source of truth for what's broken:** live E2E by Kidus on the Pana instance — §B (Lead-to-Cash) residual gaps + §C (Procure-to-Pay) findings, 2026-06-18/19. This handoff turns those findings into one mesh build unit.
>
> **Mesh reporting contract:** follow `docs/v4/MESH_REPORTING_CONTRACT.md` in your build report — claim = diff, cite `file:line`, no DoD table without code evidence.
>
> **Branch:** cut `feat/v4-phase-2r-procure-flowgraph` off the current `feat/v4-phase-2q-e2e-ab-fixes` tip (commit `17eb86f` — it carries the F-A2 gate fix). Do **NOT** touch `main` / `develop` / `deploy/pana`. The client delivery branch (`deploy/pana`) is updated separately by the Brain after merge.

---

## QUALITY CONTRACT (read first — non-negotiable)

1. **Claim = diff.** Every "fixed" line in your report points at a real hunk. The auditor greps.
2. **No new abstraction layers, no god-modules, no dead exports.** Reuse the existing factory + golden template.
3. **Verify every ERPNext field/method against the LIVE Pana v15 instance before trusting this doc.** This handoff names real fields (`prevdoc_docname`, `against_sales_order`, `sales_order`, `delivery_note`, `credit_to`, `set_warehouse`) and real whitelisted mappers (`make_purchase_receipt`, `make_purchase_invoice`). Confirm each; if a name differs, fix it — don't invent (contract rule 4).
4. **LIVE RETEST before any ✅.** Static gates (tsc 0 / vitest green) are necessary, not sufficient. The headline parts (1 + 2) are "done" only when a real **MR → PO → PR → PI → PE** chain AND a real **Quotation → SO → DN → SI → PE** chain on Pana both (a) light up every rail stage with the correct linked doc name in **both directions on every detail page**, and (b) every "Create X from Y" arrives **prefilled**. Screenshot the resolved rails and the prefilled forms.
5. **Tests render real components/hooks**, not simulations.

---

## THE BIG PICTURE — two separate defects masquerade as one "disconnect"

Kidus's §C verdict — *"every operation is blind to each other"* — is **two distinct code paths**, and prior phases kept fixing one and calling the feature done:

| | READ side (the rail) | WRITE side (creation) |
|---|---|---|
| **What** | What lights up on the FlowRail / CrossFlow | What gets prefilled when you click "Create X from Y" |
| **Engine** | `hooks/flows/use-flow-chain.ts` + `lib/flows/flow-link-map.ts` | `app/api/erpnext/make-from/route.ts` + each `/new` page's prefill wiring |
| **Symptom** | "Quotation — Not started", PE shows only its invoice, MR/PO rails dead | "Link to PO" blank, PI has no items/supplier, MR stuck "Pending" |
| **Fix** | **Part 1** (full-depth resolver) | **Part 2** (make-from prefill + status propagation) |

Both must land for the flow to feel connected. Parts 1 and 2 are the headline; everything else is concrete §C bugs and module scope.

---

## PART 1 — Full-depth bidirectional Flow Graph (READ side · P0 HEADLINE)

**Symptom (live).** §B: SO detail shows "Quotation — Not started"; SI shows neither SO nor DN; PE shows only its invoice; DN is missing PE. §C: MR, PO, PR, PI, PE rails are **entirely dead** (and slow). Same engine, same root cause.

**Root cause — the current resolver is pairwise, depth-capped at 2, and direction-blind.** `useFlowChain` fires **16 `useFrappeList` queries per detail page** (8 primary + 8 secondary) and resolves each stage either directly (1 hop) or through exactly one intermediate (2 hops). The Lead-to-Cash flow is **8 stages** (`getFlowForDocType` always selects it for SO/DN/SI/PE). Consequences, all confirmed by code reading:

- **>2-hop stages are unreachable.** PE (stage 7) → Customer (stage 1) is 5–6 hops. Structurally impossible. This is why PE shows only its invoice.
- **2-hop can't traverse a `header_link`/`current_child` SECOND edge.** The secondary slot resolves by anchor-*name* filter (`pickSecondaryOptions` → `buildLinkFilter`); it never fetches the intermediate doc to read its header/child fields. So even PE→SI→Customer (2 hops, but SI→Customer is a header_link) silently fails.
- **Missing registry edges.** `flow-link-map.ts` has **no `Sales Invoice → Sales Order` and no `Sales Invoice → Delivery Note`** edges — though `Sales Invoice Item` carries `sales_order`, `so_detail`, `delivery_note`, `dn_detail` (`types/doctype-types.ts:9403-9411`). Buying has **zero backward edges at all** (no PR→PO, PI→PO/PR, etc.) — that is the entire §C dead-rail story.
- **Over-strict child filter.** `Sales Order → Quotation` (`flow-link-map.ts:225-234`) uses `childWhere: ["prevdoc_doctype","=","Quotation"]`. ERPNext's Quotation→SO mapping sets `prevdoc_docname` but leaves `prevdoc_doctype` **empty** on the SO item → the only valid row is filtered out → "Quotation — Not started". **Verify on live, then drop/relax the discriminator.**
- **Performance == the same defect.** 16 round-trips per page (many sequential: two-hop waits for primary) IS the slowness Kidus reported. Optimizing 16 client queries is the wrong target.

### THE DECISION (Kidus's two options)
> *Option 1 (fully optimize) vs Option 2 (stall the whole page until the rail loads, then paint).*

**Build Option 1, structurally — a single server-side resolver — and REJECT Option 2.** Rationale: Option 2 hides latency without fixing it and makes the *whole* page wait on the slowest stage; it also does nothing for the missing connections. One server endpoint that walks the full graph in one round-trip fixes **both** perf and correctness at the root, because server-side traversal can fetch each doc and read its real link fields at any depth. The rail shows a **localized rail-only skeleton** during that one call — never a whole-page stall.

### Build it
1. **New module `lib/flows/flow-graph.ts`** — pure, testable BFS:
   ```ts
   export type GetDoc = (doctype: string, name: string) => Promise<Record<string, unknown> | null>;
   export async function resolveFlowGraph(
     anchorDoctype: string, anchorName: string, getDoc: GetDoc,
   ): Promise<Record<string /*stage doctype*/, string | null /*doc name*/>>;
   ```
   Algorithm: BFS from the anchor. For each resolved doc, expand **both** directions over the `flow-link-map.ts` registry — `back_link` edges run a list query; `header_link`/`current_child` edges read the **fetched doc's own fields** (that is why `getDoc` is the only I/O seam). Add every newly-resolved neighbour to the frontier; repeat to closure (arbitrary depth). **Branch reconciliation falls out for free**: because every resolved doc re-expands in both directions, a DN and an SI both made from one SO resolve each other *through* the SO hub — do not special-case it. Return one entry per stage of `getFlowForDocType(anchor)`, name or `null`.
2. **New endpoint `GET /api/flows/resolve?doctype=&name=`** — uses the per-request **sid-forwarding factory** (so ERPNext DocPerm still applies), supplies a batched `getDoc`, returns the whole `{stage: name|null}` map in **one** response.
3. **Collapse `useFlowChain` to a single query** against that endpoint (delete the 16-slot machinery). `FlowRail`/`FlowTracker`/`CrossFlowActionsMenu` keep their props; only the data source changes. Rail-only skeleton while the one call is in flight.
4. **Complete the registry** in the same change (each is a real ERPNext field — verify on live):
   - `Sales Invoice → Sales Order` : `current_child`, `items[].sales_order`, verify Sales Order.
   - `Sales Invoice → Delivery Note` : `current_child`, `items[].delivery_note`, verify Delivery Note.
   - `Sales Order → Quotation` : drop/relax the `prevdoc_doctype` childWhere.
   - **Buying backward edges** so PR/PI/PE rails light up: `Purchase Receipt → Purchase Order` (`items[].purchase_order`), `Purchase Invoice → Purchase Order` (`items[].purchase_order`), `Purchase Invoice → Purchase Receipt` (`items[].purchase_receipt` / `pr_detail`), `Purchase Order → Material Request` (`items[].material_request`). Verify each field name on live.

### Part 1 acceptance (live)
- From **any** node of a full Quotation→…→PE chain, every other stage lights up with the correct doc name, both directions, on every detail page (PE included — it must reach Customer/Quotation).
- From **any** node of a full MR→PO→PR→PI→PE chain, same.
- Branch case: an SI billed straight from the SO still surfaces the sibling DN (through the SO hub).
- One network request per detail page for resolution (verify in the network panel); rail-only skeleton, no whole-page stall.

---

## PART 2 — Cross-flow make-from PREFILL + status propagation (WRITE side · P0)

**Symptom (live, §C).** "Create Purchase Invoice from PO/PR" → **no supplier, no items, no link** prefilled. PR create → **"Link to PO" not selected** even though navigated from the PO. The MR the chain originated from stays **"Pending"** after the PR submits. *"No item prefill, no nothing."*

**Root cause.** The **server mappers are already wired** — `make-from/route.ts:72,76` calls `make_purchase_receipt` / `make_purchase_invoice` (and the route supports the buying transitions). The **`/new` pages don't consume the make-from result**: they read a `?from=` param but don't hydrate the form from the mapped doc, and they don't carry the child-level back-links that propagate status.

### Build it
1. **Every "Create X from Y" routes through the server make-from mapper** and hydrates the create form from the returned mapped doc — supplier/customer, **all item lines**, and the link fields (`purchase_order`/`set_warehouse`/`material_request`, etc.). This is the same canonicalization pattern as the WO `make_stock_entry` fix (`[[manufacturing-wo-advancement]]`): let ERPNext's mapper build the doc; don't hand-assemble it. Cover: MR→PO, PO→PR, PO→PI, PR→PI, plus the selling chain (Quotation→SO, SO→DN, DN/SO→SI, SI→PE) for parity.
2. **PR create:** auto-select "Link to PO" from the mapped doc (Part 5 also lists the duplicate-date bug).
3. **Status propagation:** because the mapped doc carries the child back-links (`items[].material_request` / `purchase_order` / `against_sales_order`), submitting the downstream doc lets ERPNext advance the upstream status. After PR submit, **MAT-MR-…-00010 must move off "Pending"** (Ordered/Received per qty); after PI, the PO billing status updates. Verify on live — if status doesn't move, the back-links are missing on the mapped doc; fix the mapping, don't patch status by hand.

### Part 2 acceptance (live)
- "Create PI from PO" lands a form with supplier + every line + the PO link already populated; submit works without manual re-entry.
- The originating MR leaves "Pending" once its PR is submitted.
- No "blind" step remains in MR→PO→PR→PI→PE.

---

## PART 3 — Purchase Invoice `credit_to` blocker (P0)

**Symptom (live).** PI create → submit → `credit_to — Credit To (Payable Account) is required` with **no field to set it and no redirect** → PE untestable.

**Root cause (pinpointed).** `app/accounting/purchase-invoice/new/page.tsx` declares `credit_to` in the form model (`:64`, default `""` `:128`) and it is required server-side, but **step 1's `fields` array (`:85`) omits it** — so it is never rendered.

**Fix.** Render `credit_to` as a Payable-Account select (account where `account_type = "Payable"`, scoped to the active company) in step 1, and **default it from the company's default payable account** (`Company.default_payable_account`) so the common path is zero-click. Add it to the step's `fields` list so wizard validation gates on it.

**Acceptance:** PI submits clean from the create form; PE is then reachable and payable against the PI.

---

## PART 4 — Receive Materials: warehouse choice + the locked Receive button (P0)

**Symptom (live).** The "Receive items" modal shows a **fixed** "Target warehouse: Stores - PAN" and a **Receive button that is locked out / does nothing** — Kidus had to use CrossFlow to receive manually. Also: the MR requested **Raw Materials** warehouse, but receiving forces **Stores**.

**Root cause.** `components/stock/ReceiveMaterialsModal.tsx`: target warehouse is hardcoded to `wh.stores` (`:205`, `:252`, `:257`); the action gates on `totalToReceive > 0` (`:153`, `:184`) but the per-line `receiveQtys` never prefill from outstanding, so `totalToReceive` stays 0 → the button is permanently disabled.

**Fix.**
- **Prefill `receiveQtys` to each line's outstanding** on open, so the button is enabled by default; recompute `totalToReceive` reactively. Fix the disabled gate so a valid receive is actionable.
- **Add a warehouse selector** (the implicit-warehouse change Kidus asked for): default to the company's **Stores**, but let the user choose (e.g. Raw Materials). If none chosen, fall back to Stores. Pass the chosen warehouse to `set_warehouse` / per-line `warehouse` / `t_warehouse` instead of the hardcoded constant. Honor a warehouse hint from the MR if present.

**Acceptance (live):** open "Receive items" → qtys prefilled, Receive enabled → choosing Raw Materials lands stock there; leaving it default lands in Stores; the PR is created+submitted in one click (no CrossFlow workaround).

---

## PART 5 — Purchase Receipt create form fixes

**Symptom (live).** The "Supplier & Date" step shows **two identical date fields** (e.g. `06/18/2026` and `06/18/2026 00:32`). "Link to PO" doesn't prefill (covered by Part 2).

**Fix.** De-duplicate the date fields in the PR create wizard (one `posting_date`; if a posting *time* is needed it is a single distinct field, not a second date). Audit the step's field list against the doctype so no field renders twice.

**Acceptance:** one date field per concept; PR create wizard reviewed against `Purchase Receipt` meta for dupes.

---

## PART 6 — Items master → V4 golden template + full-field create

**Symptom (live).** Item **list/new/edit are not on the V4 template** (only detail is). Items is a **master doc** — Kidus's special requirement: the create form must **expose ALL available Item fields**, not a reduced subset.

**Fix.** Convert `app/stock/item/page.tsx` (list), `app/stock/item/new/page.tsx` (create), `app/stock/item/[name]/edit/page.tsx` to the V4 golden template (premium-UI, OKLCH tokens, factory data hooks, type-safe). The create form must present the **full Item field set** (identity, stock/UOM, valuation, purchase/sales defaults, item group, accounting, etc.) grouped into sensible wizard steps — completeness over minimalism, because it is a master. Default UOM/Item Group from settings.

**Acceptance:** all four Item pages are V4; create exposes the complete field set; tsc/vitest green; live create of a real item (as Kidus did) is smooth.

---

## PART 7 — Item Group + UOM settings UI (net-new)

**Symptom (live).** Kidus needs **Item Group** and **UOM** modules in inventory settings. **API routes already exist** (`app/api/stock/settings/item-group/*`, `app/api/stock/settings/uom/route.ts`) — **no UI**.

**Fix.** Build V4 list/create(/edit) pages under `app/stock/settings/item-group` and `app/stock/settings/uom` against the existing APIs, on the golden template. Surface both under **Inventory → Settings**.

**Acceptance:** create/list Item Groups and UOMs from the UI; the new UOMs/Groups are selectable in the Item create form (Part 6).

---

## PART 8 — Request for Quotation: add to sidebar

**Symptom (live).** The RFQ module is **implemented** (`app/buying/request-for-quotation/{page,new,[name]}`) but **absent from the sidebar** (confirmed: no RFQ entry in `components/Layout/Layout.tsx`).

**Fix.** Add "Request for Quotation" to the **Buying** nav group in `Layout.tsx` (between Purchase Orders and Purchase Receipts is natural). No new pages — wiring only.

**Acceptance:** RFQ reachable from the sidebar; route renders.

---

## PART 9 — Cosmetic capability gates → DEFER to v4.1

**Symptom (live).** As `meklit@`, non-permitted pages were partly accessible, and a server rejection surfaced as a scary generic **"Something went wrong"** dialog (Sales Order / Payment Entry). Kidus's directive: **stop breaking on cosmetic gates — defer ALL cosmetic permission gating to v4.1.**

**Fix.**
- **Neutralize the proactive `<RequirePermission>` create-gate** so it never blocks (the F-A2 gate is already fail-open + admin-bypass after the 2Q hotfix `17eb86f`; make it fully advisory/inert for v4 — do not invest further). The **server remains the sole enforcement point**.
- **Keep** the now-graceful **list error states** (signed off) and extend that grace to **action rejections**: a 403/permission error on submit must render the same calm guided message (reuse `ListErrorState`/`GuidedErrorDialog`) — **no raw "Something went wrong"**.
- Document in the report that proactive/persona permission UX is **v4.1 scope**.

**Acceptance:** no cosmetic gate blocks a legitimate user; permission rejections read gracefully, server-enforced; no generic error dialogs for perms.

---

## PART 10 — Customer V4 template (F-B2): FULL REBUILD

**Symptom (live).** Reported "done" in 2Q but **never built**: no V4 list/detail/edit, no Lead-conversion prefill. *"It's a mess."*

**Fix.** Rebuild the Customer module on the V4 golden template (list, detail, create, edit), and wire **Lead → Customer conversion prefill** (the create form hydrates from the originating Lead via the make-from/searchParams pattern). This is a from-scratch build — treat the prior 2Q F-B2 claim as void.

**Acceptance:** Customer is fully V4; Lead→Customer prefills; live create/convert works.

---

## PART 11 — Print & Share: PDF template remake, system-wide

**Symptom (live).** Print & Share mechanics work, but the **PDF template is poor** and must be remade — **applied across all transactional docs**, not one-off.

**Fix.** Design one premium, branded print/PDF template (letterhead, company identity, line-item table, totals, terms) as a shared layer (`app/print.css` + a shared print component) and apply it to all transactional detail pages (SO/DN/SI/PI/PO/PR/Quotation/PE…). Honor the per-repo branding (the `deploy/pana` logo/name on the client build).

**Acceptance:** a real PDF for each transactional doc looks premium and consistent; one template, many docs.

---

## SIGN-OFFS (verified by Kidus — DO NOT regress)
- **404 bare shell** (F-A3) — signed off.
- **FlowRail + CrossFlow visual redesign** (F-B5) — acceptable.
- **List error states** (F-A1) — graceful, signed off (extend the grace to action rejections — Part 9).
- **Print & Share mechanics** (F-B4) — work; only the PDF template needs the Part 11 remake.

## CARRIED FORWARD (decision, not a build)
- **RBAC personas vs pragmatic** — since cosmetic gates defer to v4.1 (Part 9), this decision **defers with them**. No persona work in 2R.

---

## SUGGESTED SEQUENCING
1. **Part 3** (PI `credit_to`) + **Part 4** (Receive button) — quick P0 unblocks; let Kidus retest the chain end-to-end immediately.
2. **Part 1** (flow graph) — the headline read-side; biggest correctness+perf win.
3. **Part 2** (make-from prefill) — write-side; depends on nothing in Part 1 but completes the "connected" feel.
4. **Parts 5–8** — buying form fixes + Items V4 + settings UI + RFQ sidebar.
5. **Parts 9–11** — gate deferral, Customer rebuild, PDF system-wide.

**Report against `MESH_REPORTING_CONTRACT.md`. Live-retest Parts 1–4 on Pana before any ✅. Good luck.**
