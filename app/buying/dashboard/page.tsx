// app/buying/dashboard/page.tsx
// Obsidian ERP v4.0 — Buying Hub (master §4.1, 2N Part 2.2,
// 2P-FINAL Part B).
//
// 2P-FINAL Part B — ONE SHELL, SIX CONFIGS. The hub renders through
// `DashboardShell` (via the `ModuleHub` compat shim) and passes a
// grouped BarChart (ordered vs received by top 5 suppliers) as the
// `children` chart slot. The legacy `actions` quick-action grid is
// preserved for the 2N ship look.

"use client";

import { useMemo } from "react";
import {
  ShoppingCart,
  Building2,
  ClipboardList,
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

interface SupplierOrdered {
  supplier: string;
  supplier_name?: string;
  /** Sum of grand_total (ordered). */
  ordered: number;
  /** Sum of grand_total of submitted Purchase Receipts (received). */
  received: number;
}

export default function BuyingDashboardPage() {
  // KPIs
  const { data: suppliers = [] } = useFrappeList<{ name: string }>(
    "Supplier",
    { fields: ["name"], limit: 1 },
  );
  const { data: openPOs = [] } = useFrappeList<{ name: string }>(
    "Purchase Order",
    {
      fields: ["name"],
      filters: [["docstatus", "=", 0]],
      limit: 1,
    },
  );
  const { data: submittedPOs = [] } = useFrappeList<{ name: string }>(
    "Purchase Order",
    {
      fields: ["name"],
      filters: [["docstatus", "=", 1]],
      limit: 1,
    },
  );
  const { data: draftPIs = [] } = useFrappeList<{ name: string }>(
    "Purchase Invoice",
    {
      fields: ["name"],
      filters: [["docstatus", "=", 0]],
      limit: 1,
    },
  );

  // Recent
  const { data: recentPOs = [] } = useFrappeList<{
    name: string;
    supplier_name?: string;
    grand_total?: number;
    status: string;
    creation: string;
  }>("Purchase Order", {
    fields: ["name", "supplier_name", "grand_total", "status", "creation"],
    orderBy: { field: "creation", order: "desc" },
    limit: 5,
  });

  // 2P-FINAL Part B — top 5 suppliers by PO value, ordered vs received.
  // "Ordered" = Σ grand_total of submitted POs. "Received" = Σ
  // grand_total of submitted Purchase Receipts against the same
  // supplier (POs flow into PRs; we read PRs to measure receipt
  // completion, not the same PO grand_total).
  const { data: allSubmittedPOs = [] } = useFrappeList<{
    name: string;
    supplier: string;
    supplier_name?: string;
    grand_total: number;
  }>("Purchase Order", {
    fields: ["name", "supplier", "supplier_name", "grand_total"],
    filters: [["docstatus", "=", 1]],
    limit: 500,
  });
  const { data: allReceipts = [] } = useFrappeList<{
    name: string;
    supplier: string;
    grand_total: number;
  }>("Purchase Receipt", {
    fields: ["name", "supplier", "grand_total"],
    filters: [["docstatus", "=", 1]],
    limit: 500,
  });
  const supplierChart = useMemo<SupplierOrdered[]>(() => {
    type Agg = { supplier: string; supplier_name?: string; ordered: number; received: number };
    const map = new Map<string, Agg>();
    for (const po of allSubmittedPOs) {
      const k = po.supplier || "(unspecified)";
      const cur = map.get(k) ?? {
        supplier: k,
        supplier_name: po.supplier_name,
        ordered: 0,
        received: 0,
      };
      cur.ordered += Number(po.grand_total) || 0;
      if (po.supplier_name) cur.supplier_name = po.supplier_name;
      map.set(k, cur);
    }
    for (const pr of allReceipts) {
      const k = pr.supplier || "(unspecified)";
      const cur = map.get(k) ?? {
        supplier: k,
        ordered: 0,
        received: 0,
      };
      cur.received += Number(pr.grand_total) || 0;
      map.set(k, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.ordered - a.ordered)
      .slice(0, 5);
  }, [allSubmittedPOs, allReceipts]);

  const kpis: HubKpi[] = [
    {
      title: "Suppliers",
      value: suppliers.length,
      icon: Building2,
      variant: "default",
      href: "/buying/supplier",
    },
    {
      title: "Open POs",
      value: openPOs.length,
      icon: ClipboardList,
      variant: "warning",
      href: "/buying/purchase-order",
    },
    {
      title: "Submitted POs",
      value: submittedPOs.length,
      icon: ShoppingCart,
      variant: "success",
      href: "/buying/purchase-order",
    },
    {
      title: "Draft Purchase Invoices",
      value: draftPIs.length,
      icon: FileText,
      variant: "warning",
      href: "/accounting/purchase-invoice",
    },
  ];

  const actions: HubAction[] = [
    {
      label: "Suppliers",
      description: "Vendors and partners.",
      icon: Building2,
      href: "/buying/supplier",
    },
    {
      label: "Purchase Orders",
      description: "Confirmed orders to suppliers.",
      icon: ClipboardList,
      href: "/buying/purchase-order",
    },
    {
      label: "Purchase Invoices",
      description: "Supplier bills.",
      icon: FileText,
      href: "/accounting/purchase-invoice",
    },
    {
      label: "New PO",
      description: "Create a purchase order.",
      icon: Plus,
      href: "/buying/purchase-order/new",
      primary: true,
    },
  ];

  const recent: HubRecentItem[] = recentPOs.slice(0, 5).map((po) => ({
    name: po.name,
    subtitle: po.supplier_name ?? "",
    badge: po.status,
    badgeVariant:
      po.status === "Draft"
        ? ("secondary" as const)
        : ("default" as const),
    href: `/buying/purchase-order/${encodeURIComponent(po.name)}`,
  }));

  const alerts: HubAlert[] = [
    {
      label: "Draft POs",
      count: openPOs.length,
      href: "/buying/purchase-order",
      variant: "warning",
    },
    {
      label: "Draft Purchase Invoices",
      count: draftPIs.length,
      href: "/accounting/purchase-invoice",
      variant: "warning",
    },
  ];

  return (
    <ModuleHub
      title="Buying Hub"
      subtitle="Suppliers, POs, and procurement."
      icon={ShoppingCart}
      primaryAction={{ label: "New PO", href: "/buying/purchase-order/new" }}
      kpis={kpis}
      actions={actions}
      recent={recent}
      recentTitle="Recent purchase orders"
      alerts={alerts}
    >
      {/* 2P-FINAL Part B — top 5 suppliers: ordered vs received.
          Grouped BarChart. OKLCH primary + info. */}
      <div
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        data-testid="buying-supplier-chart"
        aria-label="Top 5 suppliers · ordered vs received"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Top 5 suppliers · ordered vs received
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Σ PO grand_total
          </span>
        </div>
        {supplierChart.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            No submitted POs yet.
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={supplierChart.map((s) => ({
                  name: s.supplier_name || s.supplier,
                  ordered: s.ordered,
                  received: s.received,
                }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="name"
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
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="ordered" name="Ordered" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Received" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ModuleHub>
  );
}
