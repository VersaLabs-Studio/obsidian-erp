// components/flows/FlowRail.tsx
// Obsidian ERP v4.0 — Horizontal pipeline ribbon for flow visualization.
// Renders a single-card pipeline with connected stage nodes, animated
// connectors, progress ring, and one surfaced action per flow.

"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  SkipForward,
  Ban,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type {
  FlowChainResult,
  FlowStage,
  FlowStageStatus,
} from "@/types/flow-types";
import { isModuleBuilt } from "@/lib/flows/module-availability";
import { buildCreateUrl } from "@/lib/flows/flow-chain-resolver";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface FlowRailProps {
  result: FlowChainResult;
  /** G2: Current document name — used to build real create URLs */
  currentDocName?: string;
  /** G2: Current document's doctype — used to build real create URLs */
  sourceDoctype?: string;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveFlowName(flowId: string): string {
  return (
    flowId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") + " Flow"
  );
}

// ---------------------------------------------------------------------------
// Progress ring (20px SVG)
// ---------------------------------------------------------------------------
function ProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const r = 8;
  const circumference = 2 * Math.PI * r;
  const ratio = total > 0 ? completed / total : 0;
  const dash = ratio * circumference;

  return (
    <div className="flex items-center gap-1.5">
      <svg
        width={20}
        height={20}
        className="shrink-0 -rotate-90"
        aria-hidden="true"
      >
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
      <span className="text-xs text-muted-foreground tabular-nums">
        {completed} / {total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node glyph (32px circle)
// ---------------------------------------------------------------------------
function StageNode({ status }: { status: FlowStageStatus }) {
  const prefersReducedMotion = useReducedMotion();

  switch (status) {
    case "completed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      );
    case "current":
      return (
        <motion.div
          animate={prefersReducedMotion ? {} : { scale: [1, 1.12, 1] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/40 shrink-0"
        >
          <Clock className="h-4 w-4 text-primary" />
        </motion.div>
      );
    case "skipped":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 shrink-0">
          <SkipForward className="h-4 w-4 text-muted-foreground/30" />
        </div>
      );
    case "blocked":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 shrink-0">
          <Ban className="h-4 w-4 text-destructive" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
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
    <div className="flex h-8 items-center px-1.5" aria-hidden="true">
      <motion.div
        className={cn(
          "h-1 w-10 rounded-full",
          filled ? "bg-primary" : "bg-border/40",
        )}
        initial={prefersReducedMotion ? {} : { scaleX: 0 }}
        animate={prefersReducedMotion ? {} : { scaleX: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.4, delay: index * 0.05, ease: "easeOut" }
        }
        style={{ originX: 0 }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function FlowRailSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40 p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <SkeletonLine className="h-4 w-32" />
        <div className="flex items-center gap-1.5">
          <SkeletonLine className="h-5 w-5 rounded-full" />
          <SkeletonLine className="h-3 w-10" />
        </div>
      </div>

      <div className="flex items-start">
        {Array.from({ length: 6 }).map((_, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[84px] max-w-[112px]">
              <SkeletonLine className="h-8 w-8 rounded-full" />
              <SkeletonLine className="h-2.5 w-14" />
            </div>
            {i < 5 && (
              <div className="flex h-8 items-center px-1.5">
                <SkeletonLine className="h-1 w-10 rounded-full" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-5">
        <SkeletonLine className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlowRail
// ---------------------------------------------------------------------------
export function FlowRail({
  result,
  currentDocName,
  sourceDoctype,
  isLoading,
  error,
  className,
}: FlowRailProps) {
  const prefersReducedMotion = useReducedMotion();

  // Loading
  if (isLoading) {
    return <FlowRailSkeleton className={className} />;
  }

  // Error
  if (error) {
    return (
      <div
        className={cn(
          "bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40 p-5 sm:p-6",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-destructive">
          <Ban className="h-4 w-4" />
          <span className="text-sm">
            Failed to load flow: {error.message}
          </span>
        </div>
      </div>
    );
  }

  // Empty
  if (!result || result.stages.length === 0) {
    return (
      <div
        className={cn(
          "bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40 p-5 sm:p-6",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Start a document to see its flow here.
          </p>
        </div>
      </div>
    );
  }

  const { stages, completedCount, isComplete, flowId } = result;
  const total = stages.length;
  const flowName = deriveFlowName(flowId);

  // Find next actionable pending stage whose module is built
  const currentIndex = stages.findIndex((s) => s.status === "current");
  const nextBuildableIndex = stages.findIndex((s, i) => {
    return (
      i > currentIndex &&
      s.status === "pending" &&
      isModuleBuilt(s.doctype) &&
      (stages[i - 1].status === "completed" || stages[i - 1].status === "current")
    );
  });
  const nextBuildable =
    nextBuildableIndex >= 0 ? stages[nextBuildableIndex] : null;

  // G2: Build a real URL for the "Create" button instead of using the symbolic createAction id.
  // Uses the same URL pattern as WhatsNext: /<route>/new?<source_doctype_lower>=<doc_name>
  const createHref =
    nextBuildable && currentDocName && sourceDoctype
      ? buildCreateUrl(sourceDoctype, currentDocName, nextBuildable.doctype)
      : null;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className={cn(
        "bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/40 p-5 sm:p-6",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">{flowName}</h3>
        <ProgressRing completed={completedCount} total={total} />
      </div>

      {/* Ribbon — scrollable horizontal pipeline */}
      <div className="overflow-x-auto scroll-smooth snap-x">
        <ol className="flex items-start min-w-max">
          {stages.map((stage, index) => {
            const isCurrent = stage.status === "current";
            const isCompleted = stage.status === "completed";
            const isSkipped = stage.status === "skipped";
            const isBlocked = stage.status === "blocked";
            const hasDocLink = isCompleted && !!stage.documentUrl;

            const stageUnit = (
              <motion.li
                initial={
                  prefersReducedMotion ? {} : { opacity: 0, y: 8 }
                }
                animate={
                  prefersReducedMotion ? {} : { opacity: 1, y: 0 }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.25, delay: index * 0.05 }
                }
                className="shrink-0 min-w-[84px] max-w-[112px] flex flex-col items-center gap-1.5"
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* "Now" pill — current node only */}
                {isCurrent && (
                  <span className="text-[9px] uppercase tracking-wider text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                    Now
                  </span>
                )}

                {/* Node circle */}
                <StageNode status={stage.status} />

                {/* Label — rendered exactly once */}
                <span
                  className={cn(
                    "text-[11px] font-medium truncate max-w-[72px] text-center",
                    isCurrent && "text-foreground font-semibold",
                    isCompleted && "text-muted-foreground",
                    isSkipped &&
                      "text-muted-foreground/50 line-through",
                    isBlocked && "text-muted-foreground/60",
                    !isCurrent &&
                      !isCompleted &&
                      !isSkipped &&
                      !isBlocked &&
                      "text-muted-foreground/60",
                  )}
                >
                  {stage.label}
                </span>
              </motion.li>
            );

            return (
              <React.Fragment key={stage.id}>
                {hasDocLink ? (
                  <Link
                    href={stage.documentUrl!}
                    className="outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
                    aria-label={`View ${stage.documentName ?? stage.label}`}
                  >
                    {stageUnit}
                  </Link>
                ) : (
                  stageUnit
                )}
                {index < stages.length - 1 && (
                  <Connector
                    filled={isCompleted}
                    index={index}
                    prefersReducedMotion={!!prefersReducedMotion}
                  />
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </div>

      {/* Action zone — G2: use real URL, gate on createHref (not symbolic id) */}
      {!isComplete && nextBuildable && createHref && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.3, delay: 0.3 }
          }
          className="mt-5 flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3"
        >
          <span className="text-xs text-muted-foreground">
            Up next · {nextBuildable.label}
          </span>
          <Link href={createHref}>
            <Button size="sm" className="gap-1.5">
              Create <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </motion.div>
      )}

      {isComplete && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.3, delay: 0.3 }
          }
          className="mt-5 flex items-center justify-center rounded-xl bg-muted/40 px-4 py-3"
        >
          <span className="text-xs font-medium text-primary">
            All stages complete ✓
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
