# PHASE 2U — Remediation Handoff (post-2T live retest)

> **READ `docs/v4/MESH_REPORTING_CONTRACT.md` FIRST AND LAST.**
> This handoff is governed by it. In particular **Rule 5**: you do NOT run a
> dev server and must NEVER report live results you didn't produce. Kidus runs
> the live retest manually. Your completion report MUST end with an ordered
> **manual live-retest checklist** (route → action + field values → expected
> result → failure string) covering exactly what you changed. A report without
> that checklist is incomplete.

---

## §0 — Definition of Done (non-negotiable)

A part is DONE only when the described user action works **end-to-end against
live ERPNext**. File existence + green `tsc`/`vitest` are the FLOOR, not the
ceiling. "Green on a stub" is a failure. For every part below, the report-back
must state the wiring path you touched and the manual steps to verify it — and
mark anything you could not verify by reading the code as **UNVERIFIED**, not
"done".

This is the 6th remediation cycle. The recurring failure mode is "gates green,
runtime broken." Do not repeat it.

---

## §1 — DO NOT TOUCH: fixes the Brain already shipped this session

These were fixed and verified (`tsc` 0 errors, 427/427 vitest). **Do not
rewrite, "improve", or re-scaffold them** — they are correct and live-confirmed
by Kidus. Build the items in §2+ *around* them.

| Fix | Files (LOCKED) | Status |
|-----|----------------|--------|
| Warehouse-defaults client/server boundary crash | `lib/stock/warehouse-defaults.ts`, `app/api/stock/settings/warehouse-defaults/route.ts` | LIVE-CONFIRMED |
| Flow-rail 403 (`check_parent_permission`) — child-table back-links now query the PARENT with a 4-tuple via `client.db.getDocList` | `lib/flows/flow-graph.ts` (`resolveBackLink` Path B), `app/api/flows/resolve/route.ts` (`serverListDoc`), `tests/flow-resolver.test.ts` (mock now throws on direct child-table queries) | LIVE-CONFIRMED (all sales + purchase rails light) |
| Partial Payment Entry "Difference Amount must be zero" | `lib/accounting/payment-allocation.ts` (new), `app/accounting/payment-entry/new/page.tsx`, `app/accounting/payment-entry/[name]/edit/page.tsx` | LIVE-CONFIRMED |
| Purchase Receipt FlowRail moved under header | `app/stock/purchase-receipt/[name]/page.tsx` | LIVE-CONFIRMED |

**Guardrail:** the resolver test mock now emulates Frappe `check_parent_permission`
(throws when a child doctype — one whose `HEADER_FIELDS` includes `parent` — is
queried directly). Keep that guard. Any new flow edge must query the PARENT with
a 4-tuple `[childDoctype, field, op, value]` filter, never the child doctype
directly.

---

## §2 — P0: Sales Order → Work Order is completely non-functional

**Symptom (live):** on a Sales Order detail page, "Create Work Orders" does
nothing — no draft Work Order is created, no prefilled form, no error surfaced.
Warehouse defaults ARE set (confirmed: `/api/stock/settings/warehouse-defaults`
returns the FG/WIP warehouses), so this is no longer the warehouse bail.

**What is already ruled out (do not chase):**
- `getAutoFillMapping("Sales Order", "Work Order")` is NOT null — the mapping
  exists at `lib/flows/flow-auto-fill.ts:74` (`"Sales Order->Work Order"`). So
  the silent `if (!mapping) return;` at `executeCreateWorkOrders` is not it.

**Trace these, in order, with the dev tools open (this needs a LIVE trace):**
1. **Button → confirm → execute wiring.** In
   `app/sales/sales-order/[name]/page.tsx`: the "Create Work Orders" CTA calls
   `handleCreateWorkOrders` (~:153) which sets `confirmCreateWO=true`. Confirm
   the `ConfirmDialog` for `confirmCreateWO` actually calls
   `executeCreateWorkOrders` on confirm. If that wire is broken, clicking does
   nothing — matches the symptom exactly.
2. **Default-BOM lookup.** `executeCreateWorkOrders` (~:178) builds
   `bomMap` from `defaultBOMs` and bails per-item with "No default BOM found"
   when `bomMap.get(item_code)` is undefined. Verify the `defaultBOMs` query
   filters/returns the item's `is_default=1` BOM (Kidus has
   `BOM-FG-BCARD-STD-001`). If the BOM exists but isn't flagged default, the
   item silently `continue`s.
