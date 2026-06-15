// app/crm/dashboard/page.tsx
// Obsidian ERP v4.0 — CRM Hub (master §4.1, 2N Part 2.2, 2P-FINAL Part B).
//
// 2P-FINAL Part B — ONE SHELL, SIX CONFIGS. The hub renders through
// `DashboardShell` (via the `ModuleHub` compat shim) and passes a
// BarChart of leads vs converted (trailing 6 months) as the
// `children` chart slot. The legacy `actions` quick-action grid is
// preserved for the 2N ship look.

"use client";

import { useMemo } from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  Target,
  FileText,
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

interface CrmPoint {
  month: string;
  leads: number;
  converted: number;
}

function trailingSixMonths(now = new Date()): CrmPoint[] {
  const pts: CrmPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    pts.push({ month: `${y}-${m}`, leads: 0, converted: 0 });
  }
  return pts;
}

function isoMonth(s: string | undefined): string {
  if (!s) return "";
  return s.slice(0, 7);
}

export default function CrmDashboardPage() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .split("T")[0];

  // KPIs
  const { data: openLeads = [] } = useFrappeList<{ name: string }>("Lead", {
    fields: ["name"],
    filters: [["status", "!=", "Converted"]],
    limit: 1,
  });
  const { data: customers = [] } = useFrappeList<{ name: string }>(
    "Customer",
    { fields: ["name"], limit: 1 },
  );
  const { data: openOpps = [] } = useFrappeList<{ name: string }>(
    "Opportunity",
    { fields: ["name"], filters: [["status", "=", "Open"]], limit: 1 },
  );
  const { data: openQuotes = [] } = useFrappeList<{ name: string }>(
    "Quotation",
    {
      fields: ["name"],
      filters: [["status", "in", ["Open", "Draft"]]],
      limit: 1,
    },
  );

  // Recent
  const { data: recentLeads = [] } = useFrappeList<{
    name: string;
    lead_name: string;
    status: string;
  }>("Lead", {
    fields: ["name", "lead_name", "status"],
    orderBy: { field: "creation", order: "desc" },
    limit: 5,
  });

  // Alerts
  const { data: draftLeads = [] } = useFrappeList<{ name: string }>("Lead", {
    fields: ["name"],
    filters: [["status", "=", "Draft"]],
    limit: 1,
  });

  // 2P-FINAL Part B — leads vs converted, trailing 6 months.
  const { data: sixMoLeads = [], isLoading: loadingLeads } = useFrappeList<{
    creation: string;
    status: string;
  }>("Lead", {
    fields: ["creation", "status"],
    filters: [["creation", ">=", sixMonthsAgo]],
    limit: 1000,
  });
  const leadTrend = useMemo<CrmPoint[]>(() => {
    const buckets = trailingSixMonths(now);
    const map = new Map(buckets.map((b) => [b.month, b]));
    for (const l of sixMoLeads) {
      const k = isoMonth(l.creation);
      const cur = map.get(k);
      if (!cur) continue;
      cur.leads += 1;
      if (l.status === "Converted") cur.converted += 1;
    }
    return buckets;
  }, [sixMoLeads, now]);

  const kpis: HubKpi[] = [
    {
      title: "Open Leads",
      value: openLeads.length,
      icon: UserPlus,
      variant: "default",
      href: "/crm/lead",
    },
    {
      title: "Customers",
      value: customers.length,
      icon: UserCheck,
      variant: "success",
      href: "/crm/customer",
    },
    {
      title: "Open Opportunities",
      value: openOpps.length,
      icon: Target,
      variant: "warning",
      href: "/crm/opportunity",
    },
    {
      title: "Open Quotations",
      value: openQuotes.length,
      icon: FileText,
      variant: "default",
      href: "/sales/quotation",
    },
  ];

  const actions: HubAction[] = [
    {
      label: "Leads",
      description: "Pipeline of unqualified prospects.",
      icon: Users,
      href: "/crm/lead",
    },
    {
      label: "Customers",
      description: "Qualified accounts.",
      icon: UserCheck,
      href: "/crm/customer",
    },
    {
      label: "New Lead",
      description: "Capture an unqualified prospect.",
      icon: Plus,
      href: "/crm/lead/new",
      primary: true,
    },
    {
      label: "Opportunities",
      description: "Track deals in motion.",
      icon: Target,
      href: "/crm/opportunity",
    },
  ];

  const recent: HubRecentItem[] = recentLeads.slice(0, 5).map((l) => ({
    name: l.name,
    subtitle: l.lead_name ?? "",
    badge: l.status,
    badgeVariant:
      l.status === "Converted" || l.status === "Quotation"
        ? "outline"
        : "secondary",
    href: `/crm/lead/${encodeURIComponent(l.name)}`,
  }));

  const alerts: HubAlert[] = [
    {
      label: "Draft leads",
      count: draftLeads.length,
      href: "/crm/lead",
      variant: "warning",
    },
    {
      label: "All open leads",
      count: openLeads.length,
      href: "/crm/lead",
      variant: "info",
    },
  ];

  return (
    <ModuleHub
      title="CRM Hub"
      subtitle="Leads, customers, and pipeline at a glance."
      icon={Users}
      primaryAction={{ label: "New Lead", href: "/crm/lead/new" }}
      kpis={kpis}
      actions={actions}
      recent={recent}
      recentTitle="Recent leads"
      alerts={alerts}
    >
      {/* 2P-FINAL Part B — leads vs converted, trailing 6 months.
          Grouped BarChart. OKLCH primary + success. */}
      <div
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        data-testid="crm-leads-trend"
        aria-label="Leads vs converted (last 6 months)"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Leads vs converted
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            6 months
          </span>
        </div>
        {loadingLeads ? (
          <div className="h-40 w-full" aria-hidden />
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="converted"
                  name="Converted"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ModuleHub>
  );
}
