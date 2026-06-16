# PHASE 2Q — E2E §A + §B Remediation (Lead-to-Cash + RBAC UX)

> **Source of truth for what's broken:** `docs/v4/PHASE_2P_E2E_TEST.md` §A & §B **Findings** blocks (live-tested by Kidus 2026-06-15). This handoff turns those findings into a single mesh build unit.
>
> **Mesh reporting contract:** follow `docs/v4/MESH_REPORTING_CONTRACT.md` in your build report — claim = diff, cite `file:line`, no DoD table without code evidence.
>
> **Branch:** cut `feat/v4-phase-2q-e2e-ab-fixes` off the current `feat/v4-phase-2p-enterprise-ship` tip. Do **not** touch `main`/`develop`.

---

## QUALITY CONTRACT (read first — non-negotiable)

1. **Claim = diff.** Every "fixed" line in your report must point at a real hunk. The auditor will grep.
2. **No new abstraction layers, no god-modules, no `__init__.ts`, no dead exports.** (4th-cycle lesson — see `[[v4-build-status]]`.)
3. **Verify ERPNext fields against the LIVE instance before trusting this doc.** This handoff names real ERPNext fields (`party_name`, `prevdoc_docname`, `against_sales_order`, etc.). Confirm each exists on the Pana v15 instance (`/api/method/frappe.client.get_list` or doctype meta) — if a field name differs, fix the map, don't invent.
4. **LIVE RETEST before any ✅.** The headline fix (Part 1) is only "done" when you create a real **Quotation → Sales Order → Delivery Note → Sales Invoice → Payment Entry** chain on the Pana instance and **every rail stage lights up with the correct linked document name**, in both directions, on every detail page. Screenshot/log the resolved rail. Static gates (tsc/vitest) are necessary, not sufficient.
5. **Tests must render real components/hooks**, not simulate them. The flow-resolution fix needs a test that drives `useFlowChain` with mocked Frappe responses and asserts the resolved `stageStatuses`, plus an edge-by-edge assertion that every registered link in `flow-link-map.ts` produces a valid (non-self, non-404) query.

---

## PART 1 — Flow resolution engine: doc-to-doc connections (HEADLINE · P0)

**Symptom (live):** On Quotation, Sales Order, and Delivery Note detail pages, the **FlowRail**, **FlowTracker**, and **Cross-flow "Created from"** show every non-current stage as "Not started" — a document doesn't even light up its own customer. The chain resolves *nothing* in either direction.

**This is a data-resolution bug, not a UI bug.** The engine is `hooks/flows/use-flow-chain.ts` + `lib/flows/flow-link-map.ts`. Four root causes, all confirmed by code reading:

### RC1 — header_link edges are misclassified as `"direct"` (the big one)
`hooks/flows/use-flow-chain.ts` → `buildStagePlans` (lines ~118-165). Step 1 does:
```ts
const direct = findFlowLink(doctype, stage.doctype);
if (direct) { return { kind: "direct", link: direct, ... }; }   // <-- catches header_link edges too
```
`findFlowLink` returns **any** edge, including `pattern: "header_link"` ones. So the dedicated `kind: "header-link"` branch (step 3, lines ~148-162) is **unreachable dead code**. A header-link edge then flows through the `"direct"` path: `pickPrimaryOptions` → `buildLinkFilter(headerLinkDef, currentName)` → for `header_link` that returns `["name","=",currentName]`, i.e. it queries the **target doctype WHERE name = the CURRENT doc's name** — which never matches. Result: Quotation→Customer, SO→Quotation, Customer→Lead, Opportunity→*, Quotation→Lead all silently resolve to nothing.

**Fix:** classify by pattern in `buildStagePlans`:
```ts
const edge = findFlowLink(doctype, stage.doctype);
if (edge?.pattern === "back_link")  return { kind: "direct", link: edge, stageIndex: i, stage: stage.doctype };
if (edge?.pattern === "header_link" && edge.headerField)
  return { kind: "header-link", link: edge, field: edge.headerField, stageIndex: i, stage: stage.doctype };
// (then two-hop search, then none)
```
Also make the **two-hop** search (step 2) consider header_link intermediates (a two-hop through a header field, e.g. SO→Customer[header]→Lead[header], must work).

