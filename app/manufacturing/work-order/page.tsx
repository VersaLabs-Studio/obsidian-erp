// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  ClipboardList,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  Eye,
  Package,
  Calendar,
  Factory,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import type { WorkOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO, isPast } from "date-fns";

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

function WorkOrderCard({ wo, index, onView, onEdit, onDelete }) {
  const statusConfig = STATUS_CONFIG[wo.status] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;
  const isOverdue =
    wo.expected_delivery_date &&
    isPast(parseISO(wo.expected_delivery_date)) &&
    !["Completed", "Closed", "Cancelled"].includes(wo.status);
  const progress = wo.qty > 0 ? ((wo.produced_qty || 0) / wo.qty) * 100 : 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
        isOverdue ? "border-red-300 dark:border-red-800" : "border-border/50",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Overdue Badge */}
      {isOverdue && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
          OVERDUE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              statusConfig.bg,
              statusConfig.color,
            )}
          >
            <StatusIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {wo.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {wo.item_name || wo.production_item}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            {wo.status === "Draft" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {wo.status === "Draft" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {wo.produced_qty || 0} / {wo.qty}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progress >= 100 ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          <span className="truncate">{wo.bom_no}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Factory className="h-3.5 w-3.5" />
          <span className="truncate">{wo.fg_warehouse}</span>
        </div>
        {wo.planned_start_date && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(parseISO(wo.planned_start_date), "MMM d")}</span>
          </div>
        )}
        {wo.sales_order && (
          <div className="flex items-center gap-1.5 text-blue-600">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="truncate">{wo.sales_order}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <Badge
          className={cn(
            "rounded-full text-xs",
            statusConfig.bg,
            statusConfig.color,
            "border-0",
          )}
        >
          <StatusIcon className="h-3 w-3 mr-1" />
          {wo.status}
        </Badge>
      </div>
    </div>
  );
}

export default function WorkOrderListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
      "sales_order",
      "qty",
      "produced_qty",
      "fg_warehouse",
      "planned_start_date",
      "expected_delivery_date",
      "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Work Order", {
    onSuccess: () => {
      toast.success("Work Order deleted");
      refetch();
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter((wo) => {
      const matchesSearch =
        !searchTerm ||
        wo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.production_item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.sales_order?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || wo.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workOrders, searchTerm, statusFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: workOrders?.length || 0 };
    workOrders?.forEach((wo) => {
      counts[wo.status] = (counts[wo.status] || 0) + 1;
    });
    return counts;
  }, [workOrders]);

  if (isLoading) return <LoadingState message="Loading work orders..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Manage production commands and track manufacturing progress"
        primaryAction={{
          label: "Create Work Order",
          onClick: () => router.push("/manufacturing/work-order/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="w-full lg:w-auto"
        >
          <TabsList className="bg-secondary/30 p-1 rounded-full flex-wrap h-auto">
            {["all", "Not Started", "In Process", "Completed", "Stopped"].map(
              (s) => (
                <TabsTrigger
                  key={s}
                  value={s}
                  className="rounded-full capitalize data-[state=active]:shadow-sm"
                >
                  {s === "all" ? "All" : s}{" "}
                  {statusCounts[s] ? `(${statusCounts[s]})` : ""}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work orders found"
          description={
            searchTerm
              ? "Try different search terms"
              : "Create your first work order"
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((wo, idx) => (
            <WorkOrderCard
              key={wo.name}
              wo={wo}
              index={idx}
              onView={() =>
                router.push(
                  `/manufacturing/work-order/${encodeURIComponent(wo.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/manufacturing/work-order/${encodeURIComponent(wo.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(wo.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Work Order?"
        description="This cannot be undone."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
