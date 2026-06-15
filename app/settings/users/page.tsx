// app/settings/users/page.tsx
// Obsidian ERP v4.0 — Admin: User Management (2P Part 5.3).
//
// "Onboard admin side right on our frontend." The System-Manager
// gate is the `<Can role="System Manager">` guard on the page; the
// list + invite are backed by `/api/users` (which is itself admin-
// only). A non-admin who lands here sees a guided "not allowed"
// inline message + a link back to the dashboard.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { useCurrentUser, hasRole } from "@/hooks/useCurrentUser";
import { Can } from "@/components/auth/Can";
import { PageHeader, LoadingState } from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface User {
  name: string;
  email?: string;
  full_name?: string;
  enabled?: number | boolean;
  roles: string[];
  user_type?: string;
  creation?: string;
}

const ROLE_COLORS: Record<string, string> = {
  "System Manager": "bg-primary/15 text-primary",
  "Sales User": "bg-info/15 text-info",
  "Sales Manager": "bg-info/15 text-info",
  "Accounts User": "bg-success/15 text-success",
  "Accounts Manager": "bg-success/15 text-success",
  "Stock User": "bg-warning/15 text-warning",
  "Stock Manager": "bg-warning/15 text-warning",
};

export default function UsersSettingsPage() {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const { user, isLoading: loadingMe } = useCurrentUser();
  const isAdmin = hasRole(user, ["System Manager", "Administrator"]);

  // We list users via our own admin route (which is admin-gated on
  // the server). Don't use useFrappeList here because the list
  // endpoint is /api/users (not /api/user — different).
  const [users, setUsers] = useState<User[]>([]);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openInvite, setOpenInvite] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { success?: boolean; data?: User[]; allowedRoles?: string[]; details?: string }) => {
        if (json.success) {
          setUsers(json.data ?? []);
          setAllowedRoles(json.allowedRoles ?? []);
        } else {
          setError(json.details ?? "Failed to load users");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loadingMe) return <LoadingState />;
  if (!isAdmin) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader title="User Management" subtitle="Admin only" />
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 text-sm text-warning">
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <ShieldAlert className="h-4 w-4" /> Not authorized
          </p>
          <p className="mb-3 text-muted-foreground">
            You need the <strong>System Manager</strong> role to manage
            users. Ask an admin to grant it.
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowRight className="mr-1.5 h-4 w-4" /> Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <PageHeader
          title="User Management"
          subtitle={`${users.length} user${users.length === 1 ? "" : "s"} · invite team members, assign roles, enable/disable accounts`}
        />
        <Can role="System Manager">
          <Button className="rounded-full" onClick={() => setOpenInvite(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Invite user
          </Button>
        </Can>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLine key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm shadow-black/5">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-secondary/20 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Roles</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {users.map((u) => (
                <tr key={u.name} className="hover:bg-secondary/10" data-testid={`user-row-${u.name}`}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {u.full_name ?? u.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {u.email ?? u.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        u.roles.map((r) => (
                          <Badge
                            key={r}
                            variant="outline"
                            className={cn(
                              "rounded-full px-1.5 py-0 text-[10px] font-semibold",
                              ROLE_COLORS[r] ?? "bg-muted text-muted-foreground",
                            )}
                          >
                            {r}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.enabled === 0 || u.enabled === false ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openInvite && (
        <InviteUserDialog
          allowedRoles={allowedRoles}
          onClose={() => setOpenInvite(false)}
          onCreated={(name) => {
            setOpenInvite(false);
            toast.success(`Invited ${name}`);
            // Re-fetch the list
            setLoading(true);
            fetch("/api/users", { cache: "no-store" })
              .then((r) => r.json())
              .then((json) => {
                if (json.success) setUsers(json.data ?? []);
              })
              .finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InviteUserDialog — a simple inline dialog (no Radix dependency in
// this file; uses the existing Dialog primitive if we want, but for
// brevity we just render a fixed card).
// ---------------------------------------------------------------------------
function InviteUserDialog({
  allowedRoles,
  onClose,
  onCreated,
}: {
  allowedRoles: string[];
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleRole(r: string) {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  }

  async function handleSubmit() {
    if (!email) {
      setErr("Email is required");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName || email.split("@")[0],
          roles: selectedRoles,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { name: string };
        details?: string;
      };
      if (json.success && json.data) {
        onCreated(json.data.name);
      } else {
        setErr(json.details ?? "Failed to invite user");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border/40 bg-card p-5 shadow-xl sm:p-6"
      >
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" /> Invite a new user
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          They&apos;ll receive a welcome email with a password setup link.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
              data-testid="invite-email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              First name (optional)
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Roles
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {allowedRoles.map((r) => (
                <label
                  key={r}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                    selectedRoles.includes(r)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/40 hover:border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r)}
                    onChange={() => toggleRole(r)}
                    className="h-3.5 w-3.5"
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>
          {err && (
            <p className="text-xs text-destructive">{err}</p>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full"
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="invite-submit"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Inviting…
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Invite
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
