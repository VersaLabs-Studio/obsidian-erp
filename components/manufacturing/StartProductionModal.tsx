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
  ShoppingCart,
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
import {
  useFrappeDelete,
  useFrappeList,
  useFrappeUpdate,
} from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { resolveCompanyWarehouses } from "@/lib/settings/warehouses";
import { binLevelsByItemWarehouse } from "@/lib/stock/bin-levels";

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
  /** Called after a successful transfer so the parent (WO page) can
   *  refetch and reflect the now-"In Process" status. When provided, the
   *  modal stays on the Work Order instead of redirecting to the SE. */
  onCompleted?: () => void;
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
  onCompleted,
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

  // 2O Part 5.1 — idempotency, now SELF-HEALING (2P live-fix). We surface
  // any existing Material Transfer SE for this WO *with its docstatus* so
  // the confirm handler can RESOLVE rather than block: a submitted SE means
  // the transfer is already done (proceed); a draft means resume + submit
  // it (no duplicate). `orderBy docstatus desc` prefers a submitted (1)
  // over a stray draft (0) when both somehow exist.
  const { data: existingSEs = [], refetch: refetchExisting } = useFrappeList<{
    name: string;
    docstatus: number;
  }>(
    "Stock Entry",
    {
      fields: ["name", "docstatus"],
      filters: [
        ["work_order", "=", workOrderName],
        ["purpose", "=", "Material Transfer for Manufacture"],
        ["docstatus", "!=", 2],
      ],
      orderBy: { field: "docstatus", order: "desc" },
      limit: 1,
    },
    { enabled: open && !!workOrderName },
  );
  const existingSE = existingSEs.length > 0 ? existingSEs[0] : null;
  const existingSubmitted = existingSE?.docstatus === 1;

  // Whether the WO has ACTUALLY started. ERPNext flips a submitted WO to
  // "In Process"/"Completed" once a Material Transfer for Manufacture
  // advances it. We use this to detect a STALE transfer: a submitted SE
  // that (because of the old `fg_completed_qty: 0` bug) moved stock but
  // never started the WO. Such a transfer must be cancelled + redone — a
  // "Continue" would silently no-op.
  const { data: woRows = [] } = useFrappeList<{ status: string }>(
    "Work Order",
    {
      fields: ["status"],
      filters: [["name", "=", workOrderName]],
      limit: 1,
    },
    { enabled: open && !!workOrderName },
  );
  const woStarted = ["In Process", "Completed"].includes(woRows[0]?.status ?? "");
  // A submitted transfer that left the WO un-started is stale (old bug).
  const staleTransfer = existingSubmitted && woRows.length > 0 && !woStarted;

  const sourceWh = sourceWarehouse || implicitWarehouses?.stores || "";
  const targetWh = wipWarehouse || implicitWarehouses?.wip || "";

  // 2V P0-1 — Bin query now includes warehouse and is scoped to the source
  // warehouse. The query is gated on `sourceWh` being resolved so we never
  // query without a warehouse filter (which would collapse to an arbitrary
  // warehouse's qty, causing false-positive shortfalls).
  const { data: bins2 = [] } = useFrappeList<{
    item_code: string;
    warehouse: string;
    actual_qty: number;
  }>(
    "Bin",
    {
      fields: ["item_code", "warehouse", "actual_qty"],
      filters: sourceWh
        ? [["warehouse", "=", sourceWh]] as [string, string, unknown][]
        : undefined,
      limit: 500,
    },
    { enabled: open && requiredItems.length > 0 && !!sourceWh },
  );
  const binByItemWarehouse = useMemo(
    () => binLevelsByItemWarehouse(bins2),
    [bins2],
  );

  const summaryLines = useMemo(() => {
    return requiredItems.map((it) => {
      const required = Number(it.required_qty) || 0;
      const wh = it.source_warehouse || sourceWh;
      const key = wh ? `${it.item_code}::${wh}` : it.item_code;
      const onHand = it.available_qty ?? binByItemWarehouse.get(key) ?? null;
      const shortfall = onHand === null ? null : Math.max(0, required - onHand);
      return {
        ...it,
        required,
        onHand,
        shortfall,
        short: shortfall !== null && shortfall > 0,
      };
    });
  }, [requiredItems, binByItemWarehouse, sourceWh]);

  const hasShortfall = summaryLines.some((l) => l.short);

  // -- Mutations -----------------------------------------------------------
  // We no longer HAND-BUILD the Stock Entry (that path moved stock but left
  // the WO "Not Started" — see app/api/.../make-stock-entry/route.ts). The
  // canonical transfer is created + submitted server-side by ERPNext's own
  // `make_stock_entry`. These mutations are only for CLEANING UP a prior
  // buggy SE so the canonical one is the single doc crediting the WO:
  //   • a stale SUBMITTED transfer (old fg=0 bug) → cancel (docstatus: 2)
  //   • a leftover DRAFT transfer                 → delete (can't cancel a 0)
  const updateMutation = useFrappeUpdate<{ data: { name: string } }>(
    "Stock Entry",
    { showToast: false },
  );
  const deleteMutation = useFrappeDelete("Stock Entry", { showToast: false });

  // -- Confirm handler (SELF-HEALING) -------------------------------------
  // The only true blocker is a real material shortfall. Otherwise:
  //   • WO already advanced  → nothing to do, hand back to the WO page
  //   • stale submitted SE   → cancel it, then run the canonical transfer
  //   • leftover draft SE    → delete it, then run the canonical transfer
  //   • nothing yet          → run the canonical transfer
  const finish = (name: string, message: string) => {
    // Surface the SE name (with a link) but keep the operator in the
    // production flow: hand control back to the WO page so it refetches
    // and shows "In Process" + Finish Production. Only fall back to the
    // SE detail when no completion callback is wired.
    toast.success(
      message,
      name
        ? {
            action: {
              label: "View entry",
              onClick: () =>
                router.push(`/stock/stock-entry/${encodeURIComponent(name)}`),
            },
          }
        : undefined,
    );
    onOpenChange(false);
    if (onCompleted) {
      onCompleted();
    } else if (name) {
      router.push(`/stock/stock-entry/${encodeURIComponent(name)}`);
    }
  };

  // The DEFINITIVE transfer: POST to the server route that calls ERPNext's
  // `make_stock_entry(work_order, "Material Transfer for Manufacture", qty)`
  // and submits the result. Because ERPNext builds the doc, every linkage
  // field is present and the WO actually flips to "In Process". Same-origin
  // fetch carries the `sid` cookie, so RBAC is enforced (DocPerm for the user).
  const runCanonicalTransfer = async (): Promise<string> => {
    const res = await fetch(
      `/api/manufacturing/work-order/${encodeURIComponent(
        workOrderName,
      )}/make-stock-entry`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "Material Transfer for Manufacture",
          qty: workOrderQty,
        }),
      },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      // Re-shape the route's error so the guided dialog shows the real cause.
      throw new Error(
        (json?.details as string) ||
          (json?.error as string) ||
          "Couldn't start production. Please try again.",
      );
    }
    return (json.data?.name as string) ?? "";
  };

  const handleConfirm = async () => {
    if (hasShortfall) return; // Defensive — the button is also disabled.
    setIsCreating(true);
    try {
      // 0) WO already advanced (In Process / Completed) → nothing to do.
      //    Hand control back to the WO page so it reflects the live state.
      if (woStarted) {
        finish(
          existingSE?.name ?? "",
          `Production already underway for ${workOrderName}`,
        );
        return;
      }

      // 1) Clean up any prior HAND-BUILT SE so the canonical transfer is the
      //    only doc crediting the WO. A stale submitted one is cancelled; a
      //    leftover draft is deleted. (Both were made by the old buggy path
      //    that didn't carry BOM linkage, so neither can advance the WO.)
      if (existingSE) {
        if (existingSubmitted) {
          await updateMutation.mutateAsync({
            name: existingSE.name,
            data: { docstatus: 2 },
          });
        } else {
          await deleteMutation.mutateAsync(existingSE.name);
        }
      }

      // 2) Canonical path — ERPNext builds + submits the transfer; the WO
      //    flips to "In Process".
      const seName = await runCanonicalTransfer();
      finish(seName, `Production started for ${workOrderName}`);
    } catch (err) {
      // Surface the REAL error (e.g. genuine stock validation). Refresh the
      // existing-SE probe first so the modal reflects current state.
      refetchExisting();
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
          {/* Idempotency notice — informational, NOT a blocker. The confirm
              button resolves the existing SE (continue if submitted, resume
              if draft) so the user is never dead-ended. */}
          {existingSE && (
            <div
              className={cn(
                "rounded-xl border px-3 py-2 text-xs",
                staleTransfer
                  ? "border-warning/30 bg-warning/5 text-warning"
                  : existingSubmitted
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-info/30 bg-info/5 text-info",
              )}
            >
              {staleTransfer ? (
                <>
                  <strong>A submitted transfer exists but didn&apos;t start
                  this Work Order</strong> (
                  <a
                    href={`/stock/stock-entry/${encodeURIComponent(existingSE.name)}`}
                    className="underline"
                  >
                    {existingSE.name}
                  </a>
                  ). We&apos;ll cancel it and re-transfer so production
                  actually starts — your net stock position is unchanged.
                </>
              ) : existingSubmitted ? (
                <>
                  <strong>Materials already transferred.</strong>{" "}
                  <a
                    href={`/stock/stock-entry/${encodeURIComponent(existingSE.name)}`}
                    className="underline"
                  >
                    View {existingSE.name}
                  </a>
                  . Continue to proceed with production.
                </>
              ) : (
                <>
                  <strong>A draft transfer exists</strong> (
                  <a
                    href={`/stock/stock-entry/${encodeURIComponent(existingSE.name)}`}
                    className="underline"
                  >
                    {existingSE.name}
                  </a>
                  ). We&apos;ll replace it with a correct transfer so
                  production actually starts.
                </>
              )}
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

          {/* Shortfall guidance — 2V P0-2: PO is the primary procurement action */}
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
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const shortItems = summaryLines
                      .filter((l) => l.short)
                      .map((l) => `${l.item_code}:${l.shortfall ?? 0}`)
                      .join(",");
                    router.push(
                      `/buying/purchase-order/new?work_order=${encodeURIComponent(workOrderName)}&shortfall=${encodeURIComponent(shortItems)}`,
                    );
                    onOpenChange(false);
                  }}
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Create Purchase Order
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
                <Button
                  variant="ghost"
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
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Material Request
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
                // Wait for the WO-status probe before acting on a submitted
                // SE, so we correctly distinguish "done" from "stale".
                (existingSubmitted && woRows.length === 0) ||
                // A fresh transfer needs required items to act on. Warehouses
                // are resolved server-side by ERPNext's make_stock_entry, so
                // we don't gate on them here.
                (!existingSE && requiredItems.length === 0)
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {existingSE ? "Resolving…" : "Creating…"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  {staleTransfer
                    ? "Re-transfer & start"
                    : woStarted
                      ? "Continue"
                      : existingSE
                        ? "Re-transfer & start"
                        : "Transfer & start"}
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
