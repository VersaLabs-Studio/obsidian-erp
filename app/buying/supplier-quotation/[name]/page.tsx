"use client";

// app/buying/supplier-quotation/[name]/page.tsx
// Supplier Quotation Detail — FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// OKLCH semantic tokens only. Real persistence.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { Send, Loader2, FileText, Package } from "lucide-react";

import {
  PageHeader,
  LoadingState,
  ConfirmDialog,
  StatusBadge,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FlowRail } from "@/components/flows/FlowRail";
import { isModuleBuilt } from "@/lib/flows/module-availability";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { CrossFlowActionsMenu } from "@/components/cross-flow/CrossFlowActionsMenu";
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import type { SupplierQuotation } from "@/types/doctype-types";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

interface SQItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

export default function SupplierQuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: sq,
    isLoading,
    error,
  } = useFrappeDoc<SupplierQuotation>("Supplier Quotation", name);

  // 2N Part 1.1: unified flow resolution.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Supplier Quotation", name);

  // -- Status actions --------------------------------------------------------
  const updateMutation = useFrappeUpdate<SupplierQuotation>(
    "Supplier Quotation",
    { showToast: false },
  );

  const isDraft = sq?.docstatus === 0;
  const isSubmitted = sq?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1, status: "Submitted" } },
      {
        onSuccess: () => toast.success(`Supplier Quotation ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Supplier Quotation" })),
      },
    );
  };

  if (isLoading) return <LoadingState />;
  if (error || !sq) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Supplier Quotation not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/buying/supplier-quotation")}
        >
          Back to Supplier Quotations
        </Button>
      </div>
    );
  }

  const items = (sq.items ?? []) as unknown as SQItem[];
  const grandTotal = sq.grand_total ?? sq.total ?? 0;

  const whatsNext = [
    isDraft && {
      label: "Submit Quotation",
      description: "Lock the quotation for review",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Purchase Order",
      description: "Convert this quotation to an order",
      onClick: () =>
        router.push(
          `/buying/purchase-order/new?supplier_quotation=${encodeURIComponent(name)}`,
        ),
      disabled: !isModuleBuilt("Purchase Order"),
      disabledReason: "Purchase Order module not yet available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={sq.name}
        subtitle={sq.supplier_name || sq.supplier}
        backHref="/buying/supplier-quotation"
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
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
            )}
          </div>
        }
      />

      {/* Flow Tracker */}
      <InfoCard title="Procurement Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Supplier Quotation" isLoading={chainLoading} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Quotation Summary">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={sq.status} />
              <span className="text-2xl font-bold tabular-nums text-primary">
                {ETB.format(grandTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint
                label="Supplier"
                value={sq.supplier_name || sq.supplier}
              />
              <DataPoint label="Company" value={sq.company} />
              <DataPoint label="Date" value={sq.transaction_date} />
              <DataPoint label="Valid Till" value={sq.valid_till || "—"} />
              <DataPoint label="Currency" value={sq.currency} />
            </div>
          </InfoCard>

          <InfoCard
            title="Items"
            icon={<Package className="h-5 w-5 text-primary" />}
          >
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-secondary/20">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Item
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Qty
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Rate
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((it, i) => (
                    <tr key={`${it.item_code}-${i}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">
                          {it.item_name || it.item_code}
                        </div>
                        {it.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {it.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {it.qty} {it.uom}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {ETB.format(it.rate)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                        {ETB.format(it.amount ?? it.qty * it.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Supplier Quotation" name={name} />
          <WhatsNext actions={whatsNext} />
          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "Supplier Quotation created",
                user: sq.owner,
                timestamp: sq.creation ?? new Date().toISOString(),
              },
              ...(isSubmitted
                ? [
                    {
                      id: "submitted",
                      type: "submitted" as const,
                      description: "Quotation submitted",
                      user: sq.modified_by,
                      timestamp: sq.modified ?? new Date().toISOString(),
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
        title="Submit this Supplier Quotation?"
        description="Submitting locks the quotation. It can then be converted to a Purchase Order."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
