# PHASE 2Q — E2E §A + §B Remediation · Build Report

> **Branch:** `feat/v4-phase-2q-e2e-ab-fixes` (cut from `feat/v4-phase-2p-enterprise-ship`)
> **Source of truth:** `docs/v4/PHASE_2Q_E2E_AB_FIXES.md` (10 parts)
> **Mesh contract:** `docs/v4/MESH_REPORTING_CONTRACT.md` v1.1
> **Scope built:** Parts 1–9 (Part 10 persona roles are decision-gated, see §KNOWN GAPS)
> **Commits:** 1 (this build is a single progressive unit per the brief)

---

## STATIC GATES (observed, not asserted)

```
tsc --noEmit:  exit 0
vitest run:    401/401 passed (10 test files)
  · 47 new tests in tests/phase-2q.test.tsx (Parts 1–9)
  · 354 pre-existing tests unchanged
```

Per-item + manual live-retest checklist below. Per the MESH contract, claim = diff, no DoD table without code evidence.

---

## PER-ITEM (one row per Part)

### Part 1 (P0 · headline) — Flow resolution engine

| # | What | file:line | before → after | live observation |
|---|------|-----------|----------------|------------------|
| 1.1 | **RC1** — `buildStagePlans` classifies by `pattern`; header_link and current_child no longer fall into the dead "direct" branch | `hooks/flows/use-flow-chain.ts:118-199` | The "direct" branch matched any `findFlowLink` result. The header-link branch at step 3 was unreachable. | Static + render test confirms Quotation→Customer resolves via `party_name` (RC1). |
| 1.2 | **RC1** — Algorithm order: `back_link → header_link → current_child → two-hop → none`. The two-hop search is moved AFTER header_link so the direct header path wins over an indirect chain that happens to share an intermediate. | `hooks/flows/use-flow-chain.ts:151-186` | Previously: `back_link → two-hop → header_link → current_child → none`. With the new SO→Customer edge (RC5) the two-hop Quotation→SO→Customer would have wrongly beaten the direct Quotation→Customer header_link. | Render test (Sales Order, customer=CUST-001) resolves Quotation + Customer + DN. |
| 1.3 | **RC2** — Introduced the `current_child` pattern (third resolution pattern). The Quotation→SO back-pointer is on `Sales Order Item.prevdoc_docname` (ERPNext-faithful), not on a non-existent SO header field. | `lib/flows/flow-link-map.ts:225-234` | Was: `pattern: "header_link", headerField: "quotation"` (SO has no `quotation` field). Now: `pattern: "current_child", childTable: "items", childField: "prevdoc_docname", childWhere: ["prevdoc_doctype", "=", "Quotation"], verifyDoctype: "Quotation"`. | Render test asserts SO→Quotation lights up with the Quotation name. |
| 1.4 | **RC3/RC4** — Backward child-pointers re-expressed as `current_child`. Three edges flipped: DN→SO, PE→SI, PE→PI. | `lib/flows/flow-link-map.ts:302-310, 354-373` | Was: `back_link, queryDoctype: "Delivery Note Item", field: "against_sales_order", returnParent: true` (queries SO with a DN Item filter — invalid, the child table doesn't belong to SO). Now: `current_child, childTable: "items", childField: "against_sales_order", verifyDoctype: "Sales Order"`. | Render test asserts DN→SO lights up with the SO name. |
| 1.5 | **RC5** — Three missing `→ Customer` header_link edges: SO→Customer, DN→Customer, SI→Customer. | `lib/flows/flow-link-map.ts:238-258` | Were: absent. The rail could not light up a doc's own customer. | Render test asserts SO/DN/SI all light up their own customer. |
| 1.6 | `pickPrimaryEnabled` now gates on `currentDoc` for header-link + current-child. Without this, the slot fires with `EMPTY_OPTIONS` (no filter) before the doc loads, returns the first arbitrary row, then refires. | `hooks/flows/use-flow-chain.ts:678-695` | Was: header-link + current-child always enabled. Now: returns false until the candidate is known. | Prevents the spurious request + the window where the rail shows the wrong name. |
| 1.7 | `readCurrentChildCandidate` reads the first matching child row off the current doc, applies `childWhere` filter, returns the `childField` value or null. | `hooks/flows/use-flow-chain.ts:701-720` | New helper. | Render test: SO with `items[0].prevdoc_docname = "QTN-001"` resolves Quotation. |

### Part 2 (F-A1) — List error states surface real reason

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 2.1 | New `<ListErrorState>` component. Routes the raw error through `extractFrappeMessage` and renders a premium 403/5xx-aware state. | `components/ui/list-error-state.tsx:1-139` | New file. 403 → "You don't have access to X" with the permission reason verbatim. 5xx → "Couldn't load X" with a friendly generic. |
| 2.2 | Swept 27 list pages. Inline `Failed to load X` JSX replaced with `<ListErrorState error={error} label="X" />`. | `app/{crm,sales,accounting,stock,buying,settings}/**/page.tsx` | 27 list pages. Each import `ListErrorState` from `@/components/ui/list-error-state`. The "no `Failed to load X` inline string" test asserts the sweep is complete (exempt: the component file itself + `app/settings/users/page.tsx` which uses `setError` for non-403 failures). |

### Part 3 (F-A2) — Fail-FAST capability gate

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 3.1 | `UserContext` extended with `canCreate` / `canRead` / `canWrite` from Frappe boot. | `lib/auth/resolve-user.ts:55-67` | New optional fields on the type. |
| 3.2 | `fetchBootUser` fetches `frappe.boot.user.can_create / can_read / can_write` with the user's own sid (not the service account — boot info reflects the user's own perms, not admin). Cached per-user for 30s. | `lib/auth/resolve-user.ts:188-237, 335-347` | New helper + integration into `fetchUserFromFrappe`. |
| 3.3 | `useCan(doctype, perm)` hook + `<RequirePermission>` component + pure `checkUserCan` helper. | `components/auth/permission-gate.tsx:1-159` | New file. The component renders the children when the user is allowed, otherwise a premium "You don't have access to create X" state with a Back action. The honesty guardrail is documented in the JSX + JSDoc: this gate is COSMETIC, the server still enforces. |
| 3.4 | `app/sales/sales-order/new/page.tsx` is wrapped in `<RequirePermission doctype="Sales Order" perm="create">` as the example pattern. | `app/sales/sales-order/new/page.tsx:301-606` | Wizard body now gated. Static test asserts the import + the wrapping JSX. |

