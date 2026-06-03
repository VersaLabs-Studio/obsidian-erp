// components/smart/ActivityTimeline.tsx
// Obsidian ERP v4.0 - Chronological Activity Feed

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  CheckCircle2,
  Edit3,
  MessageSquare,
  UserPlus,
  Send,
  type LucideIcon,
} from "lucide-react";

interface ActivityItem {
  /** Unique ID */
  id: string;
  /** Activity type */
  type: "created" | "updated" | "submitted" | "commented" | "assigned" | "status_change";
  /** Activity description */
  description: string;
  /** User who performed the action */
  user?: string;
  /** Timestamp */
  timestamp: string;
  /** Additional details */
  details?: string;
}

interface ActivityTimelineProps {
  /** Activity items */
  items: ActivityItem[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Maximum items to show */
  maxItems?: number;
  /** Additional CSS classes */
  className?: string;
}

const ACTIVITY_ICONS: Record<ActivityItem["type"], LucideIcon> = {
  created: FileText,
  updated: Edit3,
  submitted: Send,
  commented: MessageSquare,
  assigned: UserPlus,
  status_change: CheckCircle2,
};

// OKLCH semantic tokens only — no off-palette colors (premium-ui anti-slop rule).
const ACTIVITY_COLORS: Record<ActivityItem["type"], string> = {
  created: "bg-primary/10 text-primary",
  updated: "bg-secondary text-secondary-foreground",
  submitted: "bg-primary/10 text-primary",
  commented: "bg-muted text-muted-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  status_change: "bg-primary/10 text-primary",
};

/**
 * ActivityTimeline — Chronological activity feed for document history
 *
 * @example
 * ```tsx
 * <ActivityTimeline
 *   items={[
 *     { id: "1", type: "created", description: "Sales Order created", user: "Admin", timestamp: "2026-01-15T10:30:00Z" },
 *     { id: "2", type: "submitted", description: "Order submitted", user: "Admin", timestamp: "2026-01-15T11:00:00Z" },
 *   ]}
 * />
 * ```
 */
export function ActivityTimeline({
  items,
  isLoading,
  maxItems = 10,
  className,
}: ActivityTimelineProps) {
  const prefersReducedMotion = useReducedMotion();
  const displayItems = items.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        <div className="h-4 w-32 animate-pulse rounded bg-muted mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1">
              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("rounded-xl border bg-card p-4", className)}
    >
      <h4 className="text-sm font-semibold text-foreground mb-4">Activity</h4>

      <div className="space-y-4">
        {displayItems.map((item, index) => {
          const Icon = ACTIVITY_ICONS[item.type];
          const colorClass = ACTIVITY_COLORS[item.type];

          return (
            <motion.div
              key={item.id}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -8 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex items-start gap-3"
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
                  colorClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{item.description}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {item.user && <span>{item.user}</span>}
                  <span>·</span>
                  <span>
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </div>
                {item.details && (
                  <p className="mt-1 text-xs text-muted-foreground/80">{item.details}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
