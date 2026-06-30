// components/reports/ReportFilterBar.tsx
// Obsidian ERP v4.0 — Shared Report Filter Bar (Part 16)
//
// URL-persisted, composable filter bar for all report pages.
// Supports: date range, party, status, amount range, item/group filters.
// Active filters render as removable chips; quick presets for common ranges.

"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Calendar,
  X,
  Filter,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DateRangeMode =
  | "today"
  | "this-week"
  | "this-month"
  | "this-quarter"
  | "ytd"
  | "last-year"
  | "custom";

export interface ReportFilters {
  dateMode: DateRangeMode;
  dateFrom: string;
  dateTo: string;
  parties: string[];
  statuses: string[];
  amountMin: string;
  amountMax: string;
  itemGroup: string;
}

interface ReportFilterBarProps {
  /** Extra class names */
  className?: string;
  /** Show party filter */
  showParty?: boolean;
  /** Show status filter */
  showStatus?: boolean;
  /** Show amount range filter */
  showAmountRange?: boolean;
  /** Show item/group filter */
  showItemGroup?: boolean;
  /** Available party options for multi-select */
  partyOptions?: string[];
  /** Available status options */
  statusOptions?: string[];
  /** Available item group options */
  itemGroupOptions?: string[];
  /** Placeholder for party filter */
  partyPlaceholder?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function startOfQuarter(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  d.setMonth(q * 3, 1);
  return d.toISOString().split("T")[0];
}

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function lastYearRange(): { from: string; to: string } {
  const y = new Date().getFullYear() - 1;
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function computeDateRange(mode: DateRangeMode): { from: string; to: string } {
  const today = todayStr();
  switch (mode) {
    case "today":
      return { from: today, to: today };
    case "this-week":
      return { from: startOfWeek(), to: today };
    case "this-month":
      return { from: startOfMonth(), to: today };
    case "this-quarter":
      return { from: startOfQuarter(), to: today };
    case "ytd":
      return { from: startOfYear(), to: today };
    case "last-year":
      return lastYearRange();
    case "custom":
      return { from: "", to: "" };
  }
}

function parseFilters(searchParams: URLSearchParams): ReportFilters {
  return {
    dateMode: (searchParams.get("dateMode") as DateRangeMode) || "this-month",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    parties: searchParams.get("parties")?.split(",").filter(Boolean) || [],
    statuses: searchParams.get("statuses")?.split(",").filter(Boolean) || [],
    amountMin: searchParams.get("amountMin") || "",
    amountMax: searchParams.get("amountMax") || "",
    itemGroup: searchParams.get("itemGroup") || "",
  };
}

function serializeFilters(filters: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.dateMode !== "this-month") params.dateMode = filters.dateMode;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.parties.length > 0) params.parties = filters.parties.join(",");
  if (filters.statuses.length > 0)
    params.statuses = filters.statuses.join(",");
  if (filters.amountMin) params.amountMin = filters.amountMin;
  if (filters.amountMax) params.amountMax = filters.amountMax;
  if (filters.itemGroup) params.itemGroup = filters.itemGroup;
  return params;
}

