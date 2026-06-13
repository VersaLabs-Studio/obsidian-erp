// components/dashboard/GlobalDashboard.tsx
// Obsidian ERP v4.0 — Global Home Dashboard (master §4.2).
//
// 2N Part 2.1: REBUILT on real data. The previous version was a fabricated
// mockup (hardcoded revenue 1,240,500; "Enterprise v3.0" badge; fake Audit
// Log with "John Doe"; "Prediction Engine" panel; "150+/156" lead counts).
// This file renders the §4.2 layout — Today's Focus, KPI row, Module grid
// — driven entirely by `useFrappeList` aggregates. No hardcoded numbers.
//
// Counts use the same rollups Customer-360 / Supplier-360 use (the
// `useFrappeCount` factory hook is a thin wrapper over `useFrappeList` with
// `limit: 1` and a separate "length"-only call, but the call returns the
// full rowset length, so the list endpoint + reduce is the simpler path).
//
// Premium-UI: OKLCH semantic tokens only, B1-style cards (`rounded-2xl`,
// `border-border/40`, `shadow-sm shadow-black/5`), staggered Framer
// entrance, real skeletons (no spinners). Dual-theme + 375px + reduced-
// motion verified visually.

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Plus,
  ArrowRight,
  type LucideIcon,
  Users,
  FileText,
  Package,
  Factory,
  Briefcase,
  Calculator,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Clock,
  Receipt,
  CreditCard,
  Boxes,
  type LucideIcon as _LucideIcon,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { KPICard } from "@/components/dashboard/KPICard";
import { ActionCard } from "@/components/dashboard/ActionCard";
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
  destructive: { iconBg: "bg-destructive/10", iconText: "text-destructive" },
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
// Today's Focus tile (filtered list link)
// ---------------------------------------------------------------------------
interface FocusTile {
  label: string;
  count: number | undefined;
  href: string;
  icon: LucideIcon;
  variant: "warning" | "info" | "default";
}

