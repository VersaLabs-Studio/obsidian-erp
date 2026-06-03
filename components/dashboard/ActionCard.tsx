// components/dashboard/ActionCard.tsx
// Obsidian ERP v4.0 - Action Suggestion Card

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface ActionCardProps {
  /** Action title */
  title: string;
  /** Action description */
  description: string;
  /** Icon */
  icon?: LucideIcon;
  /** Button label */
  actionLabel?: string;
  /** Callback when action is clicked */
  onAction?: () => void;
  /** Whether the action is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ActionCard — Contextual action suggestion for dashboard
 *
 * @example
 * ```tsx
 * <ActionCard
 *   title="Create Sales Order"
 *   description="3 quotations are ready to convert to sales orders"
 *   icon={ShoppingCart}
 *   actionLabel="Review Quotations"
 *   onAction={() => router.push("/sales/quotation")}
 * />
 * ```
 */
export function ActionCard({
  title,
  description,
  icon: Icon,
  actionLabel = "Take Action",
  onAction,
  isLoading,
  className,
}: ActionCardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-28 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border bg-card p-4 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="mt-3 w-full justify-between"
        onClick={onAction}
      >
        {actionLabel}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}
