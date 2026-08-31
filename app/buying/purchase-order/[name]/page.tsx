"use client";

// app/buying/purchase-order/[name]/page.tsx
// Obsidian ERP v4.0 — Purchase Order Detail (V4 Golden Template)
// Action-oriented: FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// OKLCH tokens only. No @ts-nocheck, no any.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Send,
  Ban,
  Trash2,
  Loader2,
  Package,
  CheckCircle2,
  PackageCheck,
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
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import type { PurchaseOrder } from "@/types/doctype-types";

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

  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 2P Part 2.6 — ReceiveMaterialsModal trigger
  const [openReceive, setOpenReceive] = useState(false);
  // E1 F1 — Receive & Bill direct-action; kept as loading state.
  const [receivingBill, setReceivingBill] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useFrappeDoc<PurchaseOrder>("Purchase Order", name);

  // 2N Part 1.1: unified flow resolution.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Purchase Order", name);

  // -- Status actions ---------------------------------------------------------
  const updateMutation = useFrappeUpdate<PurchaseOrder>("Purchase Order", {
    showToast: false,
  });

  const isDraft = order?.docstatus === 0;
  const isPendingApproval = order?.status === "Pending Approval";
  const isApproved = order?.status === "Approved";
  const isSubmitted = order?.docstatus === 1;

  const handleSubmit = () => {
    updateMutation.mutate(
      { name, data: { docstatus: 1, status: "To Receive and Bill" } },
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

  const handleApprove = () => {
    updateMutation.mutate(
      { name, data: { status: "Approved" } },
      {
        onSuccess: () => {
          toast.success(`Purchase Order ${name} approved`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Purchase Order" })),
      },
    );
  };

  const handleReject = () => {
    setConfirmReject(false);
    updateMutation.mutate(
      { name, data: { status: "Rejected" } },
      {
        onSuccess: () => {
          toast.success(`Purchase Order ${name} rejected`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Purchase Order" })),
      },
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2, status: "Cancelled" } },
      {
        onSuccess: () => {
          toast.success(`Purchase Order ${name} cancelled`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Purchase Order" })),
      },
    );
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
      } else if (data?.data?.purchase_receipt) {
        // Partial success — the receipt is real; billing failed.
        toast.warning("Received — billing failed", {
          description: data?.details || "Bill the receipt from its detail page.",
        });
        refetch();
      } else {
        toast.error(data?.details || data?.error || "Receive & Bill failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Receive & Bill failed");
    } finally {
      setReceivingBill(false);
    }
  };

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
      onClick: handleSubmit,
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isPendingApproval && {
      label: "Approve Order",
      description: "Approve this purchase order",
      onClick: handleApprove,
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isPendingApproval && {
      label: "Reject Order",
      description: "Reject this purchase order",
      onClick: () => setConfirmReject(true),
      isLoading: updateMutation.isPending,
    },
    // 4.1 A2 — the one-click happy path: receive AND bill in a single act.
    isSubmitted && {
      label: "Receive & Bill",
      description: "Book the goods in and raise the vendor bill in one click",
      onClick: handleReceiveAndBill,
      isPrimary: true,
      isLoading: receivingBill,
      disabled:
        !isModuleBuilt("Purchase Receipt") || !isModuleBuilt("Purchase Invoice"),
      disabledReason: "Receipt or Invoice module not available",
    },
    isSubmitted && {
      label: "Receive only (advanced)",
      description: "Record a goods receipt without billing (partial receipts)",
      // 2P Part 2.6 — ReceiveMaterialsModal: create+submit the PR only.
      onClick: () => setOpenReceive(true),
      disabled: !isModuleBuilt("Purchase Receipt"),
      disabledReason: "Module not available",
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
    ...(isApproved
      ? [
          {
            id: "approved",
            type: "status_change" as const,
            description: "Order approved",
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
            )}
            {isPendingApproval && (
              <>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmReject(true)}
                >
                  <Ban className="mr-1.5 h-4 w-4" /> Reject
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

          <InfoCard title="Journey">
            <FlowRail result={chain} currentDocName={name} sourceDoctype="Purchase Order" isLoading={chainLoading} />
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Purchase Order" name={name} />

          <WhatsNext actions={whatsNext} />

          <ActivityTimeline items={activityItems} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title="Reject this Purchase Order?"
        description="Rejecting will halt this order. It can be re-submitted later."
        confirmText="Reject"
        variant="destructive"
        onConfirm={handleReject}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Purchase Order?"
        description="Cancelling reverses the order. Linked documents must be cancelled first."
        confirmText="Cancel Order"
        variant="destructive"
        onConfirm={handleCancel}
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
