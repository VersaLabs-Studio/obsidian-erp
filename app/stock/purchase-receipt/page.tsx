// app/stock/purchase-receipt/page.tsx
// Obsidian ERP v4.0 — Purchase Receipts List Page (Premium Card Design)
// Inbound goods from suppliers. Mirrors Delivery Note list pattern.

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
  DollarSign,
  Package,
  Receipt,
  CheckCircle2,
  FileText,
  ArrowRight,
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
import { CommandPalette } from "@/components/command/CommandPalette";
import type { PurchaseReceipt } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function getDisplayStatus(pr: PurchaseReceipt): string {
  if (pr.docstatus === 2) return "Cancelled";
  return pr.status || "Draft";
}

function PurchaseReceiptCard({
  pr,
  index,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice,
}: {
  pr: PurchaseReceipt;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateInvoice: () => void;
}) {
  const displayStatus = getDisplayStatus(pr);
  const isDraft = pr.docstatus === 0;
  const canInvoice = pr.status === "To Bill";

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
                {pr.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Truck className="h-3 w-3" />
              {pr.supplier_name || pr.supplier || "No supplier"}
            </p>
          </div>

          <StatusBadge status={displayStatus} size="sm" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Posting Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(pr.posting_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Billed
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3 text-muted-foreground" />
              {Math.round(pr.per_billed || 0)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{pr.company || "—"}</span>
            </p>
          </div>
        </div>

        {/* Footer with Amount and Actions */}
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
                {formatCurrency(pr.grand_total ?? 0)}
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
              {canInvoice && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateInvoice();
                    }}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Create Invoice
                  </DropdownMenuItem>
                </>
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

export default function PurchaseReceiptListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<PurchaseReceipt | null>(null);

  const {
    data: receipts,
    isLoading,
    error,
  } = useFrappeList<PurchaseReceipt>("Purchase Receipt", {
    fields: [
      "name",
      "supplier",
      "supplier_name",
      "posting_date",
      "status",
      "grand_total",
      "per_billed",
      "company",
      "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Purchase Receipt", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredReceipts = useMemo(() => {
    if (!receipts) return [];
    let result = receipts;
    if (statusFilter !== "all") {
      result = result.filter((pr) => getDisplayStatus(pr) === statusFilter);
    }
    return result;
  }, [receipts, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!receipts) return {};
    return receipts.reduce((acc, pr) => {
      const status = getDisplayStatus(pr);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [receipts]);

  const kpis = useMemo(() => {
    if (!receipts)
      return { total: 0, draft: 0, toBill: 0, completed: 0 };
    return {
      total: receipts.length,
      draft: receipts.filter((pr) => pr.status === "Draft").length,
      toBill: receipts.filter((pr) => pr.status === "To Bill").length,
      completed: receipts.filter((pr) => pr.status === "Completed").length,
    };
  }, [receipts]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load purchase receipts
      </div>
    );

  return (
    <div className="space-y-6">
      <CommandPalette />

      <PageHeader
        title="Purchase Receipts"
        subtitle={`${filteredReceipts.length} receipt${filteredReceipts.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by receipt#, supplier..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/stock/purchase-receipt/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Receipt
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total PRs"
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
          title="To Bill"
          value={kpis.toBill}
          icon={Receipt}
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
          { key: "all", label: "All", count: receipts?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "To Bill", label: "To Bill", count: statusCounts["To Bill"] || 0 },
          { key: "Completed", label: "Completed", count: statusCounts.Completed || 0 },
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

      {/* Receipts Grid */}
      {!receipts || receipts.length === 0 ? (
        <EmptyState
          title="No purchase receipts found"
          description="Create your first purchase receipt to track incoming goods"
          action={
            <Button
              onClick={() => router.push("/stock/purchase-receipt/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Receipt
            </Button>
          }
        />
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No purchase receipts match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReceipts.map((pr, index) => (
            <PurchaseReceiptCard
              key={pr.name}
              pr={pr}
              index={index}
              onView={() =>
                router.push(`/stock/purchase-receipt/${encodeURIComponent(pr.name)}`)
              }
              onEdit={() =>
                router.push(`/stock/purchase-receipt/${encodeURIComponent(pr.name)}/edit`)
              }
              onDelete={() => setDeleteTarget(pr)}
              onCreateInvoice={() =>
                router.push(
                  `/accounting/purchase-invoice/new?purchase_receipt=${encodeURIComponent(pr.name)}`
                )
              }
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Purchase Receipt"
        description={`Are you sure you want to delete purchase receipt "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
