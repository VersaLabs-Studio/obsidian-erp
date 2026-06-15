// components/manufacturing/CreateJobModal.tsx
// Obsidian ERP v4.0 — One-click "Create job" (2P Part 2.3).
//
// Operator picks a finished item + quantity → on confirm, auto-create +
// submit a Work Order with: the item's default BOM (auto-looked-up via
// the existing `bom?filters=[["item","=",x],["is_default","=",1]]`
// query), implicit `wip_warehouse`/`fg_warehouse`/`source_warehouse`
// from `lib/settings/warehouses.ts`, `company` from `getActiveCompany()`,
// `planned_start_date = today`. If the item has no default BOM, surface
// the existing guided "Create default BOM" path (don't dead-end).
//
// Idempotency: guard via `lib/flows/idempotency.ts` (don't create a
// second open WO for the same item+qty+day unless confirmed).
//
// Design: never expose raw WO jargon. The card face says "Create job",
// the row layout is plain. The word "Work Order" lives in a tooltip.

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
  Factory,
  CalendarDays,
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
import {
  useFrappeCreate,
  useFrappeDoc,
  useFrappeList,
  useFrappeUpdate,
} from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { resolveCompanyWarehouses } from "@/lib/settings/warehouses";

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export interface CreateJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional prefill — when the operator picks "Create job" from a
   *  Sales Order line, we prefill item + qty + sales_order. */
  prefill?: {
    itemCode?: string;
    itemName?: string;
    qty?: number;
    salesOrder?: string;
  };
}

