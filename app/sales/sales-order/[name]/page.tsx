"use client";

// app/sales/sales-order/[name]/page.tsx
// Obsidian ERP v4.0 — Sales Order Detail (V4 Golden Template)
// Action-oriented detail per Architecture V4 Part 2 §3.2 + §6 (Flow Tracker).
// Real flow-chain resolution (no stub): upstream Quotation via prevdoc_docname,
// downstream Work Orders via the sales_order header link. OKLCH tokens only.

import { useCallback, useMemo, useState } from "react";
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
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { getAutoFillMapping, applyAutoFill } from "@/lib/flows/flow-auto-fill";
import { getActiveCompany } from "@/lib/settings/company";
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeCreate } from "@/hooks/generic";
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
  const [confirmCreateWO, setConfirmCreateWO] = useState(false);
  const [woToCreate, setWoToCreate] = useState<Array<{ item_code: string; item_name?: string; qty: number; warehouse?: string }>>([]);
  const { resolution, showError, dismiss } = useGuidedError();

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

  // -- BOM lookup for WO creation (default BOM per production item) ----------
  const soItemCodes = useMemo(() => {
    const items = (order?.items ?? []) as Array<{ item_code: string }>;
    return [...new Set(items.map((i) => i.item_code))];
  }, [order]);

  const { data: defaultBOMs } = useFrappeList<{ item: string; name: string }>(
    "BOM",
    {
      filters: [
        ["item", "in", soItemCodes.length > 0 ? soItemCodes : ["__none__"]],
        ["is_default", "=", 1],
      ],
      fields: ["item", "name"],
      limit: soItemCodes.length || 1,
    },
    { enabled: soItemCodes.length > 0 },
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
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Sales Order" })),
      },
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2, status: "Cancelled" } },
      {
        onSuccess: () => toast.success(`Sales Order ${name} cancelled`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Sales Order" })),
      },
    );
  };

  // -- Work Order multi-create (B3 idempotency) --------------------------------
  const createWOMutation = useFrappeCreate("Work Order", {
    showToast: false,
    onSuccess: () => {
      toast.success(`${woToCreate.length} Work Order(s) created`);
      setConfirmCreateWO(false);
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Work Order" })),
  });

  const handleCreateWorkOrders = useCallback(() => {
    if (workOrders && workOrders.length > 0) {
      toast.info("Work Orders already created", {
        description: `${workOrders.length} Work Order(s) linked to this Sales Order.`,
      });
      return;
    }

    const soItems = (order?.items ?? []) as Array<{ item_code: string; item_name?: string; qty: number; warehouse?: string }>;
    if (soItems.length === 0) {
      toast.error("No items on this Sales Order to create Work Orders for.");
      return;
    }

    const woItems = soItems.map((item) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      qty: item.qty,
      warehouse: item.warehouse,
    }));

    setWoToCreate(woItems);
    setConfirmCreateWO(true);
  }, [order, workOrders]);

  const executeCreateWorkOrders = useCallback(() => {
    const mapping = getAutoFillMapping("Sales Order", "Work Order");
    if (!mapping) return;

    const soData = order as unknown as Record<string, unknown>;
    const bomMap = new Map((defaultBOMs ?? []).map((b) => [b.item, b.name]));

    for (const item of woToCreate) {
      const bomNo = bomMap.get(item.item_code);
      if (!bomNo) {
        showError({
          code: "LINK_VALIDATION",
          title: "No default BOM found",
          explanation: `Item ${item.item_code} has no default Bill of Materials. Create a default BOM for this item before creating Work Orders.`,
          details: [`Item: ${item.item_code}`],
          severity: "error",
          actions: [
            {
              label: "Dismiss",
              kind: "dismiss",
              variant: "ghost",
              run: () => {},
            },
          ],
        });
        continue;
      }

      const header = applyAutoFill(soData, mapping);

      // Resolve fg_warehouse: prefer item warehouse, else SO-level set_warehouse
      const fgWarehouse = item.warehouse || (soData.set_warehouse as string) || "";
      if (!fgWarehouse) {
        showError({
          code: "MANDATORY_MISSING",
          title: "No warehouse set",
          explanation: `Item ${item.item_code} has no finished-goods warehouse. Set a warehouse on the Sales Order line or the order header before creating Work Orders.`,
          details: [`Item: ${item.item_code}`],
          severity: "warning",
          actions: [
            {
              label: "Dismiss",
              kind: "dismiss",
              variant: "ghost",
              run: () => {},
            },
          ],
        });
        continue;
      }

      const woPayload = {
        ...header,
        production_item: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        fg_warehouse: fgWarehouse,
        sales_order: name,
        bom_no: bomNo,
        company: getActiveCompany(),
        naming_series: "MFG-WO-.YYYY.-",
        planned_start_date: (order?.delivery_date as string) || new Date().toISOString().split("T")[0],
        skip_transfer: 1,
      };

      createWOMutation.mutate(woPayload);
    }
  }, [order, name, woToCreate, defaultBOMs, createWOMutation, showError]);

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
      label: workOrders && workOrders.length > 0 ? "View Work Orders" : "Create Work Order(s)",
      description: workOrders && workOrders.length > 0
        ? `${workOrders.length} Work Order(s) linked`
        : "Generate production orders for each line item",
      onClick: () => {
        if (workOrders && workOrders.length > 0) {
          router.push(`/manufacturing/work-order/${encodeURIComponent(workOrders[0].name)}`);
        } else {
          handleCreateWorkOrders();
        }
      },
      isPrimary: !(workOrders && workOrders.length > 0),
      isLoading: createWOMutation.isPending,
    },
    isSubmitted && {
      label: "Create Delivery Note",
      description: "Create fulfillment from this order",
      onClick: () => router.push(`/stock/delivery-note/new?sales_order=${encodeURIComponent(name)}`),
      disabled: !isModuleBuilt("Delivery Note"),
      disabledReason: "Delivery Note module not available",
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
        <FlowRail result={chain} isLoading={loadingWO} />
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
      <ConfirmDialog
        open={confirmCreateWO}
        onOpenChange={setConfirmCreateWO}
        title="Create Work Orders"
        description={`${woToCreate.length} Work Order(s) will be created for Sales Order ${name}. Each line item becomes a separate Work Order.`}
        confirmText="Create Work Orders"
        onConfirm={executeCreateWorkOrders}
        loading={createWOMutation.isPending}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
