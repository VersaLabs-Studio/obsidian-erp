// components/flows/FlowAutoFill.tsx
// Obsidian ERP v4.0 - Auto-Fill Indicator Component

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lock, ArrowRight, FileText } from "lucide-react";

interface FlowAutoFillProps {
  /** Source doctype name */
  sourceDoctype: string;
  /** Source document name */
  sourceName?: string;
  /** Number of fields auto-filled */
  filledCount: number;
  /** Number of fields user must fill */
  userFillCount: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FlowAutoFill — Shows auto-fill summary with 🔒 source indicator
 *
 * Displays how many fields were auto-filled from the upstream document
 * and how many the user must fill manually.
 *
 * @example
 * ```tsx
 * <FlowAutoFill
 *   sourceDoctype="Quotation"
 *   sourceName="QTN-2026-001"
 *   filledCount={12}
 *   userFillCount={2}
 * />
 * ```
 */
export function FlowAutoFill({
  sourceDoctype,
  sourceName,
  filledCount,
  userFillCount,
  className,
}: FlowAutoFillProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 dark:bg-primary/10",
        className
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-4 w-4 text-primary" />
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>Auto-filled from</span>
          <span className="font-medium text-foreground">{sourceDoctype}</span>
          {sourceName && (
            <>
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium text-primary">{sourceName}</span>
            </>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs">
          <span className="text-primary">
            <Lock className="inline h-3 w-3 mr-0.5" />
            {filledCount} fields locked
          </span>
          <span className="text-muted-foreground">
            {userFillCount} fields to fill
          </span>
        </div>
      </div>
    </motion.div>
  );
}
