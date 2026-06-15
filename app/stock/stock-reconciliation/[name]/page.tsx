"use client";

// app/stock/stock-reconciliation/[name]/page.tsx
// Obsidian ERP v4.0 — Stock Reconciliation Detail
// Standalone document. NO FlowRail, NO flow chain.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Edit3,
  Send,
  Trash2,
  Loader2,
  Scale,
  Package,
} from "lucide-react";

import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { useFrappeDoc, useFrappeUpdate, useFrappeDelete } from "@/hooks/generic";
import type { StockReconciliation } from "@/types/doctype-types";

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

interface SRItem {
  item_code: string;
  item_name?: string;
  warehouse: string;
  qty: number;
  valuation_rate?: number;
  amount?: number;
}

export default function StockReconciliationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: sr,
    isLoading,
    error,
  } = useFrappeDoc<StockReconciliation>("Stock Reconciliation", name);

  const updateMutation = useFrappeUpdate<StockReconciliation>("Stock Reconciliation", {
    showToast: false,
  });

  const deleteMutation = useFrappeDelete("Stock Reconciliation", {
    onSuccess: () => {
      toast.success("Stock Reconciliation deleted");
      router.push("/stock/stock-reconciliation");
    },
  });

  const isDraft = sr?.docstatus === 0;
  const isSubmitted = sr?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => toast.success(`Stock Reconciliation ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Stock Reconciliation" })),
      },
    );
  };

  const handleDelete = () => {
    setShowDelete(false);
    deleteMutation.mutate(name);
  };

  if (isLoading) return <LoadingState />;
  if (error || !sr) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Stock Reconciliation not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/stock/stock-reconciliation")}
        >
          Back to Stock Reconciliations
        </Button>
      </div>
    );
  }

  const items = (sr.items ?? []) as unknown as SRItem[];

  const whatsNext = [
    isDraft && {
      label: "Submit Stock Reconciliation",
      description: "Confirm count and adjust stock levels",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={sr.name}
        subtitle={sr.purpose || "Stock Reconciliation"}
        backHref="/stock/stock-reconciliation"
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/stock/stock-reconciliation/${encodeURIComponent(name)}/edit`}
                  >
                    <Edit3 className="mr-1.5 h-4 w-4" /> Edit
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
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Reconciliation Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DataPoint label="Purpose" value={sr.purpose || "—"} />
              <DataPoint label="Posting Date" value={sr.posting_date} />
              <DataPoint label="Company" value={sr.company} />
              <DataPoint label="Warehouse" value={sr.set_warehouse || "—"} />
            </div>
          </InfoCard>

          <InfoCard title="Items" icon={<Package className="h-5 w-5 text-primary" />}>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-secondary/20">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Warehouse</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Valuation Rate</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((it, i) => {
                    const qty = Number(it.qty) || 0;
                    const rate = Number(it.valuation_rate) || 0;
                    return (
                      <tr key={`${it.item_code}-${i}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-foreground">
                            {it.item_name || it.item_code}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {it.warehouse || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{qty}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {ETB.format(rate)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          {ETB.format(it.amount ?? qty * rate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/20">
                    <td colSpan={4} className="px-3 py-3 text-right font-bold uppercase text-xs">
                      Total
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-lg text-primary tabular-nums">
                      {ETB.format(
                        items.reduce(
                          (sum, it) =>
                            sum + (Number(it.qty) || 0) * (Number(it.valuation_rate) || 0),
                          0,
                        ),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <InfoCard title="Status" variant="gradient">
            <div className="space-y-3">
              <StatusBadge
                status={isDraft ? "Draft" : isSubmitted ? "Submitted" : "Cancelled"}
                size="lg"
              />
            </div>
          </InfoCard>

          <InfoCard title="What's Next">
            <WhatsNext actions={whatsNext} />
          </InfoCard>

          <InfoCard title="Activity">
            <ActivityTimeline
              items={[
                {
                  id: "created",
                  type: "created",
                  description: "Stock Reconciliation created",
                  user: sr.owner,
                  timestamp: sr.creation ?? new Date().toISOString(),
                },
                ...(isSubmitted
                  ? [
                      {
                        id: "submitted",
                        type: "submitted" as const,
                        description: "Stock Reconciliation submitted",
                        user: sr.modified_by,
                        timestamp: sr.modified ?? new Date().toISOString(),
                      },
                    ]
                  : []),
              ]}
            />
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this Stock Reconciliation?"
        description="Submitting confirms the count and adjusts stock levels. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete this Stock Reconciliation?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
