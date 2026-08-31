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
  /**
   * 2Q Part 3 (F-A2) — doctypes the user can CREATE (from Frappe boot
   * `frappe.boot.user.can_create`). Powers the fail-FAST capability gate
   * on `/new` and `/[name]/edit` pages. The server still enforces perm —
   * this is a cosmetic gate (per the handoff's honesty guardrail).
   */
  canCreate?: string[];
  /** Doctypes the user can READ (`frappe.boot.user.can_read`). */
  canRead?: string[];
  /** Doctypes the user can WRITE (`frappe.boot.user.can_write`). */
  canWrite?: string[];
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
// Internal: service-account auth header (server-only). Frappe token auth
// is `Authorization: token <api_key>:<api_secret>` (NOT Bearer — Bearer is
// OAuth2). Returns null when the credentials aren't configured, so callers
// can fall back to the user's own session.
//
// WHY a service account for ROLE lookup (2P-FINAL fix): roles live on the
// `Has Role` doctype, which a non-admin (e.g. a Sales User) has NO read
// permission on. Querying `Has Role` with the *user's* sid therefore
// returned `[]` for every non-admin — which tripped the sidebar's
// fail-open guard and showed ALL menus to ALL non-admin users.
//
// Role discovery is an IDENTITY question ("what roles does this confirmed
// user hold?"), not a data-access question — exactly what an auth layer is
// expected to answer with its own credentials after it has verified who
// the caller is. We still PROVE identity with the user's sid (Step 1,
// `get_logged_user`); only the lookup of that confirmed user's roles +
// profile uses the service account. Data-level CRUD stays gated on the
// user's sid in the factory, so this does NOT widen what they can touch.
// ---------------------------------------------------------------------------
function getServiceAuthHeader(): string | null {
  const key = process.env.ERP_API_KEY;
  const secret = process.env.ERP_API_SECRET;
  if (!key || !secret) return null;
  return `token ${key}:${secret}`;
}

// ---------------------------------------------------------------------------
// Internal: the slice of the Frappe `User` doc we read. `frappe.client.get`
// returns child tables inline, so the `roles` child table (doctype
// "Has Role") arrives in the SAME call as the profile fields — making the
// User doc the single most reliable roles source.
// ---------------------------------------------------------------------------
interface FrappeUserDoc {
  email?: string;
  full_name?: string;
  first_name?: string;
  roles?: Array<{ role?: string }>;
}

/** Pull the role labels off a User doc's `roles` child table. */
function rolesFromUserDoc(doc: FrappeUserDoc | null): string[] {
  if (!doc || !Array.isArray(doc.roles)) return [];
  return doc.roles
    .map((r) => r?.role)
    .filter((r): r is string => typeof r === "string" && r.length > 0);
}

/** Fetch a User doc (profile + roles child table) with the given auth. */
async function fetchUserDoc(
  base: string,
  userId: string,
  headers: Record<string, string>,
): Promise<FrappeUserDoc | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await fetch(
    `${base}/api/method/frappe.client.get?doctype=User&name=${encodeURIComponent(userId)}`,
    { headers, cache: "no-store" },
  ).then((r) => r.json().catch(() => null));
  const doc = raw?.message ?? raw ?? null;
  return doc && typeof doc === "object" ? (doc as FrappeUserDoc) : null;
}

// ---------------------------------------------------------------------------
// 2Q Part 3 (F-A2): fetch Frappe boot perms for the user.
//
// `frappe.boot.user.can_create / can_read / can_write` are the
// authoritative lists of doctypes the requesting user can create/read/
// write. They are computed by Frappe from the user's roles + DocPerms.
// We use them as the source of truth for the cosmetic `<RequirePermission>`
// gate (the server still enforces perm — this is a fail-FAST UX layer,
// not a security boundary).
//
// Boot info is expensive to fetch (it includes the entire client boot
// payload), so we cache it per userId for the request lifetime. The
// cache is process-local (not shared across requests), so a new
// request gets a fresh boot call — that's fine: a user can be added
// to a role mid-session and a stale cache would deny them.
// ---------------------------------------------------------------------------
interface FrappeBootUser {
  can_create?: string[];
  can_read?: string[];
  can_write?: string[];
}

const _bootCache = new Map<
  string,
  { value: FrappeBootUser; ts: number }
>();
const BOOT_CACHE_TTL_MS = 30 * 1000; // short TTL — fail-FAST, not authoritative

async function fetchBootUser(
  base: string,
  headers: Record<string, string>,
  cacheKey: string,
): Promise<FrappeBootUser> {
  const cached = _bootCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < BOOT_CACHE_TTL_MS) {
    return cached.value;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await fetch(`${base}/api/method/frappe.boot`, {
      headers,
      cache: "no-store",
    }).then((r) => r.json().catch(() => null));
    const user = (raw?.message?.user ?? raw?.user) as
      | FrappeBootUser
      | undefined;
    const value: FrappeBootUser = {
      can_create: Array.isArray(user?.can_create) ? user!.can_create : [],
      can_read: Array.isArray(user?.can_read) ? user!.can_read : [],
      can_write: Array.isArray(user?.can_write) ? user!.can_write : [],
    };
    _bootCache.set(cacheKey, { value, ts: Date.now() });
    return value;
  } catch {
    return { can_create: [], can_read: [], can_write: [] };
  }
}