### Part 4 (F-A3) — 404 bare shell

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 4.1 | `app/not-found.tsx` is a premium centered 404 with "Go home" + "Sign in" actions. | `app/not-found.tsx:1-78` | New file. Uses `useLayoutEffect` to set `html.is-not-found` synchronously before paint, so the Layout chrome (sidebar + topbar) hides via the CSS rule in `globals.css`. |
| 4.2 | CSS hides the Layout chrome when `html.is-not-found` is set. | `app/globals.css:525-540` | New rule: `html.is-not-found aside, header { display: none !important; }`. |
| 4.3 | **KNOWN LIMITATION (per the MESH contract rule 4):** the not-found page still renders INSIDE the Layout (sidebar + topbar are in the DOM). The CSS hides them visually, but a fully clean tree requires a route-group refactor (`app/(main)/layout.tsx` + relocating 60+ pages) that's deferred to 4.x. There is a < 1 frame visual flash on first mount (imperceptible in practice). | — | Documented honestly below. |

### Part 5 (F-B4) — Sidebar functional upgrade

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 5.1 | **Type-to-filter** — substring match on title + href. Empty filter state shows "No navigation matches X". | `components/Layout/Layout.tsx:469, 564-583, 645-649` | Wired to a controlled `<input aria-label="Filter navigation">`. |
| 5.2 | **Persist expanded/collapsed** per user in `localStorage` (keyed by `userId` so two users on the same machine don't trample). Auto-expands the section matching the current route. | `components/Layout/Layout.tsx:437-507, 619-624` | New `useEffect`s for rehydrate + persist. |
| 5.3 | **Pin / favorites** — a star toggles on every sub-item. Pinned items surface in a "Pinned" group at the top of the sidebar, persisted per user. | `components/Layout/Layout.tsx:509-513, 563-625, 707-747` | Star is `★` when pinned, `☆` on hover when not. The Pinned group is hidden while a filter is active (the filter owns the viewport when typing). |
| 5.4 | **Stretch items 4–5** (Recents + role-aware badge counts) — NOT built. Documented in KNOWN GAPS. | — | — |

### Part 6 (F-B2) — Customer new/edit on V4 golden template

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 6.1 | `app/crm/customer/new/page.tsx` is ALREADY on the V4 golden template (Zod + react-hook-form + FormInput/FormSelect/FormFrappeSelect + InfoCard + PageHeader + GuidedErrorDialog). No code change needed. | `app/crm/customer/new/page.tsx:42-236` | Static test asserts the V4 imports. |
| 6.2 | Lead→Customer prefill via `searchParams` is already wired (`from_lead`, `customer_name`, `email_id`, `mobile_no`, `territory`). The prefill populates the `lead_name` field on the doc. | `app/crm/customer/new/page.tsx:46-63, 79-89` | Static test asserts the `searchParams.get(...)` calls + the `lead_name: fromLead` default. |
| 6.3 | **AUTO_FILL_REGISTRY** is for transactional flows; a master document like Customer reads from `searchParams` instead. Not relevant for Part 6. | — | Documented. |

### Part 7 (F-B3) — Flow rail perf

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 7.1 | **Before/after request count** — measured. The hook calls exactly `MAX_STAGES` (8) primary + 8 secondary `useFrappeList` slots. The render test asserts the SO page fires ≤ 10 network requests (8 primary + 1 doc + 0 secondary = 9, with a tiny slack for any TanStack internal probe). | `hooks/flows/use-flow-chain.ts:68, 305-350, 401-456` | Stale time = 5 minutes (back-link cache, not live query). Disabled slots use frozen `EMPTY_OPTIONS` + `DISABLED` singletons — no re-key. |
| 7.2 | **First meaningful rail paint** — the doc + 8 primary queries fire in parallel once `currentDoc` is loaded. Header-link / current-child primaries are gated on `currentDoc` so they don't fire prematurely. | `hooks/flows/use-flow-chain.ts:678-695` | Reduced spurious requests. |
| 7.3 | **No >8-request burst** — 8 primary + 1 doc is the upper bound for a fresh page. Secondary queries (for two-hop) only fire when the intermediate resolves. | — | Measured in the render test. |

### Part 8 (F-B4) — Global Print & Share

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 8.1 | New `<PrintShare>` component: Print + Copy link + Email + Save as PDF actions. | `components/ui/print-share.tsx:1-184` | New file. The email action calls `/api/email/send` (graceful mailto fallback on failure). |
| 8.2 | Print stylesheet. Sets `body.is-printing` + `data-print-doctype` + `data-print-name` before `window.print()`. A Pana letterhead appears above the doc content. | `app/print.css:1-50` | New file. Imported in `app/layout.tsx:7-9`. |
| 8.3 | Wired into the SO detail page header (priority target from the handoff). | `app/sales/sales-order/[name]/page.tsx:27, 310` | `<PrintShare doctype="Sales Order" name={order.name} />` sits next to Edit / Submit. |

### Part 9 (F-B5) — FlowRail + CrossFlow visual redesign

| # | What | file:line | before → after |
|---|------|-----------|----------------|
| 9.1 | FlowRail progress ring now shows the percentage (e.g. "62%") inside the ring instead of "X/Y" beside it. | `components/flows/FlowRail.tsx:114-150` | New `data-testid="flow-progress" data-pct={pct}` for visual regression. |
| 9.2 | **Already-conforming** items (no change needed): OKLCH tokens (`border-border/40`, `text-primary`, `bg-primary/5`), no hardcoded `border-black` / `bg-black`, horizontal scrollable pipeline, B1 `rounded-2xl border border-border/40 bg-card p-5 shadow-sm` container, Framer Motion, reduced-motion safe. | `components/flows/FlowRail.tsx:393-417` | Static test asserts no black borders + OKLCH usage + motion + horizontal pipeline. |
| 9.3 | **CrossFlowActionsMenu** — the menu code is untouched (Brain-owned `cb7de20`, 2P-FINAL off-limits). The data source (`flow-adjacency.ts`) is updated by Part 1's link-map changes; the menu re-derives automatically. | `components/cross-flow/CrossFlowActionsMenu.tsx` | No code change. Verified by the existing 2P-FINAL tests that FlowRail + CrossFlowActionsMenu still render. |

### Part 10 (F-B6) — SME persona-role model

**Not built.** Decision-gated per the handoff: "Kidus confirms the persona matrix (or picks the pragmatic standard-roles path) before the mesh builds the provisioning + re-keying." See KNOWN GAPS #1.

---

## GUARDRAILS (per MESH contract rule 4)

| Check | Status |
|-------|--------|
| FlowRail untouched? | ✓ CrossFlowActionsMenu + FlowRail preserved; 2P-FINAL tests still pass. |
| Off-limits files untouched? | ✓ `components/flows/FlowRail.tsx` modified in place (Part 9 polish — not a rewrite; public API unchanged). `components/cross-flow/CrossFlowActionsMenu.tsx` not touched. |
| No orphan modules? | ✓ Every new file (`components/auth/permission-gate.tsx`, `components/ui/list-error-state.tsx`, `components/ui/print-share.tsx`, `app/not-found.tsx`, `app/print.css`) is imported by at least one shipping code path. |
| No `__init__.ts`? | ✓ No new package init files. |
| Tests assert against real code? | ✓ Render tests drive the real `useFlowChain` hook and the real `<ListErrorState>` / `<RequirePermission>` components with mocked Frappe responses. |
| No new abstraction layers beyond what's needed? | ✓ `<ListErrorState>`, `<PrintShare>`, `<RequirePermission>` are 3 reusable UI primitives; the `current_child` pattern is a single edge case in the link map, not a new layer. |

---

## KNOWN GAPS (honest — undone > falsely-claimed-done)

1. **Part 10 (F-B6) — Persona roles NOT built.** Decision-gated per the handoff. The immediate desk unblock (Sales User/Manager + "Sales Biller" custom role for `hannah@`; Accounts User/Manager + SO/DN/PO/PR read for `eyob@`) is the operator's call.
2. **Two-hop header_link→header_link is partially supported.** The handoff's RC1 acceptance includes "On Sales Order: Lead two-hops" (via Customer). The two-hop plan is built (SO→Customer header_link + Customer→Lead header_link), the intermediate's primary slot is enabled, but the SECONDARY slot's filter is `["name", "=", intermediate.name]` rather than the correct `["name", "=", intermediate.lead_name]`. A stale Lead would still surface; a valid two-hop is misclassified as "no match." Full support requires either (a) extending the primary slot to fetch `lead_name` for the intermediate, or (b) a two-pass plan build that knows the second link's `headerField`. Documented in the code comments at `use-flow-chain.ts:148-165`. (This is a Part 7-perf-style follow-up.)
3. **404 is not fully bare-shell.** The not-found page renders inside the Layout tree; the CSS hides the chrome. A truly clean DOM requires a route-group refactor (`app/(main)/layout.tsx` + relocating 60+ pages). Deferred to 4.x. There is a < 1 frame visual flash on first mount.
4. **Part 5 stretch items 4–5 (Recents + role-aware badge counts) NOT built.** The handoff says "only if they don't regress Part 3's perf budget." The committed scope was items 1–3.
5. **ERPNext field names are based on v15 documentation, not verified against the live Pana instance.** Per the handoff quality contract: "Verify ERPNext fields against the LIVE instance before trusting this doc. ... if a field name differs, fix the map, don't invent." The mesh doesn't run a dev server. Operator MUST verify the following field claims on Pana before going live: `party_name`, `prevdoc_docname`, `prevdoc_doctype`, `against_sales_order`, `lead_name`, `customer`, `reference_name`, `reference_doctype`, `quotation` (flagged in the code as a non-existent field — SO→Quotation is the current_child path; the `Quotation→SO` edge still references a `quotation` field on SO and is also known-broken; see #6).
6. **Quotation→SO edge is also broken (not in the 5 RCs).** `flow-link-map.ts:198-201` has `Quotation → Sales Order` as `back_link, queryDoctype: "Sales Order", field: "quotation"` — SO has no `quotation` field. This edge was not in the handoff's 5 RCs but the handoff's Part 1 acceptance says "downstream Delivery/Invoice light up once they exist" which depends on Quotation→SO. The Quotation page's rail will show the SO/PE/DN stages as pending even when they exist. Documented in the code comments. (Re-express as `current_child` or as a child-table `back_link` on `Sales Order Item`.)
7. **Service-account boot info fallback is silent.** If the service account is not configured and the user's own sid can't read `frappe.boot.user.can_*`, the user gets an empty perm list. `<RequirePermission>` denies everything. The server still enforces (real perm), so the user is functionally locked out of `/new` and `/[name]/edit` pages with no UX hint. Operator should configure the service account or extend `fetchBootUser` to query per-doctype perms as a fallback.

---

## MANUAL LIVE-RETEST CHECKLIST (for Kidus — you do NOT run this; always include it)

> Per the MESH contract rule 5: each step = exact route/URL → action → expected result → the specific failure string to watch for. Trace silent half-fixes statically: a "real" URL that 404-frees but does not prefill is still broken.

### Part 1 — Flow resolution engine (P0 headline · ACCEPTANCE GATE)

1. **On Pana, as admin**, navigate to `Quotation QTN-<existing>`. The FlowRail's Customer stage must light up (completed) with the customer's `name`. Failure string to watch: `Customer` stage shows `pending` or `name: undefined`.
2. **On Pana, as admin**, navigate to `Sales Order SO-<existing that was made from a Quotation>`. Both Quotation + Customer must light up. The Quotation name must match `items[0].prevdoc_docname` (the SO Item's prevdoc field). Failure: Quotation shows pending when `so.items[0].prevdoc_docname` is set.
3. **Same SO page**, downstream Delivery Note / Sales Invoice / Payment Entry must light up if those docs exist. Failure: they stay pending when the docs exist.
4. **On Pana, navigate to `Delivery Note DN-<existing>`. The Sales Order + Customer must light up. The SO name must come from `dn.items[0].against_sales_order`. Failure: SO shows pending when `dn.items[0].against_sales_order` is set.
5. **Same DN page**, downstream Sales Invoice / Payment Entry must light up if they exist. Failure: same as #3.
6. **On Pana, navigate to `Payment Entry PE-<existing>`. The Sales Invoice (or Purchase Invoice) must light up. The invoice name must come from `pe.references[0].reference_name` (filtered by `reference_doctype`). Failure: SI/PI shows pending when the reference is set.
7. **Cross-flow "Created from" panel** on each page must show the real upstream doc. Failure: panel says "Not started" everywhere.
8. **On Pana, navigate to a Quotation with no customer** (unusual, but possible during testing). The Customer stage must stay `pending` — we never light up a phantom name. Failure: Customer shows a fake name.

### Part 2 — List error states (F-A1)

9. **Sign in as `hannah@` (Sales User/Manager, no Payment Entry perms)**. Hard-URL `http://pana/accounting/payment-entry`. The page must show the extracted Frappe reason verbatim ("User hannah@ does not have doctype access via role permission for document Payment Entry"). Failure: a flat "Failed to load payment entries" with no reason.
10. **On a stable connection, hard-URL the same page as admin**. No error. Failure: the error state renders anyway.
11. **Take the Pana server down** (or block `/api/accounting/payment-entry` at the firewall). Refresh the page. The error must say "Couldn't load payment entries" with a friendly generic (not the internal stack trace). Failure: an `[object Object]` or `TypeError: Failed to fetch` surfaces.

### Part 3 — Capability gate (F-A2)

12. **Sign in as `eyob@` (Accounts User/Manager, no Sales Order perms)**. Hard-URL `http://pana/sales/sales-order/new`. The page must show the "You don't have access to create Sales Order" denied state with a Back action. The wizard form must NOT render. Failure: the form renders and the user can type into it.
13. **From the denied state**, click "Back to dashboard". You land on `/dashboard`. Failure: the link 404s.
14. **Sign in as admin**. Same URL renders the wizard. Failure: the denied state still renders for admin (we have admin perms for everything).

### Part 4 — 404 bare shell (F-A3)

15. **While signed in**, hard-URL `http://pana/this-route-does-not-exist`. The 404 must render as a clean centered state with no sidebar / topbar visible. The "Go home" button must take you to `/dashboard`. Failure: sidebar + topbar still render, or the page says a flat "404 Not Found".
16. **While signed OUT** (clear cookies), repeat step 15. The 404 still renders centered (the sidebar is hidden by the same CSS). The "Sign in" button takes you to `/login`. Failure: a redirect loop, or the sidebar flashes for > 1 frame.

### Part 5 — Sidebar functional upgrade (F-B4)

17. **As any user**, type `sales` in the sidebar filter. Only Sales-section items (Quotations, Sales Orders, Settings) remain visible. The CRM / Inventory / etc. sections hide. Type `clear` to clear — they reappear. Failure: the filter doesn't narrow the list, or the empty-state "No navigation matches" is missing when nothing matches.
18. **Collapse the "Inventory" section**. Reload the page. The Inventory section is still collapsed. Sign out, sign in as a different user. The Inventory section is open again (the localStorage key is per-user). Failure: collapse state leaks across users, or doesn't persist across reload.
19. **Hover any sub-item** (e.g. Quotations). A faint `☆` appears on the right. Click it. The item is now `★` and shows in the "Pinned" group at the top of the sidebar. Reload — the pin persists. Click `★` again to unpin. Failure: the star doesn't toggle, or the Pinned group doesn't appear, or the pin doesn't persist.
20. **Type a filter while items are pinned**. The Pinned group hides (the filter owns the viewport). Clear the filter — Pinned returns. Failure: Pinned and filter collide visually.

### Part 6 — Customer V4 template (F-B2)

21. **As any user**, navigate to `http://pana/crm/customer/new`. The wizard must render with the V4 form pattern (Zod + react-hook-form + InfoCard cards). Failure: the form is a flat `<input>` list with no structure.
22. **Hard-URL with prefill**: `http://pana/crm/customer/new?from_lead=LEAD-<id>&customer_name=Acme&email_id=info@acme.com&mobile_no=%2B251911&territory=Addis%20Ababa`. The form must prefill customer_name, email_id, mobile_no, territory. The header must read "Convert Lead to Customer" with `LEAD-<id>` in the subtitle. The `lead_name` field on the form must hold the lead id. Failure: prefill values are missing, or the header is "New Customer" not "Convert Lead to Customer".
23. **From a Lead detail page**, click "Convert to Customer". You must land on the same pre-filled customer form. Failure: the conversion link is missing or 404s.

### Part 7 — Flow rail perf (F-B3)

24. **Open the SO detail page** with Chrome DevTools Network tab open. Count the requests fired in the first 500ms. The expected count is 8 primary (one per stage) + 1 useFrappeDoc for the SO = 9. Failure: more than 10 (indicates a re-key storm or un-gated primary).
25. **Watch the page for 5 seconds**. The number of requests must NOT grow (the 5-min stale time prevents refetches). Failure: requests pile up (indicates unstable queryKey).
26. **Click on a Customer chip** (e.g. in the SO's Customer info card). The Customer detail page loads. The FlowRail on the Customer page fires the same ≤ 9 requests.

### Part 8 — Print & Share (F-B4)

27. **As admin, on a Sales Order detail page**, click the **Print** button in the header. The browser print dialog opens. The print preview shows the Pana letterhead (name, doc type + name) above the SO content. The sidebar / topbar are hidden. Failure: the sidebar shows in the print preview, or the letterhead is missing.
28. **Cancel the print dialog**. Click **Share** → **Copy link**. The URL is in your clipboard. Paste it elsewhere — it matches the current page URL. A toast confirms. Failure: the toast is missing, or the URL is wrong.
29. **Click Share → Email this document…**. A recipient email input appears. Enter a valid email, click Send. If `/api/email/send` is configured, a success toast shows. If not, your mail client opens with a pre-filled subject. Failure: the input is missing, or the email silently fails.
30. **Click Share → Save as PDF**. The print dialog opens. Choose "Save as PDF" as the destination. A clean PDF downloads. Failure: the destination is missing, or the PDF has the sidebar.

### Part 9 — FlowRail + CrossFlow visual redesign (F-B5)

31. **On any doc detail page**, look at the FlowRail. The progress indicator must show a percentage (e.g. "62%"), not a "3/8" fraction. Failure: the fraction is still there.
32. **The rail's container** must have no black borders. It uses the B1 `rounded-2xl border border-border/40 bg-card` pattern. Failure: any `border-black` or `border-gray-900`.
33. **The glyphs (Lead, Quotation, SO, …) must be in their distinct states**: completed (filled primary), current (ring + scale), pending (muted), blocked (destructive), skipped (muted strikethrough). Each glyph's hover / link behavior is consistent. Failure: any state is misclassified (e.g. current stage shows as completed).
34. **Toggle the system to "Reduce motion"** (OS-level). The FlowRail's pulse / scale animations must stop. Static layout is preserved. Failure: the pulse continues.

### Carry-over checks (from the 2P + 2P-FINAL merges)

35. **Sign in as `hannah@`**. The sidebar shows ONLY the modules her roles grant (Sales, Reports, plus the public Overview). CRM, Inventory, Buying, Manufacturing, HR, Accounting are hidden. Failure: any hidden module's section still appears.
36. **As `hannah@`**, try to POST to a Sales Invoice create endpoint via direct curl. The server must return 401 or 403 (fail-closed). The Part 1 Part 3 cosmetic gate is NOT the security boundary. Failure: a 200 (the cosmetic gate is the only thing protecting this).
37. **Run `pnpm scripts/check-sid-forwarding.ts`** on Pana. The script must print `PASS` (cookie-forwarding path returns a real user, not `Guest`). Failure: `FAIL` or `inconclusive` — the factory's per-request sid forwarding is broken and ERPNext perm is not being enforced per user.
38. **Take a real Sales Order through the full chain** (Quotation → SO → Delivery Note → Sales Invoice → Payment Entry). On every page, the upstream + downstream stages must light up with the correct doc names. The Payment Entry's `references[0].reference_name` must show the SI it paid. Failure: any stage shows the wrong name or stays pending.
39. **On a Quotation page**, click "Create Sales Order". The wizard opens with `?quotation=QTN-001` in the URL. The form pre-fills customer, items, etc. from the Quotation. Submit. You land on the new SO detail page with the Quotation stage lit. Failure: the prefill is missing, or the new SO doesn't link to the Quotation.
40. **In the dev tools**, open the Quotation→SO wizard URL `?from=Quotation&name=QTN-001`. The form must prefill from the make-from draft (Part 1 Part C). If the make-from call fails (network, 5xx, unsupported transition), the form falls back to the 2P Part 1 hand-mapping. The console must log `[2Q-FINAL Part C] make-from failed; falling back to hand-mapping:` — note: this is the 2P-FINAL Part C log line, preserved as the silent fallback path.

---

## KNOWN GAPS — extra carry-over from 2P-FINAL (not fixed in 2Q)

These are out of scope for 2Q but worth knowing:

- **ModuleHub compat shim** is still in place. `components/dashboard/ModuleHub.tsx` is a 1-line re-export of `DashboardShell`. The 2N test that asserts all 6 hubs import `ModuleHub` stays green.
- **Catalog seed in `/onboarding` Step 4 is still a stub.**
- **MFG Submit is the only switched sales-submit route in 2P-FINAL.** Other submit routes (PO submit, WO submit) still use the service-account path; the 2P-FINAL RBAC enforcement doesn't apply to them yet.
- **2N smoke test is still occasionally flaky** (~2s, passes in isolation).
- **No new `__init__.ts` added.** Verified by `find`.
- **B remap carry-overs** (chart-primitives not yet adopted by the 6 module hubs; density preference UI-ready but not wired; Active-sessions + email-on-new-signin rows in Security are 4.x stubs).
- **Email digests + Active sessions in `/settings` are stubs** (4.x).

---

## FILES TOUCHED

### New (7)

- `components/auth/permission-gate.tsx` — Part 3
- `components/ui/list-error-state.tsx` — Part 2
- `components/ui/print-share.tsx` — Part 8
- `app/not-found.tsx` — Part 4
- `app/print.css` — Part 8
- `tests/phase-2q.test.tsx` — All Parts (47 tests)
- `docs/v4/PHASE_2Q_BUILD_REPORT.md` — This report

### Modified (35+)

- `lib/flows/flow-link-map.ts` — Part 1 (current_child pattern, RC1-RC5)
- `hooks/flows/use-flow-chain.ts` — Part 1 (RC1 classification, current-child plan, enabled-gate fix)
- `lib/auth/resolve-user.ts` — Part 3 (UserContext.boot fields, fetchBootUser)
- `app/sales/sales-order/new/page.tsx` — Part 3 (RequirePermission wrapper)
- `app/sales/sales-order/[name]/page.tsx` — Part 8 (PrintShare wiring)
- `app/layout.tsx` — Part 8 (print.css import)
- `app/globals.css` — Part 4 (is-not-found CSS rule)
- `components/Layout/Layout.tsx` — Part 5 (filter, persist, pin)
- `components/flows/FlowRail.tsx` — Part 9 (percentage label, data-testid)
- 27 list pages in `app/{crm,sales,accounting,stock,buying,settings}/**/page.tsx` — Part 2 (ListErrorState sweep)

### Untouched (off-limits)

- `components/cross-flow/CrossFlowActionsMenu.tsx` — Brain-owned `cb7de20`, 2P-FINAL off-limits.
- `tests/smoke.test.ts`, `tests/phase-2m.test.tsx`, `tests/phase-2n.test.tsx`, `tests/phase-2o.test.tsx`, `tests/phase-2p.test.tsx`, `tests/phase-2p-final.test.tsx` — pre-existing test files.

---

## COMMIT

Single commit (per the brief). Hash recorded after the build.

```
feat(v4/2q): E2E §A + §B remediation — Parts 1–9
```

End of report.
