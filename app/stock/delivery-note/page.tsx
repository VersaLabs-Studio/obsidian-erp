// app/stock/delivery-note/page.tsx
// Obsidian ERP v4.0 - Delivery Notes List Page (Premium Card Design)

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
  FileText,
  ArrowRight,
  RotateCcw,
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
import type { DeliveryNote } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

function getDisplayStatus(dn: DeliveryNote): string {
  if (dn.docstatus === 2) return "Cancelled";
  return dn.status || "Draft";
}

function DeliveryNoteCard({
  dn,
  index,
  onView,
  onEdit,
  onDelete,
  onCreateInvoice,
}: {
  dn: DeliveryNote;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateInvoice: () => void;
}) {
  const displayStatus = getDisplayStatus(dn);
  const isDraft = dn.docstatus === 0;
  const canInvoice = dn.status === "To Bill";
  const billedPercent = dn.per_billed || 0;

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
                {dn.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {dn.customer_name || dn.customer || "No customer"}
            </p>
          </div>

          {/* Status Badge */}
          <StatusBadge
            status={displayStatus}
            size="sm"
          />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Posting Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(dn.posting_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Billed
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Receipt className="h-3 w-3 text-muted-foreground" />
              {Math.round(billedPercent)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{dn.company || "—"}</span>
            </p>
          </div>
        </div>

        {/* Billing Progress Bar */}
        {billedPercent > 0 && billedPercent < 100 && (
          <div className="mb-4">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${billedPercent}%` }}
              />
            </div>
          </div>
        )}

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
                {formatCurrency(dn.grand_total ?? 0)}
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

export default function DeliveryNoteListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<DeliveryNote | null>(null);

  const {
    data: deliveryNotes,
    isLoading,
    error,
  } = useFrappeList<DeliveryNote>("Delivery Note", {
    fields: [
      "name",
      "customer",
      "customer_name",
      "posting_date",
      "status",
      "grand_total",
      "per_billed",
      "company",
      "docstatus",
      "is_return",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Delivery Note", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredDeliveryNotes = useMemo(() => {
    if (!deliveryNotes) return [];
    let result = deliveryNotes;

    if (statusFilter !== "all") {
      result = result.filter((dn) => {
        const displayStatus = getDisplayStatus(dn);
        return displayStatus === statusFilter;
      });
    }

    return result;
  }, [deliveryNotes, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!deliveryNotes) return {};
    return deliveryNotes.reduce((acc, dn) => {
      const status = getDisplayStatus(dn);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [deliveryNotes]);

  const kpis = useMemo(() => {
    if (!deliveryNotes)
      return { total: 0, draft: 0, toBill: 0, completed: 0 };
    return {
      total: deliveryNotes.length,
      draft: deliveryNotes.filter((dn) => dn.status === "Draft").length,
      toBill: deliveryNotes.filter((dn) => dn.status === "To Bill").length,
      completed: deliveryNotes.filter((dn) => dn.status === "Completed").length,
    };
  }, [deliveryNotes]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <ListErrorState
        error={error}
        label="delivery notes"
      />
    );

  return (
    <div className="space-y-6">
      <CommandPalette />

      <PageHeader
        title="Delivery Notes"
        subtitle={`${filteredDeliveryNotes.length} note${
          filteredDeliveryNotes.length !== 1 ? "s" : ""
        }`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by DN#, customer..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/stock/delivery-note/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Delivery Note
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total DNs"
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
          { key: "all", label: "All", count: deliveryNotes?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
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
          {
            key: "Return",
            label: "Return",
            count: statusCounts.Return || 0,
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

      {/* Delivery Notes Grid */}
      {!deliveryNotes || deliveryNotes.length === 0 ? (
        <EmptyState
          title="No delivery notes found"
          description="Create your first delivery note to start tracking dispatches"
          action={
            <Button
              onClick={() => router.push("/stock/delivery-note/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Delivery Note
            </Button>
          }
        />
      ) : filteredDeliveryNotes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No delivery notes match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDeliveryNotes.map((dn, index) => (
            <DeliveryNoteCard
              key={dn.name}
              dn={dn}
              index={index}
              onView={() =>
                router.push(
                  `/stock/delivery-note/${encodeURIComponent(dn.name)}`
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/delivery-note/${encodeURIComponent(dn.name)}/edit`
                )
              }
              onDelete={() => setDeleteTarget(dn)}
              onCreateInvoice={() =>
                router.push(
                  `/accounting/sales-invoice/new?delivery_note=${encodeURIComponent(
                    dn.name
                  )}`
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
        title="Delete Delivery Note"
        description={`Are you sure you want to delete delivery note "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
