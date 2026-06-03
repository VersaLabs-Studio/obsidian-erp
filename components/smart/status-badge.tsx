// components/smart/status-badge.tsx
// Obsidian ERP v4.0 - Auto-colored Status Badge Component

import { cn } from "@/lib/utils";

/**
 * Status configuration with auto-coloring based on ERP conventions
 */
const statusConfig: Record<string, { label: string; className: string }> = {
  // Document Status (docstatus)
  draft: {
    label: "Draft",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-600 border-blue-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-600 border-red-200",
  },

  // Active/Inactive
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  enabled: {
    label: "Enabled",
    className: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  disabled: {
    label: "Disabled",
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
  inactive: {
    label: "Inactive",
    className: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },

  // Workflow states
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-600 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-green-50 text-green-600 border-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-600 border-red-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-50 text-green-600 border-green-200",
  },
  "in progress": {
    label: "In Progress",
    className: "bg-blue-50 text-blue-600 border-blue-200",
  },

  // Stock specific
  "in stock": {
    label: "In Stock",
    className: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  "out of stock": {
    label: "Out of Stock",
    className: "bg-red-50 text-red-600 border-red-200",
  },
  "low stock": {
    label: "Low Stock",
    className: "bg-amber-50 text-amber-600 border-amber-200",
  },
};

interface StatusBadgeProps {
  /** Status value - will be auto-colored if recognized */
  status: string | number;
  /** Custom label override */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
}

/**
 * Auto-colored Status Badge component
 *
 * Automatically applies styling based on common ERP status values.
 * For docstatus numbers: 0 = Draft, 1 = Submitted, 2 = Cancelled
 *
 * @example
 * ```tsx
 * <StatusBadge status="active" />
 * <StatusBadge status={item.docstatus} />
 * <StatusBadge status="custom" label="Custom Label" />
 * ```
 */
export function StatusBadge({
  status,
  label,
  className,
  size = "default",
}: StatusBadgeProps) {
  // Handle docstatus numbers
  let normalizedStatus: string;
  if (typeof status === "number") {
    switch (status) {
      case 0:
        normalizedStatus = "draft";
        break;
      case 1:
        normalizedStatus = "submitted";
        break;
      case 2:
        normalizedStatus = "cancelled";
        break;
      default:
        normalizedStatus = String(status);
    }
  } else {
    normalizedStatus = status.toLowerCase();
  }

  // Get config or fallback
  const config = statusConfig[normalizedStatus] || {
    label: label || String(status),
    className: "bg-muted text-muted-foreground border-border",
  };

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    default: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {label || config.label}
    </span>
  );
}

export default StatusBadge;
