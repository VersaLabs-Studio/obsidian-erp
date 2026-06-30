"use client";

// app/sales/sales-order/[name]/page.tsx
// Obsidian ERP v4.0 — Sales Order Detail (V4 Golden Template)
// Action-oriented detail per Architecture V4 Part 2 §3.2 + §6 (Flow Tracker).
// Real flow-chain resolution (no stub): upstream Quotation via prevdoc_docname,
// downstream Work Orders via the sales_order header link. OKLCH tokens only.

import { useCallback, useMemo, useRef, useState } from "react";
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
  Factory,
  Wrench,
  CheckCircle2,
  UserPlus,
  ExternalLink,
} from "lucide-react";

import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { PrintShare } from "@/components/ui/print-share";
import { FlowRail } from "@/components/flows/FlowRail";
import { CrossFlowActionsMenu } from "@/components/cross-flow/CrossFlowActionsMenu";
import { isModuleBuilt } from "@/lib/flows/module-availability";
import { WhatsNext } from "@/components/smart/WhatsNext";
import { ActivityTimeline } from "@/components/smart/ActivityTimeline";
// 2N Part 1.1: replaced the per-page `stageStatuses` block + `resolveFlowChain`
// call with the unified `useFlowChain` hook. The hook walks outward through
// the link map and returns the same shape the rail needs.
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { getAutoFillMapping, applyAutoFill } from "@/lib/flows/flow-auto-fill";
import { getActiveCompany } from "@/lib/settings/company";
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeCreate } from "@/hooks/generic";
import { FrappeSelect } from "@/components/smart/frappe-select";
import type { SalesOrder } from "@/types/doctype-types";
import { getDefaultFgWarehouse, fetchWarehouseDefaults } from "@/lib/stock/warehouse-defaults";

