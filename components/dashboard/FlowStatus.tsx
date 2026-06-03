// components/dashboard/FlowStatus.tsx
// Obsidian ERP v4.0 - Mini Flow Status Widget for Dashboard

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { FlowChainResult } from "@/types/flow-types";

interface FlowStatusProps {
  /** Flow chain result */
  result: FlowChainResult;
  /** Link to view full flow */
  viewLink?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FlowStatus — Compact flow status widget for dashboard
 *
 * Shows a mini version of the flow tracker suitable for
 * dashboard cards and sidebars.
 */
export function FlowStatus({ result, viewLink, className }: FlowStatusProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("rounded-xl border bg-card p-4", className)}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Flow Progress</h4>
        {viewLink && (
          <Link
            href={viewLink}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1">
        {result.stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            {stage.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : stage.status === "current" ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Clock className="h-4 w-4 text-primary" />
              </motion.div>
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/30" />
            )}
            {index < result.stages.length - 1 && (
              <div
                className={cn(
                  "h-px w-2",
                  stage.status === "completed" ? "bg-emerald-300" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {result.completedCount} of {result.stages.length} stages complete
      </div>
    </motion.div>
  );
}
