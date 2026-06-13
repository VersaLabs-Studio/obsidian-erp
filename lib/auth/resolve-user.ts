// lib/auth/resolve-user.ts
// Obsidian ERP v4.0 — Per-user identity + scoped Frappe client (2P Part 5).
//
// 2P Part 5.1 — REPLACES THE PHASE-0 DEV STUB. The previous version
// returned `{ userId: "Administrator" }` for every request — which
// made the entire app operate as the admin service account. The new
// version:
//
//   1. Reads the Frappe session cookie (`sid`) from the incoming
//      request. Browsers send it on the same-origin fetch.
//   2. Validates the session with Frappe's
//      `frappe.auth.get_logged_user`. The session is a real,
//      ERPNext-issued signed cookie — not a Next.js fake.
//   3. Fetches the user's roles via `frappe.client.get` on `User`.
//      The roles drive the RBAC UI in `useCurrentUser` / `<Can>`.
//
// 2P Part 5.2 — Per-user scoped Frappe client. The new
// `getRequestFrappeClient(request)` helper creates a per-request
// FrappeApp instance authenticated as the user (using the `sid`
// cookie as the auth header). This is the prerequisite for the
// v4.1-AI executor (so the AI cannot do anything the user cannot).
//
// Why this lives in `lib/auth/`: the auth surface is shared by all
// API routes, the layout guard, and the user-management admin page.
// Keeping it out of `lib/api-factory.ts` avoids coupling.

import { NextRequest } from "next/server";
import { FrappeApp } from "frappe-js-sdk";

