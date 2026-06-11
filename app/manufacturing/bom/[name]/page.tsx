"use client";

// app/manufacturing/bom/[name]/page.tsx
// BOM Detail — FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// OKLCH tokens only. No @ts-nocheck, no any.

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Send,
  Play,
  Copy,
  Trash2,
  Loader2,
  Package,
  Layers,
  Star,
  Cog,
  DollarSign,
} from "lucide-react";

import { PageHeader, LoadingState, ConfirmDialog, EmptyState } from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlowRail } from "@/components/flows/FlowRail";
import { isModuleBuilt } from "@/lib/flows/module-availability";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
import { CrossFlowActionsMenu } from "@/components/cross-flow/CrossFlowActionsMenu";
import { resolveFlowChain } from "@/lib/flows/flow-chain-resolver";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { useFrappeDoc, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import type { Bom } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function BOMDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: bom,
    isLoading,
    error,
    refetch,
  } = useFrappeDoc<Bom>("BOM", name);

  // -- Downstream: Work Orders linked to this BOM ----------------------------
  const { data: workOrders, isLoading: loadingWO } = useFrappeList<{ name: string }>(
    "Work Order",
    {
      filters: [["bom_no", "=", name]] as [string, string, unknown][],
      fields: ["name"],
      limit: 1,
    },
    { enabled: !isLoading && !!bom },
  );

  // -- Build the flow chain ---------------------------------------------------
  const chain = useMemo(() => {
    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    const woName = workOrders?.[0]?.name;
    if (woName) {
      stageStatuses["Work Order"] = {
        status: "completed",
        documentName: woName,
        documentUrl: `/manufacturing/work-order/${encodeURIComponent(woName)}`,
      };
    }

    return resolveFlowChain("BOM", name, stageStatuses);
  }, [workOrders, name]);

  // -- Status actions ---------------------------------------------------------
  const updateMutation = useFrappeUpdate<Bom>("BOM", {
    showToast: false,
  });

  const isDraft = bom?.docstatus === 0;
  const isSubmitted = bom?.docstatus === 1;
  const isActive = bom?.is_active === 1;
  const isDefault = bom?.is_default === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => {
          toast.success(`BOM ${name} submitted`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "BOM" })),
      },
    );
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try {
      const res = await fetch(`/api/resource/BOM/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("BOM deleted");
        router.push("/manufacturing/bom");
      } else {
        const body = await res.json().catch(() => ({}));
        showError(resolveFrappeError(body, { doctype: "BOM" }));
      }
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "BOM" }));
    }
  };

  if (isLoading) return <LoadingState />;
  if (error || !bom) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "BOM not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/manufacturing/bom")}
        >
          Back to BOMs
        </Button>
      </div>
    );
  }

  const whatsNext = [
    isDraft && {
      label: "Submit BOM",
      description: "Submit this BOM to make it available for Work Orders",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isActive && {
      label: "Create Work Order",
      description: "Start production using this BOM",
      onClick: () =>
        router.push(
          `/manufacturing/work-order/new?bom=${encodeURIComponent(name)}`,
        ),
      isPrimary: true,
      disabled: !isModuleBuilt("Work Order"),
      disabledReason: "Coming soon",
    },
    {
      label: "Duplicate BOM",
      description: "Create a copy of this BOM",
      onClick: () =>
        router.push(
          `/manufacturing/bom/new?copy=${encodeURIComponent(name)}`,
        ),
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  const activityItems = [
    {
      id: "created",
      type: "created" as const,
      description: "BOM created",
      user: bom.owner,
      timestamp: bom.creation ?? new Date().toISOString(),
    },
    ...(isSubmitted
      ? [
          {
            id: "submitted",
            type: "submitted" as const,
            description: "BOM submitted",
            user: bom.modified_by,
            timestamp: bom.modified ?? new Date().toISOString(),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={bom.item_name || bom.item}
        subtitle={bom.name}
        backHref="/manufacturing/bom"
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
            {isActive && (
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    `/manufacturing/work-order/new?bom=${encodeURIComponent(name)}`,
                  )
                }
              >
                <Play className="mr-1.5 h-4 w-4" /> Create Work Order
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/manufacturing/bom/new?copy=${encodeURIComponent(name)}`,
                )
              }
            >
              <Copy className="mr-1.5 h-4 w-4" /> Duplicate
            </Button>
            {isDraft && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Status Badges */}
      <div className="flex gap-2 flex-wrap animate-in fade-in slide-in-from-left-4 duration-500">
        <Badge
          className={cn(
            "px-3 py-1 rounded-full border-none",
            isSubmitted
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600",
          )}
        >
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full mr-2",
              isSubmitted ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {isSubmitted ? "Submitted" : "Draft"}
        </Badge>
        {isDefault && (
          <Badge className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full border-none">
            <Star className="h-3.5 w-3.5 mr-1.5 fill-blue-600" /> Default
          </Badge>
        )}
        {isActive ? (
          <Badge className="bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-full border-none">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="px-3 py-1 rounded-full">
            Inactive
          </Badge>
        )}
        {bom.with_operations === 1 && (
          <Badge className="bg-violet-500/10 text-violet-600 px-3 py-1 rounded-full border-none">
            <Cog className="h-3.5 w-3.5 mr-1.5" /> With Operations
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Product Information">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DataPoint label="Item" value={bom.item} />
              <DataPoint label="Item Name" value={bom.item_name || "—"} />
              <DataPoint
                label="Batch Quantity"
                value={`${bom.quantity} ${bom.uom || "Nos"}`}
              />
              <DataPoint label="Company" value={bom.company} />
            </div>
          </InfoCard>

          <InfoCard
            title={`Raw Materials (${Array.isArray(bom.items) ? bom.items.length : 0})`}
            icon={<Package className="h-5 w-5 text-emerald-500" />}
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
                  {(bom.items as Array<{ item_code: string; item_name?: string; qty: number; rate?: number; amount?: number; uom?: string }>).map((it, i) => (
                    <tr key={`${it.item_code}-${i}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">
                          {it.item_name || it.item_code}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {it.item_code}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {it.qty} {it.uom || "Nos"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {ETB.format(it.rate ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                        {ETB.format(it.amount ?? (it.qty * (it.rate ?? 0)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>

          {bom.with_operations === 1 && (
            <InfoCard
              title={`Operations (${Array.isArray(bom.operations) ? bom.operations.length : 0})`}
              icon={<Cog className="h-5 w-5 text-blue-500" />}
            >
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-semibold">Operation</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Workstation</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Time</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(bom.operations as Array<{ operation: string; workstation?: string; time_in_mins?: number; operating_cost?: number }>).map((op, i) => (
                      <tr key={`${op.operation}-${i}`}>
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          {op.operation}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {op.workstation || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {op.time_in_mins} min
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          {ETB.format(op.operating_cost ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <InfoCard
            title="Cost Breakdown"
            className="bg-gradient-to-br from-primary/5 to-primary/10"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Raw Material Cost</span>
                <span className="text-sm font-semibold tabular-nums">
                  {ETB.format(bom.raw_material_cost ?? 0)}
                </span>
              </div>
              {bom.with_operations === 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Operating Cost</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {ETB.format(bom.operating_cost ?? 0)}
                  </span>
                </div>
              )}
              <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                <span className="font-bold text-foreground">Total Cost</span>
                <div className="text-right">
                  <span className="text-2xl font-bold tabular-nums text-primary">
                    {ETB.format(bom.total_cost ?? 0)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {ETB.format((bom.total_cost ?? 0) / (bom.quantity || 1))} / unit
                  </p>
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Journey">
            <FlowRail result={chain} currentDocName={name} sourceDoctype="BOM" isLoading={loadingWO} />
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="BOM" name={name} />

          <WhatsNext actions={whatsNext} />

          <ActivityTimeline items={activityItems} />

          <InfoCard title="Metadata">
            <div className="space-y-3 text-sm">
              <DataPoint label="Created By" value={bom.owner} />
              <DataPoint
                label="Last Modified"
                value={bom.modified ? new Date(bom.modified).toLocaleString() : "—"}
              />
              <DataPoint
                label="Costing Method"
                value={bom.rm_cost_as_per || "Valuation Rate"}
              />
            </div>
          </InfoCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this BOM?"
        description="Submitting will lock this BOM and make it available for Work Orders."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete BOM?"
        description={`Are you sure you want to delete "${bom.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
