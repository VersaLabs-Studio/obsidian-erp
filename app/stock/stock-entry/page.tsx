"use client";

// app/stock/stock-entry/page.tsx
// Obsidian ERP v4.0 — Stock Entries List Page (Premium Card Design)

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
  ArrowRightLeft,
  ArrowRight,
  Package,
  CheckCircle2,
  FileText,
  LogIn,
  LogOut,
  Factory,
  Cog,
  Truck,
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
import type { StockEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

const PURPOSE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  "Material Receipt": { icon: LogIn, label: "Receipt" },
  "Material Issue": { icon: LogOut, label: "Issue" },
  "Material Transfer": { icon: ArrowRightLeft, label: "Transfer" },
  "Material Transfer for Manufacture": { icon: Factory, label: "Transfer for Mfg" },
  Manufacture: { icon: Cog, label: "Manufacture" },
  Repack: { icon: Package, label: "Repack" },
  "Send to Subcontractor": { icon: Truck, label: "Subcontractor" },
};

function getDisplayStatus(entry: StockEntry): string {
  if (entry.docstatus === 2) return "Cancelled";
  if (entry.docstatus === 1) return "Submitted";
  return "Draft";
}

function StockEntryCard({
  entry,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  entry: StockEntry;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const purposeConfig =
    PURPOSE_CONFIG[entry.purpose ?? ""] || PURPOSE_CONFIG["Material Transfer"];
  const PurposeIcon = purposeConfig.icon;
  const displayStatus = getDisplayStatus(entry);
  const isDraft = entry.docstatus === 0;
  const isDeletable = entry.docstatus === 0;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
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
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {entry.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold",
                "bg-secondary/50 text-secondary-foreground"
              )}
            >
              <PurposeIcon className="h-3 w-3" />
              {purposeConfig.label}
            </div>
          </div>

          {/* Status Badge */}
          <StatusBadge status={displayStatus} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(entry.posting_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{entry.company || "—"}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Value Diff
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrency(entry.value_difference)}
            </p>
          </div>
        </div>

        {/* Warehouse Flow */}
        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/50 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
              Source
            </p>
            <p
              className={cn(
                "font-medium text-xs truncate",
                entry.from_warehouse
                  ? "text-foreground"
                  : "text-muted-foreground italic"
              )}
            >
              {entry.from_warehouse?.split(" - ")[0] || "—"}
            </p>
          </div>
          <div className="h-7 w-7 rounded-full bg-background flex items-center justify-center shrink-0 border border-border/50">
            <ArrowRight className="h-3 w-3 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
              Target
            </p>
            <p
              className={cn(
                "font-medium text-xs truncate",
                entry.to_warehouse
                  ? "text-foreground"
                  : "text-muted-foreground italic"
              )}
            >
              {entry.to_warehouse?.split(" - ")[0] || "—"}
            </p>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            {entry.work_order && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full border border-border/50">
                <Factory className="h-3 w-3" />
                <span className="truncate max-w-[100px]">
                  {entry.work_order}
                </span>
              </div>
            )}
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

export default function StockEntryListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<StockEntry | null>(null);

  const {
    data: entries,
    isLoading,
    error,
  } = useFrappeList<StockEntry>("Stock Entry", {
    fields: [
      "name",
      "stock_entry_type",
      "purpose",
      "posting_date",
      "posting_time",
      "work_order",
      "from_warehouse",
      "to_warehouse",
      "fg_completed_qty",
      "total_outgoing_value",
      "total_incoming_value",
      "value_difference",
      "docstatus",
      "company",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Stock Entry", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    let result = entries;

    if (statusFilter !== "all") {
      result = result.filter((e) => {
        const displayStatus = getDisplayStatus(e);
        return displayStatus === statusFilter;
      });
    }

    return result;
  }, [entries, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!entries) return {};
    return entries.reduce((acc, e) => {
      const status = getDisplayStatus(e);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [entries]);

  const kpis = useMemo(() => {
    if (!entries)
      return { total: 0, draft: 0, inProcess: 0, completed: 0 };
    return {
      total: entries.length,
      draft: entries.filter((e) => e.docstatus === 0).length,
      inProcess: entries.filter((e) => e.docstatus === 1).length,
      completed: 0,
    };
  }, [entries]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <ListErrorState
        error={error}
        label="stock entries"
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Entries"
        subtitle={`${filteredEntries.length} entr${
          filteredEntries.length !== 1 ? "ies" : "y"
        }`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID, work order..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/stock/stock-entry/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Stock Entry
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Entries"
          value={kpis.total}
          icon={ArrowRightLeft}
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
          value={kpis.inProcess}
          icon={CheckCircle2}
          variant="default"
          isLoading={isLoading}
        />
        <KPICard
          title="Cancelled"
          value={statusCounts.Cancelled || 0}
          icon={Package}
          variant="danger"
          isLoading={isLoading}
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: entries?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          {
            key: "Submitted",
            label: "Submitted",
            count: statusCounts.Submitted || 0,
          },
          {
            key: "Cancelled",
            label: "Cancelled",
            count: statusCounts.Cancelled || 0,
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

      {/* Stock Entries Grid */}
      {!entries || entries.length === 0 ? (
        <EmptyState
          title="No stock entries found"
          description="Record your first stock movement to update inventory levels"
          action={
            <Button
              onClick={() => router.push("/stock/stock-entry/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Stock Entry
            </Button>
          }
        />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No stock entries match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEntries.map((entry, index) => (
            <StockEntryCard
              key={entry.name}
              entry={entry}
              index={index}
              onView={() =>
                router.push(
                  `/stock/stock-entry/${encodeURIComponent(entry.name)}`
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/stock-entry/${encodeURIComponent(entry.name)}/edit`
                )
              }
              onDelete={() => setDeleteTarget(entry)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Stock Entry"
        description={`Are you sure you want to delete stock entry "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
