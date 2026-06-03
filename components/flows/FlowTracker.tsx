// components/flows/FlowTracker.tsx
// Obsidian ERP v4.0 - Flow Tracker Component
// Visual tracker showing 8-stage lead-to-cash flow
// OKLCH semantic tokens, Framer Motion, dual theme, skeleton/empty/error states

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  Ban,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { FlowChainResult, FlowStage, FlowStageStatus } from "@/types/flow-types";
import Link from "next/link";

interface FlowTrackerProps {
  result: FlowChainResult;
  isLoading?: boolean;
  error?: Error | null;
  compact?: boolean;
  onCreateAction?: (stageId: string, action: string) => void;
  className?: string;
}

function StageIcon({ status, isLoading }: { status: FlowStageStatus; isLoading?: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }

  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-primary" />;
    case "current":
      return (
        <motion.div
          animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Clock className="h-5 w-5 text-primary" />
        </motion.div>
      );
    case "pending":
      return <Circle className="h-5 w-5 text-muted-foreground/40" />;
    case "skipped":
      return <SkipForward className="h-5 w-5 text-muted-foreground/40" />;
    case "blocked":
      return <Ban className="h-5 w-5 text-destructive" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground/40" />;
  }
}

function FlowStageCard({
  stage,
  isLast,
  compact,
  onCreateAction,
}: {
  stage: FlowStage;
  isLast: boolean;
  compact?: boolean;
  onCreateAction?: (stageId: string, action: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const isClickable = stage.status === "completed" && stage.documentUrl;

  const cardContent = (
    <>
      <StageIcon status={stage.status} />

      <div className="flex flex-col min-w-0">
        <span
          className={cn(
            "text-xs font-medium truncate",
            stage.status === "current" && "text-foreground",
            stage.status === "completed" && "text-primary",
            stage.status === "pending" && "text-muted-foreground",
            stage.status === "skipped" && "text-muted-foreground/60",
            stage.status === "blocked" && "text-destructive"
          )}
        >
          {stage.label}
        </span>

        {!compact && stage.documentName && (
          <span className="text-[10px] text-muted-foreground truncate">
            {stage.documentName}
          </span>
        )}
      </div>

      {stage.status === "current" && stage.canCreateDownstream && stage.createAction && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onCreateAction?.(stage.id, stage.createAction!);
          }}
        >
          Create <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      )}

      {isClickable && (
        <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground/50" />
      )}
    </>
  );

  const cardClasses = cn(
    "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
    stage.status === "completed" &&
      "border-primary/30 bg-primary/5 dark:bg-primary/10",
    stage.status === "current" &&
      "border-primary/30 bg-primary/5 dark:bg-primary/10",
    stage.status === "pending" &&
      "border-border bg-muted/30",
    stage.status === "skipped" &&
      "border-border bg-muted/20 opacity-60",
    stage.status === "blocked" &&
      "border-destructive/30 bg-destructive/5",
    isClickable && "cursor-pointer hover:bg-primary/10 hover:border-primary/40"
  );

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
        className={cardClasses}
      >
        {isClickable ? (
          <Link
            href={stage.documentUrl!}
            className="flex items-center gap-2 min-w-0"
          >
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}
      </motion.div>

      {!isLast && (
        <div
          className={cn(
            "h-px w-4 sm:w-8 flex-shrink-0",
            stage.status === "completed"
              ? "bg-primary/30"
              : "bg-border"
          )}
        />
      )}
    </div>
  );
}

/**
 * FlowTracker — Visual tracker for business process flows
 *
 * Shows the complete chain (Lead → Opportunity → Quotation → Sales Order →
 * Work Order → Delivery → Invoice → Payment) with status indicators and
 * clickable completed stages linking to upstream documents.
 */
export function FlowTracker({
  result,
  isLoading,
  error,
  compact,
  onCreateAction,
  className,
}: FlowTrackerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 overflow-x-auto py-2", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
            {i < 7 && <div className="h-px w-8 bg-muted" />}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3",
          className
        )}
      >
        <Ban className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">
          Failed to load flow status: {error.message}
        </span>
      </div>
    );
  }

  if (!result || result.stages.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed px-4 py-6",
          className
        )}
      >
        <span className="text-sm text-muted-foreground">No flow data available</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className={cn("flex items-center gap-1 sm:gap-2 overflow-x-auto py-2", className)}
    >
      {result.stages.map((stage, index) => (
        <FlowStageCard
          key={stage.id}
          stage={stage}
          isLast={index === result.stages.length - 1}
          compact={compact}
          onCreateAction={onCreateAction}
        />
      ))}
    </motion.div>
  );
}
