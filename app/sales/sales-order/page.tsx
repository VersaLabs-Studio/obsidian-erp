// app/sales/sales-order/page.tsx
// Obsidian ERP v4.0 - Sales Orders List Page (Premium Card Design)

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
  Eye,
  CalendarDays,
  User,
  Truck,
  Building2,
  DollarSign,
  Package,
  Receipt,
  CheckCircle2,
  XCircle,
  FileText,
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
import { CommandPalette } from "@/components/command/CommandPalette";
import type { SalesOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: React.ElementType; label: string }
> = {
  Draft: {
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: FileText,
    label: "Draft",
  },
  "To Deliver and Bill": {
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
    icon: Truck,
    label: "To Deliver & Bill",
  },
  "To Deliver": {
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
    icon: Package,
    label: "To Deliver",
  },
  "To Bill": {
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/50",
    icon: Receipt,
    label: "To Bill",
  },
  Completed: {
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    icon: CheckCircle2,
    label: "Completed",
  },
  Cancelled: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: XCircle,
    label: "Cancelled",
  },
  Closed: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: XCircle,
    label: "Closed",
  },
};

function getDisplayStatus(order: SalesOrder): string {
  if (order.docstatus === 2) return "Cancelled";
  return order.status || "Draft";
}

function SalesOrderCard({
  order,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  order: SalesOrder;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(order);
  const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isEditable = order.status === "Draft" && order.docstatus === 0;
  const isDeletable = order.docstatus === 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      {/* Status Indicator Bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          displayStatus === "Draft" && "bg-slate-400",
          displayStatus === "To Deliver and Bill" && "bg-blue-500",
          displayStatus === "To Deliver" && "bg-amber-500",
          displayStatus === "To Bill" && "bg-purple-500",
          displayStatus === "Completed" && "bg-emerald-500",
          displayStatus === "Cancelled" && "bg-muted-foreground/50",
          displayStatus === "Closed" && "bg-muted-foreground/50"
        )}
      />

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {order.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {order.customer_name || order.customer || "No customer"}
            </p>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(order.transaction_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Delivery Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Truck className="h-3 w-3 text-muted-foreground" />
              {formatDate(order.delivery_date ?? "")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{order.company || "—"}</span>
            </p>
          </div>
        </div>

        {/* Footer with Amount and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {/* Grand Total */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                Grand Total
              </p>
              <p className="text-lg font-bold text-foreground tracking-tight">
                {formatCurrency(order.grand_total ?? 0)}
              </p>
            </div>
          </div>

          {/* Actions */}
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
              {isEditable && (
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
              {isDeletable && (
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

export default function SalesOrderListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);

  const {
    data: orders,
    isLoading,
    error,
  } = useFrappeList<SalesOrder>("Sales Order", {
    fields: [
      "name",
      "customer",
      "customer_name",
      "transaction_date",
      "delivery_date",
      "grand_total",
      "status",
      "docstatus",
      "company",
      "per_delivered",
      "per_billed",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Sales Order", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = orders;

    if (statusFilter !== "all") {
      result = result.filter((o) => {
        const displayStatus = getDisplayStatus(o);
        return displayStatus === statusFilter;
      });
    }

    return result;
  }, [orders, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!orders) return {};
    return orders.reduce((acc, o) => {
      const status = getDisplayStatus(o);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [orders]);

  const kpis = useMemo(() => {
    if (!orders) return { total: 0, draft: 0, active: 0, completed: 0 };
    return {
      total: orders.length,
      draft: orders.filter((o) => o.status === "Draft").length,
      active: orders.filter((o) =>
        ["To Deliver and Bill", "To Deliver", "To Bill"].includes(o.status)
      ).length,
      completed: orders.filter((o) => o.status === "Completed").length,
    };
  }, [orders]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load sales orders
      </div>
    );

  return (
    <div className="space-y-6">
      <CommandPalette />

      <PageHeader
        title="Sales Orders"
        subtitle={`${filteredOrders.length} order${
          filteredOrders.length !== 1 ? "s" : ""
        }`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID, customer..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/sales/sales-order/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Sales Order
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Orders"
          value={kpis.total}
          icon={Package}
          isLoading={isLoading}
        />
        <KPICard
          title="Draft"
          value={kpis.draft}
          icon={FileText}
          variant="warning"
          isLoading={isLoading}
        />
        <KPICard
          title="Active"
          value={kpis.active}
          icon={Truck}
          variant="default"
          isLoading={isLoading}
        />
        <KPICard
          title="Completed"
          value={kpis.completed}
          icon={CheckCircle2}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: orders?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          {
            key: "To Deliver and Bill",
            label: "To Deliver & Bill",
            count: statusCounts["To Deliver and Bill"] || 0,
          },
          {
            key: "To Deliver",
            label: "To Deliver",
            count: statusCounts["To Deliver"] || 0,
          },
          {
            key: "To Bill",
            label: "To Bill",
            count: statusCounts["To Bill"] || 0,
          },
          {
            key: "Completed",
            label: "Completed",
            count: statusCounts.Completed || 0,
          },
        ].map((status) => (
          <Button
            key={status.key}
            variant={statusFilter === status.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full gap-2 transition-all",
              statusFilter === status.key
                ? "shadow-lg shadow-primary/20"
                : "hover:bg-secondary/80"
            )}
            onClick={() => setStatusFilter(status.key)}
          >
            {status.label}
            <Badge
              variant="secondary"
              className={cn(
                "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                statusFilter === status.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary"
              )}
            >
              {status.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Sales Orders Grid */}
      {!orders || orders.length === 0 ? (
        <EmptyState
          title="No sales orders found"
          description="Create your first sales order to start tracking fulfillment"
          action={
            <Button
              onClick={() => router.push("/sales/sales-order/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Sales Order
            </Button>
          }
        />
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No sales orders match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order, index) => (
            <SalesOrderCard
              key={order.name}
              order={order}
              index={index}
              onView={() =>
                router.push(
                  `/sales/sales-order/${encodeURIComponent(order.name)}`
                )
              }
              onEdit={() =>
                router.push(
                  `/sales/sales-order/${encodeURIComponent(order.name)}/edit`
                )
              }
              onDelete={() => setDeleteTarget(order)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Sales Order"
        description={`Are you sure you want to delete sales order "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
