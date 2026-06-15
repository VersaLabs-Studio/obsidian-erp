// hooks/accounting/use-frappe-report.ts
// Obsidian ERP v4.0 — Financial Report Query Hook (2N Part 3.2, 2O Part 2.2).
//
// Thin TanStack Query wrapper over the `/api/accounting/reports/[report]`
// route. The UI calls this and renders `data.columns` + `data.result`.
//
// 2O Part 2.2 — supports BOTH the financial-statements filter shape (P&L,
// BS: `fiscal_year` + `period_start_date` + `period_end_date` +
// `periodicity`) AND the aged-reports shape (AR/AP: `report_date` +
// `range1..4`). The previous version only supported `from_date`/`to_date`
// — the new fields are required by ERPNext's `query_report.run`. The
// route's per-report filter mapper (2O Part 2.1) does the actual
// dispatch; this hook just passes whatever the UI sets.

"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type {
  ReportResponse,
} from "@/app/api/accounting/reports/[report]/route";

export type ReportKey =
  | "profit-and-loss"
  | "balance-sheet"
  | "accounts-receivable"
  | "accounts-payable";

export interface ReportFilters {
  /** Legacy from/to (used by the route's date-range defaults) */
  from_date?: string;
  to_date?: string;
  /** Financial-statements shape (P&L, BS). The route emits these to
   *  ERPNext's `get_period_list`/`validate_dates`. */
  fiscal_year?: string;
  period_start_date?: string;
  period_end_date?: string;
  periodicity?: string;
  /** Aged reports shape (AR, AP). */
  report_date?: string;
  range1?: number;
  range2?: number;
  range3?: number;
  range4?: number;
  /** Company (defaults to active) */
  company?: string;
}

function buildQueryString(filters?: ReportFilters): string {
  if (!filters) return "";
  const sp = new URLSearchParams();
  if (filters.company) sp.set("company", filters.company);
  if (filters.from_date) sp.set("from_date", filters.from_date);
  if (filters.to_date) sp.set("to_date", filters.to_date);
  if (filters.fiscal_year) sp.set("fiscal_year", filters.fiscal_year);
  if (filters.period_start_date)
    sp.set("period_start_date", filters.period_start_date);
  if (filters.period_end_date)
    sp.set("period_end_date", filters.period_end_date);
  if (filters.periodicity) sp.set("periodicity", filters.periodicity);
  if (filters.report_date) sp.set("report_date", filters.report_date);
  if (filters.range1 !== undefined) sp.set("range1", String(filters.range1));
  if (filters.range2 !== undefined) sp.set("range2", String(filters.range2));
  if (filters.range3 !== undefined) sp.set("range3", String(filters.range3));
  if (filters.range4 !== undefined) sp.set("range4", String(filters.range4));
  return sp.toString();
}

/**
 * Fetch a financial report from the server-side proxy route.
 *
 * @example
 *   const { data, isLoading } = useFrappeReport("profit-and-loss", {
 *     fiscal_year: "2026",
 *     period_start_date: "2026-01-01",
 *     period_end_date: "2026-12-31",
 *     periodicity: "Yearly",
 *   });
 */
export function useFrappeReport(
  report: ReportKey,
  filters?: ReportFilters,
  queryOptions?: Omit<
    UseQueryOptions<ReportResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const qs = buildQueryString(filters);
  return useQuery<ReportResponse, Error>({
    queryKey: ["accounting-report", report, filters],
    queryFn: async (): Promise<ReportResponse> => {
      const url = `/api/accounting/reports/${report}${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        const details =
          typeof json.details === "string"
            ? json.details
            : JSON.stringify(json.details);
        throw new Error(details || `Failed to load ${report} report`);
      }
      return json.data as ReportResponse;
    },
    // Reports are stable for a given period — let them cache for 5 min.
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

export default useFrappeReport;
