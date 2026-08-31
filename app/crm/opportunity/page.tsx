// app/crm/opportunity/page.tsx
// Obsidian ERP v4.0 — Opportunity List Page (Golden Template)
// KPI cards, StatusBadge, search, filter pills, card grid.
// Premium UI: OKLCH semantic tokens only, Framer Motion, elevation-first surfaces.

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
  Target,
  CalendarDays,
  Building2,
  Percent,
  TrendingUp,
  Trophy,
  XCircle,
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
import type { Opportunity } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { ListErrorState } from "@/components/ui/list-error-state";

function formatDate(dateStr?: string) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function OpportunityCard({
  opp,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  opp: Opportunity;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-bold text-lg text-foreground tracking-tight truncate">
              {opp.title || opp.party_name || opp.name}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{opp.party_name}</span>
            </p>
          </div>
          <StatusBadge status={opp.status} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Type
            </p>
            <p className="text-sm font-medium text-foreground">
              {opp.opportunity_type || "\u2014"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Stage
            </p>
            <p className="text-sm font-medium text-foreground">
              {opp.sales_stage || "\u2014"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Probability
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1">
              <Percent className="h-3 w-3 text-muted-foreground" />
              {opp.probability ?? "\u2014"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            <span>
              {opp.expected_closing
                ? `Close: ${formatDate(opp.expected_closing)}`
                : `Created: ${formatDate(opp.transaction_date)}`}
            </span>
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
              {opp.status === "Open" && (
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function OpportunityListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);

  const {
    data: opportunities,
    isLoading,
    error,
  } = useFrappeList<Opportunity>("Opportunity", {
    fields: [
      "name",
      "title",
      "party_name",
      "opportunity_from",
      "opportunity_type",
      "sales_stage",
      "probability",
      "expected_closing",
      "transaction_date",
      "status",
      "company",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Opportunity", {
    onSuccess: () => setDeleteTarget(null),
  });

  const filteredOpps = useMemo(() => {
    if (!opportunities) return [];
    if (statusFilter === "all") return opportunities;
    return opportunities.filter((o) => o.status === statusFilter);
  }, [opportunities, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!opportunities) return {};
    return opportunities.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [opportunities]);

  const kpis = useMemo(() => {
    if (!opportunities)
      return { total: 0, open: 0, won: 0, lost: 0, winRate: 0 };
    const total = opportunities.length;
    const open = opportunities.filter((o) => o.status === "Open").length;
    const won = opportunities.filter((o) => o.status === "Converted").length;
    const lost = opportunities.filter((o) => o.status === "Lost").length;
    const closed = won + lost;
    const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
    return { total, open, won, lost, winRate };
  }, [opportunities]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;
  if (error)
    return (
      <ListErrorState
        error={error}
        label="opportunities"
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        subtitle={`${filteredOpps.length} opportunit${filteredOpps.length !== 1 ? "ies" : "y"}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title, party, type..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/crm/opportunity/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Opportunity
          </Button>
        }
      />

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KPICard
          title="Total"
          value={kpis.total}
          icon={Target}
          isLoading={isLoading}
        />
        <KPICard
          title="Open"
          value={kpis.open}
          icon={TrendingUp}
          variant="default"
          isLoading={isLoading}
        />
        <KPICard
          title="Won"
          value={kpis.won}
          icon={Trophy}
          variant="success"
          isLoading={isLoading}
        />
        <KPICard
          title="Lost"
          value={kpis.lost}
          icon={XCircle}
          variant="danger"
          isLoading={isLoading}
        />
        <KPICard
          title="Win Rate"
          value={`${kpis.winRate}%`}
          icon={Percent}
          variant={kpis.winRate >= 50 ? "success" : "warning"}
          isLoading={isLoading}
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All", count: opportunities?.length || 0 },
          { key: "Open", label: "Open", count: statusCounts.Open || 0 },
          { key: "Quotation", label: "Quotation", count: statusCounts.Quotation || 0 },
          { key: "Converted", label: "Converted", count: statusCounts.Converted || 0 },
          { key: "Lost", label: "Lost", count: statusCounts.Lost || 0 },
          { key: "Replied", label: "Replied", count: statusCounts.Replied || 0 },
          { key: "Closed", label: "Closed", count: statusCounts.Closed || 0 },
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

      {/* Opportunities Grid */}
      {!opportunities || opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities found"
          description="Create your first opportunity to start tracking deals"
          action={
            <Button
              onClick={() => router.push("/crm/opportunity/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Opportunity
            </Button>
          }
        />
      ) : filteredOpps.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No opportunities match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOpps.map((opp, index) => (
            <OpportunityCard
              key={opp.name}
              opp={opp}
              index={index}
              onView={() =>
                router.push(
                  `/crm/opportunity/${encodeURIComponent(opp.name)}`,
                )
              }
              onEdit={() =>
                router.push(
                  `/crm/opportunity/${encodeURIComponent(opp.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(opp)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Opportunity"
        description={`Are you sure you want to delete "${deleteTarget?.title || deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
