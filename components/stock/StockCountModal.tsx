// components/stock/StockCountModal.tsx
// Obsidian ERP v4.0 — Friendly "Stock count" (2P Part 2.7).
//
// The operator's verb is "Stock count" — for opening balances and
// corrections. The modal lets the operator enter counted quantities
// for items and writes a Stock Reconciliation under the hood (the
// 2I module already exists — we wrap, not expose the jargon).
//
// Each row: item + warehouse + current qty + counted qty. The
// reconciliation = counted - current; ERPNext applies the
// difference on submit.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  X,
  CheckCircle2,
  ClipboardList,
  Trash2,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFrappeCreate, useFrappeList } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { resolveCompanyWarehouses } from "@/lib/settings/warehouses";

interface CountRow {
  item_code: string;
  warehouse: string;
  current_qty: number;
  counted_qty: string; // string in input, parsed on submit
}

const EMPTY_ROW: CountRow = {
  item_code: "",
  warehouse: "",
  current_qty: 0,
  counted_qty: "",
};

export interface StockCountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional prefill: when the operator clicks "Stock count" from
   *  Stock Health with a specific row, we prefill the item. */
  prefill?: { itemCode?: string; warehouse?: string };
}

export function StockCountModal({
  open,
  onOpenChange,
  prefill,
}: StockCountModalProps) {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();
  const [rows, setRows] = useState<CountRow[]>([{ ...EMPTY_ROW }]);
  const [wh, setWh] = useState<{ stores: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // -- Pre-fill: warehouse + (optional) item -------------------------------
  useEffect(() => {
    if (!open) return;
    resolveCompanyWarehouses()
      .then((w) => setWh({ stores: w.stores }))
      .catch(() => setWh(null));
    if (prefill?.itemCode) {
      setRows([
        {
          item_code: prefill.itemCode,
          warehouse: prefill.warehouse ?? "",
          current_qty: 0,
          counted_qty: "",
        },
      ]);
    } else {
      setRows([{ ...EMPTY_ROW }]);
    }
  }, [open, prefill?.itemCode, prefill?.warehouse]);

  // -- Batched current-qty lookup for the rows' items -----------------------
  const itemCodes = useMemo(
    () => [...new Set(rows.map((r) => r.item_code).filter(Boolean))],
    [rows],
  );
  const { data: bins = [] } = useFrappeList<{
    item_code: string;
    warehouse: string;
    actual_qty: number;
  }>(
    "Bin",
    {
      fields: ["item_code", "warehouse", "actual_qty"],
      limit: 500,
    },
    { enabled: open && itemCodes.length > 0 },
  );
  const binByItemWh = useMemo(() => {
    const out = new Map<string, number>();
    for (const b of bins) {
      out.set(`${b.item_code}::${b.warehouse}`, Number(b.actual_qty) || 0);
    }
    return out;
  }, [bins]);

  function updateRow(i: number, patch: Partial<CountRow>) {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, ...patch };
        // Recompute current_qty when item_code or warehouse changes
        if (patch.item_code !== undefined || patch.warehouse !== undefined) {
          const key = `${next.item_code}::${next.warehouse}`;
          next.current_qty = binByItemWh.get(key) ?? 0;
        }
        return next;
      }),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW, warehouse: prev[0]?.warehouse ?? wh?.stores ?? "" }]);
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  // -- Mutations ------------------------------------------------------------
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Stock Reconciliation", { showToast: false });

  const canSubmit =
    rows.length > 0 &&
    rows.every((r) => r.item_code && r.warehouse) &&
    rows.some((r) => Number(r.counted_qty) !== r.current_qty) &&
    !isCreating;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsCreating(true);
    try {
      const items = rows
        .filter((r) => r.item_code && r.warehouse)
        .map((r) => {
          const counted = Number(r.counted_qty) || 0;
          const diff = counted - (r.current_qty ?? 0);
          return {
            item_code: r.item_code,
            warehouse: r.warehouse,
            qty: counted,
            current_qty: r.current_qty,
            difference: diff,
            // ERPNext wants both `current_qty` and `qty` on Stock
            // Reconciliation Item; the difference is computed on submit.
          };
        });
      const payload: Record<string, unknown> = {
        naming_series: "MAT-RECON-.YYYY.-",
        company: getActiveCompany(),
        posting_date: new Date().toISOString().split("T")[0],
        purpose: "Stock Reconciliation",
        items,
      };
      const created = await createMutation.mutateAsync(payload);
      const name = (created as { data?: { name?: string } })?.data?.name;
      if (!name) {
        throw new Error("Server did not return a Stock Reconciliation name");
      }
      // We do NOT auto-submit (Stock Reconciliation submit is an
      // advanced operator action that affects stock value). The
      // operator reviews the new doc and submits when ready.
      toast.success(`Stock count recorded as ${name}`);
      onOpenChange(false);
      router.push(`/stock/stock-reconciliation/${encodeURIComponent(name)}`);
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Stock Reconciliation" }));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="h-4 w-4" />
            </span>
            Stock count
          </DialogTitle>
          <DialogDescription>
            Enter the counted quantity for each item. The system will
            compute the difference and post a Stock Reconciliation that
            you can review and submit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border/40">
            <div className="grid grid-cols-12 gap-2 border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Item</div>
              <div className="col-span-3">Warehouse</div>
              <div className="col-span-2 text-right">On hand</div>
              <div className="col-span-2 text-right">Counted</div>
              <div className="col-span-1" />
            </div>
            <ul className="divide-y divide-border/40">
              {rows.map((r, i) => {
                const counted = Number(r.counted_qty) || 0;
                const diff = counted - (r.current_qty ?? 0);
                return (
                  <li
                    key={i}
                    className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm"
                    data-testid={`count-row-${i}`}
                  >
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={r.item_code}
                        onChange={(e) => updateRow(i, { item_code: e.target.value })}
                        placeholder="Item code…"
                        className="h-9 w-full rounded-lg border border-border/40 bg-background px-2 text-sm outline-none focus:border-primary/40"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={r.warehouse}
                        onChange={(e) => updateRow(i, { warehouse: e.target.value })}
                        placeholder="Warehouse…"
                        className="h-9 w-full rounded-lg border border-border/40 bg-background px-2 text-sm font-mono outline-none focus:border-primary/40"
                      />
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-muted-foreground">
                      {r.current_qty}
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        value={r.counted_qty}
                        onChange={(e) => updateRow(i, { counted_qty: e.target.value })}
                        placeholder="—"
                        className="h-9 w-full rounded-lg border border-border/40 bg-background px-2 text-right text-sm tabular-nums outline-none focus:border-primary/40"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Difference display */}
                    {r.item_code && r.warehouse && r.counted_qty !== "" && diff !== 0 && (
                      <div className="col-span-12 -mt-1 pl-1 text-[10px]">
                        Difference:{" "}
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            diff > 0 ? "text-success" : "text-destructive",
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border/40 bg-secondary/10 px-3 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-dashed"
                onClick={addRow}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add row
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={handleSubmit}
              disabled={!canSubmit}
              data-testid="stock-count-submit"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Recording…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Record count
                </>
              )}
            </Button>
          </div>
        </div>

        <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
      </DialogContent>
    </Dialog>
  );
}
