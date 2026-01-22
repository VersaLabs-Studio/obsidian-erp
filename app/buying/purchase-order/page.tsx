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
  ShoppingCart,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Truck,
  FileSearch,
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
import type { PurchaseOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Pencil },
  "To Receive and Bill": {
    color: "text-amber-600",
    bg: "bg-amber-100",
    icon: Truck,
  },
  "To Receive": { color: "text-blue-600", bg: "bg-blue-100", icon: Truck },
  "To Bill": {
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    icon: CreditCard,
  },
  Completed: {
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    icon: CheckCircle2,
  },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

function PurchaseOrderCard({
  order,
  index,
  onView,
  onEdit,
  onDelete,
  onReceive,
}) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;
  const isDraft = order.docstatus === 0;
  const progress = order.per_received || 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-[2rem] border border-border/50 p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {order.name}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono font-bold uppercase tracking-tight">
            {order.supplier_name}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/5"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="rounded-xl"
            >
              <Eye className="h-4 w-4 mr-2" /> View Order
            </DropdownMenuItem>
            {isDraft && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="rounded-xl"
              >
                <Pencil className="h-4 w-4 mr-2" /> Edit Draft
              </DropdownMenuItem>
            )}
            {order.docstatus === 1 && order.per_received < 100 && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onReceive();
                }}
                className="rounded-xl text-primary font-bold"
              >
                <Truck className="h-4 w-4 mr-2" /> Record Receipt
              </DropdownMenuItem>
            )}
            {isDraft && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="rounded-xl text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress */}
      {progress > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase tracking-tighter">
            <span className="text-muted-foreground">Received</span>
            <span className="text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                progress >= 100 ? "bg-emerald-500" : "bg-blue-500",
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Data Points */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {order.transaction_date
                ? format(parseISO(order.transaction_date), "MMM d")
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground font-bold">
            <CreditCard className="h-3.5 w-3.5 rotate-12" />
            <span>
              {order.currency} {order.grand_total?.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/50">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase truncate">
            {order.company}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border/50 flex justify-between items-center">
        <Badge
          className={cn(
            "rounded-full text-[10px] font-black px-3 border-0 shadow-sm",
            statusConfig.bg,
            statusConfig.color,
          )}
        >
          <StatusIcon className="h-3 w-3 mr-1.5" />
          {order.status}
        </Badge>
        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrderListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
      "per_received",
      "per_billed",
      "docstatus",
      "company",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Purchase Order", {
    onSuccess: () => {
      toast.success("Order deleted");
      refetch();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      const matchesSearch =
        o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  if (isLoading) return <LoadingState type="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage and track procurement contracts and deliveries"
        primaryAction={{
          label: "Create Order",
          onClick: () => router.push("/buying/purchase-order/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="bg-card rounded-[2rem] border border-border/50 p-2 shadow-sm flex flex-col xl:flex-row gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by ID or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-[1.5rem] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="xl:w-auto"
        >
          <TabsList className="bg-secondary/30 p-1 rounded-[1.5rem] h-12 flex-wrap lg:flex-nowrap">
            <TabsTrigger
              value="all"
              className="rounded-full px-5 h-10 font-bold"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="To Receive"
              className="rounded-full px-5 h-10 font-bold"
            >
              To Receive
            </TabsTrigger>
            <TabsTrigger
              value="Completed"
              className="rounded-full px-5 h-10 font-bold"
            >
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchase orders found"
          description={
            searchTerm
              ? "Try adjusting your filters"
              : "Generate official orders to your suppliers for needed materials"
          }
          action={
            searchTerm
              ? undefined
              : {
                  label: "New Order",
                  onClick: () => router.push("/buying/purchase-order/new"),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((order, idx) => (
            <PurchaseOrderCard
              key={order.name}
              order={order}
              index={idx}
              onView={() =>
                router.push(
                  `/buying/purchase-order/${encodeURIComponent(order.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/buying/purchase-order/${encodeURIComponent(order.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(order.name)}
              onReceive={() =>
                router.push(
                  `/stock/stock-entry/new?purchase_order=${encodeURIComponent(order.name)}&purpose=Material Receipt`,
                )
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Purchase Order?"
        description="Only draft orders can be deleted. This will permanently remove the record."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
