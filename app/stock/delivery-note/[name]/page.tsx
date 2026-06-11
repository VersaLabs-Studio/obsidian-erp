"use client";

// app/stock/delivery-note/[name]/page.tsx
// Obsidian ERP v4.0 — Delivery Note Detail (V4 Golden Template)
// Action-oriented detail with FlowRail, WhatsNext, ActivityTimeline.
// Real flow-chain resolution: upstream SO via items.against_sales_order,
// downstream Sales Invoice via useFrappeList. OKLCH tokens only.

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Edit3,
  Send,
  Trash2,
  Loader2,
  Truck,
  Package,
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
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeDelete } from "@/hooks/generic";
import type { DeliveryNote } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

interface DNItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
  warehouse?: string;
  against_sales_order?: string;
}

export default function DeliveryNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: dn, isLoading, error } = useFrappeDoc<DeliveryNote>(
    "Delivery Note",
    name,
  );

  // -- Upstream resolution: Sales Order from items.against_sales_order --------
  const soName = useMemo(() => {
    const items = ((dn?.items ?? []) as Array<{ against_sales_order?: string }>);
    return items.find((i) => i?.against_sales_order)?.against_sales_order;
  }, [dn]);

  // -- Downstream resolution: Sales Invoice filtered on this DN ---------------
  const { data: invoices, isLoading: loadingInvoices } = useFrappeList<{ name: string }>(
    "Sales Invoice",
    { filters: [["Sales Invoice Item", "delivery_note", "=", name]] as [string, string, string, unknown][], fields: ["name"], limit: 5 },
    { enabled: !isLoading && !!dn },
  );

  // -- Build the flow chain from real linked documents -----------------------
  const chain = useMemo(() => {
    const siName = invoices?.[0]?.name;

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
    if (siName) {
      stageStatuses["Sales Invoice"] = {
        status: "completed",
        documentName: siName,
        documentUrl: `/accounting/sales-invoice/${encodeURIComponent(siName)}`,
      };
    }

    return resolveFlowChain("Delivery Note", name, stageStatuses);
  }, [soName, invoices, name]);

  // -- Status actions (real mutations) ----------------------------------------
  const updateMutation = useFrappeUpdate<DeliveryNote>("Delivery Note", {
    showToast: false,
  });

  const deleteMutation = useFrappeDelete("Delivery Note", {
    onSuccess: () => {
      toast.success("Delivery Note deleted");
      router.push("/stock/delivery-note");
    },
  });

  const isDraft = dn?.docstatus === 0;
  const isSubmitted = dn?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => toast.success(`Delivery Note ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Delivery Note" })),
      },
    );
  };

  const handleDelete = () => {
    setShowDelete(false);
    deleteMutation.mutate(name);
  };

  if (isLoading) return <LoadingState />;
  if (error || !dn) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Delivery Note not found."}
        </p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/stock/delivery-note")}>
          Back to Delivery Notes
        </Button>
      </div>
    );
  }

  const items = (dn.items ?? []) as unknown as DNItem[];
  const grandTotal = dn.grand_total ?? dn.total ?? 0;

  // What's-Next actions
  const whatsNext = [
    isDraft && {
      label: "Submit Delivery Note",
      description: "Confirm delivery and deduct stock",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Sales Invoice",
      description: "Create invoice from this delivery",
      onClick: () => router.push(`/accounting/sales-invoice/new?delivery_note=${encodeURIComponent(name)}`),
      disabled: !isModuleBuilt("Sales Invoice"),
      disabledReason: "Module not available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={dn.name}
        subtitle={dn.customer_name || dn.customer}
        backHref="/stock/delivery-note"
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stock/delivery-note/${encodeURIComponent(name)}/edit`}>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {isSubmitted && (
              <Button
                variant="outline"
                size="sm"
                disabled={!isModuleBuilt("Sales Invoice")}
                title={!isModuleBuilt("Sales Invoice") ? "Module not available" : undefined}
                asChild={isModuleBuilt("Sales Invoice")}
              >
                {isModuleBuilt("Sales Invoice") ? (
                  <Link href={`/accounting/sales-invoice/new?delivery_note=${encodeURIComponent(name)}`}>
                    <Receipt className="mr-1.5 h-4 w-4" /> Create Invoice
                  </Link>
                ) : (
                  <>
                    <Receipt className="mr-1.5 h-4 w-4" /> Create Invoice
                  </>
                )}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Delivery Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DataPoint label="Customer" value={dn.customer_name || dn.customer} />
              <DataPoint label="Posting Date" value={dn.posting_date} />
              <DataPoint label="Company" value={dn.company} />
              <DataPoint label="PO No" value={dn.po_no || "—"} />
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
                    <th className="px-3 py-2.5 text-left font-semibold">Warehouse</th>
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
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {it.warehouse || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>

          <InfoCard title="Logistics" icon={<Truck className="h-5 w-5 text-primary" />}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DataPoint label="Driver" value={dn.driver_name || dn.driver || "—"} />
              <DataPoint label="Vehicle" value={dn.vehicle_no || "—"} />
              <DataPoint label="Transporter" value={dn.transporter_name || dn.transporter || "—"} />
              <DataPoint label="LR No" value={dn.lr_no || "—"} />
            </div>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <InfoCard title="Status" variant="gradient">
            <div className="space-y-3">
              <StatusBadge status={dn.status} size="lg" />
              {dn.per_billed !== undefined && (
                <DataPoint label="% Billed" value={`${dn.per_billed}%`} />
              )}
            </div>
          </InfoCard>

          <InfoCard title="Flow Tracker">
            <FlowRail result={chain} currentDocName={name} sourceDoctype="Delivery Note" isLoading={loadingInvoices} />
          </InfoCard>

          <InfoCard title="What's Next">
            <WhatsNext actions={whatsNext} />
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Delivery Note" name={name} />

          <InfoCard title="Activity">
            <ActivityTimeline
              items={[
                {
                  id: "created",
                  type: "created",
                  description: "Delivery Note created",
                  user: dn.owner,
                  timestamp: dn.creation ?? new Date().toISOString(),
                },
                ...(isSubmitted
                  ? [
                      {
                        id: "submitted",
                        type: "submitted" as const,
                        description: "Delivery Note submitted",
                        user: dn.modified_by,
                        timestamp: dn.modified ?? new Date().toISOString(),
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
        title="Submit this Delivery Note?"
        description="Submitting confirms delivery and deducts stock. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete this Delivery Note?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
