// components/smart/page-header.tsx
// Obsidian ERP v4.0 - Reusable Floating Page Header with Responsive Fix

"use client";

import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import React from "react";

interface PageHeaderProps {
  /** Back navigation URL */
  backUrl?: string;
  /** Alias for backUrl */
  backHref?: string;
  /** Custom back handler */
  onBack?: () => void;
  /** Small label above title */
  label?: React.ReactNode;
  /** Alias for label */
  subtitle?: React.ReactNode;
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
  /** Additional actions */
  children?: React.ReactNode;
  /** Alias for children */
  actions?: React.ReactNode;
  /** Search support */
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
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
  backHref,
  onBack,
  label,
  subtitle,
  title,
  status,
  hasChanges,
  primaryAction,
  children,
  actions,
  showSearch,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  className,
}: PageHeaderProps) {
  const router = useRouter();

  const finalBackUrl = backUrl || backHref;
  const finalLabel = label || subtitle;
  const finalChildren = children || actions;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (finalBackUrl) {
      router.push(finalBackUrl);
    } else {
      router.back();
    }
  };

  return (
    <div
      className={cn(
        // Base styles - Floating pill design
        "flex items-center justify-between sticky top-0 z-20",
        "bg-card/80 backdrop-blur-xl rounded-full shadow-sm border border-border/40",
        "p-2 pr-4",
        "animate-in fade-in slide-in-from-top-2 duration-500",
        className
      )}
    >
      {/* Left section - min-w-0 prevents overflow, flex-1 allows shrinking */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Back button - always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="rounded-full h-10 w-10 hover:bg-secondary shrink-0"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Divider - hidden on mobile */}
        <div className="h-14 w-[1px] bg-border/50 shrink-0 hidden sm:block" />

        {/* Title container - truncates on overflow */}
        <div className="flex flex-col min-w-0">
          {finalLabel && (
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate hidden sm:block">
              {finalLabel}
            </span>
          )}
          <h1 className="text-base sm:text-lg font-bold leading-none truncate">
            {title}
          </h1>
        </div>

        {/* Status badge - hidden on small mobile */}
        {status && (
          <div
            className={cn(
              "px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border shrink-0",
              "hidden sm:block",
              statusVariants[status.variant]
            )}
          >
            {status.label}
          </div>
        )}

        {/* Unsaved indicator - hidden on mobile */}
        {hasChanges && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full shrink-0 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-600">
              Unsaved
            </span>
          </div>
        )}

        {/* Search Bar Implementation */}
        {showSearch && (
          <div className="hidden lg:flex items-center relative ml-2 group animate-in fade-in slide-in-from-left-4 duration-500">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder || "Search..."}
              className="pl-9 pr-8 h-9 w-[240px] rounded-full bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange?.("")}
                className="absolute right-3 p-0.5 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right section - shrink-0 prevents squishing, gap reduced on mobile */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Children (additional actions) - can be hidden on mobile if needed */}
        <div className="hidden sm:flex items-center gap-2">{finalChildren}</div>

        {/* Primary action - always visible but text-only on mobile */}
        {primaryAction && (
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled || primaryAction.loading}
            className="rounded-full px-3 sm:px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
            size="sm"
          >
            {primaryAction.loading ? (
              <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
            ) : (
              primaryAction.icon && (
                <span className="sm:mr-2">{primaryAction.icon}</span>
              )
            )}
            {/* Show full label on desktop, abbreviated on mobile */}
            <span className="hidden sm:inline">{primaryAction.label}</span>
            <span className="sm:hidden">
              {primaryAction.icon ? null : primaryAction.label.split(" ")[0]}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
