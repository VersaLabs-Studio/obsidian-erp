// components/ui/page-header.tsx
// Obsidian ERP v4.0 - Reusable Floating Page Header Component

"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps {
  /** Back navigation URL */
  backUrl?: string;
  /** Custom back handler */
  onBack?: () => void;
  /** Small label above title */
  label?: string;
  /** Main title */
  title: string;
  /** Status badge */
  status?: {
    label: string;
    variant: "success" | "warning" | "destructive" | "default";
  };
  /** Change indicator */
  hasChanges?: boolean;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
  };
  /** Additional actions (dropdown menu, etc.) */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const statusVariants = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  default: "bg-secondary text-muted-foreground border-border",
};

export function PageHeader({
  backUrl,
  onBack,
  label,
  title,
  status,
  hasChanges,
  primaryAction,
  children,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between sticky top-0 z-20 bg-card/80 backdrop-blur-xl p-2 pr-4 rounded-full shadow-sm border border-border/40 animate-in fade-in slide-in-from-top-2 duration-500",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="rounded-full h-10 w-10 hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>

        <div className="h-8 w-[1px] bg-border/50" />

        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
          )}
          <h1 className="text-lg font-bold leading-none truncate max-w-[200px] sm:max-w-[300px]">
            {title}
          </h1>
        </div>

        {status && (
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border",
              statusVariants[status.variant]
            )}
          >
            {status.label}
          </div>
        )}

        {hasChanges && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-600">
              Unsaved
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        {primaryAction && (
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
            className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
          >
            {primaryAction.loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              primaryAction.icon && (
                <span className="mr-2">{primaryAction.icon}</span>
              )
            )}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
