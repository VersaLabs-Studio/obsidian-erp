// app/manufacturing/page.tsx
// Obsidian ERP v4.0 — Production Jobs Cockpit (2P Part 2.2).
//
// Replaces the WO-list mental model with a "Jobs" board. A Job IS a
// Work Order, but presented as a simple lifecycle: Planned → In
// Production → Done. Each card shows: FG item + qty, a material-
// readiness pill (Ready / Short N items, computed from a single
// batched Bin query for all visible jobs), and the single next action
// button for its state.
//
// The two big wins for the SME operator:
//   1. They see their jobs, not Work Orders. (The word "Work Order"
//      lives in a subtitle/tooltip — the card face stays plain.)
//   2. One click on "Start job" runs the entire material transfer + SE
//      submit + WO status update — no raw Stock Entry, no warehouse
//      picker.

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Factory,
  ArrowRight,
  Package,
  type LucideIcon,
} from "lucide-react";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonLine } from "@/components/ui/skeleton";
import { StartProductionModal } from "@/components/manufacturing/StartProductionModal";
import { FinishProductionModal } from "@/components/manufacturing/FinishProductionModal";
import { CreateJobModal } from "@/components/manufacturing/CreateJobModal";
import {
  binLevelsByItemWarehouse,
  checkReadiness,
  type BinLevel,
} from "@/lib/stock/bin-levels";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WorkOrder {
  name: string;
  production_item: string;
  item_name?: string;
  qty: number;
  status: string; // "Draft" | "Not Started" | "In Process" | "Completed" | "Stopped"
  planned_start_date?: string;
  wip_warehouse?: string;
  fg_warehouse?: string;
  source_warehouse?: string;
  required_items?: Array<{
    item_code: string;
    required_qty: number;
    source_warehouse?: string;
  }>;
}

