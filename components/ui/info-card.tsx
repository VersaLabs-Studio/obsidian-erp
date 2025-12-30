// components/ui/info-card.tsx
// Pana ERP v1.3 - Reusable Info Card Component

import { cn } from "@/lib/utils";
import React from "react";

interface InfoCardProps {
  /** Card title with optional icon */
  title?: React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Animation delay in milliseconds */
  delay?: number;
  /** Card variant */
  variant?: "default" | "gradient" | "transparent";
  /** Gradient colors (for gradient variant) */
  gradientFrom?: string;
  gradientTo?: string;
}

export function InfoCard({
  title,
  children,
  className,
  delay = 0,
  variant = "default",
  gradientFrom = "from-indigo-50/50",
  gradientTo = "to-purple-50/50",
}: InfoCardProps) {
  const variantClasses = {
    default: "bg-card shadow-sm hover:shadow-xl hover:shadow-primary/5",
    gradient: `bg-gradient-to-br from-primary/5 to-primary/10 border border-border/50`,
    transparent: "bg-transparent border-none shadow-none hover:shadow-none p-0",
  };

  return (
    <div
      className={cn(
        "rounded-[2rem] p-8 transition-all duration-500 animate-slide-up",
        variantClasses[variant],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {title && (
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

/**
 * Data Point - Used inside InfoCard for displaying key-value pairs
 */
interface DataPointProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}

export function DataPoint({
  label,
  value,
  mono = false,
  className,
}: DataPointProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-base font-medium text-foreground",
          mono && "font-mono tracking-tight"
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/**
 * Stat Card - Used for displaying numeric stats with labels
 */
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-secondary/30 p-4 rounded-2xl flex flex-col gap-2",
        className
      )}
    >
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <span className={cn("text-xl font-mono", valueClassName)}>{value}</span>
    </div>
  );
}
