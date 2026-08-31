"use client";

// app/reports/sales-performance/page.tsx
// Obsidian ERP v4.0 — Phase 2Y Part 7: Sales Performance Report.

import { useMemo } from "react";
import { TrendingUp, ShoppingBag, Scale, Crown } from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { ReportScaffold } from "@/components/reports/ReportScaffold";
import { StatusBadge } from "@/components/smart/status-badge";
import { LoadingState, EmptyState } from "@/components/smart";
import { cn } from "@/lib/utils";

interface SalesOrder {
  name: string;
  customer: string;
  customer_name?: string;
  grand_total: number;
  status: string;
}

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface CustomerRow {
  customer: string;
  customer_name: string;
  orderCount: number;
  totalRevenue: number;
  avgValue: number;
  latestStatus: string;
}

export default function SalesPerformanceReportPage() {
  const { data: orders, isLoading } = useFrappeList<SalesOrder>("Sales Order", {
    fields: ["name", "customer", "customer_name", "grand_total", "status"],
    orderBy: { field: "creation", order: "desc" },
    limit: 500,
  });

  const customerRows = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>();
    for (const o of orders ?? []) {
      const key = o.customer;
      const existing = map.get(key);
      if (existing) {
        existing.orderCount++;
        existing.totalRevenue += Number(o.grand_total || 0);
        existing.latestStatus = o.status;
      } else {
        map.set(key, {
          customer: o.customer,
          customer_name: o.customer_name || o.customer,
          orderCount: 1,
          totalRevenue: Number(o.grand_total || 0),
          avgValue: 0,
          latestStatus: o.status,
        });
      }
    }
    const rows = Array.from(map.values());
    for (const r of rows) {
      r.avgValue = r.orderCount > 0 ? r.totalRevenue / r.orderCount : 0;
    }
    return rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [orders]);

  const totalRevenue = useMemo(() => customerRows.reduce((s, r) => s + r.totalRevenue, 0), [customerRows]);
  const totalOrders = useMemo(() => customerRows.reduce((s, r) => s + r.orderCount, 0), [customerRows]);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const topCustomer = customerRows.length > 0 ? customerRows[0].customer_name : "—";

  return (
    <ReportScaffold
      title="Sales Performance"
      description="Revenue by customer, order volume, and average order value"
      icon={TrendingUp}
      isLoading={isLoading}
      kpis={[
        { title: "Total Revenue", value: ETB.format(totalRevenue), icon: Scale },
        { title: "Orders", value: totalOrders, icon: ShoppingBag },
        { title: "Avg Order", value: ETB.format(avgOrder), icon: TrendingUp },
        { title: "Top Customer", value: topCustomer, icon: Crown, variant: "success" as const },
      ]}
    >
      {isLoading ? (
        <LoadingState rows={6} variant="table" />
      ) : customerRows.length === 0 ? (
        <EmptyState title="No sales data" description="Sales orders will appear here once created" variant="no-data" />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-secondary/20">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-right font-semibold">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg Value</th>
                  <th className="px-4 py-3 text-left font-semibold">Latest Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {customerRows.map((r) => (
                  <tr key={r.customer} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.customer_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.orderCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{ETB.format(r.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{ETB.format(r.avgValue)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.latestStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportScaffold>
  );
}
