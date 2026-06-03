// components/ui/form-field.tsx
// Obsidian ERP v4.0 - Reusable Form Field Components

"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import React from "react";

/**
 * DataField - Form field wrapper with label, hint, and error
 */
interface DataFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function DataField({
  label,
  children,
  error,
  hint,
  required,
  className,
}: DataFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Premium Input - Styled input field
 */
interface PremiumInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const PremiumInput = React.forwardRef<
  HTMLInputElement,
  PremiumInputProps
>(({ className, mono, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-card focus:shadow-lg focus:shadow-primary/5 outline-none transition-all duration-300 text-base font-medium",
        mono && "font-mono text-sm",
        props.disabled &&
          "bg-secondary/20 text-muted-foreground cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
});
PremiumInput.displayName = "PremiumInput";

/**
 * ToggleCard - Clickable toggle card with checkbox-style appearance
 */
interface ToggleCardProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  className?: string;
  disabled?: boolean;
}

export function ToggleCard({
  checked,
  onChange,
  title,
  description,
  variant = "default",
  className,
  disabled,
}: ToggleCardProps) {
  const activeColors = {
    default: {
      bg: "bg-primary/10 shadow-md shadow-primary/5",
      icon: "bg-primary shadow-lg shadow-primary/30",
    },
    destructive: {
      bg: "bg-destructive/10 shadow-md shadow-destructive/5",
      icon: "bg-destructive shadow-lg shadow-destructive/30",
    },
  };

  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300",
        checked
          ? activeColors[variant].bg
          : "bg-secondary/30 hover:bg-secondary/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div
        className={cn(
          "h-6 w-6 rounded-lg flex items-center justify-center transition-all duration-300",
          checked ? activeColors[variant].icon : "bg-muted"
        )}
      >
        {checked && (
          <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
        )}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
