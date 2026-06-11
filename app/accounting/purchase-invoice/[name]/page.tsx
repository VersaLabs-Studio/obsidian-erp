"use client";

// app/accounting/purchase-invoice/[name]/page.tsx
// Obsidian ERP v4.0 — Purchase Invoice Detail (V4 Golden Template)
// Action-oriented detail: FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// Upstream: Purchase Order / Purchase Receipt. Downstream: Payment Entry.
// OKLCH semantic tokens only. StatusBadge for status display.

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
  Truck,
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
import type { PurchaseInvoice } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

interface PIItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

export default function PurchaseInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: invoice,
    isLoading,
    error,
  } = useFrappeDoc<PurchaseInvoice>("Purchase Invoice", name);

  // -- Upstream resolution: Purchase Orders linked to this PI ----------------
  const { data: purchaseOrders, isLoading: loadingPO } = useFrappeList<{
    name: string;
  }>(
    "Purchase Order",
    {
      filters: [["name", "in", []]], // Placeholder — real resolution via items
      fields: ["name"],
      limit: 5,
    },
    { enabled: false },
  );

  // -- Downstream resolution: Payment Entries linked to this PI --------------
  const { data: paymentEntries, isLoading: loadingPE } = useFrappeList<{
    name: string;
  }>(
    "Payment Entry",
    {
      filters: [["reference_name", "=", name]],
      fields: ["name"],
      limit: 5,
    },
    { enabled: !isLoading && !!invoice },
  );

  // -- Build the flow chain from real linked documents -----------------------
  const chain = useMemo(() => {
    const items = (invoice?.items ?? []) as Array<{
      purchase_order?: string;
      purchase_receipt?: string;
    }>;
    const poName = items.find((i) => i?.purchase_order)?.purchase_order;
    const peName = paymentEntries?.[0]?.name;

    const stageStatuses: Record<
      string,
      {
        status: FlowStageStatus;
        documentName?: string;
        documentUrl?: string;
      }
    > = {};

    if (poName) {
      stageStatuses["Purchase Order"] = {
        status: "completed",
        documentName: poName,
        documentUrl: `/buying/purchase-order/${encodeURIComponent(poName)}`,
      };
    }
    if (peName) {
      stageStatuses["Payment Entry"] = {
        status: "completed",
        documentName: peName,
        documentUrl: `/accounting/payment-entry/${encodeURIComponent(peName)}`,
      };
    }

    return resolveFlowChain("Purchase Invoice", name, stageStatuses);
  }, [invoice, paymentEntries, name]);

  // -- Status actions --------------------------------------------------------
  const updateMutation = useFrappeUpdate<PurchaseInvoice>(
    "Purchase Invoice",
    { showToast: false },
  );

  const isDraft = invoice?.docstatus === 0;
  const isSubmitted = invoice?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => toast.success(`Purchase Invoice ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Purchase Invoice" })),
      },
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2 } },
      {
        onSuccess: () =>
          toast.success(`Purchase Invoice ${name} cancelled`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Purchase Invoice" })),
      },
    );
  };

  if (isLoading) return <LoadingState />;
  if (error || !invoice) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Purchase Invoice not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/accounting/purchase-invoice")}
        >
          Back to Purchase Invoices
        </Button>
      </div>
    );
  }

  const items = (invoice.items ?? []) as unknown as PIItem[];
  const grandTotal = invoice.grand_total ?? invoice.total ?? 0;

  const whatsNext = [
    isDraft && {
      label: "Submit Invoice",
      description: "Lock the invoice and post to ledger",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Payment Entry",
      description: "Pay this vendor bill",
      onClick: () =>
        router.push(
          `/accounting/payment-entry/new?invoice=${encodeURIComponent(name)}&party_type=Supplier&party=${encodeURIComponent(invoice.supplier ?? "")}&amount=${invoice.outstanding_amount ?? 0}&payment_type=Pay`,
        ),
      disabled: !isModuleBuilt("Payment Entry"),
      disabledReason: "Payment Entry module not yet built",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={invoice.name}
        subtitle={invoice.supplier_name || invoice.supplier}
        backHref="/accounting/purchase-invoice"
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/accounting/purchase-invoice/${encodeURIComponent(name)}/edit`}
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
            <Button variant="ghost" size="icon" disabled title="Print (Phase 2)">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Flow Tracker */}
      <InfoCard title="Procure-to-Pay Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Purchase Invoice" isLoading={loadingPE} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Invoice Summary">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={invoice.status || "Draft"} />
              <span className="text-2xl font-bold tabular-nums text-primary">
                {ETB.format(grandTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint
                label="Supplier"
                value={invoice.supplier_name || invoice.supplier}
              />
              <DataPoint label="Posting Date" value={invoice.posting_date} />
              <DataPoint label="Due Date" value={invoice.due_date || "—"} />
              <DataPoint label="Company" value={invoice.company} />
              <DataPoint label="Currency" value={invoice.currency} />
              <DataPoint label="Bill No" value={invoice.bill_no || "—"} />
            </div>
            {isSubmitted && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Outstanding
                  </span>
                  <span className="text-lg font-bold tabular-nums text-destructive">
                    {ETB.format(invoice.outstanding_amount ?? 0)}
                  </span>
                </div>
              </div>
            )}
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
          <CrossFlowActionsMenu doctype="Purchase Invoice" name={name} />
          <WhatsNext actions={whatsNext} />
          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "Purchase Invoice created",
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
                      timestamp:
                        invoice.modified ?? new Date().toISOString(),
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
        title="Submit this Purchase Invoice?"
        description="Submitting posts the invoice to the ledger. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Purchase Invoice?"
        description="Cancelling reverses the accounting entries. Linked payments must be cancelled first."
        confirmText="Cancel Invoice"
        variant="destructive"
        onConfirm={handleCancel}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
