// app/sales/quotation/page.tsx
// Obsidian ERP v4.0 - Quotations List Page (Premium Card Design)
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
import type { Quotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

// Enhanced status configuration with colors and icons
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
  Open: {
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
    icon: Clock,
    label: "Awaiting Response",
  },
  Ordered: {
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    icon: CheckCircle2,
    label: "Ordered",
  },
  Expired: {
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
    icon: AlertTriangle,
    label: "Expired",
  },
  Cancelled: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: XCircle,
    label: "Cancelled",
  },
};

// Get display status (handles expired logic)
function getDisplayStatus(quotation: Quotation): string {
  // Check if cancelled
  if (quotation.docstatus === 2) return "Cancelled";
  // Check if expired (only for Open status)
  if (
    quotation.status === "Open" &&
    quotation.valid_till &&
    new Date(quotation.valid_till) < new Date()
  ) {
    return "Expired";
  }
  return quotation.status || "Draft";
}

// Quotation Card Component - Premium v3.0 Design
function QuotationCard({
  quotation,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  quotation: Quotation;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(quotation);
  const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;

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

  const isEditable = quotation.status === "Draft" && quotation.docstatus === 0;
  const isDeletable = quotation.docstatus === 0;

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
      {/* Status Indicator Bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          displayStatus === "Draft" && "bg-slate-400",
          displayStatus === "Open" && "bg-blue-500",
          displayStatus === "Ordered" && "bg-emerald-500",
          displayStatus === "Expired" && "bg-amber-500",
          displayStatus === "Cancelled" && "bg-muted-foreground/50"
        )}
      />

      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {quotation.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {quotation.customer_name || quotation.party_name || "No customer"}
            </p>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
              statusConfig.bgColor,
              statusConfig.color
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Date
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {formatDate(quotation.transaction_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Valid Till
            </p>
            <p
              className={cn(
                "text-sm font-medium flex items-center gap-1",
                displayStatus === "Expired"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              )}
            >
              <Clock className="h-3 w-3 text-muted-foreground" />
              {formatDate(quotation.valid_till)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{quotation.company || "—"}</span>
            </p>
          </div>
        </div>

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
                {formatCurrency(quotation.grand_total)}
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

// Main Page Component
export default function QuotationsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);

  const {
    data: quotations,
    isLoading,
    error,
  } = useFrappeList<Quotation>("Quotation", {
    fields: [
      "name",
      "party_name",
      "customer_name",
      "transaction_date",
      "valid_till",
      "grand_total",
      "status",
      "docstatus",
      "company",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Quotation", {
    onSuccess: () => setDeleteTarget(null),
  });

  // Filter quotations
  const filteredQuotations = useMemo(() => {
    if (!quotations) return [];
    let result = quotations;

    if (statusFilter !== "all") {
      result = result.filter((q) => {
        const displayStatus = getDisplayStatus(q);
        return displayStatus === statusFilter;
      });
    }

    return result;
  }, [quotations, statusFilter]);

  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    if (!quotations) return {};
    return quotations.reduce((acc, q) => {
      const status = getDisplayStatus(q);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [quotations]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="grid" count={6} />;
  if (error)
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load quotations
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        subtitle={`${filteredQuotations.length} quotation${
          filteredQuotations.length !== 1 ? "s" : ""
        }`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID, customer..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/sales/quotation/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        }
      />

      {/* Status Filter Pills - Removed Lost */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: quotations?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Open", label: "Open", count: statusCounts.Open || 0 },
          {
            key: "Ordered",
            label: "Ordered",
            count: statusCounts.Ordered || 0,
          },
          {
            key: "Expired",
            label: "Expired",
            count: statusCounts.Expired || 0,
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

      {/* Quotations Grid */}
      {!quotations || quotations.length === 0 ? (
        <EmptyState
          title="No quotations found"
          description="Create your first quotation to start generating revenue"
          action={
            <Button
              onClick={() => router.push("/sales/quotation/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Quotation
            </Button>
          }
        />
      ) : filteredQuotations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No quotations match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredQuotations.map((quotation, index) => (
            <QuotationCard
              key={quotation.name}
              quotation={quotation}
              index={index}
              onView={() =>
                router.push(
                  `/sales/quotation/${encodeURIComponent(quotation.name)}`
                )
              }
              onEdit={() =>
                router.push(
                  `/sales/quotation/${encodeURIComponent(quotation.name)}/edit`
                )
              }
              onDelete={() => setDeleteTarget(quotation)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Quotation"
        description={`Are you sure you want to delete quotation "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
