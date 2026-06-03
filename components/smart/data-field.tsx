// components/smart/data-field.tsx
// Obsidian ERP v4.0 - Standardized Form Field Component

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import React from "react";

interface DataFieldProps {
  /** Field label */
  label?: string;
  /** Whether to hide the label visually */
  hideLabel?: boolean;
  /** Field name (for htmlFor) */
  name?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text below the field */
  helperText?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Children (the actual input element) */
  children: React.ReactNode;
}

/**
 * DataField - Standardized Form Field Layout
 *
 * Wraps any input element with consistent label, error message, and helper text styling.
 *
 * @example
 * ```tsx
 * <DataField
 *   label="Item Code"
 *   name="item_code"
 *   required
 *   error={errors.item_code?.message}
 * >
 *   <Input {...register("item_code")} />
 * </DataField>
 * ```
 */
export function DataField({
  label,
  hideLabel = false,
  name,
  required,
  error,
  helperText,
  className,
  children,
}: DataFieldProps) {
  const fieldId = name || (label || "").toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={cn("space-y-2", className)}>
      {label && !hideLabel && (
        <Label
          htmlFor={fieldId}
          className={cn("text-sm font-medium", error && "text-destructive")}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {children}

      {error && (
        <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

/**
 * TextDataField - Convenience component for text inputs
 */
interface TextDataFieldProps extends Omit<DataFieldProps, "children"> {
  /** Input placeholder */
  placeholder?: string;
  /** Input value */
  value?: string;
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Input type */
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  /** Whether the input is disabled */
  disabled?: boolean;
  /** React Hook Form register props */
  register?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function TextDataField({
  label,
  name,
  required,
  error,
  helperText,
  className,
  placeholder,
  value,
  onChange,
  type = "text",
  disabled,
  register,
}: TextDataFieldProps) {
  return (
    <DataField
      label={label}
      name={name}
      required={required}
      error={error}
      helperText={helperText}
      className={className}
    >
      <Input
        id={name || (label || "").toLowerCase().replace(/\s+/g, "-")}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive"
        )}
        {...register}
      />
    </DataField>
  );
}

export default DataField;
