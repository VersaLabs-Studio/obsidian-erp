"use client";

// app/manufacturing/job-card/page.tsx
// Job Card List — KPICard + StatusBadge + card grid. OKLCH semantic tokens only.
// v4.2 — the shop floor's primary tool: each card now shows its ASSIGNED
// EMPLOYEE prominently (emphasized chip with avatar + name) so a manufacturing
// user can instantly find the Job Cards assigned to them. Employee child data
// is merged server-side by /api/manufacturing/job-card/list-employees (a
// parent getDocList cannot return child-table fields — the factory list
// handler 500s on `employee`).

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeDelete } from "@/hooks/generic";
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

/** Assigned-employee row shape merged by the composite list route. */
interface AssignedEmployeeRow {
  employee?: string;
  employee_name?: string;
}

/** Normalized employee display entry for a Job Card. */
interface AssignedEmployee {
  /** Employee doctype id (stable key). */
  id: string;
  /** Human-readable display name (employee_name preferred). */
  display: string;
}

/** Read the merged `employee` child rows into normalized display entries. */
function toAssignedEmployees(jc: JobCard): AssignedEmployee[] {
  if (!Array.isArray(jc.employee)) return [];
  const out: AssignedEmployee[] = [];
  for (const raw of jc.employee) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as AssignedEmployeeRow;
    const id = row.employee;
    if (!id) continue;
    out.push({ id, display: row.employee_name || id });
  }
  return out;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
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
  const assigned = useMemo(() => toAssignedEmployees(jc), [jc]);

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
        assigned.length > 0 && "ring-1 ring-emerald-500/20",
      )}
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
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

        {/* Assigned employees — emphasized so shop-floor users find "their"
            Job Cards at a glance. Name is bold, with initials avatar. */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {assigned.length > 0 ? (
            assigned.map((emp) => (
              <span
                key={emp.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/25 text-[10px] font-black text-emerald-800 dark:text-emerald-200">
                  {initials(emp.display)}
                </span>
                {emp.display}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-sm font-semibold text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-400">
              <UserPlus className="h-3.5 w-3.5" />
              Unassigned
            </span>
          )}
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
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<JobCard | null>(null);

  // v4.2 — composite route: parent rows + merged `employee` child data.
  const {
    data: jobCards,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["Job Card", "list-employees", { search, limit: 100 }],
    queryFn: async (): Promise<JobCard[]> => {
      const params = new URLSearchParams();
      params.set(
        "fields",
        JSON.stringify([
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
        ]),
      );
      params.set("limit", "100");
      if (search) params.set("search", search);
      const res = await fetch(
        `/api/manufacturing/job-card/list-employees?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.details || err.error || "Failed to fetch Job Cards",
        );
      }
      const json = await res.json();
      return json.data as JobCard[];
    },
    staleTime: 60 * 1000,
  });

  const deleteMutation = useFrappeDelete("Job Card", {
    onSuccess: () => {
      setDeleteTarget(null);
      refetch();
    },
  });

  // Assigned-employee quick filter — "easy access to their respective JCs".
  const employeeOptions = useMemo(() => {
    if (!jobCards) return [] as string[];
    const set = new Set<string>();
    for (const jc of jobCards) {
      for (const emp of toAssignedEmployees(jc)) set.add(emp.display);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobCards]);

  const filteredCards = useMemo(() => {
    if (!jobCards) return [];
    let cards = jobCards;
    if (statusFilter !== "all") {
      cards = cards.filter((jc) => getDisplayStatus(jc) === statusFilter);
    }
    if (employeeFilter) {
      cards = cards.filter((jc) =>
        toAssignedEmployees(jc).some((emp) => emp.display === employeeFilter),
      );
    }
    return cards;
  }, [jobCards, statusFilter, employeeFilter]);

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

      <div className="flex gap-2 flex-wrap items-center">
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

        {/* Assigned-to filter — mfg users jump straight to their cards */}
        {employeeOptions.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <label
              htmlFor="jc-employee-filter"
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              Assigned to
            </label>
            <select
              id="jc-employee-filter"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-8 rounded-full border border-border/60 bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary/50 cursor-pointer"
            >
              <option value="">Everyone</option>
              {employeeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <p className="text-sm mt-1">Try selecting a different status or employee</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={`${statusFilter}-${employeeFilter}`}
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
