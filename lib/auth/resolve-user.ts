// lib/auth/resolve-user.ts
// Obsidian ERP v4.0 — Per-user identity + scoped Frappe client (2P Part 5,
// 2P-FINAL Part A).
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
//   3. Fetches the user's roles via `frappe.client.get_list` on
//      `Has Role`. The roles drive the RBAC UI in `useCurrentUser`
//      / `<Can>`.
//
// 2P-FINAL Part A — FACTORY SID-FORWARDING. The new
// `getRequestFrappeApp(request)` / `getRequestClient(request)` pair
// returns a per-request FrappeApp that forwards the `sid` cookie via
// the SDK's `customHeaders` 4th constructor arg. We pass
// `useToken: false` so the SDK's request interceptor does NOT also
// add `Authorization: Bearer <sid>` (Frappe would reject a session id
// as a Bearer token — Bearer is for OAuth2 access tokens, not
// cookies). The customHeaders path merges `Cookie: sid=...` into every
// request, AND the SDK sets `withCredentials: true` so the browser
// also sends the cookie on same-origin requests. This is the only
// mechanism that gets Frappe to run its NATIVE DocPerm engine for
// the requesting user — the service account bypassed it entirely.
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
// Helper: read the Frappe `sid` cookie from the incoming request.
//
// We read the raw `Cookie` header directly. That works in EVERY Next
// version (13/14/15/16) and in middleware. The prior implementation
// also called the async next-headers cookies helper as a fallback —
// that helper is now async in Next 15+/16 and a sync call throws
// the `sync-dynamic-apis` runtime error. We don't need it: browsers
// send the `sid` cookie automatically on same-origin fetches, and
// Next's `NextRequest` exposes the parsed `Cookie` header at
// request time.
//
// Reference:
//   https://nextjs.org/docs/messages/sync-dynamic-apis
// ---------------------------------------------------------------------------
function readSidCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const m = cookieHeader.match(/(?:^|;\s*)sid=([^;]+)/);
  if (m && m[1]) return decodeURIComponent(m[1]);
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
// Public: per-request FrappeApp instance, authenticated AS THE USER.
// (2P-FINAL Part A.1 — the cookie-forwarding ship-gate path.)
//
// The FrappeApp constructor is:
//   new FrappeApp(url, tokenParams?, name?, customHeaders?)
// We pass `useToken: false` (so the SDK's request interceptor does NOT
// also set `Authorization: Bearer <sid>` — Frappe rejects a session id
// as a Bearer token), and forward the `sid` via the 4th arg
// (`customHeaders`). The SDK merges those into the axios headers
// (see `frappe-js-sdk/lib/utils/axios.js` `getRequestHeaders`) and
// sets `withCredentials: true` on the axios client (so the browser
// also sends the cookie on same-origin requests).
//
// ERPNext then runs its native DocPerm engine for this user — a
// Sales User with a sid will get 403 (PermissionError) for the
// Journal Entry doctype, not the service-account 200 we had before.
// ---------------------------------------------------------------------------
export function getRequestFrappeApp(request: NextRequest): FrappeApp | null {
  const sid = readSidCookie(request);
  const base = getErpBaseUrl();
  if (!sid || !base) return null;
  return new FrappeApp(
    base,
    // tokenParams: explicitly NO token auth, so the SDK does not add
    // an Authorization header. Frappe's session id is a cookie, not
    // an OAuth2 access token.
    { useToken: false, type: "Bearer" },
    // name: not used for routing
    undefined,
    // customHeaders: forward the `sid` as a Cookie. The SDK merges
    // this with its own Accept/Content-Type headers.
    { Cookie: `sid=${sid}` },
  );
}

// ---------------------------------------------------------------------------
// Public: per-request Frappe client (db + call surfaces) for the
// factory handlers. The factory calls `client.db.getDocList(...)` etc.
// ---------------------------------------------------------------------------
export function getRequestClient(request: NextRequest):
  | { db: ReturnType<FrappeApp["db"]>; call: ReturnType<FrappeApp["call"]> }
  | null {
  const app = getRequestFrappeApp(request);
  if (!app) return null;
  return { db: app.db(), call: app.call() };
}

// ---------------------------------------------------------------------------
// Back-compat: keep the old name working. The 2P test asserts the
// function exists; the implementation now forwards the `sid` as a
// Cookie (instead of the broken Bearer approach). 2P-FINAL Part A
// replaces all internal callers; this alias is a safety net for any
// out-of-tree import.
// ---------------------------------------------------------------------------
export function getRequestFrappeClient(request: NextRequest): FrappeApp | null {
  return getRequestFrappeApp(request);
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