### RC2 — `Sales Order.quotation` header field does not exist in ERPNext
`lib/flows/flow-link-map.ts:179-186` defines `Sales Order → Quotation` as `header_link, headerField: "quotation"`. **ERPNext Sales Order has no `quotation` header field.** The real Quotation→SO link lives on the child table **`Sales Order Item.prevdoc_docname`** (with `prevdoc_doctype = "Quotation"`).

**Fix — introduce a third resolution pattern, `current_child`:** "read a field off the CURRENT doc's own child rows." `useFlowChain` already fetches the full `currentDoc` for header-link plans, so `currentDoc.items[]` is available. Add:
```ts
pattern: "current_child"
childTable?: string;     // default "items"
childField: string;      // e.g. "prevdoc_docname"
childWhere?: [string, unknown];  // optional sibling filter, e.g. ["prevdoc_doctype","Quotation"]
verifyDoctype: string;   // the `to` doctype, to confirm the candidate exists (limit 1)
```
Resolution: read `currentDoc[childTable]`, find the first row matching `childWhere`, take `row[childField]` as the candidate name, verify it exists in `to`. This is ERPNext-faithful and reusable.

### RC3 / RC4 — backward child-table links query the WRONG parent (the F1 systemic defect)
`flow-link-map.ts` `Delivery Note → Sales Order` (lines 228-244) is a `back_link` with `queryDoctype: "Delivery Note Item"`, `returnParent: true`. Via `resolveQueryDoctype` this **queries the `Sales Order` parent with a `Delivery Note Item` child filter** — invalid (that child table doesn't belong to Sales Order); matches nothing (or errors). Backward resolution from a child pointer must read the **current doc's own** child rows, not query the target.

**Fix:** re-express every *backward* child-pointer edge as the new `current_child` pattern:
- `Delivery Note → Sales Order`: `current_child`, childField `against_sales_order`, verify `Sales Order`.
- (audit all `direction: "backward"` `back_link` edges for the same inversion.)

Forward downstream child links are **correct as-is** (e.g. `Sales Order → Sales Invoice` queries `Sales Invoice` parent with a `Sales Invoice Item.sales_order` filter — the child belongs to SI). Do **not** change those.

### RC5 — missing the trivial direct `→ Customer` edges
A SO/DN/SI each carry their own `customer` header field, but the map has **no `Sales Order → Customer`, `Delivery Note → Customer`, `Sales Invoice → Customer`** edge — so a doc can't light up its own customer. Add three `header_link` edges (`headerField: "customer"`). With RC1 fixed these resolve instantly, and the **Lead** stage then resolves two-hop via `Customer.lead_name` (the existing `Customer → Lead` header edge).

### Part 1 acceptance
- On **Quotation** (made for a customer): Customer stage lights up (its `party_name`); Lead lights up if converted-from-lead.
- On **Sales Order** (made from a quotation): Quotation lights up (via `prevdoc_docname`), Customer lights up (own field), Lead two-hops; downstream Delivery/Invoice light up once they exist.
- On **Delivery Note**: upstream SO + Customer light up; downstream Invoice lights up once it exists.
- On **Sales Invoice**: SO + DN + Customer upstream; Payment downstream once paid.
- **Cross-flow "Created from"** shows the real upstream doc on each page.
- Add the edge-coverage test + a `useFlowChain` render test (RC: header-link no longer dead).

---

## PART 2 — §A F-A1: read/list 403 must explain WHY (P1)
**Symptom:** sales `hannah@` hard-URL → Payment Entry list returned a correct **403 PermissionError** with a rich `_server_messages` reason ("User hannah@ does not have doctype access via role permission for document Payment Entry"), but the UI showed only a flat **"Failed to load payment entries."** The explanatory reason was swallowed.

**Fix:** list/read error states must render the guided, human reason — same quality as the create-submit `GuidedErrorDialog`. Route list-fetch errors through `extractFrappeMessage` (`lib/errors/extract-frappe-message.ts`) so the `_server_messages` / `_error_message` reason surfaces (inline empty-error state or the guided dialog). Audit **all** list pages that currently render a generic "Failed to load X" — they should show the real permission reason on a 403 and a friendly generic only on a true 5xx. (This is the read-side twin of the create-side resolver already in place.)

---

## PART 3 — §A F-A2: fail-FAST permission gate on create/edit (P1, cosmetic/defense-in-depth)
**Symptom:** accounts `eyob@` could open `/sales/sales-order/new`, fill the whole wizard, and was only denied at **Submit**. Secure (server denied) but wasteful UX.

**Fix:** a **route-level capability gate** on `/new` and `/[name]/edit` pages: if the user lacks **create** permission on the doctype, render a premium "You don't have access to create &lt;Doctype&gt;" state immediately (with a Back action) instead of the wizard.

**Source of truth = Frappe boot, NOT a hardcoded map** (avoids drift): extend the auth surface (`/api/auth/me` / `useCurrentUser`) to carry the user's `can_create` / `can_read` / `can_write` doctype lists from Frappe boot (`frappe.boot.user.can_create` etc., fetched with the user's sid). Expose a `useCan(doctype, "create"|"read"|"write")` helper and a `<RequirePermission doctype perm>` wrapper for page bodies.

