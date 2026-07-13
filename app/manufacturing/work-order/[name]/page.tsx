"use client";

// app/manufacturing/work-order/[name]/page.tsx
// Work Order Detail — FlowRail, WhatsNext, ActivityTimeline, ConfirmDialog.
// Status machine: Draft → Not Started → In Process → Completed.
// OKLCH tokens only. No @ts-nocheck, no any.

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Send,
  Play,
  CheckCircle2,
  Pause,
  Archive,
  XCircle,
  Plus,
  Loader2,
  Package,
  Calendar,
  Factory,
  DollarSign,
  ClipboardList,
  ArrowRightLeft,
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
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { StartProductionModal } from "@/components/manufacturing/StartProductionModal";
import { FinishProductionModal } from "@/components/manufacturing/FinishProductionModal";
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeCreate, useFrappeOptions } from "@/hooks/generic";
import { useJobCardLifecycle, type JobCardLifecycle } from "@/hooks/manufacturing/use-job-card-lifecycle";
import { PrintShare } from "@/components/ui/print-share";
import { PrintMenu } from "@/components/print/PrintMenu";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { CreateJobCardModal } from "@/components/manufacturing/CreateJobCardModal";
import type { WorkOrder, SalesOrder, Bom, JobCard } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  // 2O Part 5.1/5.3 — one-click production modals. We replace the prior
  // deep-link-into-SE-wizard with a single-modal action that creates +
  // submits the Stock Entry atomically and shows a summary.
  const [startOpen, setStartOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  // 2Y-R3 — Create-Job-Card modal state (allows multiple JCs per WO).
  const [createJCOpen, setCreateJCOpen] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  // 2Y-R3 — Employee name lookup so the JC list shows names, not IDs.
  // Frappe's Job Card `employee` child row may not carry `employee_name`
  // on GET, so we resolve from the Employee master as a robust fallback.
  const { data: employeeOptions } = useFrappeOptions("Employee", {
    labelField: "employee_name",
    limit: 1000,
  });
  const employeeNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of employeeOptions ?? []) {
      if (o.value) map[o.value] = (o.label as string) || o.value;
    }
    return map;
  }, [employeeOptions]);

  const {
    data: wo,
    isLoading,
    error,
    refetch,
  } = useFrappeDoc<WorkOrder>("Work Order", name);

  // -- Fetch related docs -----------------------------------------------------
  const { data: soDetails } = useFrappeDoc<SalesOrder>(
    "Sales Order",
    wo?.sales_order || "",
    { enabled: !!wo?.sales_order },
  );

  const { data: bomData } = useFrappeDoc<Bom>(
    "BOM",
    wo?.bom_no || "",
    { enabled: !!wo?.bom_no },
  );

  // -- Downstream: Stock Entries linked to this WO ----------------------------
  const { data: stockEntries, isLoading: loadingSE } = useFrappeList<{ name: string }>(
    "Stock Entry",
    {
      filters: [["work_order", "=", name]] as [string, string, unknown][],
      fields: ["name"],
      limit: 1,
    },
    { enabled: !isLoading && !!wo },
  );

  // 2T §2 T3 — Job Cards linked to this WO. Auto-create one per operation.
  const { data: jobCards, isLoading: loadingJC, refetch: refetchJC } = useFrappeList<JobCard>(
    "Job Card",
    {
      filters: [["work_order", "=", name]] as [string, string, unknown][],
      // 2Y-R2 P0 — parent columns ONLY. `employee` and `time_logs` are child
      // tables; requesting them here 500s ("Unknown column 'time_logs'").
      // Child data is read from the full doc via useFrappeDoc in JobCardTableRow.
      fields: ["name", "operation", "status", "workstation", "total_completed_qty", "for_quantity", "work_order"],
      limit: 50,
    },
    { enabled: !isLoading && !!wo },
  );

  const createJCMutation = useFrappeCreate<JobCard, Record<string, unknown>>("Job Card", {
    onSuccess: () => refetchJC(),
  });

  // 2N Part 1.1: unified flow resolution.
  // 2V P0-5 — thread the manufacturing flow so the WO rail shows
  // manufacturing-scoped stages (SO→WO→JC→SE) instead of the 8-stage
  // lead-to-cash flow.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Work Order", name, undefined, "manufacturing");

  // -- Costing ----------------------------------------------------------------
  const costing = useMemo(() => {
    if (!wo || !bomData)
      return {
        operating: wo?.planned_operating_cost || 0,
        material: 0,
        total: 0,
      };
    const ratio = wo.qty / (bomData.quantity || 1);
    const operating =
      wo.planned_operating_cost || (bomData.operating_cost || 0) * ratio;
    const material = (bomData.raw_material_cost || 0) * ratio;
    return {
      operating,
      material,
      total: wo.qty > 0 ? (operating + material) / wo.qty : 0,
    };
  }, [wo, bomData]);

  // -- Status actions ---------------------------------------------------------
  const updateMutation = useFrappeUpdate<WorkOrder>("Work Order", {
    showToast: false,
  });

  const isDraft = wo?.docstatus === 0;
  const status = wo?.status || "Draft";

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1, status: "Not Started" } },
      {
        onSuccess: () => {
          toast.success(`Work Order ${name} submitted`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Work Order" })),
      },
    );
  };

  const handleStartProduction = () => {
    // 2O Part 5.1: open the one-click start modal instead of deep-linking
    // into the SE wizard. The modal computes the materials, surfaces a
    // summary, and on confirm creates + submits the Material Transfer SE.
    setStartOpen(true);
  };

  const handleFinishProduction = () => {
    // 2O Part 5.3: same pattern for finish — open the one-click modal
    // that auto-builds the Manufacture Stock Entry payload.
    setFinishOpen(true);
  };

  const handleStop = () => {
    setConfirmStop(false);
    updateMutation.mutate(
      { name, data: { status: "Stopped" } },
      {
        onSuccess: () => {
          toast.success("Work Order stopped");
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Work Order" })),
      },
    );
  };

  const handleResume = () => {
    updateMutation.mutate(
      { name, data: { status: "In Process" } },
      {
        onSuccess: () => {
          toast.success("Work Order resumed");
          refetch();
        },
      },
    );
  };

  const handleClose = () => {
    updateMutation.mutate(
      { name, data: { status: "Closed" } },
      {
        onSuccess: () => {
          toast.success("Work Order closed");
          refetch();
        },
      },
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2, status: "Cancelled" } },
      {
        onSuccess: () => {
          toast.success("Work Order cancelled");
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Work Order" })),
      },
    );
  };

  const handleDelete = async () => {
    setShowDelete(false);
    try {
      const res = await fetch(`/api/manufacturing/work-order/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Work Order deleted");
        router.push("/manufacturing/work-order");
      } else {
        const body = await res.json().catch(() => ({}));
        showError(resolveFrappeError(body, { doctype: "Work Order" }));
      }
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Work Order" }));
    }
  };

  // 2X P0-B — Job Card lifecycle: use useFrappeUpdate (resource PUT through
  // our proxy) instead of the broken frappe.client.set_value RPC call that
  // 404'd because /api/method/* has no Next.js route. The controller validates
  // and recomputes status from time_logs — so we write the CORRECT time_logs
  // data so the controller naturally agrees with our intent:
  //   Start: append a new time_log {employee, from_time, completed_qty: 0}
  //   Complete: update the open time_log row with {to_time, completed_qty}
  // The employee is required before starting (guided message if none).
  // 2Y-R2 P0 — shared lifecycle hook. Reads child data (employee/time_logs)
  // from the FULL doc, never from the get_list row above (child fields 500).
  const jcLifecycle = useJobCardLifecycle(() => { refetchJC(); }, showError);

  // 2Y-R2 P0 — Job Card lifecycle (start/complete/assign employee) now lives
  // in the shared useJobCardLifecycle hook + JobCardTableRow (below). Child
  // data (employee/time_logs) is read from the FULL doc, never the get_list
  // row, which 500s on child-table fields.

  // 2Y-R2 P0 — The 8 workstations + 8 operations are seeded live (Digital
  // Paper Print, Offset Print, Banner Print, UV Print, DTF Print, CNC &
  // Laser, Signage, Design Studio). The Create-Job-Card modal references
  // these seeded masters directly — no client-side POST provisioning (that
  // route 404s; /api/* is the Next namespace). If a master is missing, the
  // create mutation surfaces a GuidedErrorDialog.

  // 2Y-R3 — Open the Create-Job-Card modal. A WO can carry MULTIPLE Job
  // Cards (one per operation / re-run), so we no longer guard against an
  // existing JC. The modal lets the operator pick operation + workstation +
  // optional employee; the inline "Create Job Card" button below opens it.
  const handleCreateJobCards = () => {
    if (!wo) return;
    setCreateJCOpen(true);
  };

  if (isLoading) return <LoadingState />;
  if (error || !wo) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Work Order not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/manufacturing/work-order")}
        >
          Back to Work Orders
        </Button>
      </div>
    );
  }

  const progress = wo.qty > 0 ? ((wo.produced_qty || 0) / wo.qty) * 100 : 0;

  // 2N Part 4.2: WO execution spine — these buttons deep-link into the
  // Stock Entry new page with `purpose` and `work_order` pre-filled (the
  // SE wizard now reads those URL params and prefills the form). They
  // were previously disabled with `disabledReason: "Coming soon"` because
  // the SE wizard didn't accept the params; both gates are now live.
  const whatsNext = [
    isDraft && {
      label: "Submit Work Order",
      description: "Submit to reserve raw materials",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    status === "Not Started" && {
      label: "Transfer materials",
      description: "Create a Material Transfer Stock Entry for this WO",
      onClick: handleStartProduction,
      isPrimary: true,
    },
    status === "In Process" && {
      label: "Finish Production",
      description: "Create a Manufacture Stock Entry (FG produced)",
      onClick: handleFinishProduction,
      isPrimary: true,
    },
    ["Not Started", "In Process"].includes(status) && {
      label: "Request Materials",
      description: "Create a Material Request for raw materials",
      onClick: () =>
        router.push(
          `/stock/material-request/new?work_order=${encodeURIComponent(name)}&type=Purchase`,
        ),
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  const activityItems = [
    {
      id: "created",
      type: "created" as const,
      description: "Work Order created",
      user: wo.owner,
      timestamp: wo.creation ?? new Date().toISOString(),
    },
    ...(wo.docstatus === 1
      ? [
          {
            id: "submitted",
            type: "submitted" as const,
            description: "Work Order submitted",
            user: wo.modified_by,
            timestamp: wo.modified ?? new Date().toISOString(),
          },
        ]
      : []),
    ...(status === "In Process"
      ? [
          {
            id: "started",
            type: "status_change" as const,
            description: "Production started",
            user: wo.modified_by,
            timestamp: wo.actual_start_date ?? wo.modified ?? new Date().toISOString(),
          },
        ]
      : []),
    ...(status === "Completed"
      ? [
          {
            id: "completed",
            type: "status_change" as const,
            description: "Production completed",
            user: wo.modified_by,
            timestamp: wo.actual_end_date ?? wo.modified ?? new Date().toISOString(),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={wo.name}
        subtitle={wo.item_name || wo.production_item}
        backHref="/manufacturing/work-order"
        actions={
          <div className="flex items-center gap-2">
            <PrintMenu doctype="Work Order" doc={wo as unknown as Record<string, unknown>} />
            <PrintShare doctype="Work Order" name={name} showPrint={false} />
            {isDraft && (
              <>
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
            {status === "Not Started" && (
              <Button size="sm" onClick={handleStartProduction}>
                <Play className="mr-1.5 h-4 w-4" /> Start Production
              </Button>
            )}
            {status === "In Process" && (
              <Button size="sm" onClick={handleFinishProduction}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Finish
              </Button>
            )}
            {["Not Started", "In Process"].includes(status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmStop(true)}
              >
                <Pause className="mr-1.5 h-4 w-4" /> Stop
              </Button>
            )}
            {status === "Stopped" && (
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="mr-1.5 h-4 w-4" /> Resume
              </Button>
            )}
            {status === "Completed" && (
              <Button variant="outline" size="sm" onClick={handleClose}>
                <Archive className="mr-1.5 h-4 w-4" /> Close
              </Button>
            )}
            {status !== "Draft" && !["Cancelled", "Closed"].includes(status) && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmCancel(true)}
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        }
      />

      {/* Progress & Summary Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <StatusBadge status={wo.status || "Draft"} size="lg" />
            <div className="h-8 w-px bg-border hidden md:block" />
            <div className="text-sm">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-bold">{wo.qty}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Produced: </span>
              <span className="font-bold text-emerald-600">
                {wo.produced_qty || 0}
              </span>
            </div>
          </div>

          <div className="w-full md:w-64">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground font-medium uppercase tracking-tighter">
                Production Progress
              </span>
              <span className="font-bold text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  progress >= 100
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-primary",
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DataPoint
            label="Planned Start"
            value={wo.planned_start_date ? new Date(wo.planned_start_date).toLocaleDateString() : "—"}
          />
          <DataPoint
            label="Expected Delivery"
            value={wo.expected_delivery_date ? new Date(wo.expected_delivery_date).toLocaleDateString() : "—"}
          />
          <DataPoint
            label="WIP Warehouse"
            value={wo.wip_warehouse || "—"}
          />
          <DataPoint
            label="Target Warehouse"
            value={wo.fg_warehouse}
          />
        </div>
      </div>

      {/* 2U §4 — FlowRail below header (golden placement, matches DN/PR/SO/PO/PI/MR) */}
      <InfoCard title="Production Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Work Order" isLoading={chainLoading} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Center column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Items Table */}
          <InfoCard
            title="Required Materials"
            icon={<Package className="h-5 w-5 text-emerald-500" />}
          >
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-secondary/20">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Required</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Transferred</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Consumed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(wo.required_items as Array<{ item_code: string; item_name?: string; required_qty: number; transferred_qty?: number; consumed_qty?: number }>)?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">
                          {item.item_name || item.item_code}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {item.item_code}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                        {item.required_qty}
                      </td>
                      <td className="px-3 py-2.5 text-right text-blue-600 font-bold tabular-nums">
                        {item.transferred_qty || 0}
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-600 font-bold tabular-nums">
                        {item.consumed_qty || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </InfoCard>

          {/* Operations Table */}
          {Array.isArray(wo.operations) && wo.operations.length > 0 && (
            <InfoCard
              title="Production Operations"
              icon={<ArrowRightLeft className="h-5 w-5 text-blue-500" />}
            >
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-semibold">Operation</th>
                      <th className="px-3 py-2.5 text-left font-semibold">Workstation</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Time</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(wo.operations as Array<{ operation: string; workstation?: string; time_in_mins?: number; status?: string }>).map((op, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          {op.operation}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {op.workstation || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {op.time_in_mins} min
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Badge variant="outline" className="text-[10px] uppercase font-black tracking-tighter">
                            {op.status || "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}

          {/* 2T §2 T3 — Job Cards section */}
          {isModuleBuilt("Job Card") && (
            <div>
              {wo.docstatus === 1 && (
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={handleCreateJobCards}
                    disabled={createJCMutation.isPending}
                  >
                    {createJCMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    Create Job Card
                  </Button>
                </div>
              )}
              <InfoCard
                title="Job Cards"
                icon={<ClipboardList className="h-5 w-5 text-purple-500" />}
              >
              {loadingJC ? (
                <LoadingState type="table" count={3} />
              ) : (jobCards ?? []).length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No Job Card yet. {wo.docstatus === 1 ? "Click the button above to create one (one per Work Order, with the default operation pre-filled)." : "Submit the Work Order first."}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border/60 bg-secondary/20">
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 text-left font-semibold">Operation</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Workstation</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Employees</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Status</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Action</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                {jobCards!.map((jc) => (
                  <JobCardTableRow key={jc.name} jc={jc} lifecycle={jcLifecycle} employeeNameMap={employeeNameMap} />
                ))}
                    </tbody>
                  </table>
                </div>
              )}
            </InfoCard>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <InfoCard
            title="Production Cost"
            className="bg-gradient-to-br from-primary/5 to-primary/10"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Operating Cost</span>
                <span className="text-sm font-semibold tabular-nums">
                  {ETB.format(costing.operating)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Material Cost</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-600">
                  {ETB.format(costing.material)}
                </span>
              </div>
              <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                <span className="font-bold text-foreground">Unit Cost</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {ETB.format(costing.total)}
                </span>
              </div>
            </div>
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Work Order" name={name} />

          <WhatsNext actions={whatsNext} />

          <ActivityTimeline items={activityItems} />

          {/* Linked Docs */}
          <InfoCard title="Linked Documents">
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl justify-start"
                asChild
              >
                <Link href={`/manufacturing/bom/${encodeURIComponent(wo.bom_no)}`}>
                  <Package className="h-4 w-4 mr-2" /> {wo.bom_no}
                </Link>
              </Button>
              {wo.sales_order && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl justify-start"
                  asChild
                >
                  <Link href={`/sales/sales-order/${encodeURIComponent(wo.sales_order)}`}>
                    <ClipboardList className="h-4 w-4 mr-2" /> {wo.sales_order}
                  </Link>
                </Button>
              )}
            </div>
          </InfoCard>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit this Work Order?"
        description="Submitting will reserve raw materials and make this WO available for production."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmStop}
        onOpenChange={setConfirmStop}
        title="Stop this Work Order?"
        description="Stopping will halt production. You can resume later."
        confirmText="Stop"
        onConfirm={handleStop}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Work Order?"
        description="Cancelling cannot be undone. All reserved materials will be released."
        confirmText="Cancel"
        variant="destructive"
        onConfirm={handleCancel}
      />
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Work Order?"
        description={`Are you sure you want to delete "${wo.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* 2O Part 5: one-click MFG modals. The modals own their own loading
          state + idempotency check + shortfall guidance. */}
      <StartProductionModal
        open={startOpen}
        onOpenChange={setStartOpen}
        onCompleted={() => refetch()}
        workOrderName={wo.name}
        workOrderQty={Number(wo.qty) || 0}
        productionItem={wo.production_item}
        sourceWarehouse={wo.source_warehouse}
        wipWarehouse={wo.wip_warehouse}
        fgWarehouse={wo.fg_warehouse}
        requiredItems={
          (wo.required_items as Array<{
            item_code: string;
            item_name?: string;
            required_qty: number;
            transferred_qty?: number;
            consumed_qty?: number;
            source_warehouse?: string;
          }>) ?? []
        }
      />

      {/* 2Y-R3 — Create additional Job Cards against this WO. */}
      <CreateJobCardModal
        open={createJCOpen}
        onOpenChange={setCreateJCOpen}
        workOrder={wo}
        onCreated={() => refetchJC()}
      />
      <FinishProductionModal
        open={finishOpen}
        onOpenChange={setFinishOpen}
        onCompleted={() => refetch()}
        workOrderName={wo.name}
        workOrderQty={Number(wo.qty) || 0}
        producedQty={Number(wo.produced_qty) || 0}
        productionItem={wo.production_item}
        wipWarehouse={wo.wip_warehouse}
        fgWarehouse={wo.fg_warehouse}
        requiredItems={
          (wo.required_items as Array<{
            item_code: string;
            item_name?: string;
            required_qty: number;
            transferred_qty?: number;
            consumed_qty?: number;
            source_warehouse?: string;
          }>) ?? []
        }
      />

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// JobCardTableRow — one Job Card row in the WO Job Cards table.
// 2Y-R2 P0: fetches the FULL Job Card doc (incl. employee/time_logs child
// tables) via useFrappeDoc. The parent get_list row only carries parent
// columns, so child data MUST come from the full doc or the list 500s.
// ---------------------------------------------------------------------------
function JobCardTableRow({
  jc,
  lifecycle,
  employeeNameMap,
}: {
  jc: JobCard;
  lifecycle: JobCardLifecycle;
  employeeNameMap?: Record<string, string>;
}) {
  const { data: fullJc, isLoading } = useFrappeDoc<JobCard>("Job Card", jc.name);
  // Fall back to the parent-row shape while the full doc loads.
  const doc = fullJc ?? jc;

  const assigned = (Array.isArray(doc.employee) ? doc.employee : [])
    .map((r: unknown) => {
      if (typeof r !== "object" || !r) return null;
      const row = r as { employee?: string; employee_name?: string };
      // Prefer the child row's employee_name, then the master lookup, then
      // the raw employee ID (so we never show a blank chip).
      const id = row.employee;
      const name =
        row.employee_name ||
        (id && employeeNameMap?.[id]) ||
        id ||
        null;
      return name;
    })
    .filter(Boolean) as string[];

  const status = jc.status || "Open";
  const isOpen = status === "Open";
  const isInProgress = status === "Work In Progress";
  const busy = lifecycle.activeJc === jc.name;

  return (
    <tr className="hover:bg-secondary/20 transition-colors">
      <td className="px-3 py-2.5 font-medium text-foreground">{jc.operation}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{jc.workstation || "—"}</span>
          {!isInProgress && !jc.status?.includes("Completed") && (
            <div className="w-36">
              <FrappeSelect
                doctype="Workstation"
                placeholder={busy ? "…" : "WS…"}
                value={jc.workstation ?? ""}
                className="h-6 text-[10px]"
                disabled={busy || isLoading}
                onChange={(val) => lifecycle.handleAssignWorkstation(doc, val)}
              />
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          {assigned.length > 0 ? (
            assigned.map((emp) => (
              <span
                key={emp}
                className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
              >
                {emp}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
          <FrappeSelect
            doctype="Employee"
            labelField="employee_name"
            placeholder="+"
            className="h-6 w-16 text-[10px]"
            disabled={busy || isLoading}
            onChange={(val, sel) =>
              lifecycle.handleAssignEmployee(doc, val, (sel as { label?: string })?.label)
            }
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <Badge
          variant={
            status === "Completed" ? "default" : isInProgress ? "secondary" : "outline"
          }
          className="text-[10px] uppercase font-black tracking-tighter"
        >
          {status}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right">
        {isOpen && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            onClick={() => lifecycle.handleStartJob(doc)}
            disabled={busy || isLoading}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
            Start
          </Button>
        )}
        {isInProgress && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            onClick={() => lifecycle.handleCompleteJob(doc)}
            disabled={busy || isLoading}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
            Complete
          </Button>
        )}
      </td>
      <td className="px-2 py-2.5 text-center">
        <Link
          href={`/manufacturing/job-card/${encodeURIComponent(jc.name)}`}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}