3. **The mutation itself.** `createWOMutation.mutate(woPayload)` (~:268) —
   capture the ACTUAL ERPNext response live. Work Order may reject the payload
   (e.g. `skip_transfer`, `wip_warehouse` required when `skip_transfer=0`,
   `planned_start_date`, BOM/item mismatch). Surface the real error through the
   existing `GuidedErrorDialog` rather than failing silently.

**Definition of Done:** on an SO with a manufacturable item that has a default
BOM, with warehouse defaults configured, clicking "Create Work Orders" creates a
**draft** Work Order with `fg_warehouse`/`wip_warehouse` prefilled from the T1
defaults, and it appears in the SO's "Linked Work Orders" card. Verify LIVE.

---

## §3 — Purchasing Payment Entry rail shows no connections

**Symptom (live):** a Pay-type (purchasing) Payment Entry's FlowRail does not
connect to its Purchase Invoice / Purchase Receipt / Purchase Order. Sales PEs
are fine.

**Root cause (grounded):** `getFlowForDocType(doctype)` in
`lib/flows/flow-definitions.ts:233` does
`Object.values(FLOW_DEFINITIONS).find(flow => flow.stages.some(s => s.doctype === doctype))`
— it returns the **first** flow containing the doctype. "Payment Entry" appears
in multiple flows (sales lead-to-cash, AR, and `PURCHASE_FLOW`), so a purchasing
PE is resolved against the **sales** flow. The purchase stages (MR/PO/PR/PI) are
not in that stage list, so they can't light — even though the resolver graph
itself resolves PE→PI correctly (the `current_child` edge on
`pe.references[reference_doctype="Purchase Invoice"]`).

**Fix:** disambiguate the PE's flow by the PE document's own discriminator —
`payment_type === "Pay"` (or `party_type === "Supplier"`) → `PURCHASE_FLOW`;
otherwise the sales flow. The cleanest place is where the PE detail page /
`useFlowChain` picks the flow for the rail (pass the loaded PE doc so the flow
can be chosen by `payment_type`). `getFlowsForDocType` (plural, line 242)
already returns ALL matching flows — use it plus the discriminator. Do NOT
change the resolver graph (§1 locked); only the flow-stage selection.

**Definition of Done:** open a Pay-type PE that paid a Purchase Invoice → the
rail renders the purchase stages and lights the linked PI (and its PR/PO upstream
where present). Sales PEs still render the sales rail. Verify LIVE.

---

## §4 — FlowRail below header on Work Order + Payment Entry detail

Mirror the golden placement now used by Purchase Receipt / Delivery Note: an
`<InfoCard title="… Flow" className="overflow-hidden"><FlowRail …/></InfoCard>`
rendered **directly under `<PageHeader>`**, before the main grid (not in the
sidebar).

- `app/manufacturing/work-order/[name]/page.tsx`
- `app/accounting/payment-entry/[name]/page.tsx`

Pattern reference: `app/stock/delivery-note/[name]/page.tsx:205-208` and the PR
detail page (§1). **Definition of Done:** both pages show the horizontal rail
directly under the header with clickable stages.

---

## §5 — Server-log noise (two 4xx/5xx that pollute every page)

### 5a — `GET /api/stock/warehouses/defaults?company=… 500` (PermissionError)
The OLD bootstrapper route `app/api/stock/warehouses/defaults/route.ts` calls
`frappe.client.insert` via `frappeClient.call.get(...)` — i.e. an **HTTP GET**
to a method that requires POST. Frappe's `is_valid_http_method` then raises
`PermissionError: Not permitted` (403, surfaced as 500). Callers:
`lib/settings/warehouses.ts:104` (implicit-warehouse cache) and
`app/onboarding/page.tsx:106`.
**Fix options:** (a) use `client.db.createDoc("Warehouse", …)` / a POST for the
insert path, or (b) retire this bootstrapper now that explicit warehouse
defaults (§1) exist and have the implicit-warehouse cache read from the new
settings route. Pick one; do not leave the GET-insert. **DoD:** no
`warehouses/defaults` 403/500 in the server log on SO/WO pages.

### 5b — `GET /api/sales-order-item?…filters=[["Sales Order Item",…]] 404`
Something slugifies the **child doctype** "Sales Order Item" into a REST path
`/api/sales-order-item`, which does not exist → 404. No direct caller string was
found, so it is constructed dynamically from a doctype name — likely a legacy
`useFrappeList("Sales Order Item", …)` / `useFlowChain` client fallback firing
in parallel with `/api/flows/resolve` (which now returns 200). Trace the caller
and remove the legacy client-side child-table list; the server resolver is the
single source now. **DoD:** no `/api/sales-order-item` 404 on the Quotation
detail page.

