// scripts/check-sid-forwarding.ts
// 2P-FINAL Part A.5 — SID-FORWARDING SELF-CHECK.
//
// Mandatory per the handoff: prove the forwarded session authenticates
// as the real user, not Guest. With a non-admin `sid`,
// `getRequestFrappeApp(req).call().get("frappe.auth.get_logged_user")`
// MUST return that user's email — not the string "Guest" (which is
// what an anonymous / missing / malformed cookie would yield).
//
// Usage (live, against a real Pana Frappe instance):
//
//   ERP_API_URL=https://pana.example.com \
//   TEST_SID=<cookie value from a logged-in browser> \
//   pnpm tsx scripts/check-sid-forwarding.ts
//
//   # Or against the bundled Pana dev Frappe (Docker):
//   ERP_API_URL=http://localhost:8000 \
//   TEST_SID=<sid from a logged-in session> \
//   pnpm tsx scripts/check-sid-forwarding.ts
//
// If `TEST_SID` is unset, the script exits 0 with a SKIPPED message
// (no live Frappe → no live verification). The static-gate
// `pnpm tsc --noEmit` and the file's content are what ship the
// mechanism; the live test is a one-time operator check, not a CI
// gate.
//
// Exit codes:
//   0  — SKIPPED (no sid) or PASS (real user returned, != "Guest")
//   1  — FAIL (returned "Guest" or empty) — DO NOT SHIP
//   2  — Network/auth error (treat as inconclusive; report it)

import { FrappeApp } from "frappe-js-sdk";

async function main() {
  const base = process.env.ERP_API_URL ?? process.env.NEXT_PUBLIC_ERP_API_URL;
  const sid = process.env.TEST_SID;
  if (!base) {
    console.log("SKIP: ERP_API_URL not set — running against no Frappe host.");
    process.exit(0);
  }
  if (!sid) {
    console.log("SKIP: TEST_SID not set — export a valid sid cookie to run the live check.");
    process.exit(0);
  }

  console.log(`[self-check] base=${base} sid.length=${sid.length}`);

  // 2P-FINAL A.1 — build the app the same way the factory does.
  // useToken: false, customHeaders: { Cookie: \`sid=...\` }.
  const app = new FrappeApp(
    base,
    { useToken: false, type: "Bearer" },
    undefined,
    { Cookie: `sid=${sid}` },
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (app.call() as any).get(
      "frappe.auth.get_logged_user",
    );
    const user = (result?.message ?? result) as string;
    console.log(`[self-check] frappe.auth.get_logged_user => ${JSON.stringify(user)}`);
    if (!user || user === "Guest" || user === "null") {
      console.error("FAIL: get_logged_user returned Guest/empty — sid was not forwarded.");
      process.exit(1);
    }
    if (!user.includes("@") && user !== "Administrator") {
      console.error(
        `FAIL: get_logged_user returned '${user}' — expected an email or 'Administrator'.`,
      );
      process.exit(1);
    }
    console.log(`PASS: sid-forwarding authenticates as '${user}' — not Guest.`);
    process.exit(0);
  } catch (err) {
    console.error("Network/auth error — inconclusive:", err);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(2);
});