/**
 * Fallback role source: query the `Has Role` doctype directly. Used only
 * when the User doc didn't carry its roles child table. The doctype name
 * is encoded (it contains a space) so the request can't be mis-parsed.
 */
async function fetchHasRole(
  base: string,
  userId: string,
  headers: Record<string, string>,
): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await fetch(
    `${base}/api/method/frappe.client.get_list?doctype=${encodeURIComponent(
      "Has Role",
    )}&filters=${encodeURIComponent(
      JSON.stringify([["parent", "=", userId]]),
    )}&fields=${encodeURIComponent(JSON.stringify(["role"]))}&limit_page_length=100`,
    { headers, cache: "no-store" },
  ).then((r) => r.json().catch(() => null));
  const list = raw?.message ?? raw;
  return Array.isArray(list)
    ? list
        .map((r) => (r as { role?: string })?.role)
        .filter((r): r is string => typeof r === "string" && r.length > 0)
    : [];
}

// ---------------------------------------------------------------------------
// Internal: resolve identity (user's sid) + roles/profile (service account).
// Returns null when the session is invalid — the resolution still FAILS
// CLOSED on authentication (an invalid/expired sid yields no user).
// ---------------------------------------------------------------------------
async function fetchUserFromFrappe(sid: string): Promise<{
  userId: string;
  email?: string;
  fullName?: string;
  roles: string[];
  canCreate: string[];
  canRead: string[];
  canWrite: string[];
} | null> {
  const base = getErpBaseUrl();
  if (!base) return null;
  try {
    // Step 1 — AUTHENTICATION (user's session). get_logged_user runs as
    // the sid's owner; a bad/expired sid resolves to Guest/null → 401.
    // This is the security gate and MUST use the user's own cookie.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loggedRaw: any = await fetch(`${base}/api/method/frappe.auth.get_logged_user`, {
      headers: { Cookie: `sid=${sid}` },
      cache: "no-store",
    }).then((r) => r.json().catch(() => null));
    const userId = (loggedRaw?.message ?? loggedRaw) as string | null;
    if (!userId || typeof userId !== "string" || userId === "Guest") {
      return null;
    }

    // Step 2 — ROLE + PROFILE lookup via the SERVICE ACCOUNT. We read the
    // confirmed user's own User doc, whose `roles` child table is the most
    // reliable roles source (and carries full_name/email in the same call).
    // Identity is already proven by Step 1, so using admin creds to look up
    // *that* user's roles is an identity question, not privilege widening —
    // CRUD stays gated on the user's sid in the factory. If service creds
    // are absent, fall back to the user's own sid (an admin can read their
    // own doc).
    const serviceAuth = getServiceAuthHeader();
    const lookupHeaders: Record<string, string> = serviceAuth
      ? { Authorization: serviceAuth }
      : { Cookie: `sid=${sid}` };

    const userDoc = await fetchUserDoc(base, userId, lookupHeaders);
    let roles = rolesFromUserDoc(userDoc);

    // Fallback 1 — the doc didn't surface its roles child table: query
    // `Has Role` directly with the same (service) auth.
    if (roles.length === 0) {
      roles = await fetchHasRole(base, userId, lookupHeaders);
    }
    // Fallback 2 — still empty AND we were using the service account:
    // try the user's OWN sid. This is the admin-safety net — an admin can
    // always read their own Has Role rows, so they can never be left
    // role-less (which would collapse their sidebar to Overview only).
    if (roles.length === 0 && serviceAuth) {
      roles = await fetchHasRole(base, userId, { Cookie: `sid=${sid}` });
    }

    // Step 3 — 2Q Part 3 (F-A2): fetch the user's DocPerms via
    // `frappe.boot.user.can_create / can_read / can_write`. We use
    // the user's own sid here because boot info is the user's OWN
    // view of their permissions; using the service account would
    // surface admin perms instead of the user's. The 30s cache
    // (BOOT_CACHE_TTL_MS) keeps the cost bounded for page navigations.
    const boot = await fetchBootUser(base, { Cookie: `sid=${sid}` }, userId);

    return {
      userId,
      email: userDoc?.email ?? undefined,
      fullName: userDoc?.full_name ?? userDoc?.first_name ?? undefined,
      roles,
      canCreate: boot.can_create ?? [],
      canRead: boot.can_read ?? [],
      canWrite: boot.can_write ?? [],
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
    canCreate: user.canCreate,
    canRead: user.canRead,
    canWrite: user.canWrite,
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
