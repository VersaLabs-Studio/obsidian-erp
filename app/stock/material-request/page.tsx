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
  Building2,
  Clock,
  ShoppingCart,
  ArrowRightLeft,
  LogOut,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  TrendingUp,
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
import { StatusBadge } from "@/components/smart/status-badge";
import { KPICard } from "@/components/dashboard/KPICard";
import type { MaterialRequest } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  Purchase: { icon: ShoppingCart, label: "Purchase" },
  "Material Transfer": { icon: ArrowRightLeft, label: "Transfer" },
  "Material Issue": { icon: LogOut, label: "Issue" },
  Manufacture: { icon: CheckCircle2, label: "Manufacture" },
  "Customer Provided": { icon: XCircle, label: "Customer" },
};

function getDisplayStatus(mr: MaterialRequest): string {
  if (mr.docstatus === 2) return "Cancelled";
  if (mr.docstatus === 0) return "Draft";
  return mr.status || "Pending";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MaterialRequestCard({
  mr,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  mr: MaterialRequest;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(mr);
  const typeConfig = TYPE_CONFIG[mr.material_request_type] || TYPE_CONFIG.Purchase;
  const TypeIcon = typeConfig.icon;
  const isDraft = mr.docstatus === 0;
  const progress = mr.per_ordered || 0;

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
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground tracking-tight">
              {mr.name}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <TypeIcon className="h-3 w-3" />
              {mr.material_request_type}
            </p>
          </div>
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(mr.transaction_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Required By
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {formatDate(mr.schedule_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{mr.company || "—"}</span>
            </p>
          </div>
        </div>

        {progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase tracking-tighter">
              <span className="text-muted-foreground">Ordered</span>
              <span className="text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  progress >= 100
                    ? "bg-primary shadow-sm"
                    : "bg-primary"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Badge
            variant="secondary"
            className="rounded-full text-[10px] font-bold px-2.5"
          >
            {mr.material_request_type}
          </Badge>

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

export default function MaterialRequestListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<MaterialRequest | null>(null);

  const {
    data: requests,
    isLoading,
    error,
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
      "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Material Request", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    if (statusFilter === "all") return requests;
    return requests.filter((mr) => getDisplayStatus(mr) === statusFilter);
  }, [requests, statusFilter]);

  const kpis = useMemo(() => {
    if (!requests) return { total: 0, draft: 0, pending: 0, partiallyOrdered: 0 };
    return {
      total: requests.length,
      draft: requests.filter((mr) => mr.docstatus === 0).length,
      pending: requests.filter((mr) => mr.docstatus === 1 && mr.status === "Pending").length,
      partiallyOrdered: requests.filter((mr) => mr.status === "Partially Ordered").length,
    };
  }, [requests]);

  const statusCounts = useMemo(() => {
    if (!requests) return {};
    return requests.reduce(
      (acc, mr) => {
        const s = getDisplayStatus(mr);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [requests]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <ListErrorState
        error={error}
        label="material requests"
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Requests"
        subtitle={`${filteredRequests.length} request${filteredRequests.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID..."
        primaryAction={{
          label: "New Material Request",
          onClick: () => router.push("/stock/material-request/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Requests"
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
          title="Pending"
          value={kpis.pending}
          icon={Clock}
          variant="default"
          isLoading={isLoading}
        />
        <KPICard
          title="Partially Ordered"
          value={kpis.partiallyOrdered}
          icon={TrendingUp}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: requests?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Pending", label: "Pending", count: statusCounts.Pending || 0 },
          {
            key: "Partially Ordered",
            label: "Partially Ordered",
            count: statusCounts["Partially Ordered"] || 0,
          },
          { key: "Ordered", label: "Ordered", count: statusCounts.Ordered || 0 },
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

      {!requests || requests.length === 0 ? (
        <EmptyState
          title="No material requests found"
          description="Create your first material request to start tracking procurement"
          action={
            <Button
              onClick={() => router.push("/stock/material-request/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Material Request
            </Button>
          }
        />
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No material requests match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRequests.map((mr, index) => (
            <MaterialRequestCard
              key={mr.name}
              mr={mr}
              index={index}
              onView={() =>
                router.push(
                  `/stock/material-request/${encodeURIComponent(mr.name)}`
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/material-request/${encodeURIComponent(mr.name)}/edit`
                )
              }
              onDelete={() => setDeleteTarget(mr)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Material Request"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
