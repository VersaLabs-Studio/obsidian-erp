// app/sales/dashboard/page.tsx
// Obsidian ERP v4.0 — Sales Hub (master §4.1, 2N Part 2.2, 2P-FINAL Part B).
//
// 2P-FINAL Part B — ONE SHELL, SIX CONFIGS. The hub now renders
// through `DashboardShell` (via the `ModuleHub` compat shim) and
// passes an AreaChart of trailing-6-months SI grand_total as the
// `children` chart slot. The legacy `actions` quick-action grid is
// preserved for the 2N ship look.

"use client";

import { useMemo } from "react";
import {
  ShoppingCart,
  FileText,
  ClipboardList,
  Clock,
  TrendingUp,
  UserPlus,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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

interface SalesTrendPoint {
  /** "YYYY-MM" label, oldest first. */
  month: string;
  sales: number;
}

function trailingSixMonths(now = new Date()): SalesTrendPoint[] {
  const pts: SalesTrendPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    pts.push({ month: `${y}-${m}`, sales: 0 });
  }
  return pts;
}

function isoMonth(s: string | undefined): string {
  if (!s) return "";
  return s.slice(0, 7);
}

export default function SalesDashboardPage() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  // 2P-FINAL Part B — 6-month SI aggregate for the chart.
  // We pull SI grand_total by posting_date over the last 6 months
  // (limit 500 covers a busy month; safe ceiling). The aggregate
  // is computed client-side from a single query.
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    .toISOString()
    .split("T")[0];

  // KPIs
  const { data: openQuotations = [] } = useFrappeList<{ name: string }>(
    "Quotation",
    {
      fields: ["name"],
      filters: [["status", "in", ["Open", "Draft"]]],
      limit: 1,
    },
  );
  const { data: allSalesOrders = [] } = useFrappeList<{ name: string }>(
    "Sales Order",
    { fields: ["name"], limit: 1 },
  );
  const { data: draftSalesOrders = [] } = useFrappeList<{ name: string }>(
    "Sales Order",
    {
      fields: ["name"],
      filters: [["docstatus", "=", 0]],
      limit: 1,
    },
  );
  const { data: monthQuotations = [] } = useFrappeList<{ name: string }>(
    "Quotation",
    {
      fields: ["name", "creation"],
      filters: [["creation", ">=", firstOfMonth]],
      limit: 1,
    },
  );

  // Recent (last 3 quotations + last 2 sales orders, deduped)
  const { data: recentQuotations = [] } = useFrappeList<{
    name: string;
    customer_name?: string;
    grand_total?: number;
    status: string;
    creation: string;
  }>("Quotation", {
    fields: ["name", "customer_name", "grand_total", "status", "creation"],
    orderBy: { field: "creation", order: "desc" },
    limit: 3,
  });
  const { data: recentSalesOrders = [] } = useFrappeList<{
    name: string;
    customer_name?: string;
    grand_total?: number;
    status: string;
    creation: string;
  }>("Sales Order", {
    fields: ["name", "customer_name", "grand_total", "status", "creation"],
    orderBy: { field: "creation", order: "desc" },
    limit: 2,
  });

  // Alerts
  const { data: draftSOAlerts = [] } = useFrappeList<{ name: string }>(
    "Sales Order",
    { fields: ["name"], filters: [["docstatus", "=", 0]], limit: 1 },
  );
  const { data: followupQuotes = [] } = useFrappeList<{ name: string }>(
    "Quotation",
    { fields: ["name"], filters: [["status", "=", "Open"]], limit: 1 },
  );

  // 2P-FINAL Part B — trailing-6-mo sales data (Σ SI grand_total by month).
  const { data: sixMoSIs = [], isLoading: loadingTrend } = useFrappeList<{
    grand_total: number;
    posting_date: string;
  }>("Sales Invoice", {
    fields: ["grand_total", "posting_date"],
    filters: [
      ["docstatus", "=", 1],
      ["posting_date", ">=", sixMonthsAgo],
    ],
    limit: 500,
  });
  const salesTrend = useMemo<SalesTrendPoint[]>(() => {
    const buckets = trailingSixMonths(now);
    const map = new Map(buckets.map((b) => [b.month, b]));
    for (const inv of sixMoSIs) {
      const k = isoMonth(inv.posting_date);
      const cur = map.get(k);
      if (cur) cur.sales += Number(inv.grand_total) || 0;
    }
    return buckets;
  }, [sixMoSIs, now]);

  const kpis: HubKpi[] = [
    {
      title: "Open Quotations",
      value: openQuotations.length,
      icon: FileText,
      variant: "default",
      href: "/sales/quotation",
    },
    {
      title: "Sales Orders",
      value: allSalesOrders.length,
      icon: ClipboardList,
      variant: "default",
      href: "/sales/sales-order",
    },
    {
      title: "Drafts needing submit",
      value: draftSalesOrders.length,
      icon: Clock,
      variant: "warning",
      href: "/sales/sales-order",
    },
    {
      title: "Quotations this month",
      value: monthQuotations.length,
      icon: TrendingUp,
      variant: "success",
      href: "/sales/quotation",
    },
  ];

  const actions: HubAction[] = [
    {
      label: "Quotations",
      description: "Proposals sent to customers.",
      icon: FileText,
      href: "/sales/quotation",
    },
    {
      label: "Sales Orders",
      description: "Confirmed customer orders.",
      icon: ClipboardList,
      href: "/sales/sales-order",
    },
    {
      label: "New Quotation",
      description: "Draft a new proposal.",
      icon: Plus,
      href: "/sales/quotation/new",
      primary: true,
    },
    {
      label: "New Customer",
      description: "Register a new account.",
      icon: UserPlus,
      href: "/crm/customer/new",
    },
  ];

  const recent: HubRecentItem[] = [
    ...recentQuotations.map((q) => ({
      name: q.name,
      subtitle: q.customer_name ?? "",
      badge: q.status,
      badgeVariant:
        q.status === "Open" || q.status === "Draft"
          ? ("secondary" as const)
          : ("outline" as const),
      href: `/sales/quotation/${encodeURIComponent(q.name)}`,
    })),
    ...recentSalesOrders.map((so) => ({
      name: so.name,
      subtitle: so.customer_name ?? "",
      badge: so.status,
      badgeVariant:
        so.status === "Draft"
          ? ("secondary" as const)
          : ("default" as const),
      href: `/sales/sales-order/${encodeURIComponent(so.name)}`,
    })),
  ].slice(0, 5);

  const alerts: HubAlert[] = [
    {
      label: "Drafts needing submit",
      count: draftSOAlerts.length,
      href: "/sales/sales-order",
      variant: "warning",
    },
    {
      label: "Quotations needing follow-up",
      count: followupQuotes.length,
      href: "/sales/quotation",
      variant: "info",
    },
  ];

  return (
    <ModuleHub
      title="Sales Hub"
      subtitle="Quotations, orders, and fulfillment."
      icon={ShoppingCart}
      primaryAction={{ label: "New Quotation", href: "/sales/quotation/new" }}
      kpis={kpis}
      actions={actions}
      recent={recent}
      recentTitle="Recent quotations & orders"
      alerts={alerts}
    >
      {/* 2P-FINAL Part B — trailing-6-month sales AreaChart. Σ SI
          grand_total grouped by month. OKLCH primary semantic. */}
      <div
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        data-testid="sales-trend"
        aria-label="Sales trend (last 6 months)"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Sales trend
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            6 months · Σ SI grand_total
          </span>
        </div>
        {loadingTrend ? (
          <div className="h-40 w-full" aria-hidden />
        ) : salesTrend.every((p) => p.sales === 0) ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            No sales in the last 6 months yet.
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  width={48}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : Math.abs(v) >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border) / 0.4)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => ETB.format(v)}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#salesArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ModuleHub>
  );
}
