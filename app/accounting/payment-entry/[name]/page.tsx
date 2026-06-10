"use client";

// app/accounting/payment-entry/[name]/page.tsx
// Obsidian ERP v4.0 — Payment Entry Detail (V4 Golden Template)
// FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// OKLCH semantic tokens only, real persistence.

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Send,
  Ban,
  Printer,
  Loader2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FlowRail } from "@/components/flows/FlowRail";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { useFrappeDoc, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import type { PaymentEntry, SalesInvoice, PurchaseInvoice } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

interface PEReferenceRow {
  reference_doctype: string;
  reference_name: string;
  allocated_amount?: number;
  total_amount?: number;
  outstanding_amount?: number;
}

export default function PaymentEntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: entry, isLoading, error } = useFrappeDoc<PaymentEntry>(
    "Payment Entry",
    name,
  );

  // -- Upstream resolution: Sales Invoice from references --------------------
  const invoiceRef = useMemo(() => {
    if (!entry?.references) return null;
    const refs = entry.references as PEReferenceRow[];
    return refs.find(
      (r) =>
        r.reference_doctype === "Sales Invoice" ||
        r.reference_doctype === "Purchase Invoice",
    );
  }, [entry]);

  const { data: linkedInvoice, isLoading: loadingInvoice } =
    useFrappeDoc<SalesInvoice>(
      invoiceRef?.reference_doctype ?? "Sales Invoice",
      invoiceRef?.reference_name ?? "",
      { enabled: !!invoiceRef?.reference_name },
    );

  // -- Build the flow chain from real linked documents -----------------------
  const chain = useMemo(() => {
    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    if (invoiceRef?.reference_name) {
      const invDoctype = invoiceRef.reference_doctype;
      stageStatuses[invDoctype] = {
        status: "completed",
        documentName: invoiceRef.reference_name,
        documentUrl:
          invDoctype === "Sales Invoice"
            ? `/accounting/sales-invoice/${encodeURIComponent(invoiceRef.reference_name)}`
            : `/accounting/purchase-invoice/${encodeURIComponent(invoiceRef.reference_name)}`,
      };
    }

    // Payment Entry is the current stage
    stageStatuses["Payment Entry"] = {
      status: entry?.docstatus === 1 ? "completed" : "current",
      documentName: name,
      documentUrl: `/accounting/payment-entry/${encodeURIComponent(name)}`,
    };

    return resolveFlowChain("Payment Entry", name, stageStatuses);
  }, [entry, invoiceRef, name]);

  // -- Status actions (real mutations) --------------------------------------
  const updateMutation = useFrappeUpdate<PaymentEntry>("Payment Entry", {
    showToast: false,
  });

  const isDraft = entry?.docstatus === 0;
  const isSubmitted = entry?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1, status: "Submitted" } },
      {
        onSuccess: () => toast.success(`Payment Entry ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Payment Entry" })),
      },
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2, status: "Cancelled" } },
      {
        onSuccess: () => toast.success(`Payment Entry ${name} cancelled`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Payment Entry" })),
      },
    );
  };

  if (isLoading) return <LoadingState />;
  if (error || !entry) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Payment Entry not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/accounting/payment-entry")}
        >
          Back to Payment Entries
        </Button>
      </div>
    );
  }

  const references = (entry.references ?? []) as PEReferenceRow[];
  const isReceive = entry.payment_type === "Receive";
  const displayAmount = isReceive
    ? entry.received_amount ?? entry.paid_amount
    : entry.paid_amount;

  // What's-Next actions
  const whatsNext = [
    isDraft && {
      label: "Submit Payment",
      description: "Lock the payment and update ledger",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Print Receipt",
      description: "Generate a printable payment receipt",
      onClick: () => window.print(),
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        backHref="/accounting/payment-entry"
        label="Payment Entry"
        title={entry.name}
        status={{
          label: entry.status ?? (isDraft ? "Draft" : isSubmitted ? "Submitted" : "Cancelled"),
          variant: isDraft
            ? "default"
            : isSubmitted
              ? "success"
              : "destructive",
        }}
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
            {isSubmitted && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmCancel(true)}
              >
                <Ban className="mr-1.5 h-4 w-4" /> Cancel
              </Button>
            )}
            <Button variant="ghost" size="icon" disabled title="Print (Phase 2)">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Payment Details">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={entry.status ?? (isDraft ? "Draft" : isSubmitted ? "Submitted" : "Cancelled")} />
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  isReceive ? "text-success" : "text-destructive",
                )}
              >
                {isReceive ? (
                  <ArrowDownLeft className="mr-1 inline h-5 w-5" />
                ) : (
                  <ArrowUpRight className="mr-1 inline h-5 w-5" />
                )}
                {ETB.format(displayAmount)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint label="Payment Type" value={entry.payment_type} />
              <DataPoint label="Party Type" value={entry.party_type ?? "—"} />
              <DataPoint label="Party" value={entry.party_name || entry.party || "—"} />
              <DataPoint label="Company" value={entry.company} />
              <DataPoint label="Mode of Payment" value={entry.mode_of_payment ?? "—"} />
              <DataPoint label="Posting Date" value={entry.posting_date} />
              <DataPoint label="Reference No" value={entry.reference_no ?? "—"} />
              <DataPoint label="Reference Date" value={entry.reference_date ?? "—"} />
              <DataPoint label="Paid From" value={entry.paid_from} mono />
              <DataPoint label="Paid To" value={entry.paid_to} mono />
            </div>
          </InfoCard>

          <InfoCard
            title="Allocated Invoices"
            icon={<Wallet className="h-5 w-5 text-primary" />}
          >
            {references.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No invoices allocated
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-semibold">Invoice</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Outstanding</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {references.map((ref, i) => (
                      <tr
                        key={`${ref.reference_name}-${i}`}
                        className="cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => {
                          const basePath =
                            ref.reference_doctype === "Sales Invoice"
                              ? "/accounting/sales-invoice"
                              : "/accounting/purchase-invoice";
                          router.push(
                            `${basePath}/${encodeURIComponent(ref.reference_name)}`,
                          );
                        }}
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-foreground">
                            {ref.reference_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ref.reference_doctype}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {ETB.format(ref.total_amount ?? 0)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {ETB.format(ref.outstanding_amount ?? 0)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          {ETB.format(ref.allocated_amount ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <InfoCard title="Status" variant="gradient">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  isReceive
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {isReceive ? (
                  <ArrowDownLeft className="h-6 w-6" />
                ) : (
                  <ArrowUpRight className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {ETB.format(displayAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.payment_type} · {entry.mode_of_payment || "Cash"}
                </p>
              </div>
            </div>
            <StatusBadge
              status={entry.status ?? (isDraft ? "Draft" : isSubmitted ? "Submitted" : "Cancelled")}
              size="lg"
            />
          </InfoCard>

          <InfoCard title="Flow Rail">
            <FlowRail result={chain} currentDocName={name} sourceDoctype="Payment Entry" isLoading={loadingInvoice} />
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
                  description: "Payment Entry created",
                  user: entry.owner,
                  timestamp: entry.creation ?? new Date().toISOString(),
                },
                ...(isSubmitted
                  ? [
                      {
                        id: "submitted",
                        type: "submitted" as const,
                        description: "Payment submitted",
                        user: entry.modified_by,
                        timestamp: entry.modified ?? new Date().toISOString(),
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
        title="Submit this Payment Entry?"
        description="Submitting locks the payment and updates the ledger. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Payment Entry?"
        description="Cancelling reverses the payment. Linked documents must be cancelled first."
        confirmText="Cancel Payment"
        variant="destructive"
        onConfirm={handleCancel}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}


