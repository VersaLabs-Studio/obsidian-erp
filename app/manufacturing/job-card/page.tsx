"use client";

// app/manufacturing/job-card/page.tsx
// Job Card List — KPICard + StatusBadge + card grid. OKLCH semantic tokens only.

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  ClipboardList,
  Settings,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  Hammer,
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
import type { JobCard } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDisplayStatus(jc: JobCard): string {
  if (jc.docstatus === 2) return "Cancelled";
  return jc.status || "Open";
}

const JOB_CARD_TABS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "Open", label: "Open" },
  { key: "Work In Progress", label: "Work In Progress" },
  { key: "Completed", label: "Completed" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

function JobCardCard({
  jc,
  onView,
  onEdit,
  onDelete,
}: {
  jc: JobCard;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = getDisplayStatus(jc);
  const isDraft = jc.docstatus === 0;

  const completionPct =
    jc.for_quantity && jc.for_quantity > 0
      ? Math.round(((jc.total_completed_qty || 0) / jc.for_quantity) * 100)
      : 0;

  return (
    <motion.div
      variants={cardVariants}
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50",
        "hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 cursor-pointer overflow-hidden",
      )}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground tracking-tight">
                {jc.name}
              </h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ClipboardList className="h-3 w-3" />
              {jc.work_order}
            </p>
          </div>
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        {/* Completion Bar */}
        <div className="mb-4 p-3 bg-secondary/20 rounded-xl border border-border/10">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Completion
            </span>
            <span className="text-xs font-bold text-primary">
              {completionPct}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                completionPct >= 100 ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${Math.min(completionPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-bold">
            <span className="text-muted-foreground">
              Done: {jc.total_completed_qty || 0}
            </span>
            <span className="text-foreground">Qty: {jc.for_quantity || 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Operation
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Settings className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{jc.operation}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Workstation
            </p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1 truncate">
              <Hammer className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{jc.workstation || "—"}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Posting Date
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatDate(jc.posting_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
              Company
            </p>
            <p className="text-sm font-medium text-foreground truncate">
              {jc.company}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/50">
            {jc.item_name || jc.production_item || "—"}
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
              {isDraft && (
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
    </motion.div>
  );
}

export default function JobCardListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<JobCard | null>(null);

  const {
    data: jobCards,
    isLoading,
    refetch,
  } = useFrappeList<JobCard>("Job Card", {
    fields: [
      "name",
      "work_order",
      "operation",
      "workstation",
      "status",
      "company",
      "posting_date",
      "for_quantity",
      "total_completed_qty",
      "process_loss_qty",
      "production_item",
      "item_name",
      "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Job Card", {
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
    },
  });

  const filteredCards = useMemo(() => {
    if (!jobCards) return [];
    if (statusFilter === "all") return jobCards;
    return jobCards.filter((jc) => getDisplayStatus(jc) === statusFilter);
  }, [jobCards, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!jobCards) return {} as Record<string, number>;
    return jobCards.reduce(
      (acc, jc) => {
        const s = getDisplayStatus(jc);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [jobCards]);

  const kpis = useMemo(() => {
    if (!jobCards)
      return { total: 0, open: 0, inProgress: 0, completed: 0 };
    return {
      total: jobCards.length,
      open: jobCards.filter((jc) => jc.status === "Open").length,
      inProgress: jobCards.filter((jc) => jc.status === "Work In Progress")
        .length,
      completed: jobCards.filter((jc) => jc.status === "Completed").length,
    };
  }, [jobCards]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  if (isLoading) return <LoadingState type="cards" count={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Cards"
        subtitle={`${filteredCards.length} card${filteredCards.length !== 1 ? "s" : ""}`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ID, work order, operation..."
        actions={
          <Button
            className="rounded-full shadow-lg shadow-primary/20"
            onClick={() => router.push("/manufacturing/job-card/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Job Card
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard title="Total" value={kpis.total} icon={ClipboardList} isLoading={isLoading} />
        <KPICard title="Open" value={kpis.open} icon={Clock} variant="warning" isLoading={isLoading} />
        <KPICard title="In Progress" value={kpis.inProgress} icon={Play} variant="default" isLoading={isLoading} />
        <KPICard title="Completed" value={kpis.completed} icon={CheckCircle2} variant="success" isLoading={isLoading} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {JOB_CARD_TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? jobCards?.length || 0
              : statusCounts[tab.key] || 0;
          return (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full gap-2 transition-all",
                statusFilter === tab.key
                  ? "shadow-lg shadow-primary/20"
                  : "hover:bg-secondary/80",
              )}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                  statusFilter === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary",
                )}
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {!jobCards || jobCards.length === 0 ? (
        <EmptyState
          title="No job cards found"
          description="Create your first job card to start production"
          action={
            <Button
              onClick={() => router.push("/manufacturing/job-card/new")}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Job Card
            </Button>
          }
        />
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No job cards match this filter</p>
          <p className="text-sm mt-1">Try selecting a different status</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={statusFilter}
        >
          {filteredCards.map((jc) => (
            <JobCardCard
              key={jc.name}
              jc={jc}
              onView={() =>
                router.push(`/manufacturing/job-card/${encodeURIComponent(jc.name)}`)
              }
              onEdit={() =>
                router.push(
                  `/manufacturing/job-card/${encodeURIComponent(jc.name)}/edit`,
                )
              }
              onDelete={() => setDeleteTarget(jc)}
            />
          ))}
        </motion.div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Job Card"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
