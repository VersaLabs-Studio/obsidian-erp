// components/auth/permission-gate.tsx
// Obsidian ERP v4.0 — Capability gate for `/new` and `/[name]/edit` pages.
//
// 2Q Part 3 (F-A2): a Sales User `hannah@` was able to open
// `/sales/sales-order/new`, fill the wizard, and was only denied at
// Submit. Secure (the server denied) but wasteful UX. The fix is a
// fail-FAST route-level gate that renders a premium "You don't have
// access to create Sales Order" state immediately, with a Back action.
//
// HONESTY GUARDRAIL: this gate is COSMETIC — exactly like the
// `useCurrentUser`-driven sidebar. It must NEVER be the security
// boundary. The server (the factory's per-request sid forwarding) is
// the only enforcement point. The component is documented as such in
// the JSX and in the JSDoc below.

"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import type { UserContext } from "@/lib/auth/resolve-user";
import { cn } from "@/lib/utils";

/** The three DocPerms the gate distinguishes between. */
export type PermissionKind = "create" | "read" | "write";

/**
 * Hook: does the current user have `perm` on `doctype`?
 *
 * Falls open (returns true) when the user is not yet loaded — the
 * caller's page is still rendering for the first time and the
 * `<RequirePermission>` should default to "show the page, server
 * enforces". Once the user context resolves, the gate flips to the
 * authoritative answer.
 *
 * Falls OPEN when the user is loaded but their capability list is
 * unknown/empty (e.g. the Frappe boot perms were unavailable) — a
 * cosmetic gate must not read absence-of-data as denial. It renders the
 * denied state ONLY on positive evidence (a populated list omitting the
 * doctype) or for a genuinely unauthenticated request (`user` is null →
 * `/api/auth/me` 401 → the page falls open and the server enforces).
 */
export function useCan(doctype: string, perm: PermissionKind): boolean {
  const { user } = useCurrentUser();
  if (!user) return true; // optimistic; server still enforces
  return checkUserCan(user, doctype, perm);
}

/**
 * Pure helper exposed for tests + callers that already have a user
 * context (e.g. server components, route handlers).
 */
export function checkUserCan(
  user: UserContext | null | undefined,
  doctype: string,
  perm: PermissionKind,
): boolean {
  if (!user) return false;

  // Admin bypass. A System Manager / Administrator can create/read/write
  // every doctype — Frappe grants this server-side regardless of the boot
  // perm payload. Surfacing it here stops the COSMETIC gate from ever
  // falsely denying an admin (the bug: an admin whose boot perms were
  // empty/unavailable was shown "You don't have access to create Sales
  // Order"). The literal `Administrator` user is special-cased too.
  if (
    user.userId === "Administrator" ||
    (Array.isArray(user.roles) &&
      (user.roles.includes("System Manager") ||
        user.roles.includes("Administrator")))
  ) {
    return true;
  }

  const list =
    perm === "create"
      ? user.canCreate
      : perm === "read"
        ? user.canRead
        : user.canWrite;

  // Fail OPEN on unknown capability. This gate is cosmetic (the server is
  // the sole enforcement point), so it must deny ONLY on POSITIVE evidence:
  // a populated list that omits this doctype. An empty/undefined list means
  // "we don't have the user's boot perms" (e.g. the boot fetch returned
  // nothing) — NOT "the user has zero permissions". Reading absence-of-data
  // as denial is what blocked authenticated users (admins included); a
  // false "show the form, server rejects" is strictly safer than a false
  // "you're not allowed" that halts legitimate work.
  if (!Array.isArray(list) || list.length === 0) return true;

  return list.includes(doctype);
}

// ---------------------------------------------------------------------------
// Default denied state — premium-UI consistent with the rest of the app
// ---------------------------------------------------------------------------
function DefaultDeniedState({
  doctype,
  perm,
  className,
}: {
  doctype: string;
  perm: PermissionKind;
  className?: string;
}) {
  const action =
    perm === "create"
      ? "create"
      : perm === "read"
        ? "view"
        : "edit";
  return (
    <div
      role="alert"
      data-testid="permission-denied"
      className={cn(
        "mx-auto max-w-xl rounded-2xl border border-warning/30 bg-warning/5 p-6 shadow-sm shadow-black/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-warning">
            You don't have access to {action} {doctype}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Your account is missing the role permission for this doctype. Ask
            an admin to grant it, or check with the workspace owner.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/80">
            The server enforces permissions regardless — this is a heads-up
            so you don't fill in a form that will be rejected.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public: <RequirePermission doctype="Sales Order" perm="create">
//   ...wizard body...
// </RequirePermission>
//
// Renders the wizard body when the user is allowed, otherwise the denied
// state. While the user context is loading, renders the children
// optimistically (the page's own skeleton handles the actual loading UX).
// ---------------------------------------------------------------------------
export interface RequirePermissionProps {
  doctype: string;
  perm: PermissionKind;
  children: React.ReactNode;
  /** Optional custom denied state (overrides the default). */
  fallback?: React.ReactNode;
  className?: string;
}

export function RequirePermission({
  doctype,
  perm,
  children,
  fallback,
  className,
}: RequirePermissionProps) {
  const allowed = useCan(doctype, perm);
  if (allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return <DefaultDeniedState doctype={doctype} perm={perm} className={className} />;
}

export default RequirePermission;
