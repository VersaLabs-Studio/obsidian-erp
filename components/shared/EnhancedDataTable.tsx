// components/shared/EnhancedDataTable.tsx
// Obsidian ERP v4.0 - Reusable Enhanced Data Table with Power Features
// Uses @tanstack/react-table for column management, sorting, pagination.

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type Updater,
} from "@tanstack/react-table";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Download,
  Settings2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusBadge } from "@/components/smart/status-badge";
import type { ListColumn } from "@/lib/list-power/column-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnhancedDataTableProps<T> {
  /** Column definitions using the standalone ListColumn type */
  columns: ListColumn<T>[];
  /** Row data */
  data: T[];
  /** Whether data is currently loading */
  isLoading?: boolean;
  /** Total row count (for server-side pagination) */
  total?: number;
  /** Current page (1-indexed) */
  page?: number;
  /** Rows per page */
  pageSize?: number;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Server-side search handler */
  onSearch?: (query: string) => void;
  /** Current search value */
  searchValue?: string;
  /** Server-side sort handler */
  onSort?: (field: string, order: "asc" | "desc" | null) => void;
  /** Active filter chips to display */
  filters?: FilterChip[];
  /** Remove a filter chip */
  onFilterRemove?: (filterId: string) => void;
  /** CSV export handler */
  onExport?: () => void;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Row key extractor */
  getRowKey: (row: T) => string;
  /** Row selection change handler */
  onRowSelectionChange?: (selectedKeys: string[]) => void;
  /** Bulk action bar content */
  bulkActions?: React.ReactNode;
  /** Table class name */
  className?: string;
  /** Row class name function */
  rowClassName?: (row: T) => string;
}

