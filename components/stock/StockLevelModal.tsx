// components/stock/StockLevelModal.tsx
// Obsidian ERP v4.0 — Display-only modal showing live stock levels
// for items during SO/Quotation creation. Fetches from the Bin doctype
// (actual_qty, reserved_qty, projected_qty per warehouse).

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Boxes, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFrappeList } from "@/hooks/generic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StockLevelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<{ item_code: string; item_name?: string }>;
}

interface BinDoc {
  name: string;
  item_code: string;
  warehouse: string;
  actual_qty: number;
  reserved_qty: number;
  projected_qty: number;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.25,
      ease: "easeOut" as const,
    },
  }),
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StockLevelModal({
  open,
  onOpenChange,
  items,
}: StockLevelModalProps) {
  const prefersReduced = useReducedMotion();

  const itemCodes = useMemo(
    () => Array.from(new Set(items.map((i) => i.item_code).filter(Boolean))),
    [items],
  );

  const { data: bins = [], isLoading } = useFrappeList<BinDoc>(
    "Bin",
    {
      fields: [
        "name",
        "item_code",
        "warehouse",
        "actual_qty",
        "reserved_qty",
        "projected_qty",
      ],
      filters:
        itemCodes.length > 0
          ? [["item_code", "in", itemCodes]]
          : undefined,
      orderBy: { field: "item_code", order: "asc" },
      limit: 500,
    },
    { enabled: open && itemCodes.length > 0 },
  );

  // Group bins by item_code for a clean table layout
  const groupedByItem = useMemo(() => {
    const map = new Map<
      string,
      { item_name?: string; bins: BinDoc[] }
    >();
    // Seed with requested items (even if zero stock)
    for (const it of items) {
      map.set(it.item_code, { item_name: it.item_name, bins: [] });
    }
    for (const bin of bins) {
      const entry = map.get(bin.item_code);
      if (entry) {
        entry.bins.push(bin);
      } else {
        map.set(bin.item_code, {
          item_name: undefined,
          bins: [bin],
        });
      }
    }
    return map;
  }, [items, bins]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="h-4 w-4" />
            </span>
            Stock levels
          </DialogTitle>
          <DialogDescription>
            Live on-hand, reserved, and projected quantities across all
            warehouses.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          {itemCodes.length === 0 ? (
            <EmptyState />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonLine key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-3">Item</div>
                <div className="col-span-3">Warehouse</div>
                <div className="col-span-2 text-right">Actual</div>
                <div className="col-span-2 text-right">Reserved</div>
                <div className="col-span-2 text-right">Projected</div>
              </div>

              {/* Rows */}
              <ul className="divide-y divide-border/40">
                <AnimatePresence initial={!prefersReduced}>
                  {[...groupedByItem.entries()].flatMap(
                    ([itemCode, { item_name, bins: itemBins }]) =>
                      itemBins.length === 0
                        ? [
                            <motion.li
                              key={itemCode}
                              custom={0}
                              variants={prefersReduced ? undefined : rowVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm"
                            >
                              <div className="col-span-3 min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {item_name || itemCode}
                                </p>
                                {item_name && (
                                  <p className="truncate text-[10px] font-mono text-muted-foreground">
                                    {itemCode}
                                  </p>
                                )}
                              </div>
                              <div className="col-span-9 text-xs text-muted-foreground italic">
                                No stock records
                              </div>
                            </motion.li>,
                          ]
                        : itemBins.map((bin, idx) => (
                            <motion.li
                              key={bin.name}
                              custom={idx}
                              variants={
                                prefersReduced ? undefined : rowVariants
                              }
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm"
                            >
                              <div className="col-span-3 min-w-0">
                                {idx === 0 && (
                                  <>
                                    <p className="truncate font-medium text-foreground">
                                      {item_name || itemCode}
                                    </p>
                                    {item_name && (
                                      <p className="truncate text-[10px] font-mono text-muted-foreground">
                                        {itemCode}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="col-span-3 truncate font-mono text-xs text-muted-foreground">
                                {bin.warehouse}
                              </div>
                              <div className="col-span-2 text-right tabular-nums text-foreground">
                                {bin.actual_qty}
                              </div>
                              <div
                                className={cn(
                                  "col-span-2 text-right tabular-nums",
                                  bin.reserved_qty > 0
                                    ? "text-warning"
                                    : "text-muted-foreground",
                                )}
                              >
                                {bin.reserved_qty}
                              </div>
                              <div
                                className={cn(
                                  "col-span-2 text-right tabular-nums font-medium",
                                  bin.projected_qty > 0
                                    ? "text-success"
                                    : bin.projected_qty < 0
                                      ? "text-destructive"
                                      : "text-muted-foreground",
                                )}
                              >
                                {bin.projected_qty}
                              </div>
                            </motion.li>
                          )),
                  )}
                </AnimatePresence>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
        <PackageSearch className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <p className="text-sm text-muted-foreground">
        Add items to the order to check stock levels.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standalone trigger button — drop-in for SO/Quotation forms
// ---------------------------------------------------------------------------

export interface StockLevelTriggerProps {
  items: Array<{ item_code: string; item_name?: string }>;
  className?: string;
}

export function StockLevelTrigger({
  items,
  className,
}: StockLevelTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("rounded-full", className)}
        >
          <Boxes className="mr-1.5 h-3.5 w-3.5" />
          Check stock
        </Button>
      </DialogTrigger>
      <StockLevelModalContent items={items} />
    </Dialog>
  );
}

// Internal wrapper that lives inside a <Dialog> (for the trigger pattern)
function StockLevelModalContent({
  items,
}: {
  items: Array<{ item_code: string; item_name?: string }>;
}) {
  return (
    <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="h-4 w-4" />
          </span>
          Stock levels
        </DialogTitle>
        <DialogDescription>
          Live on-hand, reserved, and projected quantities across all
          warehouses.
        </DialogDescription>
      </DialogHeader>
      <StockLevelTable items={items} />
    </DialogContent>
  );
}

// Shared table logic used by both the standalone modal and the trigger wrapper
function StockLevelTable({
  items,
}: {
  items: Array<{ item_code: string; item_name?: string }>;
}) {
  const prefersReduced = useReducedMotion();

  const itemCodes = useMemo(
    () => Array.from(new Set(items.map((i) => i.item_code).filter(Boolean))),
    [items],
  );

  const { data: bins = [], isLoading } = useFrappeList<BinDoc>(
    "Bin",
    {
      fields: [
        "name",
        "item_code",
        "warehouse",
        "actual_qty",
        "reserved_qty",
        "projected_qty",
      ],
      filters:
        itemCodes.length > 0
          ? [["item_code", "in", itemCodes]]
          : undefined,
      orderBy: { field: "item_code", order: "asc" },
      limit: 500,
    },
    { enabled: itemCodes.length > 0 },
  );

  const groupedByItem = useMemo(() => {
    const map = new Map<
      string,
      { item_name?: string; bins: BinDoc[] }
    >();
    for (const it of items) {
      map.set(it.item_code, { item_name: it.item_name, bins: [] });
    }
    for (const bin of bins) {
      const entry = map.get(bin.item_code);
      if (entry) {
        entry.bins.push(bin);
      } else {
        map.set(bin.item_code, { item_name: undefined, bins: [bin] });
      }
    }
    return map;
  }, [items, bins]);

  if (itemCodes.length === 0) return <EmptyState />;

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLine key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden pt-2">
      <div className="grid grid-cols-12 gap-2 border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="col-span-3">Item</div>
        <div className="col-span-3">Warehouse</div>
        <div className="col-span-2 text-right">Actual</div>
        <div className="col-span-2 text-right">Reserved</div>
        <div className="col-span-2 text-right">Projected</div>
      </div>
      <ul className="divide-y divide-border/40">
        <AnimatePresence initial={!prefersReduced}>
          {[...groupedByItem.entries()].flatMap(
            ([itemCode, { item_name, bins: itemBins }]) =>
              itemBins.length === 0
                ? [
                    <motion.li
                      key={itemCode}
                      custom={0}
                      variants={prefersReduced ? undefined : rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm"
                    >
                      <div className="col-span-3 min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {item_name || itemCode}
                        </p>
                        {item_name && (
                          <p className="truncate text-[10px] font-mono text-muted-foreground">
                            {itemCode}
                          </p>
                        )}
                      </div>
                      <div className="col-span-9 text-xs text-muted-foreground italic">
                        No stock records
                      </div>
                    </motion.li>,
                  ]
                : itemBins.map((bin, idx) => (
                    <motion.li
                      key={bin.name}
                      custom={idx}
                      variants={prefersReduced ? undefined : rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm"
                    >
                      <div className="col-span-3 min-w-0">
                        {idx === 0 && (
                          <>
                            <p className="truncate font-medium text-foreground">
                              {item_name || itemCode}
                            </p>
                            {item_name && (
                              <p className="truncate text-[10px] font-mono text-muted-foreground">
                                {itemCode}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="col-span-3 truncate font-mono text-xs text-muted-foreground">
                        {bin.warehouse}
                      </div>
                      <div className="col-span-2 text-right tabular-nums text-foreground">
                        {bin.actual_qty}
                      </div>
                      <div
                        className={cn(
                          "col-span-2 text-right tabular-nums",
                          bin.reserved_qty > 0
                            ? "text-warning"
                            : "text-muted-foreground",
                        )}
                      >
                        {bin.reserved_qty}
                      </div>
                      <div
                        className={cn(
                          "col-span-2 text-right tabular-nums font-medium",
                          bin.projected_qty > 0
                            ? "text-success"
                            : bin.projected_qty < 0
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {bin.projected_qty}
                      </div>
                    </motion.li>
                  )),
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}
