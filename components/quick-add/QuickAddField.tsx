"use client";

// components/quick-add/QuickAddField.tsx
// Obsidian ERP v4.0 — Inline Quick-Add Field (master §11).
//
// Drop-in replacement for `FormFrappeSelect` that exposes a "Create new
// <Doctype>" affordance in the dropdown footer. The footer opens a
// `QuickAddModal` (Radix Dialog overlay — no route change), and on success
// the new record's `name` is written back to the field, the select query is
// invalidated, and the host wizard's state is preserved.

import { useState } from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { Plus } from "lucide-react";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { DataField } from "@/components/smart/data-field";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { QuickAddModal } from "./QuickAddModal";
import { getQuickAddEntry, isQuickAddSupported } from "@/lib/flows/quick-add-registry";
import { cn } from "@/lib/utils";

interface QuickAddFieldProps<T extends FieldValues> {
  /** Form control from useForm */
  control: Control<T>;
  /** Field name (must match schema) */
  name: FieldPath<T>;
  /** Field label */
  label?: string;
  /** Whether to hide the label */
  hideLabel?: boolean;
  /** Whether field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Frappe DocType to fetch options from */
  doctype: string;
  /** Field to use as option value (default: "name") */
  valueField?: string;
  /** Field to use as option label */
  labelField?: string;
  /** Additional Frappe filters for querying */
  filters?: ([string, string, unknown] | [string, string, string, unknown])[];
  /** Order by field and direction (use table prefix for Dynamic Link joins) */
  orderBy?: { field: string; order?: "asc" | "desc" };
  /** Extra fields to fetch (e.g. ["standard_rate", "stock_uom"]) */
  extraFields?: string[];
  /** Custom change handler with optional full doc */
  onValueChange?: (value: string, doc?: any) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether select is disabled */
  disabled?: boolean;
  /**
   * When true, the dropdown footer exposes "Create new <Doctype>" and opens
   * a QuickAddModal on click. Defaults to true; the modal silently no-ops
   * if the doctype isn't in the registry.
   */
  enableQuickAdd?: boolean;
  /**
   * Seed values pre-populated in the QuickAdd modal (e.g. `link_doctype` and
   * `link_name` when adding an Address from inside a Customer).
   */
  quickAddSeed?: Record<string, unknown>;
}

/**
 * Quick-Add enabled FormFrappeSelect.
 *
 * Use as a drop-in for `FormFrappeSelect` when the host wizard should let the
 * user create a missing master inline. Renders "Create new <Doctype>" in the
 * dropdown footer (and also in the empty state when the option list is empty).
 */
export function QuickAddField<T extends FieldValues>({
  control,
  name,
  label,
  hideLabel = false,
  required = false,
  placeholder = "Select...",
  doctype,
  valueField = "name",
  labelField = "name",
  filters,
  orderBy,
  extraFields,
  onValueChange,
  className,
  disabled = false,
  enableQuickAdd = true,
  quickAddSeed,
}: QuickAddFieldProps<T>) {
  const [modalOpen, setModalOpen] = useState(false);
  const supportsQuickAdd = enableQuickAdd && isQuickAddSupported(doctype);
  const entry = supportsQuickAdd ? getQuickAddEntry(doctype) : undefined;

  // Footer: ＋ Create new <Doctype> (lives inside the dropdown)
  const footer = supportsQuickAdd && entry ? (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start rounded-xl h-auto py-2.5 px-3 text-sm font-medium text-primary hover:bg-primary/5"
      onClick={() => setModalOpen(true)}
    >
      <Plus className="mr-2 h-4 w-4" /> Create new {entry.label}
    </Button>
  ) : null;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const handleChange = (val: string, doc?: any) => {
          field.onChange(val);
          if (onValueChange) onValueChange(val, doc);
        };

        // 2M Part 0B: Rules-of-Hooks fix. The previous code wrapped this in
        // `useCallback` *inside* the render prop — a render prop is an
        // unstable hook site. The success handler does not need memoization;
        // define it as a plain inline function. A new function ref per render
        // is harmless here (QuickAddModal does not put `onSuccess` in an
        // unstable effect dep after Part 0A).
        const handleQuickAddSuccess = (result: { name: string; doctype: string } | undefined) => {
          if (!result) return;
          field.onChange(result.name);
          if (onValueChange) onValueChange(result.name, { name: result.name });
        };

        return (
          <FormItem>
            {hideLabel ? (
              <FrappeSelect
                doctype={doctype}
                valueField={valueField}
                labelField={labelField}
                extraFields={extraFields}
                value={field.value}
                onChange={handleChange}
                placeholder={placeholder}
                filters={filters}
                orderBy={orderBy}
                disabled={disabled}
                footer={footer}
                emptyFooter={footer}
                className={cn(
                  "h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0",
                  className,
                )}
              />
            ) : (
              <DataField
                label={label || String(name)}
                name={String(name)}
                required={required}
              >
                <FrappeSelect
                  doctype={doctype}
                  valueField={valueField}
                  labelField={labelField}
                  extraFields={extraFields}
                  value={field.value}
                  onChange={handleChange}
                  placeholder={placeholder}
                  filters={filters}
                  orderBy={orderBy}
                  disabled={disabled}
                  footer={footer}
                  emptyFooter={footer}
                  className={cn(
                    "h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0",
                    className,
                  )}
                />
              </DataField>
            )}
            <FormMessage />
            {supportsQuickAdd && entry && (
              <QuickAddModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                entry={entry}
                seed={quickAddSeed}
                onSuccess={handleQuickAddSuccess}
              />
            )}
          </FormItem>
        );
      }}
    />
  );
}

export default QuickAddField;
