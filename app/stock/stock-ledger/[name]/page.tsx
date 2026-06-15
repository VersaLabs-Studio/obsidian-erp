"use client";

// app/stock/stock-ledger/[name]/page.tsx
// Obsidian ERP v4.0 — Stock Ledger Entry Detail (read-only, system-generated)

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarDays,
  Warehouse,
  Package,
  FileText,
  Building,
  Clock,
} from "lucide-react";
import { useFrappeDoc } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { getDocTypeRoute } from "@/lib/flows/flow-chain-resolver";
import { cn } from "@/lib/utils";

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
  valuation_amount?: number;
  voucher_type?: string;
  voucher_no?: string;
  company?: string;
  batch_no?: string;
  serial_no?: string;
  creation?: string;
  owner?: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatCurrency(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
  }).format(n);
}

function getMovementColor(qty: number): string {
  if (qty > 0) return "text-emerald-600 dark:text-emerald-400";
  if (qty < 0) return "text-destructive";
  return "text-muted-foreground";
}

export default function StockLedgerEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const {
    data: entry,
    isLoading,
    error,
  } = useFrappeDoc<StockLedgerEntry>("Stock Ledger Entry", name);

  if (isLoading) return <LoadingState />;

  if (error || !entry) {
    return (
      <div className="p-8 text-center text-destructive">
        Stock Ledger Entry not found
      </div>
    );
  }

  const voucherRoute = entry.voucher_type
    ? getDocTypeRoute(entry.voucher_type)
    : null;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Stock Ledger Entry ${entry.name}`}
        subtitle={`${entry.item_code} — ${entry.warehouse}`}
        backHref="/stock/stock-ledger"
      />

      {/* Movement Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <InfoCard title="Movement">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-background rounded-xl shadow-sm">
              <ArrowRightLeft
                className={cn("h-5 w-5", getMovementColor(entry.actual_qty))}
              />
            </div>
            <div>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  getMovementColor(entry.actual_qty),
                )}
              >
                {entry.actual_qty > 0 ? "+" : ""}
                {formatNumber(entry.actual_qty)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Quantity
              </p>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Balance After">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-background rounded-xl shadow-sm">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatNumber(entry.qty_after_transaction)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Qty After
              </p>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Valuation Rate">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-background rounded-xl shadow-sm">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(entry.valuation_rate)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Per Unit
              </p>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="Valuation Amount">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-background rounded-xl shadow-sm">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(entry.valuation_amount)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total
              </p>
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InfoCard title="Entry Details">
          <div className="grid grid-cols-2 gap-4">
            <DataPoint label="Item Code" value={entry.item_code} />
            <DataPoint label="Item Name" value={entry.item_name} />
            <DataPoint label="Warehouse" value={entry.warehouse} />
            <DataPoint label="Company" value={entry.company} />
            <DataPoint label="Posting Date" value={formatDate(entry.posting_date)} />
            <DataPoint label="Posting Time" value={entry.posting_time || "—"} />
            {entry.batch_no && <DataPoint label="Batch No" value={entry.batch_no} />}
            {entry.serial_no && <DataPoint label="Serial No" value={entry.serial_no} />}
          </div>
        </InfoCard>

        <InfoCard title="Source Document">
          <div className="space-y-4">
            <DataPoint label="Voucher Type" value={entry.voucher_type || "—"} />
            {voucherRoute && entry.voucher_no ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Voucher No
                </p>
                <Link
                  href={`/${voucherRoute}/${encodeURIComponent(entry.voucher_no)}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {entry.voucher_no}
                </Link>
              </div>
            ) : (
              <DataPoint label="Voucher No" value={entry.voucher_no || "—"} />
            )}
            <DataPoint label="Created By" value={entry.owner} />
            <DataPoint
              label="Created At"
              value={entry.creation ? formatDate(entry.creation) : "—"}
            />
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