interface JobCardData {
  wo: WorkOrder;
  statusGroup: "planned" | "in-production" | "done";
  ready: boolean;
  shortCount: number;
  totalItems: number;
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------
function statusGroup(status: string): JobCardData["statusGroup"] {
  if (status === "Completed") return "done";
  if (status === "In Process" || status === "Stopped") return "in-production";
  return "planned";
}

function statusLabel(group: JobCardData["statusGroup"]): string {
  switch (group) {
    case "planned":
      return "Planned";
    case "in-production":
      return "In production";
    case "done":
      return "Done";
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function ManufacturingJobsCockpitPage() {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();

  // Open work orders, ordered by planned_start_date (the ones we plan
  // to start soonest first). 2O's Work Order list routes filter on
  // docstatus=1; we want the same here (drafts are noise on the
  // cockpit — the operator drafts, then submits, then this view).
  const {
    data: workOrders = [],
    isLoading,
  } = useFrappeList<WorkOrder>("Work Order", {
    fields: [
      "name",
      "production_item",
      "item_name",
      "qty",
      "status",
      "planned_start_date",
      "wip_warehouse",
      "fg_warehouse",
      "source_warehouse",
      "required_items",
    ],
    filters: [["docstatus", "=", 1]],
    orderBy: { field: "planned_start_date", order: "asc" },
    limit: 200,
  });

  // ONE batched Bin query for ALL visible jobs (rather than per-card).
  // The map key is `${item_code}::${warehouse}`; the readiness check
  // looks up each required item in O(1).
  const { data: bins = [] } = useFrappeList<BinLevel>("Bin", {
    fields: ["item_code", "warehouse", "actual_qty", "reserved_qty", "projected_qty"],
    limit: 2000,
  });
  const binMap = useMemo(() => binLevelsByItemWarehouse(bins), [bins]);

  // Compute readiness per job
  const jobs: JobCardData[] = useMemo(() => {
    return workOrders.map((wo) => {
      const r = checkReadiness(wo.required_items ?? [], binMap);
      return {
        wo,
        statusGroup: statusGroup(wo.status),
        ready: r.ready,
        shortCount: r.shortCount,
        totalItems: r.totalItems,
      };
    });
  }, [workOrders, binMap]);

  const groups: Array<{
    key: JobCardData["statusGroup"];
    label: string;
    icon: LucideIcon;
  }> = [
    { key: "planned", label: "Planned", icon: Clock },
    { key: "in-production", label: "In production", icon: Factory },
    { key: "done", label: "Done", icon: CheckCircle2 },
  ];

  // Modal state — keyed by job name. We allow exactly one open modal
  // at a time; opening a new one closes the prior.
  const [openStart, setOpenStart] = useState<WorkOrder | null>(null);
  const [openFinish, setOpenFinish] = useState<WorkOrder | null>(null);
  // 2P Part 2.3 — CreateJobModal (one-click "New job" on the Cockpit).
  const [openCreate, setOpenCreate] = useState(false);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-8 pb-12">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <PageHeader
          title="Production"
          subtitle="Run your jobs — start, finish, and watch them through to the finished-goods shelf."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-full"
            onClick={() => setOpenCreate(true)}
            data-testid="cockpit-new-job"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New job
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => router.push("/manufacturing/work-order")}
          >
            <ArrowRight className="mr-1.5 h-4 w-4" /> All work orders
          </Button>
        </div>
      </motion.div>

      {groups.map((g, gi) => {
        const groupJobs = jobs.filter((j) => j.statusGroup === g.key);
        return (
          <section
            key={g.key}
            className="space-y-4"
            aria-label={g.label}
            data-testid={`jobs-group-${g.key}`}
          >
            <header className="flex items-center gap-2 px-1">
              <g.icon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {g.label}
              </h2>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                {groupJobs.length}
              </span>
            </header>
            {groupJobs.length === 0 ? (
              <InfoCard>
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No {g.label.toLowerCase()} jobs.
                </p>
              </InfoCard>
            ) : (
              <div
                className={cn(
                  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
                  gi === 0 && "motion-safe:animate-in",
                )}
              >
                {groupJobs.map((job, i) => (
                  <motion.div
                    key={job.wo.name}
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                    animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.25, delay: 0.05 + i * 0.03 }
                    }
                  >
                    <JobCard
                      job={job}
                      onStart={(wo) => {
                        setOpenFinish(null);
                        setOpenStart(wo);
                      }}
                      onFinish={(wo) => {
                        setOpenStart(null);
                        setOpenFinish(wo);
                      }}
                      onView={(wo) =>
                        router.push(
                          `/manufacturing/work-order/${encodeURIComponent(wo.name)}`,
                        )
                      }
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Modals */}
      {openStart && (
        <StartProductionModal
          open={!!openStart}
          onOpenChange={(o) => !o && setOpenStart(null)}
          workOrderName={openStart.name}
          workOrderQty={openStart.qty}
          productionItem={openStart.production_item}
          sourceWarehouse={openStart.source_warehouse}
          wipWarehouse={openStart.wip_warehouse}
          fgWarehouse={openStart.fg_warehouse}
          requiredItems={(openStart.required_items ?? []).map((r) => ({
            item_code: r.item_code,
            required_qty: r.required_qty,
            source_warehouse: r.source_warehouse,
          }))}
        />
      )}
      {openFinish && (
        <FinishProductionModal
          open={!!openFinish}
          onOpenChange={(o) => !o && setOpenFinish(null)}
          workOrderName={openFinish.name}
          workOrderQty={openFinish.qty}
          producedQty={0}
          productionItem={openFinish.production_item}
          wipWarehouse={openFinish.wip_warehouse}
          fgWarehouse={openFinish.fg_warehouse}
          requiredItems={(openFinish.required_items ?? []).map((r) => ({
            item_code: r.item_code,
            required_qty: r.required_qty,
            source_warehouse: r.source_warehouse,
          }))}
        />
      )}
      {openCreate && (
        <CreateJobModal open={openCreate} onOpenChange={setOpenCreate} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JobCard — one card per Work Order.
// ---------------------------------------------------------------------------
function JobCard({
  job,
  onStart,
  onFinish,
  onView,
}: {
  job: JobCardData;
  onStart: (wo: WorkOrder) => void;
  onFinish: (wo: WorkOrder) => void;
  onView: (wo: WorkOrder) => void;
}) {
  const { wo, statusGroup: g, ready, shortCount, totalItems } = job;

  // Pill: Ready / Short N items (or "—" when no required items)
  const pill =
    totalItems === 0
      ? { label: "No materials", tone: "muted" as const }
      : ready
        ? { label: "Ready", tone: "success" as const }
        : { label: `Short ${shortCount} item${shortCount === 1 ? "" : "s"}`, tone: "warning" as const };

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm shadow-black/5 transition-all hover:border-primary/20 sm:p-5",
        g === "in-production"
          ? "border-warning/30 bg-warning/5"
          : g === "done"
            ? "border-success/30 bg-success/5"
            : "border-border/40",
      )}
      data-testid={`job-card-${wo.name}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/manufacturing/work-order/${encodeURIComponent(wo.name)}`}
            className="block truncate text-sm font-semibold text-foreground hover:text-primary"
          >
            {wo.item_name || wo.production_item}
          </Link>
          <p className="truncate text-[10px] font-mono text-muted-foreground">
            {wo.name} · {wo.production_item}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 rounded-full text-[10px] uppercase tracking-wider",
            g === "in-production" && "border-warning/40 text-warning",
            g === "done" && "border-success/40 text-success",
          )}
        >
          {statusLabel(g)}
        </Badge>
      </div>

      {/* Material readiness pill */}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <Package className="h-3.5 w-3.5 text-muted-foreground" />
        {pill.tone === "success" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" /> {pill.label}
          </span>
        )}
        {pill.tone === "warning" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
            <AlertTriangle className="h-3 w-3" /> {pill.label}
          </span>
        )}
        {pill.tone === "muted" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {pill.label}
          </span>
        )}
      </div>

      {/* Qty + planned start */}
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Qty</p>
          <p className="font-semibold tabular-nums text-foreground">{wo.qty}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Planned start</p>
          <p className="font-medium tabular-nums text-foreground">{wo.planned_start_date ?? "—"}</p>
        </div>
      </div>

      {/* Single next action */}
      <div className="flex flex-wrap gap-2">
        {g === "planned" && (
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => onStart(wo)}
            data-testid={`start-job-${wo.name}`}
          >
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Start job
          </Button>
        )}
        {g === "in-production" && (
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => onFinish(wo)}
            data-testid={`finish-job-${wo.name}`}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Finish job
          </Button>
        )}
        {g === "done" && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => onView(wo)}
            data-testid={`view-job-${wo.name}`}
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> View output
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => onView(wo)}
        >
          Open
        </Button>
      </div>
    </article>
  );
}
