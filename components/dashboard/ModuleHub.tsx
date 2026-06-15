// components/dashboard/ModuleHub.tsx
// Obsidian ERP v4.0 — Module Hub compat shim (master §4.1, 2P-FINAL Part B).
//
// 2P-FINAL Part B — ONE SHELL, SIX CONFIGS. Per B16: every module hub
// is a pure config over `DashboardShell`; the legacy `ModuleHub` is
// retired as a distinct visual treatment. The 2N test (tests/phase-
// 2n.test.tsx:437/456/687/699) still asserts that all 6 hub pages
// import `ModuleHub`, so this file is preserved as a **compat shim**:
// it accepts the 2N-era props (title, subtitle, kpis, actions,
// recent, alerts, primaryAction) and builds a `DashboardConfig` that
// is rendered by `DashboardShell`. The 6 hubs each pass their
// module-specific chart as `children`; that chart sits in the
// shell's main content slot (above the alerts + recent row).
//
// 2N legacy fields preserved for back-compat:
//   - `actions` (quick-action grid) — exposed via `recent` as a
//     "Quick actions" section. We render the quick-action grid as a
//     `children`-shaped fragment in the shell's main content slot so
//     the visual treatment matches 2N; the children prop can be
//     omitted on hubs that only want the chart.
//   - `alertsTitle` / `recentTitle` — preserved.
//
// Trade-off documented in the 2P-FINAL build report: the 2N test
// hardcodes the `ModuleHub` import. Keeping this shim avoids touching
// the off-limits test file while still retiring the 2N-era visual
// chrome (the dark-blue card grid is gone — everything renders
// through `DashboardShell`).
//
// Premium-UI: OKLCH semantic tokens, B1-style cards, staggered
// Framer entrance, reduced-motion safe, dual-theme, 375px-friendly —
// all inherited from DashboardShell.

"use client";

import {
  ArrowRight,
  type LucideIcon,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  DashboardShell,
  type DashboardConfig,
  type DashboardAlert,
  type DashboardKpi,
  type DashboardRecentItem,
} from "@/components/dashboard/DashboardShell";
import { KPICard } from "@/components/dashboard/KPICard";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 2N-era shapes (kept identical so the 6 hub pages don't need a
// signature change — they just add a `children` slot for the chart)
// ---------------------------------------------------------------------------
export interface HubKpi {
  title: string;
  value: string | number | undefined;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  href?: string;
}

export interface HubAction {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  primary?: boolean;
}

export interface HubRecentItem {
  name: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  href: string;
  timestamp?: string;
}

export interface HubAlert {
  label: string;
  count: number | undefined;
  href: string;
  variant?: "warning" | "info" | "default";
}

export interface ModuleHubProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  primaryAction?: { label: string; href: string };
  kpis: HubKpi[];
  /**
   * @deprecated 2N-era quick-action grid. The 2P-FINAL Part B
   * recommendation is to drop this and pass chart components as
   * `children` instead. We still render it for the hubs that pass
   * it (2N ship) so they keep the same visual treatment during
   * the migration. New code: omit `actions` and pass a chart.
   */
  actions?: HubAction[];
  recent: HubRecentItem[];
  recentTitle?: string;
  alerts?: HubAlert[];
  alertsTitle?: string;
  /**
   * 2P-FINAL Part B — the chart slot. Each hub passes one
   * module-appropriate chart (AreaChart, BarChart, etc.). Renders
   * in the shell's main content slot (above alerts + recent).
   */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Compat shim — translates 2N props to a DashboardConfig + renders
// the optional actions grid + children (chart) inside the shell.
// ---------------------------------------------------------------------------
export function ModuleHub({
  title,
  subtitle,
  icon,
  primaryAction,
  kpis,
  actions,
  recent,
  recentTitle = "Recent",
  alerts,
  alertsTitle = "Alerts",
  children,
}: ModuleHubProps) {
  const dashboardKpis: DashboardKpi[] = kpis.map((k) => ({
    title: k.title,
    value: k.value,
    icon: k.icon,
    variant: k.variant,
    href: k.href,
  }));

  const dashboardRecent: DashboardRecentItem[] = recent;
  const dashboardAlerts: DashboardAlert[] | undefined = alerts?.map((a) => ({
    label: a.label,
    count: a.count,
    href: a.href,
    variant: a.variant,
  }));

  const config: DashboardConfig = {
    title,
    subtitle,
    icon,
    primaryAction: primaryAction
      ? { label: primaryAction.label, href: primaryAction.href }
      : undefined,
    kpis: dashboardKpis,
    alerts: dashboardAlerts,
    alertsTitle,
    recent: dashboardRecent,
    recentTitle,
  };

  return (
    <DashboardShell config={config}>
      {/* 2N-era actions grid (deprecated but preserved). When the
          hub is the dashboard page itself it may still pass an
          `actions` list — render it just above the chart. */}
      {actions && actions.length > 0 && <QuickActionsGrid actions={actions} />}
      {/* 2P-FINAL Part B — the chart slot. One per hub. */}
      {children}
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// Internal: 2N quick-actions grid. Renders a 2-col responsive
// grid of `actions` items. This is the only piece of legacy
// ModuleHub chrome that survives — the 2N ship had it; the
// migration to DashboardShell keeps it visually identical for
// hubs that pass `actions`.
// ---------------------------------------------------------------------------
function QuickActionsGrid({ actions }: { actions: HubAction[] }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section
      className="rounded-2xl border border-border/40 bg-card/40 p-5 shadow-sm shadow-black/5 sm:p-6"
      aria-label="Quick actions"
    >
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        Quick actions
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.25, delay: 0.05 + i * 0.04 }
            }
          >
            <Link
              href={action.href}
              className={cn(
                "group flex items-center gap-4 rounded-2xl border p-4 transition-all hover:border-primary/20 hover:shadow-md",
                action.primary
                  ? "border-primary/30 bg-primary/5 shadow-sm shadow-primary/5"
                  : "border-border/40 bg-card shadow-sm shadow-black/5",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  action.primary
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {action.label}
                </p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Re-exports so existing imports from this module don't need to
// change. (The 2N test only checks for the `ModuleHub` import, but
// any code that imports `HubKpi`, `HubAction`, etc. keeps working
// against the same shapes.)
// ---------------------------------------------------------------------------
export { KPICard };
export type { LucideIcon };
export { Plus };
