// components/ui/list-toolbar.tsx
// Obsidian ERP v4.0 - Reusable List Toolbar with Search, Filter, and Export

"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  Download,
  FileText,
  Table2,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value?: string;
  onChange: (value: string) => void;
}

interface ListToolbarProps {
  /** Search query state */
  searchQuery: string;
  /** Search change handler */
  onSearchChange: (query: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Filter configurations */
  filters?: FilterConfig[];
  /** Export data handler */
  onExport?: (format: "csv" | "pdf") => void;
  /** Is export in progress */
  isExporting?: boolean;
  /** Additional actions */
  children?: React.ReactNode;
  /** Custom CSS classes */
  className?: string;
}

export function ListToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onExport,
  isExporting,
  children,
  className,
}: ListToolbarProps) {
  const activeFiltersCount = filters.filter(
    (f) => f.value && f.value !== "all"
  ).length;

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-2 p-1.5 bg-card/60 backdrop-blur-md rounded-full border border-border/20 shadow-sm animate-scale-in max-w-3xl mx-auto sm:mx-0",
        className
      )}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full h-9 pl-10 pr-4 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/70"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="h-4 w-[1px] bg-border/50" />

      {/* Filters */}
      {filters.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground hover:text-foreground relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Filter</span>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 rounded-2xl shadow-xl bg-popover/95 backdrop-blur-xl border-0 p-2"
          >
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Filters
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />

            {filters.map((filter) => (
              <div key={filter.key} className="px-2 py-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {filter.label}
                </p>
                <div className="space-y-1">
                  {filter.options.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={filter.value === option.value}
                      onCheckedChange={() => filter.onChange(option.value)}
                      className="rounded-lg text-sm"
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              </div>
            ))}

            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  className="rounded-lg text-sm text-destructive focus:bg-destructive/10"
                  onClick={() => filters.forEach((f) => f.onChange("all"))}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Export */}
      {onExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground hover:text-foreground"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-2xl shadow-xl bg-popover/95 backdrop-blur-xl border-0 p-2"
          >
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Export Format
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              className="rounded-lg"
              onClick={() => onExport("csv")}
            >
              <Table2 className="mr-2 h-4 w-4" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-lg"
              onClick={() => onExport("pdf")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Additional Actions */}
      {children}
    </div>
  );
}
