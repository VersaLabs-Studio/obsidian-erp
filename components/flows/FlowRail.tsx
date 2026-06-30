// components/flows/FlowRail.tsx
// Obsidian ERP v4.0 — Flow pipeline ribbon (master §13 redesign).
//
// A document's position in its business flow, redesigned for clarity + action:
//   • a compact horizontal ribbon (scannable at a glance, 375px-friendly)
//   • every stage node is data-rich (doctype glyph + label + resolved doc name)
//     and INTERACTIVE wherever there's something to do — view a completed doc,
//     or create the next one (real buildCreateUrl hrefs, never symbolic ids)
//   • a "focus zone" beneath the ribbon carries the rich text + primary action,
//     so the ribbon stays light while the card as a whole is informative
//   • premium skeleton, dual-theme, reduced-motion safe.
//
// Props are unchanged from the prior version — all detail-page call sites keep
// working (result, currentDocName, sourceDoctype, isLoading, error, className).

"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  SkipForward,
  Ban,
  ArrowRight,
  Plus,
  Eye,
  Circle,
  // stage glyphs (names match flow-definitions `icon` strings)
  UserPlus,
  User,
  FileText,
  ShoppingCart,
  Factory,
  Truck,
  Receipt,
  CreditCard,
  ClipboardList,
  FileSearch,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import type {
  FlowChainResult,
  FlowStage,
  FlowStageStatus,
} from "@/types/flow-types";
import { isModuleBuilt } from "@/lib/flows/module-availability";
import {
  buildCreateUrl,
  getFlowProgressDescription,
} from "@/lib/flows/flow-chain-resolver";
import { getFlowDefinition } from "@/lib/flows/flow-definitions";

// ---------------------------------------------------------------------------
// Motion (skill MOTION constants)
// ---------------------------------------------------------------------------
const EASE = [0.4, 0, 0.2, 1] as const;

// ---------------------------------------------------------------------------
// Per-stage glyph + one-line role hint ("info on what it's displaying").
// Static reference data — presentation only, no business logic.
// ---------------------------------------------------------------------------
const STAGE_ICONS: Record<string, LucideIcon> = {
  UserPlus,
  User,
  FileText,
  ShoppingCart,
  Factory,
  Truck,
  Receipt,
  CreditCard,
  ClipboardList,
  FileSearch,
  PackageCheck,
};

const STAGE_HINTS: Record<string, string> = {
  Lead: "Unqualified prospect",
  Customer: "Qualified buyer",
  Quotation: "Price proposal sent to the customer",
  "Sales Order": "Confirmed customer order",
  "Work Order": "Production job (optional)",
  "Delivery Note": "Goods shipped to the customer",
  "Sales Invoice": "Bill issued to the customer",
  "Payment Entry": "Cash received or paid",
  "Material Request": "Internal request to procure",
  "Request for Quotation": "Prices requested from suppliers",
  "Supplier Quotation": "Supplier's price offer",
  "Purchase Order": "Confirmed order to the supplier",
  "Purchase Receipt": "Goods received from the supplier",
  "Purchase Invoice": "Supplier's bill",
};

function stageGlyph(stage: FlowStage): LucideIcon {
  return (stage.icon && STAGE_ICONS[stage.icon]) || Circle;
}

const STATUS_TEXT: Record<FlowStageStatus, string> = {
  completed: "Done",
  current: "In progress",
  pending: "Not started",
  skipped: "Skipped",
  blocked: "Blocked",
};

// ---------------------------------------------------------------------------
// Progress ring (20px SVG) — 2Q Part 9 adds the percentage label inside
// the ring for at-a-glance completion (the B1 container language keeps
// the ring subtle, no black borders).
// ---------------------------------------------------------------------------
function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const r = 8;
  const circumference = 2 * Math.PI * r;
  const ratio = total > 0 ? completed / total : 0;
  const dash = ratio * circumference;
  const pct = Math.round(ratio * 100);

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="flow-progress"
      data-pct={pct}
    >
      <svg width={20} height={20} className="shrink-0 -rotate-90" aria-hidden="true">
        <circle
          cx={10}
          cy={10}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-border/40"
          strokeWidth={2}
        />
        <circle
          cx={10}
          cy={10}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth={2}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-medium text-muted-foreground tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node glyph (36px circle) — carries the doctype icon, status via treatment
