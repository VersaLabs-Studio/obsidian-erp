"use client";

// app/accounting/journal-entry/page.tsx
// Obsidian ERP v4.0 — Journal Entry List (V4 Golden Template)
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
  BookOpen,
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
  StatusBadge,
} from "@/components/smart";
import { KPICard } from "@/components/dashboard/KPICard";
import type { JournalEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

function JournalEntryCard({
  entry,
  index,
  onView,
  onDelete,
}: {
  entry: JournalEntry;
  index: number;
  onView: () => void;
  onDelete: () => void;
}) {
  const isDraft = entry.docstatus === 0;
  const status =
    entry.docstatus === 1
      ? "Submitted"
      : entry.docstatus === 2
        ? "Cancelled"
        : "Draft";

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
          isDraft && "bg-muted-foreground/30",
          entry.docstatus === 1 && "bg-success",
          entry.docstatus === 2 && "bg-destructive",
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
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              {entry.voucher_type || "Journal Entry"}
            </p>
          </div>

          <StatusBadge status={status} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
              Debit
            </p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              {ETB.format(entry.total_debit ?? 0)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
              Credit
            </p>
            <p className="text-sm font-bold text-foreground tabular-nums">
              {ETB.format(entry.total_credit ?? 0)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {entry.posting_date
              ? new Date(entry.posting_date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
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

  const kpis = useMemo(() => {
    if (!entries)
      return { total: 0, thisMonth: 0, draft: 0, submitted: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    return {
      total: entries.length,
      thisMonth: entries.filter((e) => e.posting_date >= monthStart).length,
      draft: entries.filter((e) => e.docstatus === 0).length,
      submitted: entries.filter((e) => e.docstatus === 1).length,
    };
  }, [entries]);

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load journal entries
      </div>
    );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Journal Entries"
        subtitle={`${filteredEntries.length} entr${filteredEntries.length !== 1 ? "ies" : "y"}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Entry # or remarks..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/accounting/journal-entry/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          title="Total Entries"
          value={kpis.total}
          icon={BookOpen}
          isLoading={isLoading}
        />
        <KPICard
          title="This Month"
          value={kpis.thisMonth}
          icon={CalendarDays}
          isLoading={isLoading}
        />
        <KPICard
          title="Draft"
          value={kpis.draft}
          icon={BookOpen}
          variant="warning"
          isLoading={isLoading}
        />
        <KPICard
          title="Submitted"
          value={kpis.submitted}
          icon={BookOpen}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Type Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: entries?.length || 0 },
          {
            key: "Journal Entry",
            label: "Journal",
            count: entries?.filter((e) => e.voucher_type === "Journal Entry")
              .length || 0,
          },
          {
            key: "Opening Entry",
            label: "Opening",
            count: entries?.filter((e) => e.voucher_type === "Opening Entry")
              .length || 0,
          },
          {
            key: "Depreciation Entry",
            label: "Depreciation",
            count: entries?.filter(
              (e) => e.voucher_type === "Depreciation Entry",
            ).length || 0,
          },
        ].map((type) => (
          <Button
            key={type.key}
            variant={typeFilter === type.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full gap-2 transition-all",
              typeFilter === type.key
                ? "shadow-lg shadow-primary/20"
                : "hover:bg-secondary/80",
            )}
            onClick={() => setTypeFilter(type.key)}
          >
            {type.label}
            <Badge
              variant="secondary"
              className={cn(
                "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                typeFilter === type.key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-secondary",
              )}
            >
              {type.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Card Grid */}
      {!entries || entries.length === 0 ? (
        <EmptyState
          title="No journal entries"
          description="Record manual adjustments or opening balances"
          action={
            <Button
              className="rounded-full"
              onClick={() => router.push("/accounting/journal-entry/new")}
            >
              <Plus className="h-4 w-4 mr-2" /> New Journal Entry
            </Button>
          }
        />
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">
            No entries match this filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              onDelete={() => setDeleteTarget(entry)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Journal Entry"
        description={`Are you sure you want to delete entry "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.name)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
