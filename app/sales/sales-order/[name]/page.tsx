"use client";

// app/sales/sales-order/[name]/page.tsx
// Obsidian ERP v4.0 — Sales Order Detail (V4 Golden Template)
// Action-oriented detail per Architecture V4 Part 2 §3.2 + §6 (Flow Tracker).
// Real flow-chain resolution (no stub): upstream Quotation via prevdoc_docname,
// downstream Work Orders via the sales_order header link. OKLCH tokens only.

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
import { FlowTracker } from "@/components/flows/FlowTracker";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { useFrappeDoc, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import type { SalesOrder } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

interface SOItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: order, isLoading, error } = useFrappeDoc<SalesOrder>(
    "Sales Order",
    name,
  );

  // -- Downstream resolution: Work Orders linked to this SO (header link) ----
  const { data: workOrders, isLoading: loadingWO } = useFrappeList<{ name: string }>(
    "Work Order",
    { filters: [["sales_order", "=", name]], fields: ["name"], limit: 5 },
    { enabled: !isLoading && !!order },
  );

  // -- Build the flow chain from real linked documents -----------------------
  const chain = useMemo(() => {
    const items = ((order?.items ?? []) as Array<{ prevdoc_docname?: string }>);
    const quotationName = items.find((i) => i?.prevdoc_docname)?.prevdoc_docname;
    const woName = workOrders?.[0]?.name;

    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    if (quotationName) {
      stageStatuses["Quotation"] = {
        status: "completed",
        documentName: quotationName,
        documentUrl: `/sales/quotation/${encodeURIComponent(quotationName)}`,
      };
    }
    if (woName) {
      stageStatuses["Work Order"] = {
        status: "completed",
        documentName: woName,
        documentUrl: `/manufacturing/work-order/${encodeURIComponent(woName)}`,
      };
    }

    return resolveFlowChain("Sales Order", name, stageStatuses);
  }, [order, workOrders, name]);

  // -- Status actions (real mutations, driven by the status machine) ---------
  const updateMutation = useFrappeUpdate<SalesOrder>("Sales Order", {
    showToast: false,
  });

  const isDraft = order?.docstatus === 0;
  const isSubmitted = order?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    // Target status per the Sales Order status machine (Workflow P3 §2.1).
    updateMutation.mutate(
      { name, data: { docstatus: 1, status: "To Deliver and Bill" } },
      {
        onSuccess: () => toast.success(`Sales Order ${name} submitted`),
        onError: (e) =>
          toast.error("Submit failed", { description: e.message }),
      },
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2, status: "Cancelled" } },
      {
        onSuccess: () => toast.success(`Sales Order ${name} cancelled`),
        onError: (e) =>
          toast.error("Cancel failed", { description: e.message }),
      },
    );
  };

  if (isLoading) return <LoadingState />;
  if (error || !order) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Sales Order not found."}
        </p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/sales/sales-order")}>
          Back to Sales Orders
        </Button>
      </div>
    );
  }

  const items = (order.items ?? []) as unknown as SOItem[];
  const grandTotal = order.grand_total ?? order.total ?? 0;

  // What's-Next actions — real where wired, disabled (with reason) otherwise.
  const whatsNext = [
    isDraft && {
      label: "Submit Order",
      description: "Lock the order and enable fulfillment",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Work Order(s)",
      description: "Phase 2 — production automation",
      onClick: () => {},
      disabled: true,
      disabledReason: "Coming in Phase 2",
    },
    isSubmitted && {
      label: "Create Delivery Note",
      description: "Phase 2 — fulfillment",
      onClick: () => {},
      disabled: true,
      disabledReason: "Coming in Phase 2",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={order.name}
        subtitle={order.customer_name || order.customer}
        backHref="/sales/sales-order"
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sales/sales-order/${encodeURIComponent(name)}/edit`}>
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

      {/* Flow Tracker — clickable upstream, resolved downstream */}
      <InfoCard title="Lead-to-Cash Flow" className="overflow-hidden">
        <FlowTracker result={chain} isLoading={loadingWO} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Order Summary">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={order.status} />
              <span className="text-2xl font-bold tabular-nums text-primary">
                {ETB.format(grandTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint label="Customer" value={order.customer_name || order.customer} />
              <DataPoint label="Order Date" value={order.transaction_date} />
              <DataPoint label="Delivery Date" value={order.delivery_date} />
              <DataPoint label="Company" value={order.company} />
              <DataPoint label="Currency" value={order.currency} />
              <DataPoint label="PO No" value={order.po_no || "—"} />
            </div>
          </InfoCard>

          <InfoCard title="Items" icon={<Package className="h-5 w-5 text-primary" />}>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WhatsNext actions={whatsNext} />
          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "Sales Order created",
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
            ]}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this Sales Order?"
        description="Submitting locks the order and enables downstream fulfillment. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Sales Order?"
        description="Cancelling reverses the order. Linked documents must be cancelled first."
        confirmText="Cancel Order"
        variant="destructive"
        onConfirm={handleCancel}
      />
    </div>
  );
}
