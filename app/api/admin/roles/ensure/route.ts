// app/api/admin/roles/ensure/route.ts
// Obsidian ERP v4.0 — Role Ensure endpoint (2P-FINAL Part A.4).
//
// POST /api/admin/roles/ensure
//   Admin-gated. Verifies the canonical ERPNext role set exists on
//   the instance (ERPNext ships these roles + their DocPerms by
//   default, so this is a guard + a no-op on a healthy instance).
//   Returns the list so the onboarding wizard / user-mgmt UI can
//   confirm. Idempotent — safe to call on every login.
//
// 2P-FINAL A.4 keeps this on the service account (no user client):
// it needs to READ the Role doctype regardless of the admin's
// per-doctype role grants (the Role doctype itself is gated behind
// System Manager, but the gate is `isSystemManager(ctx)` enforced
// BEFORE the service-account call). The role of thumb: this is
// admin tooling, so service account BEHIND a role gate.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import {
  resolveUserContext,
  isSystemManager,
} from "@/lib/auth/resolve-user";

/**
 * The canonical role set the Obsidian UI whitelists for assignment
 * (mirrors `app/api/users/route.ts:31-50`). We don't compare against
 * ERPNext's list — we compare against the LIST WE USE, so a
 * non-standard instance that drops a role (e.g. "HR User") gets a
 * real signal (missing) and the onboarding wizard can surface a
 * "Install HR User role" guided action.
 */
const REQUIRED_ROLES = [
  "System Manager",
  "Sales User",
  "Sales Manager",
  "Accounts User",
  "Accounts Manager",
  "Stock User",
  "Stock Manager",
  "Manufacturing User",
  "Manufacturing Manager",
  "Purchase User",
  "Purchase Manager",
  "HR User",
  "HR Manager",
  "Projects User",
  "Projects Manager",
  "Support Team",
];

export async function POST(request: NextRequest) {
  // 2P-FINAL A.4 — admin-gate. Even though the route uses the
  // service account internally to read the Role doctype, the gate
  // ensures only System Managers can hit this endpoint.
  const ctx = await resolveUserContext(request);
  if (!ctx) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
        details: "No valid session.",
        statusCode: 401,
      },
      { status: 401 },
    );
  }
  if (!isSystemManager(ctx)) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden",
        details: "System Manager role required.",
        statusCode: 403,
      },
      { status: 403 },
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await (frappeClient.call as any).get(
      "frappe.client.get_list",
      {
        doctype: "Role",
        fields: ["name"],
        limit_page_length: 500,
      },
    );
    const list = (raw?.message ?? raw) as Array<{ name: string }>;
    const present = new Set(list.map((r) => r.name));
    const presentRoles = REQUIRED_ROLES.filter((r) => present.has(r));
    const missingRoles = REQUIRED_ROLES.filter((r) => !present.has(r));

    return NextResponse.json({
      success: true,
      data: {
        required: REQUIRED_ROLES,
        present: presentRoles,
        missing: missingRoles,
        /** True when the instance has every role the UI whitelists. */
        allPresent: missingRoles.length === 0,
      },
    });
  } catch (error) {
    return NextResponse.json(frappeClient.handleError(error), {
      status: frappeClient.handleError(error).statusCode ?? 500,
    });
  }
}
