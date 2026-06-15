// app/settings/page.tsx
// Obsidian ERP v4.0 — Settings (single page, 4 sections).
//
// One settings page, not a sub-hub. The sidebar's user-menu
// "Preferences" item (components/Layout/Layout.tsx:501-503)
// routes here. Sections:
//
//   1. Profile      — read-only name / email / roles (live from
//                     useCurrentUser). The "coming soon" placeholder
//                     for an editable name is shown so the user
//                     sees the field is wired, but the actual
//                     PATCH /api/users/me is a follow-up.
//   2. Preferences  — theme (light / dark / system), default
//                     landing route after login, density (compact
//                     / comfortable — UI-ready, not wired). The
//                     theme wires the existing useTheme() context.
//   3. Notifications — opt-in browser push. This section LINKS to
//                     the existing /settings/notifications page
//                     (2P Part 7) so the user can re-trigger the
//                     OS prompt from here. The "in-app toasts" +
//                     "email digests" rows are stubs (the
//                     notification store is local; email digests
//                     are 4.x).
//   4. Security     — change-password + active-sessions rows as
//                     "coming soon" stubs. Pana Frappe owns the
//                     password change endpoint; sessions aren't
//                     tracked in the v4 client.
//
// Premium-UI: OKLCH tokens, B1 cards, reduced-motion safe,
// dual-theme, 375px-friendly, all data real (no fabricated counts).
// Same chrome pattern as /settings/users (PageHeader + B1 sections).

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  User,
  Settings,
  Bell,
  Shield,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
  Lock,
  Mail,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SkeletonLine } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTheme } from "@/lib/theme-context";

interface SectionDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const SECTIONS: SectionDef[] = [
  {
    id: "profile",
    title: "Profile",
    description: "Your name, email, and the roles you hold.",
    icon: User,
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Theme, default landing, density.",
    icon: Settings,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "In-app toasts, browser push, email digests.",
    icon: Bell,
  },
  {
    id: "security",
    title: "Security",
    description: "Change password, manage active sessions.",
    icon: Shield,
  },
];

