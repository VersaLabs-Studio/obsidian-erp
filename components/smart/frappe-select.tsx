// components/smart/frappe-select.tsx
// Pana ERP v3.0 - Async Frappe-powered Select Component

"use client";

import { useFrappeOptions } from "@/hooks/generic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FrappeSelectProps {
  /** Frappe DocType to fetch options from */
  doctype: string;
  /** Current value */
  value?: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Field to use as display label (default: "name") */
  labelField?: string;
  /** Field to use as value (default: "name") */
  valueField?: string;
  /** Additional Frappe filters */
  filters?: [string, string, unknown][];
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Error state */
  error?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Async Select component that fetches options from a Frappe DocType
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
  filters,
  disabled,
  required,
  error,
  className,
}: FrappeSelectProps) {
  const {
    data: options,
    isLoading,
    isError,
  } = useFrappeOptions(doctype, {
    labelField,
    valueField,
    filters,
    limit: 500,
  });

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading}
      required={required}
    >
      <SelectTrigger
        className={cn(
          error && "border-destructive focus:ring-destructive",
          className
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : isError ? (
          <span className="text-destructive">Failed to load options</span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        {options?.length === 0 && (
          <div className="py-2 px-3 text-sm text-muted-foreground text-center">
            No options available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

export default FrappeSelect;
