// components/auth/Can.tsx
// Obsidian ERP v4.0 — Role gate (2P Part 5).
//
// Renders children only when the current user holds at least one of
// the listed ERPNext roles. When the user lacks the role(s), renders
// the optional `fallback` (default: nothing — the children are
// hidden). Pair with `useCurrentUser()` to know who the user is.
//
// Two flavors per the handoff:
//   - `<Can role="Sales User">` — single role
//   - `<Can roles={["Sales User", "Sales Manager"]}>` — any-of
//   - `hide vs disable`: when a `disabled` prop is supplied, render
//     the children wrapped in a span with `pointer-events: none` +
//     `opacity: 0.5` (a soft disable, not a hard hide). This matches
//     the "disable + tooltip individual actions" line in the handoff.

"use client";

import { useCurrentUser, hasRole } from "@/hooks/useCurrentUser";

export interface CanProps {
  /** Single role required. */
  role?: string;
  /** Multiple roles — any-of (the user needs just one). */
  roles?: string[];
  /** Optional fallback to render when the user lacks the role(s). */
  fallback?: React.ReactNode;
  /** Soft-disable vs hide. When true, children always render but
   *  the wrapper disables pointer events + adds a "not-allowed"
   *  cursor. */
  disableInsteadOfHide?: boolean;
  /** Optional class for the disable-wrapper. */
  disableClassName?: string;
  children: React.ReactNode;
}

export function Can({
  role,
  roles,
  fallback = null,
  disableInsteadOfHide = false,
  disableClassName,
  children,
}: CanProps) {
  const { user, isLoading } = useCurrentUser();
  if (isLoading) {
    // While we're loading, render nothing — the layout shows a
    // skeleton instead. Don't flash a "not allowed" state.
    return null;
  }
  const list = roles ?? (role ? [role] : []);
  const allowed = hasRole(user, list);
  if (allowed) return <>{children}</>;
  if (disableInsteadOfHide) {
    return (
      <span
        aria-disabled
        title="You don't have permission to do this"
        className={
          "pointer-events-none cursor-not-allowed opacity-50 " +
          (disableClassName ?? "")
        }
      >
        {children}
      </span>
    );
  }
  return <>{fallback}</>;
}