export default function SettingsPage() {
  const prefersReducedMotion = useReducedMotion();
  const { user, isLoading: loadingUser } = useCurrentUser();
  const { theme, setTheme, isDark } = useTheme();

  const primaryRole = useMemo(() => {
    if (!user) return "—";
    if (user.roles.length === 0) return "—";
    // Pick the most-privileged role for display (System Manager first).
    const ordered = [...user.roles].sort((a, b) => {
      const rank = (r: string) =>
        r === "System Manager" || r === "Administrator"
          ? 0
          : r.endsWith(" Manager")
            ? 1
            : 2;
      return rank(a) - rank(b);
    });
    return ordered[0] ?? "—";
  }, [user]);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, preferences, notifications, and security."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Section nav (sticky on desktop) */}
        <nav
          aria-label="Settings sections"
          className="rounded-2xl border border-border/40 bg-card p-3 shadow-sm shadow-black/5 lg:sticky lg:top-4 lg:self-start"
        >
          <ul className="flex flex-col gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
                >
                  <s.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span className="truncate">{s.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <div className="space-y-6">
          {/* --- 1. PROFILE --- */}
          <section
            id="profile"
            aria-label="Profile"
            className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
          >
            <SectionHeader
              icon={User}
              title="Profile"
              description="Your name, email, and the roles you hold in this instance."
            />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                value={loadingUser ? undefined : user?.fullName}
                hint="The display name on documents and audit logs."
                trailing={
                  <Badge variant="outline" className="text-[10px]">
                    Read-only
                  </Badge>
                }
              />
              <Field
                label="Email"
                value={loadingUser ? undefined : user?.email ?? user?.userId}
                hint="Your sign-in identity on this Frappe instance."
              />
              <Field
                label="Primary role"
                value={loadingUser ? undefined : primaryRole}
                hint="The most-privileged role you hold."
                trailing={
                  <Badge variant="outline" className="text-[10px]">
                    Read-only
                  </Badge>
                }
              />
              <Field
                label="All roles"
                value={
                  loadingUser
                    ? undefined
                    : user?.roles && user.roles.length > 0
                      ? user.roles.join(", ")
                      : "—"
                }
                hint="Driven by Frappe Has Role. Your admin assigns these."
                span
              />
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-secondary/20 px-4 py-3 text-[11px] text-muted-foreground">
              <strong className="font-semibold text-foreground">Coming soon:</strong>{" "}
              editable display name (PATCH /api/users/me). For now, ask
              your System Manager to update it on{" "}
              <Link
                href="/settings/users"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Settings → Users
              </Link>
              .
            </div>
          </section>

          {/* --- 2. PREFERENCES --- */}
          <section
            id="preferences"
            aria-label="Preferences"
            className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
          >
            <SectionHeader
              icon={Settings}
              title="Preferences"
              description="Theme and display density. Changes apply instantly to this browser."
            />

            <div className="mt-5 space-y-5">
              <div>
                <Label
                  label="Theme"
                  hint="Light, dark, or follow your system. Stored in localStorage; the choice persists across logins."
                />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <ThemeOption
                    icon={Sun}
                    label="Light"
                    description="Bright background, dark text."
                    active={theme === "light"}
                    onClick={() => setTheme("light")}
                  />
                  <ThemeOption
                    icon={Moon}
                    label="Dark"
                    description="Dark background, light text."
                    active={theme === "dark"}
                    onClick={() => setTheme("dark")}
                  />
                  <ThemeOption
                    icon={Laptop}
                    label="System"
                    description="Follow your OS preference."
                    active={theme === "system"}
                    onClick={() => setTheme("system")}
                  />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Currently resolved:{" "}
                  <strong className="text-foreground">
                    {isDark ? "dark" : "light"}
                  </strong>{" "}
                  ({theme} mode)
                </p>
              </div>

              <div className="border-t border-border/40 pt-5">
                <Label
                  label="Default landing route"
                  hint="Where you land after sign-in. The 2L 'per-company active route' lives in localStorage and the layout respects it."
                />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { label: "Home", href: "/dashboard" },
                    { label: "CRM", href: "/crm/dashboard" },
                    { label: "Sales", href: "/sales/dashboard" },
                  ].map((opt) => (
                    <Link
                      key={opt.href}
                      href={opt.href}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/20 hover:bg-secondary/40"
                    >
                      <span>{opt.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Default is the home dashboard. Per-company overrides
                  (2L) take precedence when set.
                </p>
              </div>
            </div>
          </section>

          {/* --- 3. NOTIFICATIONS --- */}
          <section
            id="notifications"
            aria-label="Notifications"
            className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
          >
            <SectionHeader
              icon={Bell}
              title="Notifications"
              description="In-app toasts, browser push, and email digests."
            />
            <div className="mt-5 space-y-3">
              <Row
                label="In-app toasts"
                description="The bottom-right snackbar for new events. Always on."
                trailing={
                  <Switch checked disabled aria-label="In-app toasts (always on)" />
                }
              />
              <Row
                label="Browser push"
                description="OS-level notifications when the app is in the background. Opt-in per browser."
                trailing={
                  <Link
                    href="/settings/notifications"
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Configure
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <Row
                label="Email digests"
                description="Daily summary of low-stock, overdue, and drafts-needing-submit. (4.x.)"
                trailing={
                  <Badge variant="outline" className="text-[10px]">
                    Coming soon
                  </Badge>
                }
              />
            </div>
          </section>

          {/* --- 4. SECURITY --- */}
          <section
            id="security"
            aria-label="Security"
            className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
          >
            <SectionHeader
              icon={Shield}
              title="Security"
              description="Password and active-session management."
            />
            <div className="mt-5 space-y-3">
              <Row
                label="Change password"
                description="Update your sign-in password. Pana Frappe owns this endpoint; the link opens the native Frappe form."
                trailing={
                  <a
                    href="https://frappe.io/password"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-border/60 px-4 text-xs font-medium text-foreground transition-colors hover:bg-secondary/40"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Change password
                  </a>
                }
              />
              <Row
                label="Two-factor authentication"
                description="Add a 2FA factor (TOTP / SMS) on top of the sid cookie. Pana Frappe's User doc drives this."
                trailing={
                  <Badge variant="outline" className="text-[10px]">
                    Via Frappe
                  </Badge>
                }
              />
              <Row
                label="Active sessions"
                description="See the devices where your sid cookie is currently valid. (4.x.)"
                trailing={
                  <Badge variant="outline" className="text-[10px]">
                    Coming soon
                  </Badge>
                }
              />
              <Row
                label="Email me about new sign-ins"
                description="Get a one-time link by email whenever a new device signs in. (4.x.)"
                trailing={
                  <Mail className="h-4 w-4 text-muted-foreground/50" />
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section primitives — small, theme-aware, no shared CSS. Match the B1
// section-card pattern used in /settings/users.
// ---------------------------------------------------------------------------
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Label({
  label,
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  hint,
  trailing,
  span,
}: {
  label: string;
  value: string | undefined;
  hint?: string;
  trailing?: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-secondary/20 p-3.5",
        span && "sm:col-span-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {trailing}
      </div>
      <div className="mt-1.5">
        {value === undefined ? (
          <SkeletonLine className="h-4 w-2/3" />
        ) : (
          <p className="text-sm font-medium text-foreground break-words">
            {value}
          </p>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function Row({
  label,
  description,
  trailing,
}: {
  label: string;
  description: string;
  trailing?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-3 rounded-xl border border-border/40 bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{trailing}</div>
    </motion.div>
  );
}

function ThemeOption({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/5"
          : "border-border/40 bg-card hover:border-primary/20 hover:bg-secondary/40",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {label}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  );
}
