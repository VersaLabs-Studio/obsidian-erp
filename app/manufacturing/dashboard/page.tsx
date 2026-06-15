// app/manufacturing/dashboard/page.tsx
// Obsidian ERP v4.0 — Manufacturing Hub (master §4.1, 2N Part 2.2,
// 2P-FINAL Part B).
//
// 2P-FINAL Part B — ONE SHELL, SIX CONFIGS. The hub renders through
// `DashboardShell` (via the `ModuleHub` compat shim) and passes a
// stacked BarChart of "jobs by status over time" (created in the
// last 6 months, bucketed by month) as the `children` chart slot.
// The legacy `actions` quick-action grid is preserved for the 2N
// ship look.
//
// Note: /manufacturing (Cockpit) is a SEPARATE page from
// /manufacturing/dashboard (this hub). The Cockpit (2P Part 2.2)
// stays as-is — this hub is the dashboard with the shell.

"use client";

import { useMemo } from "react";
import {
  Factory,
  ClipboardList,
  PlayCircle,
  Layers,
  Cpu,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFrappeList } from "@/hooks/generic";
import {
  ModuleHub,
  type HubKpi,
  type HubAction,
  type HubRecentItem,
  type HubAlert,
} from "@/components/dashboard/ModuleHub";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

interface WoPoint {
  month: string;
  Draft: number;
  "In Process": number;
  Completed: number;
  Cancelled: number;
}

function trailingSixMonths(now = new Date()): WoPoint[] {
  const pts: WoPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    pts.push({ month: `${y}-${m}`, Draft: 0, "In Process": 0, Completed: 0, Cancelled: 0 });
  }
  return pts;
}

function isoMonth(s: string | undefined): string {
  if (!s) return "";
  return s.slice(0, 7);
}

export default function ManufacturingDashboardPage() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .split("T")[0];

  // KPIs
  const { data: workOrders = [] } = useFrappeList<{ name: string }>(
    "Work Order",
    { fields: ["name"], limit: 1 },
  );
  const { data: woInProcess = [] } = useFrappeList<{ name: string }>(
    "Work Order",
    {
      fields: ["name"],
      filters: [["status", "=", "In Process"]],
      limit: 1,
    },
  );
  const { data: activeBOMs = [] } = useFrappeList<{ name: string }>("BOM", {
    fields: ["name"],
    filters: [["is_active", "=", 1]],
    limit: 1,
  });
  const { data: workstations = [] } = useFrappeList<{ name: string }>(
    "Workstation",
    { fields: ["name"], limit: 1 },
  );

  // Recent
  const { data: recentWOs = [] } = useFrappeList<{
    name: string;
    production_item?: string;
    status: string;
    creation: string;
  }>("Work Order", {
    fields: ["name", "production_item", "status", "creation"],
    orderBy: { field: "creation", order: "desc" },
    limit: 5,
  });

  // Alerts
  const { data: draftWOs = [] } = useFrappeList<{ name: string }>(
    "Work Order",
    { fields: ["name"], filters: [["docstatus", "=", 0]], limit: 1 },
  );

  // 2P-FINAL Part B — jobs by status over time (last 6 months). Stacked
  // BarChart with the 4 status buckets as separate series.
  const { data: sixMoWOs = [], isLoading: loadingWOs } = useFrappeList<{
    creation: string;
    status: string;
  }>("Work Order", {
    fields: ["creation", "status"],
    filters: [["creation", ">=", sixMonthsAgo]],
    limit: 1000,
  });
  const woTrend = useMemo<WoPoint[]>(() => {
    const buckets = trailingSixMonths(now);
    const map = new Map(buckets.map((b) => [b.month, b]));
    for (const w of sixMoWOs) {
      const k = isoMonth(w.creation);
      const cur = map.get(k);
      if (!cur) continue;
      const status = (w.status || "Draft") as keyof WoPoint;
      // Only count known buckets; ignore other statuses (e.g. "Stopped").
      if (status === "Draft" || status === "In Process" || status === "Completed" || status === "Cancelled") {
        cur[status] = (cur[status] ?? 0) + 1;
      }
    }
    return buckets;
  }, [sixMoWOs, now]);

  const kpis: HubKpi[] = [
    {
      title: "Work Orders",
      value: workOrders.length,
      icon: ClipboardList,
      variant: "default",
      href: "/manufacturing/work-order",
    },
    {
      title: "In Process",
      value: woInProcess.length,
      icon: PlayCircle,
      variant: "warning",
      href: "/manufacturing/work-order",
    },
    {
      title: "Active BOMs",
      value: activeBOMs.length,
      icon: Layers,
      variant: "success",
      href: "/manufacturing/bom",
    },
    {
      title: "Workstations",
      value: workstations.length,
      icon: Cpu,
      variant: "default",
      href: "/manufacturing/workstation",
    },
  ];

  const actions: HubAction[] = [
    {
      label: "Work Orders",
      description: "Production jobs in flight.",
      icon: ClipboardList,
      href: "/manufacturing/work-order",
    },
    {
      label: "BOMs",
      description: "Bill of materials.",
      icon: Layers,
      href: "/manufacturing/bom",
    },
    {
      label: "Workstations",
      description: "Machines and stations.",
      icon: Cpu,
      href: "/manufacturing/workstation",
    },
    {
      label: "New Work Order",
      description: "Schedule a production run.",
      icon: Plus,
      href: "/manufacturing/work-order/new",
      primary: true,
    },
  ];

  const recent: HubRecentItem[] = recentWOs.slice(0, 5).map((wo) => ({
    name: wo.name,
    subtitle: wo.production_item ?? "",
    badge: wo.status,
    badgeVariant:
      wo.status === "In Process"
        ? ("secondary" as const)
        : wo.status === "Completed"
          ? ("outline" as const)
          : ("default" as const),
    href: `/manufacturing/work-order/${encodeURIComponent(wo.name)}`,
  }));

  const alerts: HubAlert[] = [
    {
      label: "Work orders in process",
      count: woInProcess.length,
      href: "/manufacturing/work-order",
      variant: "info",
    },
    {
      label: "Draft work orders",
      count: draftWOs.length,
      href: "/manufacturing/work-order",
      variant: "warning",
    },
  ];

  return (
    <ModuleHub
      title="Manufacturing Hub"
      subtitle="BOMs, work orders, and production."
      icon={Factory}
      primaryAction={{
        label: "New Work Order",
        href: "/manufacturing/work-order/new",
      }}
      kpis={kpis}
      actions={actions}
      recent={recent}
      recentTitle="Recent work orders"
      alerts={alerts}
    >
      {/* 2P-FINAL Part B — jobs by status, stacked BarChart over
          the last 6 months. OKLCH primary + info + success +
          warning ramp. */}
      <div
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        data-testid="mfg-status-trend"
        aria-label="Work orders by status (last 6 months)"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Work orders by status
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            6 months · stacked
          </span>
        </div>
        {loadingWOs ? (
          <div className="h-40 w-full" aria-hidden />
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={woTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border) / 0.4)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Draft" stackId="wo" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="In Process" stackId="wo" fill="hsl(var(--info))" />
                <Bar dataKey="Completed" stackId="wo" fill="hsl(var(--success))" />
                <Bar dataKey="Cancelled" stackId="wo" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ModuleHub>
  );
}
