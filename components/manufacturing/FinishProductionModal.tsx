// components/manufacturing/FinishProductionModal.tsx
// Obsidian ERP v4.0 — One-click "Finish Production" modal (2O Part 5.3).
//
// Replaces the prior WO detail page's "Finish" button which deep-linked
// into a prefilled SE wizard. The new flow:
//   1. The user clicks "Finish Production" on a started WO (status =
//      "In Process").
//   2. A single modal opens showing a CONCISE summary of the
//      Manufacture Stock Entry that will be created — the produced FG
//      (qty + warehouse) and the consumed materials (auto-computed from
//      `wo.required_items`).
//   3. On confirm:
//        a. Idempotency check — if a Manufacture SE for this WO
//           already exists, the modal shows a "View existing SE" link
//           instead of a Create button (B3 idempotency).
//        b. Otherwise, the modal creates + submits the Stock Entry
//           (`purpose=Manufacture`) and on success, navigates to the
//           new SE detail.
//   4. Always show what was done (the summary at the top), always
//      leave an undo path (the new SE is cancel-able from its detail
//      page).

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  X,
  ArrowRight,
  Plus,
  Factory,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFrappeCreate, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import type { WORequiredItem } from "./StartProductionModal";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export interface FinishProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderName: string;
  workOrderQty: number;
  producedQty: number;
  /** How many of the workOrderQty should the user be able to declare
   *  finished in this Manufacture entry. Defaults to (workOrderQty -
   *  producedQty). */
  remainingQty?: number;
  productionItem: string;
  wipWarehouse?: string;
  fgWarehouse?: string;
  requiredItems: WORequiredItem[];
}

export function FinishProductionModal({
  open,
  onOpenChange,
  workOrderName,
  workOrderQty,
  producedQty,
  remainingQty,
  productionItem,
  wipWarehouse,
  fgWarehouse,
  requiredItems,
}: FinishProductionModalProps) {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();
  const [isCreating, setIsCreating] = useState(false);

  // 2O Part 5.3 — idempotency: surface any existing Manufacture SE.
  const { data: existingSEs = [] } = useFrappeList<{ name: string }>(
    "Stock Entry",
    {
      fields: ["name"],
      filters: [
        ["work_order", "=", workOrderName],
        ["purpose", "=", "Manufacture"],
        ["docstatus", "!=", 2],
      ],
      limit: 1,
    },
    { enabled: open && !!workOrderName },
  );
  const existingSE = existingSEs.length > 0 ? existingSEs[0] : null;

  const wipWh = wipWarehouse || "";
  const fgWh = fgWarehouse || "";

  // qty to declare as produced in THIS entry
  const declareQty = useMemo(() => {
    if (typeof remainingQty === "number") return Math.max(0, remainingQty);
    return Math.max(0, (Number(workOrderQty) || 0) - (Number(producedQty) || 0));
  }, [remainingQty, workOrderQty, producedQty]);

  // Materials consumed — sum required minus transferred (consumed stays
  // as required for the "expected" view; ERPNext computes the actual
  // transfer from the WO's required_items × declared fg qty).
  const consumedRows = useMemo(() => {
    return requiredItems.map((it) => {
      const required = Number(it.required_qty) || 0;
      const transferred = Number(it.transferred_qty) || 0;
      return {
        item_code: it.item_code,
        item_name: it.item_name,
        qty: required,
        onHand: transferred,
      };
    });
  }, [requiredItems]);

  // -- Mutations -----------------------------------------------------------
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Stock Entry", { showToast: false });
  const updateMutation = useFrappeUpdate<{ data: { name: string } }>(
    "Stock Entry",
    { showToast: false },
  );

  const handleConfirm = async () => {
    if (declareQty <= 0) return;
    setIsCreating(true);
    try {
      const items: Array<Record<string, unknown>> = [
        // FG produced (target = FG warehouse)
        {
          item_code: productionItem,
          item_name: productionItem,
          qty: declareQty,
          t_warehouse: fgWh,
          s_warehouse: undefined,
          basic_rate: 0,
          is_finished_item: 1,
        },
        // Materials consumed (source = WIP, target = scrap/free)
        ...consumedRows.map((c) => ({
          item_code: c.item_code,
          item_name: c.item_name,
          qty: c.qty,
          s_warehouse: wipWh,
          t_warehouse: undefined,
          basic_rate: 0,
        })),
      ];
      const payload: Record<string, unknown> = {
        naming_series: "MAT-STE-.YYYY.-",
        stock_entry_type: "Manufacture",
        purpose: "Manufacture",
        company: getActiveCompany(),
        posting_date: new Date().toISOString().split("T")[0],
        from_warehouse: wipWh,
        to_warehouse: fgWh,
        work_order: workOrderName,
        fg_completed_qty: declareQty,
        items,
      };
      const created = await createMutation.mutateAsync(payload);
      const name = (created as { data?: { name?: string } })?.data?.name;
      if (!name) {
        throw new Error("Server did not return a Stock Entry name");
      }
      // Submit immediately so the FG produced is locked.
      await updateMutation.mutateAsync({
        name,
        data: { docstatus: 1 },
      });
      toast.success(`Manufactured ${declareQty} × ${productionItem}`);
      onOpenChange(false);
      router.push(`/stock/stock-entry/${encodeURIComponent(name)}`);
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Stock Entry" }));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Factory className="h-4 w-4" />
            </span>
            Finish production for {workOrderName}
          </DialogTitle>
          <DialogDescription>
            One-click manufacture. Review the produced / consumed summary,
            then confirm to create and submit the Stock Entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {existingSE && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              <strong>Manufacture entry already exists:</strong>{" "}
              <a
                href={`/stock/stock-entry/${encodeURIComponent(existingSE.name)}`}
                className="underline"
              >
                View {existingSE.name}
              </a>
              . Re-creating risks duplicating the FG receipt.
            </div>
          )}

          {/* Produced summary */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Will be produced
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {productionItem}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Target: <span className="font-mono">{fgWh || "—"}</span>
                </p>
              </div>
              <p className="text-2xl font-bold tabular-nums text-primary">
                {declareQty}
              </p>
            </div>
          </div>

          {/* Consumed materials */}
          <div className="rounded-xl border border-border/40">
            <div className="border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Will be consumed (WIP → free)
            </div>
            <ul className="divide-y divide-border/40">
              {consumedRows.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">
                  No required items on this Work Order.
                </li>
              ) : (
                consumedRows.map((c) => (
                  <li
                    key={c.item_code}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {c.item_name || c.item_code}
                      </p>
                      <p className="truncate text-[10px] font-mono text-muted-foreground">
                        {c.item_code}
                      </p>
                    </div>
                    <p className="text-right text-xs font-bold tabular-nums text-foreground">
                      {c.qty}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

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
              onClick={handleConfirm}
              disabled={
                isCreating ||
                declareQty <= 0 ||
                !!existingSE ||
                !wipWh ||
                !fgWh
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Finish production
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
