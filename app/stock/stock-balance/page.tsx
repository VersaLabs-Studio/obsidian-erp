"use client";

// app/stock/stock-balance/page.tsx
// Obsidian ERP v4.0 — Stock Balance Read-Only Page

import { useState, useMemo } from "react";
import { Scale, Package, Warehouse, AlertTriangle } from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
} from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { KPICard } from "@/components/dashboard/KPICard";
import { cn } from "@/lib/utils";
import { computeStockKPIs } from "@/lib/kpi/compute-stock-kpis";

interface Bin {
  name: string;
  item_code: string;
  item_name?: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty?: number;
  valuation_rate?: number;
  projected_qty?: number;
  stock_value?: number;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function StockBalancePage() {
  const [itemFilter, setItemFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");

  const filters = useMemo<
    [string, string, unknown][] | undefined
  >(() => {
    const f: [string, string, unknown][] = [];
    if (itemFilter) f.push(["item_code", "=", itemFilter]);
    if (warehouseFilter) f.push(["warehouse", "=", warehouseFilter]);
    return f.length > 0 ? f : undefined;
  }, [itemFilter, warehouseFilter]);

  const {
    data: bins,
    isLoading,
    error,
  } = useFrappeList<Bin>("Bin", {
    fields: [
      "name",
      "item_code",
      "item_name",
      "warehouse",
      "actual_qty",
      "reserved_qty",
      "valuation_rate",
      "projected_qty",
      "stock_value",
    ],
    orderBy: { field: "item_code", order: "asc" },
    filters,
    limit: 500,
  });

  const sortedBins = useMemo(() => {
    if (!bins) return [];
    return [...bins].sort((a, b) => {
      const itemCmp = a.item_code.localeCompare(b.item_code);
      if (itemCmp !== 0) return itemCmp;
      return a.warehouse.localeCompare(b.warehouse);
    });
  }, [bins]);

  const kpis = useMemo(
    () => computeStockKPIs(sortedBins),
    [sortedBins]
  );

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load stock balance
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Balance"
        subtitle={`${sortedBins.length} bin${sortedBins.length !== 1 ? "s" : ""}`}
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total SKUs"
          value={kpis.totalSKUs}
          icon={Package}
          isLoading={isLoading}
        />
        <KPICard
          title="Total Stock Value"
          value={formatCurrency(kpis.totalValue)}
          icon={Scale}
          isLoading={isLoading}
        />
        <KPICard
          title="Warehouses"
          value={kpis.warehouses}
          icon={Warehouse}
          isLoading={isLoading}
        />
        <KPICard
          title="Out of Stock"
          value={kpis.outOfStock}
          icon={AlertTriangle}
          variant={kpis.outOfStock > 0 ? "danger" : "success"}
          isLoading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="bg-card shadow-sm rounded-2xl p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1.5 block">
              Item
            </label>
            <FrappeSelect
              doctype="Item"
              value={itemFilter}
              onChange={(val) => setItemFilter(val)}
              placeholder="All items"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1.5 block">
              Warehouse
            </label>
            <FrappeSelect
              doctype="Warehouse"
              value={warehouseFilter}
              onChange={(val) => setWarehouseFilter(val)}
              placeholder="All warehouses"
              filters={[["is_group", "=", 0]]}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState rows={8} variant="table" />
      ) : sortedBins.length === 0 ? (
        <EmptyState
          title="No stock balance data"
          description="Bins will appear here once inventory is recorded"
          variant="no-data"
        />
      ) : (
        <div className="bg-card shadow-sm rounded-2xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Item
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Warehouse
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    On Hand
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Reserved
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Available
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Valuation Rate
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBins.map((bin) => {
                  const available = bin.actual_qty - (bin.reserved_qty ?? 0);
                  const value = bin.actual_qty * (bin.valuation_rate ?? 0);
                  const isZeroOrNegative = bin.actual_qty <= 0;

                  return (
                    <tr
                      key={bin.name}
                      className={cn(
                        "border-b border-border/30 last:border-b-0 transition-colors hover:bg-secondary/30",
                        isZeroOrNegative && "bg-destructive/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {bin.item_code}
                        </div>
                        {bin.item_name && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {bin.item_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {bin.warehouse}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {isZeroOrNegative ? (
                          <StatusBadge
                            status={bin.actual_qty < 0 ? "out of stock" : "low stock"}
                            size="sm"
                          />
                        ) : (
                          <span className="font-medium text-foreground">
                            {formatNumber(bin.actual_qty)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {bin.reserved_qty ? formatNumber(bin.reserved_qty) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                        {formatNumber(available)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {bin.valuation_rate
                          ? formatNumber(bin.valuation_rate)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                        {formatCurrency(value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
