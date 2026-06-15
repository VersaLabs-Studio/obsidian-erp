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
  DollarSign,
  FileText,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
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
import type { SalesInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

function InvoiceCard({
  invoice,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  invoice: SalesInvoice;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isEditable = invoice.docstatus === 0;
  const isDeletable = invoice.docstatus === 0;

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
                {invoice.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.customer_name || invoice.customer || "No customer"}
            </p>
          </div>
          <StatusBadge status={invoice.status || "Draft"} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Posting Date
            </p>
            <p className="text-sm font-medium text-foreground">
              {invoice.posting_date
                ? new Date(invoice.posting_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "\u2014"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Due Date
            </p>
            <p className="text-sm font-medium text-foreground">
              {invoice.due_date
                ? new Date(invoice.due_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "\u2014"}
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
                Outstanding
              </p>
              <p className="text-lg font-black text-foreground tracking-tight">
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

export default function SalesInvoiceListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<SalesInvoice | null>(null);

  const {
    data: invoices,
    isLoading,
  } = useFrappeList<SalesInvoice>("Sales Invoice", {
    fields: [
      "name",
      "customer",
      "customer_name",
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

  const deleteMutation = useFrappeDelete("Sales Invoice", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    if (statusFilter === "all") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!invoices) return { total: 0, unpaid: 0, overdue: 0, paid: 0 };
    return invoices.reduce(
      (acc, inv) => {
        acc.total += 1;
        const status = inv.status || "Draft";
        if (status === "Unpaid") acc.unpaid += 1;
        else if (status === "Overdue") acc.overdue += 1;
        else if (status === "Paid") acc.paid += 1;
        return acc;
      },
      { total: 0, unpaid: 0, overdue: 0, paid: 0 },
    );
  }, [invoices]);

  const totalOutstanding = useMemo(() => {
    if (!invoices) return 0;
    return invoices.reduce(
      (sum, inv) => sum + (Number(inv.outstanding_amount) || 0),
      0,
    );
  }, [invoices]);

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage customer billing and receivables"
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Invoice # or customer..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/accounting/sales-invoice/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total"
          value={String(statusCounts.total)}
          icon={FileText}
        />
        <KPICard
          title="Unpaid"
          value={ETB.format(totalOutstanding)}
          icon={Clock}
          variant="warning"
        />
        <KPICard
          title="Overdue"
          value={String(statusCounts.overdue)}
          icon={AlertTriangle}
          variant="danger"
        />
        <KPICard
          title="Paid"
          value={String(statusCounts.paid)}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: invoices?.length || 0 },
          { key: "Draft", label: "Draft", count: invoices?.filter((i) => i.status === "Draft").length || 0 },
          { key: "Unpaid", label: "Unpaid", count: statusCounts.unpaid },
          { key: "Paid", label: "Paid", count: statusCounts.paid },
          { key: "Overdue", label: "Overdue", count: statusCounts.overdue },
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

      {!invoices || invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Generate your first sales invoice to record revenue"
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
            <InvoiceCard
              key={inv.name}
              invoice={inv}
              index={i}
              onView={() =>
                router.push(
                  `/accounting/sales-invoice/${encodeURIComponent(inv.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/accounting/sales-invoice/${encodeURIComponent(inv.name)}/edit`,
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
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice "${deleteTarget?.name}"?`}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.name)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
