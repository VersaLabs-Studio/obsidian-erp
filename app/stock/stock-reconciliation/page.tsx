"use client";

// app/stock/stock-reconciliation/page.tsx
// Obsidian ERP v4.0 — Stock Reconciliation List Page
// Standalone stock count/adjustment. No FlowRail, no flow chain.

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
  Warehouse,
  Package,
  FileText,
  ArrowRight,
  Scale,
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
import { CommandPalette } from "@/components/command/CommandPalette";
import type { StockReconciliation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

function getDisplayStatus(sr: StockReconciliation): string {
  if (sr.docstatus === 2) return "Cancelled";
  if (sr.docstatus === 1) return "Submitted";
  return "Draft";
}

function StockReconciliationCard({
  sr,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  sr: StockReconciliation;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(sr);
  const isDraft = sr.docstatus === 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

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
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {sr.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Scale className="h-3 w-3" />
              {sr.purpose || "Stock Reconciliation"}
            </p>
          </div>
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Posting Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(sr.posting_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Purpose
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              {sr.purpose || "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Warehouse
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Warehouse className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{sr.set_warehouse || "—"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {sr.docstatus === 0 ? "Draft" : sr.docstatus === 1 ? "Submitted" : "Cancelled"}
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

export default function StockReconciliationListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<StockReconciliation | null>(null);

  const {
    data: reconciliations,
    isLoading,
    error,
  } = useFrappeList<StockReconciliation>("Stock Reconciliation", {
    fields: [
      "name",
      "purpose",
      "posting_date",
      "company",
      "set_warehouse",
      "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Stock Reconciliation", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredReconciliations = useMemo(() => {
    if (!reconciliations) return [];
    let result = reconciliations;
    if (statusFilter !== "all") {
      result = result.filter((sr) => getDisplayStatus(sr) === statusFilter);
    }
    return result;
  }, [reconciliations, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!reconciliations) return {};
    return reconciliations.reduce((acc, sr) => {
      const status = getDisplayStatus(sr);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [reconciliations]);

  const kpis = useMemo(() => {
    if (!reconciliations) return { total: 0, draft: 0, submitted: 0, thisMonth: 0 };
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    return {
      total: reconciliations.length,
      draft: reconciliations.filter((sr) => sr.docstatus === 0).length,
      submitted: reconciliations.filter((sr) => sr.docstatus === 1).length,
      thisMonth: reconciliations.filter((sr) => sr.posting_date >= thisMonthStart).length,
    };
  }, [reconciliations]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <ListErrorState
        error={error}
        label="stock reconciliations"
      />
    );

  return (
    <div className="space-y-6">
      <CommandPalette />

      <PageHeader
        title="Stock Reconciliations"
        subtitle={`${filteredReconciliations.length} reconciliation${filteredReconciliations.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by doc#, purpose..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/stock/stock-reconciliation/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Stock Reconciliation
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Stock Recon"
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
          title="Submitted"
          value={kpis.submitted}
          icon={Scale}
          variant="success"
          isLoading={isLoading}
        />
        <KPICard
          title="This Month"
          value={kpis.thisMonth}
          icon={CalendarDays}
          variant="default"
          isLoading={isLoading}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: reconciliations?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Submitted", label: "Submitted", count: statusCounts.Submitted || 0 },
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

      {!reconciliations || reconciliations.length === 0 ? (
        <EmptyState
          title="No stock reconciliations found"
          description="Create your first stock reconciliation to count or adjust inventory"
          action={
            <Button
              onClick={() => router.push("/stock/stock-reconciliation/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Stock Reconciliation
            </Button>
          }
        />
      ) : filteredReconciliations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No stock reconciliations match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReconciliations.map((sr, index) => (
            <StockReconciliationCard
              key={sr.name}
              sr={sr}
              index={index}
              onView={() =>
                router.push(`/stock/stock-reconciliation/${encodeURIComponent(sr.name)}`)
              }
              onEdit={() =>
                router.push(`/stock/stock-reconciliation/${encodeURIComponent(sr.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(sr)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Stock Reconciliation"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