**Honesty guardrail:** this gate is **cosmetic, like the sidebar** — it must NEVER be the security boundary. Do not remove or weaken the server enforcement (the factory's per-request sid forwarding stays the real gate). Document this in the component.

---

## PART 4 — §A F-A3: 404 / unauthenticated must render a BARE shell (P1)
**Symptom:** on a 404 redirect the authenticated sidebar/app shell still renders.

**Fix:** the not-found route (`app/not-found.tsx` and any segment `not-found`) and the unauthenticated-redirect state must render **outside** the authenticated `Layout` (no sidebar/topbar) — a clean centered 404 with a "Go home" / "Sign in" action. Confirm the exact trigger (Layout likely wraps a segment that also catches not-found); restructure so the shell only renders for authenticated, matched routes.

---

## PART 5 — §A F-A4: functional sidebar upgrade (P2, UI unchanged)
The sidebar **visual design is signed off — do not restyle it.** Add behavior only:
1. **Type-to-filter** nav input (reuse `useCommandPalette`), keyboard-first.
2. **Persist expanded/collapsed sections** across reloads (localStorage, keyed per user) + **auto-expand the section matching the current route**.
3. **Pin / favorites** — star any nav item into a "Pinned" group at the top; persisted per user.
4. *(stretch)* **Recents** — last N visited doc pages.
5. *(stretch)* **Role-aware live badge counts** next to select items (drafts awaiting submit, low-stock, open POs) from cheap `count` queries — must respect the §A perm model (no count call the user would get 403 on).
Items 1-3 are the committed scope; 4-5 only if they don't regress Part 3's perf budget.

---

## PART 6 — §B F-B2: Customer new/edit → V4 golden template (P1)
**Symptom:** Lead→Customer convert lands on a Customer new/edit that is **not** the V4 golden template (no FlowWizard, no prefill — manual entry). Either a regression vs the 2h-followups conversion or it never made this branch.
**Fix:** bring Customer new/edit to the SO/DN golden template (FlowWizard or the master/360 pattern as appropriate for a master), remove any `@ts-nocheck`, and make **Lead → Customer prefill** work (carry lead_name, company name, contact, email, phone, address). Confirm `AUTO_FILL_REGISTRY` has the `Lead → Customer` mapping and the customer `/new` reads the params.

---

## PART 7 — §B F-B3: flow rail + cross-flow perf (P1)
**Symptom:** FlowRail + Cross-flow actions are slow to load on detail pages.
**Fix:** profile `useFlowChain` on SO/DN/SI pages. The hook fires up to 16 `useFrappeList` slots; confirm disabled slots truly don't fetch, the 5-min `staleTime` is honored, and there's no per-render re-keying after the Part 1 changes (the new `current_child` reads should use the already-fetched `currentDoc`, **not** add fetches). Target: first meaningful rail paint &lt; ~500ms warm, no &gt;8-request burst. Report before/after request counts.

---

## PART 8 — §B F-B4: global Print & Share (P1 feature)
Add **Print** and **Share** actions to the shared document **header component** for all transactional docs (priority: Sales Order, Quotation; then SI, PI, DN, PO, PR, PE).
- **Print:** branded, well-formatted document (Pana letterhead: name/logo/address/currency ETB; doc title, parties, items table, totals, terms). Prefer ERPNext's print format via `frappe.utils.print_format` / the print API if reachable; otherwise a clean client-side print view component. Detailed impl log required: which path, which fields, how branding is sourced (Company doc / Letter Head).
- **Share:** copy-link + email-the-document (reuse `/api/email/send` if present) + (stretch) PDF download. Respect RBAC (only show for docs the user can read).
Document the component API and where branding values come from.

---

## PART 9 — §B F-B5: FlowRail + Cross-flow visual redesign (P1, UI)
Kidus upgraded scope from "data fix" to **also redesign the FlowRail + Cross-flow actions UI** (standing deferred visual debt, now in-scope). Apply the premium-UI bar (`[[ui-quality-bar]]`): OKLCH tokens only, no black borders, B1 sidebar-panel container language, horizontal compact pipeline, clear current/done/pending/upcoming states, real motion. **Do Part 1 (data) first** so you're redesigning a rail that actually resolves. Get Kidus's eye on it before calling it done (UI acceptance is his).

---

## PART 10 — §B F-B6: SME persona-role model (DECISION-GATED · P1)
**Symptom:** the O2C workflow spans Sales (Quotation/SO/DN) and Accounts (SI/PE). Stock ERPNext roles don't bundle that way: `hannah@` (Sales User/Manager) is blocked from Sales Invoice; `eyob@` (Accounts User/Manager) can't open SO/DN; adding "Accounts User" to hannah over-granted (full accounting to PE).

**Recommended durable fix — persona roles (confirm matrix with Kidus before running live):** define custom ERPNext roles that match how an SME divides work, assign exactly one per user, and re-key the app to them.

| Persona role | Create/Submit | Read-only (context) |
|---|---|---|
| **Pana Owner** | (= System Manager) | everything |
| **Pana Sales** | Quotation, Sales Order, Delivery Note, Customer, Lead, Contact, Address, **Sales Invoice**, Payment Entry (receive) | Item, Price List, sales reports |
| **Pana Accounts** | Sales Invoice, Purchase Invoice, Payment Entry, Journal Entry | **Sales Order, Delivery Note, Purchase Order, Purchase Receipt**, all financial reports |
| **Pana Stock/Buying** | Material Request, Purchase Order, Purchase Receipt, Stock Entry, Stock Reconciliation, Supplier | Item, Warehouse, Bin |
| **Pana Production** | Work Order, BOM, Operation, Workstation, Stock Entry | Item, Warehouse |

**Implementation:**
- Provisioning: seed these roles + DocPerms via a script/fixtures (extend onboarding provisioning so a new tenant gets them automatically). Do **not** hand-edit prod perms blindly.
- App re-keying: add the persona role names to `Layout.tsx` `SECTION_ROLES` lists **alongside** the existing stock roles (so both work during migration), and to the Part 3 capability gate.

**Immediate desk unblock for Kidus (so §C+ testing continues now, before the persona model lands):**
- Give the sales person **Sales User + Sales Manager** + a narrow custom role **"Sales Biller"** = create/submit/read on *Sales Invoice* + read/create on *Payment Entry* only (NOT full Accounts User).
- Give the accounts person **Accounts User/Manager** + **read** perm on *Sales Order* and *Delivery Note* (and PO/PR).

**This part is decision-gated:** Kidus confirms the persona matrix (or picks the pragmatic standard-roles path) before the mesh builds the provisioning + re-keying. Build the rest of 2Q regardless.

---

## DEFINITION OF DONE
- tsc 0; vitest green (+ the new flow-resolution + capability-gate tests).
- **Part 1 live-retested** on Pana: full Quotation→SO→DN→SI→PE chain, every rail stage resolves both directions with correct doc names — logged with evidence.
- F-A1 read-403 shows the real reason; F-A2 create/edit denies fast (cosmetic) with server still enforcing; F-A3 404 has no authenticated shell.
- Sidebar functions 1-3 work and persist; UI visually unchanged.
- Customer new/edit on V4 + Lead→Customer prefill.
- Print/Share in the doc header (branded); FlowRail/CrossFlow redesigned (Kidus sign-off).
- Persona-role part: built only after Kidus confirms the matrix; immediate desk unblock documented.
- Build report per `MESH_REPORTING_CONTRACT.md` — claim = diff.

## BRANCH
`feat/v4-phase-2q-e2e-ab-fixes` off `feat/v4-phase-2p-enterprise-ship`. Single progressive unit; merge back to the enterprise-ship branch after Kidus re-verifies §A + §B.
