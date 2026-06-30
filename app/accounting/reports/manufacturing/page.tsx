"use client";

// app/accounting/reports/manufacturing/page.tsx
// 2T §4 — Manufacturing Report: recent Work Orders, throughput, status breakdown.
// Actionable callouts for stuck WOs and completion rates.

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Factory,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkOrder } from "@/types/doctype-types";

export default function ManufacturingReportPage() {
  const router = useRouter();

  const { data: workOrders, isLoading } = useFrappeList<WorkOrder>(
    "Work Order",
    {
      fields: ["name", "production_item", "item_name", "qty", "produced_qty", "status", "docstatus", "planned_start_date", "sales_order", "company"],
      orderBy: { field: "creation", order: "desc" },
      limit: 200,
    },
  );

  const woList = workOrders ?? [];

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const wo of woList) {
      const s = wo.status || "Draft";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [woList]);

  const stuckWOs = useMemo(
    () => woList.filter((wo) => wo.status === "Not Started" && wo.docstatus === 1),
    [woList],
  );

  const inProcessWOs = useMemo(
    () => woList.filter((wo) => wo.status === "In Process"),
    [woList],
  );

  const completedWOs = useMemo(
    () => woList.filter((wo) => wo.status === "Completed"),
    [woList],
  );

  const completionRate = useMemo(() => {
    const submitted = woList.filter((wo) => wo.docstatus === 1).length;
    if (submitted === 0) return 0;
    return Math.round((completedWOs.length / submitted) * 100);
  }, [woList, completedWOs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Manufacturing Report"
        subtitle={`${woList.length} Work Orders tracked`}
        backHref="/accounting/reports"
      />

      {/* Actionable Callout: Stuck WOs */}
      {stuckWOs.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {stuckWOs.length} submitted Work Order{stuckWOs.length !== 1 ? "s" : ""} not yet started
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                These WOs are waiting for material transfer or production start.
              </p>
            </div>
            <Badge variant="destructive" className="shrink-0">
              {stuckWOs.length}
            </Badge>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="Total WOs">
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {woList.length}
          </div>
        </InfoCard>
        <InfoCard title="In Process">
          <div className="text-2xl font-bold tabular-nums text-blue-500">
            {inProcessWOs.length}
          </div>
        </InfoCard>
        <InfoCard title="Completed">
          <div className="text-2xl font-bold tabular-nums text-emerald-500">
            {completedWOs.length}
          </div>
        </InfoCard>
        <InfoCard title="Completion Rate">
          <div className="text-2xl font-bold tabular-nums text-primary">
            {completionRate}%
          </div>
        </InfoCard>
      </div>

      {/* Status Breakdown */}
      <InfoCard title="Status Breakdown" icon={<Factory className="h-5 w-5 text-primary" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(statusBreakdown).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-center"
            >
              <div className="text-lg font-bold tabular-nums text-foreground">{count}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {status}
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      {/* Recent Work Orders Table */}
      <InfoCard title="Recent Work Orders" icon={<Factory className="h-5 w-5 text-blue-500" />}>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-secondary/20">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-semibold">WO #</th>
                <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                <th className="px-3 py-2.5 text-right font-semibold">Produced</th>
                <th className="px-3 py-2.5 text-center font-semibold">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {woList.slice(0, 50).map((wo) => (
                <tr key={wo.name} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-foreground font-mono text-xs">
                    {wo.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{wo.item_name || wo.production_item}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{wo.qty}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{wo.produced_qty || 0}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge
                      variant={
                        wo.status === "Completed"
                          ? "default"
                          : wo.status === "In Process"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-[10px] uppercase font-black tracking-tighter"
                    >
                      {wo.status || "Draft"}
                    </Badge>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => router.push(`/manufacturing/work-order/${encodeURIComponent(wo.name)}`)}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
    </div>
  );
}
