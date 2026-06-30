"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OPTION_SETS } from "@/lib/configurator/option-sets";
import type {
  OptionSet,
  OptionChoice,
  ConfiguredLine,
} from "@/lib/configurator/types";
import { matrixKey } from "@/lib/configurator/types";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

interface ItemConfiguratorProps {
  itemCode: string;
  /** @deprecated Pricing now comes from the OptionSet's Pricing discriminator. */
  basePrice?: number;
  onConfirm: (config: ConfiguredLine) => void;
  onCancel: () => void;
}

type Selections = Record<string, string | string[]>;

function getInitialSelections(optionSet: OptionSet): Selections {
  const s: Selections = {};
  for (const group of optionSet.options) {
    s[group.name] = group.type === "single"
      ? (group.choices.find((c) => c.is_default)?.label ?? group.choices[0].label)
      : [];
  }
  return s;
}

function resolveComponents(
  optionSet: OptionSet,
  selections: Selections,
): Array<{ item_code: string; qty: number }> {
  const components: Array<{ item_code: string; qty: number }> = [];
  for (const group of optionSet.options) {
    const sel = selections[group.name];
    const selectedLabels =
      group.type === "single"
        ? [sel as string]
        : (sel as string[]);

    for (const label of selectedLabels) {
      const choice = group.choices.find((c) => c.label === label);
      if (choice?.component_item) {
        components.push({
          item_code: choice.component_item,
          qty: choice.qty_formula ?? 1,
        });
      }
    }
  }
  return components;
}

function buildDescription(
  optionSet: OptionSet,
  selections: Selections,
): string {
  const parts: string[] = [];
  for (const group of optionSet.options) {
    const sel = selections[group.name];
    if (group.type === "single") {
      parts.push(`${group.name}: ${sel as string}`);
    } else {
      const arr = sel as string[];
      if (arr.length > 0) parts.push(`${group.name}: ${arr.join(", ")}`);
    }
  }
  return `${optionSet.item_name} — ${parts.join(" · ")}`;
}

export function ItemConfigurator({
  itemCode,
  basePrice,
  onConfirm,
  onCancel,
}: ItemConfiguratorProps) {
  const optionSet = OPTION_SETS[itemCode];
  const [selections, setSelections] = useState<Selections>(
    () => optionSet && getInitialSelections(optionSet),
  );
  const prefersReduced = useReducedMotion() ?? false;

  const handleSingleSelect = useCallback(
    (groupName: string, label: string) => {
      setSelections((prev) => ({ ...prev, [groupName]: label }));
    },
    [],
  );

  const handleMultiToggle = useCallback(
    (groupName: string, label: string) => {
      setSelections((prev) => {
        const current = prev[groupName] as string[];
        const next = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label];
        return { ...prev, [groupName]: next };
      });
    },
    [],
  );

  // 2W B2 — Pricing discriminator: matrix table lookup or additive.
  // Matrix: price = table[key] where key = value tokens joined by "|".
  // Additive: price = basePrice + Σ price_delta.
  const { computedRate, pricingWarning, totalDelta } = useMemo(() => {
    if (!optionSet) return { computedRate: 0, pricingWarning: false, totalDelta: 0 };

    if (optionSet.pricing.mode === "matrix") {
      const key = matrixKey(optionSet.pricing, optionSet.options, selections);
      const rate = optionSet.pricing.table[key];
      if (rate === undefined) {
        return { computedRate: 0, pricingWarning: true, totalDelta: 0 };
      }
      return { computedRate: rate, pricingWarning: false, totalDelta: 0 };
    }

    // Additive mode
    let delta = 0;
    for (const group of optionSet.options) {
      const sel = selections[group.name];
      const labels =
        group.type === "single" ? [sel as string] : (sel as string[]);
      for (const label of labels) {
        const choice = group.choices.find((c) => c.label === label);
        if (choice) delta += choice.price_delta;
      }
    }
    return {
      computedRate: optionSet.pricing.basePrice + delta,
      pricingWarning: false,
      totalDelta: delta,
    };
  }, [optionSet, selections]);

  const handleConfirm = useCallback(() => {
    if (!optionSet) return;
    onConfirm({
      item_code: optionSet.item_code,
      description: buildDescription(optionSet, selections),
      options: selections,
      rate: computedRate,
      components: resolveComponents(optionSet, selections),
    });
  }, [optionSet, selections, computedRate, onConfirm]);

  if (!optionSet) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{optionSet.item_name}</DialogTitle>
          <DialogDescription>
            Configure options below. Price updates automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {optionSet.options.map((group) => (
            <OptionGroupEditor
              key={group.name}
              group={group}
              value={selections[group.name]}
              onSelect={handleSingleSelect}
              onToggle={handleMultiToggle}
              reducedMotion={prefersReduced}
            />
          ))}
        </div>

        {/* 2W B2 — Min order quantity */}
        {optionSet.min_qty > 1 && (
          <p className="text-xs text-muted-foreground text-center -mt-2">
            Minimum order: <span className="font-semibold">{optionSet.min_qty} units</span>
          </p>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {optionSet.pricing.mode === "matrix" ? (
              "Matrix pricing"
            ) : (
              <>
                Base price: {ETB.format(optionSet.pricing.basePrice)}
                {totalDelta > 0 && (
                  <span className="ml-2 text-info">
                    + {ETB.format(totalDelta)}
                  </span>
                )}
              </>
            )}
          </span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {ETB.format(computedRate)}
          </span>
        </div>

        {/* 2W B2 — Warning when matrix key doesn't match */}
        {pricingWarning && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-sm text-warning">
            Price unavailable for this combination — contact sales.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={pricingWarning}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  OptionGroupEditor — renders a single group (radio or checkbox)     */
/* ------------------------------------------------------------------ */

interface OptionGroupEditorProps {
  group: {
    name: string;
    type: "single" | "multi";
    choices: OptionChoice[];
  };
  value: string | string[];
  onSelect: (groupName: string, label: string) => void;
  onToggle: (groupName: string, label: string) => void;
  reducedMotion: boolean;
}

function OptionGroupEditor({
  group,
  value,
  onSelect,
  onToggle,
  reducedMotion,
}: OptionGroupEditorProps) {
  const isMulti = group.type === "multi";
  const selected = isMulti ? (value as string[]) : [value as string];

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{group.name}</p>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {group.choices.map((choice) => {
            const active = selected.includes(choice.label);
            return (
              <motion.button
                key={choice.label}
                type="button"
                initial={reducedMotion ? false : { scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reducedMotion ? undefined : { scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() =>
                  isMulti
                    ? onToggle(group.name, choice.label)
                    : onSelect(group.name, choice.label)
                }
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    isMulti ? "rounded-sm" : "",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                  )}
                >
                  {active && (
                    <motion.span
                      layout
                      className={cn(
                        "block rounded-full",
                        isMulti ? "size-2" : "size-2",
                      )}
                      style={{ backgroundColor: "currentColor" }}
                    />
                  )}
                </span>
                <span>{choice.label}</span>
                {choice.price_delta > 0 && (
                  <span className="text-xs text-muted-foreground">
                    +{ETB.format(choice.price_delta)}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