---

## §6 — PR→PI and PO→PI make-from prefill

**Symptom:** opening "Create Invoice" from a Purchase Receipt / Purchase Order
lands on a blank PI create form (no supplier/items/qty/rates), unlike DN→SI
which hydrates correctly.

Note: on a **fully-invoiced** PR, ERPNext legitimately returns "All items have
already been Invoiced/Returned" — that is correct data, not the bug. Test with a
PR that still has uninvoiced items.

**Fix:** the PI create wizard does not hydrate from the `make-from` draft. Diff
it against the SI create wizard (which hydrates from `useMakeFrom`) and apply the
same hydration `useEffect`. Also coalesce `null → ""` on prefilled fields to
avoid "changing a controlled input" console warnings. **DoD:** PR→PI and PO→PI
prefill supplier + items + qty + rates the way DN→SI does, verified LIVE on a
not-fully-invoiced source.

---

## §7 — Deferred enhancements (carried from 2T, still pending)

These were requested in 2T and remain. They are FEATURES, not blockers — build
them only after §2–§6 are green.

1. **Reports — extensive rewrite.** Remove the generic ERPNext report pass-throughs
   (unreadable to SME users) and upgrade to v4 reports. Inventory + Manufacturing
   report pages exist (`app/accounting/reports/{inventory,manufacturing}`) but
   render no data live — wire real data points (stock on-hand/reorder, BOM
   cost/where-used, recent Work Orders) PLUS **actionable callouts** (e.g. "3
   items below reorder → create Material Request"). Keep YoY + URL filters.
2. **Power features — global rollout.** Currently wired on the Sales Order list
   only. (a) Revert the default view to **CARDS for ALL modules**; (b) wire the
   enhanced list (sort/filter/column/density power features) to **every** module
   list page, not just SO; (c) upgrade the scaffold with more useful features.
3. **Print templates — real, not CSS-only.** The current approach
   (`components/ui/print-share.tsx` sets `data-print-*` on `<body>` + `app/print.css`)
   CANNOT render live doc data — a print stylesheet only hides chrome and injects
   static text. Build a **print-only React component** (letterhead + parties +
   items table + totals + terms, populated from the loaded doc) shown only in
   `@media print`, and mount it on each detail page (or via a shared wrapper).
   Wire globally (SO, QN, SI, PI, DN, PO, PR, PE, WO, Job Card, Stock Entry, RFQ,
   Supplier Quotation). **DoD:** Print produces a branded, data-filled document
   per doctype.
4. **Notifications — click-through + CRUD detail.** The store already supports
   `detail`, `href`, `actions` (`lib/stores/notification-store.ts`). Upgrade:
   (a) make panel items **clickable** → navigate to `href`; (b) on click, show
   what was created/updated (the CRUD detail). Enrich the `notify()` calls in
   `hooks/generic/useFrappeMutation.ts` with the doctype + operation + the new
   doc's `href`. **DoD:** creating an SO/WO/etc. produces a panel entry that, when
   clicked, both redirects to the doc and shows the operation detail.
5. **Stock modal — simplify display.** The StockLevelModal works (real bin data
   confirmed) but the layout is cluttered; simplify per Kidus's note.
6. **Payment Terms Template — discoverability.** The create page EXISTS at
   `/accounting/setup/payment-terms/new` (creates the `Payment Terms Template`
   doctype). The QN/SO selector is empty only because no template has been
   created. Add an inline "+ New Template" quick-add to the payment-terms-template
   selector in QN + SO create (mirror `QuickAddField`), and/or a link from sales
   settings, so the user can create one without hunting. **DoD:** from QN/SO
   create, the user can create a Payment Terms Template inline and immediately
   select it.

---

## §8 — Constraints & report-back

- **Do not touch the §1 locked fixes** (resolver Path B, `serverListDoc`,
  payment-allocation, warehouse-defaults lib/route, PR rail).
- **Do not change CrossFlow / FlowRail VISUALS** (2P-FINAL lock) — data-path /
  flow-selection / mount-placement only.
- Verify every ERPNext field name against `types/doctype-types.ts` before use.
- Static gates (`tsc --noEmit`, `vitest run`) are necessary, not sufficient.
- **End your completion report with the mandatory Rule 5 manual live-retest
  checklist** (route → action + field values → expected → failure string),
  per `docs/v4/MESH_REPORTING_CONTRACT.md`. Per-part: a one-line wiring summary +
  the verify steps, with anything unverified-by-reading marked **UNVERIFIED**.
