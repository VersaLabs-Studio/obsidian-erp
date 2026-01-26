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
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
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
import type { PaymentEntry } from "@/types/doctype-types";
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
  Submitted: {
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    icon: CheckCircle2,
    label: "Submitted",
  },
  Cancelled: {
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: XCircle,
    label: "Cancelled",
  },
};

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
  const status =
    entry.docstatus === 1
      ? "Submitted"
      : entry.docstatus === 2
        ? "Cancelled"
        : "Draft";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
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
          isReceive ? "bg-emerald-500" : "bg-rose-500",
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
                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
              )}
              {entry.party || "No party"}
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
              statusConfig.bgColor,
              statusConfig.color,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </div>
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
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-rose-500/10 text-rose-600",
              )}
            >
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">
                {isReceive ? "Received" : "Paid"}
              </p>
              <p className="text-lg font-black text-foreground tracking-tight">
                {formatCurrency(
                  isReceive ? entry.received_amount : entry.paid_amount,
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

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Payment Entries"
        subtitle="Manage cash and bank transactions"
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Entry # or party..."
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

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All Transactions", icon: Landmark },
          { key: "Receive", label: "Receipts", icon: ArrowDownLeft },
          { key: "Pay", label: "Payments", icon: ArrowUpRight },
          { key: "Internal Transfer", label: "Transfers", icon: ArrowRight },
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
            <type.icon className="h-3.5 w-3.5" />
            {type.label}
          </Button>
        ))}
      </div>

      {!entries || entries.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="Record bank or cash vouchers to track money flow"
        />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-[2.5rem]">
          <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-10" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">
            No transactions match this category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
