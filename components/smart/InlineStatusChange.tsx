// components/smart/InlineStatusChange.tsx
// Obsidian ERP v4.0 - Status Dropdown on List Rows

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface InlineStatusChangeProps {
  /** Current status */
  currentStatus: string;
  /** Available statuses */
  statuses: string[];
  /** Status change callback */
  onStatusChange: (newStatus: string) => Promise<void>;
  /** Status color map */
  statusColors?: Record<string, string>;
  /** Whether the change is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-secondary text-secondary-foreground",
  "To Deliver and Bill": "bg-primary/10 text-primary",
  "To Deliver": "bg-primary/10 text-primary",
  "To Bill": "bg-primary/10 text-primary",
  Completed: "bg-primary/10 text-primary",
  Cancelled: "bg-muted text-muted-foreground",
  Open: "bg-primary/10 text-primary",
  Submitted: "bg-primary/10 text-primary",
  Paid: "bg-primary/10 text-primary",
  Unpaid: "bg-muted text-muted-foreground",
  Overdue: "bg-destructive/10 text-destructive",
};

/**
 * InlineStatusChange — Status dropdown that can be used on list rows
 *
 * @example
 * ```tsx
 * <InlineStatusChange
 *   currentStatus="Draft"
 *   statuses={["Draft", "To Deliver and Bill", "Cancelled"]}
 *   onStatusChange={async (newStatus) => await updateStatus(row.name, newStatus)}
 * />
 * ```
 */
export function InlineStatusChange({
  currentStatus,
  statuses,
  onStatusChange,
  statusColors = DEFAULT_STATUS_COLORS,
  isLoading,
  className,
}: InlineStatusChangeProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setIsChanging(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsChanging(false);
    }
  };

  const colorClass = statusColors[currentStatus] || "bg-muted text-muted-foreground";

  if (isLoading || isChanging) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Updating...</span>
      </div>
    );
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          "h-7 w-auto border-0 bg-transparent p-0 text-xs font-medium focus:ring-0",
          className
        )}
      >
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            colorClass
          )}
        >
          {currentStatus}
        </span>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status} className="text-xs">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                statusColors[status] || "bg-muted text-muted-foreground"
              )}
            >
              {status}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
