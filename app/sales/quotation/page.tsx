// app/sales/quotation/page.tsx
// Obsidian ERP v4.0 - Quotations List Page (Premium Card Design)

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
  Building2,
  DollarSign,
  User,
  ArrowRight,
  FileText,
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
} from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { CommandPalette } from "@/components/command/CommandPalette";
import type { Quotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function getDisplayStatus(quotation: Quotation): string {
  if (quotation.docstatus === 2) return "Cancelled";
  if (
    quotation.status === "Open" &&
    quotation.valid_till &&
    new Date(quotation.valid_till) < new Date()
  ) {
    return "Expired";
  }
  return quotation.status || "Draft";
}

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

          <StatusBadge status={displayStatus} size="sm" />
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
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {formatDate(quotation.valid_till || "")}
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
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                Grand Total
              </p>
              <p className="text-lg font-bold text-foreground tracking-tight">
                {formatCurrency(quotation.grand_total ?? 0)}
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

  const filteredQuotations = useMemo(() => {
    if (!quotations) return [];
    let result = quotations;

    if (statusFilter !== "all") {
      result = result.filter((q) => getDisplayStatus(q) === statusFilter);
    }

    return result;
  }, [quotations, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!quotations) return {};
    return quotations.reduce((acc, q) => {
      const status = getDisplayStatus(q);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [quotations]);

  const kpis = useMemo(() => {
    if (!quotations) return { total: 0, draft: 0, open: 0, ordered: 0 };
    return {
      total: quotations.length,
      draft: quotations.filter((q) => q.status === "Draft").length,
      open: quotations.filter((q) => q.status === "Open").length,
      ordered: quotations.filter((q) => q.status === "Ordered").length,
    };
  }, [quotations]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <div className="p-8 text-center text-destructive bg-destructive/5 rounded-xl border border-destructive/20">
        Failed to load quotations
      </div>
    );

  return (
    <div className="space-y-6">
      <CommandPalette />

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

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Quotations"
          value={kpis.total}
          icon={FileText}
          isLoading={isLoading}
        />
        <KPICard
          title="Draft"
          value={kpis.draft}
          icon={Clock}
          variant="warning"
          isLoading={isLoading}
        />
        <KPICard
          title="Open / Active"
          value={kpis.open}
          icon={Eye}
          variant="default"
          isLoading={isLoading}
        />
        <KPICard
          title="Ordered"
          value={kpis.ordered}
          icon={CheckCircle2}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: quotations?.length || 0 },
          { key: "Draft", label: "Draft", count: statusCounts.Draft || 0 },
          { key: "Open", label: "Open", count: statusCounts.Open || 0 },
          { key: "Ordered", label: "Ordered", count: statusCounts.Ordered || 0 },
          { key: "Expired", label: "Expired", count: statusCounts.Expired || 0 },
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
        <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border/40">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-foreground">No quotations match this filter</p>
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
