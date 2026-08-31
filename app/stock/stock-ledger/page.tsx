"use client";

// app/stock/stock-ledger/page.tsx
// Obsidian ERP v4.0 — Stock Ledger Read-Only Page

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  Warehouse,
  Package,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
} from "@/components/smart";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { KPICard } from "@/components/dashboard/KPICard";
import { getDocTypeRoute } from "@/lib/flows/flow-chain-resolver";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

interface StockLedgerEntry {
  name: string;
  item_code: string;
  item_name?: string;
  warehouse: string;
  posting_date: string;
  posting_time?: string;
  actual_qty: number;
  qty_after_transaction: number;
  valuation_rate?: number;
  voucher_type?: string;
  voucher_no?: string;
  company?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function getMovementColor(qty: number): string {
  if (qty > 0) return "text-emerald-600 dark:text-emerald-400";
  if (qty < 0) return "text-destructive";
  return "text-muted-foreground";
}

function getMovementPrefix(qty: number): string {
  if (qty > 0) return "+";
  return "";
}

export default function StockLedgerPage() {
  const [itemFilter, setItemFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filters = useMemo<
    [string, string, unknown][] | undefined
  >(() => {
    const f: [string, string, unknown][] = [];
    if (itemFilter) f.push(["item_code", "=", itemFilter]);
    if (warehouseFilter) f.push(["warehouse", "=", warehouseFilter]);
    if (dateFrom) f.push(["posting_date", ">=", dateFrom]);
    if (dateTo) f.push(["posting_date", "<=", dateTo]);
    return f.length > 0 ? f : undefined;
  }, [itemFilter, warehouseFilter, dateFrom, dateTo]);

  const {
    data: entries,
    isLoading,
    error,
  } = useFrappeList<StockLedgerEntry>("Stock Ledger Entry", {
    fields: [
      "name",
      "item_code",
      "item_name",
      "warehouse",
      "posting_date",
      "posting_time",
      "actual_qty",
      "qty_after_transaction",
      "valuation_rate",
      "voucher_type",
      "voucher_no",
      "company",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    filters,
    limit: 500,
  });

  const kpis = useMemo(() => {
    if (!entries) return { totalMovements: 0, receipts: 0, issues: 0 };
    return {
      totalMovements: entries.length,
      receipts: entries.filter((e) => e.actual_qty > 0).length,
      issues: entries.filter((e) => e.actual_qty < 0).length,
    };
  }, [entries]);

  if (error) {
    return (
      <ListErrorState
        error={error}
        label="stock ledger"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Ledger"
        subtitle={`${entries?.length ?? 0} entr${(entries?.length ?? 0) !== 1 ? "ies" : "y"}`}
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          title="Total Movements"
          value={kpis.totalMovements}
          icon={ArrowRightLeft}
          isLoading={isLoading}
        />
        <KPICard
          title="Receipts"
          value={kpis.receipts}
          icon={Package}
          variant="success"
          isLoading={isLoading}
        />
        <KPICard
          title="Issues"
          value={kpis.issues}
          icon={Package}
          variant="danger"
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
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1.5 block">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-12 w-full rounded-xl bg-secondary/30 border border-border/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1.5 block">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-12 w-full rounded-xl bg-secondary/30 border border-border/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState rows={10} variant="table" />
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          title="No stock ledger entries"
          description="Stock movements will appear here once transactions are recorded"
          variant="no-data"
        />
      ) : (
        <div className="bg-card shadow-sm rounded-2xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Item
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Warehouse
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Movement
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    After
                  </th>
                  <th className="text-right px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Rate
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Voucher Type
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Voucher No
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const voucherRoute = entry.voucher_type
                    ? getDocTypeRoute(entry.voucher_type)
                    : null;

                  return (
                    <tr
                      key={entry.name}
                      className="border-b border-border/30 last:border-b-0 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                          {formatDate(entry.posting_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/stock/stock-ledger/${encodeURIComponent(entry.name)}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {entry.item_code}
                        </Link>
                        {entry.item_name && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {entry.item_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {entry.warehouse}
                          </span>
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right tabular-nums font-medium",
                          getMovementColor(entry.actual_qty)
                        )}
                      >
                        {getMovementPrefix(entry.actual_qty)}
                        {formatNumber(entry.actual_qty)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {formatNumber(entry.qty_after_transaction)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {entry.valuation_rate
                          ? formatNumber(entry.valuation_rate)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.voucher_type || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {voucherRoute && entry.voucher_no ? (
                          <Link
                            href={`/${voucherRoute}/${encodeURIComponent(entry.voucher_no)}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {entry.voucher_no}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {entry.voucher_no || "—"}
                          </span>
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
    </div>
  );
}
