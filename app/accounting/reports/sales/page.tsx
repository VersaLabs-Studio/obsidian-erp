// app/accounting/reports/sales/page.tsx
// Obsidian ERP v4.0 — Sales Report (Part 16)
//
// Sales overview with KPI summary, filter bar, and detailed data table.
// Supports drill-down by customer, item, salesperson.
// All filters URL-persisted via ReportFilterBar.

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  TrendingUp,
  ArrowLeft,
  Download,
  Receipt,
  Users,
  Package,
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

interface SalesInvoiceRow {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  grand_total: number;
  outstanding_amount: number;
  status?: string;
  docstatus?: 0 | 1 | 2;
  sales_person?: string;
  due_date?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

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

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------

function exportCsv(rows: SalesInvoiceRow[]) {
  const header = [
    "Invoice",
    "Customer",
    "Date",
    "Grand Total",
    "Outstanding",
    "Status",
  ].join(",");
  const body = rows
    .map(
      (r) =>
        [
          r.name,
          r.customer_name || r.customer,
          r.posting_date,
          r.grand_total,
          r.outstanding_amount,
          r.status || "",
        ].join(",")
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SalesReportPage() {
  const searchParams = useSearchParams();
  const prefersReducedMotion = useReducedMotion();
  const dateMode =
    (searchParams.get("dateMode") as DateRangeMode) || "this-month";
  const dateRange = computeDateRange(dateMode);
  const statuses = searchParams
    .get("statuses")
    ?.split(",")
    .filter(Boolean) || [];

  const filterArgs = useMemo(() => {
    const base: [string, string, unknown][] = [["docstatus", "=", 1]];
    if (dateRange.from && dateRange.to) {
      base.push(["posting_date", ">=", dateRange.from]);
      base.push(["posting_date", "<=", dateRange.to]);
    }
    if (statuses.length > 0) {
      base.push(["status", "in", statuses]);
    }
    return base;
  }, [dateRange.from, dateRange.to, statuses]);

  const { data: invoices = [], isLoading } = useFrappeList<SalesInvoiceRow>(
    "Sales Invoice",
    {
      fields: [
        "name",
        "customer",
        "customer_name",
        "posting_date",
        "grand_total",
        "outstanding_amount",
        "status",
        "due_date",
      ],
      filters: filterArgs,
      orderBy: { field: "posting_date", order: "desc" },
      limit: 500,
    }
  );

  const totalGrandTotal = invoices.reduce(
    (s, r) => s + (Number(r.grand_total) || 0),
    0
  );
  const totalOutstanding = invoices.reduce(
    (s, r) => s + (Number(r.outstanding_amount) || 0),
    0
  );

  // Unique customers for summary
  const uniqueCustomers = useMemo(
    () => [...new Set(invoices.map((r) => r.customer_name || r.customer))],
    [invoices]
  );

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
              <TrendingUp className="h-6 w-6 text-primary" />
              Sales Report
            </h1>
            <p className="text-sm text-muted-foreground">
              Sales invoices with period-over-period comparison.
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
        showParty={false}
        showStatus={true}
        showAmountRange={true}
        showItemGroup={false}
        statusOptions={[
          "Draft",
          "Submitted",
          "Paid",
          "Unpaid",
          "Partly Paid",
          "Overdue",
          "Cancelled",
        ]}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <InfoCard className="rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <Receipt className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Total Invoices
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
          transition={{ delay: 0.15 }}
        >
          <InfoCard className="rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Grand Total
                </p>
                <p className="text-xl font-mono font-bold">
                  {isLoading ? "—" : ETB.format(totalGrandTotal)}
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
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Unique Customers
                </p>
                <p className="text-xl font-mono font-bold">
                  {isLoading ? "—" : uniqueCustomers.length}
                </p>
              </div>
            </div>
          </InfoCard>
        </motion.div>
      </div>

      {/* Data table */}
      <InfoCard title="Sales Invoices" icon={<Receipt className="h-4 w-4" />}>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonLine key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No sales invoices found for the selected period.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <Link
                      href={`/accounting/sales-invoice/${row.name}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.customer_name || row.customer}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.posting_date}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {ETB.format(row.grand_total)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span
                      className={cn(
                        (row.outstanding_amount ?? 0) > 0 &&
                          "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {ETB.format(row.outstanding_amount ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.status)}>
                      {row.status || "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="font-bold bg-muted/30">
                <TableCell colSpan={3}>Total ({invoices.length} invoices)</TableCell>
                <TableCell className="text-right font-mono">
                  {ETB.format(totalGrandTotal)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {ETB.format(totalOutstanding)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </InfoCard>
    </div>
  );
}
