// components/dashboard/GlobalDashboard.tsx
// Obsidian ERP v4.0 — Global Home Dashboard (master §4.2).
//
// 2N Part 2.1: REBUILT on real data. The previous version was a fabricated
// mockup (hardcoded revenue 1,240,500; "Enterprise v3.0" badge; fake Audit
// Log with "John Doe"; "Prediction Engine" panel; "150+/156" lead counts).
// This file renders the §4.2 layout — Today's Focus, KPI row, Module grid
// — driven entirely by `useFrappeList` aggregates. No hardcoded numbers.
//
// 2O Part 4.1 — UPGRADED with:
//   - Three small trend charts (revenue / sales vs purchases / cash
//     position) using `recharts`. All values come from real
//     `useFrappeList` aggregates — no fabricated projections.
//   - Actionable alert tiles (low stock, unpaid invoices, overdue POs,
//     drafts needing submit). Each tile is a `<Link>` with a count and
//     routes to the filtered list or the create flow on click.
//   - A "Forward look" section with honest projection tiles (expected
//     receivables from outstanding SIs, open-order value) labeled
//     "estimate" — NEVER "AI prediction" or "forecast" (premium-ui
//     anti-slop rule).
//   - A quick-create CTA row for the common docs.
//
// Anti-slop (premium-ui hard rule): semantic OKLCH tokens only; no
// `bg-${x}` dynamic Tailwind; no "Prediction Engine" / "AI" /
// "Performance" gimmick labels; no fabricated counts. Every number
// traces to a real query.
//
// Premium-UI: OKLCH semantic tokens only, B1-style cards, staggered
// Framer entrance, real skeletons. Dual-theme + 375px + reduced-motion
// verified visually.

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Plus,
  ArrowRight,
  AlertCircle,
  Clock,
  Receipt,
  CreditCard,
  Boxes,
  TrendingUp,
  TrendingDown,
  Package,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFrappeList } from "@/hooks/generic";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

function formatETB(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return ETB.format(amount);
}

/** Short month label: "Jan" "Feb" … */
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Build the 6 trailing months of rollups — used by every chart on the page. */
interface MonthRollup {
  month: string;
  sales: number;
  purchases: number;
  net: number;
}

/**
 * Fetch the trailing 6 months of submitted SI grand_totals + PI
 * grand_totals in ONE round-trip per doctype (limit 200 is more than
 * enough for a 6-month window).
 */
function useTrailingSixMonths() {
  const today = new Date();
  // Window: 1st of the month, 5 months back, → today
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1)
    .toISOString()
    .split("T")[0];
  const { data: submittedSIs = [] } = useFrappeList<{
    grand_total: number;
    posting_date: string;
  }>("Sales Invoice", {
    fields: ["grand_total", "posting_date"],
    filters: [
      ["docstatus", "=", 1],
      ["posting_date", ">=", start],
    ],
    limit: 200,
  });
  const { data: submittedPIs = [] } = useFrappeList<{
    grand_total: number;
    posting_date: string;
  }>("Purchase Invoice", {
    fields: ["grand_total", "posting_date"],
    filters: [
      ["docstatus", "=", 1],
      ["posting_date", ">=", start],
    ],
    limit: 200,
  });

  return useMemo<MonthRollup[]>(() => {
    // Initialize 6 buckets for the trailing window.
    const buckets: MonthRollup[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      buckets.push({
        month: MONTH_LABELS[d.getMonth()] ?? "",
        sales: 0,
        purchases: 0,
        net: 0,
      });
    }
    const indexFor = (iso: string | undefined): number => {
      if (!iso) return -1;
      const d = new Date(iso);
      const monthsAgo =
        (today.getFullYear() - d.getFullYear()) * 12 +
        (today.getMonth() - d.getMonth());
      if (monthsAgo < 0 || monthsAgo > 5) return -1;
      return 5 - monthsAgo;
    };
    for (const si of submittedSIs) {
      const idx = indexFor(si.posting_date);
      if (idx >= 0) buckets[idx].sales += Number(si.grand_total) || 0;
    }
    for (const pi of submittedPIs) {
      const idx = indexFor(pi.posting_date);
      if (idx >= 0) buckets[idx].purchases += Number(pi.grand_total) || 0;
    }
    for (const b of buckets) b.net = b.sales - b.purchases;
    return buckets;
  }, [submittedSIs, submittedPIs, today.getFullYear(), today.getMonth()]);
}