// ---------------------------------------------------------------------------
function StageGlyph({
  stage,
  isNextCreate,
  prefersReducedMotion,
}: {
  stage: FlowStage;
  isNextCreate: boolean;
  prefersReducedMotion: boolean;
}) {
  const Icon = stageGlyph(stage);
  const base =
    "relative flex h-9 w-9 items-center justify-center rounded-full shrink-0 transition-colors";

  // The "create here" pending node gets a dashed primary ring + Plus badge.
  if (isNextCreate) {
    return (
      <div
        className={cn(
          base,
          "bg-primary/5 ring-2 ring-dashed ring-primary/50 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
          <Plus className="h-2.5 w-2.5" />
        </span>
      </div>
    );
  }

  switch (stage.status) {
    case "completed":
      return (
        <div className={cn(base, "bg-primary text-primary-foreground")}>
          <Icon className="h-4 w-4" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-card text-primary ring-2 ring-card">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
      );
    case "current":
      return (
        <motion.div
          animate={prefersReducedMotion ? {} : { scale: [1, 1.08, 1] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
          className={cn(base, "bg-primary/10 ring-2 ring-primary/40 text-primary")}
        >
          <Icon className="h-4 w-4" />
        </motion.div>
      );
    case "blocked":
      return (
        <div className={cn(base, "bg-destructive/10 text-destructive")}>
          <Ban className="h-4 w-4" />
        </div>
      );
    case "skipped":
      return (
        <div className={cn(base, "bg-muted/50 text-muted-foreground/40")}>
          <SkipForward className="h-4 w-4" />
        </div>
      );
    default:
      return (
        <div className={cn(base, "bg-muted text-muted-foreground/50")}>
          <Icon className="h-4 w-4" />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Connector bar between nodes
// ---------------------------------------------------------------------------
function Connector({
  filled,
  index,
  prefersReducedMotion,
}: {
  filled: boolean;
  index: number;
  prefersReducedMotion: boolean;
}) {
  return (
    <div className="flex h-9 items-center px-1" aria-hidden="true">
      <motion.div
        className={cn("h-1 w-8 rounded-full", filled ? "bg-primary" : "bg-border/50")}
        initial={prefersReducedMotion ? {} : { scaleX: 0 }}
        animate={prefersReducedMotion ? {} : { scaleX: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.4, delay: index * 0.05, ease: EASE }
        }
        style={{ originX: 0 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single stage column (glyph + label + sub-line). Interactive wrapper is
// applied by the caller.
// ---------------------------------------------------------------------------
function StageColumn({
  stage,
  isCurrent,
  isNextCreate,
  interactive,
  prefersReducedMotion,
  index,
}: {
  stage: FlowStage;
  isCurrent: boolean;
  isNextCreate: boolean;
  interactive: boolean;
  prefersReducedMotion: boolean;
  index: number;
}) {
  const isCompleted = stage.status === "completed";
  const isSkipped = stage.status === "skipped";

  // Sub-line: prefer the resolved doc name, else a status / optional hint.
  const subline = stage.documentName
    ? stage.documentName
    : isNextCreate
      ? "Create"
      : stage.isOptional && stage.status === "pending"
        ? "Optional"
        : STATUS_TEXT[stage.status];

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion ? { duration: 0 } : { duration: 0.25, delay: index * 0.05 }
      }
      className={cn(
        "flex w-[88px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2",
        interactive && "transition-colors hover:bg-secondary/40",
      )}
    >
      {/* "Now" pill — current node only (reserve height so nodes align) */}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
          isCurrent ? "bg-primary/10 text-primary" : "select-none text-transparent",
        )}
      >
        Now
      </span>

      <StageGlyph
        stage={stage}
        isNextCreate={isNextCreate}
        prefersReducedMotion={prefersReducedMotion}
      />

      <span
        className={cn(
          "max-w-[80px] truncate text-center text-[11px] font-medium",
          isCurrent && "font-semibold text-foreground",
          isCompleted && "text-foreground/80",
          isNextCreate && "text-primary",
          isSkipped && "text-muted-foreground/50 line-through",
          !isCurrent && !isCompleted && !isNextCreate && !isSkipped && "text-muted-foreground/60",
        )}
      >
        {stage.label}
      </span>

      {/* Sub-line: doc name (interactive→primary) or status word */}
      <span
        className={cn(
          "flex max-w-[82px] items-center gap-0.5 truncate text-center text-[10px]",
          stage.documentName && interactive
            ? "text-primary"
            : isNextCreate
              ? "text-primary/80"
              : "text-muted-foreground/55",
        )}
      >
        {stage.documentName && interactive && !isCurrent && (
          <Eye className="h-2.5 w-2.5 shrink-0" />
        )}
        <span className="truncate">{subline}</span>
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — matches the new header + ribbon + focus-zone layout
// ---------------------------------------------------------------------------
function FlowRailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6",
        className,
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="h-4 w-12" />
      </div>
      <SkeletonLine className="mb-5 h-3 w-52" />

      <div className="flex items-start">
        {Array.from({ length: 6 }).map((_, i) => (
          <React.Fragment key={i}>
            <div className="flex w-[88px] shrink-0 flex-col items-center gap-1.5 py-2">
              <SkeletonLine className="h-3 w-8" />
              <SkeletonLine className="h-9 w-9 rounded-full" />
              <SkeletonLine className="h-2.5 w-14" />
              <SkeletonLine className="h-2 w-10" />
            </div>
            {i < 5 && (
              <div className="flex h-9 items-center px-1">
                <SkeletonLine className="h-1 w-8 rounded-full" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <SkeletonLine className="mt-5 h-14 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell (shared chrome for error / empty / content)
// ---------------------------------------------------------------------------
function Shell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlowRail
// ---------------------------------------------------------------------------
interface FlowRailProps {
  result: FlowChainResult;
  /** Current document name — used to build real create URLs */
  currentDocName?: string;
  /** Current document's doctype — used to build real create URLs */
  sourceDoctype?: string;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
  /** 2V P0-6 — When set, the "Create" affordance in the focus zone calls
   *  this callback instead of navigating. The page uses this to intercept
   *  the create action (e.g. SO page intercepts Work Order creation to run
   *  its inline multi-create engine). */
  onCreateDownstream?: (targetDoctype: string) => void;
  /** 2V P0-6 — When set, the "Create" affordance is disabled with the
   *  given reason tooltip. Used on draft docs where downstream creation
   *  is not yet permitted (e.g. draft SO → "Submit the Sales Order first"). */
  disableCreate?: string;
}

export function FlowRail({
  result,
  currentDocName,
  sourceDoctype,
  isLoading,
  error,
  className,
  onCreateDownstream,
  disableCreate,
}: FlowRailProps) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) return <FlowRailSkeleton className={className} />;

  if (error) {
    return (
      <Shell className={className}>
        <div className="flex items-center gap-2 text-destructive">
          <Ban className="h-4 w-4 shrink-0" />
          <span className="text-sm">Failed to load flow: {error.message}</span>
        </div>
      </Shell>
    );
  }

  if (!result || result.stages.length === 0) {
    return (
      <Shell className={className}>
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Circle className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Start a document to see its flow here.
          </p>
        </div>
      </Shell>
    );
  }

  const { stages, completedCount, isComplete, flowId, currentIndex } = result;
  const total = stages.length;
  const definition = getFlowDefinition(flowId);
  const flowName = definition?.name ?? "Flow";
  const flowDescription = definition?.description ?? getFlowProgressDescription(result);

  // Next actionable pending stage whose module is built (the "create here" node).
  const nextBuildableIndex = stages.findIndex(
    (s, i) =>
      i > currentIndex &&
      s.status === "pending" &&
      isModuleBuilt(s.doctype) &&
      (stages[i - 1]?.status === "completed" || stages[i - 1]?.status === "current"),
  );
  const nextBuildable = nextBuildableIndex >= 0 ? stages[nextBuildableIndex] : null;

  // Real create URL (never the symbolic createAction id).
  const createHref =
    nextBuildable && currentDocName && sourceDoctype
      ? buildCreateUrl(sourceDoctype, currentDocName, nextBuildable.doctype)
      : null;

  // Per-stage interactivity: view a resolved doc, or create the next one.
  const hrefFor = (
    stage: FlowStage,
    index: number,
  ): { href: string; create: boolean } | null => {
    if (index === nextBuildableIndex && createHref) return { href: createHref, create: true };
    if ((stage.status === "completed" || stage.status === "current") && stage.documentUrl) {
      return { href: stage.documentUrl, create: false };
    }
    return null;
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: EASE }}
    >
      <Shell className={className}>
        {/* Header — flow name + descriptor + progress ring */}
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">{flowName}</h3>
          <ProgressRing completed={completedCount} total={total} />
        </div>
        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">{flowDescription}</p>

        {/* Ribbon — scrollable horizontal pipeline */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <ol className="flex min-w-max items-start">
            {stages.map((stage, index) => {
              const link = hrefFor(stage, index);
              const isCurrent = stage.status === "current";
              const isNextCreate = index === nextBuildableIndex && !!createHref;

              const isCreateDisabled = link?.create && !!disableCreate;
              // 2W A1 — when a create node is disabled (e.g. draft SO), drop
              // the "create here" affordance treatment so the ribbon stays
              // consistent with the focus-zone gate.
              const showCreateAffordance = isNextCreate && !isCreateDisabled;

              const column = (
                <StageColumn
                  stage={stage}
                  isCurrent={isCurrent}
                  isNextCreate={showCreateAffordance}
                  interactive={!!link && !isCreateDisabled}
                  prefersReducedMotion={!!prefersReducedMotion}
                  index={index}
                />
              );

              const title = STAGE_HINTS[stage.doctype]
                ? `${stage.label} — ${STAGE_HINTS[stage.doctype]}${
                    stage.documentName ? ` · ${stage.documentName}` : ""
                  }`
                : stage.label;

              return (
                <React.Fragment key={stage.id}>
                  <li
                    title={isCreateDisabled ? disableCreate : title}
                    aria-disabled={isCreateDisabled ? "true" : undefined}
                  >
                    {link && !isCreateDisabled ? (
                      <Link
                        href={link.href}
                        aria-label={
                          link.create
                            ? `Create ${stage.label}`
                            : `View ${stage.documentName ?? stage.label}`
                        }
                        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        {column}
                      </Link>
                    ) : (
                      column
                    )}
                  </li>
                  {index < stages.length - 1 && (
                    <Connector
                      filled={stage.status === "completed"}
                      index={index}
                      prefersReducedMotion={!!prefersReducedMotion}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </div>

        {/* Focus zone — the rich context + primary action */}
        {!isComplete && nextBuildable && createHref && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.3, delay: 0.25, ease: EASE }
            }
            className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-secondary/30 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Up next
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {nextBuildable.label}
              </p>
              {STAGE_HINTS[nextBuildable.doctype] && (
                <p className="truncate text-xs text-muted-foreground">
                  {STAGE_HINTS[nextBuildable.doctype]}
                </p>
              )}
            </div>
            {disableCreate ? (
              <span
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl bg-muted/50 px-4 py-2 text-xs text-muted-foreground"
                title={disableCreate}
              >
                {disableCreate}
              </span>
            ) : onCreateDownstream ? (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => onCreateDownstream(nextBuildable.doctype)}
              >
                Create <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Link href={createHref} className="shrink-0">
                <Button size="sm" className="gap-1.5">
                  Create <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </motion.div>
        )}

        {/* Not complete, but no buildable next step — show where we are */}
        {!isComplete && !(nextBuildable && createHref) && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-muted-foreground">
              {getFlowProgressDescription(result)}
            </span>
          </div>
        )}

        {isComplete && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.3, delay: 0.25, ease: EASE }
            }
            className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary/5 px-4 py-3"
          >
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">All stages complete</span>
          </motion.div>
        )}
      </Shell>
    </motion.div>
  );
}
