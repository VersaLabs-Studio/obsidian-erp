"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Edit3,
  Send,
  Ban,
  Printer,
  Loader2,
  Package,
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
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { useFrappeDoc, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import type { SalesInvoice } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

interface SIItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

export default function SalesInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: invoice, isLoading, error } = useFrappeDoc<SalesInvoice>(
    "Sales Invoice",
    name,
  );

  const { data: paymentEntries, isLoading: loadingPE } = useFrappeList<{
    name: string;
  }>(
    "Payment Entry Reference",
    {
      filters: [["reference_name", "=", name]],
      fields: ["parent"],
      limit: 5,
    },
    { enabled: !isLoading && !!invoice },
  );

  const chain = useMemo(() => {
    const items = (invoice?.items ?? []) as Array<{
      delivery_note?: string;
      sales_order?: string;
    }>;
    const dnName = items.find((i) => i?.delivery_note)?.delivery_note;
    const soName = items.find((i) => i?.sales_order)?.sales_order;
    const peName = paymentEntries?.[0]?.name;

    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    if (soName) {
      stageStatuses["Sales Order"] = {
        status: "completed",
        documentName: soName,
        documentUrl: `/sales/sales-order/${encodeURIComponent(soName)}`,
      };
    }
    if (dnName) {
      stageStatuses["Delivery Note"] = {
        status: "completed",
        documentName: dnName,
        documentUrl: `/stock/delivery-note/${encodeURIComponent(dnName)}`,
      };
    }
    if (peName) {
      stageStatuses["Payment Entry"] = {
        status: "completed",
        documentName: peName,
        documentUrl: `/accounting/payment-entry/${encodeURIComponent(peName)}`,
      };
    }

    return resolveFlowChain("Sales Invoice", name, stageStatuses);
  }, [invoice, paymentEntries, name]);

  const updateMutation = useFrappeUpdate<SalesInvoice>("Sales Invoice", {
    showToast: false,
  });

  const isDraft = invoice?.docstatus === 0;
  const isSubmitted = invoice?.docstatus === 1;
  const isUnpaid = isSubmitted && (invoice?.outstanding_amount ?? 0) > 0;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => toast.success(`Sales Invoice ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Sales Invoice" })),
      },
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2 } },
      {
        onSuccess: () => toast.success(`Sales Invoice ${name} cancelled`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Sales Invoice" })),
      },
    );
  };

  if (isLoading) return <LoadingState />;
  if (error || !invoice) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Sales Invoice not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/accounting/sales-invoice")}
        >
          Back to Sales Invoices
        </Button>
      </div>
    );
  }

  const items = (invoice.items ?? []) as unknown as SIItem[];
  const grandTotal = invoice.grand_total ?? invoice.total ?? 0;

  const whatsNext = [
    isDraft && {
      label: "Submit Invoice",
      description: "Lock the invoice and post accounting entries",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Payment Entry",
      description: "Record a payment against this invoice",
      onClick: () =>
        router.push(
          `/accounting/payment-entry/new?invoice=${encodeURIComponent(name)}&party_type=Customer&party=${encodeURIComponent(invoice.customer ?? "")}&amount=${invoice.outstanding_amount ?? 0}`,
        ),
      disabled: !isModuleBuilt("Payment Entry"),
      disabledReason: "Payment Entry module not yet available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        backUrl="/accounting/sales-invoice"
        label="Sales Invoice"
        title={invoice.name}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/accounting/sales-invoice/${encodeURIComponent(name)}/edit`}
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
              </>
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
            <Button variant="ghost" size="icon" disabled title="Print (coming soon)">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Invoice Details">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={invoice.status || "Draft"} size="lg" />
              <span className="text-2xl font-bold tabular-nums text-primary">
                {ETB.format(grandTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint
                label="Customer"
                value={invoice.customer_name || invoice.customer}
              />
              <DataPoint label="Posting Date" value={invoice.posting_date} />
              <DataPoint label="Due Date" value={invoice.due_date ?? "\u2014"} />
              <DataPoint label="Company" value={invoice.company} />
              <DataPoint label="Currency" value={invoice.currency} />
              <DataPoint label="Debit To" value={invoice.debit_to ?? "\u2014"} />
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
                    <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
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

          <InfoCard title="Payment Status">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Grand Total
                </p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {ETB.format(grandTotal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Outstanding Amount
                </p>
                <p
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    (invoice.outstanding_amount ?? 0) > 0
                      ? "text-destructive"
                      : "text-success",
                  )}
                >
                  {ETB.format(invoice.outstanding_amount ?? 0)}
                </p>
              </div>
              <DataPoint
                label="Total Taxes"
                value={ETB.format(invoice.total_taxes_and_charges ?? 0)}
              />
              <DataPoint label="Currency" value={invoice.currency} />
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <InfoCard
            title="Status"
            variant="gradient"
          >
            <div className="flex items-center gap-3">
              <StatusBadge status={invoice.status || "Draft"} size="lg" />
              {(invoice.outstanding_amount ?? 0) > 0 && isSubmitted && (
                <span className="text-xs text-muted-foreground">
                  {ETB.format(invoice.outstanding_amount ?? 0)} outstanding
                </span>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Flow Rail">
            <FlowRail result={chain} currentDocName={name} sourceDoctype="Sales Invoice" isLoading={loadingPE} />
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Sales Invoice" name={name} />

          <WhatsNext actions={whatsNext} />

          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "Sales Invoice created",
                user: invoice.owner,
                timestamp: invoice.creation ?? new Date().toISOString(),
              },
              ...(isSubmitted
                ? [
                    {
                      id: "submitted",
                      type: "submitted" as const,
                      description: "Invoice submitted",
                      user: invoice.modified_by,
                      timestamp: invoice.modified ?? new Date().toISOString(),
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
        title="Submit this Sales Invoice?"
        description="Submitting locks the invoice and posts accounting entries. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Sales Invoice?"
        description="Cancelling reverses the accounting entries. Linked payment entries must be cancelled first."
        confirmText="Cancel Invoice"
        variant="destructive"
        onConfirm={handleCancel}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
