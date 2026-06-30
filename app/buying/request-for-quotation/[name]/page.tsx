"use client";

// app/buying/request-for-quotation/[name]/page.tsx
// Request for Quotation Detail — FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// OKLCH semantic tokens only. Real persistence.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { Send, Loader2, FileSearch, Users, Package } from "lucide-react";

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
import { PrintShare } from "@/components/ui/print-share";
import type { RequestForQuotation } from "@/types/doctype-types";

interface RFQItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
}

interface RFQSupplier {
  supplier: string;
  supplier_name?: string;
}

export default function RequestForQuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: rfq,
    isLoading,
    error,
  } = useFrappeDoc<RequestForQuotation>("Request for Quotation", name);

  // 2N Part 1.1: unified flow resolution.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Request for Quotation", name);

  // -- Status actions --------------------------------------------------------
  const updateMutation = useFrappeUpdate<RequestForQuotation>(
    "Request for Quotation",
    { showToast: false },
  );

  const isDraft = rfq?.docstatus === 0;
  const isSubmitted = rfq?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1, status: "Submitted" } },
      {
        onSuccess: () => toast.success(`RFQ ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Request for Quotation" })),
      },
    );
  };

  if (isLoading) return <LoadingState />;
  if (error || !rfq) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Request for Quotation not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/buying/request-for-quotation")}
        >
          Back to RFQs
        </Button>
      </div>
    );
  }

  const items = (rfq.items ?? []) as unknown as RFQItem[];
  const suppliers = (rfq.suppliers ?? []) as unknown as RFQSupplier[];

  const whatsNext = [
    isDraft && {
      label: "Submit RFQ",
      description: "Lock the RFQ and send to suppliers",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Supplier Quotation",
      description: "Record a supplier's response",
      onClick: () =>
        router.push(
          `/buying/supplier-quotation/new?request_for_quotation=${encodeURIComponent(name)}`,
        ),
      disabled: !isModuleBuilt("Supplier Quotation"),
      disabledReason: "Supplier Quotation module not yet available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={rfq.name}
        subtitle={rfq.company}
        backHref="/buying/request-for-quotation"
        actions={
          <div className="flex items-center gap-2">
            <PrintShare doctype="Request for Quotation" name={name} />
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
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Request for Quotation" isLoading={chainLoading} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="RFQ Summary">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={rfq.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint label="Company" value={rfq.company} />
              <DataPoint label="Date" value={rfq.transaction_date} />
              <DataPoint
                label="Message"
                value={rfq.message_for_supplier || "—"}
              />
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
                      UOM
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
                        {it.qty}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {it.uom || "Nos"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>

          <InfoCard
            title="Suppliers"
            icon={<Users className="h-5 w-5 text-primary" />}
          >
            <div className="space-y-2">
              {suppliers.map((s, i) => (
                <div
                  key={`${s.supplier}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-secondary/10 px-4 py-3"
                >
                  <span className="font-medium text-foreground text-sm">
                    {s.supplier_name || s.supplier}
                  </span>
                </div>
              ))}
              {suppliers.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No suppliers added.
                </p>
              )}
            </div>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Request for Quotation" name={name} />
          <WhatsNext actions={whatsNext} />
          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "RFQ created",
                user: rfq.owner,
                timestamp: rfq.creation ?? new Date().toISOString(),
              },
              ...(isSubmitted
                ? [
                    {
                      id: "submitted",
                      type: "submitted" as const,
                      description: "RFQ submitted",
                      user: rfq.modified_by,
                      timestamp: rfq.modified ?? new Date().toISOString(),
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
        title="Submit this Request for Quotation?"
        description="Submitting locks the RFQ and marks it as sent to suppliers."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
