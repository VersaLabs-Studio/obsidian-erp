# PHASE 2P — End-to-End Live Retest + Production Wiring (Part 9)

> The 2P ship gate. This document is the single source of truth for
> the manual live retest that closes the phase. Kidus runs the dev
> server + Frappe instance, follows the E2E paths below, and confirms
> each one before merge.

---

## §A — Pre-flight (every run)

- [ ] `pnpm tsc --noEmit` returns 0 (excluding auto-generated `.next/` types).
- [ ] `pnpm vitest run --pool=forks` returns green (278+ tests).
- [ ] `pnpm dev` boots; no console errors on the first page load.
- [ ] Frappe instance is reachable; cookies set on the same origin.

---

## §B — End-to-end happy path (the ONE flow that exercises everything)

A single scripted E2E pass. The operator (Kidus) runs this from a
fresh login, asserts each step, and confirms no 404/417 in the
DevTools Network log.

### Lead → Customer → Quotation → SO → (Start job → Finish job) → DN → SI → PE

1. **Lead** — `/crm/lead/new` → fill name + email + company → Save.
   - Expect: lead created, list row shows the new name.
2. **Lead → Customer** — on the Lead detail, click CrossFlow
   "Create Customer" → confirm conversion.
   - Expect: new Customer doc; rail "Customer" stage lights up with
     the Customer name.
3. **Customer → Quotation** — from the Customer detail, click
   "New Quotation" → fill at least 1 item → Save → Submit.
   - Expect: submitted Quotation; rail "Quotation" stage lights up.
4. **Quotation → SO** — on the Quotation detail, click "Create Sales
   Order" → Save → Submit.
   - Expect: submitted SO; rail "Sales Order" stage lights up.
5. **SO → Work Order** — on the SO detail, click "Create Work Order(s)"
   (or use the global "New job" CTA on the Manufacturing hub).
   - Expect: created + submitted WO; rail "Work Order" stage lights up.
6. **Start job** — from `/manufacturing` (the Jobs Cockpit), click
   "Start job" on the Planned card.
   - Expect: StartProductionModal opens. Confirm with no shortfall.
   - On success, route to the new Stock Entry detail; toast says
     "Material transferred for …".
   - Reload the Cockpit: the job is now in the "In production" group.
7. **Finish job** — from the Cockpit, click "Finish job" on the
   In-Production card.
   - Expect: FinishProductionModal opens. Confirm.
   - On success, toast says "Manufactured N × …"; route to the new
     Stock Entry. Reload the Cockpit: the job is in the "Done" group.
8. **SO → Delivery Note** — back on the SO, click "Create Delivery
   Note" → Save → Submit.
   - Expect: submitted DN; rail "Delivery Note" stage lights up.
9. **DN → SI** — on the DN detail, click "Create Sales Invoice"
   (or use the "Make Invoice" path on the DN). Confirm prefilled
   items carry `delivery_note` per-row.
   - Expect: submitted SI; rail "Sales Invoice" stage lights up. The
     SO detail's "Invoice" stage also lights up.
10. **SI → PE** — on the SI detail, click "Create Payment Entry"
    → Save → Submit.
    - Expect: submitted PE; rail "Payment Entry" stage lights up.

### PO → Receive → PI → PE (Procure-to-Pay)

1. **PO** — `/buying/purchase-order/new` → at least 1 item → Save →
   Submit. Status: "To Receive and Bill".
2. **Receive** — on the PO detail, click "Receive items" (the
   ReceiveMaterialsModal).
   - Expect: a PurchaseReceipt is created + submitted. On-hand in
     Stock Health goes up by the received qty.
3. **PI** — on the PO detail, click "Create Purchase Invoice" → Save
   → Submit. (Or use the "Make Bill" path.)
   - Expect: submitted PI; rail "Purchase Invoice" stage lights up.
4. **PI → PE** — on the PI detail, click "Create Payment Entry" →
   Save → Submit.
   - Expect: submitted PE; rail "Payment Entry" stage lights up.

---

## §C — Reports (Part 3)

- [ ] P&L loads at `/accounting/reports/profit-and-loss` with a real
      tree (not a blank table) for an FY that contains today.
- [ ] Balance Sheet loads similarly.
- [ ] AR / AP render aged-bucket columns.
- [ ] FY picker lets you switch; period refetches.
- [ ] A missing-FY instance surfaces the guided "No fiscal year
      covers this period" dialog, not a raw red string.

---

## §D — Dashboards (Part 4)

- [ ] `/dashboard` — global dashboard shows KPI tiles, 3 trend
      charts, 7 actionable alert tiles, 3 "Estimate" projection tiles
      (not "AI" / "Prediction"), 6 quick-create buttons, 6 module
      cards.
- [ ] `/accounting/dashboard` — shows the AR/AP aging stacked-bars
      chart with 4 buckets.
- [ ] All other module hubs render their KPI tiles.

---

## §E — Manufacturing + Stock (Part 2)

- [ ] Jobs Cockpit at `/manufacturing` shows cards by status.
- [ ] Create Job → pick an item with a default BOM → Confirm. The
      new WO appears as a Planned card.
- [ ] Stock Health at `/stock/stock-balance` — shows In stock / Low
      / Out pills + per-row Reorder action.
- [ ] Stock Count → opens the StockCountModal; enter a counted qty
      differing from current → record count → routes to a new
      Stock Reconciliation draft.
- [ ] Implicit warehouses — no modal asks the operator to pick a
      warehouse. The 3 canonical names appear in summaries.
