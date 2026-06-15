// hooks/accounting/use-fiscal-years.ts
// Obsidian ERP v4.0 — Fiscal Year list + period builder (2P Part 3).
//
// Loads the `Fiscal Year` doctype once and exposes a `pickPeriod()`
// helper that builds the right per-report filter shape given a chosen
// FY + periodicity. The previous 2O design hard-built the calendar
// year on the client; this version always uses real FY records, so
// a Pana instance that has no FY for 2026 (the live-reported bug)
// shows a guided-fix path instead of a `FiscalYearError` raw string.
//
// Per-report shape (2O Part 2.1 still applies — the FINANCIAL_STATEMENTS
// / AGED split):
//   - P&L + Balance Sheet: `fiscal_year`, `period_start_date`,
//     `period_end_date`, `periodicity`, `filter_based_on: "Date Range"`.
//   - AR + AP: `report_date`, `ageing_based_on: "Posting Date"`,
//     `range1..4` (defaults from the FY's start-of-year to today).
//
// The `useFrappeReport` call uses the resulting filter object as part
// of its queryKey, so a period change automatically refetches.

import { useMemo } from "react";
import { useFrappeList } from "@/hooks/generic";
import type { ReportFilters } from "./use-frappe-report";

export interface FiscalYear {
  name: string;
  year_start_date?: string;
  year_end_date?: string;
  /** Whether ERPNext considers this FY "active" (1 = active). */
  disabled?: number | string;
}

/**
 * Hook: list all Fiscal Years and surface the one that contains today
 * (or the most recent, if today is outside any). Returns the FY list
 * + a `pickPeriod(periodicity)` helper.
 */
export function useFiscalYears() {
  const { data: fys = [], isLoading } = useFrappeList<FiscalYear>(
    "Fiscal Year",
    {
      fields: ["name", "year_start_date", "year_end_date", "disabled"],
      orderBy: { field: "year_start_date", order: "desc" },
      limit: 50,
    },
  );

  const today = new Date().toISOString().split("T")[0] ?? "";
  const activeFY = useMemo(() => {
    if (fys.length === 0) return null;
    // Prefer the FY that contains today
    const containsToday = fys.find(
      (f) =>
        f.year_start_date &&
        f.year_end_date &&
        f.year_start_date <= today &&
        f.year_end_date >= today,
    );
    return containsToday ?? fys[0] ?? null;
  }, [fys, today]);

  /**
   * Build a ReportFilters for the given FY + periodicity. Used by the
   * FinancialReportView. Returns null when the FY lacks dates (the
   * caller surfaces a guided error via the FISCAL_YEAR_MISSING
   * strategy).
   */
  function pickPeriod(
    fy: FiscalYear | null,
    periodicity: "Yearly" | "Quarterly" | "Monthly" = "Yearly",
    todayIso = new Date().toISOString().split("T")[0] ?? "",
  ): ReportFilters | null {
    if (!fy || !fy.year_start_date || !fy.year_end_date) return null;
    const start = fy.year_start_date;
    const end =
      fy.year_end_date < todayIso ? fy.year_end_date : todayIso;
    return {
      company: undefined,
      fiscal_year: fy.name,
      period_start_date: start,
      period_end_date: end,
      periodicity,
      report_date: end,
    };
  }

  return { fiscalYears: fys, activeFY, pickPeriod, isLoading, today };
}
