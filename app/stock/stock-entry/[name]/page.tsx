"use client";

// app/stock/stock-entry/[name]/page.tsx
// Obsidian ERP v4.0 — Stock Entry Detail (V4 Golden Template)
// Action-oriented detail per Architecture V4 Part 2 §3.2 + §6 (Flow Tracker).
// Real persistence, OKLCH semantic tokens only.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Send,
  Trash2,
  Ban,
  Loader2,
  Package,
  ArrowRightLeft,
} from "lucide-react";

import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FlowRail } from "@/components/flows/FlowRail";
import { isModuleBuilt } from "@/lib/flows/module-availability";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { CrossFlowActionsMenu } from "@/components/cross-flow/CrossFlowActionsMenu";
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { useFrappeDoc, useFrappeUpdate, useFrappeDelete } from "@/hooks/generic";
import { PrintShare } from "@/components/ui/print-share";
import type { StockEntry } from "@/types/doctype-types";

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

interface SEItem {
  item_code: string;
  item_name?: string;
  qty: number;
  basic_rate: number;
  amount?: number;
  s_warehouse?: string;
  t_warehouse?: string;
  uom?: string;
}

export default function StockEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: se, isLoading, error } = useFrappeDoc<StockEntry>(
    "Stock Entry",
    name,
  );

  const updateMutation = useFrappeUpdate<StockEntry>("Stock Entry", {
    showToast: false,
  });

  const deleteMutation = useFrappeDelete<StockEntry>("Stock Entry", {
    showToast: false,
  });

  const isDraft = se?.docstatus === 0;
  const isSubmitted = se?.docstatus === 1;

  // 2N Part 1.1: unified flow resolution.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Stock Entry", name);

  // -- Status actions --------------------------------------------------------
  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => toast.success(`Stock Entry ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Stock Entry" })),
      },
    );
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    deleteMutation.mutate(name, {
      onSuccess: () => {
        toast.success(`Stock Entry ${name} deleted`);
        router.push("/stock/stock-entry");
      },
      onError: (err) =>
        showError(resolveFrappeError(err, { doctype: "Stock Entry" })),
    });
  };

  if (isLoading) return <LoadingState />;
  if (error || !se) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Stock Entry not found."}
        </p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/stock/stock-entry")}>
          Back to Stock Entries
        </Button>
      </div>
    );
  }

  const items = (se.items ?? []) as unknown as SEItem[];

  // What's-Next actions
  const whatsNext = [
    isDraft && {
      label: "Submit Stock Entry",
      description: "Confirm stock movement",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Delivery Note",
      description: "Create fulfillment from this entry",
      onClick: () => router.push(`/stock/delivery-note/new?stock_entry=${encodeURIComponent(name)}`),
      disabled: !isModuleBuilt("Delivery Note"),
      disabledReason: "Module not available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={se.name}
        label="Stock Entry"
        backUrl="/stock/stock-entry"
        status={{
          label: isSubmitted ? "Submitted" : isDraft ? "Draft" : "Cancelled",
          variant: isSubmitted ? "success" : isDraft ? "default" : "destructive",
        }}
        actions={
          <div className="flex items-center gap-2">
            <PrintShare doctype="Stock Entry" name={name} />
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stock/stock-entry/${encodeURIComponent(name)}/edit`}>
                    Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setConfirmSubmit(true)}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  Submit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </>
            )}
            {isSubmitted && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled
                title="Cancel — coming in Phase 2"
              >
                <Ban className="mr-1.5 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        }
      />

      {/* Flow Tracker — upstream Work Order link */}
      {se.work_order && (
        <InfoCard title="Manufacturing Flow" className="overflow-hidden">
          <FlowRail result={chain} currentDocName={name} sourceDoctype="Stock Entry" isLoading={chainLoading} />
        </InfoCard>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Entry Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint label="Purpose" value={se.purpose} />
              <DataPoint label="Company" value={se.company} />
              <DataPoint label="Posting Date" value={se.posting_date} />
              <DataPoint label="From Warehouse" value={se.from_warehouse || "—"} />
              <DataPoint label="To Warehouse" value={se.to_warehouse || "—"} />
              <DataPoint
                label="Work Order"
                value={
                  se.work_order ? (
                    isModuleBuilt("Work Order") ? (
                      <Link
                        href={`/manufacturing/work-order/${encodeURIComponent(se.work_order)}`}
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {se.work_order}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm" title="Work Order module not yet built">
                        {se.work_order}
                      </span>
                    )
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </InfoCard>

          <InfoCard title="Items" icon={<Package className="h-5 w-5 text-primary" />}>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-secondary/20">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Source</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((it, i) => (
                    <tr key={`${it.item_code}-${i}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">
                          {it.item_name || it.item_code}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {it.qty} {it.uom}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {ETB.format(it.basic_rate)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                        {ETB.format(it.amount ?? it.qty * it.basic_rate)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {it.s_warehouse || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {it.t_warehouse || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>

          <InfoCard title="Values" icon={<ArrowRightLeft className="h-5 w-5 text-primary" />}>
            <div className="grid grid-cols-3 gap-4">
              <DataPoint
                label="Total Outgoing"
                value={ETB.format(se.total_outgoing_value ?? 0)}
              />
              <DataPoint
                label="Total Incoming"
                value={ETB.format(se.total_incoming_value ?? 0)}
              />
              <DataPoint
                label="Value Difference"
                value={ETB.format(se.value_difference ?? 0)}
              />
            </div>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <InfoCard title="Status" variant="gradient">
            <div className="flex items-center gap-3">
              <StatusBadge status={se.docstatus ?? 0} size="lg" />
              {se.purpose && (
                <StatusBadge status={se.purpose} size="lg" />
              )}
            </div>
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Stock Entry" name={name} />

          <WhatsNext actions={whatsNext} />

          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "Stock Entry created",
                user: se.owner,
                timestamp: se.creation ?? new Date().toISOString(),
              },
              ...(isSubmitted
                ? [
                    {
                      id: "submitted",
                      type: "submitted" as const,
                      description: "Stock Entry submitted",
                      user: se.modified_by,
                      timestamp: se.modified ?? new Date().toISOString(),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this Stock Entry?"
        description="Submitting confirms the stock movement and posts to the ledger. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Stock Entry?"
        description="Deleting removes this draft entry permanently. This action cannot be undone."
        confirmText="Delete Entry"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
