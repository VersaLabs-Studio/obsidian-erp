// components/manufacturing/StartProductionModal.tsx
// Obsidian ERP v4.0 — One-click "Start Production" modal (2O Part 5.1/5.2).
//
// Replaces the prior WO detail page's "Transfer materials" button which
// deep-linked into a prefilled SE wizard. The new flow:
//   1. The user clicks "Transfer materials" on a submitted WO.
//   2. A single modal opens showing a CONCISE summary of what will
//      happen — the source→target warehouses and the per-item transfer
//      lines (auto-computed from `wo.required_items`).
//   3. On confirm:
//        a. Idempotency check — if a Material Transfer SE for this WO
//           already exists, the modal shows a "View existing SE" link
//           instead of a Create button (B3 idempotency).
//        b. Shortfall detection — if any required item has a Bin
//           qty < required, the modal surfaces a guided error with
//           two paths: "Create Material Request" (procurement) and
//           "Stock Reconciliation" (count correction). It does NOT
//           create a half-filled transfer.
//        c. Otherwise, the modal creates + submits the Stock Entry
//           (`purpose=Material Transfer for Manufacture`) and on
//           success, navigates to the new SE detail.
//   4. Always show what was done (the summary at the top), always
//      leave an undo path (the new SE is cancel-able from its detail
//      page).
//
// The modal does NOT auto-submit financial docs (this is a
// warehouse-only movement).

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ArrowRight,
  Plus,
  ClipboardList,
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
import { useFrappeCreate, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { resolveCompanyWarehouses } from "@/lib/settings/warehouses";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface WORequiredItem {
  item_code: string;
  item_name?: string;
  required_qty: number;
  transferred_qty?: number;
  consumed_qty?: number;
  source_warehouse?: string;
  /** Optional Bin snapshot the caller may have on hand — used to
   *  compute the shortfall summary without re-fetching. */
  available_qty?: number;
}

export interface StartProductionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderName: string;
  workOrderQty: number;
  productionItem: string;
  sourceWarehouse?: string;
  wipWarehouse?: string;
  fgWarehouse?: string;
  requiredItems: WORequiredItem[];
}

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function StartProductionModal({
  open,
  onOpenChange,
  workOrderName,
  workOrderQty,
  productionItem,
  sourceWarehouse,
  wipWarehouse,
  fgWarehouse,
  requiredItems,
}: StartProductionModalProps) {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();
  const [isCreating, setIsCreating] = useState(false);
  // 2P Part 2.4 — implicit-warehouse resolution. If the WO has blank
  // `source_warehouse` / `wip_warehouse`, fall back to the active
  // company's canonical Stores / WIP (via lib/settings/warehouses.ts).
  // The advanced Stock-Entry wizard keeps the explicit pickers.
  const [implicitWarehouses, setImplicitWarehouses] = useState<{
    stores: string;
    wip: string;
    fg: string;
  } | null>(null);
  useEffect(() => {
    if (!open) return;
    if (sourceWarehouse && wipWarehouse) {
      setImplicitWarehouses(null);
      return;
    }
    resolveCompanyWarehouses()
      .then((w) => setImplicitWarehouses({ stores: w.stores, wip: w.wip, fg: w.fg }))
      .catch(() => setImplicitWarehouses(null));
  }, [open, sourceWarehouse, wipWarehouse]);

  // 2O Part 5.1 — idempotency: surface any existing Material Transfer
  // SE for this WO so the user doesn't double-create.
  const { data: existingSEs = [] } = useFrappeList<{ name: string }>(
    "Stock Entry",
    {
      fields: ["name"],
      filters: [
        ["work_order", "=", workOrderName],
        ["purpose", "=", "Material Transfer for Manufacture"],
        ["docstatus", "!=", 2],
      ],
      limit: 1,
    },
    { enabled: open && !!workOrderName },
  );
  const existingSE = existingSEs.length > 0 ? existingSEs[0] : null;

  // 2O Part 5.1 — shortfall detection. We compare required qty to
  // Bin actual_qty. For items without a snapshot, we mark them as
  // "unverified" rather than guessing. The hook returns a list keyed
  // by item_code.
  const { data: bins = [] } = useFrappeList<{
    item_code: string;
    actual_qty: number;
  }>(
    "Bin",
    {
      fields: ["item_code", "actual_qty"],
      limit: 500,
    },
    { enabled: open && requiredItems.length > 0 },
  );
  const binByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bins) m.set(b.item_code, Number(b.actual_qty) || 0);
    return m;
  }, [bins]);

  const sourceWh = sourceWarehouse || implicitWarehouses?.stores || "";
  const targetWh = wipWarehouse || implicitWarehouses?.wip || "";
  const summaryLines = useMemo(() => {
    return requiredItems.map((it) => {
      const required = Number(it.required_qty) || 0;
      const onHand = it.available_qty ?? binByItem.get(it.item_code) ?? null;
      const shortfall = onHand === null ? null : Math.max(0, required - onHand);
      return {
        ...it,
        required,
        onHand,
        shortfall,
        short: shortfall !== null && shortfall > 0,
      };
    });
  }, [requiredItems, binByItem]);

  const hasShortfall = summaryLines.some((l) => l.short);

  // -- Mutations -----------------------------------------------------------
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Stock Entry", { showToast: false });
  const updateMutation = useFrappeUpdate<{ data: { name: string } }>(
    "Stock Entry",
    { showToast: false },
  );

  // -- Confirm handler ----------------------------------------------------
  const handleConfirm = async () => {
    if (hasShortfall) return; // Defensive — the button is also disabled.
    setIsCreating(true);
    try {
      const items = summaryLines.map((l) => ({
        item_code: l.item_code,
        item_name: l.item_name,
        qty: l.required,
        uom: undefined,
        s_warehouse: l.source_warehouse || sourceWh,
        t_warehouse: targetWh,
        basic_rate: 0,
      }));
      const payload: Record<string, unknown> = {
        naming_series: "MAT-STE-.YYYY.-",
        stock_entry_type: "Material Transfer for Manufacture",
        purpose: "Material Transfer for Manufacture",
        company: getActiveCompany(),
        posting_date: new Date().toISOString().split("T")[0],
        from_warehouse: sourceWh,
        to_warehouse: targetWh,
        work_order: workOrderName,
        fg_completed_qty: 0,
        items,
      };
      const created = await createMutation.mutateAsync(payload);
      const name = (created as { data?: { name?: string } })?.data?.name;
      if (!name) {
        throw new Error("Server did not return a Stock Entry name");
      }
      // Submit the new SE so the transfer is locked immediately. The
      // prior code left drafts visible to other operators, which
      // risked double-pick when the modal was double-clicked.
      await updateMutation.mutateAsync({
        name,
        data: { docstatus: 1 },
      });
      toast.success(`Material transferred for ${workOrderName}`);
      onOpenChange(false);
      router.push(`/stock/stock-entry/${encodeURIComponent(name)}`);
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Stock Entry" }));
    } finally {
      setIsCreating(false);
    }
  };

  // -- Render -------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowRight className="h-4 w-4" />
            </span>
            Start production for {workOrderName}
          </DialogTitle>
          <DialogDescription>
            One-click material transfer. Review the summary, then confirm to
            create and submit the Stock Entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Idempotency notice */}
          {existingSE && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              <strong>Material Transfer already exists:</strong>{" "}
              <a
                href={`/stock/stock-entry/${encodeURIComponent(existingSE.name)}`}
                className="underline"
              >
                View {existingSE.name}
              </a>
              . Cancelling and re-creating would risk duplication. Open the
              existing entry to amend if needed.
            </div>
          )}

          {/* Transfer summary */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Transfer summary
              </p>
              <p className="text-[10px] text-muted-foreground">
                {requiredItems.length} item{requiredItems.length === 1 ? "" : "s"} · {workOrderQty} {productionItem}
              </p>
            </div>
            <div className="space-y-1.5 text-sm">
              <SummaryRow
                icon={Plus}
                label="From"
                value={sourceWh || "—"}
                tone="info"
              />
              <SummaryRow
                icon={ArrowRight}
                label="To"
                value={targetWh || "—"}
                tone="info"
              />
            </div>
          </div>

          {/* Item breakdown */}
          <div className="rounded-xl border border-border/40">
            <div className="border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Materials
            </div>
            <ul className="divide-y divide-border/40">
              {summaryLines.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">
                  No required items on this Work Order.
                </li>
              ) : (
                summaryLines.map((line) => (
                  <li
                    key={line.item_code}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm",
                      line.short && "bg-warning/5",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {line.item_name || line.item_code}
                      </p>
                      <p className="truncate text-[10px] font-mono text-muted-foreground">
                        {line.item_code}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-bold tabular-nums text-foreground">
                        {line.required}
                      </p>
                      {line.onHand !== null && (
                        <p
                          className={cn(
                            "text-[10px] tabular-nums",
                            line.short ? "text-warning" : "text-muted-foreground",
                          )}
                        >
                          on hand: {line.onHand}
                        </p>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Shortfall guidance */}
          {hasShortfall && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs">
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Shortfall detected
              </p>
              <p className="mb-3 text-muted-foreground">
                One or more required materials aren&apos;t on hand in the source
                warehouse. Resolve the shortfall first:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const shortItems = summaryLines
                      .filter((l) => l.short)
                      .map((l) => `${l.item_code}:${l.shortfall ?? 0}`)
                      .join(",");
                    router.push(
                      `/stock/material-request/new?work_order=${encodeURIComponent(workOrderName)}&shortfall=${encodeURIComponent(shortItems)}`,
                    );
                    onOpenChange(false);
                  }}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Material Request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    router.push(`/stock/stock-reconciliation/new?work_order=${encodeURIComponent(workOrderName)}`);
                    onOpenChange(false);
                  }}
                >
                  <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Stock Reconciliation
                </Button>
              </div>
            </div>
          )}

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
              onClick={handleConfirm}
              disabled={
                isCreating ||
                hasShortfall ||
                !!existingSE ||
                requiredItems.length === 0 ||
                !sourceWh ||
                !targetWh
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
                  Transfer &amp; start
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

function SummaryRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "info" | "primary";
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          tone === "info" ? "text-info" : "text-primary",
        )}
      />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="font-mono text-xs font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}
