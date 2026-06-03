// components/smart/WhatsNext.tsx
// Obsidian ERP v4.0 - Contextual Action Suggestions

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface WhatsNextAction {
  /** Action label */
  label: string;
  /** Action description */
  description?: string;
  /** Callback when clicked */
  onClick: () => void;
  /** Whether action is primary */
  isPrimary?: boolean;
  /** Whether action is loading */
  isLoading?: boolean;
  /** Whether action is disabled */
  disabled?: boolean;
  /** Tooltip reason shown on hover when disabled */
  disabledReason?: string;
}

interface WhatsNextProps {
  /** Available actions */
  actions: WhatsNextAction[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * WhatsNext — Shows contextual next actions for a document
 *
 * @example
 * ```tsx
 * <WhatsNext
 *   actions={[
 *     { label: "Submit", description: "Submit this order for processing", onClick: handleSubmit, isPrimary: true },
 *     { label: "Create Work Order", description: "Start manufacturing", onClick: handleCreateWO },
 *   ]}
 * />
 * ```
 */
export function WhatsNext({ actions, className }: WhatsNextProps) {
  const prefersReducedMotion = useReducedMotion();

  if (actions.length === 0) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border bg-card p-4",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">What&apos;s Next?</h4>
      </div>

      <div className="space-y-2">
        {actions.map((action) => {
          const isDisabled = action.disabled || action.isLoading;
          const button = (
            <Button
              key={action.label}
              variant={action.isPrimary ? "default" : "ghost"}
              size="sm"
              className="w-full justify-between"
              onClick={action.onClick}
              disabled={isDisabled}
            >
              <div className="flex flex-col items-start">
                <span>{action.label}</span>
                {action.description && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {action.description}
                  </span>
                )}
              </div>
              <ArrowRight className="h-3 w-3 ml-2 flex-shrink-0" />
            </Button>
          );

          if (action.disabled && action.disabledReason) {
            return (
              <div key={action.label} className="group relative">
                {button}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  {action.disabledReason}
                </div>
              </div>
            );
          }

          return button;
        })}
      </div>
    </motion.div>
  );
}