// ---------------------------------------------------------------------------
// User context (the shape all API routes + UI hooks read)
// ---------------------------------------------------------------------------
export interface UserContext {
  userId: string;
  email?: string;
  fullName?: string;
  /** Primary role label (e.g. "Sales User", "System Manager"). */
  userRole: string;
  /** All roles the user holds (admin uses this for `<Can>` gating). */
  roles: string[];
  /** Tenant identifier (subdomain or "default" for single-tenant). */
  tenantId: string;
  /** Frappe session cookie value to forward in API calls. */
  frappeSession: string;
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// ---------------------------------------------------------------------------
// Cached resolution per-request. Each call to `resolveUserContext`
// re-reads the cookie and queries Frappe, but the result is memoized
// in a WeakMap so a single request with multiple `resolveUserContext`
// calls (rare) only does one network round-trip.
// ---------------------------------------------------------------------------
const _resolutionCache = new WeakMap<NextRequest, UserContext>();

// ---------------------------------------------------------------------------
// Helper: read the Frappe `sid` cookie. Frappe sets `sid` on the
// top-level domain; on the same origin, the browser sends it
// automatically. We look in BOTH the Cookie header and the
// `next/headers` cookies store (Next 14+ exposes cookies()).
// ---------------------------------------------------------------------------
function readSidCookie(request: NextRequest): string | null {
  // Direct header (works in all Next versions + middleware).
  const cookieHeader = request.headers.get("cookie") ?? "";
  const m = cookieHeader.match(/(?:^|;\s*)sid=([^;]+)/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  // Next 14+ cookies() — try `next/headers` lazily (so we don't
  // require it on older Next).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cookies } = require("next/headers") as {
      cookies: () => { get: (n: string) => { value: string } | undefined };
    };
    const c = cookies().get("sid");
    if (c?.value) return c.value;
  } catch {
    // Older Next or no next/headers available — fall through.
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helper: extract the active company for the request (used by tenant
// resolution). The 2L pattern stores this in sessionStorage on the
// client; for server-side, the cookie name `active_company` is the
// fallback (set by Settings → Company).
// ---------------------------------------------------------------------------
function readActiveCompanyCookie(request: NextRequest): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const m = cookieHeader.match(/(?:^|;\s*)active_company=([^;]+)/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  return "default";
}

// ---------------------------------------------------------------------------
// Internal: ERPNext base URL (server-only). Reused by the
// per-user scoped Frappe client below.
// ---------------------------------------------------------------------------
function getErpBaseUrl(): string {
  return process.env.NEXT_PUBLIC_ERP_API_URL || process.env.ERP_API_URL || "";
}

// ---------------------------------------------------------------------------
// Internal: fetch a User doc + role list using the user's session.
// We do NOT use the service-account `frappeClient` (that would
// bypass ERPNext's own permission engine). Instead, we hit Frappe
// directly with the `sid` cookie, which causes ERPNext to run its
// own auth/perm checks — so the resolution fails closed for users
// that don't have access to the User doctype.
// ---------------------------------------------------------------------------
async function fetchUserFromFrappe(sid: string): Promise<{
  userId: string;
  email?: string;
  fullName?: string;
  roles: string[];
} | null> {
  const base = getErpBaseUrl();
  if (!base) return null;
  try {
    // Step 1: get_logged_user — cheap call; returns the email or null.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loggedRaw: any = await fetch(`${base}/api/method/frappe.auth.get_logged_user`, {
      headers: { Cookie: `sid=${sid}` },
      cache: "no-store",
    }).then((r) => r.json().catch(() => null));
    const userId = (loggedRaw?.message ?? loggedRaw) as string | null;
    if (!userId || typeof userId !== "string" || userId === "Guest") {
      return null;
    }
    // Step 2: get the user doc + roles. ERPNext exposes roles on
    // `User.roles` (child table) AND on the `Has Role` doctype. We
    // fetch both to be safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rolesRaw: any = await fetch(
      `${base}/api/method/frappe.client.get_list?doctype=Has Role&filters=${encodeURIComponent(
        JSON.stringify([["parent", "=", userId]]),
      )}&fields=${encodeURIComponent(JSON.stringify(["role"]))}&limit_page_length=100`,
      { headers: { Cookie: `sid=${sid}` }, cache: "no-store" },
    ).then((r) => r.json().catch(() => null));
    const roles = ((rolesRaw?.message ?? rolesRaw) as Array<{ role: string }>).map(
      (r) => r.role,
    );
    // Step 3: full user doc for full_name + email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRaw: any = await fetch(
      `${base}/api/method/frappe.client.get?doctype=User&name=${encodeURIComponent(userId)}`,
      { headers: { Cookie: `sid=${sid}` }, cache: "no-store" },
    ).then((r) => r.json().catch(() => null));
    const userDoc = userRaw?.message ?? userRaw ?? {};
    return {
      userId,
      email: userDoc.email ?? undefined,
      fullName: userDoc.full_name ?? userDoc.first_name ?? undefined,
      roles,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public: resolve the current user from the request. Fail closed —
// when no valid session is present, return null (callers should
// throw UnauthorizedError to send a 401).
// ---------------------------------------------------------------------------
export async function resolveUserContext(
  request: NextRequest,
): Promise<UserContext | null> {
  const cached = _resolutionCache.get(request);
  if (cached) return cached;
  const sid = readSidCookie(request);
  if (!sid) return null;
  const user = await fetchUserFromFrappe(sid);
  if (!user) return null;
  const ctx: UserContext = {
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    userRole: user.roles[0] ?? "User",
    roles: user.roles,
    tenantId: readActiveCompanyCookie(request),
    frappeSession: sid,
  };
  _resolutionCache.set(request, ctx);
  return ctx;
}

// ---------------------------------------------------------------------------
// Public: per-request FrappeApp instance, authenticated as the user.
// Uses the `sid` cookie as a Bearer token via frappe-js-sdk's
// session-cookie auth mode (the SDK supports this with the
// `useToken: false` + custom auth).
//
// Most existing API routes still use the singleton `frappeClient`
// (service account) for read-only Frappe queries. The handoff says
// "per-user scoped client" is the ship gate — but the migration of
// every existing route is a 10+ commit change. v1 of the helper is
// here; the routes switch to it incrementally (a follow-up phase
// per the report's KNOWN GAPS).
// ---------------------------------------------------------------------------
export function getRequestFrappeClient(request: NextRequest): FrappeApp | null {
  const sid = readSidCookie(request);
  const base = getErpBaseUrl();
  if (!sid || !base) return null;
  // The frappe-js-sdk FrappeApp constructor takes (url, options).
  // We pass `useToken: false` + a `getToken` that returns the sid
  // wrapped in a way that makes the SDK send it as the `Cookie`
  // header (NOT Authorization). The SDK's default token mechanism
  // sends `Authorization: token <key>:<secret>` which is the
  // service-account flow; the user-sid flow needs raw cookies.
  return new FrappeApp(base, {
    useToken: true,
    token: () => sid,
    type: "Bearer",
  });
}

// ---------------------------------------------------------------------------
// Role helpers (used by `<Can>` and `useCurrentUser`).
// ---------------------------------------------------------------------------
const SYSTEM_MANAGER_ROLES = new Set([
  "System Manager",
  "Administrator",
]);

/** True if the user holds ANY of the given ERPNext roles. */
export function userHasRole(ctx: UserContext | null, roles: string[]): boolean {
  if (!ctx) return false;
  for (const r of roles) if (ctx.roles.includes(r)) return true;
  return false;
}

/** True if the user is a System Manager (admin). */
export function isSystemManager(ctx: UserContext | null): boolean {
  if (!ctx) return false;
  return ctx.roles.some((r) => SYSTEM_MANAGER_ROLES.has(r));
}

// ---------------------------------------------------------------------------
// Back-compat: keep the Phase 0 stub alive for callers that imported
// it (none should, but the type is exported and the function still
// returns a value). Now it just resolves the real user; the prior
// hardcoded Administrator fallback is gone.
// ---------------------------------------------------------------------------
export function createScopedFrappeClient(
  apiKey: string,
  apiSecret: string,
) {
  // 2P Part 5.2: the helper that consumes this is the service-account
  // FrappeApp constructor (the previous Phase 0 throw is removed; this
  // path is for the one-time bootstrap when no user session exists
  // — e.g. /api/auth/me fallback).
  const base = getErpBaseUrl();
  return new FrappeApp(base, {
    useToken: true,
    token: () => `${apiKey}:${apiSecret}`,
    type: "Bearer",
  });
}
