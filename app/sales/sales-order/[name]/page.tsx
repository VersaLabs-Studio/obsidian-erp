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
  Trash2,
  Printer,
  Loader2,
  Package,
  Factory,
  Wrench,
  CheckCircle2,
  UserPlus,
  ExternalLink,
  Play,
  Square,
  Cog,
  Truck,
  Receipt,
  DollarSign,
  Wallet,
} from "lucide-react";

import { PageHeader, LoadingState, ConfirmDialog } from "@/components/smart";
import { StatusBadge } from "@/components/smart/status-badge";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrintShare } from "@/components/ui/print-share";
import { PrintMenu } from "@/components/print/PrintMenu";
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
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeCreate, useFrappeOptions } from "@/hooks/generic";
import { useJobCardLifecycle, type JobCardLifecycle } from "@/hooks/manufacturing/use-job-card-lifecycle";
import { FrappeSelect } from "@/components/smart/frappe-select";
import { CreateJobCardModal } from "@/components/manufacturing/CreateJobCardModal";
import type { SalesOrder, JobCard, WorkOrder, DeliveryNote, SalesInvoice, PaymentEntry } from "@/types/doctype-types";
import { getDefaultFgWarehouse, resolvePrefillWarehouses } from "@/lib/stock/warehouse-defaults";
import { cn } from "@/lib/utils";
// 2Y-R5 P7 — invalidate flow-resolve caches when JC/WO lifecycle changes
// may advance the FlowRail.
import { useQueryClient } from "@tanstack/react-query";

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
  // 2Z D2 — one-click Deliver & Invoice (server-side DN→SI chain).
  const [confirmFulfill, setConfirmFulfill] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fsNumber, setFsNumber] = useState("");
  const [fulfilling, setFulfilling] = useState(false);
  const [woToCreate, setWoToCreate] = useState<Array<{ item_code: string; item_name?: string; qty: number; warehouse?: string }>>([]);
  // 2Y-R3 — create additional Job Cards (different operation/workstation)
  // directly from the SO cockpit's Work Order card.
  const [createJCFor, setCreateJCFor] = useState<string | null>(null);
  const { resolution, showError, dismiss } = useGuidedError();
  // 2Y-R5 P7 — the cockpit invalidates flow-resolve caches when a JC/WO
  // lifecycle change may advance the FlowRail stage.
  const queryClient = useQueryClient();

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
  // 2Y-R3 — stabilise the query key so refetchJobCards() invalidates the
  // SAME query instance that the component renders.  Without useMemo the
  // options object is recreated every render, creating a new query key, so
  // refetch() on the stale key never reaches the active query.
  const jobCardListOptions = useMemo(
    () => ({
      filters: [["work_order", "in", linkedWONames.length ? linkedWONames : ["__none__"]] as [string, string, unknown]],
      // 2Y-R2 P0 — parent columns ONLY. `employee`/`time_logs` are child
      // tables; requesting them here 500s. Child data is read from the full
      // doc via useFrappeDoc in JobCardCard.
      fields: ["name", "status", "operation", "work_order", "workstation", "for_quantity"],
      limit: 100,
    }),
    [linkedWONames],
  );
  const { data: jobCards, refetch: refetchJobCards } =
    useFrappeList<JobCard>(
      "Job Card",
      jobCardListOptions,
      { enabled: linkedWONames.length > 0 },
    );

  // -- Deliveries: linked Delivery Notes (DN Item.against_sales_order) -------
  // v4.2 — the SO cockpit surfaces the created DN(s) so the sales user can
  // one-click print the GATE PASS or CUSTOMER COPY right from the cockpit
  // (after production is complete → Deliver & Invoice).
  const { data: deliveryNotes, refetch: refetchDeliveryNotes } =
    useFrappeList<DeliveryNote>(
      "Delivery Note",
      {
        filters: [["Delivery Note Item", "against_sales_order", "=", name]],
        fields: ["name", "status", "posting_date", "grand_total", "currency", "docstatus"],
        orderBy: { field: "posting_date", order: "desc" },
        limit: 20,
      },
      { enabled: !isLoading && !!order },
    );

  // -- Billing: linked Sales Invoices (SI Item.sales_order) ------------------
  const { data: salesInvoices, refetch: refetchSalesInvoices } =
    useFrappeList<SalesInvoice>(
      "Sales Invoice",
      {
        filters: [["Sales Invoice Item", "sales_order", "=", name]],
        // 2Z-R7b — docstatus is REQUIRED by the Mark-Paid gating
        // (outstandingInvoices filter): without it every row read
        // docstatus === undefined and the Payment button showed
        // "Nothing to pay" even with unpaid invoices.
        fields: ["name", "status", "docstatus", "posting_date", "due_date", "grand_total", "outstanding_amount", "currency"],
        orderBy: { field: "posting_date", order: "desc" },
        limit: 20,
      },
      { enabled: !isLoading && !!order },
    );

  // -- Payments: Payment Entries referencing THIS order's invoices -----------
  // PE links to an SO only indirectly — via the Payment Entry Reference child
  // table pointing at one of the linked Sales Invoices. So we resolve the
  // invoice names first, then fetch the PEs that paid them.
  const linkedSINames = useMemo(
    () => (salesInvoices ?? []).map((s) => s.name),
    [salesInvoices],
  );
  const { data: paymentEntries } =
    useFrappeList<PaymentEntry>(
      "Payment Entry",
      {
        filters: [
          ["Payment Entry Reference", "reference_doctype", "=", "Sales Invoice"],
          ["Payment Entry Reference", "reference_name", "in", linkedSINames.length ? linkedSINames : ["__none__"]],
        ],
        fields: ["name", "status", "posting_date", "payment_type", "mode_of_payment", "paid_amount"],
        orderBy: { field: "posting_date", order: "desc" },
        limit: 20,
      },
      { enabled: linkedSINames.length > 0 },
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
            // 2Y-R6 — AUTO-START: submitting a WO generates its Job Cards, so
            // the operator's next manual step was always "Start Production"
            // (Material Transfer SE). Chain it immediately. Best-effort: if
            // auto-start fails (e.g. insufficient stock), the WO stays
            // submitted and Start remains available manually.
            let startNote = "Job Cards are generated for each routed operation.";
            try {
              const res = await fetch(
                `/api/manufacturing/work-order/${encodeURIComponent(woName)}/start`,
                { method: "POST" },
              );
              const d = await res.json().catch(() => ({}));
              if (!res.ok || !d?.success) {
                throw new Error(
                  d?.details || d?.error || "Auto-start failed",
                );
              }
              startNote =
                d?.message ||
                "Started automatically — materials transferred to WIP.";
            } catch (e) {
              toast.warning(`Work Order ${woName} submitted — auto-start failed`, {
                description: `${
                  e instanceof Error ? e.message : "Unknown error"
                } — use Start Production when ready.`,
              });
            }
            toast.success(`Work Order ${woName} submitted`, {
              description: startNote,
            });
            await Promise.all([refetchWO(), refetchJobCards()]);
            queryClient.invalidateQueries({ queryKey: ["Work Order"], refetchType: "all" });
            queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
            setSubmittingWO(null);
          },
          onError: (err) => {
            setSubmittingWO(null);
            showError(resolveFrappeError(err, { doctype: "Work Order" }));
          },
        },
      );
    },
    [submitWOMutation, refetchWO, refetchJobCards, queryClient, showError],
  );

  // Assign an employee to a Job Card. Job Card's `employee` is a Table
  // MultiSelect child table — each row carries one `employee` link. We union
  // the selected employee with any already assigned and write the rows back.
  // 2Y-R2 P0/P3 — shared lifecycle hook. Reads child data (employee/time_logs)
  // from the FULL doc, never from the get_list row above (child fields 500).
  // On any JC change we refetch both the JC list and the WO list (so the
  // "Complete Work Order" affordance updates when all JCs are done).
  const onJcChanged = useCallback(() => {
    refetchJobCards();
    refetchWO();
    // 2Y-R5 P7 — once a JC completes, the FlowRail stage statuses (e.g. the
    // manufacturing stage) can advance too; drop the resolve cache so the
    // rail refetches alongside the lists above. (Job Card / Work Order
    // doctype-prefix invalidation lives in useJobCardLifecycle itself.)
    queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
  }, [refetchJobCards, refetchWO, queryClient]);
  const jcLifecycle = useJobCardLifecycle(onJcChanged, showError);

  // 2Y-R3 — Employee name lookup so the cockpit shows names, not IDs.
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



  // 2Y-R5 — Complete WO inline: when all JCs for a WO are completed, the
  // operator can finish the WO from the cockpit. This now POSTs the dedicated
  // /complete lifecycle route, which builds + submits ERPNext's own
  // "Manufacture" Stock Entry (the desk "Finish" button's exact path). The
  // previous generic PUT { status: "Completed" } was rejected by ERPNext with
  // UpdateAfterSubmitError — direct status writes are blocked post-submit.
  const [completingWO, setCompletingWO] = useState<string | null>(null);

  const handleCompleteWO = useCallback(
    async (woName: string) => {
      setCompletingWO(woName);
      try {
        const res = await fetch(
          `/api/manufacturing/work-order/${encodeURIComponent(woName)}/complete`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.details || data?.error || "Failed to complete Work Order",
          );
        }
        toast.success(`Work Order ${woName} completed`, {
          description:
            data?.message || "Finished goods have been declared via Stock Entry.",
        });
        await refetchWO();
        queryClient.invalidateQueries({ queryKey: ["Work Order"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
      } catch (err) {
        showError(resolveFrappeError(err, { doctype: "Work Order" }));
      } finally {
        setCompletingWO(null);
      }
    },
    [refetchWO, queryClient, showError],
  );

  // 2Y-R3 — Start WO: call ERPNext's start_work method (direct PATCH on
  // status is rejected by ERPNext's validation).
  const [startingWO, setStartingWO] = useState<string | null>(null);

  const handleStartWO = useCallback(
    async (woName: string) => {
      setStartingWO(woName);
      try {
        const res = await fetch(
          `/api/manufacturing/work-order/${encodeURIComponent(woName)}/start`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.details || data?.error || "Failed to start Work Order",
          );
        }
        toast.success(`Work Order ${woName} started`, {
          description: data?.message || "Production is now in progress.",
        });
        await refetchWO();
        queryClient.invalidateQueries({ queryKey: ["Work Order"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
      } catch (err) {
        showError(resolveFrappeError(err, { doctype: "Work Order" }));
      } finally {
        setStartingWO(null);
      }
    },
    [refetchWO, showError],
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
    // 5.1-A — write ONLY docstatus; ERPNext derives "To Deliver and Bill"
    // on submit (2Y-R5 lesson: hand-writing derived statuses invites
    // mismatches — same fix as the PO submit).
    updateMutation.mutate(
      { name, data: { docstatus: 1 } },
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

  // F1 — Destructive actions: Delete requires confirmation.
  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/sales/sales-order/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Sales Order deleted");
        router.push("/sales/sales-order");
      } else {
        const body = await res.json().catch(() => ({}));
        showError(resolveFrappeError(body, { doctype: "Sales Order" }));
      }
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Sales Order" }));
    }
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

  // 2V P0-6 / 2Y-R3 — Quick BOM fallback: when no default BOM exists for a
  // production item, ask the server to build + SUBMIT a real one (default
  // recipe from the configurator option-sets, placeholder RM otherwise).
  // The old client-side `POST /api/resource/BOM` 404'd (Next namespace) and
  // produced an item-less draft ERPNext could never use.
  const ensureBomNo = useCallback(async (itemCode: string): Promise<string | null> => {
    // Check if a default BOM already exists
    const existingBom = (defaultBOMs ?? []).find((b) => b.item === itemCode);
    if (existingBom) return existingBom.name;

    try {
      const res = await fetch("/api/manufacturing/bom/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_code: itemCode, company: getActiveCompany() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.details || data?.error || "Failed to create Quick BOM");
      }
      const createdName: string | null = data?.data?.name ?? null;
      if (!createdName) throw new Error("Quick BOM returned no name");
      if (data?.data?.created) {
        toast.success(`Quick BOM created for ${itemCode}`, {
          description: data?.message ?? `BOM ${createdName} was auto-created and submitted.`,
        });
      }
      return createdName;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Quick BOM failed for ${itemCode}: ${msg}`);
      return null;
    }
  }, [defaultBOMs]);

  // 2Z D2 — Deliver & Invoice: ONE server call chains ERPNext's own SO→DN
  // and DN→SI mappers and submits both docs. The optional FS No stamps the
  // client-mandated fiscal serial (pana_fs_number) on the invoice before it
  // is submitted. The wizard path ("Delivery Note (advanced)") remains for
  // partial deliveries and manual review.
  const handleFulfill = useCallback(async () => {
    setFulfilling(true);
    try {
      const res = await fetch(
        `/api/sales/sales-order/${encodeURIComponent(name)}/fulfill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fs_number: fsNumber.trim() || undefined }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        const si = data?.data?.sales_invoice as string | null;
        toast.success("Order delivered and invoiced", {
          description: `Delivery Note ${data?.data?.delivery_note}${si ? ` · Sales Invoice ${si}` : ""}`,
          action: si
            ? {
                label: "View Invoice",
                onClick: () =>
                  router.push(`/accounting/sales-invoice/${encodeURIComponent(si)}`),
              }
            : undefined,
        });
        setConfirmFulfill(false);
        setFsNumber("");
        // v4.2 — refresh the Deliveries + Billing panels so the created DN
        // (with its gate-pass print) and the invoice appear immediately.
        await Promise.all([refetchDeliveryNotes(), refetchSalesInvoices()]);
        // 2Z-R7 — repaint everything downstream of fulfilment: the FlowRail
        // (its resolve cache is 5-min stale by design), the SO header status /
        // billing %, and any mounted full-doc queries for DNs/SIs. Without
        // this the rail kept its pre-fulfilment stage statuses until a manual
        // refresh.
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
        queryClient.invalidateQueries({ queryKey: ["Sales Order"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Delivery Note"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Sales Invoice"], refetchType: "all" });
      } else if (data?.data?.delivery_note) {
        // Partial: the DN submitted but invoicing failed — never lose the DN.
        toast.warning(`Delivered as ${data.data.delivery_note}, but invoicing failed`, {
          description:
            data?.details || data?.error || "Create the invoice from the Delivery Note.",
        });
        setConfirmFulfill(false);
        await refetchDeliveryNotes();
      } else {
        toast.error("Deliver & Invoice failed", {
          description: data?.details || data?.error || "Unknown error",
        });
      }
    } catch (err) {
      toast.error("Deliver & Invoice failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setFulfilling(false);
    }
  }, [name, fsNumber, router, refetchDeliveryNotes, refetchSalesInvoices, queryClient]);

  // 2Z-R7 — Inline "Mark Paid": create + submit a Payment Entry against an
  // outstanding invoice WITHOUT leaving the cockpit. Uses the existing
  // /api/accounting/payment/quick route (ERPNext's own get_payment_entry
  // mapper). The previous Payment button was a redirect to the PE wizard.
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  // Outstanding invoices drive the inline Mark-Paid / Payment action. Kept
  // ABOVE the early returns — hooks must not sit behind conditional returns.
  const outstandingInvoices = useMemo(
    () =>
      (salesInvoices ?? []).filter(
        (si) => si.docstatus === 1 && Number(si.outstanding_amount ?? 0) > 0.005,
      ),
    [salesInvoices],
  );

  const handleQuickPayment = useCallback(
    async (invoiceName?: string) => {
      const target = invoiceName ?? outstandingInvoices[0]?.name;
      if (!target) {
        toast.info("No outstanding invoices to pay for this order.");
        return;
      }
      setPayingInvoice(target);
      try {
        const res = await fetch("/api/accounting/payment/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice: target }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.details || data?.error || "Failed to record payment",
          );
        }
        toast.success(`Payment recorded against ${target}`, {
          description: data?.message,
        });
        await refetchSalesInvoices();
        queryClient.invalidateQueries({ queryKey: ["Payment Entry"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Sales Invoice"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Sales Order"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
      } catch (err) {
        showError(resolveFrappeError(err, { doctype: "Payment Entry" }));
      } finally {
        setPayingInvoice(null);
      }
    },
    [outstandingInvoices, refetchSalesInvoices, queryClient, showError],
  );

  const executeCreateWorkOrders = useCallback(async () => {
    const mapping = getAutoFillMapping("Sales Order", "Work Order");
    if (!mapping) return;

    // 2T §2 T1 / 2Y-R2 P5 — Warehouses are fully implicit in the SO cockpit.
    // Use the canonical-fallback resolver (saved settings → computed company
    // warehouses) rather than the saved-only reader: when a tenant never saved
    // a warehouse-defaults record, the saved-only path returns blanks and
    // ERPNext rejects the Work Order with "Target Warehouse is mandatory".
    // `resolvePrefillWarehouses` always yields real, live warehouse names
    // ("Finished Goods - PAN", "Work In Progress - PAN", …), keeping warehouse
    // selection automated and invisible to the user.
    const wh = await resolvePrefillWarehouses();

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

      // 2T §2 T2 / 2Y-R2 P5 — Implicit warehouse resolution. Prefer an explicit
      // line/SO warehouse when one exists, else fall back to the resolved
      // company defaults. wip and source each fall back to fg so NONE of the
      // three can ever be empty — the Work Order is always submittable without
      // the user ever touching a warehouse field.
      const fgWarehouse =
        item.warehouse || (soData.set_warehouse as string) || wh.fg || "";
      const wipWarehouse = wh.wip || fgWarehouse;
      const sourceWarehouse = wh.source || wh.stores || fgWarehouse;

      if (!fgWarehouse) {
        // Canonical resolution failed entirely — a tenant-provisioning gap,
        // not a per-item omission. Surface it once with the real cause.
        errors.push(`${item.item_code}: warehouses not provisioned for this company`);
        continue;
      }

      const woPayload = {
        ...header,
        production_item: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        fg_warehouse: fgWarehouse,
        wip_warehouse: wipWarehouse,
        source_warehouse: sourceWarehouse,
        sales_order: name,
        bom_no: bomNo,
        company: getActiveCompany(),
        naming_series: "MFG-WO-.YYYY.-",
        planned_start_date: (order?.delivery_date as string) || new Date().toISOString().split("T")[0],
        skip_transfer: 1,
      };

      try {
        const result = (await createWOMutation.mutateAsync(woPayload)) as {
          data?: { name?: string };
          name?: string;
        } | null;
        created++;
        // 2Z D1 — Work Orders are born SUBMITTED. The draft state + per-WO
        // Submit click was pure ceremony for the SME happy path: the payload
        // is already complete (BOM, warehouses, qty all auto-resolved). If
        // the submit fails the WO stays draft and the existing per-WO Submit
        // affordance in the Manufacturing card still covers it.
        const createdName = result?.data?.name ?? result?.name;
        if (createdName) {
          try {
            await submitWOMutation.mutateAsync({
              name: createdName,
              data: { docstatus: 1 },
            });
          } catch (submitErr) {
            const msg =
              submitErr instanceof Error ? submitErr.message : String(submitErr);
            errors.push(`${item.item_code}: created as draft (submit failed: ${msg})`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${item.item_code}: ${msg}`);
      }
    }

    // Show summary — all good, partial, or all failed
    if (created === woToCreate.length && errors.length === 0) {
      toast.success(`${created} Work Order(s) created and submitted`, {
        description: "Ready to start production.",
      });
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
  }, [order, name, woToCreate, defaultBOMs, createWOMutation, submitWOMutation, showError, router, refetchWO, ensureBomNo]);

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

  // v4.2 — production-readiness hint for the Deliveries panel: manufacturing
  // must finish before the goods are in stock to deliver. Non-blocking — the
  // Deliver & Invoice action stays available for partial/early fulfilment.
  const productionPending =
    (workOrders ?? []).length > 0 &&
    workOrders!.some((wo) => wo.status !== "Completed");

  // 2Z-R7 — fulfilment state: when a submitted DN AND a submitted SI both
  // exist, the one-click Deliver & Invoice action is marked as done (relabelled
  // "…more") so the operator can see at a glance the order has been fulfilled,
  // while the action stays available for additional/partial deliveries.
  const hasSubmittedDN = (deliveryNotes ?? []).some((d) => d.docstatus === 1);
  const hasSubmittedSI = (salesInvoices ?? []).some((s) => s.docstatus === 1);
  const deliveredAndInvoiced = hasSubmittedDN && hasSubmittedSI;

  // What's-Next actions — real where wired, disabled (with reason) otherwise.
  const whatsNext = [
    isDraft && {
      label: "Submit Order",
      description: "Lock the order and enable fulfillment",
      onClick: handleSubmit,
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
      label: deliveredAndInvoiced
        ? "Deliver & Invoice more"
        : "Deliver & Invoice",
      description: deliveredAndInvoiced
        ? "✓ Already delivered & invoiced — use for an additional delivery"
        : "One click: deliver the goods and raise the invoice",
      onClick: handleFulfill,
      disabled: !isModuleBuilt("Delivery Note"),
      disabledReason: "Delivery Note module not available",
      // 2Z-R7 — visible loading feed while the server builds + submits the
      // DN→SI chain (previously silent until completion).
      isLoading: fulfilling,
    },
    isSubmitted && {
      label: "Delivery Note (advanced)",
      description: "Partial delivery or manual review via the wizard",
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
            <PrintMenu
              doctype="Sales Order"
              doc={order as unknown as Record<string, unknown>}
            />
            <PrintShare doctype="Sales Order" name={order.name} showPrint={false} />
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sales/sales-order/${encodeURIComponent(name)}/edit`}>
                    <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
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
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                >
                  <Ban className="mr-1.5 h-4 w-4" /> Cancel
                </Button>
                {isDraft && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                )}
              </>
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
                <div className="space-y-3">
                  {workOrders.map((wo) => (
                    <LinkedWOCard
                      key={wo.name}
                      wo={wo}
                      jobCards={jobCards ?? []}
                      submittingWO={submittingWO}
                      completingWO={completingWO}
                      startingWO={startingWO}
                      onSubmitWorkOrder={handleSubmitWorkOrder}
                      onStartWorkOrder={handleStartWO}
                      onCompleteWorkOrder={handleCompleteWO}
                      onJobCardCreated={refetchJobCards}
                    />
                  ))}
                </div>
              )}

              {/* Job Cards — appear once a routed Work Order is submitted */}
              {/* 2Y Part 3 — Enhanced: workstation assignment + Start/Complete inline */}
              {jobCards && jobCards.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-semibold text-foreground">Job Cards</h4>
                    <span className="text-xs text-muted-foreground">
                      ({jobCards.length}) — assign workstation + employee, then start
                    </span>
                  </div>
                  <div className="space-y-2">
                    {jobCards.map((jc) => (
                      <JobCardCard key={jc.name} jc={jc} lifecycle={jcLifecycle} employeeNameMap={employeeNameMap} />
                    ))}
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

          {/* v4.2 — Deliveries: one-click DN after production completes, with
              GATE PASS / CUSTOMER COPY printing right from the cockpit. */}
          {isSubmitted && (
            <InfoCard
              title="Deliveries"
              icon={<Truck className="h-5 w-5 text-blue-500" />}
            >
              {productionPending && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Production is still in progress. Deliver once the Work
                    Orders are Completed so the finished goods are in stock.
                  </span>
                </div>
              )}
              {!deliveryNotes || deliveryNotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No deliveries yet. One click creates and submits a Delivery
                    Note (and optionally the invoice) for all line items.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleFulfill}
                      disabled={fulfilling}
                    >
                      {fulfilling ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Package className="mr-1.5 h-4 w-4" />
                      )}
                      Deliver & Invoice
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/stock/delivery-note/new?sales_order=${encodeURIComponent(name)}`,
                        )
                      }
                    >
                      Delivery Note (advanced)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {deliveryNotes.map((dn) => (
                    <LinkedDNRow
                      key={dn.name}
                      dn={dn}
                      href={`/stock/delivery-note/${encodeURIComponent(dn.name)}`}
                    />
                  ))}
                </div>
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

          {/* v4.2 — Billing & Payments: create invoices / payment entries and
              check their status right from the SO cockpit. */}
          {isSubmitted && (
            <InfoCard
              title="Billing & Payments"
              icon={<DollarSign className="h-4 w-4" />}
            >
              <div className="mb-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <Link
                    href={`/accounting/sales-invoice/new?sales_order=${encodeURIComponent(name)}`}
                  >
                    <Receipt className="mr-1.5 h-4 w-4" /> Invoice
                  </Link>
                </Button>
                {/* 2Z-R7 — Payment now settles the oldest outstanding invoice
                    INLINE (quick PE route) instead of redirecting to the PE
                    wizard. Disabled with a hint when nothing is outstanding. */}
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleQuickPayment()}
                  disabled={outstandingInvoices.length === 0 || payingInvoice !== null}
                >
                  {payingInvoice ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="mr-1.5 h-4 w-4" />
                  )}
                  {outstandingInvoices.length === 0 ? "Nothing to pay" : "Mark Paid"}
                </Button>
              </div>

              {/* Linked Sales Invoices */}
              <div className="mb-4">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Invoices
                </p>
                {salesInvoices && salesInvoices.length > 0 ? (
                  <div className="space-y-1.5">
                    {salesInvoices.map((si) => {
                      const siOutstanding = Number(si.outstanding_amount ?? 0);
                      const canPay = si.docstatus === 1 && siOutstanding > 0.005;
                      return (
                        <div
                          key={si.name}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/10 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/accounting/sales-invoice/${encodeURIComponent(si.name)}`}
                              className="block truncate text-sm font-medium text-primary hover:underline"
                            >
                              {si.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {ETB.format(si.grand_total ?? 0)}
                              {siOutstanding ? (
                                <span className="ml-1 text-amber-600 dark:text-amber-400">
                                  · {ETB.format(siOutstanding)} outstanding
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {/* 2Z-R7 — one-click settle per invoice. */}
                            {canPay && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleQuickPayment(si.name)}
                                disabled={payingInvoice !== null}
                              >
                                {payingInvoice === si.name ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Wallet className="mr-1 h-3 w-3" />
                                )}
                                Mark Paid
                              </Button>
                            )}
                            <StatusBadge status={si.status ?? ""} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/50 px-3 py-3 text-center text-xs text-muted-foreground">
                    No invoices yet — create one above or use Deliver &amp; Invoice.
                  </p>
                )}
              </div>

              {/* Linked Payment Entries */}
              <div>
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payments
                </p>
                {paymentEntries && paymentEntries.length > 0 ? (
                  <div className="space-y-1.5">
                    {paymentEntries.map((pe) => (
                      <div
                        key={pe.name}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/10 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/accounting/payment-entry/${encodeURIComponent(pe.name)}`}
                            className="block truncate text-sm font-medium text-primary hover:underline"
                          >
                            {pe.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {ETB.format(pe.paid_amount ?? 0)}
                            {pe.mode_of_payment
                              ? ` · ${pe.mode_of_payment}`
                              : ""}
                          </p>
                        </div>
                        <StatusBadge status={pe.status ?? ""} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/50 px-3 py-3 text-center text-xs text-muted-foreground">
                    No payments recorded against this order&apos;s invoices yet.
                  </p>
                )}
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
        description={`${woToCreate.length} Work Order(s) will be created and submitted for Sales Order ${name} — ready to start production. Each line item becomes a separate Work Order.`}
        confirmText="Create Work Orders"
        onConfirm={executeCreateWorkOrders}
        loading={createWOMutation.isPending || submitWOMutation.isPending}
      />
      <ConfirmDialog
        open={confirmFulfill}
        onOpenChange={(open) => {
          setConfirmFulfill(open);
          if (!open) setFsNumber("");
        }}
        title="Deliver & Invoice this order?"
        description={`Creates and submits a Delivery Note and a Sales Invoice for ${items.length} item(s) — total ${ETB.format(grandTotal)}. Finished goods must be in stock (finish production first).`}
        confirmText="Deliver & Invoice"
        onConfirm={handleFulfill}
        loading={fulfilling}
      >
        <div className="space-y-1.5 pt-1">
          <label htmlFor="fulfill-fs-number" className="text-sm font-medium">
            FS No{" "}
            <span className="font-normal text-muted-foreground">
              (fiscal serial — optional, editable later)
            </span>
          </label>
          <Input
            id="fulfill-fs-number"
            value={fsNumber}
            onChange={(e) => setFsNumber(e.target.value)}
            placeholder="e.g. FS-0001234"
          />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Sales Order?"
        description={`Are you sure you want to delete "${order.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// JobCardCard — one Job Card card in the SO cockpit "Manufacturing" panel.
// 2Y-R2 P0/P3: fetches the FULL Job Card doc (incl. employee/time_logs child
// tables) via useFrappeDoc. The parent get_list row only carries parent
// columns, so child data MUST come from the full doc or the list 500s.
// ---------------------------------------------------------------------------
function JobCardCard({
  jc,
  lifecycle,
  employeeNameMap,
}: {
  jc: JobCard;
  lifecycle: JobCardLifecycle;
  employeeNameMap?: Record<string, string>;
}) {
  const { data: fullJc, isLoading } = useFrappeDoc<JobCard>("Job Card", jc.name, {
    // 2Y-R5 P7 — operational card: status/buttons/complete-all derive from
    // live state, so never serve a stale cached full doc (a JC completed on
    // another screen would paint "Work In Progress" for up to 60s).
    staleTime: 0,
  });
  // Fall back to the parent-row shape while the full doc loads.
  const doc = fullJc ?? jc;

  const assignedRows = (Array.isArray(doc.employee) ? doc.employee : []) as Array<{
    employee?: string;
    employee_name?: string;
  }>;
  // Chip labels: prefer the stored employee_name, then the cockpit-wide
  // lookup map, then the raw ID.
  const assigned = assignedRows
    .map((r) => {
      const id = r.employee;
      return r.employee_name || (id && employeeNameMap?.[id]) || id || null;
    })
    .filter(Boolean) as string[];
  // 2Y-R5 P9 — Raw link IDs for the selector's controlled value. FrappeSelect
  // matches `value` against option VALUES (raw Employee IDs); binding the
  // display NAME here never matched, so the select showed its "Employee…"
  // placeholder even when someone was assigned (chip said otherwise).
  const assignedIds = assignedRows
    .map((r) => r.employee)
    .filter(Boolean) as string[];

  // 2Y-R5 P7 — Prefer the LIVE full-doc status once loaded; the parent list
  // row (jc.status) can be stale (1-min staleTime cache), so a JC that was
  // completed on another screen would still paint "Work In Progress" here
  // until the list refetch landed. Falling back to jc.status while loading.
  const jcStatus = (fullJc?.status ?? jc.status) ?? "Open";
  const isOpen = jcStatus === "Open";
  const isInProgress = jcStatus === "Work In Progress";
  const isCompleted = jcStatus === "Completed";
  const busy = lifecycle.activeJc === jc.name;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-3 py-2.5",
        isCompleted ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60",
      )}
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
          <p className="truncate text-xs text-muted-foreground">{jc.work_order}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintMenu
            doctype="Job Card"
            doc={doc as unknown as Record<string, unknown>}
          />
          <StatusBadge status={jcStatus} />
          {isOpen && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => lifecycle.handleStartJob(doc)}
              disabled={busy || isLoading}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              Start
            </Button>
          )}
          {isInProgress && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => lifecycle.handleCompleteJob(doc)}
              disabled={busy || isLoading}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="mr-1.5 h-3.5 w-3.5" />
              )}
              Complete
            </Button>
          )}
        </div>
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
          {jc.workstation ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Cog className="h-3 w-3" /> {jc.workstation}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Cog className="h-3 w-3" /> No workstation
            </span>
          )}
        </div>
        <div className="flex gap-2 sm:ml-auto sm:w-auto">
          {!isCompleted && (
            <div className="w-48">
              <FrappeSelect
                doctype="Workstation"
                placeholder={busy ? "Assigning…" : "Workstation…"}
                disabled={busy || isLoading}
                value={jc.workstation ?? ""}
                onChange={(val) => lifecycle.handleAssignWorkstation(doc, val)}
              />
            </div>
          )}
          {!isCompleted && (
            <div className="w-48">
              <FrappeSelect
                doctype="Employee"
                labelField="employee_name"
                placeholder={busy ? "Assigning…" : "Employee…"}
                disabled={busy || isLoading}
                value={assignedIds[0] ?? ""}
                onChange={(val, sel) =>
                  lifecycle.handleAssignEmployee(doc, val, (sel as { label?: string })?.label)
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkedWOCard — a Work Order card inside the SO cockpit. Fetches the FULL
// Work Order doc so the PrintMenu can render a complete print (the linked
// list row only carries summary columns). 2Y-R3.
// ---------------------------------------------------------------------------
function LinkedWOCard({
  wo,
  jobCards,
  submittingWO,
  completingWO,
  startingWO,
  onSubmitWorkOrder,
  onStartWorkOrder,
  onCompleteWorkOrder,
  onJobCardCreated,
}: {
  wo: LinkedWorkOrder;
  jobCards: JobCard[];
  submittingWO: string | null;
  completingWO: string | null;
  startingWO: string | null;
  onSubmitWorkOrder: (name: string) => void;
  onStartWorkOrder: (name: string) => void;
  onCompleteWorkOrder: (name: string) => void;
  onJobCardCreated?: () => void;
}) {
  const { data: fullWo } = useFrappeDoc<WorkOrder>("Work Order", wo.name, {
    enabled: !!wo.name,
  });
  const [createJCOpen, setCreateJCOpen] = useState(false);
  const isWoDraft = wo.docstatus === 0;
  const isWoCompleted = wo.status === "Completed";
  const isWoNotStarted = !isWoDraft && !isWoCompleted && wo.status === "Not Started";
  const woJCs = jobCards.filter((jc) => jc.work_order === wo.name);
  const allJCsCompleted = woJCs.length > 0 && woJCs.every((jc) => jc.status === "Completed");
  // 2Y-R3 — a Job Card can be created once the WO is submitted (not a draft).
  const canCreateJC = !isWoDraft && !isWoCompleted && !!fullWo;

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
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
          <PrintMenu
            doctype="Work Order"
            doc={(fullWo ?? wo) as unknown as Record<string, unknown>}
          />
          {canCreateJC && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => setCreateJCOpen(true)}
            >
              <Wrench className="mr-1.5 h-4 w-4" />
              Job Card
            </Button>
          )}
          {isWoDraft && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSubmitWorkOrder(wo.name)}
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
          {isWoNotStarted && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
              onClick={() => onStartWorkOrder(wo.name)}
              disabled={startingWO === wo.name}
            >
              {startingWO === wo.name ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Start
            </Button>
          )}
          {!isWoDraft && !isWoCompleted && allJCsCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
              onClick={() => onCompleteWorkOrder(wo.name)}
              disabled={completingWO === wo.name}
            >
              {completingWO === wo.name ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              Complete
            </Button>
          )}
        </div>
      </div>

      {canCreateJC && (
        <CreateJobCardModal
          open={createJCOpen}
          onOpenChange={setCreateJCOpen}
          workOrder={fullWo as WorkOrder}
          onCreated={() => {
            setCreateJCOpen(false);
            onJobCardCreated?.();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkedDNRow — a Delivery Note row inside the SO cockpit "Deliveries" panel.
// v4.2 — fetches the FULL Delivery Note doc (the list row has no `items`
// child table) so the PrintMenu can render a complete CUSTOMER COPY or GATE
// PASS print right from the cockpit, per the SME requirement.
// ---------------------------------------------------------------------------
function LinkedDNRow({ dn, href }: { dn: DeliveryNote; href: string }) {
  const { data: fullDn } = useFrappeDoc<DeliveryNote>("Delivery Note", dn.name, {
    enabled: !!dn.name,
  });
  const doc = (fullDn ?? dn) as unknown as Record<string, unknown>;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-secondary/10 px-3 py-2">
      <div className="min-w-0">
        <Link
          href={href}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {dn.name}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {dn.posting_date ?? "—"} · {ETB.format(dn.grand_total ?? 0)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={dn.status ?? ""} />
        <PrintMenu
          doctype="Delivery Note"
          doc={doc}
          variants={["standard", "gate-pass"]}
        />
      </div>
    </div>
  );
}
