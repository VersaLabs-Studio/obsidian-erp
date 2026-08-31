"use client";

// app/accounting/reports/inventory/page.tsx
// 2T §4 — Inventory Report: stock levels, low-stock alerts, reorder signals.
// Shows items with actual_qty below reorder_level as actionable callouts.

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportFilterBar, computeDateRange } from "@/components/reports/ReportFilterBar";
import type { Item } from "@/types/doctype-types";

interface BinDoc {
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty: number;
  projected_qty: number;
}

interface InventoryItem {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  actual_qty: number;
  reorder_level: number;
  warehouse: string;
  is_low: boolean;
}

export default function InventoryReportPage() {
  const router = useRouter();

  // Fetch all items with stock info
  const { data: items, isLoading: loadingItems } = useFrappeList<Item>(
    "Item",
    {
      fields: ["item_code", "item_name", "item_group", "stock_uom", "reorder_levels"],
      filters: [["disabled", "=", 0]] as [string, string, unknown][],
      limit: 500,
    },
  );

  // Fetch bin levels (actual stock per warehouse)
  const { data: bins, isLoading: loadingBins } = useFrappeList<BinDoc>(
    "Bin",
    {
      fields: ["item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"],
      filters: [["actual_qty", ">", 0]] as [string, string, unknown][],
      limit: 1000,
    },
  );

  const isLoading = loadingItems || loadingBins;

  const inventoryData = useMemo<InventoryItem[]>(() => {
    const itemList = items ?? [];
    const binList = bins ?? [];

    // Aggregate bins per item
    const stockByItem = new Map<string, number>();
    for (const bin of binList) {
      const current = stockByItem.get(bin.item_code) || 0;
      stockByItem.set(bin.item_code, current + (bin.actual_qty || 0));
    }

    return itemList.map((item) => {
      // Extract reorder level from the reorder_levels array (warehouse-specific)
      const reorderLevels = (item.reorder_levels ?? []) as Array<{ warehouse: string; reorder_level: number }>;
      const reorderLevel = reorderLevels.length > 0 ? reorderLevels[0].reorder_level || 0 : 0;
      const actualQty = stockByItem.get(item.item_code) || 0;
      return {
        item_code: item.item_code,
        item_name: item.item_name || item.item_code,
        item_group: item.item_group || "—",
        stock_uom: item.stock_uom || "Nos",
        actual_qty: actualQty,
        reorder_level: reorderLevel,
        warehouse: "All Warehouses",
        is_low: reorderLevel > 0 && actualQty < reorderLevel,
      };
    });
  }, [items, bins]);

  const lowStockItems = useMemo(
    () => inventoryData.filter((i) => i.is_low),
    [inventoryData],
  );

  const totalStockValue = useMemo(
    () => inventoryData.reduce((sum, i) => sum + i.actual_qty, 0),
    [inventoryData],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Inventory Report"
        subtitle={`${inventoryData.length} items tracked`}
        backHref="/accounting/reports"
      />

      {/* Actionable Callout: Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} below reorder level
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                These items need restocking.{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => router.push("/stock/material-request/new?type=Purchase")}
                >
                  Create Material Request <ArrowRight className="inline h-3 w-3 ml-1" />
                </Button>
              </p>
            </div>
            <Badge variant="destructive" className="shrink-0">
              {lowStockItems.length}
            </Badge>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="Total Items">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {inventoryData.length}
          </div>
        </InfoCard>
        <InfoCard title="Total Stock (Units)">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {totalStockValue.toLocaleString()}
          </div>
        </InfoCard>
        <InfoCard title="Low Stock Items">
          <div className="text-2xl font-bold tabular-nums text-amber-500">
            {lowStockItems.length}
          </div>
        </InfoCard>
        <InfoCard title="In Stock">
          <div className="text-2xl font-bold tabular-nums text-emerald-500">
            {inventoryData.filter((i) => i.actual_qty > 0 && !i.is_low).length}
          </div>
        </InfoCard>
      </div>

      {/* Low Stock Items Table */}
      {lowStockItems.length > 0 && (
        <InfoCard
          title="Low Stock Items"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
        >
          <div className="overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-secondary/20">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Group</th>
                  <th className="px-3 py-2.5 text-right font-semibold">In Stock</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Reorder Level</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Deficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {lowStockItems.map((item) => (
                  <tr key={item.item_code} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{item.item_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{item.item_code}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.item_group}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-amber-500">
                      {item.actual_qty} {item.stock_uom}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {item.reorder_level} {item.stock_uom}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-destructive">
                      {item.reorder_level - item.actual_qty} {item.stock_uom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InfoCard>
      )}

      {/* Full Inventory Table */}
      <InfoCard title="All Items" icon={<Package className="h-5 w-5 text-primary" />}>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-secondary/20">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                <th className="px-3 py-2.5 text-left font-semibold">Group</th>
                <th className="px-3 py-2.5 text-right font-semibold">In Stock</th>
                <th className="px-3 py-2.5 text-right font-semibold">Reorder Level</th>
                <th className="px-3 py-2.5 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {inventoryData.slice(0, 100).map((item) => (
                <tr key={item.item_code} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{item.item_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{item.item_code}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.item_group}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                    {item.actual_qty} {item.stock_uom}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {item.reorder_level > 0 ? `${item.reorder_level} ${item.stock_uom}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge
                      variant={item.is_low ? "destructive" : item.actual_qty > 0 ? "default" : "secondary"}
                      className="text-[10px] uppercase font-black tracking-tighter"
                    >
                      {item.is_low ? "Low Stock" : item.actual_qty > 0 ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
    </div>
  );
}
