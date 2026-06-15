// components/stock/ReceiveMaterialsModal.tsx
// Obsidian ERP v4.0 — One-click "Receive items" (2P Part 2.6).
//
// Two entry points, both one-click, both implicit-warehouse:
//   - From a PO: a "Receive items" action → this modal → auto-create +
//     submit a Purchase Receipt (target = implicit Stores), with a
//     received-lines summary + partial-receipt support. Idempotent
//     (don't double-receive a fully-received PO; show per-item
//     received vs ordered).
//   - Standalone "Receive stock" (no PO) from the Cockpit / Stock
//     Health: pick item + qty → auto Material Receipt Stock Entry
//     into Stores. This is the SME "I just bought supplies" path.
//
// Why a single modal: the operator's verb is "Receive". Whether the
// source is a PO or a cash purchase, the action is the same — stock
// goes up at the Stores warehouse.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  Boxes,
  Truck,
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
  useFrappeCreate,
  useFrappeList,
  useFrappeUpdate,
} from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { resolveCompanyWarehouses } from "@/lib/settings/warehouses";

// ---------------------------------------------------------------------------
// Source doctypes
// ---------------------------------------------------------------------------
export type ReceiveSource =
  | { kind: "po"; poName: string }
  | { kind: "standalone"; itemCode?: string; qty?: number };

