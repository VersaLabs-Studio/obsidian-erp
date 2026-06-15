// components/accounting/FinancialReportView.tsx
// Obsidian ERP v4.0 — Financial Report Layout (2N Part 3.2, 2O Part 2.2/2.3).
//
// Shared shell for the 4 financial report pages (P&L, BS, AR, AP). Renders
// a period/company selector, a financial-statement table with totals row,
// and an Export (CSV) action. P&L and BS render an indented account tree
// with `is_total` rows bolded; AR/AP render aging buckets (0-30 / 31-60 /
// 61-90 / 90+).
//
// 2O Part 2.2 — period selector now REFETCHES. The view owns the period
// state and calls `useFrappeReport` internally, so a period change
// rebuilds the hook's `filters` arg → TanStack Query key change → refetch.
// The prior version mutated `useState` that the hook ignored (a list-page
// in the same report would never see the new period).
//
// 2O Part 2.3 — column mapping robustness. The previous heuristic was
// label=first matching `account|party`, amount=first matching
// `amount|balance|debit|credit|total|outstanding` — and silently fell
// back to "last column" if neither matched. The new mapping is
// contextual:
//   - For indented financial statements (P&L/BS), the convention is
//     `account` + per-period `amount`-style columns.
//   - For aged reports (AR/AP), label is `party` and amounts are
//     `outstanding_amount` / `invoice_amount` (pre-period) plus the
//     `0-30 / 31-60 / 61-90 / 90+` per-bucket columns.
// When the heuristic still can't find an amount column, the empty state
// surfaces a small diagnostic (silent fall-back was the 2N bug).
//
// Premium-UI: OKLCH semantic tokens, B1 cards, staggered entrance,
// reduced-motion safe, dual-theme, 375px-friendly.

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Download,
  ChevronDown,
  ChevronRight,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import type {
  ReportColumn,
  ReportRow,
} from "@/app/api/accounting/reports/[report]/route";
import { useFrappeReport, type ReportKey, type ReportFilters } from "@/hooks/accounting/use-frappe-report";
import { useFiscalYears, type FiscalYear } from "@/hooks/accounting/use-fiscal-years";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

function fmtAmount(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined || v === "" || typeof v === "boolean") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return ETB.format(n);
}

