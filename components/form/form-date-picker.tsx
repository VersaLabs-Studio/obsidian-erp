// components/form/form-date-picker.tsx
// Obsidian ERP v4.0 - Reusable Form Date Picker Component

"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DataField } from "@/components/smart/data-field";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface FormDatePickerProps<T extends FieldValues> {
  /** Form control from useForm */
  control: Control<T>;
  /** Field name (must match schema) */
  name: FieldPath<T>;
  /** Field label */
  label: string;
  /** Whether field is required */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether input is disabled */
  disabled?: boolean;
}

/**
 * Reusable form date picker with DataField wrapper
 *
 * @example
 * ```tsx
 * <FormDatePicker
 *   control={form.control}
 *   name="transaction_date"
 *   label="Date"
 *   required
 * />
 * ```
 */
export function FormDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  required = false,
  className,
  disabled = false,
}: FormDatePickerProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <DataField label={label} name={String(name)} required={required}>
            <div className="relative">
              <Input
                {...field}
                type="date"
                disabled={disabled}
                className={cn(
                  "h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0 pr-10",
                  className
                )}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </DataField>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default FormDatePicker;
