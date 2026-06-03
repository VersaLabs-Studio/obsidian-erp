// components/dashboard/KPICard.tsx
// Obsidian ERP v4.0 - KPI Metric Card with Trend Indicator

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface KPICardProps {
  /** KPI title */
  title: string;
  /** KPI value */
  value: string | number;
  /** Previous value for comparison */
  previousValue?: string | number;
  /** Trend direction */
  trend?: "up" | "down" | "neutral";
  /** Trend percentage */
  trendValue?: string;
  /** Icon */
  icon?: LucideIcon;
  /** Color variant */
  variant?: "default" | "success" | "warning" | "danger";
  /** Whether data is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * KPICard — Dashboard metric card with trend indicator
 *
 * @example
 * ```tsx
 * <KPICard
 *   title="Total Revenue"
 *   value="ETB 1,234,567"
 *   trend="up"
 *   trendValue="+12.5%"
 *   icon={DollarSign}
 * />
 * ```
 */
export function KPICard({
  title,
  value,
  trend,
  trendValue,
  icon: Icon,
  variant = "default",
  isLoading,
  className,
}: KPICardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-xl border bg-card p-4 sm:p-5",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 transition-shadow hover:shadow-md",
        variant === "success" && "border-emerald-200 dark:border-emerald-800",
        variant === "warning" && "border-amber-200 dark:border-amber-800",
        variant === "danger" && "border-destructive/30",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              variant === "default" && "bg-primary/10 text-primary",
              variant === "success" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
              variant === "warning" && "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
              variant === "danger" && "bg-destructive/10 text-destructive"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>

      {trend && trendValue && (
        <div className="mt-1 flex items-center gap-1">
          <TrendIcon
            className={cn(
              "h-3 w-3",
              trend === "up" && "text-emerald-500",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-emerald-600 dark:text-emerald-400",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trendValue}
          </span>
        </div>
      )}
    </motion.div>
  );
}