function exportCsv(filename: string, columns: ReportColumn[], rows: ReportRow[]) {
  const header = columns.map((c) => c.label).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = r[c.fieldname];
          if (v === null || v === undefined) return "";
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Period selector (2O Part 2.2 — period change now refetches;
//  2P Part 3 — driven by REAL Fiscal Year records, not the calendar year)
// ---------------------------------------------------------------------------
export interface PeriodOption {
  label: string;
  /** Resolved by the route into either the financial-statement shape
   *  OR the aged-report shape. We pass both sets; the route's mapper
   *  picks the right one. */
  filters: ReportFilters;
}

/**
 * Build the period options for a given FY. The previous version
 * hard-built the calendar year; the 2P Part 3 version derives from
 * the actual Fiscal Year record's `year_start_date` / `year_end_date`,
 * falling back to "This year" only if no FY exists (and surfacing
 * a guided "No fiscal year" path via the FISCAL_YEAR_MISSING error
 * strategy).
 */
function buildPeriodOptions(
  fy: FiscalYear | null,
  today = new Date(),
): PeriodOption[] {
  const todayIso = today.toISOString().split("T")[0] ?? "";
  // If no FY: return an empty list. The view surfaces the
  // FISCAL_YEAR_MISSING guided error (the route will error with
  // "Date … is not in any active Fiscal Year"; our strategy turns
  // that into a guided action).
  if (!fy || !fy.year_start_date || !fy.year_end_date) {
    return [];
  }
  const fyStart = fy.year_start_date;
  const fyEnd = fy.year_end_date;
  const fyName = fy.name;
  const month = today.getMonth();
  const year = today.getFullYear();
  const yearStart = fyStart;
  const yearEnd = fyEnd < todayIso ? fyEnd : todayIso;

  // Period key — match the FY's calendar shape. If the FY started in,
  // say, 2024 and ends in 2025, we still call the periods "This year"
  // and "Last year" by their actual calendar year.
  const fyStartYear = Number(fyStart.slice(0, 4));
  const fyEndYear = Number(fyEnd.slice(0, 4));
  const lastFy = fyStartYear - 1;

  return [
    {
      label: "This month",
      filters: {
        fiscal_year: fyName,
        period_start_date: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        period_end_date: todayIso,
        periodicity: "Monthly",
        report_date: todayIso,
      },
    },
    {
      label: "This quarter",
      filters: {
        fiscal_year: fyName,
        period_start_date: `${year}-${String(Math.floor(month / 3) * 3 + 1).padStart(2, "0")}-01`,
        period_end_date: todayIso,
        periodicity: "Quarterly",
        report_date: todayIso,
      },
    },
    {
      label: "This year",
      filters: {
        fiscal_year: fyName,
        period_start_date: yearStart,
        period_end_date: yearEnd,
        periodicity: "Yearly",
        report_date: yearEnd,
      },
    },
    // Last FY option only meaningful if the previous year also exists
    // in our fy list. We surface a generic "Last year" that maps to
    // the prior calendar year — the route will fall back to its
    // own defaults if that year has no FY. Operators who want a
    // specific past FY can use the FY picker.
    {
      label: `FY ${fyStartYear} (last)`,
      filters: {
        fiscal_year: String(lastFy),
        period_start_date: `${lastFy}-01-01`,
        period_end_date: `${lastFy}-12-31`,
        periodicity: "Yearly",
        report_date: `${lastFy}-12-31`,
      },
    },
  ];
  // Note: fyStartYear / fyEndYear / lastFy referenced to avoid "unused
  // locals" when fyStartYear === fyEndYear. The numbers are consumed
  // by the option labels.
  void fyEndYear;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export interface FinancialReportViewProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  reportKey: ReportKey;
  /** Optional: if true, render indented account tree (P&L, BS). */
  indented?: boolean;
  /** Optional: if true, render aging buckets column (AR, AP). */
  showAgingBuckets?: boolean;
}

export function FinancialReportView({
  title,
  subtitle,
  icon: Icon,
  reportKey,
  indented = false,
  showAgingBuckets = false,
}: FinancialReportViewProps) {
  const prefersReducedMotion = useReducedMotion();
  // 2P Part 3 — period options are built from REAL Fiscal Year records.
  const { fiscalYears, activeFY, pickPeriod, isLoading: loadingFYs } = useFiscalYears();
  const [period, setPeriod] = useState<PeriodOption | null>(null);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showFYMenu, setShowFYMenu] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { resolution, showError, dismiss } = useGuidedError();

  // Initialize the period once the FY list resolves. Default to
  // "This year" of the active FY.
  useEffect(() => {
    if (period || loadingFYs) return;
    const opts = buildPeriodOptions(activeFY);
    if (opts.length > 0) {
      setPeriod(opts[2] ?? opts[0] ?? null); // "This year"
    } else {
      setPeriod({
        label: "—",
        filters: { fiscal_year: "", period_start_date: "", period_end_date: "" },
      });
    }
  }, [activeFY, loadingFYs, period]);

  // Call the hook internally with the current period. Changing the period
  // rebuilds the `filters` object → TanStack Query key change → refetch.
  const { data, isLoading, error } = useFrappeReport(
    reportKey,
    period?.filters,
  );

  // 2P Part 3 — surface FiscalYearError as a guided error instead of
  // the raw "Date 31-12-2026 is not in any active Fiscal Year for Pana"
  // string the user reported.
  useEffect(() => {
    if (!error) return;
    showError(
      resolveFrappeError(
        new Error(error.message ?? "Failed to load report"),
        { doctype: reportKey },
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // 2O Part 2.3 — column mapping robustness. Heuristic picks:
  //   - LABEL: first column matching /account|party|particulars|description/i
  //   - AMOUNT (indented): first column matching /amount|balance|total/i AND
  //     NOT a label-ish column. For P&L/BS, the typical shape is
  //     "account" + "amount" (or per-period columns); we pick the first
  //     one that ends with one of those amount-suffix words.
  //   - AMOUNT (aged): first column matching /outstanding|invoice|total|amount/i.
  //   - If neither matches, fall back to "the last non-label column"
  //     and surface a small diagnostic (silent fall-back was the 2N bug).
  const layout = useMemo(() => {
    if (!data)
      return {
        labelKey: "account",
        amountKey: "amount",
        columns: [] as ReportColumn[],
        amountColumnMissing: true,
      };
    const cols = data.columns;
    const labelCandidate = cols.find(
      (c) => /account|party|particulars|description/i.test(c.fieldname),
    );
    const labelKey = labelCandidate?.fieldname ?? cols[0]?.fieldname ?? "account";
    const labelIndex = cols.findIndex((c) => c.fieldname === labelKey);
    const amountRegex = showAgingBuckets
      ? /amount|outstanding|invoice|total|balance|debit|credit/i
      : /amount|balance|total/i;
    const amountCandidate = cols.find(
      (c, i) => i !== labelIndex && amountRegex.test(c.fieldname),
    );
    const amountKey =
      amountCandidate?.fieldname ??
      // Fall back to the last column that's not the label
      [...cols].reverse().find((c) => c.fieldname !== labelKey)?.fieldname ??
      cols[cols.length - 1]?.fieldname ??
      "amount";
    return {
      labelKey,
      amountKey,
      columns: cols,
      amountColumnMissing: !amountCandidate,
    };
  }, [data, showAgingBuckets]);

  // Toggle a row's children in the indented view.
  const toggleRow = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Total row = sum of amount column. ERPNext already returns a grand
  // total row when present; we sum as a fallback.
  const totalAmount = useMemo(() => {
    if (!data) return 0;
    return data.result.reduce(
      (s, r) => s + (Number(r[layout.amountKey]) || 0),
      0,
    );
  }, [data, layout.amountKey]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector — 2O Part 2.2 refetch; 2P Part 3 FY-driven */}
          <div className="relative">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setShowPeriodMenu((v) => !v)}
              data-testid="report-period-button"
            >
              <CalendarRange className="mr-1.5 h-3.5 w-3.5" />
              {period?.label ?? "—"}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            {showPeriodMenu && (
              <div
                className="absolute right-0 z-10 mt-2 w-56 rounded-2xl border border-border/40 bg-popover/95 p-1 shadow-xl backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {buildPeriodOptions(activeFY).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setPeriod(p);
                      setShowPeriodMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/60"
                    data-testid={`report-period-${p.label}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* FY picker (2P Part 3) — explicit, for "show me FY 2025 only" */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setShowFYMenu((v) => !v)}
              data-testid="report-fy-button"
            >
              FY: {activeFY?.name ?? "—"}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {showFYMenu && fiscalYears.length > 0 && (
              <div
                className="absolute right-0 z-10 mt-2 w-48 rounded-2xl border border-border/40 bg-popover/95 p-1 shadow-xl backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {fiscalYears.map((fy) => (
                  <button
                    key={fy.name}
                    type="button"
                    onClick={() => {
                      const opts = buildPeriodOptions(fy);
                      if (opts[2]) setPeriod(opts[2]);
                      setShowFYMenu(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/60"
                    data-testid={`report-fy-${fy.name}`}
                  >
                    <span>{fy.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {fy.year_start_date?.slice(0, 4) ?? ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              data &&
              period &&
              exportCsv(
                `${reportKey}-${period.filters.period_start_date ?? period.filters.from_date ?? "fy"}-${period.filters.period_end_date ?? period.filters.to_date ?? ""}.csv`,
                data.columns,
                data.result,
              )
            }
            disabled={!data || data.result.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Period metadata */}
      {data && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-border/40 bg-secondary/20 px-2 py-0.5">
            Company: <strong className="text-foreground">{data.period.company}</strong>
          </span>
          {data.period.fiscal_year && (
            <span className="rounded-md border border-border/40 bg-secondary/20 px-2 py-0.5">
              Fiscal year: <strong className="text-foreground">{data.period.fiscal_year}</strong>
            </span>
          )}
          {data.period.periodicity && (
            <span className="rounded-md border border-border/40 bg-secondary/20 px-2 py-0.5">
              Periodicity: <strong className="text-foreground">{data.period.periodicity}</strong>
            </span>
          )}
          {data.period.period_start_date && (
            <span className="rounded-md border border-border/40 bg-secondary/20 px-2 py-0.5">
              Start: <strong className="text-foreground">{data.period.period_start_date}</strong>
            </span>
          )}
          {data.period.period_end_date && (
            <span className="rounded-md border border-border/40 bg-secondary/20 px-2 py-0.5">
              End: <strong className="text-foreground">{data.period.period_end_date}</strong>
            </span>
          )}
          {data.period.report_date && !data.period.period_end_date && (
            <span className="rounded-md border border-border/40 bg-secondary/20 px-2 py-0.5">
              As of: <strong className="text-foreground">{data.period.report_date}</strong>
            </span>
          )}
        </div>
      )}

      {/* Report body */}
      <section
        className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm shadow-black/5"
        aria-label={title}
      >
        {isLoading ? (
          <div className="space-y-3 p-6" data-testid="report-loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonLine key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">
            <strong>Failed to load report.</strong> {error.message}
          </div>
        ) : !data || data.empty ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/40">
              ?
            </div>
            <p className="text-sm text-muted-foreground">
              No data for the selected period.
            </p>
            {layout.amountColumnMissing && (
              <p className="text-xs text-warning">
                Heuristic couldn&apos;t find an amount column — check the report schema.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  {indented && (
                    <th className="w-8 px-4 py-3" aria-label="Toggle" />
                  )}
                  <th className="px-4 py-3">{layout.columns.find((c) => c.fieldname === layout.labelKey)?.label ?? "Account"}</th>
                  {showAgingBuckets && (
                    <th className="px-4 py-3 text-right">0–30</th>
                  )}
                  {showAgingBuckets && (
                    <th className="px-4 py-3 text-right">31–60</th>
                  )}
                  {showAgingBuckets && (
                    <th className="px-4 py-3 text-right">61–90</th>
                  )}
                  {showAgingBuckets && (
                    <th className="px-4 py-3 text-right">90+</th>
                  )}
                  <th className="px-4 py-3 text-right">
                    {layout.columns.find((c) => c.fieldname === layout.amountKey)?.label ?? "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.result.map((row, i) => {
                  const labelVal = String(row[layout.labelKey] ?? "");
                  const amountVal = row[layout.amountKey];
                  const indent = Number(row.indent ?? 0);
                  const isTotal = Boolean(row.is_total);
                  const collapsedKey = `${row.parent_account ?? ""}/${labelVal}`;
                  const isCollapsed = collapsed.has(collapsedKey);
                  return (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-border/20 last:border-0",
                        isTotal && "bg-secondary/30 font-semibold",
                        !isTotal && indent > 0 && "text-muted-foreground",
                      )}
                    >
                      {indented && (
                        <td className="px-4 py-2.5 align-middle">
                          {indent > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleRow(collapsedKey)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={
                                isCollapsed ? "Expand children" : "Collapse children"
                              }
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </td>
                      )}
                      <td
                        className="px-4 py-2.5"
                        style={indented ? { paddingLeft: `${4 + indent * 16}px` } : undefined}
                      >
                        {labelVal || "(unlabeled)"}
                      </td>
                      {showAgingBuckets && (
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtAmount(row["0-30"] ?? row["range1"])}
                        </td>
                      )}
                      {showAgingBuckets && (
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtAmount(row["31-60"] ?? row["range2"])}
                        </td>
                      )}
                      {showAgingBuckets && (
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtAmount(row["61-90"] ?? row["range3"])}
                        </td>
                      )}
                      {showAgingBuckets && (
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtAmount(row["90+"] ?? row["range4"])}
                        </td>
                      )}
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right tabular-nums",
                          isTotal && "text-primary",
                        )}
                      >
                        {fmtAmount(amountVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border/40 bg-secondary/30 font-semibold">
                  <td
                    colSpan={indented ? 2 : 1 + (showAgingBuckets ? 4 : 0)}
                    className="px-4 py-3 text-foreground"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-primary">
                    {fmtAmount(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
