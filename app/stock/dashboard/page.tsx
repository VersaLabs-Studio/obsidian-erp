// app/stock/dashboard/page.tsx
// Obsidian ERP v4.0 — Inventory Hub (master §4.1, 2N Part 2.2,
// 2P-FINAL Part B).
//
// 2P-FINAL Part B — ONE SHELL, SIX CONFIGS. The hub renders through
// `DashboardShell` (via the `ModuleHub` compat shim) and passes a
// horizontal bar chart of "top items by stock value" as the
// `children` chart slot. The legacy `actions` quick-action grid is
// preserved for the 2N ship look.

"use client";

import { useMemo } from "react";
import {
  Package,
  Box,
  Warehouse,
  Boxes,
  Truck,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
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

interface StockValueRow {
  item: string;
  value: number;
}

export default function StockDashboardPage() {
  const now = new Date();
  const firstOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
    .toISOString()
    .split("T")[0];

  // KPIs
  const { data: items = [] } = useFrappeList<{ name: string }>("Item", {
    fields: ["name"],
    limit: 1,
  });
  const { data: warehouses = [] } = useFrappeList<{ name: string }>(
    "Warehouse",
    { fields: ["name"], limit: 1 },
  );
  const { data: binsWithStock = [] } = useFrappeList<{ name: string }>(
    "Bin",
    {
      fields: ["name"],
      filters: [["actual_qty", ">", 0]],
      limit: 1,
    },
  );
  const { data: draftDNs = [] } = useFrappeList<{ name: string }>(
    "Delivery Note",
    { fields: ["name"], filters: [["docstatus", "=", 0]], limit: 1 },
  );

  // Recent
  const { data: recentItems = [] } = useFrappeList<{
    name: string;
    item_name: string;
    item_group?: string;
  }>("Item", {
    fields: ["name", "item_name", "item_group"],
    orderBy: { field: "creation", order: "desc" },
    limit: 5,
  });

  // Alerts
  const { data: stockEntriesToday = [] } = useFrappeList<{ name: string }>(
    "Stock Entry",
    {
      fields: ["name", "creation"],
      filters: [["creation", ">=", firstOfDay]],
      limit: 1,
    },
  );
  const { data: negativeBins = [] } = useFrappeList<{ name: string }>(
    "Bin",
    {
      fields: ["name"],
      filters: [["projected_qty", "<", 0]],
      limit: 1,
    },
  );

  // 2P-FINAL Part B — top items by stock value (Σ actual_qty *
  // valuation_rate, grouped by item). Limit 1000 covers most
  // installations; for very large catalogs the chart shows the top
  // 8 items by absolute value.
  const { data: allBins = [] } = useFrappeList<{
    item_code: string;
    actual_qty: number;
    valuation_rate: number;
  }>("Bin", {
    fields: ["item_code", "actual_qty", "valuation_rate"],
    limit: 1000,
  });
  const topByValue = useMemo<StockValueRow[]>(() => {
    const map = new Map<string, number>();
    for (const b of allBins) {
      const v = (Number(b.actual_qty) || 0) * (Number(b.valuation_rate) || 0);
      if (v <= 0) continue;
      map.set(b.item_code, (map.get(b.item_code) ?? 0) + v);
    }
    return [...map.entries()]
      .map(([item, value]) => ({ item, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [allBins]);

  const kpis: HubKpi[] = [
    {
      title: "Items",
      value: items.length,
      icon: Box,
      variant: "default",
      href: "/stock/item",
    },
    {
      title: "Warehouses",
      value: warehouses.length,
      icon: Warehouse,
      variant: "default",
      href: "/stock/warehouse",
    },
    {
      title: "Bins with stock",
      value: binsWithStock.length,
      icon: Boxes,
      variant: "success",
      href: "/stock/stock-balance",
    },
    {
      title: "Pending Delivery Notes",
      value: draftDNs.length,
      icon: Truck,
      variant: "warning",
      href: "/stock/delivery-note",
    },
  ];

  const actions: HubAction[] = [
    {
      label: "Items",
      description: "All stocked and service items.",
      icon: Box,
      href: "/stock/item",
    },
    {
      label: "Warehouses",
      description: "Storage locations.",
      icon: Warehouse,
      href: "/stock/warehouse",
    },
    {
      label: "Delivery Notes",
      description: "Outbound shipments.",
      icon: Truck,
      href: "/stock/delivery-note",
    },
    {
      label: "New Item",
      description: "Register a new SKU.",
      icon: Plus,
      href: "/stock/item/new",
      primary: true,
    },
  ];

  const recent: HubRecentItem[] = recentItems.slice(0, 5).map((i) => ({
    name: i.name,
    subtitle: i.item_name,
    badge: i.item_group,
    badgeVariant: "outline",
    href: `/stock/item/${encodeURIComponent(i.name)}`,
  }));

  const alerts: HubAlert[] = [
    {
      label: "Stock entries today",
      count: stockEntriesToday.length,
      href: "/stock/stock-entry",
      variant: "info",
    },
    {
      label: "Bins below zero (projected)",
      count: negativeBins.length,
      href: "/stock/stock-balance",
      variant: "warning",
    },
  ];

  return (
    <ModuleHub
      title="Inventory Hub"
      subtitle="Items, warehouses, and stock movements."
      icon={Package}
      primaryAction={{ label: "New Item", href: "/stock/item/new" }}
      kpis={kpis}
      actions={actions}
      recent={recent}
      recentTitle="Recent items"
      alerts={alerts}
    >
      {/* 2P-FINAL Part B — top 8 items by stock value, horizontal
          bars. OKLCH primary semantic. Empty-state when no Bins. */}
      <div
        className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
        data-testid="stock-top-value"
        aria-label="Top items by stock value"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Top items by stock value
          </h2>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Σ qty × valuation_rate
          </span>
        </div>
        {topByValue.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            No stocked items yet.
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topByValue}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : Math.abs(v) >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="item"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
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
                  dataKey="value"
                  name="Value"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ModuleHub>
  );
}
