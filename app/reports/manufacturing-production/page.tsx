"use client";

// app/reports/manufacturing-production/page.tsx
// Obsidian ERP v4.0 — Phase 2Y Part 7: Manufacturing Production Summary.

import { useMemo } from "react";
import { Factory, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { ReportScaffold } from "@/components/reports/ReportScaffold";
import { StatusBadge } from "@/components/smart/status-badge";
import { LoadingState, EmptyState } from "@/components/smart";
import { cn } from "@/lib/utils";

interface WorkOrder {
  name: string;
  production_item?: string;
  qty?: number;
  produced_qty?: number;
  status: string;
}

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ManufacturingProductionReportPage() {
  const { data: workOrders, isLoading } = useFrappeList<WorkOrder>("Work Order", {
    fields: ["name", "production_item", "qty", "produced_qty", "status"],
    orderBy: { field: "creation", order: "desc" },
    limit: 200,
  });

  const total = workOrders?.length ?? 0;
  const inProduction = useMemo(() => (workOrders ?? []).filter((w) => w.status === "In Process" || w.status === "Work In Progress").length, [workOrders]);
  const completed = useMemo(() => (workOrders ?? []).filter((w) => w.status === "Completed").length, [workOrders]);
  const pending = useMemo(() => (workOrders ?? []).filter((w) => w.status === "Not Started" || w.status === "Open").length, [workOrders]);

  return (
    <ReportScaffold
      title="Manufacturing Production"
      description="Work order progress and production output across all lines"
      icon={Factory}
      isLoading={isLoading}
      kpis={[
        { title: "Total WOs", value: total, icon: Factory },
        { title: "In Production", value: inProduction, icon: Clock, variant: "warning" as const },
        { title: "Completed", value: completed, icon: CheckCircle2, variant: "success" as const },
        { title: "Pending", value: pending, icon: AlertTriangle, variant: pending > 0 ? ("danger" as const) : ("success" as const) },
      ]}
    >
      {isLoading ? (
        <LoadingState rows={8} variant="table" />
      ) : !workOrders || workOrders.length === 0 ? (
        <EmptyState title="No work orders" description="Create work orders from the Sales Order cockpit to start production" variant="no-data" />
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-secondary/20">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Work Order</th>
                  <th className="px-4 py-3 text-left font-semibold">Item</th>
                  <th className="px-4 py-3 text-right font-semibold">Ordered</th>
                  <th className="px-4 py-3 text-right font-semibold">Produced</th>
                  <th className="px-4 py-3 text-left font-semibold">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {workOrders.map((wo) => {
                  const pct = wo.qty ? Math.min(Math.round(((wo.produced_qty ?? 0) / wo.qty) * 100), 100) : 0;
                  return (
                    <tr key={wo.name} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{wo.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{wo.production_item}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{wo.qty ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{wo.produced_qty ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-secondary/50 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-primary")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportScaffold>
  );
}
