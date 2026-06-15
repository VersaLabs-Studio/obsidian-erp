// components/dashboard/DashboardShell.tsx
// Obsidian ERP v4.0 — Config-driven dashboard shell (2P Part 4).
//
// Unified chrome used by the global home dashboard AND the 6 module
// hubs. The shape — header + KPI row + content slot + (optional)
// alerts/recent sidebar — is identical across all 7; each dashboard
// supplies the data via a config object. This is the "one
// DashboardShell + config per module — P3, no copy-paste six times"
// promise in the 2P handoff.
//
// Premium-UI: OKLCH tokens, B1 cards, staggered Framer entrance,
// reduced-motion safe, dual-theme, 375px-friendly.

"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Config shapes
// ---------------------------------------------------------------------------
export interface DashboardKpi {
  title: string;
  value: string | number | undefined;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  href?: string;
  /** Tiny sub-label rendered under the title (e.g. "this month"). */
  sub?: string;
}

export interface DashboardAlert {
  label: string;
  count: number | undefined;
  href: string;
  variant?: "warning" | "info" | "default";
}

export interface DashboardQuickAction {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  primary?: boolean;
}

export interface DashboardRecentItem {
  name: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  href: string;
  timestamp?: string;
}

export interface DashboardConfig {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  primaryAction?: { label: string; href: string };
  kpis: DashboardKpi[];
  alerts?: DashboardAlert[];
  alertsTitle?: string;
  recent?: DashboardRecentItem[];
  recentTitle?: string;
  /** Children render in the main content slot (e.g. charts). */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
// 2P-FINAL Part B — accept `children` as a prop (in addition to
// `config.children`). The ModuleHub compat shim passes a React
// fragment, so we forward both shapes into the content slot.
export function DashboardShell({
  config,
  children,
}: {
  config: DashboardConfig;
  children?: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { title, subtitle, icon: Icon, primaryAction, kpis, alerts, recent } = config;
  // Children prop wins over config.children (the latter was the
  // 2P Part 4 API; the former is the 2P-FINAL Part B API).
  const content = children ?? config.children;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {primaryAction && (
          <Link
            href={primaryAction.href}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {primaryAction.label} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </motion.div>

      {/* KPI row */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label={`${title} KPIs`}
      >
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.title}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.3, delay: i * 0.05 }
            }
          >
            {kpi.href ? (
              <Link href={kpi.href} className="block">
                <KPICard
                  title={kpi.title}
                  value={kpi.value ?? "—"}
                  icon={kpi.icon}
                  variant={kpi.variant ?? "default"}
                />
              </Link>
            ) : (
              <KPICard
                title={kpi.title}
                value={kpi.value ?? "—"}
                icon={kpi.icon}
                variant={kpi.variant ?? "default"}
              />
            )}
          </motion.div>
        ))}
      </section>

      {/* Main content (charts, tables, etc.) */}
      {content && <section aria-label={`${title} content`}>{content}</section>}

      {/* Alerts + Recent */}
      {(alerts?.length || recent?.length) ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {alerts && alerts.length > 0 && (
            <section
              className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5"
              aria-label={config.alertsTitle ?? "Alerts"}
            >
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {config.alertsTitle ?? "Alerts"}
              </h2>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <Link
                    key={alert.label}
                    href={alert.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-secondary/20 px-3 py-2.5 transition-all hover:border-primary/20 hover:bg-secondary/40"
                  >
                    <span className="truncate text-xs font-medium text-foreground">
                      {alert.label}
                    </span>
                    {alert.count === undefined ? (
                      <SkeletonLine className="h-4 w-6" />
                    ) : (
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          alert.variant === "warning" && alert.count > 0
                            ? "bg-warning/15 text-warning"
                            : alert.variant === "info"
                              ? "bg-info/15 text-info"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {alert.count}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
          {recent && recent.length > 0 && (
            <section
              className={cn(
                "rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5",
                alerts && alerts.length > 0 ? "lg:col-span-2" : "lg:col-span-3",
              )}
              aria-label={config.recentTitle ?? "Recent"}
            >
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {config.recentTitle ?? "Recent"}
              </h2>
              {recent.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No recent documents
                </div>
              ) : (
                <ul className="space-y-1">
                  {recent.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                            {item.name}
                          </p>
                          {item.subtitle && (
                            <p className="truncate text-[10px] text-muted-foreground">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        {item.badge && (
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              item.badgeVariant === "destructive" &&
                                "bg-destructive/15 text-destructive",
                              item.badgeVariant === "secondary" &&
                                "bg-secondary text-secondary-foreground",
                              (!item.badgeVariant ||
                                item.badgeVariant === "default") &&
                                "bg-primary/10 text-primary",
                              item.badgeVariant === "outline" &&
                                "border border-border/40 text-muted-foreground",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
