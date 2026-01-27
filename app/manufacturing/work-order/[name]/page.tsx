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
  ArrowUpRight,
  Eye,
  ArrowRightLeft,
  LayoutDashboard,
  BarChart3,
  Plus,
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
import { useState, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { WorkOrder, SalesOrder, Bom } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

// Status configuration
const STATUS_CONFIG = {
  Draft: {
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
    icon: Pencil,
  },
  "Not Started": {
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    border: "border-amber-200 dark:border-amber-800/50",
    icon: Clock,
  },
  "In Process": {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/10",
    border: "border-blue-200 dark:border-blue-800/50",
    icon: Play,
  },
  Completed: {
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/50",
    icon: CheckCircle2,
  },
  Stopped: {
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/10",
    border: "border-red-200 dark:border-red-800/50",
    icon: Pause,
  },
  Closed: {
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200 dark:border-gray-700",
    icon: Archive,
  },
  Cancelled: {
    color: "text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200 dark:border-gray-700",
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

  // Fetch related Sales Order for more details
  const { data: soDetails } = useFrappeDoc<SalesOrder>(
    "Sales Order",
    wo?.sales_order || "",
    {
      enabled: !!wo?.sales_order,
    },
  );

  // Fetch related BOM for costing logic
  const { data: bomData } = useFrappeDoc<Bom>("BOM", wo?.bom_no || "", {
    enabled: !!wo?.bom_no,
  });

  const costing = useMemo(() => {
    if (!wo || !bomData)
      return {
        operating: wo?.planned_operating_cost || 0,
        material: 0,
        total: 0,
      };
    const ratio = wo.qty / (bomData.quantity || 1);
    // Use doc value if available, otherwise fallback to recipe calculation
    const operating =
      wo.planned_operating_cost || (bomData.operating_cost || 0) * ratio;
    const material = (bomData.raw_material_cost || 0) * ratio;
    return {
      operating,
      material,
      total: (operating + material) / wo.qty,
    };
  }, [wo, bomData]);

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

            {(status === "Not Started" || status === "In Process") && (
              <Button
                variant="outline"
                className="rounded-full h-9"
                onClick={() =>
                  router.push(
                    `/stock/material-request/new?work_order=${encodeURIComponent(woName)}&type=Purchase`,
                  )
                }
              >
                <Plus className="h-4 w-4 mr-2" /> Request Materials
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
                "px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm",
                statusConfig.bg,
                statusConfig.color,
                statusConfig.border,
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
              <span className="text-muted-foreground font-medium uppercase tracking-tighter">
                Production Progress
              </span>
              <span className="font-bold text-primary">
                {Math.round(progress)}%
              </span>
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
            icon={<Calendar className="h-4 w-4 text-blue-500" />}
            label="Planned Start"
            value={
              wo.planned_start_date
                ? format(parseISO(wo.planned_start_date), "PPP")
                : "—"
            }
          />
          <DataPoint
            icon={<Calendar className="h-4 w-4 text-emerald-500" />}
            label="Expected End"
            value={
              wo.expected_delivery_date
                ? format(parseISO(wo.expected_delivery_date), "PPP")
                : "—"
            }
          />
          <DataPoint
            icon={<Factory className="h-4 w-4 text-amber-500" />}
            label="WIP Warehouse"
            value={wo.wip_warehouse || "—"}
          />
          <DataPoint
            icon={<Package className="h-4 w-4 text-primary" />}
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
                    <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Item
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Required
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Transferred
                    </th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                      Consumed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wo.required_items?.map((item: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-b border-border/20 hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-4 px-2">
                        <div className="font-bold text-foreground">
                          {item.item_name || item.item_code}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {item.item_code}
                        </div>
                      </td>
                      <td className="text-right py-4 px-2 font-black">
                        {item.required_qty}
                      </td>
                      <td className="text-right py-4 px-2 text-blue-600 font-bold">
                        {item.transferred_qty || 0}
                      </td>
                      <td className="text-right py-4 px-2 text-emerald-600 font-bold">
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
                      <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                        Operation
                      </th>
                      <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                        Workstation
                      </th>
                      <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
                        Time
                      </th>
                      <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">
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
                        <td className="py-4 px-2 font-bold text-foreground">
                          {op.operation}
                        </td>
                        <td className="py-4 px-2 text-muted-foreground text-[13px]">
                          {op.workstation || "—"}
                        </td>
                        <td className="text-right py-4 px-2 font-bold">
                          {op.time_in_mins} min
                        </td>
                        <td className="text-right py-4 px-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-black tracking-tighter"
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
            title="Traceability & Linked Docs"
            icon={<FileText className="h-5 w-5 text-indigo-500" />}
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">
                  Active Recipe
                </p>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border/50 group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background shadow-sm group-hover:bg-primary/5 transition-colors">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[150px]">
                        {wo.bom_no}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">
                        Standard Production Recipe
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="rounded-full shadow-none group-hover:text-primary"
                  >
                    <Link
                      href={`/manufacturing/bom/${encodeURIComponent(wo.bom_no)}`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {wo.sales_order && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest px-1">
                    Demand Source
                  </p>
                  <div className="p-4 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 group hover:border-indigo-500/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[11px] font-bold text-indigo-600 mb-0.5">
                          {wo.sales_order}
                        </p>
                        <p className="text-[13px] font-black tracking-tight">
                          {soDetails?.customer_name ||
                            soDetails?.customer ||
                            "Standard Order"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] h-5 bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                      >
                        {soDetails?.status || "Linked"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full rounded-xl bg-black dark:bg-white border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all gap-2"
                    >
                      <Link
                        href={`/sales/sales-order/${encodeURIComponent(wo.sales_order)}`}
                      >
                        <Eye className="h-3 w-3" /> View Sales Order
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className="rounded-xl h-10 border border-border/50 hover:bg-primary/5 hover:text-primary transition-all"
                >
                  <Link
                    href={`/manufacturing/job-card?work_order=${encodeURIComponent(woName)}`}
                  >
                    <Clock className="h-3.5 w-3.5 mr-2" /> Job Cards
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className="rounded-xl h-10 border border-border/50 hover:bg-primary/5 hover:text-primary transition-all"
                >
                  <Link
                    href={`/stock/stock-entry?work_order=${encodeURIComponent(woName)}`}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Stock Logs
                  </Link>
                </Button>
              </div>

              {wo.project && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full rounded-xl border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white group transition-all h-10"
                  >
                    <Link
                      href={`/projects/project/${encodeURIComponent(wo.project)}`}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> View
                      Project Dashboard
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Costs */}
          <InfoCard
            title="Production Analytics"
            icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground font-medium">
                  Planned Operating Cost
                </span>
                <span className="font-black text-sm">
                  ETB{" "}
                  {costing.operating.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground font-medium">
                  Raw Material Cost
                </span>
                <span className="font-black text-sm text-emerald-600">
                  ETB{" "}
                  {costing.material.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground font-medium">
                  Actual Operating Cost
                </span>
                <span className="font-bold text-sm text-blue-600">
                  ETB{" "}
                  {wo.actual_operating_cost?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 shadow-inner relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="text-[10px] text-primary/60 uppercase font-black tracking-[0.2em] mb-2">
                    Estimated Unit Cost
                  </div>
                  <div className="text-3xl font-black text-primary tracking-tighter">
                    ETB{" "}
                    {costing.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign className="h-12 w-12 text-primary rotate-12" />
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Timestamps */}
          <div className="bg-muted/10 p-6 rounded-[2rem] border border-border/50 text-[11px] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">
                Booking Creation
              </span>
              <span className="font-bold">
                {wo.creation
                  ? format(parseISO(wo.creation), "MMM d, yyyy HH:mm")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">
                Actual Start Date
              </span>
              <span className="font-bold">
                {wo.actual_start_date
                  ? format(parseISO(wo.actual_start_date), "MMM d, yyyy HH:mm")
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">
                Final Completion
              </span>
              <span className="font-bold">
                {wo.actual_end_date
                  ? format(parseISO(wo.actual_end_date), "MMM d, yyyy HH:mm")
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
        description={`Are you sure you want to delete "${wo.name}"? This action cannot be undone and will remove all production logs associated.`}
        onConfirm={() => deleteMutation.mutateAsync(woName)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
