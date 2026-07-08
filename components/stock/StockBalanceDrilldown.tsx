// components/stock/StockBalanceDrilldown.tsx
// Obsidian ERP v4.0 — Phase 2Y Part 4: Stock Balance Drill-Down.
//
// Per-warehouse WHERE (which warehouse has this item and how much)
// + ledger-movement WHEN (Stock Ledger Entry history).
// Opens from the Stock Balance page when a row is clicked.
//
// Premium UI: OKLCH tokens, glassmorphism header, Framer Motion stagger.

"use client";

import { useMemo } from "react";
import {
  Warehouse,
  ArrowRightLeft,
  Clock,
  Scale,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFrappeList } from "@/hooks/generic";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/smart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BinRow {
  warehouse: string;
  actual_qty: number;
  reserved_qty?: number;
  projected_qty?: number;
  valuation_rate?: number;
  stock_value?: number;
}

interface SLERow {
  name: string;
  item_code: string;
  warehouse: string;
  posting_date: string;
  posting_time?: string;
  actual_qty: number;
  qty_after_transaction: number;
  valuation_rate?: number;
  stock_value_difference?: number;
  voucher_type: string;
  voucher_no: string;
  incoming_rate?: number;
  outgoing_rate?: number;
}

interface StockBalanceDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCode: string;
  itemName?: string;
}

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StockBalanceDrilldown({
  open,
  onOpenChange,
  itemCode,
  itemName,
}: StockBalanceDrilldownProps) {
  // -- Per-warehouse bins for this item --------------------------------------
  const { data: bins, isLoading: loadingBins } = useFrappeList<BinRow>("Bin", {
    filters: [["item_code", "=", itemCode]],
    fields: ["warehouse", "actual_qty", "reserved_qty", "projected_qty", "valuation_rate", "stock_value"],
    limit: 50,
  }, { enabled: open && !!itemCode });

  // -- Stock Ledger Entries (movement history) --------------------------------
  const { data: ledgerEntries, isLoading: loadingLedger } = useFrappeList<SLERow>(
    "Stock Ledger Entry",
    {
      filters: [["item_code", "=", itemCode]],
      fields: [
        "name", "warehouse", "posting_date", "posting_time",
        "actual_qty", "qty_after_transaction", "valuation_rate",
        "stock_value_difference", "voucher_type", "voucher_no",
      ],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 30,
    },
    { enabled: open && !!itemCode },
  );

  const totalQty = useMemo(
    () => (bins ?? []).reduce((sum, b) => sum + Number(b.actual_qty || 0), 0),
    [bins],
  );

  const totalValue = useMemo(
    () => (bins ?? []).reduce((sum, b) => sum + Number(b.stock_value || 0), 0),
    [bins],
  );

  const isLoading = loadingBins || loadingLedger;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-none shadow-2xl bg-popover/95 backdrop-blur-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-lg font-bold text-foreground">
            {itemName || itemCode}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Stock drill-down — per-warehouse quantities + movement history
          </p>
          {/* Summary bar */}
          {!isLoading && bins && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 rounded-xl bg-secondary/30 px-3 py-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{formatNumber(totalQty)}</span>
                <span className="text-xs text-muted-foreground">units total</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-secondary/30 px-3 py-2">
                <Warehouse className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{bins.length}</span>
                <span className="text-xs text-muted-foreground">warehouses</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2">
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{ETB.format(totalValue)}</span>
                <span className="text-xs text-muted-foreground">total value</span>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* -- Per-warehouse breakdown ---------------------------------------- */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Warehouse className="h-4 w-4 text-primary" /> Where is it?
            </h3>
            {isLoading ? (
              <LoadingState rows={3} variant="table" />
            ) : !bins || bins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No stock in any warehouse.</p>
            ) : (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-semibold">Warehouse</th>
                      <th className="px-4 py-2.5 text-right font-semibold">On Hand</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Reserved</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Available</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {bins.map((b) => {
                      const available = Number(b.actual_qty || 0) - Number(b.reserved_qty || 0);
                      return (
                        <tr key={b.warehouse} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{b.warehouse}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                            {formatNumber(Number(b.actual_qty || 0))}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {formatNumber(Number(b.reserved_qty || 0))}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={cn(
                              "font-medium",
                              available <= 0 ? "text-destructive" : "text-foreground",
                            )}>
                              {formatNumber(available)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {ETB.format(Number(b.stock_value || 0))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* -- Ledger movement history ---------------------------------------- */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <ArrowRightLeft className="h-4 w-4 text-primary" /> Movement History
            </h3>
            {isLoading ? (
              <LoadingState rows={5} variant="table" />
            ) : !ledgerEntries || ledgerEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No movements recorded.</p>
            ) : (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2.5 text-left font-semibold">When</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Warehouse</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Movement</th>
                      <th className="px-4 py-2.5 text-right font-semibold">After</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {ledgerEntries.map((entry) => {
                      const qty = Number(entry.actual_qty || 0);
                      const isReceipt = qty > 0;
                      const isIssue = qty < 0;
                      return (
                        <tr key={entry.name} className={cn(
                          "hover:bg-secondary/20 transition-colors",
                          isIssue && "bg-destructive/5",
                          isReceipt && "bg-emerald-500/5",
                        )}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {entry.posting_date}
                                {entry.posting_time ? ` ${entry.posting_time.substring(0, 5)}` : ""}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-foreground">{entry.warehouse}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <Badge variant="outline" className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold",
                              isReceipt && "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
                              isIssue && "bg-destructive/15 text-destructive border-destructive/30",
                              !isReceipt && !isIssue && "bg-secondary/30 text-muted-foreground border-border/60",
                            )}>
                              {isReceipt ? "+" : ""}{formatNumber(qty)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground font-medium">
                            {formatNumber(Number(entry.qty_after_transaction || 0))}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                              {entry.voucher_type}
                            </span>
                            <span className="text-xs font-medium text-primary ml-1">
                              {entry.voucher_no}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
