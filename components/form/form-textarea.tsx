// components/form/form-textarea.tsx
// Obsidian ERP v4.0 - Reusable Form Textarea Component

"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FormTextareaProps<T extends FieldValues> {
  /** Form control from useForm */
  control: Control<T>;
  /** Field name (must match schema) */
  name: FieldPath<T>;
  /** Field label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Minimum height */
  minHeight?: string;
}

/**
 * Reusable form textarea
 *
 * @example
 * ```tsx
 * <FormTextarea
 *   control={form.control}
 *   name="description"
 *   placeholder="Enter a detailed description..."
 * />
 * ```
 */
export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  className,
  disabled = false,
  minHeight = "120px",
}: FormTextareaProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <label className="text-sm font-medium text-foreground">
              {label}
            </label>
          )}
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ""}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card border-0 resize-none transition-all duration-300",
                className,
              )}
              style={{ minHeight }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export default FormTextarea;
