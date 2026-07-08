"use client";

// app/reports/stock-balance/page.tsx
// Obsidian ERP v4.0 — Phase 2Y Part 7: Stock Balance & Valuation Report.

import { useState, useMemo } from "react";
import { Scale, Package, Warehouse as WarehouseIcon, AlertTriangle } from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { ReportScaffold } from "@/components/reports/ReportScaffold";
import { StatusBadge } from "@/components/smart/status-badge";
import { LoadingState, EmptyState } from "@/components/smart";
import { StockBalanceDrilldown } from "@/components/stock/StockBalanceDrilldown";
import { cn } from "@/lib/utils";

interface Bin {
  name: string;
  item_code: string;
  item_name?: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty?: number;
  valuation_rate?: number;
  stock_value?: number;
}

interface ReorderRow {
  parent?: string;
  warehouse?: string;
  warehouse_reorder_level?: number;
}

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function StockBalanceReportPage() {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownItem, setDrilldownItem] = useState<{ code: string; name?: string } | null>(null);

  const { data: bins, isLoading } = useFrappeList<Bin>("Bin", {
    fields: ["name", "item_code", "item_name", "warehouse", "actual_qty", "reserved_qty", "valuation_rate", "stock_value"],
    orderBy: { field: "item_code", order: "asc" },
    limit: 500,
  });

  const { data: reorderRows = [] } = useFrappeList<ReorderRow>("Item Reorder", {
    fields: ["parent", "warehouse", "warehouse_reorder_level"],
    limit: 500,
  });

  const reorderIndex = useMemo(() => {
    const out = new Map<string, number>();
    for (const r of reorderRows) {
      if (r.parent && r.warehouse) {
        out.set(`${r.parent}::${r.warehouse}`, Number(r.warehouse_reorder_level) || 0);
      }
    }
    return out;
  }, [reorderRows]);

  const totalSKUs = useMemo(() => new Set((bins ?? []).map((b) => b.item_code)).size, [bins]);
  const totalValue = useMemo(() => (bins ?? []).reduce((s, b) => s + Number(b.stock_value || 0), 0), [bins]);
  const warehouseCount = useMemo(() => new Set((bins ?? []).map((b) => b.warehouse)).size, [bins]);
  const lowOut = useMemo(() => {
    let c = 0;
    for (const b of bins ?? []) {
      const onHand = Number(b.actual_qty) || 0;
      if (onHand <= 0) { c++; continue; }
      const level = reorderIndex.get(`${b.item_code}::${b.warehouse}`);
      if (level && onHand < level) c++;
    }
    return c;
  }, [bins, reorderIndex]);

  return (
    <ReportScaffold
      title="Stock Balance & Valuation"
      description="Real-time inventory position with valuation across all warehouses"
      icon={Scale}
      isLoading={isLoading}
      kpis={[
        { title: "Total SKUs", value: totalSKUs, icon: Package },
        { title: "Total Value", value: ETB.format(totalValue), icon: Scale },
        { title: "Warehouses", value: warehouseCount, icon: WarehouseIcon },
        { title: "Low / Out", value: lowOut, icon: AlertTriangle, variant: lowOut > 0 ? "danger" as const : "success" as const },
      ]}
    >
      {isLoading ? (
        <LoadingState rows={8} variant="table" />
      ) : !bins || bins.length === 0 ? (
        <EmptyState title="No stock data" description="Bins will appear once inventory is recorded" variant="no-data" />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-secondary/20">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Item</th>
                  <th className="px-4 py-3 text-left font-semibold">Warehouse</th>
                  <th className="px-4 py-3 text-right font-semibold">On Hand</th>
                  <th className="px-4 py-3 text-right font-semibold">Val. Rate</th>
                  <th className="px-4 py-3 text-right font-semibold">Value</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {bins.map((b) => {
                  const onHand = Number(b.actual_qty) || 0;
                  const level = reorderIndex.get(`${b.item_code}::${b.warehouse}`);
                  const isLow = level && onHand > 0 && onHand < level;
                  const isOut = onHand <= 0;
                  return (
                    <tr
                      key={b.name}
                      className={cn(
                        "cursor-pointer hover:bg-secondary/20 transition-colors",
                        isOut && "bg-destructive/5",
                        isLow && "bg-amber-500/5",
                      )}
                      onClick={() => { setDrilldownItem({ code: b.item_code, name: b.item_name }); setDrilldownOpen(true); }}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{b.item_code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.warehouse}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{onHand}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{ETB.format(Number(b.valuation_rate || 0))}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{ETB.format(Number(b.stock_value || 0))}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <StockBalanceDrilldown open={drilldownOpen} onOpenChange={setDrilldownOpen} itemCode={drilldownItem?.code ?? ""} itemName={drilldownItem?.name} />
    </ReportScaffold>
  );
}