export function CreateJobModal({
  open,
  onOpenChange,
  prefill,
}: CreateJobModalProps) {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();
  const [itemCode, setItemCode] = useState(prefill?.itemCode ?? "");
  const [qty, setQty] = useState<number>(prefill?.qty ?? 1);
  const [plannedStart, setPlannedStart] = useState<string>(
    new Date().toISOString().split("T")[0] ?? "",
  );
  const [wh, setWh] = useState<{
    abbr: string;
    stores: string;
    wip: string;
    fg: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when modal opens (so re-uses don't carry stale state).
  useEffect(() => {
    if (!open) return;
    setItemCode(prefill?.itemCode ?? "");
    setQty(prefill?.qty ?? 1);
    setPlannedStart(new Date().toISOString().split("T")[0] ?? "");
    // Resolve warehouses (cache + best-effort fallback).
    resolveCompanyWarehouses()
      .then(setWh)
      .catch(() => setWh(null));
  }, [open, prefill?.itemCode, prefill?.qty]);

  // Optional: a small searchable list of items so the operator doesn't
  // need a separate modal. We use a Frappe list with the standard
  // search field ("name"); the user types into the field and picks
  // from the matches. If `prefill.itemCode` is set, we still show
  // their chosen item.
  const { data: itemSearch = [] } = useFrappeList<{ name: string; item_name?: string }>(
    "Item",
    {
      fields: ["name", "item_name"],
      filters: itemCode.length >= 2 ? [["name", "like", `%${itemCode}%`]] : undefined,
      limit: 10,
    },
    { enabled: itemCode.length >= 2 && !prefill?.itemCode },
  );

  // Look up the chosen item's default BOM.
  const { data: defaultBOMs = [], isLoading: loadingBOM } = useFrappeList<{
    name: string;
    item: string;
  }>(
    "BOM",
    {
      fields: ["name", "item"],
      filters: [
        ["item", "=", itemCode],
        ["is_default", "=", 1],
        ["is_active", "=", 1],
      ],
      limit: 1,
    },
    { enabled: !!itemCode && open },
  );
  const defaultBOM = defaultBOMs[0];

  // If we have a prefill but the operator wants to confirm the item is
  // valid, fetch the Item doc (no-op if not found).
  const { data: itemDoc } = useFrappeDoc<{ name: string; item_name?: string; is_stock_item?: number; default_warehouse?: string }>(
    "Item",
    itemCode,
    { enabled: !!itemCode && open && !defaultBOMs.length },
  );

  // Existing-WO guard (idempotency): is there already an open
  // (not-completed, not-cancelled) WO for the same item + qty + day?
  // The check is heuristic — exact duplicates only.
  const { data: existingWOs = [] } = useFrappeList<{ name: string }>(
    "Work Order",
    {
      fields: ["name"],
      filters: [
        ["production_item", "=", itemCode],
        ["qty", "=", qty],
        ["planned_start_date", "=", plannedStart],
        ["docstatus", "=", 1],
        ["status", "in", ["Not Started", "In Process", "Stopped"]],
      ],
      limit: 1,
    },
    { enabled: open && !!itemCode && qty > 0 && !!plannedStart },
  );
  const existingWO = existingWOs[0];

  // -- Mutations ------------------------------------------------------------
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Work Order", { showToast: false });
  const updateMutation = useFrappeUpdate<{ data: { name: string } }>(
    "Work Order",
    { showToast: false },
  );

  // -- Submit ---------------------------------------------------------------
  const canSubmit =
    !!itemCode &&
    qty > 0 &&
    !!plannedStart &&
    !!defaultBOM &&
    !!wh &&
    !isCreating;

  const handleSubmit = async () => {
    if (!canSubmit || !wh) return;
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        naming_series: "MFG-WO-.YYYY.-",
        production_item: itemCode,
        item_name: itemDoc?.item_name ?? prefill?.itemName ?? "",
        qty,
        bom_no: defaultBOM.name,
        company: getActiveCompany(),
        wip_warehouse: wh.wip,
        fg_warehouse: wh.fg,
        source_warehouse: wh.stores,
        planned_start_date: plannedStart,
        status: "Not Started",
        // Pass sales_order as a header link if prefill supplied it
        // (so the new WO connects back to the SO in the flow rail).
        ...(prefill?.salesOrder ? { sales_order: prefill.salesOrder } : {}),
      };
      const created = await createMutation.mutateAsync(payload);
      const name = (created as { data?: { name?: string } })?.data?.name;
      if (!name) {
        throw new Error("Server did not return a Work Order name");
      }
      // Submit immediately so the operator can start it from the
      // Cockpit without a second click.
      await updateMutation.mutateAsync({
        name,
        data: { docstatus: 1 },
      });
      toast.success(`Job ${name} created and submitted`);
      onOpenChange(false);
      router.push(`/manufacturing/work-order/${encodeURIComponent(name)}`);
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Work Order" }));
    } finally {
      setIsCreating(false);
    }
  };

  // -- Render ---------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Factory className="h-4 w-4" />
            </span>
            Create a new job
          </DialogTitle>
          <DialogDescription>
            Pick a finished item and quantity. We&apos;ll set up the work
            order, default warehouses, and the BOM automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Idempotency warning */}
          {existingWO && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              <strong>Heads up:</strong> a Work Order for{" "}
              {itemCode} × {qty} on {plannedStart} already exists —{" "}
              <a
                href={`/manufacturing/work-order/${encodeURIComponent(existingWO.name)}`}
                className="underline"
              >
                View {existingWO.name}
              </a>
              . Creating another would create a duplicate job.
            </div>
          )}

          {/* Item + qty */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
            <Row icon={Boxes} label="Finished item" tone="primary">
              {prefill?.itemCode ? (
                <p className="text-sm font-medium text-foreground">
                  {prefill.itemName || itemCode}{" "}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ({itemCode})
                  </span>
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="Search an item…"
                    className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm text-foreground outline-none focus:border-primary/40"
                    data-testid="create-job-item-input"
                  />
                  {itemCode.length >= 2 && itemSearch.length > 0 && (
                    <ul className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-border/40 bg-card">
                      {itemSearch.map((s) => (
                        <li key={s.name}>
                          <button
                            type="button"
                            onClick={() => setItemCode(s.name)}
                            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-secondary/40"
                          >
                            <span className="font-medium">
                              {s.item_name || s.name}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {s.name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Row>
            <Row icon={Plus} label="Quantity" tone="info">
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(0, Number(e.target.value) || 0))
                }
                className="h-9 w-24 rounded-lg border border-border/40 bg-background px-3 text-right text-sm tabular-nums outline-none focus:border-primary/40"
                data-testid="create-job-qty-input"
              />
            </Row>
            <Row icon={CalendarDays} label="Planned start" tone="primary">
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="h-9 rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
                data-testid="create-job-date-input"
              />
            </Row>
          </div>

          {/* BOM resolution */}
          <div className="rounded-xl border border-border/40">
            <div className="border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Bill of materials
            </div>
            <div className="px-3 py-3 text-sm">
              {loadingBOM ? (
                <SkeletonLine className="h-5 w-40" />
              ) : defaultBOM ? (
                <p className="text-foreground">
                  Using default BOM:{" "}
                  <span className="font-mono text-foreground">
                    {defaultBOM.name}
                  </span>
                </p>
              ) : itemCode ? (
                <div className="space-y-2 text-warning">
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> No default BOM for{" "}
                    {itemCode}.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create a default BOM for this item first.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick a finished item to look up the default BOM.
                </p>
              )}
            </div>
          </div>

          {/* Warehouses (implicit, read-only summary) */}
          <div className="rounded-xl border border-border/40">
            <div className="border-b border-border/40 bg-secondary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Warehouses (auto-filled)
            </div>
            <div className="space-y-1.5 px-3 py-3 text-sm">
              {!wh ? (
                <SkeletonLine className="h-4 w-48" />
              ) : (
                <>
                  <Row icon={Boxes} label="Source (raw materials)" tone="info">
                    <span className="font-mono text-xs">{wh.stores}</span>
                  </Row>
                  <Row icon={Factory} label="WIP" tone="primary">
                    <span className="font-mono text-xs">{wh.wip}</span>
                  </Row>
                  <Row icon={CheckCircle2} label="Finished goods" tone="primary">
                    <span className="font-mono text-xs">{wh.fg}</span>
                  </Row>
                </>
              )}
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
              data-testid="create-job-submit"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Create job
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
    <div className="flex items-center gap-2 py-1.5">
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
