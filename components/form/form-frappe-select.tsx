// components/form/form-frappe-select.tsx
// Pana ERP v3.0 - Reusable Form Frappe Select Component

"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { DataField } from "@/components/smart/data-field";
import { cn } from "@/lib/utils";

interface FormFrappeSelectProps<T extends FieldValues> {
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
  filters?: [string, string, unknown][];
  /** Order by field and direction (use table prefix for Dynamic Link joins, e.g. "`tabAddress`.name") */
  orderBy?: { field: string; order?: "asc" | "desc" };
  /** Additional CSS classes */
  className?: string;
  /** Whether select is disabled */
  disabled?: boolean;
}

/**
 * Reusable form select that fetches options from Frappe
 *
 * @example
 * ```tsx
 * <FormFrappeSelect
 *   control={form.control}
 *   name="item_group"
 *   label="Item Group"
 *   required
 *   doctype="Item Group"
 *   labelField="item_group_name"
 * />
 *
 * // With Dynamic Link filters (for Address/Contact)
 * <FormFrappeSelect
 *   control={control}
 *   name="customer_address"
 *   label="Address"
 *   doctype="Address"
 *   filters={[
 *     ["Dynamic Link", "link_doctype", "=", "Customer"],
 *     ["Dynamic Link", "link_name", "=", customerName],
 *   ]}
 *   orderBy={{ field: "`tabAddress`.name", order: "asc" }}
 * />
 * ```
 */
export function FormFrappeSelect<T extends FieldValues>({
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
  className,
  disabled = false,
}: FormFrappeSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {hideLabel ? (
            <FrappeSelect
              doctype={doctype}
              valueField={valueField}
              labelField={labelField}
              value={field.value}
              onChange={field.onChange}
              placeholder={placeholder}
              filters={filters}
              orderBy={orderBy}
              disabled={disabled}
              className={cn(
                "h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0",
                className
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
                value={field.value}
                onChange={field.onChange}
                placeholder={placeholder}
                filters={filters}
                orderBy={orderBy}
                disabled={disabled}
                className={cn(
                  "h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0",
                  className
                )}
              />
            </DataField>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default FormFrappeSelect;