export interface ReceiveMaterialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ReceiveSource;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ReceiveMaterialsModal({
  open,
  onOpenChange,
  source,
}: ReceiveMaterialsModalProps) {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();
  const [wh, setWh] = useState<{ stores: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // -- Resolve Stores warehouse (implicit) -----------------------------------
  useEffect(() => {
    if (!open) return;
    resolveCompanyWarehouses()
      .then((w) => setWh({ stores: w.stores }))
      .catch(() => setWh(null));
  }, [open]);

  // -- PO-source: load PO + items, per-item received vs ordered --------------
  const { data: po = [], isLoading: loadingPO } = useFrappeList<{
    name: string;
    items?: Array<{
      name: string;
      item_code: string;
      item_name?: string;
      qty: number;
      received_qty?: number;
      rate?: number;
      uom?: string;
      warehouse?: string;
    }>;
  }>(
    "Purchase Order",
    {
      fields: ["name", "items"],
      filters: source.kind === "po" ? [["name", "=", source.poName]] : undefined,
      limit: 1,
    },
    { enabled: open && source.kind === "po" },
  );
  const poDoc = po[0];

  // -- Idempotency: how many PRs are already submitted against this PO? -----
  const { data: existingPRs = [] } = useFrappeList<{ name: string }>(
    "Purchase Receipt",
    {
      fields: ["name"],
      filters: source.kind === "po"
        ? [
            ["purchase_order", "=", source.poName],
            ["docstatus", "!=", 2],
          ]
        : undefined,
      limit: 1,
    },
    { enabled: open && source.kind === "po" },
  );
  const existingPR = existingPRs[0];

  // -- Per-item "receive qty" state (defaults to outstanding) ---------------
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  useEffect(() => {
    if (source.kind !== "po" || !poDoc) return;
    const next: Record<string, number> = {};
    for (const it of poDoc.items ?? []) {
      const outstanding =
        (Number(it.qty) || 0) - (Number(it.received_qty) || 0);
      next[it.name] = outstanding > 0 ? outstanding : 0;
    }
    setReceiveQtys(next);
  }, [poDoc, source.kind]);

  const lines = useMemo(() => {
    if (source.kind !== "po" || !poDoc) return [];
    return (poDoc.items ?? []).map((it) => {
      const ordered = Number(it.qty) || 0;
      const received = Number(it.received_qty) || 0;
      const outstanding = Math.max(0, ordered - received);
      const receiveQty = receiveQtys[it.name] ?? 0;
      return { ...it, ordered, received, outstanding, receiveQty };
    });
  }, [poDoc, receiveQtys, source.kind]);

  const totalToReceive = lines.reduce(
    (s, l) => s + (Number(l.receiveQty) || 0),
    0,
  );
  const allFullyReceived = lines.length > 0 && lines.every((l) => l.outstanding === 0);

  // -- Standalone source: item + qty ---------------------------------------
  const [standItem, setStandItem] = useState<string>(source.kind === "standalone" ? source.itemCode ?? "" : "");
  const [standQty, setStandQty] = useState<number>(source.kind === "standalone" ? source.qty ?? 1 : 1);

  // -- Mutations ------------------------------------------------------------
  const createPRMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Purchase Receipt", { showToast: false });
  const updatePRMutation = useFrappeUpdate<{ data: { name: string } }>(
    "Purchase Receipt",
    { showToast: false },
  );
  const createSEMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Stock Entry", { showToast: false });
  const updateSEMutation = useFrappeUpdate<{ data: { name: string } }>(
    "Stock Entry",
    { showToast: false },
  );

  // -- Submit handlers -------------------------------------------------------
  const handleReceiveFromPO = async () => {
    if (source.kind !== "po" || !poDoc || !wh) return;
    if (totalToReceive <= 0) {
      showError({
        code: "NO_QTY",
        title: "Nothing to receive",
        explanation: "Set a receive quantity on at least one line.",
        severity: "warning",
        actions: [{ label: "Dismiss", kind: "dismiss", variant: "ghost", run: () => {} }],
      });
      return;
    }
    setIsCreating(true);
    try {
      const items = lines
        .filter((l) => Number(l.receiveQty) > 0)
        .map((l) => ({
          item_code: l.item_code,
          item_name: l.item_name,
          qty: Number(l.receiveQty),
          rate: l.rate ?? 0,
          amount: (Number(l.receiveQty) || 0) * (l.rate ?? 0),
          uom: l.uom,
          warehouse: l.warehouse || wh.stores,
          purchase_order: poDoc.name,
          purchase_order_item: l.name,
        }));
      const payload: Record<string, unknown> = {
        naming_series: "MAT-PRE-.YYYY.-",
        company: getActiveCompany(),
        posting_date: new Date().toISOString().split("T")[0],
        supplier: (poDoc as { supplier?: string }).supplier,
        purchase_order: poDoc.name,
        items,
      };
      const created = await createPRMutation.mutateAsync(payload);
      const name = (created as { data?: { name?: string } })?.data?.name;
      if (!name) throw new Error("Server did not return a Purchase Receipt name");
      // Submit immediately so the receipt is locked.
      await updatePRMutation.mutateAsync({ name, data: { docstatus: 1 } });
      toast.success(`Received ${items.length} item(s) into ${wh.stores}`);
      onOpenChange(false);
      router.push(`/stock/purchase-receipt/${encodeURIComponent(name)}`);
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Purchase Receipt" }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleReceiveStandalone = async () => {
    if (source.kind !== "standalone" || !wh) return;
    if (!standItem || standQty <= 0) {
      showError({
        code: "NO_QTY",
        title: "Item and qty required",
        explanation: "Pick an item and enter a positive quantity.",
        severity: "warning",
        actions: [{ label: "Dismiss", kind: "dismiss", variant: "ghost", run: () => {} }],
      });
      return;
    }
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        naming_series: "MAT-STE-.YYYY.-",
        stock_entry_type: "Material Receipt",
        purpose: "Material Receipt",
        company: getActiveCompany(),
        posting_date: new Date().toISOString().split("T")[0],
        to_warehouse: wh.stores,
        items: [
          {
            item_code: standItem,
            qty: standQty,
            t_warehouse: wh.stores,
            basic_rate: 0,
          },
        ],
      };
      const created = await createSEMutation.mutateAsync(payload);
      const name = (created as { data?: { name?: string } })?.data?.name;
      if (!name) throw new Error("Server did not return a Stock Entry name");
      await updateSEMutation.mutateAsync({ name, data: { docstatus: 1 } });
      toast.success(`Received ${standQty} × ${standItem} into ${wh.stores}`);
      onOpenChange(false);
      router.push(`/stock/stock-entry/${encodeURIComponent(name)}`);
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Stock Entry" }));
    } finally {
      setIsCreating(false);
    }
  };

  const isPO = source.kind === "po";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackageCheck className="h-4 w-4" />
            </span>
            {isPO ? `Receive items from ${source.poName}` : "Receive stock"}
          </DialogTitle>
          <DialogDescription>
            {isPO
              ? "Confirm received quantities per line. The receipt is created and submitted for you."
              : "Enter the item and quantity. The stock entry is created and submitted for you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Warehouse auto-fill */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
            <Row icon={Boxes} label="Target warehouse" tone="primary">
              {!wh ? (
                <SkeletonLine className="h-5 w-32" />
              ) : (
                <span className="font-mono text-xs">{wh.stores}</span>
              )}
            </Row>
          </div>

          {/* Idempotency notice (PO source) */}
          {isPO && existingPR && (
            <div className="rounded-xl border border-info/30 bg-info/5 px-3 py-2 text-xs text-info">
              <strong>Receipt already exists:</strong>{" "}
              <a
                href={`/stock/purchase-receipt/${encodeURIComponent(existingPR.name)}`}
                className="underline"
              >
                View {existingPR.name}
              </a>
              . Partial-receipt additions are still allowed — set qty on
              outstanding lines below.
            </div>
          )}

          {/* PO-source: per-item received vs ordered */}
          {isPO && loadingPO && (
            <div className="space-y-2">
              <SkeletonLine className="h-10 w-full rounded-xl" />
              <SkeletonLine className="h-10 w-full rounded-xl" />
            </div>
          )}
          {isPO && !loadingPO && lines.length > 0 && (
            <div className="rounded-xl border border-border/40">
              <div className="border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lines
              </div>
              <ul className="divide-y divide-border/40">
                {lines.map((l) => (
                  <li
                    key={l.name}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                      l.outstanding === 0 && "opacity-60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {l.item_name || l.item_code}
                      </p>
                      <p className="truncate text-[10px] font-mono text-muted-foreground">
                        {l.item_code}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Ordered: <span className="tabular-nums">{l.ordered}</span>{" "}
                        · Received: <span className="tabular-nums">{l.received}</span>{" "}
                        · Outstanding:{" "}
                        <span className={cn("tabular-nums", l.outstanding === 0 ? "text-success" : "text-warning")}>
                          {l.outstanding}
                        </span>
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={l.outstanding}
                      disabled={l.outstanding === 0}
                      value={l.receiveQty}
                      onChange={(e) =>
                        setReceiveQtys((prev) => ({
                          ...prev,
                          [l.name]: Math.max(
                            0,
                            Math.min(l.outstanding, Number(e.target.value) || 0),
                          ),
                        }))
                      }
                      className="h-9 w-20 rounded-lg border border-border/40 bg-background px-2 text-right text-sm tabular-nums outline-none focus:border-primary/40 disabled:opacity-50"
                      data-testid={`receive-qty-${l.item_code}`}
                    />
                  </li>
                ))}
              </ul>
              {allFullyReceived && !existingPR && (
                <div className="border-t border-border/40 bg-success/5 px-3 py-2 text-xs text-success">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> All lines
                  fully received.
                </div>
              )}
            </div>
          )}

          {/* Standalone source: item + qty */}
          {!isPO && (
            <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
              <Row icon={Truck} label="Item" tone="primary">
                <input
                  type="text"
                  value={standItem}
                  onChange={(e) => setStandItem(e.target.value)}
                  placeholder="Item code…"
                  className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
                  data-testid="standalone-item"
                />
              </Row>
              <Row icon={Plus} label="Quantity" tone="info">
                <input
                  type="number"
                  min={1}
                  value={standQty}
                  onChange={(e) => setStandQty(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9 w-24 rounded-lg border border-border/40 bg-background px-3 text-right text-sm tabular-nums outline-none focus:border-primary/40"
                  data-testid="standalone-qty"
                />
              </Row>
            </div>
          )}

          {/* Warn if nothing to do */}
          {isPO && allFullyReceived && !existingPR && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Every line is
              already received. There&apos;s nothing to record.
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
              onClick={isPO ? handleReceiveFromPO : handleReceiveStandalone}
              disabled={
                isCreating ||
                !wh ||
                (isPO
                  ? totalToReceive <= 0
                  : !standItem || standQty <= 0)
              }
              data-testid="receive-confirm"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Receiving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Receive
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

function Row({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: LucideIcon;
  label: string;
  tone: "info" | "primary";
  children: React.ReactNode;
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
      <div className="flex-1">{children}</div>
    </div>
  );
}
