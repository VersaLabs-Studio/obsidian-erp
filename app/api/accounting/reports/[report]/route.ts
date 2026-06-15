// app/api/accounting/reports/[report]/route.ts
// Obsidian ERP v4.0 — Financial Report Proxy (2N Part 3.1, 2O Part 2.1,
// 2P-FINAL Part A.3).
//
// Server-side proxy to Frappe's standard query-report runner. The client
// never talks to Frappe directly for reports — it calls this route, which
// resolves `company` from the active company, normalizes the period filter
// per REPORT TYPE (financial-statements need different keys than AR/AP — see
// the mapper table below), and proxies to `frappe.desk.query_report.run`.
//
// Why a proxy (and not a direct client call):
//   1. The `frappe-client.ts` `call` is a server-side singleton with the
//      admin API token; the browser should never see it.
//   2. The query-report runner returns raw Frappe `columns` + `result` with
//      the doctype metadata the desk uses; we normalize to a typed shape
//      the UI can render without re-parsing.
//   3. Errors come back through the existing `frappeClient.handleError` so
//      failures surface as guided errors, not raw 500s.
//
// 2O Part 2.1 — PER-REPORT FILTER MAPPER (the bug that returned blank
// tables on P&L/BS). The previous code sent the SAME filter shape to all
// four reports — `from_date`/`to_date` — but ERPNext's financial-
// statement reports (`Profit and Loss Statement`, `Balance Sheet`) require
// **`fiscal_year`, `period_start_date`, `period_end_date`, `periodicity`**
// (and `filter_based_on`). They ignore `from_date`/`to_date`, leaving
// dates null, triggering `frappe.throw("From Date and To Date are
// mandatory")` → blank. The new `buildReportFilters` dispatches to a
// per-report builder:
//   - Financial statements (P&L, BS): the financial-statements shape.
//   - Aged receivables / payables: a separate `report_date` + ageing shape.
//
// 2P-FINAL Part A.3 — USER CLIENT. The operator is running THEIR own
// report — we want ERPNext to apply their per-company + per-role
// report scope (e.g. a Sales User shouldn't see full-balance-sheet
// data they have no perms for). Switched from `frappeClient.call` to
// the user-scoped `getRequestClient`. `frappeClient.handleError` is
// still used for error shaping (stateless, fine to keep).
//
// Supported `report` values (URL segment):
//   - `profit-and-loss`       → "Profit and Loss Statement"
//   - `balance-sheet`         → "Balance Sheet"
//   - `accounts-receivable`   → "Accounts Receivable"
//   - `accounts-payable`      → "Accounts Payable"

import { NextRequest, NextResponse } from "next/server";
import { frappeClient } from "@/lib/frappe-client";
import { getRequestClient } from "@/lib/auth/resolve-user";
import { getActiveCompany } from "@/lib/settings/company";

// ---------------------------------------------------------------------------
// Report name mapping (URL key → Frappe report_name)
// ---------------------------------------------------------------------------
const REPORT_NAME_MAP: Record<string, string> = {
  "profit-and-loss": "Profit and Loss Statement",
  "balance-sheet": "Balance Sheet",
  "accounts-receivable": "Accounts Receivable",
  "accounts-payable": "Accounts Payable",
};

// Reports that use the *financial-statements* filter shape
// (fiscal_year + period_start_date + period_end_date + periodicity).
const FINANCIAL_STATEMENT_REPORTS = new Set([
  "profit-and-loss",
  "balance-sheet",
]);

// Reports that use the *aged* filter shape (report_date + ageing ranges).
const AGED_REPORT_REPORTS = new Set([
  "accounts-receivable",
  "accounts-payable",
]);

// ---------------------------------------------------------------------------
// Normalized response shape the UI consumes
// ---------------------------------------------------------------------------
export interface ReportColumn {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  width?: number;
}

export interface ReportRow {
  /** Cell values keyed by column fieldname. */
  [fieldname: string]: string | number | boolean | null | undefined;
  /** Optional: account name (for indented financial statements) */
  account?: string;
  /** Optional: account indent level (0 = root) */
  indent?: number;
  /** Optional: parent account (for tree reports) */
  parent_account?: string;
  /** Optional: bold/total flag */
  is_total?: boolean;
  /** Optional: aging bucket (0-30, 31-60, etc.) */
  aging_bucket?: string;
}

