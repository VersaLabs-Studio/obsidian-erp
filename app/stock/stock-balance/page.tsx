"use client";

// app/stock/stock-balance/page.tsx
// Obsidian ERP v4.0 — Stock Health (2P Part 2.7).
//
// Upgrade over the prior read-only Bin table: a status pill per row
// (In stock / Low / Out) computed from the Item Reorder child table,
// a one-click "Reorder" action for low rows (pre-fills a Material
// Request draft), and a "Stock count" action that opens the
// StockCountModal (which writes a Stock Reconciliation under the
// hood — the operator never types the word "Reconciliation").

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Scale,
  Package,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  ClipboardList,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
} from "@/components/smart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { KPICard } from "@/components/dashboard/KPICard";
import { cn } from "@/lib/utils";
import { computeStockKPIs } from "@/lib/kpi/compute-stock-kpis";
import { StockCountModal } from "@/components/stock/StockCountModal";

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

interface ReorderRow {
  name: string;
  parent?: string;
  warehouse?: string;
  warehouse_reorder_level?: number;
  warehouse_reorder_qty?: number;
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

type StockStatus = "in-stock" | "low" | "out";

export default function StockBalancePage() {
  const router = useRouter();
  const [itemFilter, setItemFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [openCount, setOpenCount] = useState(false);

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

  // 2P Part 2.7 — pull the Item Reorder child table so we can compute
  // a per-row status pill (In stock / Low / Out). Without a reorder
  // row we just show the absolute qty.
  const { data: reorderRows = [] } = useFrappeList<ReorderRow>("Item Reorder", {
    fields: ["name", "parent", "warehouse", "warehouse_reorder_level", "warehouse_reorder_qty"],
    limit: 500,
  });

  // Index reorder rows by (parent, warehouse) → { level, qty }.
  const reorderIndex = useMemo(() => {
    const out = new Map<string, { level: number; qty: number }>();
    for (const r of reorderRows) {
      if (!r.parent || !r.warehouse) continue;
      out.set(`${r.parent}::${r.warehouse}`, {
        level: Number(r.warehouse_reorder_level) || 0,
        qty: Number(r.warehouse_reorder_qty) || 0,
      });
    }
    return out;
  }, [reorderRows]);

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

  // 2P Part 2.7 — low-stock count (Item has a reorder row AND its
  // current on-hand < reorder level).
  const lowCount = useMemo(() => {
    let count = 0;
    for (const b of sortedBins) {
      const r = reorderIndex.get(`${b.item_code}::${b.warehouse}`);
      if (r && (Number(b.actual_qty) || 0) < r.level) count += 1;
    }
    return count;
  }, [sortedBins, reorderIndex]);

  function statusForBin(bin: Bin): StockStatus {
    const onHand = Number(bin.actual_qty) || 0;
    if (onHand <= 0) return "out";
    const r = reorderIndex.get(`${bin.item_code}::${bin.warehouse}`);
    if (r && onHand < r.level) return "low";
    return "in-stock";
  }

  function handleReorder(bin: Bin) {
    const r = reorderIndex.get(`${bin.item_code}::${bin.warehouse}`);
    const qty = r?.qty ?? 1;
    // 2P Part 2.7 — prefill the MR with the item + reorder qty.
    router.push(
      `/stock/material-request/new?item_code=${encodeURIComponent(bin.item_code)}&qty=${qty}&warehouse=${encodeURIComponent(bin.warehouse)}`,
    );
  }

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
        title="Stock Health"
        subtitle={`${sortedBins.length} bin${sortedBins.length !== 1 ? "s" : ""} · see what's on hand, what's running low, and reorder in one click`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setOpenCount(true)}
              data-testid="open-stock-count"
            >
              <ClipboardList className="mr-1.5 h-4 w-4" /> Stock count
            </Button>
            <Button
              className="rounded-full"
              onClick={() =>
                router.push(
                  "/stock/material-request/new?material_request_type=Purchase",
                )
              }
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Material Request
            </Button>
          </div>
        }
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
          title="Low / Out"
          value={lowCount}
          icon={AlertTriangle}
          variant={lowCount > 0 ? "danger" : "success"}
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
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    On Hand
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Reorder Level
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Available
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Value
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBins.map((bin) => {
                  const available = bin.actual_qty - (bin.reserved_qty ?? 0);
                  const value = bin.actual_qty * (bin.valuation_rate ?? 0);
                  const status = statusForBin(bin);
                  const r = reorderIndex.get(`${bin.item_code}::${bin.warehouse}`);
                  return (
                    <tr
                      key={bin.name}
                      className={cn(
                        "border-b border-border/30 last:border-b-0 transition-colors hover:bg-secondary/30",
                        status === "out" && "bg-destructive/5",
                        status === "low" && "bg-warning/5",
                      )}
                      data-testid={`stock-row-${bin.item_code}`}
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
                      <td className="px-4 py-3">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                        {formatNumber(bin.actual_qty)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {r ? formatNumber(r.level) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                        {formatNumber(available)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(value)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status === "out" || status === "low" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => handleReorder(bin)}
                            data-testid={`reorder-${bin.item_code}`}
                          >
                            <ShoppingCart className="mr-1.5 h-3 w-3" /> Reorder
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StockCountModal open={openCount} onOpenChange={setOpenCount} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusPill — small badge showing stock status (In stock / Low / Out).
// ---------------------------------------------------------------------------
function StatusPill({ status }: { status: StockStatus }) {
  const map: Record<StockStatus, { label: string; cls: string; icon: LucideIcon }> = {
    "in-stock": {
      label: "In stock",
      cls: "bg-success/15 text-success border-success/30",
      icon: CheckCircle2,
    },
    low: {
      label: "Low",
      cls: "bg-warning/15 text-warning border-warning/30",
      icon: AlertTriangle,
    },
    out: {
      label: "Out",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
      icon: AlertTriangle,
    },
  };
  const entry = map[status];
  const Icon = entry.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        entry.cls,
      )}
    >
      <Icon className="mr-1 inline h-3 w-3" /> {entry.label}
    </Badge>
  );
}