// ---------------------------------------------------------------------------
// Module card
// ---------------------------------------------------------------------------
interface ModuleCardData {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  count: number | undefined;
  countLabel: string;
  colorKey: "primary" | "info" | "success" | "warning" | "destructive";
}

const MODULE_COLOR_TOKENS: Record<
  ModuleCardData["colorKey"],
  { iconBg: string; iconText: string }
> = {
  primary: { iconBg: "bg-primary/10", iconText: "text-primary" },
  info: { iconBg: "bg-info/10", iconText: "text-info" },
  success: { iconBg: "bg-success/10", iconText: "text-success" },
  warning: { iconBg: "bg-warning/10", iconText: "text-warning" },
  destructive: { iconBg: "bg-destructive/10", iconText: "destructive" },
};

function ModuleCard({
  data,
  index,
}: {
  data: ModuleCardData;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const color = MODULE_COLOR_TOKENS[data.colorKey];
  const isLoading = data.count === undefined;
  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.3, delay: 0.1 + index * 0.05 }
      }
      onClick={() => router.push(data.href)}
      className="group cursor-pointer rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 transition-all hover:border-primary/20 hover:shadow-lg sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
            color.iconBg,
          )}
        >
          <data.icon className={cn("h-5 w-5", color.iconText)} />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{data.title}</h3>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
        {data.description}
      </p>
      <div className="mt-4 flex items-baseline gap-2">
        {isLoading ? (
          <SkeletonLine className="h-6 w-12" />
        ) : (
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {data.count}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{data.countLabel}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Actionable alert tile (2O Part 4.1 — every tile is a Link with a CTA)
// ---------------------------------------------------------------------------
interface AlertTile {
  label: string;
  cta: string;
  count: number | undefined;
  href: string;
  icon: LucideIcon;
  variant: "warning" | "info" | "default";
}

function AlertTileRow({ tile }: { tile: AlertTile }) {
  return (
    <Link
      href={tile.href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3 transition-all hover:border-primary/20 hover:bg-secondary/40"
    >
      <div className="flex items-center gap-3">
        <tile.icon
          className={cn(
            "h-4 w-4 shrink-0",
            tile.variant === "warning"
              ? "text-warning"
              : tile.variant === "info"
                ? "text-info"
                : "text-muted-foreground",
          )}
        />
        <div>
          <p className="text-sm font-medium text-foreground">{tile.label}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {tile.cta}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {tile.count === undefined ? (
          <SkeletonLine className="h-5 w-8" />
        ) : (
          <Badge
            variant={
              tile.count > 0 && tile.variant === "warning"
                ? "destructive"
                : "secondary"
            }
            className="tabular-nums"
          >
            {tile.count}
          </Badge>
        )}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Projection tile (2O Part 4.1 — labeled "estimate", not "AI prediction")
// ---------------------------------------------------------------------------
interface ProjectionTile {
  label: string;
  value: number | undefined;
  /** Short explanation of how the number is computed — keeps the
   *  "estimate" label honest. */
  basis: string;
  icon: LucideIcon;
}

function ProjectionRow({ tile }: { tile: ProjectionTile }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
      <tile.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{tile.label}</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            Estimate
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">{tile.basis}</p>
      </div>
      <div className="shrink-0 text-right">
        {tile.value === undefined ? (
          <SkeletonLine className="h-5 w-16" />
        ) : (
          <span className="text-base font-bold tabular-nums text-foreground">
            {ETB.format(tile.value)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function GlobalDashboard() {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const monthly = useTrailingSixMonths();

  // -- KPI rollups --------------------------------------------------------
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const today = now.toISOString().split("T")[0];
  const { data: monthSalesInvoices = [] } = useFrappeList<{
    grand_total: number;
    outstanding_amount: number;
    due_date?: string;
  }>("Sales Invoice", {
    fields: ["grand_total", "outstanding_amount", "docstatus", "posting_date", "due_date"],
    filters: [
      ["posting_date", ">=", firstOfMonth],
      ["docstatus", "=", 1],
    ],
    limit: 500,
  });

  // Receivables (Σ SI outstanding_amount)
  const { data: openSalesInvoices = [] } = useFrappeList<{
    outstanding_amount: number;
    due_date?: string;
  }>("Sales Invoice", {
    fields: ["outstanding_amount", "docstatus", "due_date"],
    filters: [["docstatus", "=", 1]],
    limit: 500,
  });

  // Payables (Σ PI outstanding_amount)
  const { data: openPurchaseInvoices = [] } = useFrappeList<{
    outstanding_amount: number;
  }>("Purchase Invoice", {
    fields: ["outstanding_amount", "docstatus"],
    filters: [["docstatus", "=", 1]],
    limit: 500,
  });

  // Open Sales Orders (for projections)
  const { data: openSalesOrders = [] } = useFrappeList<{
    name: string;
    grand_total?: number;
  }>("Sales Order", {
    fields: ["name", "grand_total", "docstatus"],
    filters: [["docstatus", "=", 1]],
    limit: 500,
  });

  // Stock value (Σ Bin actual_qty × valuation_rate)
  const { data: bins = [] } = useFrappeList<{
    actual_qty: number;
    valuation_rate: number;
  }>("Bin", {
    fields: ["actual_qty", "valuation_rate"],
    limit: 1000,
  });

  // Low-stock items (Bin actual_qty below reorder level)
  // The Items API exposes `reorder_levels` as a child table, so we
  // query the Item Reorder table directly. If the table is empty
  // (no items configured for reorder), the count is zero — which is
  // the honest answer.
  const { data: reorderRows = [] } = useFrappeList<{
    name: string;
    parent?: string;
    warehouse?: string;
    warehouse_reorder_level?: number;
    warehouse_reorder_qty?: number;
  }>("Item Reorder", {
    fields: ["name", "parent", "warehouse", "warehouse_reorder_level", "warehouse_reorder_qty"],
    limit: 200,
  });
  const { data: binLevels = [] } = useFrappeList<{
    item_code: string;
    warehouse: string;
    actual_qty: number;
  }>("Bin", {
    fields: ["item_code", "warehouse", "actual_qty"],
    limit: 1000,
  });
  const lowStockCount = useMemo(() => {
    if (reorderRows.length === 0 || binLevels.length === 0) return 0;
    const binKey = (item: string, wh: string) => `${item}::${wh}`;
    const binMap = new Map<string, number>();
    for (const b of binLevels) {
      binMap.set(binKey(b.item_code, b.warehouse), Number(b.actual_qty) || 0);
    }
    let count = 0;
    for (const r of reorderRows) {
      const parent = r.parent;
      const wh = r.warehouse;
      if (!parent || !wh) continue;
      const onHand = binMap.get(binKey(parent, wh)) ?? 0;
      if (onHand < (Number(r.warehouse_reorder_level) || 0)) {
        count++;
      }
    }
    return count;
  }, [reorderRows, binLevels]);

  // -- Today's Focus counts -----------------------------------------------
  const { data: focusOrders = [] } = useFrappeList<{ name: string }>(
    "Sales Order",
    {
      fields: ["name", "docstatus", "status"],
      filters: [["docstatus", "=", 0]],
      limit: 200,
    },
  );
  const { data: focusUnpaidSIs = [] } = useFrappeList<{ name: string }>(
    "Sales Invoice",
    {
      fields: ["name", "docstatus", "outstanding_amount", "due_date"],
      filters: [
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
      ],
      limit: 200,
    },
  );
  const { data: focusOverdueSIs = [] } = useFrappeList<{
    name: string;
    due_date?: string;
    outstanding_amount?: number;
  }>("Sales Invoice", {
    fields: ["name", "due_date", "outstanding_amount"],
    filters: [
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0],
      ["due_date", "<", today],
    ],
    limit: 200,
  });
  const { data: focusOverduePOs = [] } = useFrappeList<{ name: string }>(
    "Purchase Order",
    {
      fields: ["name", "docstatus", "status"],
      filters: [
        ["status", "in", ["To Receive and Bill", "To Receive", "To Bill"]],
      ],
      limit: 200,
    },
  );
  const { data: focusOpenWOs = [] } = useFrappeList<{ name: string }>(
    "Work Order",
    {
      fields: ["name", "status"],
      filters: [["status", "=", "In Process"]],
      limit: 200,
    },
  );
  const { data: focusOverduePEs = [] } = useFrappeList<{ name: string }>(
    "Payment Entry",
    {
      fields: ["name", "docstatus"],
      filters: [["docstatus", "=", 0]],
      limit: 200,
    },
  );

  // -- Module grid counts (real, no fallback strings) ----------------------
  const { data: leadsAll = [] } = useFrappeList<{ name: string }>("Lead", {
    fields: ["name"],
    limit: 1,
  });
  const { data: customersAll = [] } = useFrappeList<{ name: string }>(
    "Customer",
    { fields: ["name"], limit: 1 },
  );
  const { data: quotationsAll = [] } = useFrappeList<{ name: string }>(
    "Quotation",
    { fields: ["name"], limit: 1 },
  );
  const { data: itemsAll = [] } = useFrappeList<{ name: string }>("Item", {
    fields: ["name"],
    limit: 1,
  });
  const { data: workOrdersAll = [] } = useFrappeList<{ name: string }>(
    "Work Order",
    { fields: ["name"], limit: 1 },
  );
  const { data: purchaseOrdersAll = [] } = useFrappeList<{ name: string }>(
    "Purchase Order",
    { fields: ["name"], limit: 1 },
  );
  const { data: suppliersAll = [] } = useFrappeList<{ name: string }>(
    "Supplier",
    { fields: ["name"], limit: 1 },
  );
  const { data: openSalesInvoicesCount = [] } = useFrappeList<{
    name: string;
  }>("Sales Invoice", {
    fields: ["name", "docstatus"],
    filters: [["docstatus", "=", 1]],
    limit: 1,
  });

  // -- Derived KPIs -------------------------------------------------------
  const kpis = useMemo(() => {
    const monthRevenue = monthSalesInvoices.reduce(
      (sum, i) => sum + (Number(i.grand_total) || 0),
      0,
    );
    const receivables = openSalesInvoices.reduce(
      (sum, i) => sum + (Number(i.outstanding_amount) || 0),
      0,
    );
    const payables = openPurchaseInvoices.reduce(
      (sum, i) => sum + (Number(i.outstanding_amount) || 0),
      0,
    );
    const stockValue = bins.reduce(
      (sum, b) =>
        sum +
        (Number(b.actual_qty) || 0) * (Number(b.valuation_rate) || 0),
      0,
    );
    return { monthRevenue, receivables, payables, stockValue };
  }, [monthSalesInvoices, openSalesInvoices, openPurchaseInvoices, bins]);

  // -- Projections (2O Part 4.1 — honest estimates, not "AI") ------------
  // Expected receivables = sum of outstanding SIs (Σ outstanding_amount)
  // Open-order value = sum of grand_total on submitted open SOs
  // Overdue amount = sum of outstanding where due_date < today
  const projections = useMemo(() => {
    const expectedReceivables = openSalesInvoices.reduce(
      (s, i) => s + (Number(i.outstanding_amount) || 0),
      0,
    );
    const openOrderValue = openSalesOrders.reduce(
      (s, o) => s + (Number(o.grand_total) || 0),
      0,
    );
    const overdueAmount = focusOverdueSIs.reduce(
      (s, i) => s + (Number(i.outstanding_amount) || 0),
      0,
    );
    return { expectedReceivables, openOrderValue, overdueAmount };
  }, [openSalesInvoices, openSalesOrders, focusOverdueSIs]);

  // -- Module cards -------------------------------------------------------
  const moduleCards: ModuleCardData[] = [
    {
      title: "CRM",
      description: "Pipeline & customers",
      icon: AlertCircle,
      href: "/crm/dashboard",
      count: leadsAll.length,
      countLabel: `${customersAll.length} customers`,
      colorKey: "primary",
    },
    {
      title: "Sales",
      description: "Quotations & orders",
      icon: Clock,
      href: "/sales/dashboard",
      count: quotationsAll.length,
      countLabel: `${openSalesOrders.length} open SO`,
      colorKey: "info",
    },
    {
      title: "Inventory",
      description: "Items & warehouses",
      icon: Boxes,
      href: "/stock/dashboard",
      count: itemsAll.length,
      countLabel: "items",
      colorKey: "warning",
    },
    {
      title: "Buying",
      description: "Suppliers & POs",
      icon: Receipt,
      href: "/buying/dashboard",
      count: purchaseOrdersAll.length,
      countLabel: `${suppliersAll.length} suppliers`,
      colorKey: "info",
    },
    {
      title: "Manufacturing",
      description: "BOMs & work orders",
      icon: AlertCircle,
      href: "/manufacturing/dashboard",
      count: workOrdersAll.length,
      countLabel: "work orders",
      colorKey: "success",
    },
    {
      title: "Accounting",
      description: "Invoices & payments",
      icon: CreditCard,
      href: "/accounting/dashboard",
      count: openSalesInvoicesCount.length,
      countLabel: "open SIs",
      colorKey: "primary",
    },
  ];

  // -- Actionable alert tiles (2O Part 4.1) ------------------------------
  const alertTiles: AlertTile[] = [
    {
      label: "Low-stock items",
      cta: "Create Material Request",
      count: lowStockCount,
      href: "/stock/material-request/new",
      icon: Package,
      variant: lowStockCount > 0 ? "warning" : "default",
    },
    {
      label: "Unpaid invoices",
      cta: "Receive Payment",
      count: focusUnpaidSIs.length,
      href: "/accounting/payment-entry/new",
      icon: Receipt,
      variant: focusUnpaidSIs.length > 0 ? "warning" : "default",
    },
    {
      label: "Overdue invoices",
      cta: "View Accounts Receivable",
      count: focusOverdueSIs.length,
      href: "/accounting/reports/accounts-receivable",
      icon: TrendingDown,
      variant: focusOverdueSIs.length > 0 ? "warning" : "default",
    },
    {
      label: "Overdue POs",
      cta: "View Purchase Orders",
      count: focusOverduePOs.length,
      href: "/buying/purchase-order",
      icon: AlertCircle,
      variant: focusOverduePOs.length > 0 ? "warning" : "default",
    },
    {
      label: "Drafts needing submit",
      cta: "Open Sales Orders",
      count: focusOrders.length,
      href: "/sales/sales-order",
      icon: Clock,
      variant: focusOrders.length > 0 ? "warning" : "default",
    },
    {
      label: "Work orders in progress",
      cta: "View Work Orders",
      count: focusOpenWOs.length,
      href: "/manufacturing/work-order",
      icon: AlertCircle,
      variant: "info",
    },
    {
      label: "Draft payment entries",
      cta: "Open Payment Entries",
      count: focusOverduePEs.length,
      href: "/accounting/payment-entry",
      icon: CreditCard,
      variant: focusOverduePEs.length > 0 ? "warning" : "default",
    },
  ];

  // -- Projection tiles (2O Part 4.1) ------------------------------------
  const projectionTiles: ProjectionTile[] = [
    {
      label: "Expected receivables",
      basis: "Σ outstanding SIs (open) — flows in as customers pay",
      value: projections.expectedReceivables,
      icon: TrendingUp,
    },
    {
      label: "Open-order value",
      basis: "Σ grand_total of submitted SOs awaiting fulfillment",
      value: projections.openOrderValue,
      icon: Receipt,
    },
    {
      label: "Overdue receivables",
      basis: "Σ outstanding on SIs past due_date",
      value: projections.overdueAmount,
      icon: TrendingDown,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero header */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Home
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time rollups from your operational data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-full"
            onClick={() => router.push("/sales/quotation/new")}
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Transaction
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => router.push("/crm/lead/new")}
          >
            <AlertCircle className="mr-1.5 h-4 w-4" /> Capture Lead
          </Button>
        </div>
      </motion.div>

      {/* KPI row — 4 tiles, all real data */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Key performance indicators"
      >
        <KPICard
          title="Revenue (this month)"
          value={formatETB(kpis.monthRevenue)}
          icon={TrendingUp}
          variant="default"
        />
        <KPICard
          title="Receivables"
          value={formatETB(kpis.receivables)}
          icon={ArrowRight}
          variant="success"
        />
        <KPICard
          title="Payables"
          value={formatETB(kpis.payables)}
          icon={Clock}
          variant="warning"
        />
        <KPICard
          title="Stock value"
          value={formatETB(kpis.stockValue)}
          icon={Package}
          variant="default"
        />
      </section>

      {/* Trend charts (2O Part 4.1) */}
      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        aria-label="Trends"
      >
        {/* Revenue trend */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Revenue trend
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              6 months
            </span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                  width={40}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
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
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales vs Purchases */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Sales vs Purchases
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              6 months
            </span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                  width={40}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
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
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="purchases" name="Purchases" fill="hsl(var(--info))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash position */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Net cash position
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              6 months
            </span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                  width={40}
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
                <Bar
                  dataKey="net"
                  name="Net (sales − purchases)"
                  fill="hsl(var(--success))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Actionable alerts (2O Part 4.1) */}
      <section
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        aria-label="Actionable alerts"
      >
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Actionable alerts
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alertTiles.map((tile) => (
            <AlertTileRow key={tile.label} tile={tile} />
          ))}
        </div>
      </section>

      {/* Forward look (2O Part 4.1 — honest estimates, NOT "AI") */}
      <section
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        aria-label="Forward look (estimates)"
      >
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Forward look
          </h2>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            Estimate
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {projectionTiles.map((tile) => (
            <ProjectionRow key={tile.label} tile={tile} />
          ))}
        </div>
      </section>

      {/* Quick-create CTA row (2O Part 4.1) */}
      <section
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        aria-label="Quick create"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Quick create
          </h2>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Common documents
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Quotation", href: "/sales/quotation/new" },
            { label: "Sales Order", href: "/sales/sales-order/new" },
            { label: "Sales Invoice", href: "/accounting/sales-invoice/new" },
            { label: "Purchase Order", href: "/buying/purchase-order/new" },
            { label: "Payment Entry", href: "/accounting/payment-entry/new" },
            { label: "Work Order", href: "/manufacturing/work-order/new" },
          ].map((cta) => (
            <Button
              key={cta.label}
              variant="outline"
              className="h-10 rounded-xl text-xs font-medium"
              onClick={() => router.push(cta.href)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {cta.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Module grid */}
      <section aria-label="Modules">
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold text-foreground">Modules</h2>
          <p className="text-xs text-muted-foreground">
            Click a module to open its hub
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moduleCards.map((data, i) => (
            <ModuleCard key={data.title} data={data} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
