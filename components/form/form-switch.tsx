// components/form/form-switch.tsx
// Obsidian ERP v4.0 - Reusable Form Switch Component

"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface FormSwitchProps<T extends FieldValues> {
  /** Form control from useForm */
  control: Control<T>;
  /** Field name (must match schema) */
  name: FieldPath<T>;
  /** Field label */
  label: string;
  /** Description text */
  description?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether switch is disabled */
  disabled?: boolean;
  /** Value transformation */
  transform?: {
    input: (val: any) => boolean;
    output: (val: boolean) => any;
  };
}

/**
 * Reusable form switch with label and description
 *
 * @example
 * ```tsx
 * <FormSwitch
 *   control={form.control}
 *   name="is_stock_item"
 *   label="Maintain Stock"
 *   description="Track stock levels for this item"
 * />
 * ```
 */
export function FormSwitch<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled = false,
  transform,
}: FormSwitchProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors",
            className
          )}
        >
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-foreground cursor-pointer">
              {label}
            </label>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <FormControl>
            <Switch
              checked={transform ? transform.input(field.value) : !!field.value}
              onCheckedChange={(val) => {
                field.onChange(transform ? transform.output(val) : val);
              }}
              disabled={disabled}
              className="data-[state=checked]:bg-primary"
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export default FormSwitch;
