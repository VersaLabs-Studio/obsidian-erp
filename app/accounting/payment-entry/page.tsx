"use client";

// app/accounting/payment-entry/page.tsx
// Obsidian ERP v4.0 — Payment Entry List (Golden Template)
// KPI bar, StatusBadge, card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Wallet,
  FileText,
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
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBadge } from "@/components/smart/status-badge";
import type { PaymentEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDisplayStatus(entry: PaymentEntry): string {
  if (entry.docstatus === 2) return "Cancelled";
  if (entry.docstatus === 1) return "Submitted";
  return "Draft";
}

function PaymentEntryCard({
  entry,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  entry: PaymentEntry;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(entry);
  const isEditable = entry.docstatus === 0;
  const isDeletable = entry.docstatus === 0;
  const isReceive = entry.payment_type === "Receive";

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
          isReceive ? "bg-success" : "bg-destructive",
        )}
      />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {entry.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
              {isReceive ? (
                <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />
              )}
              {entry.party_type}: {entry.party || "No party"}
            </p>
          </div>

          <StatusBadge status={displayStatus} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
              Date
            </p>
            <p className="text-sm font-bold text-foreground">
              {formatDate(entry.posting_date)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
              Mode
            </p>
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Wallet className="h-3 w-3 text-primary" />
              {entry.mode_of_payment || "Cash"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                isReceive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">
                {isReceive ? "Received" : "Paid"}
              </p>
              <p className="text-lg font-black text-foreground tracking-tight">
                {ETB.format(
                  isReceive
                    ? entry.received_amount ?? entry.paid_amount
                    : entry.paid_amount,
                )}
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

export default function PaymentEntryListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<PaymentEntry | null>(null);

  const {
    data: entries,
    isLoading,
    error,
  } = useFrappeList<PaymentEntry>("Payment Entry", {
    fields: [
      "name",
      "posting_date",
      "payment_type",
      "party_type",
      "party",
      "paid_amount",
      "received_amount",
      "docstatus",
      "mode_of_payment",
      "company",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Payment Entry", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (typeFilter === "all") return entries;
    return entries.filter((ent) => ent.payment_type === typeFilter);
  }, [entries, typeFilter]);

  const kpis = useMemo(() => {
    if (!entries) return { total: 0, receivedToday: 0, paidToday: 0, unallocated: 0 };
    const today = new Date().toISOString().split("T")[0];
    return {
      total: entries.length,
      receivedToday: entries.filter(
        (e) => e.payment_type === "Receive" && e.posting_date === today,
      ).length,
      paidToday: entries.filter(
        (e) => e.payment_type === "Pay" && e.posting_date === today,
      ).length,
      unallocated: entries.filter(
        (e) => e.docstatus === 0,
      ).length,
    };
  }, [entries]);

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load payment entries
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Entries"
        subtitle={`${filteredEntries.length} entr${filteredEntries.length !== 1 ? "ies" : "y"}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID, party..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20 h-10 px-6 font-bold"
            onClick={() => router.push("/accounting/payment-entry/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Payments"
          value={kpis.total}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <KPICard
          title="Received Today"
          value={kpis.receivedToday}
          icon={ArrowDownLeft}
          variant="success"
          isLoading={isLoading}
        />
        <KPICard
          title="Paid Today"
          value={kpis.paidToday}
          icon={ArrowUpRight}
          variant="warning"
          isLoading={isLoading}
        />
        <KPICard
          title="Unallocated"
          value={kpis.unallocated}
          icon={FileText}
          variant="default"
          isLoading={isLoading}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All Transactions" },
          { key: "Receive", label: "Receipts" },
          { key: "Pay", label: "Payments" },
          { key: "Internal Transfer", label: "Transfers" },
        ].map((type) => (
          <Button
            key={type.key}
            variant={typeFilter === type.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full gap-2 transition-all font-bold px-5 h-9",
              typeFilter === type.key
                ? "shadow-lg shadow-primary/20"
                : "hover:bg-secondary/80 bg-card",
            )}
            onClick={() => setTypeFilter(type.key)}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {!entries || entries.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="Record bank or cash vouchers to track money flow"
          action={
            <Button
              onClick={() => router.push("/accounting/payment-entry/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Payment
            </Button>
          }
        />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-10" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">
            No transactions match this category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEntries.map((entry, i) => (
            <PaymentEntryCard
              key={entry.name}
              entry={entry}
              index={i}
              onView={() =>
                router.push(
                  `/accounting/payment-entry/${encodeURIComponent(entry.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/accounting/payment-entry/${encodeURIComponent(entry.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(entry)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Payment"
        description={`Are you sure you want to delete payment entry "${deleteTarget?.name}"?`}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.name)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