// 2U §P0 — Manufacturing master-doc rows. A Sales Order acts as the cockpit
// where the sales user creates Work Orders, submits them (which generates Job
// Cards in ERPNext when the BOM carries a routing), and assigns employees to
// those Job Cards — all without leaving the SO.
interface LinkedWorkOrder {
  name: string;
  status: string;
  production_item?: string;
  qty?: number;
  docstatus?: 0 | 1 | 2;
}
interface JobCardEmployeeRow {
  employee?: string;
  employee_name?: string;
}
interface LinkedJobCard {
  name: string;
  status?: string;
  operation?: string;
  work_order?: string;
  workstation?: string;
  for_quantity?: number;
  employee?: JobCardEmployeeRow[];
}

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
  const { data: workOrders, isLoading: loadingWO, refetch: refetchWO } =
    useFrappeList<LinkedWorkOrder>(
      "Work Order",
      {
        filters: [["sales_order", "=", name]],
        fields: ["name", "status", "production_item", "qty", "docstatus"],
        limit: 50,
      },
      { enabled: !isLoading && !!order },
    );

  // -- Job Cards for the linked Work Orders (master-doc manufacturing view) ---
  // Job Cards are spawned by ERPNext when a Work Order with a routed BOM is
  // submitted. We surface them here so the sales user can see and assign them.
  const linkedWONames = useMemo(
    () => (workOrders ?? []).map((w) => w.name),
    [workOrders],
  );
  const { data: jobCards, refetch: refetchJobCards } =
    useFrappeList<LinkedJobCard>(
      "Job Card",
      {
        filters: [["work_order", "in", linkedWONames.length ? linkedWONames : ["__none__"]]],
        fields: ["name", "status", "operation", "work_order", "workstation", "for_quantity", "employee"],
        limit: 100,
      },
      { enabled: linkedWONames.length > 0 },
    );

  // Submit a draft Work Order (docstatus 0 → 1). On submit ERPNext generates
  // Job Cards for each routed operation; we refetch both lists.
  const submitWOMutation = useFrappeUpdate<LinkedWorkOrder>("Work Order", { showToast: false });
  const [submittingWO, setSubmittingWO] = useState<string | null>(null);

  const handleSubmitWorkOrder = useCallback(
    (woName: string) => {
      setSubmittingWO(woName);
      submitWOMutation.mutate(
        { name: woName, data: { docstatus: 1 } },
        {
          onSuccess: async () => {
            toast.success(`Work Order ${woName} submitted`, {
              description: "Job Cards are generated for each routed operation.",
            });
            await Promise.all([refetchWO(), refetchJobCards()]);
            setSubmittingWO(null);
          },
          onError: (err) => {
            setSubmittingWO(null);
            showError(resolveFrappeError(err, { doctype: "Work Order" }));
          },
        },
      );
    },
    [submitWOMutation, refetchWO, refetchJobCards, showError],
  );

  // Assign an employee to a Job Card. Job Card's `employee` is a Table
  // MultiSelect child table — each row carries one `employee` link. We union
  // the selected employee with any already assigned and write the rows back.
  const assignJCMutation = useFrappeUpdate<LinkedJobCard>("Job Card", { showToast: false });
  const [assigningJC, setAssigningJC] = useState<string | null>(null);

  const handleAssignEmployee = useCallback(
    (jc: LinkedJobCard, employeeId: string, employeeName?: string) => {
      if (!employeeId) return;
      const existing = (jc.employee ?? []).map((r) => r.employee).filter(Boolean) as string[];
      if (existing.includes(employeeId)) {
        toast.info(`${employeeName || employeeId} is already assigned to ${jc.name}.`);
        return;
      }
      const rows = [...existing, employeeId].map((id) => ({ employee: id }));
      setAssigningJC(jc.name);
      assignJCMutation.mutate(
        { name: jc.name, data: { employee: rows } },
        {
          onSuccess: async () => {
            toast.success(`Assigned ${employeeName || employeeId} to ${jc.name}`);
            await refetchJobCards();
            setAssigningJC(null);
          },
          onError: (err) => {
            setAssigningJC(null);
            showError(resolveFrappeError(err, { doctype: "Job Card" }));
          },
        },
      );
    },
    [assignJCMutation, refetchJobCards, showError],
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

  // 2N Part 1.1: unified flow resolution. The hook walks outward through
  // the canonical link map (Quotation ← Sales Order via header field
  // `quotation`; Sales Order → Work Order via header `sales_order`;
  // Sales Order → Delivery Note via DN Item.against_sales_order, etc.) and
  // returns the full stageStatuses map. Replaces the per-page block that
  // only resolved Quotation + Work Order and left the rail "disabled" past
  // those two stages.
  const { result: chain, isLoading: chainLoading } = useFlowChain(
    "Sales Order",
    name,
  );

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
  // 2U §2 — Sequential Work Order multi-create. onSuccess/onError are now
  // handled inside executeCreateWorkOrders (mutateAsync + await per item).
  // We keep the mutation-level handlers for toast + dialog cleanup only on
  // the (now-unlikely) path where mutateAsync in the loop doesn't catch.
  const createWOMutation = useFrappeCreate("Work Order", {
    showToast: false,
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

  // 2V P0-6 — Quick BOM fallback: create a minimal single-level BOM via
  // Frappe API when no default BOM exists for a production item.
  const quickBomId = useRef(0);
  const ensureBomNo = useCallback(async (itemCode: string): Promise<string | null> => {
    // Check if a default BOM already exists
    const existingBom = (defaultBOMs ?? []).find((b) => b.item === itemCode);
    if (existingBom) return existingBom.name;

    // Create a minimal Quick BOM
    const id = (quickBomId.current++).toString();
    const bomName = `QBOM-${itemCode}-${id}`;
    try {
      const res = await fetch("/api/resource/BOM", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: itemCode,
          name: bomName,
          is_default: 1,
          quantity: 1,
          company: getActiveCompany(),
          items: [], // no raw materials — minimal BOM
          operations: [],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to create Quick BOM");
      }
      const data = await res.json();
      const createdName = data?.data?.name ?? data?.name ?? bomName;
      toast.success(`Quick BOM created for ${itemCode}`, {
        description: `A minimal BOM (${createdName}) was auto-created.`,
      });
      return createdName;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Quick BOM failed for ${itemCode}: ${msg}`);
      return null;
    }
  }, [defaultBOMs]);

  const executeCreateWorkOrders = useCallback(async () => {
    const mapping = getAutoFillMapping("Sales Order", "Work Order");
    if (!mapping) return;

    // 2T §2 T1 — Fetch warehouse defaults so the FG warehouse is always
    // available. This unblocks SO→WO creation without requiring the user
    // to manually set warehouses on every SO line item.
    const whDefaults = await fetchWarehouseDefaults();

    const soData = order as unknown as Record<string, unknown>;
    const errors: string[] = [];
    let created = 0;

    for (const item of woToCreate) {
      // 2V P0-6 — Quick BOM fallback: when no default BOM exists, create
      // a minimal one instead of failing.
      let bomNo: string | undefined | null = (defaultBOMs ?? []).find((b) => b.item === item.item_code)?.name;
      if (!bomNo) {
        bomNo = await ensureBomNo(item.item_code);
      }
      if (!bomNo) {
        errors.push(`${item.item_code}: No BOM available`);
        continue;
      }

      const header = applyAutoFill(soData, mapping);

      // 2T §2 T2 — Resolve fg_warehouse: prefer item warehouse, then SO-level
      // set_warehouse, then the system-wide default from T1 settings.
      const fgWarehouse =
        item.warehouse ||
        (soData.set_warehouse as string) ||
        whDefaults.fgWarehouse ||
        "";
      const wipWarehouse = whDefaults.wipWarehouse || "";

      if (!fgWarehouse) {
        errors.push(`${item.item_code}: No finished-goods warehouse set`);
        continue;
      }

      const woPayload = {
        ...header,
        production_item: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        fg_warehouse: fgWarehouse,
        wip_warehouse: wipWarehouse,
        sales_order: name,
        bom_no: bomNo,
        company: getActiveCompany(),
        naming_series: "MFG-WO-.YYYY.-",
        planned_start_date: (order?.delivery_date as string) || new Date().toISOString().split("T")[0],
        skip_transfer: 1,
      };

      try {
        await createWOMutation.mutateAsync(woPayload);
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${item.item_code}: ${msg}`);
      }
    }

    // Show summary — all good, partial, or all failed
    if (created === woToCreate.length) {
      toast.success(`${created} Work Order(s) created successfully`);
    } else if (created > 0) {
      toast.warning(`Created ${created} of ${woToCreate.length} Work Order(s)`, {
        description: errors.join(" · "),
      });
    } else {
      showError({
        code: "MUTATION_FAILURE",
        title: "Could not create any Work Orders",
        explanation: "All items failed validation or the ERPNext API rejected the payload.",
        details: errors,
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
    }

    // Refetch so the newly created drafts appear in the Manufacturing card
    // (and the "View Work Orders" affordance) without a page reload.
    if (created > 0) await refetchWO();

    setConfirmCreateWO(false);
  }, [order, name, woToCreate, defaultBOMs, createWOMutation, showError, router, refetchWO, ensureBomNo]);

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
    isSubmitted && (workOrders && workOrders.length > 0) && {
      label: "View Work Orders",
      description: `${workOrders.length} Work Order(s) linked`,
      onClick: () => router.push(`/manufacturing/work-order/${encodeURIComponent(workOrders[0].name)}`),
    },
    isSubmitted && (!workOrders || workOrders.length === 0) && {
      label: "Create Work Orders",
      description: "Auto-create one draft Work Order per line item",
      onClick: handleCreateWorkOrders,
      disabled: !isModuleBuilt("Work Order"),
      disabledReason: "Work Order module not yet available",
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
            <PrintShare doctype="Sales Order" name={order.name} />
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
          </div>
        }
      />

      {/* Flow Tracker — unified resolution (2N Part 1.1) */}
      {/* 2V P0-6 — draft SO disables create affordance; submitted SO intercepts
          the WO create to use the inline multi-create engine. */}
      <InfoCard title="Lead-to-Cash Flow" className="overflow-hidden">
        <FlowRail
          result={chain}
          currentDocName={name}
          sourceDoctype="Sales Order"
          isLoading={chainLoading}
          disableCreate={isDraft ? "Submit the Sales Order first" : undefined}
          onCreateDownstream={isSubmitted ? (targetDoctype) => {
            if (targetDoctype === "Work Order") handleCreateWorkOrders();
          } : undefined}
        />
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

          {/* 2U §P0 — Manufacturing cockpit. The Sales Order is the master doc:
              create Work Orders inline, submit each (ERPNext spawns Job Cards
              for routed operations), and assign employees to those Job Cards. */}
          {isSubmitted && (
            <InfoCard
              title="Manufacturing"
              icon={<Factory className="h-5 w-5 text-emerald-500" />}
            >
              {workOrders && workOrders.length > 0 && (
                <div className="-mt-2 mb-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateWorkOrders}
                    disabled={createWOMutation.isPending}
                  >
                    <Wrench className="mr-1.5 h-4 w-4" /> Create More
                  </Button>
                </div>
              )}
              {/* Work Orders */}
              {loadingWO ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading Work Orders…
                </div>
              ) : !workOrders || workOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No Work Orders yet. Create one draft per line item to start production.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={handleCreateWorkOrders}
                    disabled={createWOMutation.isPending}
                  >
                    {createWOMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Wrench className="mr-1.5 h-4 w-4" />
                    )}
                    Create Work Orders
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {workOrders.map((wo) => {
                    const isWoDraft = wo.docstatus === 0;
                    return (
                      <div
                        key={wo.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/manufacturing/work-order/${encodeURIComponent(wo.name)}`}
                            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                          >
                            {wo.name}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {wo.production_item}
                            {wo.qty ? ` · ${wo.qty} unit(s)` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={wo.status} />
                          {isWoDraft && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSubmitWorkOrder(wo.name)}
                              disabled={submittingWO === wo.name}
                            >
                              {submittingWO === wo.name ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-1.5 h-4 w-4" />
                              )}
                              Submit
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Job Cards — appear once a routed Work Order is submitted */}
              {jobCards && jobCards.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-semibold text-foreground">Job Cards</h4>
                    <span className="text-xs text-muted-foreground">
                      ({jobCards.length}) — assign an employee to each
                    </span>
                  </div>
                  <div className="space-y-2">
                    {jobCards.map((jc) => {
                      const assigned = (jc.employee ?? [])
                        .map((r) => r.employee_name || r.employee)
                        .filter(Boolean) as string[];
                      return (
                        <div
                          key={jc.name}
                          className="rounded-xl border border-border/60 bg-card px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/manufacturing/job-card/${encodeURIComponent(jc.name)}`}
                                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                              >
                                {jc.operation || jc.name}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </Link>
                              <p className="truncate text-xs text-muted-foreground">
                                {jc.work_order}
                                {jc.workstation ? ` · ${jc.workstation}` : ""}
                              </p>
                            </div>
                            <StatusBadge status={jc.status ?? "Open"} />
                          </div>
                          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {assigned.length > 0 ? (
                                assigned.map((emp) => (
                                  <span
                                    key={emp}
                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> {emp}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <UserPlus className="h-3 w-3" /> Unassigned
                                </span>
                              )}
                            </div>
                            <div className="sm:ml-auto sm:w-64">
                              <FrappeSelect
                                doctype="Employee"
                                labelField="employee_name"
                                placeholder={
                                  assigningJC === jc.name ? "Assigning…" : "Assign employee…"
                                }
                                disabled={assigningJC === jc.name}
                                onChange={(val, doc) =>
                                  handleAssignEmployee(
                                    jc,
                                    val,
                                    (doc as { label?: string })?.label,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {workOrders && workOrders.length > 0 && (!jobCards || jobCards.length === 0) && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Job Cards appear here once a Work Order with a routed BOM is submitted.
                </p>
              )}
            </InfoCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* 2L 1B: Universal cross-flow actions menu — adjacents from
              flow-adjacency.ts. Renders "View X" when a linked record
              already exists, else "Create X" prefilled. */}
          {/* 2W A1 — disable forward-create rows on a draft SO (no blank
              downstream forms reachable until the SO is submitted). */}
          <CrossFlowActionsMenu
            doctype="Sales Order"
            name={name}
            disableCreate={isDraft ? "Submit the Sales Order first" : undefined}
          />
          <WhatsNext actions={whatsNext} />
          {isSubmitted && workOrders && workOrders.length > 0 && (
            <InfoCard title="Linked Work Orders">
              <div className="space-y-2">
                {workOrders.map((wo) => (
                  <div key={wo.name} className="flex items-center justify-between">
                    <Link
                      href={`/manufacturing/work-order/${encodeURIComponent(wo.name)}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {wo.name}
                    </Link>
                    <StatusBadge status={wo.status} />
                  </div>
                ))}
              </div>
            </InfoCard>
          )}
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
