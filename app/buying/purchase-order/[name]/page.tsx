"use client";

// app/buying/purchase-order/[name]/page.tsx
// Obsidian ERP v4.0 — Purchase Order Detail (V4 Golden Template)
// Action-oriented: FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// OKLCH tokens only. No @ts-nocheck, no any.

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Send,
  Ban,
  Trash2,
  Loader2,
  Package,
  PackageCheck,
  Truck,
  Wallet,
  Receipt,
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
import { PrintShare } from "@/components/ui/print-share";
import { PrintMenu } from "@/components/print/PrintMenu";
import { ReceiveMaterialsModal } from "@/components/stock/ReceiveMaterialsModal";
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { useFrappeDoc, useFrappeUpdate, useFrappeList } from "@/hooks/generic";
import type { PurchaseOrder, PurchaseInvoice, PurchaseReceipt, PaymentEntry } from "@/types/doctype-types";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

interface POItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
  received_qty?: number;
  warehouse?: string;
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 2P Part 2.6 — ReceiveMaterialsModal trigger
  const [openReceive, setOpenReceive] = useState(false);
  // E1 F1 — Receive & Bill direct-action; kept as loading state.
  const [receivingBill, setReceivingBill] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();
  // 4.1-C2 — cache invalidation for the Receive & Bill chain (2Z-R7 standard).
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useFrappeDoc<PurchaseOrder>("Purchase Order", name);

  // 2N Part 1.1: unified flow resolution.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Purchase Order", name);

  //   // -- Status actions ---------------------------------------------------------
  const updateMutation = useFrappeUpdate<PurchaseOrder>("Purchase Order", {
    showToast: false,
  });

  const isDraft = order?.docstatus === 0;
  // 4.1-C2 — "Pending Approval"/"Approved"/"Rejected" do NOT exist in this
  // site's Purchase Order status meta (verified via frappe.client.get on the
  // DocType: Draft/On Hold/To Receive and Bill/To Bill/To Receive/Completed/
  // Cancelled/Closed/Delivered) and no Workflow is configured. The previous
  // approval-state machinery was therefore DEAD UI — unreachable code that
  // would have PUT invalid statuses. Removed per disciplined-engineering.
  const isSubmitted = order?.docstatus === 1;

  const handleSubmit = () => {
    updateMutation.mutate(
      // 4.1-C2 — write ONLY docstatus; ERPNext derives "To Receive and Bill"
      // on submit (verified live: bare docstatus-1 PUT on a scratch PO landed
      // on exactly that status). Hand-writing a derived status invites
      // UpdateAfterSubmitError-class mismatches (2Y-R5 lesson).
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => {
          toast.success(`Purchase Order ${name} submitted`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Purchase Order" })),
      },
    );
  };

  // 4.1-C2 — the former Approve/Reject handlers were removed: they targeted
  // statuses that don't exist in this site's Purchase Order meta (see above).
  // ERPNext's approval gate for a PO IS the submit action.

  // 4.1-C3 — cascade cancel: submitted Purchase Invoices / Purchase Receipts
  // linked to this PO are cancelled first (depth-first), then the PO. The
  // bare {docstatus: 2} PUT was rejected while linked docs were submitted
  // ("Cancel the linked document first").
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setConfirmCancel(false);
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/buying/purchase-order/${encodeURIComponent(name)}/cancel`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(
          data?.details || data?.error || "Failed to cancel Purchase Order",
        );
      }
      toast.success(`Purchase Order ${name} cancelled`, {
        description: data?.message,
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["Purchase Order"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["Purchase Receipt"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["Payment Entry"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Purchase Order" }));
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/buying/purchase-order/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Purchase Order deleted");
        router.push("/buying/purchase-order");
      } else {
        const body = await res.json().catch(() => ({}));
        showError(resolveFrappeError(body, { doctype: "Purchase Order" }));
      }
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Purchase Order" }));
    }
  };

  // 4.1 A2 — one-click receive + bill: chain PR (submit) → PI (submit) via
  // ERPNext's own mappers. Direct fire on button click (E1/F1 happy-path).
  const handleReceiveAndBill = async () => {
    setReceivingBill(true);
    try {
      const res = await fetch(
        `/api/buying/purchase-order/${encodeURIComponent(name)}/receive-and-bill`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success("Received and billed", {
          description: `${data?.data?.purchase_receipt} · ${data?.data?.purchase_invoice}`,
        });
        refetch();
        void refetchReceipts();
        // 4.1-C2 — 2Z-R7 standard: repaint everything downstream of the
        // chain — the FlowRail (5-min resolve cache), the PO header status
        // ("To Receive and Bill" → "Completed"), and mounted PR/PI docs.
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
        queryClient.invalidateQueries({ queryKey: ["Purchase Order"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Purchase Receipt"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
      } else if (data?.data?.purchase_receipt) {
        // Partial success — the receipt is real; billing failed.
        toast.warning("Received — billing failed", {
          description: data?.details || "Bill the receipt from its detail page.",
        });
        refetch();
        void refetchReceipts();
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
        queryClient.invalidateQueries({ queryKey: ["Purchase Receipt"], refetchType: "all" });
      } else {
        toast.error(data?.details || data?.error || "Receive & Bill failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Receive & Bill failed");
    } finally {
      setReceivingBill(false);
    }
  };

  // 4.1-C3 — Submit confirmation with a loading modal (2Z-R7 parity with the
  // SO cockpit): both the header button and WhatsNext route through it.
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // 4.1-C3 — Quick "Mark Paid" for the vendor bill raised from this PO.
  // Mirrors the SO cockpit's inline Mark Paid (2Z-R7) on the buying side.
  const { data: linkedInvoices } = useFrappeList<PurchaseInvoice>(
    "Purchase Invoice",
    {
      filters: [["Purchase Invoice Item", "purchase_order", "=", name]],
      fields: ["name", "status", "docstatus", "grand_total", "outstanding_amount", "currency"],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 20,
    },
    { enabled: isSubmitted },
  );
  const outstandingLinkedInvoices = useMemo(
    () =>
      (linkedInvoices ?? []).filter(
        (inv) =>
          inv.docstatus === 1 && Number(inv.outstanding_amount ?? 0) > 0.005,
      ),
    [linkedInvoices],
  );
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  // 4.1-C4 — linked Purchase Receipts (for the Deliveries-style panel +
  // done-state on Receive & Bill).
  const { data: linkedReceipts, refetch: refetchReceipts } =
    useFrappeList<PurchaseReceipt>(
      "Purchase Receipt",
      {
        filters: [["Purchase Receipt Item", "purchase_order", "=", name]],
        fields: ["name", "status", "docstatus", "posting_date", "grand_total", "currency"],
        orderBy: { field: "posting_date", order: "desc" },
        limit: 20,
      },
      { enabled: isSubmitted },
    );

  // 4.1-C4 — linked Payment Entries (PE references the PI, not the PO —
  // resolve PI names first, same indirection as the SO cockpit).
  const linkedPINames = useMemo(
    () => (linkedInvoices ?? []).map((inv) => inv.name),
    [linkedInvoices],
  );
  const { data: linkedPayments } = useFrappeList<PaymentEntry>(
    "Payment Entry",
    {
      filters: [
        ["Payment Entry Reference", "reference_doctype", "=", "Purchase Invoice"],
        ["Payment Entry Reference", "reference_name", "in", linkedPINames.length ? linkedPINames : ["__none__"]],
      ],
      fields: ["name", "status", "docstatus", "posting_date", "payment_type", "mode_of_payment", "paid_amount"],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 20,
    },
    { enabled: linkedPINames.length > 0 },
  );

  // 4.1-C4 — done-states (SO-cockpit "✓ Already …" parity).
  const hasSubmittedReceipt = (linkedReceipts ?? []).some((r) => r.docstatus === 1);
  const hasSubmittedInvoice = (linkedInvoices ?? []).some((inv) => inv.docstatus === 1);
  const receivedAndBilled = hasSubmittedReceipt && hasSubmittedInvoice;
  const fullyBilled = hasSubmittedReceipt && outstandingLinkedInvoices.length === 0;

  const handleMarkPaid = useCallback(
    async (invoiceName?: string) => {
      const target = invoiceName ?? outstandingLinkedInvoices[0]?.name;
      if (!target) {
        toast.info("No outstanding vendor bills for this order.");
        return;
      }
      setPayingInvoice(target);
      try {
        const res = await fetch("/api/accounting/payment/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice: target, doctype: "Purchase Invoice" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.details || data?.error || "Failed to record payment",
          );
        }
        toast.success(`Payment recorded against ${target}`, {
          description: data?.message,
        });
        queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Payment Entry"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Purchase Order"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
      } catch (err) {
        showError(resolveFrappeError(err, { doctype: "Purchase Invoice" }));
      } finally {
        setPayingInvoice(null);
      }
    },
    [outstandingLinkedInvoices, queryClient, showError],
  );

  if (isLoading) return <LoadingState />;
  if (error || !order) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Purchase Order not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/buying/purchase-order")}
        >
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  const items = (order.items ?? []) as unknown as POItem[];
  const grandTotal = order.grand_total ?? order.total ?? 0;

  const whatsNext = [
    isDraft && {
      label: "Submit Order",
      description: "Submit — ready to receive & bill",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    // 4.1-C2 — the "Pending Approval" Approve/Reject entries are gone with
    // the dead statuses; submitting IS the approval gate for a PO.
    // 4.1 A2 — the one-click happy path: receive AND bill in a single act.
    // 4.1-C4 — disabled with a ✓ done-state once the order has been both
    // received and billed (user feedback: "disabled if already acted on").
    isSubmitted && {
      label: receivedAndBilled ? "Receive & Bill more" : "Receive & Bill",
      description: receivedAndBilled
        ? "✓ Order received & billed — use for an additional receipt"
        : "Book the goods in and raise the vendor bill in one click",
      onClick: handleReceiveAndBill,
      isPrimary: !receivedAndBilled,
      isLoading: receivingBill,
      disabled:
        receivedAndBilled ||
        !isModuleBuilt("Purchase Receipt") ||
        !isModuleBuilt("Purchase Invoice"),
      disabledReason: receivedAndBilled
        ? "Order fully received and billed"
        : "Receipt or Invoice module not available",
    },
    isSubmitted && {
      label: fullyBilled ? "Receipt (advanced)" : "Receive only (advanced)",
      description: fullyBilled
        ? "✓ Fully received — receipt-only for extra quantities only"
        : "Record a goods receipt without billing (partial receipts)",
      // 2P Part 2.6 — ReceiveMaterialsModal: create+submit the PR only.
      onClick: () => setOpenReceive(true),
      disabled: fullyBilled || !isModuleBuilt("Purchase Receipt"),
      disabledReason: fullyBilled
        ? "Receipt already fully billed"
        : "Module not available",
    },
    // 4.1-C3 — settle the vendor bill inline (SO-cockpit Mark-Paid parity).
    // 4.1-C4 — hidden entirely once fully paid (nothing outstanding).
    isSubmitted &&
      outstandingLinkedInvoices.length > 0 && {
        label: "Mark Paid",
        description: `Pay ${outstandingLinkedInvoices[0].name} (${Number(
          outstandingLinkedInvoices[0].outstanding_amount ?? 0,
        ).toFixed(2)}) in one click`,
        onClick: () => void handleMarkPaid(),
        isLoading: payingInvoice !== null,
      },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  const activityItems = [
    {
      id: "created",
      type: "created" as const,
      description: "Purchase Order created",
      user: order.owner,
      timestamp: order.creation ?? new Date().toISOString(),
    },
    ...(isSubmitted
      ? [
          {
            id: "submitted",
            type: "submitted" as const,
            description: "Order submitted",
            user: order.modified_by,
            timestamp: order.modified ?? new Date().toISOString(),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={order.name}
        subtitle={order.supplier_name || order.supplier}
        backHref="/buying/purchase-order"
        actions={
          <div className="flex items-center gap-2">
            <PrintMenu doctype="Purchase Order" doc={order as unknown as Record<string, unknown>} />
            <PrintShare doctype="Purchase Order" name={order.name} showPrint={false} />
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
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="mr-1.5 h-4 w-4" />
                )}
                Cancel
              </Button>
            )}
            {isDraft && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        }
      />

      {/* Flow Tracker */}
      <InfoCard title="Procurement Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Purchase Order" isLoading={chainLoading} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Order Details">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={order.status} />
              <span className="text-2xl font-bold tabular-nums text-primary">
                {ETB.format(grandTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint
                label="Supplier"
                value={order.supplier_name || order.supplier}
              />
              <DataPoint label="Order Date" value={order.transaction_date} />
              <DataPoint label="Schedule Date" value={order.schedule_date} />
              <DataPoint label="Company" value={order.company} />
              <DataPoint label="Currency" value={order.currency} />
              <DataPoint
                label="Receipt Warehouse"
                value={order.set_warehouse || "—"}
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
        <div className="space-y-6 lg:col-span-4">
          <InfoCard
            title="Status"
            className="bg-gradient-to-br from-primary/5 to-primary/10"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Document Status
                </span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  % Received
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {Math.round(order.per_received ?? 0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  % Billed
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {Math.round(order.per_billed ?? 0)}%
                </span>
              </div>
            </div>
          </InfoCard>

          {/* 4.1-C4 — Receipts panel (SO-cockpit "Deliveries" parity): linked
              Purchase Receipts with status, so the operator sees fulfilment
              progress without leaving the PO. */}
          {isSubmitted && (
            <InfoCard title="Receipts" icon={<Truck className="h-4 w-4" />}>
              {linkedReceipts && linkedReceipts.length > 0 ? (
                <div className="space-y-1.5">
                  {linkedReceipts.map((rcpt) => (
                    <div
                      key={rcpt.name}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/stock/purchase-receipt/${encodeURIComponent(rcpt.name)}`}
                          className="block truncate text-sm font-medium text-primary hover:underline"
                        >
                          {rcpt.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {rcpt.posting_date}
                          {rcpt.grand_total
                            ? ` · ${ETB.format(rcpt.grand_total)}`
                            : ""}
                        </p>
                      </div>
                      <StatusBadge status={rcpt.status ?? ""} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/50 px-3 py-3 text-center text-xs text-muted-foreground">
                  Nothing received yet — use Receive &amp; Bill above.
                </p>
              )}
            </InfoCard>
          )}

          {/* 4.1-C4 — Billing & Payments panel (SO-cockpit parity): the
              vendor bills + payments against them, with inline Mark Paid. */}
          {isSubmitted && (
            <InfoCard
              title="Billing & Payments"
              icon={<Receipt className="h-4 w-4" />}
            >
              <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Vendor Bills
              </p>
              {linkedInvoices && linkedInvoices.length > 0 ? (
                <div className="space-y-1.5">
                  {linkedInvoices.map((inv) => {
                    const invOutstanding = Number(inv.outstanding_amount ?? 0);
                    const canPay =
                      inv.docstatus === 1 && invOutstanding > 0.005;
                    return (
                      <div
                        key={inv.name}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/10 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/accounting/purchase-invoice/${encodeURIComponent(inv.name)}`}
                            className="block truncate text-sm font-medium text-primary hover:underline"
                          >
                            {inv.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {ETB.format(inv.grand_total ?? 0)}
                            {invOutstanding ? (
                              <span className="ml-1 text-amber-600 dark:text-amber-400">
                                · {ETB.format(invOutstanding)} outstanding
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {canPay && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => void handleMarkPaid(inv.name)}
                              disabled={payingInvoice !== null}
                            >
                              {payingInvoice === inv.name ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Wallet className="mr-1 h-3 w-3" />
                              )}
                              Mark Paid
                            </Button>
                          )}
                          <StatusBadge status={inv.status ?? ""} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    No vendor bills yet.
                  </p>
                  {/* 4.1-C5 — CTA: fire the same Receive & Bill mutation from
                      the empty state, per product feedback. */}
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleReceiveAndBill}
                    disabled={receivingBill}
                  >
                    {receivingBill ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PackageCheck className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Receive &amp; Bill
                  </Button>
                </div>
              )}
              <p className="mb-3 mt-5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Payments
              </p>
              {linkedPayments && linkedPayments.length > 0 ? (
                <div className="space-y-1.5">
                  {linkedPayments.map((pe) => (
                    <div
                      key={pe.name}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/accounting/payment-entry/${encodeURIComponent(pe.name)}`}
                          className="block truncate text-sm font-medium text-primary hover:underline"
                        >
                          {pe.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {ETB.format(pe.paid_amount ?? 0)}
                          {pe.mode_of_payment ? ` · ${pe.mode_of_payment}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={pe.status ?? ""} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/50 px-3 py-3 text-center text-xs text-muted-foreground">
                  No payments recorded against this order&apos;s bills yet.
                </p>
              )}
            </InfoCard>
          )}

          <InfoCard title="Journey">
            <FlowRail result={chain} currentDocName={name} sourceDoctype="Purchase Order" isLoading={chainLoading} />
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Purchase Order" name={name} />

          <WhatsNext actions={whatsNext} />

          <ActivityTimeline items={activityItems} />
        </div>
      </div>

      {/* 4.1-C3 — Submit confirmation with loading modal (SO-cockpit parity). */}
      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this Purchase Order?"
        description={`Submits ${name} and locks it for receiving and billing. ERPNext derives the status automatically.`}
        confirmText="Submit Order"
        onConfirm={handleSubmit}
        loading={updateMutation.isPending || cancelling}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Purchase Order?"
        description="Cancelling also cancels linked Purchase Invoices and Purchase Receipts automatically (cascade). This cannot be undone without recreating the documents."
        confirmText="Cancel Order"
        variant="destructive"
        onConfirm={handleCancel}
        loading={cancelling}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Purchase Order?"
        description={`Are you sure you want to delete "${order.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={updateMutation.isPending}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
      <ReceiveMaterialsModal
        open={openReceive}
        onOpenChange={setOpenReceive}
        source={{ kind: "po", poName: name }}
      />
    </div>
  );
}
