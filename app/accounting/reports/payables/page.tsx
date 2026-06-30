// app/accounting/reports/payables/page.tsx
// Obsidian ERP v4.0 — Payables Report (Part 16)
//
// AP aging report with outstanding invoices, paid vs unpaid status,
// aging buckets (0-30/31-60/61-90/90+), and overdue reminders.
// Filter bar with party, status, amount range filters.

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowLeft,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCard } from "@/components/ui/info-card";
import { SkeletonLine } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ReportFilterBar,
  computeDateRange,
  type DateRangeMode,
} from "@/components/reports/ReportFilterBar";
import { useFrappeList } from "@/hooks/generic";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayableRow {
  name: string;
  supplier: string;
  supplier_name?: string;
  posting_date: string;
  due_date?: string;
  grand_total: number;
  outstanding_amount: number;
  status?: string;
  docstatus?: 0 | 1 | 2;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function agingBucket(dueDate: string | undefined, today: string): string {
  if (!dueDate) return "N/A";
  const days = daysBetween(dueDate, today);
  if (days < 0) return "Not Due";
  if (days <= 30) return "0–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "90+";
}

function statusBadgeVariant(
  status?: string
): "default" | "secondary" | "destructive" | "warning" {
  switch (status) {
    case "Paid":
      return "default";
    case "Overdue":
      return "destructive";
    case "Unpaid":
    case "Partly Paid":
      return "warning";
    case "Draft":
      return "secondary";
    default:
      return "secondary";
  }
}

function exportCsv(rows: PayableRow[]) {
  const header = [
    "Invoice",
    "Supplier",
    "Invoice Date",
    "Due Date",
    "Grand Total",
    "Outstanding",
    "Status",
    "Aging Bucket",
  ].join(",");
  const today = new Date().toISOString().split("T")[0];
  const body = rows
    .map(
      (r) =>
        [
          r.name,
          r.supplier_name || r.supplier,
          r.posting_date,
          r.due_date || "",
          r.grand_total,
          r.outstanding_amount,
          r.status || "",
          agingBucket(r.due_date, today),
        ].join(",")
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payables-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PayablesReportPage() {
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const statuses = searchParams
    .get("statuses")
    ?.split(",")
    .filter(Boolean) || [];
  const parties = searchParams
    .get("parties")
    ?.split(",")
    .filter(Boolean) || [];

  const today = new Date().toISOString().split("T")[0];

  const filterArgs = useMemo(() => {
    const base: [string, string, unknown][] = [
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0],
    ];
    if (statuses.length > 0) {
      base.push(["status", "in", statuses]);
    }
    if (parties.length > 0) {
      base.push(["supplier", "in", parties]);
    }
    return base;
  }, [statuses, parties]);

  const { data: invoices = [], isLoading } = useFrappeList<PayableRow>(
    "Purchase Invoice",
    {
      fields: [
        "name",
        "supplier",
        "supplier_name",
        "posting_date",
        "due_date",
        "grand_total",
        "outstanding_amount",
        "status",
      ],
      filters: filterArgs,
      orderBy: { field: "posting_date", order: "desc" },
      limit: 1000,
    }
  );

  // Compute aging buckets
  const aging = useMemo(() => {
    const buckets = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
    invoices.forEach((r) => {
      const bucket = agingBucket(r.due_date, today);
      if (bucket in buckets) {
        buckets[bucket as keyof typeof buckets] += r.outstanding_amount ?? 0;
      }
    });
    return buckets;
  }, [invoices, today]);

  const totalOutstanding = invoices.reduce(
    (s, r) => s + (Number(r.outstanding_amount) || 0),
    0
  );
  const totalGrandTotal = invoices.reduce(
    (s, r) => s + (Number(r.grand_total) || 0),
    0
  );

  // Unique suppliers
  const uniqueSuppliers = useMemo(
    () => [...new Set(invoices.map((r) => r.supplier_name || r.supplier))],
    [invoices]
  );

  const overdueCount = invoices.filter(
    (r) => r.status === "Overdue"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link href="/accounting/reports">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ArrowUpRight className="h-6 w-6 text-primary" />
              Payables
            </h1>
            <p className="text-sm text-muted-foreground">
              Outstanding supplier bills with aging analysis.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(invoices)}
          disabled={invoices.length === 0}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </motion.div>

      {/* Filter bar */}
      <ReportFilterBar
        showParty={true}
        showStatus={true}
        showAmountRange={true}
        showItemGroup={false}
        partyPlaceholder="All Suppliers"
        statusOptions={["Paid", "Unpaid", "Partly Paid", "Overdue", "Draft"]}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <InfoCard className="rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Total Outstanding
                </p>
                <p className="text-xl font-mono font-bold">
                  {isLoading ? "—" : ETB.format(totalOutstanding)}
                </p>
              </div>
            </div>
          </InfoCard>
        </motion.div>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <InfoCard className="rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Invoices
                </p>
                <p className="text-xl font-mono font-bold">
                  {isLoading ? "—" : invoices.length}
                </p>
              </div>
            </div>
          </InfoCard>
        </motion.div>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <InfoCard className="rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Suppliers
                </p>
                <p className="text-xl font-mono font-bold">
                  {isLoading ? "—" : uniqueSuppliers.length}
                </p>
              </div>
            </div>
          </InfoCard>
        </motion.div>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <InfoCard className="rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Overdue
                </p>
                <p className="text-xl font-mono font-bold">
                  {isLoading ? "—" : overdueCount}
                </p>
              </div>
            </div>
          </InfoCard>
        </motion.div>
      </div>

      {/* Aging buckets */}
      <InfoCard
        title="Aging Buckets"
        icon={<Clock className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(aging).map(([bucket, amount]) => (
            <div
              key={bucket}
              className={cn(
                "rounded-xl p-4 border text-center",
                bucket === "90+"
                  ? "bg-destructive/5 border-destructive/20"
                  : bucket === "61–90"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-muted/20 border-border/40"
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                {bucket} days
              </p>
              <p className="text-lg font-mono font-bold">
                {isLoading ? "—" : ETB.format(amount)}
              </p>
            </div>
          ))}
        </div>
      </InfoCard>

      {/* Data table */}
      <InfoCard
        title="Outstanding Invoices"
        icon={<ArrowUpRight className="h-4 w-4" />}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No outstanding payables. All invoices are paid!
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((row) => {
                const bucket = agingBucket(row.due_date, today);
                return (
                  <TableRow key={row.name}>
                    <TableCell>
                      <Link
                        href={`/accounting/purchase-invoice/${row.name}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.supplier_name || row.supplier}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.posting_date}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.due_date || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {ETB.format(row.grand_total)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span
                        className={cn(
                          "font-medium",
                          (row.outstanding_amount ?? 0) > 0 &&
                            "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {ETB.format(row.outstanding_amount ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          bucket === "90+"
                            ? "destructive"
                            : bucket === "61–90"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {bucket}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(row.status)}>
                        {row.status || "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Totals row */}
              <TableRow className="font-bold bg-muted/30">
                <TableCell colSpan={4}>
                  Total ({invoices.length} invoices)
                </TableCell>
                <TableCell className="text-right font-mono">
                  {ETB.format(totalGrandTotal)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {ETB.format(totalOutstanding)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </InfoCard>
    </div>
  );
}
