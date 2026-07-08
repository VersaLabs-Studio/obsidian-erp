"use client";

// app/reports/procurement-spend/page.tsx
// Obsidian ERP v4.0 — Phase 2Y Part 7: Procurement Spend Report.

import { useMemo } from "react";
import { Truck, ShoppingBag, Scale, Crown } from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { ReportScaffold } from "@/components/reports/ReportScaffold";
import { StatusBadge } from "@/components/smart/status-badge";
import { LoadingState, EmptyState } from "@/components/smart";

interface PurchaseOrder {
  name: string;
  supplier: string;
  supplier_name?: string;
  grand_total: number;
  status: string;
}

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface SupplierRow {
  supplier: string;
  supplier_name: string;
  poCount: number;
  totalValue: number;
  avgValue: number;
  latestStatus: string;
}

export default function ProcurementSpendReportPage() {
  const { data: orders, isLoading } = useFrappeList<PurchaseOrder>("Purchase Order", {
    fields: ["name", "supplier", "supplier_name", "grand_total", "status"],
    orderBy: { field: "creation", order: "desc" },
    limit: 500,
  });

  const supplierRows = useMemo<SupplierRow[]>(() => {
    const map = new Map<string, SupplierRow>();
    for (const o of orders ?? []) {
      const key = o.supplier;
      const existing = map.get(key);
      if (existing) {
        existing.poCount++;
        existing.totalValue += Number(o.grand_total || 0);
        existing.latestStatus = o.status;
      } else {
        map.set(key, {
          supplier: o.supplier,
          supplier_name: o.supplier_name || o.supplier,
          poCount: 1,
          totalValue: Number(o.grand_total || 0),
          avgValue: 0,
          latestStatus: o.status,
        });
      }
    }
    const rows = Array.from(map.values());
    for (const r of rows) {
      r.avgValue = r.poCount > 0 ? r.totalValue / r.poCount : 0;
    }
    return rows.sort((a, b) => b.totalValue - a.totalValue);
  }, [orders]);

  const totalSpend = useMemo(() => supplierRows.reduce((s, r) => s + r.totalValue, 0), [supplierRows]);
  const totalPOs = useMemo(() => supplierRows.reduce((s, r) => s + r.poCount, 0), [supplierRows]);
  const avgPO = totalPOs > 0 ? totalSpend / totalPOs : 0;
  const topSupplier = supplierRows.length > 0 ? supplierRows[0].supplier_name : "—";

  return (
    <ReportScaffold
      title="Procurement Spend"
      description="Spend by supplier, purchase order volume, and average PO value"
      icon={Truck}
      isLoading={isLoading}
      kpis={[
        { title: "Total Spend", value: ETB.format(totalSpend), icon: Scale },
        { title: "POs", value: totalPOs, icon: ShoppingBag },
        { title: "Avg PO", value: ETB.format(avgPO), icon: Truck },
        { title: "Top Supplier", value: topSupplier, icon: Crown, variant: "success" as const },
      ]}
    >
      {isLoading ? (
        <LoadingState rows={6} variant="table" />
      ) : supplierRows.length === 0 ? (
        <EmptyState title="No procurement data" description="Purchase orders will appear here once created" variant="no-data" />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-secondary/20">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-right font-semibold">POs</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Spend</th>
                  <th className="px-4 py-3 text-right font-semibold">Avg Value</th>
                  <th className="px-4 py-3 text-left font-semibold">Latest Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {supplierRows.map((r) => (
                  <tr key={r.supplier} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.supplier_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.poCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{ETB.format(r.totalValue)}</td>
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
