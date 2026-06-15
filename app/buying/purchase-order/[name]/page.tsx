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
  Printer,
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

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  // 2P Part 2.6 — ReceiveMaterialsModal trigger
  const [openReceive, setOpenReceive] = useState(false);
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
    setConfirmSubmit(false);
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
    setConfirmApprove(false);
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
      label: "Submit for Approval",
      description: "Send this order for approval",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isPendingApproval && {
      label: "Approve Order",
      description: "Approve this purchase order",
      onClick: () => setConfirmApprove(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isPendingApproval && {
      label: "Reject Order",
      description: "Reject this purchase order",
      onClick: () => setConfirmReject(true),
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Receive items",
      description: "Record goods receipt from supplier",
      // 2P Part 2.6 — open the ReceiveMaterialsModal (one-click) instead
      // of deep-linking to the PR wizard. The modal does the create+submit
      // and routes to the new PR detail on success.
      onClick: () => setOpenReceive(true),
      isPrimary: true,
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
            {isPendingApproval && (
              <>
                <Button
                  size="sm"
                  onClick={() => setConfirmApprove(true)}
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
                onClick={() => {
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
                }}
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
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this Purchase Order?"
        description="Submitting will send this order for approval. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title="Approve this Purchase Order?"
        description="Approving this order will allow it to proceed to receipt and billing."
        confirmText="Approve"
        onConfirm={handleApprove}
      />
      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title="Reject this Purchase Order?"
        description="Rejecting will halt this order. It can be re-submitted later."
        confirmText="Reject"
        variant="destructive"
        onConfirm={handleReject}
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