- [ ] Re-run the same Start/Finish on the same WO — the existing-SE
      guard kicks in (B3 idempotency).

---

## §F — RBAC (Part 5)

- [ ] Visit `/settings/users` as a System Manager — see the list.
      Invite a user; the new user appears in the list.
- [ ] Visit `/settings/users` as a non-admin — see the "Not
      authorized" guidance, not a blank page or a 500.
- [ ] `/api/auth/me` returns 401 when no `sid` cookie is present.
- [ ] Privileged write actions (cancel, submit, delete) are gated
      per role on detail pages.

---

## §G — Onboarding (Part 8)

- [ ] Visit `/onboarding` (or follow the redirect when no FY
      exists). Walk through the 5 steps:
  1. Company — confirm defaults.
  2. Operations — click "Run provision" → green check.
  3. Team — invite one user (or skip).
  4. Catalog — opt in or skip.
  5. Done — module-launch buttons route correctly.
- [ ] Re-run the operations step on an already-provisioned tenant
      — should be a no-op (idempotent).

---

## §H — Flow Resolution (Part 1 carry-over)

- [ ] All 17 transactional detail pages pass `isLoading={chainLoading}`
      to FlowRail. Hard-refresh any of them: skeleton → content.
- [ ] Network log on a SO detail hard-refresh: ≤ 8 Frappe requests
      (the resolvable stages, not 16). Disabled slots do not issue
      requests.
- [ ] The SO→SI prefill writes `sales_order` + `so_detail` on every
      item row. The new SI's rail lights up the SO↔SI back-link.

---

## §I — Notifications + Email (Parts 6, 7) — out-of-scope-for-gate

- [ ] Email: "Email invoice" from a SI detail sends a real email to
      the customer's address (Part 6).
- [ ] Push: with browser permission granted, a payment-received in
      another tab fires a real OS/browser push. Clicking it deep-links
      to the doc (Part 7).

These are P1. If they don't pass, the ship is not blocked but the
disclosure is in the report.

---

## §J — Production wiring (Part 9)

The single production VPS for the printing-business pilot:

- **Frappe / ERPNext** — already running (no DB-per-tenant, per B11).
  The deploy step is the `bench restart` after the Vite/Next build
  + env refresh.
- **Env vars** (per B11):
  - `NEXT_PUBLIC_ERP_API_URL` — Frappe base URL.
  - `ERP_API_KEY` / `ERP_API_SECRET` — the service-account API
    credentials (used by the `frappeClient` singleton for read-only
    queries that don't need the user-sid path).
- **Cookie domain** — Frappe's `sid` cookie must be set on the
  same origin as the Next app (no cross-origin), otherwise
  `/api/auth/me` returns 401 for every request.
- **Build** — `pnpm install --frozen-lockfile && pnpm build` then
  `pnpm start` (or the chosen process manager).
- **Smoke** — open `/dashboard` → should redirect to Frappe login
  → after login, the dashboard renders with real data. Then run
  the §B E2E pass above.

> The downstream repo (the printing-business pilot) inherits the
> build verbatim — no `git`-level fork, just an env-file swap.

---

## §K — KNOWN GAPS (must be disclosed in the merge)

1. **Per-user scoped client migration is partial.** The
   `getRequestFrappeClient(request)` helper exists and authenticates
   as the user, but the existing API routes still use the
   service-account `frappeClient` for most reads. Migrating every
   route is a 10+ commit change — documented for v4.1. The
   `User` and `Has Role` reads in the admin user-management
   route DO use the user-sid path (because we call them via the
   `frappeClient.call` singleton, but the underlying `sid` cookie
   is the source of truth via `resolveUserContext` for the 401/403
   gate).
2. **Period selector doesn't push to URL.** A period change
   refetches the report but the URL is unchanged; a reload
   reverts to "This year". Same for FY picker. (Out of scope
   for 2P; v4.1.)
3. **Catalog seed in onboarding is a stub.** The catalog step
   marks "done" without seeding anything; the actual seeding
   happens from the relevant module pages. (Out of scope.)
4. **Modules not yet upgraded to use DashboardShell** — the 5
   module hubs (CRM/Sales/Stock/Buying/Manufacturing) still use
   the older `ModuleHub` component. The Accounting hub got a
   chart. The shell is wired and ready; the rest is a follow-up
   commit (per-hub refactor).
5. **The 2N "renders the page through a stub QueryClient" test**
   was the smoke test for the global dashboard. With the new
   data-richness it issues 20+ parallel fetches in jsdom; the
   2O test stubs `global.fetch` + catches the AggregateError.
   Real network calls in the browser don't have this issue.
6. **`make-from` route** is wired but the SI new page does NOT
   call it (the hand-mapping path is preserved as a fallback per
   the 2P Part 1.3 spec). The recommended server-side path is
   available; the wizard keeps hand-mapping for resilience.
7. **MFG Submit relies on the WO having `wip_warehouse` /
   `fg_warehouse` / `source_warehouse` populated.** The implicit-
   warehouse model auto-fills these; but a WO created BEFORE
   Part 2.1 ran (no implicit warehouses) will still fail. Run
   the onboarding wizard's Operations step on existing tenants
   before using Start/Finish.
8. **Email + Push are P1 polish (Parts 6, 7)** — included in the
   same phase per the build order, but the live retest focuses
   on Parts 1, 2, 3, 4, 5, 8. Email/Push can trail.
