"use client";

// app/accounting/purchase-invoice/page.tsx
// Obsidian ERP v4.0 — Purchase Invoice List (V4 Golden Template)
// KPICard + StatusBadge + card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Trash2,
  Eye,
  CalendarDays,
  DollarSign,
  FileText,
  ArrowRight,
  Truck,
  Clock,
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
  StatusBadge,
} from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import type { PurchaseInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

function PurchaseInvoiceCard({
  invoice,
  index,
  onView,
  onDelete,
}: {
  invoice: PurchaseInvoice;
  index: number;
  onView: () => void;
  onDelete: () => void;
}) {
  const isDraft = invoice.docstatus === 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
        "animate-slide-up hover:-translate-y-1",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          invoice.status === "Draft" && "bg-muted-foreground/30",
          invoice.status === "Unpaid" && "bg-warning",
          invoice.status === "Paid" && "bg-success",
          invoice.status === "Overdue" && "bg-destructive",
          invoice.status === "Partly Paid" && "bg-info",
          invoice.status === "Cancelled" && "bg-muted-foreground/20",
        )}
      />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {invoice.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
              <Truck className="h-3.5 w-3.5 text-primary" />
              {invoice.supplier_name || invoice.supplier || "No supplier"}
            </p>
          </div>

          <StatusBadge status={invoice.status || "Draft"} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
              Posting Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {invoice.posting_date
                ? new Date(invoice.posting_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
              Grand Total
            </p>
            <p className="text-sm font-bold text-foreground">
              {ETB.format(invoice.grand_total ?? 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
                Outstanding
              </p>
              <p className="text-lg font-bold text-foreground">
                {ETB.format(invoice.outstanding_amount ?? 0)}
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
              className="rounded-xl border-border/50 shadow-xl bg-card p-1.5 min-w-[160px]"
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

export default function PurchaseInvoiceListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<PurchaseInvoice | null>(
    null,
  );

  const {
    data: invoices,
    isLoading,
    error,
  } = useFrappeList<PurchaseInvoice>("Purchase Invoice", {
    fields: [
      "name",
      "supplier",
      "supplier_name",
      "posting_date",
      "due_date",
      "status",
      "docstatus",
      "grand_total",
      "outstanding_amount",
      "currency",
      "company",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Purchase Invoice", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (statusFilter === "all") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!invoices) return {} as Record<string, number>;
    return invoices.reduce(
      (acc, inv) => {
        const status = inv.status || "Draft";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [invoices]);

  const kpis = useMemo(() => {
    if (!invoices) return { total: 0, unpaid: 0, overdue: 0, paid: 0 };
    return {
      total: invoices.length,
      unpaid: invoices.filter((i) => i.status === "Unpaid").length,
      overdue: invoices.filter((i) => i.status === "Overdue").length,
      paid: invoices.filter((i) => i.status === "Paid").length,
    };
  }, [invoices]);

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <ListErrorState
        error={error}
        label="purchase invoices"
      />
    );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Purchase Invoices"
        subtitle={`${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Invoice # or supplier..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/accounting/purchase-invoice/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Bill
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Bills"
          value={kpis.total}
          icon={FileText}
          isLoading={isLoading}
        />
        <KPICard
          title="Unpaid"
          value={kpis.unpaid}
          icon={Clock}
          variant="warning"
          isLoading={isLoading}
        />
        <KPICard
          title="Overdue"
          value={kpis.overdue}
          icon={DollarSign}
          variant="danger"
          isLoading={isLoading}
        />
        <KPICard
          title="Paid"
          value={kpis.paid}
          icon={DollarSign}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: invoices?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Unpaid", label: "Unpaid", count: statusCounts.Unpaid || 0 },
          { key: "Paid", label: "Paid", count: statusCounts.Paid || 0 },
          {
            key: "Overdue",
            label: "Overdue",
            count: statusCounts.Overdue || 0 },
        ].map((status) => (
          <Button
            key={status.key}
            variant={statusFilter === status.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full gap-2 transition-all",
              statusFilter === status.key
                ? "shadow-lg shadow-primary/20"
                : "hover:bg-secondary/80",
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
                  : "bg-secondary",
              )}
            >
              {status.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Card Grid */}
      {!invoices || invoices.length === 0 ? (
        <EmptyState
          title="No purchase invoices"
          description="Record your first vendor bill to start tracking liabilities"
          action={
            <Button
              className="rounded-full"
              onClick={() => router.push("/accounting/purchase-invoice/new")}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Purchase Invoice
            </Button>
          }
        />
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">
            No invoices match this filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvoices.map((inv, i) => (
            <PurchaseInvoiceCard
              key={inv.name}
              invoice={inv}
              index={i}
              onView={() =>
                router.push(
                  `/accounting/purchase-invoice/${encodeURIComponent(inv.name)}`,
                )
              }
              onDelete={() => setDeleteTarget(inv)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Bill"
        description={`Are you sure you want to delete bill "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.name)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
