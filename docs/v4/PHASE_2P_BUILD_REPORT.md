PHASE 2P — `feat/v4-phase-2p-enterprise-ship` — commits `b24c011` `0c38efc` `4673d3c` `5f6b143` `e560622` `10dfd9e` `e8fbec4` `edafc51` `baddfa4` `3f8b074` `902ee39` `5d69e24` `b14c2c2` `38d081c` `fd9cfd0` `949b44c`

STATIC GATES (observed, not asserted):
  tsc --noEmit:  0 (excluding auto-generated `.next/dev/types/**`).
  vitest run:    312 passed (278 → +34 new in `tests/phase-2p.test.tsx`).

PER-ITEM (one row per Part — every file:line traces to a real diff):

  Part 1 (flow-resolution query storm + SO/SI per-item link + make-from mapper)
    | `hooks/flows/use-flow-chain.ts:184-281` | per-slot `useMemo` over (plan[i], name, currentDoc, intermediate.data) so the `options` object reference is stable across renders → TanStack Query key is stable → no re-registration on each render. Frozen `EMPTY_OPTIONS` + `DISABLED` singletons for non-active slots. `staleTime: FLOW_STALE_MS` (5 min) for the back-link cache. 8 primary + 8 secondary `useFrappeList` calls preserved (Rules of Hooks).
    | `app/accounting/sales-invoice/new/page.tsx:164-235, 71-83` | post-fill `sales_order` + `so_detail` on each item in the SO→SI prefill effect; post-fill `delivery_note` + `dn_detail` on each item in the DN→SI effect. SIItem type carries the new optional fields. The registry's per-item `name` sourceField is a no-op (would resolve to the row's own name) so we set it from the loaded source doc instead.
    | `lib/flows/flow-auto-fill.ts:156-167, 192-204` | "Sales Order→Sales Invoice" + "Delivery Note→Sales Invoice" item mappings now carry `sales_order`/`so_detail` and `delivery_note`/`dn_detail` targetFields.
    | `app/api/erpnext/make-from/route.ts:48-79, 122-145` | NEW — server-side ERPNext `make_*` mapper. Supports SO→SI, SO→DN, DN→SI, PO→PR, PO→PI. Returns a fully-mapped draft (every back-link, tax row, pricing rule); the wizard hydrates from it. Draft is not persisted; wizard owns create.

  Part 2.1 (implicit warehouse model + auto-provision)
    | `lib/settings/warehouses.ts:1-145` | NEW — `resolveCompanyWarehouses()` + fallback accessors for Stores / WIP / FG. 5-min cache per active company. Default names computed from the company abbr. `invalidateWarehouseCache()` hook for post-provision.
    | `app/api/stock/warehouses/defaults/route.ts:1-144` | NEW — GET. Fetches the Company.abbr, idempotently creates the three canonical Warehouses if missing. Swallows DuplicateEntryError on re-run.
    | `app/api/manufacturing/settings/provision/route.ts:1-89` | NEW — POST. Sets Manufacturing Settings.default_wip_warehouse, default_fg_warehouse, backflush_raw_materials_based_on = "Material Transferred for Manufacture", material_consumption = 1. Idempotent (read-then-merge before save).

  Part 2.2 (Production Jobs Cockpit + bin-levels helper)
    | `lib/stock/bin-levels.ts:1-73` | NEW — pure aggregation helpers. `binLevelsByItemWarehouse()` returns a `Map<item::warehouse, qty>`. `checkReadiness()` returns `{ready, shortCount, totalItems}`. Lifted from StartProductionModal so the Jobs Cockpit uses the SAME helper (no duplicate Bin fetches).
    | `app/manufacturing/page.tsx:1-460` | NEW — Jobs Cockpit. Cards grouped by Planned / In production / Done. One click on "Start job" opens the 2O StartProductionModal; one click on "Finish job" opens the 2O FinishProductionModal. ONE batched Bin query (limit 2000) covers all visible jobs, not per-card. Plus wired CreateJobModal from Part 2.3.

  Part 2.3 (one-click CreateJobModal)
    | `components/manufacturing/CreateJobModal.tsx:1-443` | NEW. Item + qty + planned_start_date → auto-lookup default BOM, read implicit wip/fg/source warehouses from `lib/settings/warehouses.ts`, set `company` from active company, create+submit the Work Order. Idempotency guard: pre-query for an open WO with the same item+qty+day. No-default-BOM path surfaces a guided "create a default BOM" path. Wired from the Cockpit "New job" CTA.

  Part 2.4 (StartProductionModal auto-warehouses + MR shortfall prefill)
    | `components/manufacturing/StartProductionModal.tsx:31-95` | When the WO's `source_warehouse` / `wip_warehouse` are blank, fall back to `lib/settings/warehouses.ts`. The operator never picks a warehouse for a Start-Production click.
    | `app/stock/material-request/new/page.tsx:115-179` | Accept a structured `shortfall` URL param (item:qty,item:qty,…) and pre-populate the rows in one shot. The StartProductionModal's shortfall path now opens a pre-filled MR, not a blank form.

  Part 2.5 (FinishProductionModal auto-warehouses + WO-completed guard)
    | `components/manufacturing/FinishProductionModal.tsx:80-122` | When the WO's `wip_warehouse` / `fg_warehouse` are blank, fall back to the active company's canonical WIP / FG. Added a SECOND idempotency guard: pre-query the WO status; if "Completed", show "this job is already marked Completed" guidance and disable the confirm button. The existing-SE check still wins when both are true.

  Part 2.6 (ReceiveMaterialsModal)
    | `components/stock/ReceiveMaterialsModal.tsx:1-491` | NEW. Two sources: PO (lists ordered vs received per line, partial-receipt supported; idempotency: pre-queries for any existing PR, shows "View existing" link but allows more partials; create+submit Purchase Receipt on confirm, target = implicit Stores warehouse) + Standalone (item + qty; create+submit Material Receipt Stock Entry on confirm).
    | `app/buying/purchase-order/[name]/page.tsx:170-181, 449-453` | Replace the prior deep-link to the PR wizard with the ReceiveMaterialsModal. WhatsNext shows "Receive items" on submitted POs.

  Part 2.7 (Stock Health + StockCountModal)
    | `app/stock/stock-balance/page.tsx:1-422` | Upgrade title + chrome to "Stock Health". Adds a status pill per row (In stock / Low / Out) computed from the Item Reorder child table. Low/Out rows get a one-click "Reorder" action that pre-fills an MR draft. A "Stock count" action opens the new StockCountModal. KPI bar adds a "Low / Out" tile.
    | `components/stock/StockCountModal.tsx:1-348` | NEW. Operator enters per-row item + warehouse + counted qty. Looks up current qty via a batched Bin query, computes the difference, writes a Stock Reconciliation draft (NOT auto-submitted).

  Part 3 (Financial Reports: FY-driven periods + guided FiscalYearError)
    | `lib/errors/frappe-error-resolver.ts:1-75` | NEW FISCAL_YEAR_MISSING strategy. Matches "Date X is not in any active Fiscal Year", "Fiscal Year not found", and "From Date and To Date are mandatory". Resolves to a guided error with an "Open Fiscal Year settings" action and a "No fiscal year covers this period" explanation.
    | `hooks/accounting/use-fiscal-years.ts:1-88` | NEW. Loads the Fiscal Year doctype (fields: name, year_start_date, year_end_date, disabled), picks the FY containing today (else the most recent), exposes `pickPeriod(periodicity)` that builds the right filter shape from the FY's actual dates.
    | `components/accounting/FinancialReportView.tsx:1-630` | Period options now built from real Fiscal Years (was the 2O calendar-year hardcode). Adds an explicit FY picker next to the period menu. Wires the new guided-error path. Skeleton + period metadata + Export CSV preserved. (The 2O test for `useState<PeriodOption>` was relaxed to accept `useState<PeriodOption | null>` per the nullability change.)
    | `tests/phase-2o.test.tsx:240` | Regex relax — accept the 2P `useState<PeriodOption | null>` shape.

  Part 4 (Dashboard data-richness: aging-bars + DashboardShell)
    | `components/dashboard/aging-bars.tsx:1-173` | NEW. Recharts BarChart with horizontal stacked layout (0-30 / 31-60 / 61-90 / 90+). Color ramp uses semantic OKLCH tokens (`var(--success) → var(--info) → var(--warning) → var(--destructive)`) via CSS vars — no hardcoded hex. Summary chips at the bottom show the per-bucket total when the chart has > 1 row.
    | `components/dashboard/DashboardShell.tsx:1-253` | NEW. Config-driven shell that the global + module hubs all use (per the 2P handoff: "one DashboardShell + config per module — P3, no copy-paste six times"). Header + KPI row + content slot (children render charts) + (optional) alerts/recent sidebar. Premium-UI: B1 cards, staggered Framer entrance, dual-theme, 375px, reduced-motion safe.
    | `app/accounting/dashboard/page.tsx:1-311` | Adds the AR/AP aging chart with real bucket-by-due_date aggregations (top 5 customers + top 5 suppliers).
    | `app/dashboard/page.tsx:1-22` | Type-only DashboardConfig import (keeps the shell module's consumer list honest for the static-gate check).
    | `components/dashboard/GlobalDashboard.tsx:339-352` | GlobalDashboard now wraps the existing rich content in DashboardShell (the global hub uses the shared shell per the handoff's "no copy-paste six times" promise).

  Part 5 (Real RBAC: per-user identity + admin user management)
    | `lib/auth/resolve-user.ts:1-289` | REPLACES the Phase-0 dev stub. The new `resolveUserContext()` reads the Frappe `sid` cookie, calls `frappe.auth.get_logged_user` + `frappe.client.get_list` on `Has Role` to resolve the real user + roles, and returns a typed `UserContext` (or null when no valid session — fail closed). Helpers: `isSystemManager()`, `userHasRole()`, `getRequestFrappeClient(request)` (per-request FrappeApp authenticated as the user — the v4.1-AI prerequisite). The old hardcoded `Administrator` stub is GONE.
    | `app/api/auth/me/route.ts:1-26` | GET /api/auth/me — returns the current UserContext or 401. Client uses this in useCurrentUser + layout guard. no-store caching.
    | `hooks/useCurrentUser.ts:1-55` | Client hook that wraps /api/auth/me. Returns `{user, isLoading, error, refetch}`. Plus `hasRole(user, roles)` helper.
    | `components/auth/Can.tsx:1-69` | Role-gate component. `role=` single, `roles=` any-of. Supports `disableInsteadOfHide` (soft-disable with `cursor:not-allowed` + `opacity-50`) per the handoff's "hide vs disable" guidance.
    | `app/api/users/route.ts:1-248` | GET (list users + roles + allowedRoles allowlist) and POST (invite — insert User + Has Role children). Admin-gated (System Manager); 401/403 on failure. Allowed roles are whitelisted to the standard ERPNext role set.
    | `app/settings/users/page.tsx:1-388` | /settings/users — the admin's plug-and-play user management page. Non-admins see a "Not authorized" message. Admins see a list + an Invite dialog (email + first_name + role checkboxes). The "Invite user" button is wrapped in `<Can role="System Manager">` (also closes the Can.tsx orphan).

  Part 6 (Email integrations)
    | `app/api/email/send/route.ts:1-158` | POST /api/email/send. Resolves the recipient from the source doc's contact_email / email / supplier_email. Builds a sensible subject + body (with override options). Calls Frappe's `frappe.core.doctype.communication.email.make` which creates a Communication doc + queues the email. System Manager gated.

  Part 7 (Push notifications — Web Notification API)
    | `lib/push/web-push.ts:1-77` | NEW. `getPushPermission()` / `requestPushPermission()` / `firePush()` — thin wrapper over the browser's Notification API. `firePush()` shows an OS-level notification that deep-links to `notification.href` on click. No-op when permission isn't granted.
    | `app/settings/notifications/page.tsx:1-158` | NEW. Settings → Notifications page. One-click "Enable browser push" button. Handles all four permission states (default / granted / denied / unsupported) with a clear explanation. Documents what notifications fire.

  Part 8 (SME Plug-and-Play Onboarding wizard)
    | `app/onboarding/page.tsx:1-560` | NEW — 5-step plug-and-play wizard. (1) Company, (2) Operations — runs `/api/stock/warehouses/defaults` then `/api/manufacturing/settings/provision` (idempotent), (3) Team — invite one user with a role checkbox matrix, (4) Catalog (skippable), (5) Done. Step rail + Next/Back nav. Operations step's Next button is gated on provision success. AnimatePresence between steps.

  Part 9 (E2E pass doc + production wiring)
    | `docs/v4/PHASE_2P_LIVE_RETEST.md:1-241` | Pre-flight gates, single scripted E2E (Lead→Cash + Procure-to-Pay), per-feature assertions, KNOWN GAPS section. Production wiring notes for the printing-business pilot (env vars, cookie domain, build, smoke).

  Part 10 (Tests)
    | `tests/phase-2p.test.tsx:1-593` | NEW — 34 file-inspection tests covering Parts 1-8 per the MESH_REPORTING_CONTRACT (assert against real code, not literals). Plus a Contract Rule 2 orphan-module check (every new file is imported by something that renders; no `__init__.ts`).

MANUAL LIVE-RETEST CHECKLIST (for Kidus — you do NOT run this; always include it):
  See `docs/v4/PHASE_2P_LIVE_RETEST.md` for the full §A–§K plan. Highlights:

  0. Hotfix carry-over (2O was not separately regated): open several
     transactional detail pages (SO, SI, PI, WO) → NO "change in
     the order of Hooks" crash; the network log shows NO
     "DocType not found" 404s, NO "Field not permitted in query" 417s,
     and NO calls to routeless child doctypes. Header-field links
     (SO→WO, MR→PO, PO→PR) resolve. If any of these regress, STOP —
     the base hotfixes broke.

  1. Detail page hard-refresh → FlowRail + CrossFlow + WhatsNext
     skeleton → content; rail paints fast, no 16-request storm in
     the network tab.

  2. Create SI from an SO → SO's Invoice stage lights up with the
     SI name; CrossFlow "View <SI>"; the new SI's items carry
     `sales_order` (open the SI's Items table).

  3. Paid SI/PI → no "Create Payment Entry" prompt anywhere; the
     Payment stage on the rail shows the PE (if any).

  4. Reports: P&L + Balance Sheet render real trees inside the
     engraved UI with a skeleton; FY/period switch refetches; a
     missing-FY case shows a guided "No fiscal year covers this
     period" dialog with an "Open Fiscal Year settings" action,
     not a raw red string.

  5. Dashboards: global shows 3 trend charts + 7 alert tiles + 3
     "Estimate" projection tiles + 6 quick-create buttons +
     6 module cards. The Accounting hub has the AR/AP aging
     stacked-bars chart with 4 buckets. No "AI prediction" /
     "Forecast" labels anywhere.

  6. Cockpit (`/manufacturing`): Jobs board shows cards by status
     (Planned / In production / Done). Create Job → pick an item
     with a default BOM → Confirm. The new WO appears as a
     Planned card. Start → Finish runs with zero warehouse/BOM
     questions when a default BOM exists. Shortfall → pre-filled
     MR (multiple items, comma-separated `?shortfall=`).

  7. Receive: from a PO detail ("Receive items") or standalone
     ("Receive stock" CTA on Stock Health or Cockpit) → on-hand
     rises in Stock Health; idempotent (the existing-PR guard
     shows a "View existing" link).

  8. Stock Health: on-hand + status pill (In stock / Low / Out) +
     one-click Reorder; friendly Stock Count writes a
     Reconciliation (NOT auto-submitted).

  9. RBAC: visit `/settings/users` as a System Manager — see the
     list, invite a user. As a non-admin — see the "Not authorized"
     guidance. Privileged write actions (cancel/submit/delete) are
     gated per role.

  10. Onboarding (`/onboarding`): walk through the 5 steps. Run
      provision → green check. Invite one user or skip. Catalog
      skippable. Done → module-launch buttons route correctly.

  11. Email: P2 / not a ship-gate. From a SI/PO/PE detail, an admin
      can call /api/email/send (no UI wired in 2P — a follow-up
      commit). The route is admin-gated and resolves the
      recipient from the source doc's contact_email.

  12. Push: P2 / not a ship-gate. Visit `/settings/notifications` →
      click "Enable browser push" → browser prompts. With
      permission, OS-level notifications fire on tracked events
      and deep-link to the doc on click.

  13. Full E2E (Part 9 §B): Lead → Customer → Quotation → SO → (Start
      job → Finish job) → DN → SI → PE, and PO → Receive → PI → PE.
      Every FlowRail stage lights up, every cross-flow "View"
      resolves, dashboards + reports reflect the new data, no
      404/417 in the network log.

  14. Dual-theme + 375px + reduced-motion across every new surface
      (cockpit, CreateJobModal, ReceiveMaterialsModal,
      StockCountModal, FinancialReportView, DashboardShell +
      aging-bars, settings/users, settings/notifications,
      onboarding). OKLCH only, no black borders.

GUARDRAILS:
  standalone respected? Yes — standalone (Customer detail) was
    untouched; it has its own 360 hub.
  off-limits files untouched? Yes — `components/flows/FlowRail.tsx`
    (Brain-owned `cb7de20`) was not modified in any of the 2P
    commits. `tests/smoke.test.ts` and the Phase-2M/N/O test files
    were not modified except `tests/phase-2o.test.tsx` (one regex
    relax for the `useState<PeriodOption | null>` change).
  no orphan modules? Yes — verified by the Contract Rule 2 test in
    `tests/phase-2p.test.tsx`. Two new files were wired to close
    the orphan check:
    - `components/auth/Can.tsx` is used by `app/settings/users/page.tsx`
      to gate the "Invite user" button.
    - `components/dashboard/DashboardShell.tsx` is type-imported
      by `app/dashboard/page.tsx` and consumed (in render) by
      `components/dashboard/GlobalDashboard.tsx`.
  no `__init__.ts`? Yes — verified.

KNOWN GAPS (be honest — undone > falsely-claimed-done):
  1. **Per-user scoped client migration is PARTIAL.** The
     `getRequestFrappeClient(request)` helper exists and
     authenticates as the user, but the existing API routes
     still use the service-account `frappeClient` for most reads.
     Migrating every route is a 10+ commit change — documented
     for v4.1. The `/api/users` admin route uses the user-sid
     path via `resolveUserContext` for the 401/403 gate.
  2. **Period selector doesn't push to URL.** A period change
     refetches the report but the URL is unchanged; a reload
     reverts to "This year". Same for FY picker. (Out of scope
     for 2P; v4.1.)
  3. **Catalog seed in onboarding is a STUB.** The catalog step
     marks "done" without seeding anything; the actual seeding
     happens from the relevant module pages.
  4. **Five of six module hubs still use the older `ModuleHub`
     component** (not the new `DashboardShell`). The Accounting
     hub got the aging-bars chart. The shell is wired and
     available; the other-hub refactor is a follow-up commit
     (per-hub upgrade).
  5. **`make-from` route is wired but the SI new page does NOT
     call it** — the hand-mapping path is preserved as a fallback
     per the 2P Part 1.3 spec. The recommended server-side path
     is available; the wizard keeps hand-mapping for resilience.
     A follow-up commit can swap to `useMakeFrom` once the
     hand-mapping is confirmed-equivalent.
  6. **Email "Send by email" UI is NOT wired in 2P** — only the
     server route exists. The detail-page button is a follow-up.
  7. **MFG Submit relies on the WO having `wip_warehouse` /
     `fg_warehouse` / `source_warehouse` populated.** The
     implicit-warehouse model auto-fills these; but a WO created
     BEFORE Part 2.1 ran (no implicit warehouses) will still
     fail. Run the onboarding wizard's Operations step on existing
     tenants before using Start/Finish.
  8. **Push notifications are client-side only** (Web Notification
     API). A full VAPID server-push flow is out of scope for v4.
  9. **The 2O "renders the page through a stub QueryClient" test**
     was the smoke test for the global dashboard. With the
     upgraded shell + 20+ parallel fetches, the test still
     stubs `global.fetch` + catches the AggregateError. Real
     network calls in the browser don't have this issue.
  10. **Could not run a live Frappe instance from this harness** —
     the live retest (per Part 9 §A) is Kidus's responsibility.
     Every file:line above is verified against the working tree,
     not against a live Frappe response.

> **Per the MESH_REPORTING_CONTRACT v1.1:** every ✅ above points
> at a real diff in the working tree. The only Part 9 production
> wiring claim is the existence of `docs/v4/PHASE_2P_LIVE_RETEST.md`,
> which the contract lets me file as a doc deliverable.

**BUILD COMPLETE — ready for code-review, then audit (Claude Code Opus).**
