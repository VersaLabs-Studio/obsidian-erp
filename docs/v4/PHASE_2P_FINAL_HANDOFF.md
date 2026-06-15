# PHASE 2P-FINAL — Enterprise-Complete Handoff (pre-E2E)

> **Branch:** continue on `feat/v4-phase-2p-enterprise-ship` — append commits, do **not** cut a new branch and do **not** merge to `develop` yet (we cross straight into the live E2E from this branch).
> **Read first and last:** `docs/v4/MESH_REPORTING_CONTRACT.md` — claim = code = diff; no orphan modules; no `__init__.ts`; no god-modules; you do not run a dev server; end your report with the filled checklist + honest KNOWN GAPS.
> **Audit context:** Phase 2P was co-signed **88/100** (tsc 0 errors, vitest 311/312 — the one failure is the documented flaky `phase-2n` GlobalDashboard stub-QueryClient smoke test, passes in isolation). This handoff closes the **two ship-gate gaps** the audit found, plus one canonicalization. Everything else in 2P stands as built.

---

## §0 — Orientation

Three Parts, all **[P0 / ship gate]** except where noted:

| Part | What | Why it's a gate |
|------|------|-----------------|
| **A — RBAC enforcement (factory sid-forwarding)** | Route the CRUD factory through a per-request, user-scoped Frappe client so ERPNext's native DocPerm engine enforces every role. Seed/verify the standard role set; wire role assignment into user-mgmt + onboarding. | RBAC today is **cosmetic** — `<Can>` hides buttons but every API read/write runs through the admin service account. A Sales User can read/write anything via the API. This is the v4 ship blocker Kidus mandated. |
| **B — Dashboard data-richness (6 module hubs)** | Bring all six module hubs onto the existing `DashboardShell` with a rich per-module config + one module-appropriate chart each. | The shell + Accounting aging chart shipped, but **0 of 6 hubs** actually consume the shell — they're still the old `ModuleHub`. Kidus flagged this directly. |
| **C — `make-from` canonicalization** | Wire the SI "new" page to the server-side `/api/erpnext/make-from` mapper; retire the hand-mapping prefill as a guarded fallback. | The correct server mapper was built in 2P Part 1 but left unused; hand-mapping is the live path. Canonicalize before ship so flow-prefill is ERPNext-correct (taxes, pricing rules, all back-links). |

**Build order:** A → B → C. A is the gate and the riskiest (it changes the auth posture of every route); land and self-verify it first.

**Off-limits (unchanged from 2P):** `components/flows/FlowRail.tsx` (Brain-owned `cb7de20`). Customer detail standalone 360 hub. Do not touch `tests/smoke.test.ts` or the 2M/2N/2O test files except to ADD coverage.

---

## PART A — RBAC enforcement via factory sid-forwarding  `[P0 · SHIP GATE]`

### A.0 — The mechanism (read this before writing code)

Frappe **already has** a complete role-permission engine (Role · Has Role · DocPerm · User Permission). The bug is that we **bypass** it: `lib/frappe-client.ts` authenticates with the API key/secret (`type: "token"`, `key:secret`) — the **admin service account** — and `lib/api-factory.ts` uses that singleton for every list/get/create/update/delete. So Frappe never runs the *user's* permissions.

The fix is to stop bypassing it: forward the logged-in user's **session** to Frappe on user-facing routes, so Frappe authenticates as that user and enforces their roles natively. **We do not re-implement permissions — we stop suppressing Frappe's.**

> ⚠️ **Do NOT use the Bearer approach currently in `getRequestFrappeClient`.** That helper builds `new FrappeApp(base, { useToken: true, token: () => sid, type: "Bearer" })` → sends `Authorization: Bearer <sid>`. **Frappe does not accept a session id as a Bearer token** (Bearer is OAuth2 access tokens; `token` is `key:secret`). A `sid` is a *session cookie* and must be forwarded as `Cookie: sid=<sid>`. The existing helper is broken and unused — **replace it** per A.1.

### A.1 — Fix the scoped client to forward `sid` as a Cookie  ·  `lib/auth/resolve-user.ts`

Replace `getRequestFrappeClient` with a version that forwards the session cookie via the SDK's custom-headers channel (frappe-js-sdk's `FrappeApp` accepts a custom-headers argument; if your installed version's signature differs, fall back to a thin `fetch` wrapper that injects `Cookie: sid=<sid>` — the requirement is the header, not the SDK ceremony):

