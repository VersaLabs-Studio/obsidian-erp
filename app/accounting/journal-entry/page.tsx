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
  CheckCircle2,
  XCircle,
  BookOpen,
  ArrowRight,
  Receipt,
  History,
  AlertCircle,
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
import type { JournalEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const VOUCHER_TYPE_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  "Journal Entry": {
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
    label: "Journal",
  },
  "Bank Entry": {
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    label: "Bank",
  },
  "Cash Entry": {
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
    label: "Cash",
  },
  "Opening Entry": {
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
    label: "Opening",
  },
};

function JournalEntryCard({
  entry,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
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
  const typeConfig =
    VOUCHER_TYPE_CONFIG[entry.voucher_type] ||
    VOUCHER_TYPE_CONFIG["Journal Entry"];

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

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden animate-slide-up",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {entry.name}
              </h3>
              <Badge
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  typeConfig.bgColor,
                  typeConfig.color,
                )}
              >
                {typeConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 line-clamp-1">
              <History className="h-3 w-3" />
              {entry.user_remark || "No remarks"}
            </p>
          </div>

          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center border",
              status === "Submitted"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-slate-500/10 text-slate-600 border-slate-500/20",
            )}
          >
            {status === "Submitted" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
              Debit
            </p>
            <p className="text-sm font-black text-emerald-600">
              {formatCurrency(entry.total_debit ?? 0)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
              Credit
            </p>
            <p className="text-sm font-black text-rose-600">
              {formatCurrency(entry.total_credit ?? 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" />
            {formatDate(entry.posting_date)}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
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
                  className="rounded-lg cursor-pointer text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function JournalEntryListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);

  const {
    data: entries,
    isLoading,
    error,
  } = useFrappeList<JournalEntry>("Journal Entry", {
    fields: [
      "name",
      "voucher_type",
      "posting_date",
      "company",
      "total_debit",
      "total_credit",
      "user_remark",
      "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Journal Entry", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (typeFilter === "all") return entries;
    return entries.filter((e) => e.voucher_type === typeFilter);
  }, [entries, typeFilter]);

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Journal Entries"
        subtitle="Manual GL adjustments and inter-account transfers"
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Entry # or remarks..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20 h-10 px-6 font-bold"
            onClick={() => router.push("/accounting/journal-entry/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        }
      />

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All Entries" },
          { key: "Journal Entry", label: "Journal" },
          { key: "Bank Entry", label: "Bank" },
          { key: "Cash Entry", label: "Cash" },
          { key: "Opening Entry", label: "Opening" },
        ].map((type) => (
          <Button
            key={type.key}
            variant={typeFilter === type.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full transition-all font-bold px-5 h-9",
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
          title="No journal entries"
          description="Record manual adjustments or opening balances"
        />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-[2.5rem]">
          <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-10" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">
            No entries match this type
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEntries.map((entry, i) => (
            <JournalEntryCard
              key={entry.name}
              entry={entry}
              index={i}
              onView={() =>
                router.push(
                  `/accounting/journal-entry/${encodeURIComponent(entry.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/accounting/journal-entry/${encodeURIComponent(entry.name)}/edit`,
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
        title="Delete Journal Entry"
        description={`Are you sure you want to delete entry "${deleteTarget?.name}"?`}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.name)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
