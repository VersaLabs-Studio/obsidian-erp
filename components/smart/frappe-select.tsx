// components/smart/frappe-select.tsx
// Obsidian ERP v4.0 - Async Frappe-powered Select Component with Search

"use client";

import { useFrappeOptions } from "@/hooks/generic";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FrappeSelectProps {
  /** Frappe DocType to fetch options from */
  doctype: string;
  /** Current value */
  value?: string;
  /** Field to use as value (default: "name") */
  valueField?: string;
  /** Extra fields to fetch (e.g. ["standard_rate", "stock_uom"]) */
  extraFields?: string[];
  /** Change handler with optional full doc */
  onChange: (value: string, doc?: any) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Field to use as display label (default: "name") */
  labelField?: string;
  /** Additional Frappe filters */
  filters?: ([string, string, unknown] | [string, string, string, unknown])[];
  /** Order by field and direction (use table prefix for joins) */
  orderBy?: { field: string; order?: "asc" | "desc" };
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Error state */
  error?: boolean;
  /** Additional CSS classes */
  className?: string;
  /**
   * Optional footer slot — rendered below the options list. Used by
   * Quick-Add to expose a "Create new <Doctype>" affordance. Forwards to
   * `SearchableSelect` so it lives inside the popover.
   */
  footer?: React.ReactNode;
  /**
   * Optional footer slot for the empty state — rendered when the options
   * list is empty. Forwards to `SearchableSelect`.
   */
  emptyFooter?: React.ReactNode;
}

/**
 * Async Select component that fetches options from a Frappe DocType
 * Features: Search, Scroll, and async loading
 *
 * @example
 * ```tsx
 * <FrappeSelect
 *   doctype="Item Group"
 *   value={itemGroup}
 *   onChange={setItemGroup}
 *   placeholder="Select item group"
 * />
 *
 * <FrappeSelect
 *   doctype="UOM"
 *   labelField="uom_name"
 *   value={uom}
 *   onChange={setUom}
 * />
 * ```
 */
export function FrappeSelect({
  doctype,
  value,
  onChange,
  placeholder = "Select...",
  labelField = "name",
  valueField = "name",
  extraFields,
  filters,
  orderBy,
  disabled,
  required,
  error,
  className,
  footer,
  emptyFooter,
}: FrappeSelectProps) {
  const {
    data: options,
    isLoading,
    isError,
  } = useFrappeOptions(doctype, {
    labelField,
    valueField,
    extraFields,
    filters,
    orderBy,
    limit: 500,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "h-12 rounded-xl bg-secondary/30 flex items-center px-4 gap-2",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading options...
        </span>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div
        className={cn(
          "h-12 rounded-xl bg-destructive/10 flex items-center px-4",
          className,
        )}
      >
        <span className="text-sm text-destructive">Failed to load options</span>
      </div>
    );
  }

  return (
    <SearchableSelect
      options={options || []}
      value={value}
      onValueChange={(val) => {
        const option = options?.find((o) => o.value === val);
        onChange(val, option);
      }}
      placeholder={placeholder}
      searchPlaceholder={`Search ${doctype.toLowerCase()}...`}
      emptyText={`No ${doctype.toLowerCase()} found`}
      disabled={disabled}
      footer={footer}
      emptyFooter={emptyFooter}
      className={cn(
        error && "border-destructive focus:ring-destructive",
        className,
      )}
    />
  );
}

export default FrappeSelect;
