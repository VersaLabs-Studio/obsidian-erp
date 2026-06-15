"use client";

// app/manufacturing/work-order/page.tsx
// Work Order List — KPICard + StatusBadge + card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  ClipboardList,
  Package,
  Calendar,
  Factory,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBadge } from "@/components/smart/status-badge";
import type { WorkOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function getDisplayStatus(wo: WorkOrder): string {
  if (wo.docstatus === 2) return "Cancelled";
  return wo.status || "Draft";
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function WorkOrderCard({
  wo,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  wo: WorkOrder;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(wo);
  const isDraft = wo.docstatus === 0;
  const progress = wo.qty > 0 ? ((wo.produced_qty || 0) / wo.qty) * 100 : 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {wo.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              {wo.item_name || wo.production_item}
            </p>
          </div>
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        {/* Progress Bar */}
        <div className="mb-4 p-3 bg-secondary/20 rounded-xl border border-border/10">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Progress
            </span>
            <span className="text-xs font-bold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress >= 100 ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-bold">
            <span className="text-muted-foreground">
              Produced: {wo.produced_qty || 0}
            </span>
            <span className="text-foreground">Target: {wo.qty}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Planned Start
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {formatDate(wo.planned_start_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              FG Warehouse
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Factory className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{wo.fg_warehouse || "—"}</span>
            </p>
          </div>
        </div>

        {wo.sales_order && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold mb-4">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="truncate">{wo.sales_order}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/50">
            {wo.company}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl border-border/50 shadow-xl bg-popover/95 backdrop-blur-xl p-1.5 min-w-[160px]"
            >
              <DropdownMenuItem
                className="rounded-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {isDraft && (
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {isDraft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function WorkOrderListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);

  const {
    data: workOrders,
    isLoading,
    refetch,
  } = useFrappeList<WorkOrder>("Work Order", {
    fields: [
      "name",
      "status",
      "production_item",
      "item_name",
      "bom_no",
      "company",
      "sales_order",
      "qty",
      "produced_qty",
      "fg_warehouse",
      "planned_start_date",
      "expected_delivery_date",
      "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Work Order", {
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
    },
  });

  const filteredOrders = useMemo(() => {
    if (!workOrders) return [];
    if (statusFilter === "all") return workOrders;
    return workOrders.filter((wo) => getDisplayStatus(wo) === statusFilter);
  }, [workOrders, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!workOrders) return {} as Record<string, number>;
    return workOrders.reduce(
      (acc, wo) => {
        const s = getDisplayStatus(wo);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [workOrders]);

  const kpis = useMemo(() => {
    if (!workOrders) return { total: 0, notStarted: 0, inProcess: 0, completed: 0 };
    return {
      total: workOrders.length,
      notStarted: workOrders.filter((wo) => wo.status === "Not Started").length,
      inProcess: workOrders.filter((wo) => wo.status === "In Process").length,
      completed: workOrders.filter((wo) => wo.status === "Completed").length,
    };
  }, [workOrders]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle={`${filteredOrders.length} order${filteredOrders.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID, item, SO..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/manufacturing/work-order/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard title="Total" value={kpis.total} icon={ClipboardList} isLoading={isLoading} />
        <KPICard title="Not Started" value={kpis.notStarted} icon={Clock} variant="warning" isLoading={isLoading} />
        <KPICard title="In Process" value={kpis.inProcess} icon={Play} variant="default" isLoading={isLoading} />
        <KPICard title="Completed" value={kpis.completed} icon={CheckCircle2} variant="success" isLoading={isLoading} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: workOrders?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Not Started", label: "Not Started", count: statusCounts["Not Started"] || 0 },
          { key: "In Process", label: "In Process", count: statusCounts["In Process"] || 0 },
          { key: "Completed", label: "Completed", count: statusCounts.Completed || 0 },
        ].map((s) => (
          <Button
            key={s.key}
            variant={statusFilter === s.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full gap-2 transition-all",
              statusFilter === s.key
                ? "shadow-lg shadow-primary/20"
                : "hover:bg-secondary/80",
            )}
            onClick={() => setStatusFilter(s.key)}
          >
            {s.label}
            <Badge
              variant="secondary"
              className={cn(
                "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                statusFilter === s.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary",
              )}
            >
              {s.count}
            </Badge>
          </Button>
        ))}
      </div>

      {!workOrders || workOrders.length === 0 ? (
        <EmptyState
          title="No work orders found"
          description="Create your first work order to start production"
          action={
            <Button
              onClick={() => router.push("/manufacturing/work-order/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Work Order
            </Button>
          }
        />
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No work orders match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((wo, index) => (
            <WorkOrderCard
              key={wo.name}
              wo={wo}
              index={index}
              onView={() =>
                router.push(`/manufacturing/work-order/${encodeURIComponent(wo.name)}`)
              }
              onEdit={() =>
                router.push(`/manufacturing/work-order/${encodeURIComponent(wo.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(wo)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Work Order"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