```ts
// Per-request Frappe client authenticated AS THE USER (session cookie).
// Frappe runs its native permission engine for this user — no DocPerm
// is re-implemented here.
export function getRequestFrappeApp(request: NextRequest): FrappeApp | null {
  const sid = readSidCookie(request);
  const base = getErpBaseUrl();
  if (!sid || !base) return null;
  // 4th constructor arg = customHeaders on frappe-js-sdk. Forward the
  // session cookie; do NOT pass token params (no service-account auth).
  return new FrappeApp(base, undefined, undefined, { Cookie: `sid=${sid}` });
}
```

Add a convenience that returns the `.db()` + `.call()` the factory needs:

```ts
export function getRequestClient(request: NextRequest):
  { db: ReturnType<FrappeApp["db"]>; call: ReturnType<FrappeApp["call"]> } | null {
  const app = getRequestFrappeApp(request);
  if (!app) return null;
  return { db: app.db(), call: app.call() };
}
```

**Verification gate (mandatory, document the result):** prove the forwarded session authenticates as the real user, not Guest. Add a tiny self-check the report cites: with a non-admin `sid`, `getRequestFrappeApp(req).call().get("frappe.auth.get_logged_user")` returns that user's email (not `"Guest"`). If it returns Guest, the cookie isn't being forwarded — fix before proceeding (everything downstream depends on it).

### A.2 — Route the factory through the user client  ·  `lib/api-factory.ts`

In **all five** handlers (`createListHandler`, `createGetHandler`, `createCreateHandler`, `createUpdateHandler`, `createDeleteHandler`) replace `frappeClient.db.*` with the per-request client. Fail **closed** — no session → 401:

```ts
const client = getRequestClient(request);
if (!client) {
  return NextResponse.json(
    { success: false, error: "Unauthorized", details: "No valid session.", statusCode: 401 },
    { status: 401 },
  );
}
const data = await client.db.getDocList(doctype, { /* …unchanged… */ });
```

