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
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeCreate } from "@/hooks/generic";
import { PrintShare } from "@/components/ui/print-share";
import { FrappeSelect } from "@/components/smart/frappe-select";
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
  const { resolution, showError, dismiss } = useGuidedError();

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
      fields: ["name", "operation", "status", "workstation", "total_completed_qty", "for_quantity", "employee"],
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
      const res = await fetch(`/api/resource/Work Order/${encodeURIComponent(name)}`, {
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

  // 2V P0-7 / 2W A2 — Job Card lifecycle: status + start/end timestamps
  // written via set_value to bypass the controller validators that fight
  // the simple two-button SME flow. The previous useFrappeUpdate path
  // failed Start because the controller recomputes status from time_logs
  // (an Open JC with no time_logs → status reset to "Open" even after we
  // set it to "Work In Progress"). frappe.client.set_value writes the
  // fields directly, then we re-fetch so the button label flips.
  const assignJCMutation = useFrappeUpdate<JobCard>("Job Card", {
    showToast: false,
  });
  const [activeJc, setActiveJc] = useState<string | null>(null);

  // Helper: write fields to a Job Card via Frappe's set_value RPC.
  const setJcFields = useCallback(
    async (jcName: string, fields: Record<string, unknown>): Promise<void> => {
      const res = await fetch(`/api/method/frappe.client.set_value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctype: "Job Card",
          name: jcName,
          fieldname: fields,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.message || body?.exception || `set_value failed (${res.status})`,
        );
      }
    },
    [],
  );

  const handleStartJob = async (jcName: string) => {
    setActiveJc(jcName);
    try {
      await setJcFields(jcName, {
        status: "Work In Progress",
        actual_start_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      toast.success(`Job Card ${jcName} started`);
      await refetchJC();
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Job Card" }));
    } finally {
      setActiveJc(null);
    }
  };

  const handleCompleteJob = async (jcName: string) => {
    setActiveJc(jcName);
    try {
      const jc = (jobCards ?? []).find((j) => j.name === jcName);
      const forQty = Number(jc?.for_quantity ?? wo?.qty ?? 0);
      await setJcFields(jcName, {
        status: "Completed",
        total_completed_qty: forQty,
        actual_end_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
      toast.success(`Job Card ${jcName} completed`);
      await refetchJC();
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Job Card" }));
    } finally {
      setActiveJc(null);
    }
  };

  const handleAssignEmployee = (jcName: string, jc: JobCard, employeeId: string) => {
    if (!employeeId) return;
    const existing = (Array.isArray(jc.employee) ? jc.employee : [])
      .map((r: unknown) => typeof r === "object" && r && "employee" in r ? (r as { employee: string }).employee : null)
      .filter(Boolean) as string[];
    if (existing.includes(employeeId)) return;
    const rows = [...existing, employeeId].map((id: string) => ({ employee: id }));
    setActiveJc(jcName);
    assignJCMutation.mutate(
      { name: jcName, data: { employee: rows } },
      {
        onSuccess: () => {
          toast.success(`Employee assigned to ${jcName}`);
          refetchJC();
          setActiveJc(null);
        },
        onError: (err) => {
          setActiveJc(null);
          showError(resolveFrappeError(err, { doctype: "Job Card" }));
        },
      },
    );
  };

  // 2W A2 — Default manufacturing masters (auto-provisioned). Per ADR-1,
  // a Pana print-floor SME must not have to hand-build a workstation +
  // operation; we self-heal the masters on first JC create so the next
  // action is "Start", never "go set up routing".
  const DEFAULT_WORKSTATION = "Pana Print Floor";
  const DEFAULT_OPERATION = "Print & Finish";

  const ensureMaster = useCallback(
    async (doctype: string, name: string, payload: Record<string, unknown>): Promise<boolean> => {
      try {
        const head = await fetch(
          `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
        );
        if (head.ok) return true;
      } catch {
        // fall through to create
      }
      try {
        const res = await fetch(`/api/resource/${encodeURIComponent(doctype)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          // 409 / DuplicateEntry: the master raced into existence — fine.
          if (res.status === 409 || /duplicate|exists/i.test(JSON.stringify(body))) {
            return true;
          }
          throw new Error(body?.message || `Failed to create ${doctype}: ${res.status}`);
        }
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Could not provision ${doctype} "${name}": ${msg}`);
        return false;
      }
    },
    [],
  );

  // 2W A2 — One Job Card per Work Order, auto-created inline, no redirect.
  // The user's exact ask: SME has one print-floor operation, not many; the
  // BOM may carry a routing or not. If routing operations are present we
  // use the first; otherwise we auto-provision the default "Print &
  // Finish" operation at "Pana Print Floor" and create one JC against it.
  const handleCreateJobCards = async () => {
    if (!wo) return;

    // Idempotent: do not create a second JC for the same WO.
    if ((jobCards ?? []).length > 0) {
      toast.info("Job Card already exists for this Work Order.");
      return;
    }

    const operations = (wo.operations ?? []) as Array<{
      operation: string;
      workstation?: string;
      time_in_mins?: number;
    }>;

    // Pick the operation: prefer the BOM's first routing row, else default.
    let operationName = operations[0]?.operation;
    let workstationName = operations[0]?.workstation;

    if (!operationName) {
      // Auto-provision defaults so the user never has to hand-build them.
      const okWs = await ensureMaster("Workstation", DEFAULT_WORKSTATION, {
        workstation_name: DEFAULT_WORKSTATION,
        hour_rate: 0,
      });
      const okOp = await ensureMaster("Operation", DEFAULT_OPERATION, {
        name: DEFAULT_OPERATION,
        workstation: DEFAULT_WORKSTATION,
      });
      if (!okWs || !okOp) return;
      operationName = DEFAULT_OPERATION;
      workstationName = DEFAULT_WORKSTATION;
    } else if (!workstationName) {
      // Routing has an operation but no workstation — fall back to the default.
      await ensureMaster("Workstation", DEFAULT_WORKSTATION, {
        workstation_name: DEFAULT_WORKSTATION,
        hour_rate: 0,
      });
      workstationName = DEFAULT_WORKSTATION;
    }

    createJCMutation.mutate(
      {
        work_order: name,
        operation: operationName,
        workstation: workstationName,
        production_item: wo.production_item || "",
        item_name: wo.item_name || "",
        for_quantity: wo.qty || 0,
        bom_no: wo.bom_no || "",
        company: wo.company || "",
        wip_warehouse: wo.wip_warehouse || "",
        posting_date: new Date().toISOString().split("T")[0],
        expected_start_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      },
      {
        onSuccess: () => {
          toast.success("Job Card created");
          refetchJC();
        },
        onError: (err) => {
          showError(resolveFrappeError(err, { doctype: "Job Card" }));
        },
      },
    );
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
            <PrintShare doctype="Work Order" name={name} />
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
              {wo.docstatus === 1 && (jobCards ?? []).length === 0 && (
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
                      {jobCards!.map((jc) => {
                        const assigned = (Array.isArray(jc.employee) ? jc.employee : [])
                          .map((r: unknown) =>
                            typeof r === "object" && r && "employee_name" in r
                              ? (r as { employee_name: string }).employee_name
                              : typeof r === "object" && r && "employee" in r
                                ? (r as { employee: string }).employee
                                : null,
                          )
                          .filter(Boolean) as string[];
                        return (
                          <tr key={jc.name} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-3 py-2.5 font-medium text-foreground">
                              {jc.operation}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {jc.workstation || "—"}
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
                                  disabled={activeJc === jc.name}
                                  onChange={(val) =>
                                    handleAssignEmployee(jc.name, jc, val)
                                  }
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Badge
                                variant={
                                  jc.status === "Completed"
                                    ? "default"
                                    : jc.status === "Work In Progress"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="text-[10px] uppercase font-black tracking-tighter"
                              >
                                {jc.status || "Open"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {jc.status === "Open" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px]"
                                  onClick={() => handleStartJob(jc.name)}
                                  disabled={activeJc === jc.name}
                                >
                                  {activeJc === jc.name ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3 mr-1" />
                                  )}
                                  Start
                                </Button>
                              )}
                              {jc.status === "Work In Progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px]"
                                  onClick={() => handleCompleteJob(jc.name)}
                                  disabled={activeJc === jc.name}
                                >
                                  {activeJc === jc.name ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}
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
                      })}
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
