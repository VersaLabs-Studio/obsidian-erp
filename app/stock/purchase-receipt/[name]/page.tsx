"use client";

// app/stock/purchase-receipt/[name]/page.tsx
// Obsidian ERP v4.0 — Purchase Receipt Detail (V4 Golden Template)
// Inbound goods from suppliers. Mirrors Delivery Note detail pattern.
// Flow chain: upstream PO, downstream Purchase Invoice.

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
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeDelete } from "@/hooks/generic";
import type { PurchaseReceipt } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

interface PRItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
  warehouse?: string;
  purchase_order?: string;
}

export default function PurchaseReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: pr, isLoading, error } = useFrappeDoc<PurchaseReceipt>(
    "Purchase Receipt",
    name,
  );

  // -- Upstream resolution: Purchase Order from items.purchase_order ---------
  const poName = useMemo(() => {
    const items = ((pr?.items ?? []) as Array<{ purchase_order?: string }>);
    return items.find((i) => i?.purchase_order)?.purchase_order;
  }, [pr]);

  // -- Downstream resolution: Purchase Invoice filtered on this PR -----------
  const { data: invoices, isLoading: loadingInvoices } = useFrappeList<{ name: string }>(
    "Purchase Invoice",
    { filters: [["Purchase Receipt Item", "purchase_receipt", "=", name]] as unknown as [string, string, unknown][], fields: ["name"], limit: 5 },
    { enabled: !isLoading && !!pr },
  );

  // -- Build the flow chain from real linked documents -----------------------
  const chain = useMemo(() => {
    const piName = invoices?.[0]?.name;

    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    if (poName) {
      stageStatuses["Purchase Order"] = {
        status: "completed",
        documentName: poName,
        documentUrl: `/buying/purchase-order/${encodeURIComponent(poName)}`,
      };
    }
    if (piName) {
      stageStatuses["Purchase Invoice"] = {
        status: "completed",
        documentName: piName,
        documentUrl: `/accounting/purchase-invoice/${encodeURIComponent(piName)}`,
      };
    }

    return resolveFlowChain("Purchase Receipt", name, stageStatuses);
  }, [poName, invoices, name]);

  // -- Status actions (real mutations) ----------------------------------------
  const updateMutation = useFrappeUpdate<PurchaseReceipt>("Purchase Receipt", {
    showToast: false,
  });

  const deleteMutation = useFrappeDelete("Purchase Receipt", {
    onSuccess: () => {
      toast.success("Purchase Receipt deleted");
      router.push("/stock/purchase-receipt");
    },
  });

  const isDraft = pr?.docstatus === 0;
  const isSubmitted = pr?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => toast.success(`Purchase Receipt ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Purchase Receipt" })),
      },
    );
  };

  const handleDelete = () => {
    setShowDelete(false);
    deleteMutation.mutate(name);
  };

  if (isLoading) return <LoadingState />;
  if (error || !pr) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Purchase Receipt not found."}
        </p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/stock/purchase-receipt")}>
          Back to Purchase Receipts
        </Button>
      </div>
    );
  }

  const items = (pr.items ?? []) as unknown as PRItem[];
  const grandTotal = pr.grand_total ?? pr.total ?? 0;

  // What's-Next actions
  const whatsNext = [
    isDraft && {
      label: "Submit Purchase Receipt",
      description: "Confirm receipt and add stock",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Purchase Invoice",
      description: "Create bill from this receipt",
      onClick: () => router.push(`/accounting/purchase-invoice/new?purchase_receipt=${encodeURIComponent(name)}`),
      disabled: !isModuleBuilt("Purchase Invoice"),
      disabledReason: "Module not available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={pr.name}
        subtitle={pr.supplier_name || pr.supplier}
        backHref="/stock/purchase-receipt"
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stock/purchase-receipt/${encodeURIComponent(name)}/edit`}>
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
                disabled={!isModuleBuilt("Purchase Invoice")}
                title={!isModuleBuilt("Purchase Invoice") ? "Module not available" : undefined}
                asChild={isModuleBuilt("Purchase Invoice")}
              >
                {isModuleBuilt("Purchase Invoice") ? (
                  <Link href={`/accounting/purchase-invoice/new?purchase_receipt=${encodeURIComponent(name)}`}>
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
          <InfoCard title="Receipt Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DataPoint label="Supplier" value={pr.supplier_name || pr.supplier} />
              <DataPoint label="Posting Date" value={pr.posting_date} />
              <DataPoint label="Company" value={pr.company} />
              <DataPoint label="Purchase Order" value={poName || "—"} />
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <InfoCard title="Status" variant="gradient">
            <div className="space-y-3">
              <StatusBadge status={pr.status} size="lg" />
              {pr.per_billed !== undefined && (
                <DataPoint label="% Billed" value={`${pr.per_billed}%`} />
              )}
            </div>
          </InfoCard>

          <InfoCard title="Flow Tracker">
            <FlowRail result={chain} isLoading={loadingInvoices} />
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
                  description: "Purchase Receipt created",
                  user: pr.owner,
                  timestamp: pr.creation ?? new Date().toISOString(),
                },
                ...(isSubmitted
                  ? [
                      {
                        id: "submitted",
                        type: "submitted" as const,
                        description: "Purchase Receipt submitted",
                        user: pr.modified_by,
                        timestamp: pr.modified ?? new Date().toISOString(),
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
        title="Submit this Purchase Receipt?"
        description="Submitting confirms receipt and adds stock. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete this Purchase Receipt?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
