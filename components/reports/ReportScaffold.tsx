// components/reports/ReportScaffold.tsx
// Obsidian ERP v4.0 — Phase 2Y Part 7: Reusable Report Scaffold.
//
// A premium, reusable scaffold for all flagship reports. Provides:
//   - Animated page header with icon + title + description
//   - Period selector (from/to dates)
//   - KPI summary cards at the top (configurable)
//   - Main content slot (the report-specific body)
//   - Framer Motion stagger entrance
//   - OKLCH tokens only, dual light/dark, glassmorphism cards
//
// This is the ONE report page template — no bespoke page wrappers per report.
// Each flagship report just passes props to this scaffold and renders its
// specific content in the body slot.

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import { cn } from "@/lib/utils";
import { containerVariants, itemVariants } from "@/lib/motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KpiEntry {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "default" | "success" | "danger" | "warning";
  isLoading?: boolean;
  href?: string;
}

interface ReportScaffoldProps {
  /** Report title (e.g. "Stock Balance & Valuation") */
  title: string;
  /** Short description shown under the title */
  description: string;
  /** Lucide icon for the header */
  icon: LucideIcon;
  /** KPI summary cards (0–6) */
  kpis?: KpiEntry[];
  /** Main report content */
  children: React.ReactNode;
  /** Whether the report data is loading */
  isLoading?: boolean;
  /** Optional additional class for the content area */
  className?: string;
  /** Period selector callback — when the user changes date range */
  onPeriodChange?: (from: string, to: string) => void;
  /** Initial from date */
  defaultFrom?: string;
  /** Initial to date */
  defaultTo?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportScaffold({
  title,
  description,
  icon: Icon,
  kpis = [],
  children,
  isLoading = false,
  className,
  onPeriodChange,
  defaultFrom,
  defaultTo,
}: ReportScaffoldProps) {
  // Period state (defaults to current month)
  const fromDefault = defaultFrom ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const toDefault = defaultTo ?? new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(toDefault);

  function handlePeriodChange() {
    if (onPeriodChange) {
      onPeriodChange(from, to);
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title={title}
          subtitle={description}
          actions={
            onPeriodChange ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-secondary/30 px-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => { setFrom(e.target.value); handlePeriodChange(); }}
                    className="h-8 rounded-lg border-0 bg-secondary/30 px-2 text-sm text-foreground tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => { setTo(e.target.value); handlePeriodChange(); }}
                    className="h-8 rounded-lg border-0 bg-secondary/30 px-2 text-sm text-foreground tabular-nums"
                  />
                </div>
              </div>
            ) : undefined
          }
        />
      </motion.div>

      {/* KPI cards */}
      {kpis.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className={cn(
            "grid gap-4",
            kpis.length <= 2 ? "grid-cols-2" :
            kpis.length <= 4 ? "grid-cols-2 sm:grid-cols-4" :
            "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
          )}>
            {kpis.map((kpi) => (
              <KPICard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                variant={kpi.variant}
                isLoading={kpi.isLoading || isLoading}
                href={kpi.href}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <motion.div variants={itemVariants} className={className}>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default ReportScaffold;
