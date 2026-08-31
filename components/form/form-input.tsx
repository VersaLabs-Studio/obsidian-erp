// components/form/form-input.tsx
// Obsidian ERP v4.0 - Reusable Form Input Component

"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DataField } from "@/components/smart/data-field";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface FormInputProps<T extends FieldValues> {
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
  /** Input type (text, email, number, etc.) */
  type?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether input is read-only (still receives focus but cannot be edited) */
  readOnly?: boolean;
  /**
   * Optional side-effect callback that fires AFTER the field's internal
   * onChange. Used by callers that need to react to value changes
   * (e.g. the Item form auto-generates the item_code from the name).
   */
  onChangeAfter?: (value: string) => void;
  /** Show loading spinner */
  loading?: boolean;
  /** Custom icon on the right */
  rightIcon?: React.ReactNode;
}

/**
 * Reusable form input with DataField wrapper
 *
 * @example
 * ```tsx
 * <FormInput
 *   control={form.control}
 *   name="item_name"
 *   label="Item Name"
 *   required
 *   placeholder="Enter item name..."
 * />
 * ```
 */
export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  hideLabel = false,
  required = false,
  placeholder,
  type = "text",
  className,
  disabled = false,
  readOnly = false,
  onChangeAfter,
  loading = false,
  rightIcon,
}: FormInputProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <DataField label={label} name={String(name)} required={required} hideLabel={hideLabel}>
            <div className="relative">
              <Input
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (type === "number") {
                    // Convert to number, or undefined if empty to trigger Zod validation
                    const numVal =
                      val === "" || val === "-" ? undefined : Number(val);
                    field.onChange(numVal);
                  } else {
                    field.onChange(val);
                  }
                  onChangeAfter?.(val);
                }}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.currentTarget.blur()}
                type={type}
                placeholder={placeholder}
                disabled={disabled || loading}
                readOnly={readOnly}
                className={cn(
                  "h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0",
                  loading && "pr-10",
                  readOnly && "cursor-not-allowed opacity-70",
                  className,
                )}
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
              {rightIcon && !loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {rightIcon}
                </div>
              )}
            </div>
          </DataField>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default FormInput;
