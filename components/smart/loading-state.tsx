// components/smart/loading-state.tsx
// Obsidian ERP v4.0 - Loading State Component

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Number of skeleton rows to show */
  rows?: number;
  /** Alias for rows */
  count?: number;
  /** Variant style */
  variant?: "table" | "cards" | "list" | "detail";
  /** Alias for variant */
  type?: "table" | "cards" | "list" | "detail";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading State component with skeleton animations
 *
 * @example
 * ```tsx
 * <LoadingState rows={5} variant="table" />
 * <LoadingState rows={3} variant="cards" />
 * ```
 */
export function LoadingState({
  rows = 5,
  count,
  variant = "table",
  type,
  className,
}: LoadingStateProps) {
  const activeRows = count || rows;
  const activeVariant = type || variant;

  if (activeVariant === "detail") {
    return (
      <div className={cn("space-y-8 animate-pulse", className)}>
        <div className="h-20 bg-muted/60 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-muted/50 rounded-[2rem]" />
          <div className="h-64 bg-muted/40 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (activeVariant === "cards") {
    return (
      <div
        className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}
      >
        {Array.from({ length: activeRows }).map((_, i) => (
          <CardSkeleton key={i} delay={i * 75} />
        ))}
      </div>
    );
  }

  if (activeVariant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: activeRows }).map((_, i) => (
          <ListItemSkeleton key={i} delay={i * 50} />
        ))}
      </div>
    );
  }

  // Default: table variant
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 rounded-xl">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-32 hidden sm:block" />
        <div className="skeleton h-4 w-20 hidden md:block" />
        <div className="skeleton h-4 w-16 ml-auto" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: activeRows }).map((_, i) => (
        <TableRowSkeleton key={i} delay={i * 50} />
      ))}
    </div>
  );
}

function TableRowSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-4 bg-card rounded-2xl border border-border/50 animate-in fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="skeleton h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-48" />
        <div className="skeleton h-3 w-32" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full hidden sm:block" />
      <div className="skeleton h-8 w-8 rounded-lg" />
    </div>
  );
}

function CardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="p-6 bg-card rounded-2xl border border-border/50 animate-in fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton h-12 w-12 rounded-xl" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex justify-between">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

function ListItemSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl animate-in fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="skeleton h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1">
        <div className="skeleton h-4 w-40" />
      </div>
      <div className="skeleton h-4 w-12" />
    </div>
  );
}

export default LoadingState;
