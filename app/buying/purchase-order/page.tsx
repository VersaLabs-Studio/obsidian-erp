"use client";

// app/buying/purchase-order/page.tsx
// Obsidian ERP v4.0 — Purchase Order List (Golden Template)
// KPI cards, StatusBadge, card grid. OKLCH tokens only.

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
  Truck,
  Building2,
  DollarSign,
  Package,
  CheckCircle2,
  FileText,
  ArrowRight,
  Clock,
  ShoppingCart,
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
import type { PurchaseOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function getDisplayStatus(order: PurchaseOrder): string {
  if (order.docstatus === 2) return "Cancelled";
  return order.status || "Draft";
}

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PurchaseOrderCard({
  order,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  order: PurchaseOrder;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(order);
  const isDraft = order.docstatus === 0;

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
                {order.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Truck className="h-3 w-3" />
              {order.supplier_name || order.supplier || "No supplier"}
            </p>
          </div>
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Order Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(order.transaction_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Schedule Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {formatDate(order.schedule_date)}
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

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                Grand Total
              </p>
              <p className="text-lg font-bold text-foreground tracking-tight">
                {ETB.format(order.grand_total ?? 0)}
              </p>
            </div>
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

export default function PurchaseOrderListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);

  const {
    data: orders,
    isLoading,
    refetch,
  } = useFrappeList<PurchaseOrder>("Purchase Order", {
    fields: [
      "name",
      "supplier",
      "supplier_name",
      "status",
      "grand_total",
      "currency",
      "transaction_date",
      "schedule_date",
      "per_received",
      "per_billed",
      "docstatus",
      "company",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Purchase Order", {
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === "all") return orders;
    return orders.filter((o) => getDisplayStatus(o) === statusFilter);
  }, [orders, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!orders) return {} as Record<string, number>;
    return orders.reduce(
      (acc, o) => {
        const s = getDisplayStatus(o);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [orders]);

  const kpis = useMemo(() => {
    if (!orders) return { total: 0, draft: 0, pendingApproval: 0, toReceive: 0 };
    return {
      total: orders.length,
      draft: orders.filter((o) => o.status === "Draft").length,
      pendingApproval: orders.filter((o) => o.status === "Pending Approval").length,
      toReceive: orders.filter((o) =>
        ["To Receive and Bill", "To Receive"].includes(o.status),
      ).length,
    };
  }, [orders]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle={`${filteredOrders.length} order${filteredOrders.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID, supplier..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/buying/purchase-order/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Order
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard title="Total Orders" value={kpis.total} icon={Package} isLoading={isLoading} />
        <KPICard title="Draft" value={kpis.draft} icon={FileText} variant="warning" isLoading={isLoading} />
        <KPICard title="Pending Approval" value={kpis.pendingApproval} icon={Clock} variant="default" isLoading={isLoading} />
        <KPICard title="To Receive" value={kpis.toReceive} icon={Truck} variant="default" isLoading={isLoading} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: orders?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Pending Approval", label: "Pending Approval", count: statusCounts["Pending Approval"] || 0 },
          { key: "To Receive and Bill", label: "To Receive & Bill", count: statusCounts["To Receive and Bill"] || 0 },
          { key: "To Receive", label: "To Receive", count: statusCounts["To Receive"] || 0 },
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

      {!orders || orders.length === 0 ? (
        <EmptyState
          title="No purchase orders found"
          description="Create your first purchase order to start procurement"
          action={
            <Button
              onClick={() => router.push("/buying/purchase-order/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          }
        />
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No purchase orders match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order, index) => (
            <PurchaseOrderCard
              key={order.name}
              order={order}
              index={index}
              onView={() =>
                router.push(`/buying/purchase-order/${encodeURIComponent(order.name)}`)
              }
              onEdit={() =>
                router.push(`/buying/purchase-order/${encodeURIComponent(order.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(order)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Purchase Order"
        description={`Are you sure you want to delete purchase order "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
