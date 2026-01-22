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
  FileInput,
  ShoppingCart,
  ArrowRightLeft,
  LogOut,
  Factory,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Package,
  Calendar,
  TrendingUp,
  Building2,
  ArrowUpRight,
  StopCircle,
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
import type { MaterialRequest } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const TYPE_CONFIG = {
  Purchase: {
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    icon: ShoppingCart,
  },
  "Material Transfer": {
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/20",
    icon: ArrowRightLeft,
  },
  "Material Issue": {
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/20",
    icon: LogOut,
  },
  Manufacture: {
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/20",
    icon: Factory,
  },
  "Customer Provided": {
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/20",
    icon: UserCheck,
  },
};

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Pencil },
  Pending: { color: "text-amber-600", bg: "bg-amber-100", icon: Clock },
  "Partially Ordered": {
    color: "text-blue-600",
    bg: "bg-blue-100",
    icon: TrendingUp,
  },
  Ordered: {
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    icon: CheckCircle2,
  },
  Transferred: {
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    icon: CheckCircle2,
  },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
  Stopped: { color: "text-red-600", bg: "bg-red-100", icon: StopCircle },
};

function MaterialRequestCard({
  mr,
  index,
  onView,
  onEdit,
  onDelete,
  onCreatePO,
  onCreateSE,
}) {
  const typeConfig =
    TYPE_CONFIG[mr.material_request_type] || TYPE_CONFIG.Purchase;
  const statusConfig = STATUS_CONFIG[mr.status] || STATUS_CONFIG.Draft;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  const isDraft = mr.status === "Draft" || mr.docstatus === 0;
  const progress = mr.per_ordered || mr.per_received || 0;

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
      {/* Type Badge */}
      <div
        className={cn(
          "absolute -top-2 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
          typeConfig.bg,
          typeConfig.color,
          "border-current/10 shadow-sm",
        )}
      >
        <TypeIcon className="h-3 w-3 inline mr-1.5" />
        {mr.material_request_type}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mt-3 mb-4">
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {mr.name}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium font-mono uppercase">
            {mr.transaction_date
              ? format(parseISO(mr.transaction_date), "MMM d, yyyy")
              : "—"}
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
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            {isDraft && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="rounded-xl"
              >
                <Pencil className="h-4 w-4 mr-2" /> Edit Request
              </DropdownMenuItem>
            )}
            {mr.material_request_type === "Purchase" && mr.docstatus === 1 && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onCreatePO();
                }}
                className="rounded-xl text-primary font-bold"
              >
                <ShoppingCart className="h-4 w-4 mr-2" /> Create Purchase Order
              </DropdownMenuItem>
            )}
            {mr.material_request_type === "Material Transfer" &&
              mr.docstatus === 1 && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSE();
                  }}
                  className="rounded-xl text-primary font-bold"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" /> Create Stock
                  Transfer
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
            <span className="text-muted-foreground">Fulfillment</span>
            <span className="text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                progress >= 100 ? "bg-emerald-500 shadow-sm" : "bg-primary",
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-3 text-xs mb-5">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30 border border-border/50">
          <div className="p-1.5 rounded-lg bg-background shadow-sm">
            <Building2 className="h-3 w-3 text-muted-foreground" />
          </div>
          <span className="font-bold truncate text-muted-foreground uppercase tracking-tight">
            {mr.company}
          </span>
        </div>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium tracking-tight">
              Due:{" "}
              {mr.schedule_date
                ? format(parseISO(mr.schedule_date), "MMM d")
                : "—"}
            </span>
          </div>
          {mr.work_order && (
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold bg-indigo-500/5 px-2 py-1 rounded-full border border-indigo-500/10">
              <Factory className="h-3 w-3" />
              <span className="truncate max-w-[80px] text-[10px]">
                {mr.work_order}
              </span>
            </div>
          )}
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
          {mr.status}
        </Badge>
        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default function MaterialRequestListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: requests,
    isLoading,
    refetch,
  } = useFrappeList<MaterialRequest>("Material Request", {
    fields: [
      "name",
      "material_request_type",
      "status",
      "per_ordered",
      "per_received",
      "company",
      "transaction_date",
      "schedule_date",
      "work_order",
      "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Material Request", {
    onSuccess: () => {
      toast.success("Material Request deleted");
      refetch();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests.filter((mr) => {
      const matchesSearch =
        !searchTerm ||
        mr.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mr.work_order?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        typeFilter === "all" || mr.material_request_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [requests, searchTerm, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests?.length || 0 };
    requests?.forEach((mr) => {
      counts[mr.material_request_type] =
        (counts[mr.material_request_type] || 0) + 1;
    });
    return counts;
  }, [requests]);

  if (isLoading) return <LoadingState type="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Requests"
        subtitle="Manage inventory requirements and purchasing demand"
        primaryAction={{
          label: "Create Request",
          onClick: () => router.push("/stock/material-request/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="bg-card rounded-[2rem] border border-border/50 p-2 shadow-sm flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by request ID or work order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-[1.5rem] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <Tabs
          value={typeFilter}
          onValueChange={setTypeFilter}
          className="lg:w-auto"
        >
          <TabsList className="bg-secondary/30 p-1 rounded-[1.5rem] h-12 flex-wrap lg:flex-nowrap">
            <TabsTrigger
              value="all"
              className="rounded-full px-5 h-10 font-bold"
            >
              All ({typeCounts.all || 0})
            </TabsTrigger>
            <TabsTrigger
              value="Purchase"
              className="rounded-full px-5 h-10 font-bold"
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-2" /> Purchase
            </TabsTrigger>
            <TabsTrigger
              value="Material Transfer"
              className="rounded-full px-5 h-10 font-bold"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Transfer
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileInput}
          title="No requests found"
          description={
            searchTerm
              ? "Change your search or filters to see results"
              : "Start by creating a new material request for your inventory needs"
          }
          action={
            searchTerm
              ? undefined
              : {
                  label: "New Request",
                  onClick: () => router.push("/stock/material-request/new"),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((mr, idx) => (
            <MaterialRequestCard
              key={mr.name}
              mr={mr}
              index={idx}
              onView={() =>
                router.push(
                  `/stock/material-request/${encodeURIComponent(mr.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/material-request/${encodeURIComponent(mr.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(mr.name)}
              onCreatePO={() =>
                router.push(
                  `/buying/purchase-order/new?material_request=${encodeURIComponent(mr.name)}`,
                )
              }
              onCreateSE={() =>
                router.push(
                  `/stock/stock-entry/new?material_request=${encodeURIComponent(mr.name)}&purpose=Material Transfer`,
                )
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Material Request?"
        description="This action will permanently remove the request. You can only delete draft requests that have not been submitted."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
