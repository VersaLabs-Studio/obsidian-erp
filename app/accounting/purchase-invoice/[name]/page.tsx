"use client";

// app/accounting/purchase-invoice/[name]/page.tsx
// Obsidian ERP v4.0 — Purchase Invoice Detail (V4 Golden Template)
// Action-oriented detail: FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// Upstream: Purchase Order / Purchase Receipt. Downstream: Payment Entry.
// OKLCH semantic tokens only. StatusBadge for status display.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Edit3,
  Send,
  Ban,
  Trash2,
  Loader2,
  Package,
  Truck,
} from "lucide-react";

import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { FlowRail } from "@/components/flows/FlowRail";
import { isModuleBuilt } from "@/lib/flows/module-availability";
import { PrintShare } from "@/components/ui/print-share";
import { PrintMenu } from "@/components/print/PrintMenu";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { CrossFlowActionsMenu } from "@/components/cross-flow/CrossFlowActionsMenu";
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { usePaymentDefaults } from "@/lib/accounting/payment-defaults";
import type { PurchaseInvoice } from "@/types/doctype-types";

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
  // 4.1 A1 — one-click "Mark as Paid" (vendor bill → Payment Entry, Pay).
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 5.2-A — D1 wiring: pre-fill the mode from the configured default
  // (Accounting Settings → Payment Defaults); Cash only as the last resort.
  const { data: paymentDefaults } = usePaymentDefaults();
  const [payMode, setPayMode] = useState("");
  const [paying, setPaying] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();
  // 4.1-C2 — cache invalidation for the Mark-Paid action (2Z-R7 standard).
  const queryClient = useQueryClient();

  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useFrappeDoc<PurchaseInvoice>("Purchase Invoice", name);

  // -- Upstream resolution: Purchase Orders linked to this PI ----------------
  // 2O Part 6.2 — removed the dead `useFrappeList("Purchase Order", ...)`
  // with `enabled: false` and the unused `purchaseOrders` / `loadingPO`
  // destructures. The flow-chain resolution via `useFlowChain` handles
  // PI → PO via the link map (`Purchase Order` ↔ `Purchase Invoice`
  // child table on `Purchase Invoice Item.purchase_order`).
  // (PI → Payment Entry is the only remaining direct downstream query
  // — it's the live one, and `useFlowChain` reads the same canonical
  // back-link pattern as the rail.)
  // 2N Part 1.1: unified flow resolution. The Payment stage is resolved here
  // via the flow-link-map — the old per-page `useFrappeList("Payment Entry",
  // { filters: [["reference_name", …]] })` filtered the PARENT by a CHILD
  // field → 417 "Field not permitted in query: reference_name", and was unused.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Purchase Invoice", name);

  // 5.2-A — hydrate the Mark-as-Paid mode from the configured default once.
  useEffect(() => {
    if (paymentDefaults?.defaultModeOfPayment) {
      setPayMode((prev) => prev || paymentDefaults.defaultModeOfPayment);
    }
  }, [paymentDefaults]);

  // -- Status actions --------------------------------------------------------
  const updateMutation = useFrappeUpdate<PurchaseInvoice>(
    "Purchase Invoice",
    { showToast: false },
  );

  const isDraft = invoice?.docstatus === 0;
  const isSubmitted = invoice?.docstatus === 1;
  const isUnpaid = isSubmitted && (invoice?.outstanding_amount ?? 0) > 0;

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

  // 4.1-C3 — cascade cancel: submitted Payment Entries referencing this
  // invoice are cancelled first, then the invoice (ERPNext blocked the bare
  // cancel with "Cancel the linked document first").
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setConfirmCancel(false);
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/accounting/purchase-invoice/${encodeURIComponent(name)}/cancel`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(
          data?.details || data?.error || "Failed to cancel Purchase Invoice",
        );
      }
      toast.success(`Purchase Invoice ${name} cancelled`, {
        description: data?.message,
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["Payment Entry"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Purchase Invoice" }));
    } finally {
      setCancelling(false);
    }
  };

  // 4.1 A1 — one-click pay: build+submit a Payment Entry (Pay) via ERPNext's
  // get_payment_entry mapper. The PE wizard stays as the partial/bank path.
  const handleMarkAsPaid = async () => {
    setConfirmPaid(false);
    setPaying(true);
    try {
      const res = await fetch("/api/accounting/payment/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice: name,
          doctype: "Purchase Invoice",
          mode_of_payment: payMode,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success(`Payment recorded (${payMode || "Cash"})`, {
          description: data?.data?.name,
        });
        await refetch();
        // 4.1-C2 — 2Z-R7 standard: the PI flips to Paid and the FlowRail's
        // payment stage completes — drop those caches now.
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
        queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Payment Entry"], refetchType: "all" });
      } else {
        toast.error(data?.details || data?.error || "Payment failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/accounting/purchase-invoice/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Purchase Invoice deleted");
        router.push("/accounting/purchase-invoice");
      } else {
        const body = await res.json().catch(() => ({}));
        showError(resolveFrappeError(body, { doctype: "Purchase Invoice" }));
      }
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Purchase Invoice" }));
    }
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
      onClick: handleSubmit,
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isUnpaid && {
      label: "Mark as Paid",
      description: "Record full payment in one click (defaults to Cash)",
      onClick: handleMarkAsPaid,
      isPrimary: true,
      isLoading: paying,
      disabled: !isModuleBuilt("Payment Entry"),
      disabledReason: "Payment Entry module not yet built",
    },
    isUnpaid && {
      label: "Payment Entry (advanced)",
      description: "Partial payment, a bank account, or a different mode",
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
                  onClick={handleSubmit}
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
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-1.5 h-4 w-4" />
                  )}
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </>
            )}
            <PrintMenu doctype="Purchase Invoice" doc={invoice as unknown as Record<string, unknown>} />
            <PrintShare doctype="Purchase Invoice" name={name} showPrint={false} />
          </div>
        }
      />

      {/* Flow Tracker */}
      <InfoCard title="Procure-to-Pay Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Purchase Invoice" isLoading={chainLoading} />
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
              {/* 2Y-R2 P1 — FS No (pana_fs_number custom field) surfaced on detail. */}
              <DataPoint
                label="FS No"
                value={(invoice as { pana_fs_number?: string }).pana_fs_number ?? "—"}
              />
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
        description="Cancelling also cancels linked Payment Entries automatically (cascade) and reverses the accounting entries. This cannot be undone."
        confirmText="Cancel Invoice"
        variant="destructive"
        onConfirm={handleCancel}
        loading={cancelling}
      />
      <ConfirmDialog
        open={confirmPaid}
        onOpenChange={setConfirmPaid}
        title="Mark this bill as paid?"
        description={`Records a full payment of ${ETB.format(invoice.outstanding_amount ?? 0)} against ${name} and submits the Payment Entry.`}
        confirmText="Record Payment"
        loading={paying}
        onConfirm={handleMarkAsPaid}
      >
        <div className="mt-2">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Mode of Payment
          </label>
          <FrappeSelect
            doctype="Mode of Payment"
            value={payMode}
            onChange={(val) => setPayMode(val || "")}
            placeholder={paymentDefaults?.defaultModeOfPayment || "Cash"}
          />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Purchase Invoice?"
        description={`Are you sure you want to delete "${invoice.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
