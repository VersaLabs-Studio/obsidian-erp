// components/dashboard/aging-bars.tsx
// Obsidian ERP v4.0 — AR/AP Aging stacked-bars chart (2P Part 4).
//
// Spec: "AR/AP aging — small horizontal stacked bars (0-30/30-60/60-90/
// 90+), --color-success → warning → destructive ramp." Recharts
// BarChart with horizontal layout (layout="vertical" + dataKey="party")
// and 4 series (one per bucket). Used on the Accounting hub and the
// AR/AP report pages. Counts come from real AR/AP aggregates.

"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SkeletonLine } from "@/components/ui/skeleton";

export interface AgingRow {
  /** Optional label per row (e.g. customer name, supplier name, or
   *  a "Total" row). When omitted, the chart renders a single
   *  stacked bar summing all buckets. */
  label: string;
  /** 0-30 days */
  bucket1: number;
  /** 31-60 */
  bucket2: number;
  /** 61-90 */
  bucket3: number;
  /** 90+ */
  bucket4: number;
}

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

const BUCKET_COLORS = {
  // The handoff's "success → warning → destructive ramp" — but in
  // semantic OKLCH tokens via CSS vars (no hardcoded hex).
  bucket1: "hsl(var(--success))",
  bucket2: "hsl(var(--info))",
  bucket3: "hsl(var(--warning))",
  bucket4: "hsl(var(--destructive))",
} as const;

export function AgingBars({
  data,
  isLoading = false,
  title = "AR / AP aging",
  subtitle,
}: {
  data: AgingRow[];
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const hasRows = data.length > 0;
  const totals = useMemo(() => {
    return data.reduce(
      (acc, r) => ({
        bucket1: acc.bucket1 + r.bucket1,
        bucket2: acc.bucket2 + r.bucket2,
        bucket3: acc.bucket3 + r.bucket3,
        bucket4: acc.bucket4 + r.bucket4,
      }),
      { bucket1: 0, bucket2: 0, bucket3: 0, bucket4: 0 },
    );
  }, [data]);

  return (
    <div
      className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
      data-testid="aging-bars"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <SkeletonLine className="h-32 w-full" />
        </div>
      ) : !hasRows ? (
        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
          No outstanding balances.
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : Math.abs(v) >= 1_000
                      ? `${(v / 1_000).toFixed(0)}k`
                      : String(v)
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border) / 0.4)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => ETB.format(v)}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="bucket1" name="0–30" stackId="aging" fill={BUCKET_COLORS.bucket1} />
              <Bar dataKey="bucket2" name="31–60" stackId="aging" fill={BUCKET_COLORS.bucket2} />
              <Bar dataKey="bucket3" name="61–90" stackId="aging" fill={BUCKET_COLORS.bucket3} />
              <Bar dataKey="bucket4" name="90+" stackId="aging" fill={BUCKET_COLORS.bucket4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Summary line — total by bucket, used when the chart has > 1
          row (otherwise the bar itself shows the total). */}
      {hasRows && data.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
          {(["bucket1", "bucket2", "bucket3", "bucket4"] as const).map(
            (k, i) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-secondary/20 px-2 py-1"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: BUCKET_COLORS[k] }}
                />
                {["0–30", "31–60", "61–90", "90+"][i]}:{" "}
                <strong className="tabular-nums text-foreground">
                  {ETB.format(totals[k])}
                </strong>
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