export interface ReportResponse {
  report_name: string;
  columns: ReportColumn[];
  result: ReportRow[];
  /** Period metadata echoed back to the UI */
  period: {
    company: string;
    from_date?: string;
    to_date?: string;
    period_start_date?: string;
    period_end_date?: string;
    fiscal_year?: string;
    periodicity?: string;
    report_date?: string;
  };
  /** When the report returned an empty result (no data for the period) */
  empty: boolean;
}

// ---------------------------------------------------------------------------
// Default period helpers (so the first paint is populated, not an error)
// ---------------------------------------------------------------------------

/** Get the current fiscal year string for the active company.
 *  ERPNext fiscal year typically matches the calendar year in many locales
 *  (and the test seed uses calendar-year). For unknown locales, default to
 *  calendar year of `today`. */
function getCurrentFiscalYear(today = new Date()): string {
  return String(today.getFullYear());
}

/** First day of the current fiscal year, ISO yyyy-mm-dd. */
function firstOfFiscalYear(today = new Date()): string {
  return `${today.getFullYear()}-01-01`;
}

/** Today, ISO yyyy-mm-dd. */
function todayIso(today = new Date()): string {
  return today.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Period pickers (per UI call)
// ---------------------------------------------------------------------------
function pickPeriod(searchParams: URLSearchParams) {
  return {
    company: searchParams.get("company") ?? getActiveCompany(),
    // Common (UI side sends these)
    from_date: searchParams.get("from_date") ?? undefined,
    to_date: searchParams.get("to_date") ?? undefined,
    // Financial-statement shape (UI side may send either; we map both)
    period_start_date: searchParams.get("period_start_date") ?? undefined,
    period_end_date: searchParams.get("period_end_date") ?? undefined,
    fiscal_year: searchParams.get("fiscal_year") ?? undefined,
    periodicity: searchParams.get("periodicity") ?? undefined,
    // Aged-report shape
    report_date: searchParams.get("report_date") ?? undefined,
    // Optional user-supplied ageing ranges (defaults below)
    range1: searchParams.get("range1") ?? undefined,
    range2: searchParams.get("range2") ?? undefined,
    range3: searchParams.get("range3") ?? undefined,
    range4: searchParams.get("range4") ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Per-report filter builders (2O Part 2.1 — the actual fix)
// ---------------------------------------------------------------------------

/**
 * Profit and Loss Statement / Balance Sheet need the financial-statements
 * shape. ERPNext's `frappe.desk.query_report.run` then forwards these to
 * `frappe.controllers.queries.get_period_list` → `validate_dates(
 * period_start_date, period_end_date)` → requires `fiscal_year`,
 * `period_start_date`, `period_end_date`, `periodicity`. They ignore
 * `from_date`/`to_date`. The mapper below emits exactly those keys (and
 * `filter_based_on`, which the desk uses to choose "Date Range" vs
 * "Fiscal Year").
 */
function buildFinancialStatementFilters(
  reportKey: string,
  period: ReturnType<typeof pickPeriod>,
): Record<string, unknown> {
  const today = new Date();
  // Derive period_start/end from the UI's from_date/to_date if present;
  // otherwise default to the current fiscal year (so the first paint is
  // populated, not "From Date and To Date are mandatory").
  const period_start_date =
    period.period_start_date ??
    period.from_date ??
    firstOfFiscalYear(today);
  const period_end_date =
    period.period_end_date ??
    period.to_date ??
    todayIso(today);
  const fiscal_year =
    period.fiscal_year ?? getCurrentFiscalYear(today);
  const periodicity = period.periodicity ?? "Yearly";

  return {
    company: period.company,
    fiscal_year,
    period_start_date,
    period_end_date,
    periodicity,
    filter_based_on: "Date Range",
    // BS additionally accepts `accumulated_values` (defaults true) and
    // optional cost_center / project filters; we pass the flag so BS
    // shows the right totals.
    accumulated_values: reportKey === "balance-sheet" ? 1 : undefined,
  };
}

/**
 * Accounts Receivable / Accounts Payable use a DIFFERENT shape entirely
 * (ERPNext's `AccountsReceivable` / `AccountsPayable` scripts read
 * `report_date` + ageing ranges, not period_start/end). The mapper emits
 * the exact keys the script wants.
 */
function buildAgedFilters(
  period: ReturnType<typeof pickPeriod>,
): Record<string, unknown> {
  const today = new Date();
  return {
    company: period.company,
    report_date: period.report_date ?? todayIso(today),
    ageing_based_on: "Posting Date",
    range1: period.range1 ?? 30,
    range2: period.range2 ?? 60,
    range3: period.range3 ?? 90,
    range4: period.range4 ?? 120,
  };
}

/** Dispatch to the right builder per report type. */
function buildReportFilters(
  reportKey: string,
  period: ReturnType<typeof pickPeriod>,
): Record<string, unknown> {
  if (FINANCIAL_STATEMENT_REPORTS.has(reportKey)) {
    return buildFinancialStatementFilters(reportKey, period);
  }
  if (AGED_REPORT_REPORTS.has(reportKey)) {
    return buildAgedFilters(period);
  }
  // Fallback (shouldn't hit — REPORT_NAME_MAP guards above) — keep the
  // legacy from_date/to_date shape so we never silently blank a report.
  const out: Record<string, unknown> = { company: period.company };
  if (period.from_date) out.from_date = period.from_date;
  if (period.to_date) out.to_date = period.to_date;
  return out;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report: reportKey } = await params;
  const reportName = REPORT_NAME_MAP[reportKey];

  if (!reportName) {
    return NextResponse.json(
      {
        success: false,
        error: "Unknown report",
        details: `Report '${reportKey}' is not supported. Supported: ${Object.keys(REPORT_NAME_MAP).join(", ")}`,
        statusCode: 404,
      },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const period = pickPeriod(searchParams);
  const filters = buildReportFilters(reportKey, period);

  // 2P-FINAL Part A.3 — user-scoped client. Report data respects
  // the requesting user's company + role scope. Fail closed (401).
  const client = getRequestClient(request);
  if (!client) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
        details: "No valid session.",
        statusCode: 401,
      },
      { status: 401 },
    );
  }
  try {
    // Frappe's query_report.run returns:
    //   { result: { columns: [...], result: [...], message?, chart? } }
    // Pass filters as a JSON string per Frappe's wire format.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await (client.call as any).get(
      "frappe.desk.query_report.run",
      {
        report_name: reportName,
        filters: JSON.stringify(filters),
      },
    );

    const inner = raw?.result ?? raw?.message ?? raw ?? {};
    const columns: ReportColumn[] = (inner.columns ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => ({
        fieldname: c.fieldname ?? c.field ?? c.label ?? "",
        label: c.label ?? c.fieldname ?? "",
        fieldtype: c.fieldtype ?? "Data",
        options: c.options,
        width: c.width,
      }),
    );
    // Frappe report result rows are arrays (positional) — map them to
    // objects keyed by column fieldname for the UI.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: ReportRow[] = (inner.result ?? []).map((row: any) => {
      if (Array.isArray(row)) {
        const obj: ReportRow = {};
        columns.forEach((col, i) => {
          obj[col.fieldname] = row[i] ?? null;
        });
        return obj;
      }
      // Already an object (some Frappe versions) — pass through.
      return row as ReportRow;
    });

    // Echo the *resolved* period back so the UI can display what the
    // server actually used (which may differ from the URL params when
    // defaults kicked in).
    const echoedPeriod: ReportResponse["period"] = {
      company: String(filters.company ?? period.company),
    };
    if (typeof filters.fiscal_year === "string") {
      echoedPeriod.fiscal_year = filters.fiscal_year;
    }
    if (typeof filters.periodicity === "string") {
      echoedPeriod.periodicity = filters.periodicity;
    }
    if (typeof filters.period_start_date === "string") {
      echoedPeriod.period_start_date = filters.period_start_date;
    }
    if (typeof filters.period_end_date === "string") {
      echoedPeriod.period_end_date = filters.period_end_date;
    }
    if (typeof filters.from_date === "string") {
      echoedPeriod.from_date = filters.from_date;
    }
    if (typeof filters.to_date === "string") {
      echoedPeriod.to_date = filters.to_date;
    }
    if (typeof filters.report_date === "string") {
      echoedPeriod.report_date = filters.report_date;
    }

    const body: ReportResponse = {
      report_name: reportName,
      columns,
      result,
      period: echoedPeriod,
      empty: result.length === 0,
    };

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    const errorResponse = frappeClient.handleError(error);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode ?? 500,
    });
  }
}
