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
  Clock,
  User,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  HandCoins,
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
import type { SalesInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: React.ElementType; label: string }
> = {
  Draft: {
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: FileText,
    label: "Draft",
  },
  Unpaid: {
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
    icon: Clock,
    label: "Unpaid",
  },
  Paid: {
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    icon: CheckCircle2,
    label: "Paid",
  },
  Overdue: {
    color: "text-rose-700 dark:text-rose-300",
    bgColor: "bg-rose-100 dark:bg-rose-900/50",
    icon: AlertTriangle,
    label: "Overdue",
  },
  "Part Paid": {
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
    icon: HandCoins,
    label: "Part Paid",
  },
  Cancelled: {
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: XCircle,
    label: "Cancelled",
  },
};

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
  const statusConfig =
    STATUS_CONFIG[invoice.status || "Draft"] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: invoice.currency || "ETB",
      minimumFractionDigits: 2,
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
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          invoice.status === "Draft" && "bg-slate-400",
          invoice.status === "Unpaid" && "bg-amber-500",
          invoice.status === "Paid" && "bg-emerald-500",
          invoice.status === "Overdue" && "bg-rose-500",
          invoice.status === "Cancelled" && "bg-gray-400",
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
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {invoice.customer_name || invoice.customer || "No customer"}
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
              statusConfig.bgColor,
              statusConfig.color,
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Posting Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(invoice.posting_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Due Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {formatDate(invoice.due_date ?? "")}
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
                {formatCurrency(invoice.outstanding_amount ?? 0)}
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
    error,
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
    if (!invoices) return {};
    return invoices.reduce(
      (acc, inv) => {
        const status = inv.status || "Draft";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
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

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: invoices?.length || 0 },
          { key: "Unpaid", label: "Unpaid", count: statusCounts.Unpaid || 0 },
          { key: "Paid", label: "Paid", count: statusCounts.Paid || 0 },
          {
            key: "Overdue",
            label: "Overdue",
            count: statusCounts.Overdue || 0,
          },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
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
        <div className="text-center py-20 border-2 border-dashed border-border rounded-[2.5rem]">
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
