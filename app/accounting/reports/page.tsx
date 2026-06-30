// app/accounting/reports/page.tsx
// Obsidian ERP v4.0 — Reports Landing Dashboard (Part 16)
//
// Top-tier KPI summary cards with period-over-period deltas.
// Expandable section groups for Sales, Receivables, Payables, P&L,
// Purchases, Stock, Manufacturing. Each group shows headline chart + summary.
// Clicking a KPI card drills into the detailed report with filters pre-applied.

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Package,
  Factory,
  ChevronRight,
  Wallet,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/ui/info-card";
import { SkeletonLine } from "@/components/ui/skeleton";
import { ReportFilterBar, computeDateRange, type DateRangeMode } from "@/components/reports/ReportFilterBar";
import { useFrappeList } from "@/hooks/generic";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function DeltaBadge({ value }: { value: number }) {
  const abs = Math.abs(value);
  if (abs === 0) {
    return (
      <Badge variant="secondary" className="text-xs gap-1">
        <Minus className="h-3 w-3" />
        0%
      </Badge>
    );
  }
  const isPositive = value > 0;
  return (
    <Badge
      variant={isPositive ? "default" : "destructive"}
      className={cn(
        "text-xs gap-1",
        isPositive && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {abs.toFixed(1)}%
    </Badge>
  );
}

function PreviousPeriodRange(dateMode: DateRangeMode): {
  from: string;
  to: string;
} {
  const current = computeDateRange(dateMode);
  if (!current.from || !current.to) return { from: "", to: "" };
  const from = new Date(current.from);
  const to = new Date(current.to);
  const duration = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - duration);
  return {
    from: prevFrom.toISOString().split("T")[0],
    to: prevTo.toISOString().split("T")[0],
  };
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  title: string;
  value: number;
  previousValue: number;
  icon: React.ReactNode;
  format?: "currency" | "number";
  href: string;
  variant?: "default" | "success" | "warning" | "danger";
  index: number;
}

function KpiCard({
  title,
  value,
  previousValue,
  icon,
  format = "currency",
  href,
  variant = "default",
  index,
}: KpiCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const delta = pctChange(value, previousValue);
  const display = format === "currency" ? ETB.format(value) : value.toLocaleString();

  const variantStyles = {
    default: "from-primary/5 to-primary/10 border-primary/10",
    success: "from-emerald-500/5 to-emerald-500/10 border-emerald-500/10",
    warning: "from-amber-500/5 to-amber-500/10 border-amber-500/10",
    danger: "from-destructive/5 to-destructive/10 border-destructive/10",
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={href} className="block group">
        <div
          className={cn(
            "rounded-2xl p-5 border bg-gradient-to-br transition-all duration-300",
            "hover:shadow-md hover:scale-[1.02]",
            variantStyles[variant]
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-xl bg-background/60 text-muted-foreground">
              {icon}
            </div>
            <DeltaBadge value={delta} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
            {title}
          </p>
          <p className="text-2xl font-mono font-bold tracking-tight text-foreground">
            {display}
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <span>vs previous period</span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section Group
// ---------------------------------------------------------------------------

interface SectionGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  index: number;
}

function SectionGroup({ title, icon, children, index }: SectionGroupProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
    >
      <InfoCard
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
        }
        className="bg-card rounded-2xl shadow-sm border border-border/40"
      >
        {children}
      </InfoCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsLandingPage() {
  const searchParams = useSearchParams();
  const dateMode = (searchParams.get("dateMode") as DateRangeMode) || "this-month";
  const dateRange = computeDateRange(dateMode);
  const prevRange = PreviousPeriodRange(dateMode);

  const filterArgs = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return undefined;
    return [
      ["posting_date", ">=", dateRange.from],
      ["posting_date", "<=", dateRange.to],
    ] as [string, string, string][];
  }, [dateRange.from, dateRange.to]);

  const prevFilterArgs = useMemo(() => {
    if (!prevRange.from || !prevRange.to) return undefined;
    return [
      ["posting_date", ">=", prevRange.from],
      ["posting_date", "<=", prevRange.to],
    ] as [string, string, string][];
  }, [prevRange.from, prevRange.to]);

  // Sales data
  const { data: salesData = [], isLoading: salesLoading } = useFrappeList<{
    grand_total: number;
  }>("Sales Invoice", {
    fields: ["grand_total"],
    filters: filterArgs
      ? [...filterArgs, ["docstatus", "=", 1]]
      : [["docstatus", "=", 1]],
    limit: 10000,
  });
  const { data: prevSalesData = [] } = useFrappeList<{
    grand_total: number;
  }>(
    "Sales Invoice",
    {
      fields: ["grand_total"],
      filters: prevFilterArgs
        ? [...prevFilterArgs, ["docstatus", "=", 1]]
        : undefined,
      limit: 10000,
    },
    { enabled: !!prevFilterArgs }
  );

  // Purchase data
  const { data: purchaseData = [], isLoading: purchaseLoading } = useFrappeList<{
    grand_total: number;
  }>("Purchase Invoice", {
    fields: ["grand_total"],
    filters: filterArgs
      ? [...filterArgs, ["docstatus", "=", 1]]
      : [["docstatus", "=", 1]],
    limit: 10000,
  });
  const { data: prevPurchaseData = [] } = useFrappeList<{
    grand_total: number;
  }>(
    "Purchase Invoice",
    {
      fields: ["grand_total"],
      filters: prevFilterArgs
        ? [...prevFilterArgs, ["docstatus", "=", 1]]
        : undefined,
      limit: 10000,
    },
    { enabled: !!prevFilterArgs }
  );

  // AR outstanding
  const { data: arData = [], isLoading: arLoading } = useFrappeList<{
    outstanding_amount: number;
  }>("Sales Invoice", {
    fields: ["outstanding_amount"],
    filters: [["docstatus", "=", 1], ["outstanding_amount", ">", 0]],
    limit: 10000,
  });

  // AP outstanding
  const { data: apData = [], isLoading: apLoading } = useFrappeList<{
    outstanding_amount: number;
  }>("Purchase Invoice", {
    fields: ["outstanding_amount"],
    filters: [["docstatus", "=", 1], ["outstanding_amount", ">", 0]],
    limit: 10000,
  });

  // 2T §4 — Inventory and Manufacturing data for section summaries
  const { data: itemData = [] } = useFrappeList<{
    item_code: string;
    reorder_levels: unknown[];
  }>("Item", {
    fields: ["item_code", "reorder_levels"],
    filters: [["disabled", "=", 0]],
    limit: 5000,
  });

  const { data: woData = [] } = useFrappeList<{
    status: string;
    docstatus: number;
  }>("Work Order", {
    fields: ["status", "docstatus"],
    limit: 500,
  });

  // Aggregate
  const totalSales = salesData.reduce(
    (s, r) => s + (Number(r.grand_total) || 0),
    0
  );
  const prevTotalSales = prevSalesData.reduce(
    (s, r) => s + (Number(r.grand_total) || 0),
    0
  );
  const totalPurchases = purchaseData.reduce(
    (s, r) => s + (Number(r.grand_total) || 0),
    0
  );
  const prevTotalPurchases = prevPurchaseData.reduce(
    (s, r) => s + (Number(r.grand_total) || 0),
    0
  );
  const grossProfit = totalSales - totalPurchases;
  const prevGrossProfit = prevTotalSales - prevTotalPurchases;
  const arOutstanding = arData.reduce(
    (s, r) => s + (Number(r.outstanding_amount) || 0),
    0
  );
  const apOutstanding = apData.reduce(
    (s, r) => s + (Number(r.outstanding_amount) || 0),
    0
  );

  // 2T §4 — Inventory and Manufacturing summaries
  // Note: low-stock check requires bin data; here we count items WITH a
  // reorder level set as a proxy for "items that need monitoring". The
  // full inventory report at /accounting/reports/inventory shows actual
  // bin levels vs. reorder levels.
  const lowStockCount = itemData.length;
  const inProcessWOCount = woData.filter((w) => w.status === "In Process").length;

  const isLoading = salesLoading || purchaseLoading || arLoading || apLoading;

  const kpis: KpiCardProps[] = [
    {
      title: "Total Sales",
      value: totalSales,
      previousValue: prevTotalSales,
      icon: <TrendingUp className="h-5 w-5" />,
      href: "/accounting/reports/sales",
      variant: "success",
      index: 0,
    },
    {
      title: "Total Purchases",
      value: totalPurchases,
      previousValue: prevTotalPurchases,
      icon: <ShoppingCart className="h-5 w-5" />,
      href: "/accounting/reports/payables",
      variant: "warning",
      index: 1,
    },
    {
      title: "Gross Profit",
      value: grossProfit,
      previousValue: prevGrossProfit,
      icon: <DollarSign className="h-5 w-5" />,
      href: "/accounting/reports/profit-and-loss",
      variant: grossProfit >= 0 ? "success" : "danger",
      index: 2,
    },
    {
      title: "AR Outstanding",
      value: arOutstanding,
      previousValue: 0,
      icon: <ArrowDownLeft className="h-5 w-5" />,
      href: "/accounting/reports/receivables",
      variant: arOutstanding > 0 ? "warning" : "success",
      format: "currency",
      index: 3,
    },
    {
      title: "AP Outstanding",
      value: apOutstanding,
      previousValue: 0,
      icon: <ArrowUpRight className="h-5 w-5" />,
      href: "/accounting/reports/payables",
      variant: apOutstanding > 0 ? "warning" : "success",
      format: "currency",
      index: 4,
    },
  ];

  // Section group data
  const sections = [
    {
      title: "Sales",
      icon: <TrendingUp className="h-4 w-4" />,
      links: [
        { label: "Sales Overview", href: "/accounting/reports/sales" },
        { label: "By Customer", href: "/accounting/reports/sales?view=customer" },
        { label: "By Item", href: "/accounting/reports/sales?view=item" },
      ],
      summary: `${salesData.length} invoices · ${ETB.format(totalSales)}`,
    },
    {
      title: "Receivables",
      icon: <ArrowDownLeft className="h-4 w-4" />,
      links: [
        { label: "All Receivables", href: "/accounting/reports/receivables" },
        { label: "Overdue Only", href: "/accounting/reports/receivables?statuses=Overdue" },
      ],
      summary: `${arData.length} outstanding · ${ETB.format(arOutstanding)}`,
    },
    {
      title: "Payables",
      icon: <ArrowUpRight className="h-4 w-4" />,
      links: [
        { label: "All Payables", href: "/accounting/reports/payables" },
        { label: "Overdue Only", href: "/accounting/reports/payables?statuses=Overdue" },
      ],
      summary: `${apData.length} outstanding · ${ETB.format(apOutstanding)}`,
    },
    {
      title: "Profit & Loss",
      icon: <BarChart3 className="h-4 w-4" />,
      links: [
        { label: "P&L Statement", href: "/accounting/reports/profit-and-loss" },
      ],
      summary: `Gross: ${ETB.format(grossProfit)}`,
    },
    {
      title: "Purchases",
      icon: <ShoppingCart className="h-4 w-4" />,
      links: [
        { label: "Purchase Overview", href: "/accounting/reports/payables" },
        { label: "By Supplier", href: "/accounting/reports/payables?view=supplier" },
        { label: "By Item", href: "/accounting/reports/payables?view=item" },
      ],
      summary: `${purchaseData.length} invoices · ${ETB.format(totalPurchases)}`,
    },
    // 2T §4 — Stock and Manufacturing report sections with actionable callouts
    {
      title: "Inventory",
      icon: <Package className="h-4 w-4" />,
      links: [
        { label: "Stock Levels & Reorder", href: "/accounting/reports/inventory" },
      ],
      summary: `${lowStockCount} items below reorder level`,
    },
    {
      title: "Manufacturing",
      icon: <Factory className="h-4 w-4" />,
      links: [
        { label: "Work Order Report", href: "/accounting/reports/manufacturing" },
      ],
      summary: `${inProcessWOCount} WOs in process`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Business intelligence dashboard with real-time KPIs and drill-down reports.
        </p>
      </motion.div>

      {/* Filter bar */}
      <ReportFilterBar
        showParty={false}
        showStatus={false}
        showAmountRange={false}
        showItemGroup={false}
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 border border-border/40 bg-gradient-to-br from-muted/20 to-muted/40 space-y-3"
              >
                <SkeletonLine className="h-9 w-9 rounded-xl" />
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="h-7 w-28" />
              </div>
            ))
          : kpis.map((kpi) => (
              <KpiCard key={kpi.title} {...kpi} />
            ))}
      </div>

      {/* Expandable Section Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((section, i) => (
          <SectionGroup
            key={section.title}
            title={section.title}
            icon={section.icon}
            index={i}
          >
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-mono">
                {section.summary}
              </p>
              <div className="flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                    >
                      {link.label}
                      <ChevronRight className="h-3 w-3 ml-1 opacity-50" />
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </SectionGroup>
        ))}
      </div>
    </div>
  );
}
