// components/flows/FlowStep.tsx
// Obsidian ERP v4.0 - Individual Flow Step with Auto-Fill Display

"use client";

import { cn } from "@/lib/utils";
import { Lock, Unlock } from "lucide-react";

interface FlowStepField {
  /** Field name */
  name: string;
  /** Display label */
  label: string;
  /** Current value */
  value: unknown;
  /** Whether this field is auto-filled and read-only */
  isAutoFilled: boolean;
  /** Source label for auto-filled fields (e.g., "From Quotation") */
  sourceLabel?: string;
  /** Whether this field is required */
  isRequired?: boolean;
  /** Validation error message */
  error?: string;
}

interface FlowStepProps {
  /** Step title */
  title: string;
  /** Step description */
  description?: string;
  /** Fields to display */
  fields: FlowStepField[];
  /** Whether this step is currently active */
  isActive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FlowStep — Individual step in a flow wizard
 *
 * Displays fields with auto-fill indicators:
 * - 🔒 Locked fields (auto-filled from upstream document)
 * - 🔓 Editable fields (user must fill)
 */
export function FlowStep({
  title,
  description,
  fields,
  isActive,
  className,
}: FlowStepProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-6",
        isActive && "border-primary/30 shadow-sm",
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <div
            key={field.name}
            className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2",
              field.isAutoFilled &&
                "border-primary/20 bg-primary/5 dark:bg-primary/10",
              field.error && "border-destructive/30 bg-destructive/5"
            )}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium text-muted-foreground">
                {field.label}
                {field.isRequired && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </span>
              <span className="text-sm text-foreground truncate">
                {field.value !== undefined && field.value !== null && field.value !== ""
                  ? String(field.value)
                  : "—"}
              </span>
              {field.error && (
                <span className="mt-0.5 text-[10px] text-destructive">
                  {field.error}
                </span>
              )}
            </div>

            {/* Auto-fill indicator */}
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                field.isAutoFilled
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
              title={
                field.isAutoFilled
                  ? `Auto-filled ${field.sourceLabel ? `from ${field.sourceLabel}` : "from upstream document"}`
                  : "Editable — enter manually"
              }
            >
              {field.isAutoFilled ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