Keep `frappeClient.handleError(error)` for error shaping (it's stateless — fine to keep importing the singleton **only** for `handleError`). Frappe now returns `PermissionError` (403) for out-of-role access — `handleError` already maps that to a clean 403 (`lib/frappe-client.ts:112`). The factory's field allowlist + filter passthrough stay exactly as-is.

> The factory handlers already receive `request: NextRequest` as their first arg (`lib/api-factory.ts:58, 147, 194, 247, 327`) — no route signatures change. This is ~5 edits in one file that flips the whole CRUD surface to enforced.

### A.3 — Keep the service account ONLY for privileged system routes (explicit admin gate)

Some routes legitimately need elevated rights (a fresh tenant, bulk provisioning). These **keep** `frappeClient` (service account) but **must** sit behind an explicit `resolveUserContext` + role gate so a non-admin can't reach the elevated path:

| Route | Gate before using `frappeClient` |
|-------|----------------------------------|
| `app/api/users/route.ts` | already gated (`isSystemManager`) ✅ keep |
| `app/api/stock/warehouses/defaults/route.ts` | add `isSystemManager` (or `Stock Manager`) gate |
| `app/api/manufacturing/settings/provision/route.ts` | add `isSystemManager` (or `Manufacturing Manager`) gate |
| `app/api/email/send/route.ts` | already gated (System Manager) ✅ keep |
| `app/api/erpnext/make-from/route.ts` | switch to **user client** (it's a per-user mapping read — no elevation needed) |
| `app/api/accounting/reports/[report]/route.ts` | switch to **user client** so report data respects the user's company/role scope; keep `handleError` |
| `app/api/sales/sales-order/[name]/submit/route.ts` | switch to **user client** (submit must run as the user so Frappe checks submit perm) |

**Rule of thumb:** if the action is something the *logged-in user* is doing → user client. If it's tenant bootstrap/admin tooling → service account **behind a role gate**. Never service-account behind no gate.

### A.4 — Seed + verify the standard role set  ·  new `app/api/admin/roles/ensure/route.ts` (admin-gated)

The role assignment UI already whitelists the standard ERPNext roles (`app/api/users/route.ts:31-50`). ERPNext ships these roles + their DocPerms by default, so enforcement should "just work" once A.2 lands — **but the Pana instance must actually have users carrying these roles, or every non-admin sees 403s.** Deliver:

1. An idempotent **`POST /api/admin/roles/ensure`** (System Manager gated) that verifies the canonical roles exist (they do by default on ERPNext; this is a guard + a no-op on a healthy instance) and returns the list so the UI can confirm.
2. The **demo role matrix** the E2E will exercise — make sure user-mgmt (`app/settings/users/page.tsx`) and onboarding (`app/onboarding/page.tsx` Team step) can assign **multiple** roles per user (checkbox matrix already exists — confirm it persists each `Has Role` child and survives reload):

| Demo user | Roles | Must see | Must NOT see/do |
|-----------|-------|----------|------------------|
| `admin` (System Manager) | System Manager | everything | — |
| `sales@…` | Sales User, Sales Manager | CRM, Selling (Lead→SO→SI) | GL entries, Payment Entry create, BOM edit |
| `accounts@…` | Accounts User, Accounts Manager | Accounting, Payments, Reports | edit BOM, submit Work Order |
| `stock@…` | Stock User | Stock Health, receive, count | post a Journal Entry, edit a price list |
| `mfg@…` | Manufacturing User, Stock User | Cockpit, Start/Finish job | Accounting reports, user-mgmt |

### A.5 — Acceptance criteria (Part A)

- [ ] Logged in as a **non-admin**, a direct `GET /api/accounting/journal-entry` (or any out-of-role doctype) returns **403** (clean `handleError` shape), not data. Logged in as the matching role → 200.
- [ ] Logged in as **admin** (System Manager) → every existing page loads exactly as before (no new 403s). **This is the regression bar** — the demo runs as admin first.
- [ ] No session → factory returns **401** (fail closed), not a service-account 200.
- [ ] `get_logged_user` self-check (A.1) returns the real user, not `Guest` — cited in the report.
- [ ] `<Can>` UI gating still works AND is now backed by real server enforcement (defense-in-depth: UI hides, server denies).
- [ ] Provisioning/onboarding still works end-to-end for an admin (A.3 gates didn't lock the admin out).

---

## PART B — Dashboard data-richness: 6 module hubs on `DashboardShell`  `[P0]`

Convert each module hub from the legacy `ModuleHub` to the existing `DashboardShell` (`components/dashboard/DashboardShell.tsx`) driven by a per-module `DashboardConfig`. **One shell, six configs** — no copy-paste. Each hub gets: header + primaryAction, a 4-KPI row, an alerts list, a recent-docs list, **and one module-appropriate chart** in the `children` slot.

Reuse the existing chart primitives — `components/dashboard/aging-bars.tsx` (stacked buckets) and the recharts specs already in `docs/v4/PHASE_2P_HANDOFF.md` Part 4 (AreaChart trend, grouped BarChart). OKLCH tokens only; no hardcoded hex; skeletons while data loads; dual-theme; 375px; reduced-motion safe.

| Hub · file | KPIs (4) | Chart (children) | Alerts |
|-----------|----------|------------------|--------|
| **Sales** `app/sales/dashboard/page.tsx` | MTD revenue · open SOs · to-deliver · to-invoice | **AreaChart** — trailing-6-mo sales (Σ SI grand_total by month) | drafts, overdue deliveries |
| **CRM** `app/crm/dashboard/page.tsx` | open leads · open opportunities · quotations out · win-rate (est.) | **BarChart** — leads vs converted, trailing 6 mo | stale leads (>14d), quotations expiring |
| **Buying** `app/buying/dashboard/page.tsx` | open POs · to-receive · to-bill · MTD spend | **grouped BarChart** — ordered vs received, top suppliers | overdue receipts, unbilled POs |
| **Stock** `app/stock/dashboard/page.tsx` | total SKUs · low-stock · out-of-stock · stock value | **horizontal bars** — top items by value (or low-stock count) | low/out items (link to Reorder) |
| **Manufacturing** `app/manufacturing/dashboard/page.tsx` | planned jobs · in-production · completed MTD · material shortfalls | **stacked BarChart** — jobs by status over time | shortfall jobs, overdue WOs |
| **Accounting** `app/accounting/dashboard/page.tsx` | receivables · payables · MTD revenue · cash position | **keep the AR/AP aging-bars** (already built) — move it into the shell | overdue invoices, unreconciled |

> Note: `/manufacturing` (the Cockpit, `app/manufacturing/page.tsx`) is a separate page from `/manufacturing/dashboard` (the hub). The hub gets the shell + chart; the Cockpit (2P Part 2.2) stays as-is.

**Data honesty (carry the 2O rule):** every number traces to a real `useFrappeList`/aggregation. Projections stay labeled **"Estimate"** with a basis line (as in `GlobalDashboard`). No "AI"/"Forecast" labels.

### B — Acceptance criteria

- [ ] All six hubs render through `DashboardShell` (grep: each hub imports `DashboardShell`). Legacy `ModuleHub` is removed or no longer imported by any hub (if fully orphaned, delete it + note in report).
- [ ] Each hub shows its 4 KPIs, its chart, alerts, and recent docs — all from real queries, skeletons while loading.
- [ ] Dual-theme + 375px + reduced-motion verified on every hub. OKLCH only.
- [ ] With an empty company the hubs show graceful empty states (not broken charts); with E2E data they populate.

---

## PART C — `make-from` canonicalization  `[P0]`

Wire the SI "new" page to the server mapper built in 2P Part 1; keep hand-mapping only as a guarded fallback.

- `app/accounting/sales-invoice/new/page.tsx` — when `?from=Sales Order&name=…` (or `Delivery Note`), call `POST /api/erpnext/make-from` `{ from, to: "Sales Invoice", name }` and **hydrate the wizard from the returned draft** (it already carries per-item `sales_order`/`so_detail`/`delivery_note`/`dn_detail`, taxes, pricing rules, all back-links). Replace the per-item hand-mapping effect (2P Part 1 lines ~164-235) as the primary path.
- **Fallback:** if the route errors or returns empty, fall back to the existing hand-mapping (don't regress the working path). Surface nothing scary to the user — the fallback is silent.
- Make-from route uses the **user client** per A.3 (so the mapping respects the user's perms).

### C — Acceptance criteria

- [ ] Create SI from an SO → items carry `sales_order` + `so_detail`, taxes/pricing match ERPNext's own mapper, total equals what ERPNext computes. SO→SI flow-rail link resolves.
- [ ] Route failure → silent fallback to hand-mapping; SI still creates.
- [ ] DN→SI path equivalently canonicalized.

---

## §11 — Manual live-retest (append to your report; we run it as the E2E)

This handoff feeds directly into the sectioned live E2E (`docs/v4/PHASE_2P_E2E_TEST.md`). Your report must still include the filled checklist below — these are the deltas this handoff introduces, on top of the 2P Part 11 checklist:

1. **RBAC, admin:** as System Manager, every page from the 2P retest still loads — zero new 403s. (Regression bar.)
2. **RBAC, per role:** create the 5 demo users (A.4 matrix). Each sees only their modules; a direct API call to an out-of-role doctype returns 403; the matching role returns 200.
3. **RBAC, no session:** hitting any `/api/**` CRUD route with no `sid` → 401.
4. **Dashboards:** all six module hubs render via the shell with KPIs + chart + alerts + recent, real data, skeletons, dual-theme/375px/reduced-motion.
5. **make-from:** SI-from-SO carries back-links + correct taxes; SO→SI rail link resolves; route-failure fallback still creates the SI.
6. **Carry-over (2P/2O):** no Hooks-order crash; no `DocType not found` 404s; no `Field not permitted in query` 417s; no routeless-child calls; header-field links resolve.

**KNOWN GAPS:** be honest. If the per-user client can't be wired for one route family without breaking it, say so and leave that family service-account **behind a role gate** (A.3) rather than faking enforcement. Undone > falsely-claimed-done.

---

## Decisions (for the record)

- **B15 — RBAC by session-forwarding, not re-implementation.** We forward the user's `sid` so Frappe's native DocPerm engine enforces. We do not build a parallel permission layer. Service account survives only on explicitly admin-gated bootstrap routes. *(Full factory sid-forwarding — Kidus's chosen depth.)*
- **B16 — One shell, six configs.** Module hubs are pure config over `DashboardShell`; `ModuleHub` retires.
- **B17 — Server mapper is canonical for doc-to-doc prefill.** `make_*` is the source of truth; hand-mapping is a silent fallback only.

> Report against `MESH_REPORTING_CONTRACT.md`. One commit per Part (A, B, C). `tsc --noEmit` 0 + `vitest` green each commit (`--pool=forks` if the worker pool flakes; the `phase-2n` stub-QueryClient timeout is a known flake — note it, don't chase it).
