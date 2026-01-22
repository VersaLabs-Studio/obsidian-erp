// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  ClipboardList,
  Package,
  Cog,
  DollarSign,
  CheckCircle2,
  Play,
  Pause,
  Clock,
  Archive,
  XCircle,
  Calendar,
  Factory,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  useFrappeDoc,
  useFrappeDelete,
  useFrappeUpdate,
} from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { WorkOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

// Status configuration
const STATUS_CONFIG = {
  Draft: {
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800",
    icon: Pencil,
  },
  "Not Started": {
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: Clock,
  },
  "In Process": {
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: Play,
  },
  Completed: {
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: CheckCircle2,
  },
  Stopped: {
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: Pause,
  },
  Closed: {
    color: "text-gray-500",
    bg: "bg-gray-100 dark:bg-gray-800",
    icon: Archive,
  },
  Cancelled: {
    color: "text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
    icon: XCircle,
  },
};

export default function WorkOrderDetailPage() {
  const { name } = useParams();
  const router = useRouter();
  const woName = decodeURIComponent(name as string);
  const [showDelete, setShowDelete] = useState(false);

  const {
    data: wo,
    isLoading,
    refetch,
    error,
  } = useFrappeDoc<WorkOrder>("Work Order", woName);

  const deleteMutation = useFrappeDelete("Work Order", {
    onSuccess: () => {
      toast.success("Work Order deleted");
      router.push("/manufacturing/work-order");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useFrappeUpdate("Work Order", {
    onSuccess: () => {
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !wo)
    return (
      <EmptyState
        icon={ClipboardList}
        title="Work Order not found"
        description="The requested work order could not be loaded."
      />
    );

  const statusConfig = STATUS_CONFIG[wo.status] || STATUS_CONFIG.Draft;
  const isDraft = wo.status === "Draft";
  const status = wo.status;

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({
      name: woName,
      data: { docstatus: 1, status: "Not Started" },
    });
    toast.success("Work Order submitted");
  };

  const handleStartProduction = () => {
    router.push(
      `/stock/stock-entry/new?purpose=Material Transfer for Manufacture&work_order=${encodeURIComponent(woName)}`,
    );
  };

  const handleFinishProduction = () => {
    router.push(
      `/stock/stock-entry/new?purpose=Manufacture&work_order=${encodeURIComponent(woName)}`,
    );
  };

  const handleStop = async () => {
    await updateMutation.mutateAsync({
      name: woName,
      data: { status: "Stopped" },
    });
    toast.success("Work Order stopped");
  };

  const handleResume = async () => {
    await updateMutation.mutateAsync({
      name: woName,
      data: { status: "In Process" },
    });
    toast.success("Work Order resumed");
  };

  const handleClose = async () => {
    await updateMutation.mutateAsync({
      name: woName,
      data: { status: "Closed" },
    });
    toast.success("Work Order closed");
  };

  const handleCancel = async () => {
    await updateMutation.mutateAsync({
      name: woName,
      data: { docstatus: 2, status: "Cancelled" },
    });
    toast.success("Work Order cancelled");
  };

  const progress = wo.qty > 0 ? ((wo.produced_qty || 0) / wo.qty) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={wo.name}
        subtitle={wo.item_name || wo.production_item}
        backHref="/manufacturing/work-order"
        icon={<ClipboardList className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/manufacturing/work-order/${encodeURIComponent(woName)}/edit`,
                    )
                  }
                  className="rounded-full h-9"
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="rounded-full h-9 shadow-lg shadow-primary/10"
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Submit
                </Button>
              </>
            )}

            {status === "Not Started" && (
              <Button
                onClick={handleStartProduction}
                className="rounded-full h-9 shadow-lg shadow-primary/10"
              >
                <Play className="h-4 w-4 mr-2" /> Start Production
              </Button>
            )}

            {status === "In Process" && (
              <Button
                onClick={handleFinishProduction}
                className="rounded-full h-9 shadow-lg shadow-primary/10"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Finish Production
              </Button>
            )}

            {["Not Started", "In Process"].includes(status) && (
              <Button
                variant="outline"
                onClick={handleStop}
                className="rounded-full h-9"
              >
                <Pause className="h-4 w-4 mr-2" /> Stop
              </Button>
            )}

            {status === "Stopped" && (
              <Button
                variant="outline"
                onClick={handleResume}
                className="rounded-full h-9"
              >
                <Play className="h-4 w-4 mr-2" /> Resume
              </Button>
            )}

            {status === "Completed" && (
              <Button
                variant="outline"
                onClick={handleClose}
                className="rounded-full h-9"
              >
                <Archive className="h-4 w-4 mr-2" /> Close
              </Button>
            )}

            {status !== "Draft" &&
              !["Cancelled", "Closed"].includes(status) && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="rounded-full h-9 text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancel
                </Button>
              )}

            {isDraft && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDelete(true)}
                className="rounded-full h-9 w-9 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Progress & Summary Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Badge
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border-0",
                statusConfig.bg,
                statusConfig.color,
              )}
            >
              <statusConfig.icon className="h-4 w-4 mr-2" />
              {wo.status}
            </Badge>
            <div className="h-8 w-px bg-border hidden md:block" />
            <div className="text-sm">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-bold">
                {wo.qty} {wo.stock_uom}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Produced: </span>
              <span className="font-bold text-emerald-600">
                {wo.produced_qty || 0} {wo.stock_uom}
              </span>
            </div>
          </div>

          <div className="w-full md:w-64">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground font-medium">
                Production Progress
              </span>
              <span className="font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  progress >= 100
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-primary",
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DataPoint
            icon={<Calendar className="h-4 w-4" />}
            label="Planned Start"
            value={
              wo.planned_start_date
                ? format(parseISO(wo.planned_start_date), "PPP")
                : "—"
            }
          />
          <DataPoint
            icon={<Calendar className="h-4 w-4" />}
            label="Expected End"
            value={
              wo.expected_delivery_date
                ? format(parseISO(wo.expected_delivery_date), "PPP")
                : "—"
            }
          />
          <DataPoint
            icon={<Factory className="h-4 w-4" />}
            label="WIP Warehouse"
            value={wo.wip_warehouse || "—"}
          />
          <DataPoint
            icon={<Package className="h-4 w-4" />}
            label="Target Warehouse"
            value={wo.fg_warehouse}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <InfoCard
            title="Required Materials"
            icon={<Package className="h-5 w-5 text-emerald-500" />}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">Item</th>
                    <th className="text-right py-3 px-2 font-medium">
                      Required
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      Transferred
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      Consumed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wo.required_items?.map((item: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-2">
                        <div className="font-medium">
                          {item.item_name || item.item_code}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.item_code}
                        </div>
                      </td>
                      <td className="text-right py-4 px-2 font-medium">
                        {item.required_qty}
                      </td>
                      <td className="text-right py-4 px-2 text-blue-600">
                        {item.transferred_qty || 0}
                      </td>
                      <td className="text-right py-4 px-2 text-emerald-600">
                        {item.consumed_qty || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>

          {/* Operations Table */}
          {wo.operations && wo.operations.length > 0 && (
            <InfoCard
              title="Production Operations"
              icon={<Cog className="h-5 w-5 text-blue-500" />}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">
                        Operation
                      </th>
                      <th className="text-left py-3 px-2 font-medium">
                        Workstation
                      </th>
                      <th className="text-right py-3 px-2 font-medium">Time</th>
                      <th className="text-right py-3 px-2 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {wo.operations.map((op: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-4 px-2 font-medium">
                          {op.operation}
                        </td>
                        <td className="py-4 px-2 text-muted-foreground">
                          {op.workstation || "—"}
                        </td>
                        <td className="text-right py-4 px-2 font-medium">
                          {op.time_in_mins} min
                        </td>
                        <td className="text-right py-4 px-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-bold tracking-tighter"
                          >
                            {op.status || "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}
        </div>

        <div className="space-y-6">
          {/* Reference Info */}
          <InfoCard
            title="Reference Info"
            icon={<FileText className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <DataPoint label="BOM Selection" value={wo.bom_no} />
              {wo.sales_order && (
                <DataPoint
                  label="Sales Order"
                  value={wo.sales_order}
                  link={`/sales/sales-order/${encodeURIComponent(wo.sales_order)}`}
                />
              )}
              {wo.project && <DataPoint label="Project" value={wo.project} />}
              <DataPoint label="Company" value={wo.company} />
            </div>
          </InfoCard>

          {/* Costs */}
          <InfoCard
            title="Cost & Value"
            icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">
                  Planned Operating Cost
                </span>
                <span className="font-semibold text-sm">
                  ETB{" "}
                  {wo.planned_operating_cost?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">
                  Actual Operating Cost
                </span>
                <span className="font-semibold text-sm text-blue-600">
                  ETB{" "}
                  {wo.actual_operating_cost?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="text-[10px] text-primary/60 uppercase font-bold tracking-widest mb-1">
                  Total Unit Cost (Est)
                </div>
                <div className="text-xl font-bold text-primary">
                  ETB{" "}
                  {((wo.planned_operating_cost || 0) / wo.qty).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2 },
                  )}
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Timestamps */}
          <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 text-[11px] space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>
                {wo.creation ? format(parseISO(wo.creation), "PPpp") : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual Start</span>
              <span>
                {wo.actual_start_date
                  ? format(parseISO(wo.actual_start_date), "PPpp")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual End</span>
              <span>
                {wo.actual_end_date
                  ? format(parseISO(wo.actual_end_date), "PPpp")
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={() => setShowDelete(false)}
        title="Delete Work Order?"
        description={`Are you sure you want to delete "${wo.name}"? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutateAsync(woName)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