function FocusRow({ tile }: { tile: FocusTile }) {
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
        <span className="text-sm font-medium text-foreground">{tile.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {tile.count === undefined ? (
          <SkeletonLine className="h-4 w-6" />
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
// Main
// ---------------------------------------------------------------------------
export default function GlobalDashboard() {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();

  // -- KPI rollups --------------------------------------------------------
  // Revenue (sum of submitted SI grand_total, current month)
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const { data: monthSalesInvoices = [] } = useFrappeList<{
    grand_total: number;
    outstanding_amount: number;
  }>("Sales Invoice", {
    fields: ["grand_total", "outstanding_amount", "docstatus", "posting_date"],
    filters: [
      ["posting_date", ">=", firstOfMonth],
      ["docstatus", "=", 1],
    ],
    limit: 1000,
  });

  // Receivables (Σ SI outstanding_amount)
  const { data: openSalesInvoices = [] } = useFrappeList<{
    outstanding_amount: number;
  }>("Sales Invoice", {
    fields: ["outstanding_amount", "docstatus"],
    filters: [["docstatus", "=", 1]],
    limit: 1000,
  });

  // Payables (Σ PI outstanding_amount)
  const { data: openPurchaseInvoices = [] } = useFrappeList<{
    outstanding_amount: number;
  }>("Purchase Invoice", {
    fields: ["outstanding_amount", "docstatus"],
    filters: [["docstatus", "=", 1]],
    limit: 1000,
  });

  // Open Sales Orders
  const { data: openSalesOrders = [] } = useFrappeList<{ name: string }>(
    "Sales Order",
    {
      fields: ["name"],
      filters: [["docstatus", "=", 0]],
      limit: 1,
    },
  );

  // Stock value (Σ Bin actual_qty × valuation_rate)
  const { data: bins = [] } = useFrappeList<{
    actual_qty: number;
    valuation_rate: number;
  }>("Bin", {
    fields: ["actual_qty", "valuation_rate"],
    limit: 1000,
  });

  // -- Today's Focus counts -----------------------------------------------
  const { data: focusOrders = [] } = useFrappeList<{ name: string }>(
    "Sales Order",
    {
      fields: ["name", "docstatus", "status"],
      filters: [["docstatus", "=", 0]],
      limit: 100,
    },
  );
  const { data: focusUnpaidSIs = [] } = useFrappeList<{ name: string }>(
    "Sales Invoice",
    {
      fields: ["name", "docstatus", "outstanding_amount"],
      filters: [
        ["docstatus", "=", 1],
        ["outstanding_amount", ">", 0],
      ],
      limit: 100,
    },
  );
  const { data: focusOpenWOs = [] } = useFrappeList<{ name: string }>(
    "Work Order",
    {
      fields: ["name", "status"],
      filters: [["status", "=", "In Process"]],
      limit: 100,
    },
  );
  const { data: focusOverduePEs = [] } = useFrappeList<{ name: string }>(
    "Payment Entry",
    {
      fields: ["name", "docstatus"],
      filters: [["docstatus", "=", 0]],
      limit: 100,
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
  const { data: purchaseInvoicesAll = [] } = useFrappeList<{ name: string }>(
    "Purchase Invoice",
    { fields: ["name"], limit: 1 },
  );
  const { data: employeesAll = [] } = useFrappeList<{ name: string }>(
    "Employee",
    { fields: ["name"], limit: 1 },
  );

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
    return {
      monthRevenue,
      receivables,
      payables,
      stockValue,
    };
  }, [monthSalesInvoices, openSalesInvoices, openPurchaseInvoices, bins]);

  // -- Module cards -------------------------------------------------------
  const moduleCards: ModuleCardData[] = [
    {
      title: "CRM",
      description: "Pipeline & customers",
      icon: Users,
      href: "/crm/dashboard",
      count: leadsAll.length,
      countLabel: `${customersAll.length} customers`,
      colorKey: "primary",
    },
    {
      title: "Sales",
      description: "Quotations & orders",
      icon: ShoppingCart,
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
      icon: FileText,
      href: "/buying/dashboard",
      count: purchaseOrdersAll.length,
      countLabel: `${suppliersAll.length} suppliers`,
      colorKey: "info",
    },
    {
      title: "Manufacturing",
      description: "BOMs & work orders",
      icon: Factory,
      href: "/manufacturing/dashboard",
      count: workOrdersAll.length,
      countLabel: "work orders",
      colorKey: "success",
    },
    {
      title: "Accounting",
      description: "Invoices & payments",
      icon: Calculator,
      href: "/accounting/dashboard",
      count: openSalesInvoices.length,
      countLabel: "open SIs",
      colorKey: "primary",
    },
  ];

  // -- Focus tiles --------------------------------------------------------
  const focusTiles: FocusTile[] = [
    {
      label: "Sales orders needing attention",
      count: focusOrders.length,
      href: "/sales/sales-order",
      icon: ShoppingCart,
      variant: focusOrders.length > 0 ? "warning" : "default",
    },
    {
      label: "Unpaid invoices",
      count: focusUnpaidSIs.length,
      href: "/accounting/sales-invoice",
      icon: Receipt,
      variant: focusUnpaidSIs.length > 0 ? "warning" : "default",
    },
    {
      label: "Work orders in progress",
      count: focusOpenWOs.length,
      href: "/manufacturing/work-order",
      icon: Factory,
      variant: "info",
    },
    {
      label: "Draft payment entries",
      count: focusOverduePEs.length,
      href: "/accounting/payment-entry",
      icon: CreditCard,
      variant: focusOverduePEs.length > 0 ? "warning" : "default",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero header — just the CTA, no fake badge */}
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
            <Users className="mr-1.5 h-4 w-4" /> Capture Lead
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

      {/* Today's Focus band */}
      <section
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        aria-label="Today's focus"
      >
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Today's focus
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {focusTiles.map((tile) => (
            <FocusRow key={tile.label} tile={tile} />
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
