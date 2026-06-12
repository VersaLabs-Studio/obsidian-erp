# MESH REPORTING CONTRACT — v1.1

> **Every Obsidian ERP v4 handoff references this file in one line. Read it before you
> write code and again before you write your completion report.** It exists because four
> consecutive build cycles passed `tsc`/`vitest` green with a glowing Definition-of-Done
> table while the app was broken at runtime — and one cycle shipped commit messages
> claiming fixes the code did not contain. This contract is how that stops.

The Brain (Opus 4.8) audits **every** claim in your report against the real tree
(`git show`, `grep`, `read`) — not against your DoD table. A claim that does not match the
code is treated as a failed deliverable, the same as a broken feature. Plan accordingly.

---

## The 6 rules

### 1. Claim = code = diff
For every fix or feature you report as done, quote the **`file:line`** and the
**before → after** of the actual change. "✅ Fixed G1" with no diff is treated as *not done*.
If your commit message says you added X, the commit must contain X. A commit message that
describes work absent from its own diff is the single most serious violation — it is the
reason a prior model was discarded mid-phase.

### 2. No invented abstraction layers
Reuse the existing `useFrappe*` hooks and `@/components/*`. Do **not** create new modules
like `optimizer.ts`, `auditor.ts`, `integrator.ts`, `composer.ts`, `voucher-linker.ts`, or
any file that no shipping code imports. **Every new file must be imported by something that
renders or runs.** Grep your own additions for callers before you report; a module with zero
callers is padding and will be deleted.

### 3. No `__init__.ts`, no Python-isms
This is a TypeScript / Next.js 16 repo. There are no package `__init__` files. Match the
idioms already in the tree.

### 4. Honor explicit guardrails
If a handoff says a doc is **standalone** (no FlowRail / no auto-fill / no flow stage), or a
file is **off-limits**, respect it exactly. Inventing a flow edge that does not exist in
ERPNext (e.g. "Purchase Order → Stock Reconciliation") is an architectural reject, not a
feature.

### 5. Static gates are necessary, not sufficient — and you ALWAYS ship a manual checklist
`tsc --noEmit = 0` and `vitest` green **do not prove the UI works** — every prior failure
passed them. They are table stakes, not evidence.

**Kidus runs the dev server and performs the live retest himself, manually.** You (the mesh)
do **not** start a dev server, and you must **never** report live results you did not produce
(a fabricated "✅ PO create works" costs the whole phase a re-cycle). Instead:
- **ALWAYS end your report with a complete MANUAL LIVE-RETEST CHECKLIST** so Kidus can click
  through it. This is mandatory on every handoff, every time — a report without it is
  incomplete. Each step = **exact route/URL → action → expected result → the specific failure
  string to watch for**.
- Make the checklist cover everything you changed (not a generic list): if you touched the SO
  wizard, step it through end to end with the field values to enter and the doc that should
  result.
- Trace silent half-fixes yourself statically: a "real" URL that 404-frees but does not prefill
  is still broken — verify the target wizard actually reads the param you send
  (`searchParams.get(...)` must match) and say so in the checklist's expected-result.

### 6. Tests assert against real code, not literals
A test that asserts a hardcoded literal (`expect(filter[0]).toBe("Sales Invoice Item")`) or
*simulates* the lookup instead of rendering the real component proves nothing — that is how
a 404 shipped green. Component tests must **render the real component** (RTL) and assert on
its output. Helper tests must **import and call the real exported function**.

---

## Report format (paste this back, filled in)

```
PHASE <id> — <branch> — commits <hash1> <hash2>

STATIC GATES (observed, not asserted):
  tsc --noEmit:  <exit code>
  vitest run:    <pass/total>   (note if count unchanged = no new tests)

PER-ITEM (one row per fix/feature):
  <id> | <file:line> | before -> after (1 line) | live observation

MANUAL LIVE-RETEST CHECKLIST (for Kidus — you do NOT run this; always include it):
  <n>. <route/URL> -> <action + field values> -> <expected result> -> <failure string to watch>

GUARDRAILS:
  standalone respected? off-limits files untouched? no orphan modules? no __init__.ts?

KNOWN GAPS (be honest — undone > falsely-claimed-done):
  <anything not finished, with why>
```

If something is not done, **say so**. An honest "I could not verify PO create against live
Frappe" costs you nothing. A false "✅ PO create works" costs the whole phase a re-cycle.
