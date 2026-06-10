"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Send,
  Trash2,
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
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeDelete } from "@/hooks/generic";
import type { MaterialRequest } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";

interface MRItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
  warehouse?: string;
  from_warehouse?: string;
  schedule_date?: string;
  ordered_qty?: number;
}

export default function MaterialRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: mr,
    isLoading,
    error,
  } = useFrappeDoc<MaterialRequest>("Material Request", name);

  const isDraft = mr?.docstatus === 0;
  const isSubmitted = mr?.docstatus === 1;

  const { data: purchaseOrders, isLoading: loadingPO } = useFrappeList<{ name: string }>(
    "Purchase Order",
    { filters: [["material_request", "=", name]], fields: ["name"], limit: 5 },
    { enabled: !isLoading && !!mr }
  );

  const chain = useMemo(() => {
    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    stageStatuses["Material Request"] = {
      status: isSubmitted ? "completed" : "current",
      documentName: name,
      documentUrl: `/stock/material-request/${encodeURIComponent(name)}`,
    };

    const poName = purchaseOrders?.[0]?.name;
    if (poName) {
      stageStatuses["Purchase Order"] = {
        status: "completed",
        documentName: poName,
        documentUrl: `/buying/purchase-order/${encodeURIComponent(poName)}`,
      };
    }

    return resolveFlowChain("Material Request", name, stageStatuses);
  }, [mr, purchaseOrders, name, isSubmitted]);

  const updateMutation = useFrappeUpdate<MaterialRequest>("Material Request", {
    showToast: false,
  });

  const deleteMutation = useFrappeDelete("Material Request", {
    onSuccess: () => {
      toast.success(`Material Request ${name} deleted`);
      router.push("/stock/material-request");
    },
  });

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
      {
        onSuccess: () => toast.success(`Material Request ${name} submitted`),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Material Request" })),
      }
    );
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    await deleteMutation.mutateAsync(name);
  };

  const whatsNext = [
    isDraft && {
      label: "Submit Material Request",
      description: "Submit for procurement processing",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: "Create Purchase Order",
      description: "Create PO from this request",
      onClick: () => router.push(`/buying/purchase-order/new?material_request=${encodeURIComponent(name)}`),
      disabled: !isModuleBuilt("Purchase Order"),
      disabledReason: "Module not available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  if (isLoading) return <LoadingState />;
  if (error || !mr) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Material Request not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/stock/material-request")}
        >
          Back to Material Requests
        </Button>
      </div>
    );
  }

  const items = (mr.items ?? []) as unknown as MRItem[];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        backUrl="/stock/material-request"
        label="Material Request"
        title={mr.name}
        status={{
          label: mr.status || "Draft",
          variant:
            mr.status === "Cancelled"
              ? "destructive"
              : mr.status === "Ordered" || mr.status === "Received"
                ? "success"
                : isDraft
                  ? "default"
                  : "warning",
        }}
        actions={
          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
                <Button
                  size="sm"
                  onClick={() => setConfirmSubmit(true)}
                  disabled={updateMutation.isPending}
                >
                  <Send className="mr-1.5 h-4 w-4" /> Submit
                </Button>
              </>
            )}
          </div>
        }
      />

      <InfoCard title="Procurement Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Material Request" isLoading={loadingPO} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          <InfoCard title="Request Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint
                label="Request Type"
                value={mr.material_request_type}
              />
              <DataPoint label="Company" value={mr.company} />
              <DataPoint
                label="Transaction Date"
                value={mr.transaction_date}
              />
              <DataPoint
                label="Schedule Date"
                value={mr.schedule_date || "—"}
              />
              <DataPoint
                label="From Warehouse"
                value={mr.set_from_warehouse || "—"}
              />
              <DataPoint
                label="To Warehouse"
                value={mr.set_warehouse || "—"}
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
                      UOM
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Warehouse
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
                        {it.qty}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {it.uom || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {it.warehouse || mr.set_warehouse || "—"}
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
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={mr.status || "Draft"} size="lg" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter mb-1.5">
                    <span className="text-muted-foreground">% Ordered</span>
                    <span className="text-primary">
                      {Math.round(mr.per_ordered || 0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(mr.per_ordered || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter mb-1.5">
                    <span className="text-muted-foreground">% Received</span>
                    <span className="text-primary">
                      {Math.round(mr.per_received || 0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(mr.per_received || 0, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
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
                  description: "Material Request created",
                  user: mr.owner,
                  timestamp: mr.creation ?? new Date().toISOString(),
                },
                ...(isSubmitted
                  ? [
                      {
                        id: "submitted",
                        type: "submitted" as const,
                        description: "Request submitted",
                        user: mr.modified_by,
                        timestamp:
                          mr.modified ?? new Date().toISOString(),
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
        title="Submit this Material Request?"
        description="Submitting locks the request and enables procurement processing. This cannot be undone without cancelling."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Material Request?"
        description="This action cannot be undone. Only draft requests can be deleted."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
