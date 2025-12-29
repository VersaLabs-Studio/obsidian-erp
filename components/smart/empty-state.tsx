// components/smart/empty-state.tsx
// Pana ERP v3.0 - Empty State Component

import { cn } from "@/lib/utils";
import { LucideIcon, Package, Search, FileX } from "lucide-react";

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Whether this is a "no results" vs "no data" state */
  variant?: "no-data" | "no-results" | "error";
  /** Action button/element */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantConfig = {
  "no-data": {
    icon: Package,
    iconClassName: "text-muted-foreground/40",
  },
  "no-results": {
    icon: Search,
    iconClassName: "text-muted-foreground/40",
  },
  error: {
    icon: FileX,
    iconClassName: "text-destructive/40",
  },
};

/**
 * Empty State component for displaying when there's no data
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No items found"
 *   description="Try adjusting your search or filters"
 *   variant="no-results"
 * />
 *
 * <EmptyState
 *   title="No items yet"
 *   description="Create your first item to get started"
 *   action={<Button>Create Item</Button>}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  variant = "no-data",
  action,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        "animate-in fade-in duration-500",
        className
      )}
    >
      <div
        className={cn(
          "w-20 h-20 rounded-3xl flex items-center justify-center mb-6",
          "bg-muted/50"
        )}
      >
        <Icon
          className={cn("w-10 h-10", config.iconClassName)}
          strokeWidth={1.5}
        />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
