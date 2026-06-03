// components/form/form-select.tsx
// Obsidian ERP v4.0 - Reusable Form Select Component

"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataField } from "@/components/smart/data-field";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps<T extends FieldValues> {
  /** Form control from useForm */
  control: Control<T>;
  /** Field name (must match schema) */
  name: FieldPath<T>;
  /** Field label */
  label?: string;
  /** Whether to hide the label visually */
  hideLabel?: boolean;
  /** Whether field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Select options */
  options: SelectOption[];
  /** Additional CSS classes */
  className?: string;
  /** Whether select is disabled */
  disabled?: boolean;
}

/**
 * Reusable form select with DataField wrapper
 *
 * @example
 * ```tsx
 * <FormSelect
 *   control={form.control}
 *   name="status"
 *   label="Status"
 *   options={[
 *     { value: "active", label: "Active" },
 *     { value: "inactive", label: "Inactive" },
 *   ]}
 * />
 * ```
 */
export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  hideLabel = false,
  required = false,
  placeholder = "Select...",
  options,
  className,
  disabled = false,
}: FormSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <DataField label={label} name={String(name)} required={required} hideLabel={hideLabel}>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(
                  "h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0",
                  className
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-0 shadow-xl bg-popover/95 backdrop-blur-xl">
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="rounded-lg"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DataField>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default FormSelect;