export interface FilterChip {
  id: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Convert ListColumn to @tanstack ColumnDef
// ---------------------------------------------------------------------------

function toColumnDefs<T>(
  columns: ListColumn<T>[],
  onSort?: (field: string, order: "asc" | "desc" | null) => void
): ColumnDef<T>[] {
  return columns.map((col) => ({
    id: col.key,
    accessorKey: col.key as keyof T & string,
    header: col.sortable
      ? ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => {
                column.toggleSorting();
                if (onSort) {
                  const next = column.getIsSorted();
                  onSort(col.key, next === false ? null : (next as "asc" | "desc"));
                }
              }}
            >
              {col.label}
              <SortIndicator
                sorted={!!isSorted}
                direction={isSorted === "asc" || isSorted === "desc" ? isSorted : undefined}
              />
            </button>
          );
        }
      : col.label,
    cell: col.cell
      ? ({ row, getValue }) => col.cell!(getValue(), row.original, row.index)
      : ({ getValue }) => {
          const val = getValue();
          if (val === null || val === undefined || val === "") return <span className="text-muted-foreground">—</span>;
          return <span>{String(val)}</span>;
        },
    enableSorting: col.sortable ?? false,
    size: col.key === "name" ? 180 : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Sort indicator component
// ---------------------------------------------------------------------------

function SortIndicator({
  sorted,
  direction,
}: {
  sorted: boolean;
  direction?: "asc" | "desc";
}) {
  if (!sorted) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  if (direction === "asc") return <ChevronUp className="h-3 w-3" />;
  return <ChevronDown className="h-3 w-3" />;
}

// ---------------------------------------------------------------------------
// Column toggle panel
// ---------------------------------------------------------------------------

function ColumnTogglePanel<T>({
  columns,
  visibility,
  onToggle,
}: {
  columns: ListColumn<T>[];
  visibility: VisibilityState;
  onToggle: (key: string) => void;
}) {
  const toggleable = columns.filter((c) => c.toggleable !== false);
  const grouped = toggleable.reduce(
    (acc, col) => {
      const cat = col.category ?? "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(col);
      return acc;
    },
    {} as Record<string, ListColumn<T>[]>
  );

  const categoryLabels: Record<string, string> = {
    identity: "Identity",
    financial: "Financial",
    status: "Status",
    dates: "Dates",
    progress: "Progress",
    other: "Other",
  };

  return (
    <div className="p-2 min-w-[200px]">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
        Columns
      </p>
      {Object.entries(grouped).map(([cat, cols]) => (
        <div key={cat} className="mb-2">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 mb-1">
            {categoryLabels[cat] ?? cat}
          </p>
          {cols.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={visibility[col.key] !== false}
                onCheckedChange={() => onToggle(col.key)}
              />
              <span className="text-foreground">{col.label}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EnhancedDataTable<T extends object>({
  columns,
  data,
  isLoading = false,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSearch,
  searchValue = "",
  onSort,
  filters = [],
  onFilterRemove,
  onExport,
  onRowClick,
  getRowKey,
  onRowSelectionChange,
  bulkActions,
  className,
  rowClassName,
}: EnhancedDataTableProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showColumnPanel, setShowColumnPanel] = useState(false);

  // Convert ListColumn[] to ColumnDef[] with a select column prepended
  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    const selectCol: ColumnDef<T> = {
      id: "__select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    };

    const dataCols = toColumnDefs(columns, onSort);
    return [selectCol, ...dataCols];
  }, [columns, onSort]);

  // Notify parent of selection changes (wrap Updater pattern)
  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      if (!onRowSelectionChange) return;
      setRowSelection((old) => {
        const next = typeof updater === "function" ? updater(old) : updater;
        const keys = Object.keys(next).filter((k) => next[k]);
        // Defer the callback to avoid setState-during-render
        setTimeout(() => onRowSelectionChange(keys), 0);
        return next;
      });
    },
    [onRowSelectionChange]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      columnVisibility,
      rowSelection,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: !!onRowSelectionChange,
    getRowId: (row) => getRowKey(row),
  });

  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  // Pagination range
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range: (number | "ellipsis")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - delta && i <= page + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== "ellipsis") {
        range.push("ellipsis");
      }
    }
    return range;
  }, [page, totalPages]);

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm", className)}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          {onSearch && (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-8 h-9 rounded-full bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary/30 text-sm"
              />
              {searchValue && (
                <button
                  onClick={() => onSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          {/* Active filter chips */}
          {filters.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filters.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {f.label}
                  {onFilterRemove && (
                    <button
                      onClick={() => onFilterRemove(f.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Column toggle */}
          <Popover open={showColumnPanel} onOpenChange={setShowColumnPanel}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-0">
              <ColumnTogglePanel
                columns={columns}
                visibility={columnVisibility}
                onToggle={(key) =>
                  setColumnVisibility((prev) => ({
                    ...prev,
                    [key]: prev[key] === false ? true : false,
                  }))
                }
              />
            </PopoverContent>
          </Popover>

          {/* CSV export */}
          {onExport && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={onExport}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bulk selection bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? {} : { height: "auto", opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-primary/20 bg-primary/5"
          >
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium text-primary">
                {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                {bulkActions}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRowSelection({})}
                >
                  Clear
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {isLoading && data.length === 0 ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              {columns.slice(0, 4).map((col) => (
                <div
                  key={col.key}
                  className="h-4 flex-1 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center px-8 py-16">
          <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No records found
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Try adjusting your filters or search query
          </p>
        </div>
      ) : (
        /* Data table */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b bg-muted/30"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap",
                        header.column.getCanSort() &&
                          "cursor-pointer select-none hover:text-foreground"
                      )}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/30",
                    onRowClick && "cursor-pointer",
                    row.getIsSelected() && "bg-primary/5",
                    rowClassName?.(row.original)
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-3 text-sm",
                        cell.column.id === "__select" && "w-10"
                      )}
                      onClick={
                        cell.column.id === "__select"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {paginationRange.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === page ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 text-xs",
                    item === page && "shadow-sm"
                  )}
                  onClick={() => onPageChange?.(item as number)}
                >
                  {item}
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange?.(page + 1)}
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

// ---------------------------------------------------------------------------
// StatusCell — reusable cell renderer for status columns
// ---------------------------------------------------------------------------

export function StatusCell({ value }: { value: unknown }) {
  if (!value || value === "—" || value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  return <StatusBadge status={String(value)} size="sm" />;
}

// ---------------------------------------------------------------------------
// CurrencyCell — reusable cell renderer for money columns
// ---------------------------------------------------------------------------

export function CurrencyCell({ value, currency = "ETB" }: { value: unknown; currency?: string }) {
  const num = typeof value === "number" ? value : Number(value) || 0;
  const formatted = new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
  return <span className="font-medium tabular-nums">{formatted}</span>;
}

// ---------------------------------------------------------------------------
// DateCell — reusable cell renderer for date columns
// ---------------------------------------------------------------------------

export function DateCell({ value }: { value: unknown }) {
  if (!value || value === "—" || value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  const str = String(value);
  try {
    const formatted = new Date(str).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return <span>{formatted}</span>;
  } catch {
    return <span>{str}</span>;
  }
}

// ---------------------------------------------------------------------------
// ProgressCell — reusable cell renderer for percentage columns
// ---------------------------------------------------------------------------

export function ProgressCell({ value }: { value: unknown }) {
  const num = typeof value === "number" ? value : Number(value) || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(num, 100)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {num.toFixed(0)}%
      </span>
    </div>
  );
}
