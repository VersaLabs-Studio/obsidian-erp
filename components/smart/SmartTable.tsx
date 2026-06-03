// components/smart/SmartTable.tsx
// Obsidian ERP v4.0 - Data Table with Inline Actions, Sorting, Pagination

"use client";

import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SmartTableColumn<T> {
  /** Column key */
  key: string;
  /** Display label */
  label: string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Custom render function */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Column width class */
  width?: string;
  /** Alignment */
  align?: "left" | "center" | "right";
}

interface SmartTableAction<T> {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: React.ReactNode;
  /** Callback */
  onClick: (row: T) => void;
  /** Whether action is destructive */
  destructive?: boolean;
  /** Whether action is disabled */
  isDisabled?: (row: T) => boolean;
}

interface SmartTableProps<T> {
  /** Table columns */
  columns: SmartTableColumn<T>[];
  /** Table data */
  data: T[];
  /** Row actions */
  actions?: SmartTableAction<T>[];
  /** Total items (for pagination) */
  total?: number;
  /** Current page */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Page change callback */
  onPageChange?: (page: number) => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Row key extractor */
  getRowKey: (row: T) => string;
  /** Row click callback */
  onRowClick?: (row: T) => void;
  /** Additional CSS classes */
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

/**
 * SmartTable — Data table with inline actions, sorting, pagination
 *
 * @example
 * ```tsx
 * <SmartTable
 *   columns={[
 *     { key: "name", label: "Order #", sortable: true },
 *     { key: "customer_name", label: "Customer", sortable: true },
 *     { key: "grand_total", label: "Total", align: "right" },
 *   ]}
 *   data={orders}
 *   actions={[
 *     { label: "View", icon: <Eye />, onClick: (row) => router.push(`/sales/sales-order/${row.name}`) },
 *   ]}
 *   total={100}
 *   page={1}
 *   onPageChange={setPage}
 *   getRowKey={(row) => row.name}
 * />
 * ```
 */
export function SmartTable<T extends object = Record<string, unknown>>({
  columns,
  data,
  actions,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  isLoading,
  getRowKey,
  onRowClick,
  className,
}: SmartTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const prefersReducedMotion = useReducedMotion();

  const totalPages = total ? Math.ceil(total / pageSize) : 1;

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium text-muted-foreground",
                      col.width
                    )}
                  >
                    {col.label}
                  </th>
                ))}
                {actions && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3">
                      <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed px-8 py-12",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">No data found</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Try adjusting your filters or create a new record
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("rounded-xl border bg-card overflow-hidden", className)}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-medium text-muted-foreground",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.width
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="inline-flex">
                        {sortKey === col.key && sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : sortKey === col.key && sortDir === "desc" ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <motion.tr
                key={getRowKey(row)}
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={prefersReducedMotion ? {} : { opacity: 1 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right"
                    )}
                  >
                    {col.render
                      ? col.render((row as Record<string, unknown>)[col.key], row, index)
                      : (row as Record<string, unknown>)[col.key] !== undefined && (row as Record<string, unknown>)[col.key] !== null
                        ? String((row as Record<string, unknown>)[col.key])
                        : "—"}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action) => (
                          <DropdownMenuItem
                            key={action.label}
                            onClick={() => action.onClick(row)}
                            disabled={action.isDisabled?.(row)}
                            className={cn(
                              action.destructive && "text-destructive focus:text-destructive"
                            )}
                          >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total || 0)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