const QUICK_PRESETS: { label: string; mode: DateRangeMode }[] = [
  { label: "Today", mode: "today" },
  { label: "This Week", mode: "this-week" },
  { label: "This Month", mode: "this-month" },
  { label: "This Quarter", mode: "this-quarter" },
  { label: "YTD", mode: "ytd" },
  { label: "Last Year", mode: "last-year" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span
      layout
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium border border-primary/20"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}

function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayText =
    selected.length === 0
      ? (placeholder ?? `All ${label}`)
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <div className="relative">
      <Select
        value={selected.length === 1 ? selected[0] : undefined}
        onValueChange={(v) => {
          if (v === "__all__") {
            onChange([]);
          } else {
            toggle(v);
          }
        }}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={displayText} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            All {label}
          </SelectItem>
          {options.map((opt) => (
            <SelectItem
              key={opt}
              value={opt}
              className={cn(
                selected.includes(opt) && "bg-primary/10 font-medium"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full border",
                    selected.includes(opt)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  )}
                />
                {opt}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ReportFilterBar({
  className,
  showParty = true,
  showStatus = true,
  showAmountRange = true,
  showItemGroup = false,
  partyOptions = [],
  statusOptions = ["Draft", "Submitted", "Paid", "Unpaid", "Overdue", "Cancelled"],
  itemGroupOptions = [],
  partyPlaceholder = "All Customers",
}: ReportFilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<ReportFilters>) => {
      const next = { ...filters, ...patch };
      const serialized = serializeFilters(next);
      const qs = new URLSearchParams(serialized).toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [filters, pathname, router]
  );

  const removeFilter = useCallback(
    (key: keyof ReportFilters) => {
      const next = { ...filters };
      switch (key) {
        case "dateMode":
          next.dateMode = "this-month";
          next.dateFrom = "";
          next.dateTo = "";
          break;
        case "parties":
          next.parties = [];
          break;
        case "statuses":
          next.statuses = [];
          break;
        case "amountMin":
          next.amountMin = "";
          break;
        case "amountMax":
          next.amountMax = "";
          break;
        case "itemGroup":
          next.itemGroup = "";
          break;
      }
      const serialized = serializeFilters(next);
      const qs = new URLSearchParams(serialized).toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [filters, pathname, router]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const dateRange = useMemo(
    () => computeDateRange(filters.dateMode),
    [filters.dateMode]
  );

  const hasActiveFilters =
    filters.dateMode !== "this-month" ||
    filters.parties.length > 0 ||
    filters.statuses.length > 0 ||
    filters.amountMin !== "" ||
    filters.amountMax !== "" ||
    filters.itemGroup !== "";

  const activeChips: { key: keyof ReportFilters; label: string }[] = [];
  if (filters.dateMode !== "this-month") {
    const preset = QUICK_PRESETS.find((p) => p.mode === filters.dateMode);
    activeChips.push({
      key: "dateMode",
      label: preset?.label ?? `Custom: ${filters.dateFrom} – ${filters.dateTo}`,
    });
  }
  filters.parties.forEach((p) =>
    activeChips.push({ key: "parties", label: p })
  );
  filters.statuses.forEach((s) =>
    activeChips.push({ key: "statuses", label: `Status: ${s}` })
  );
  if (filters.amountMin)
    activeChips.push({
      key: "amountMin",
      label: `Min: ${ETB.format(Number(filters.amountMin))}`,
    });
  if (filters.amountMax)
    activeChips.push({
      key: "amountMax",
      label: `Max: ${ETB.format(Number(filters.amountMax))}`,
    });
  if (filters.itemGroup)
    activeChips.push({ key: "itemGroup", label: `Group: ${filters.itemGroup}` });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range selector */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filters.dateMode}
            onValueChange={(v) =>
              updateFilters({
                dateMode: v as DateRangeMode,
                dateFrom: "",
                dateTo: "",
              })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {QUICK_PRESETS.map((p) => (
                <SelectItem key={p.mode} value={p.mode}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom date inputs (visible when custom mode) */}
        {filters.dateMode === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilters({ dateFrom: e.target.value })}
              className="w-[150px] h-9 text-xs"
              placeholder="From"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilters({ dateTo: e.target.value })}
              className="w-[150px] h-9 text-xs"
              placeholder="To"
            />
          </div>
        )}

        {/* Party multi-select */}
        {showParty && partyOptions.length > 0 && (
          <MultiSelectPopover
            label="Parties"
            options={partyOptions}
            selected={filters.parties}
            onChange={(v) => updateFilters({ parties: v })}
            placeholder={partyPlaceholder}
          />
        )}

        {/* Status multi-select */}
        {showStatus && (
          <MultiSelectPopover
            label="Status"
            options={statusOptions}
            selected={filters.statuses}
            onChange={(v) => updateFilters({ statuses: v })}
            placeholder="All Statuses"
          />
        )}

        {/* Amount range */}
        {showAmountRange && (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={filters.amountMin}
              onChange={(e) => updateFilters({ amountMin: e.target.value })}
              className="w-[100px] h-9 text-xs"
              placeholder="Min amount"
              min="0"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="number"
              value={filters.amountMax}
              onChange={(e) => updateFilters({ amountMax: e.target.value })}
              className="w-[100px] h-9 text-xs"
              placeholder="Max amount"
              min="0"
            />
          </div>
        )}

        {/* Item group filter */}
        {showItemGroup && itemGroupOptions.length > 0 && (
          <Select
            value={filters.itemGroup || undefined}
            onValueChange={(v) =>
              updateFilters({ itemGroup: v === "__all__" ? "" : v })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Groups</SelectItem>
              {itemGroupOptions.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear all button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      <AnimatePresence mode="popLayout">
        {activeChips.length > 0 && (
          <motion.div
            layout
            className="flex flex-wrap items-center gap-1.5"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {activeChips.map((chip) => (
              <FilterChip
                key={`${chip.key}-${chip.label}`}
                label={chip.label}
                onRemove={() => removeFilter(chip.key)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export the filter parsing logic for use in report pages
export { parseFilters, serializeFilters, computeDateRange };
export type { ReportFilters as Filters };
