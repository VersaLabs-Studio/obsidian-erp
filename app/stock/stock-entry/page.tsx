// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  ArrowRightLeft,
  LogIn,
  LogOut,
  Factory,
  Cog,
  Package,
  Truck,
  Eye,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Monitor,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import type { StockEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const PURPOSE_CONFIG = {
  "Material Issue": {
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/10",
    icon: LogOut,
  },
  "Material Receipt": {
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/10",
    icon: LogIn,
  },
  "Material Transfer": {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/10",
    icon: ArrowRightLeft,
  },
  "Material Transfer for Manufacture": {
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-900/10",
    icon: Factory,
  },
  Manufacture: {
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-900/10",
    icon: Cog,
  },
  Repack: {
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    icon: Package,
  },
  "Send to Subcontractor": {
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-900/10",
    icon: Truck,
  },
};

function StockEntryCard({ entry, index, onView, onEdit, onDelete }) {
  const purposeConfig =
    PURPOSE_CONFIG[entry.purpose] || PURPOSE_CONFIG["Material Transfer"];
  const PurposeIcon = purposeConfig.icon;
  const isDraft = entry.docstatus === 0;
  const isSubmitted = entry.docstatus === 1;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-[2rem] border border-border/50 p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Purpose Badge */}
      <div
        className={cn(
          "absolute -top-2 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
          purposeConfig.bg,
          purposeConfig.color,
          "border-current/10 shadow-sm",
        )}
      >
        <PurposeIcon className="h-3 w-3 inline mr-1.5" />
        {entry.purpose}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mt-3 mb-4">
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {entry.name}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium font-mono uppercase">
            {entry.posting_date
              ? format(parseISO(entry.posting_date), "MMM d, yyyy")
              : "—"}
            {entry.posting_time && ` at ${entry.posting_time.slice(0, 5)}`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/5"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="rounded-xl"
            >
              <Eye className="h-4 w-4 mr-2" /> View Audit Log
            </DropdownMenuItem>
            {isDraft && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="rounded-xl"
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit Entry
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="rounded-xl text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Warehouse Flow */}
      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-2xl border border-border/50 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
            Source
          </p>
          <p
            className={cn(
              "font-bold text-xs truncate",
              entry.from_warehouse
                ? "text-foreground"
                : "text-muted-foreground italic",
            )}
          >
            {entry.from_warehouse?.split(" - ")[0] || "No Source"}
          </p>
        </div>

        <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm border border-border/50">
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
        </div>

        <div className="flex-1 min-w-0 text-right">
          <p className="text-[9px] uppercase font-black text-muted-foreground tracking-widest mb-1">
            Target
          </p>
          <p
            className={cn(
              "font-bold text-xs truncate",
              entry.to_warehouse
                ? "text-foreground"
                : "text-muted-foreground italic",
            )}
          >
            {entry.to_warehouse?.split(" - ")[0] || "No Target"}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        {entry.work_order && (
          <div className="flex items-center gap-1.5 text-indigo-600 font-bold col-span-2 bg-indigo-500/5 px-3 py-1.5 rounded-xl border border-indigo-500/10">
            <Factory className="h-3.5 w-3.5" />
            <span className="truncate">{entry.work_order}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground bg-secondary/20 px-3 py-1.5 rounded-xl">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate font-medium">{entry.company}</span>
        </div>
        {entry.fg_completed_qty > 0 && (
          <div className="flex items-center gap-2 text-violet-600 font-bold bg-violet-500/5 px-3 py-1.5 rounded-xl border border-violet-500/10">
            <Package className="h-3.5 w-3.5" />
            <span>FG: {entry.fg_completed_qty}</span>
          </div>
        )}
      </div>

      {/* Values */}
      {(entry.total_outgoing_value > 0 || entry.total_incoming_value > 0) && (
        <div className="grid grid-cols-2 gap-4 text-[11px] pt-4 border-t border-border/50">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">
              Outgoing
            </p>
            <p className="font-black text-red-600 tabular-nums">
              ETB{" "}
              {entry.total_outgoing_value?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">
              Incoming
            </p>
            <p className="font-black text-emerald-600 tabular-nums">
              ETB{" "}
              {entry.total_incoming_value?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mt-4 flex justify-between items-center">
        <Badge
          className={cn(
            "rounded-full text-[10px] font-black px-3 border-0 shadow-sm",
            isSubmitted
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-slate-500/10 text-slate-600",
          )}
        >
          {isSubmitted ? (
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
          ) : (
            <Clock className="h-3 w-3 mr-1.5" />
          )}
          {isSubmitted ? "SUBMITTED" : "DRAFT"}
        </Badge>
        {isSubmitted && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground opacity-50">
            <Monitor className="h-3 w-3" /> Balanced
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockEntryListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workOrderFilter = searchParams.get("work_order");

  const [searchTerm, setSearchTerm] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filters: any[] = [];
  if (workOrderFilter) filters.push(["work_order", "=", workOrderFilter]);

  const {
    data: entries,
    isLoading,
    refetch,
  } = useFrappeList<StockEntry>("Stock Entry", {
    fields: [
      "name",
      "stock_entry_type",
      "purpose",
      "posting_date",
      "posting_time",
      "work_order",
      "from_warehouse",
      "to_warehouse",
      "fg_completed_qty",
      "total_outgoing_value",
      "total_incoming_value",
      "docstatus",
      "company",
    ],
    filters: filters.length > 0 ? filters : undefined,
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Stock Entry", {
    onSuccess: () => {
      toast.success("Stock Entry deleted");
      refetch();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => {
      const matchesSearch =
        !searchTerm ||
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.work_order?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPurpose =
        purposeFilter === "all" || e.purpose === purposeFilter;
      return matchesSearch && matchesPurpose;
    });
  }, [entries, searchTerm, purposeFilter]);

  if (isLoading) return <LoadingState type="list" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Entries"
        subtitle={
          workOrderFilter
            ? `Inventory movements for ${workOrderFilter}`
            : "Track and manage all warehouse stock movements"
        }
        primaryAction={{
          label: "Create Entry",
          onClick: () => router.push("/stock/stock-entry/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="bg-card rounded-[2rem] border border-border/50 p-2 shadow-sm flex flex-col xl:flex-row gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by ID, order or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-[1.5rem] bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        <Tabs
          value={purposeFilter}
          onValueChange={setPurposeFilter}
          className="xl:w-auto overflow-x-auto"
        >
          <TabsList className="bg-secondary/30 p-1 rounded-[1.5rem] h-12 inline-flex whitespace-nowrap overflow-visible">
            <TabsTrigger
              value="all"
              className="rounded-full px-5 h-10 font-bold"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="Material Receipt"
              className="rounded-full px-5 h-10 font-bold"
            >
              <LogIn className="h-3.5 w-3.5 mr-2" /> Receipt
            </TabsTrigger>
            <TabsTrigger
              value="Material Issue"
              className="rounded-full px-5 h-10 font-bold"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" /> Issue
            </TabsTrigger>
            <TabsTrigger
              value="Material Transfer"
              className="rounded-full px-5 h-10 font-bold"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Transfer
            </TabsTrigger>
            <TabsTrigger
              value="Manufacture"
              className="rounded-full px-5 h-10 font-bold"
            >
              <Cog className="h-3.5 w-3.5 mr-2" /> Manufacture
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No stock entries found"
          description={
            searchTerm
              ? "No movements match your criteria"
              : "Record your first stock movement to update your inventory levels"
          }
          action={
            searchTerm
              ? undefined
              : {
                  label: "New Entry",
                  onClick: () => router.push("/stock/stock-entry/new"),
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((entry, idx) => (
            <StockEntryCard
              key={entry.name}
              entry={entry}
              index={idx}
              onView={() =>
                router.push(
                  `/stock/stock-entry/${encodeURIComponent(entry.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/stock/stock-entry/${encodeURIComponent(entry.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(entry.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Stock Entry?"
        description="This will permanently delete the draft stock entry. Submitted entries cannot be deleted."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
