// app/api/users/route.ts
// Obsidian ERP v4.0 — User management API (2P Part 5.3).
//
// List / invite / disable / role-assign endpoints. All endpoints
// require the requesting user to be a System Manager (admin only).
// 401 when the session is invalid; 403 when the user lacks the
// role. The User doctype + Has Role + Role Profile + User Email
// doctypes are touched here. Returns standard ApiResponse shape.

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import {
  resolveUserContext,
  isSystemManager,
} from "@/lib/auth/resolve-user";

const ALLOWED_USER_FIELDS = [
  "name",
  "email",
  "first_name",
  "last_name",
  "full_name",
  "enabled",
  "user_image",
  "creation",
  "modified",
  "role_profile_name",
  "user_type",
];

const ALLOWED_ROLES = [
  // The standard ERPNext role set. The admin page lets the operator
  // pick from this list when assigning roles to a user.
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

async function requireAdmin(request: NextRequest) {
  const ctx = await resolveUserContext(request);
  if (!ctx) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          details: "No valid session.",
          statusCode: 401,
        },
        { status: 401 },
      ),
    };
  }
  if (!isSystemManager(ctx)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          details: "System Manager role required.",
          statusCode: 403,
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, ctx };
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { searchParams } = new URL(request.url);
  const fieldsParam = searchParams.get("fields");
  let fields = ALLOWED_USER_FIELDS;
  if (fieldsParam) {
    try {
      const requested = JSON.parse(fieldsParam) as string[];
      fields = requested.filter((f) => ALLOWED_USER_FIELDS.includes(f));
    } catch {
      // ignore — fall back to whitelist
    }
  }
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await (frappeClient.call as any).get(
      "frappe.client.get_list",
      {
        doctype: "User",
        fields,
        limit_page_length: limit,
      },
    );
    const data = (raw?.message ?? raw) as Array<Record<string, unknown>>;
    // Per-user role list — one batched call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rolesRaw: any = await (frappeClient.call as any).get(
      "frappe.client.get_list",
      {
        doctype: "Has Role",
        fields: ["parent", "role"],
        limit_page_length: 5000,
      },
    );
    const rolesList = (rolesRaw?.message ?? rolesRaw) as Array<{
      parent: string;
      role: string;
    }>;
    const rolesByParent = new Map<string, string[]>();
    for (const r of rolesList) {
      const cur = rolesByParent.get(r.parent) ?? [];
      cur.push(r.role);
      rolesByParent.set(r.parent, cur);
    }
    const enriched = data.map((u) => ({
      ...u,
      roles: rolesByParent.get(String(u.name)) ?? [],
    }));
    return NextResponse.json({ success: true, data: enriched, allowedRoles: ALLOWED_ROLES });
  } catch (err) {
    return NextResponse.json(frappeClient.handleError(err), {
      status: frappeClient.handleError(err).statusCode ?? 500,
    });
  }
}

interface UserCreateBody {
  email: string;
  first_name?: string;
  last_name?: string;
  /** Optional list of roles to assign right after creation. */
  roles?: string[];
  enabled?: boolean;
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  let body: UserCreateBody;
  try {
    body = (await request.json()) as UserCreateBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", statusCode: 400 },
      { status: 400 },
    );
  }
  if (!body?.email) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing email",
        details: "Provide at least an email address.",
        statusCode: 400,
      },
      { status: 400 },
    );
  }
  if (body.roles) {
    const bad = body.roles.filter((r) => !ALLOWED_ROLES.includes(r));
    if (bad.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported role(s)",
          details: `Roles not in allowlist: ${bad.join(", ")}`,
          statusCode: 400,
        },
        { status: 400 },
      );
    }
  }
  try {
    // Insert the User doc.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created: any = await (frappeClient.call as any).get(
      "frappe.client.insert",
      {
        doc: {
          doctype: "User",
          email: body.email,
          first_name: body.first_name ?? body.email.split("@")[0] ?? "User",
          last_name: body.last_name ?? "",
          enabled: body.enabled === false ? 0 : 1,
          send_welcome_email: 1,
          new_password: randomPassword(),
        },
      },
    );
    const userDoc = created?.message ?? created;
    const userName = userDoc?.name ?? body.email;
    // Assign roles (if any)
    if (body.roles && body.roles.length > 0) {
      for (const role of body.roles) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (frappeClient.call as any).get(
            "frappe.client.insert",
            {
              doc: {
                doctype: "Has Role",
                parent: userName,
                parenttype: "User",
                parentfield: "roles",
                role,
              },
            },
          );
        } catch {
          // duplicate or perm error — skip; the user is created.
        }
      }
    }
    return NextResponse.json({ success: true, data: { name: userName, email: body.email } });
  } catch (err) {
    return NextResponse.json(frappeClient.handleError(err), {
      status: frappeClient.handleError(err).statusCode ?? 500,
    });
  }
}

function randomPassword(): string {
  // 14-char random password. The User gets a "welcome email" with
  // a reset link; this is a placeholder.
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 14; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}
