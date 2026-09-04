"use client";

// app/stock/purchase-receipt/[name]/page.tsx
// Obsidian ERP v4.0 — Purchase Receipt Detail (V4 Golden Template)
// Inbound goods from suppliers. Mirrors Delivery Note detail pattern.
// Flow chain: upstream PO, downstream Purchase Invoice.

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import {
  Edit3,
  Send,
  Trash2,
  Ban,
  Loader2,
  Truck,
  Package,
  PackageCheck,
  Receipt,
  Wallet,
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
import { PrintShare } from "@/components/ui/print-share";
import { PrintMenu } from "@/components/print/PrintMenu";
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeDelete } from "@/hooks/generic";
import type { PurchaseReceipt, PurchaseInvoice, PaymentEntry } from "@/types/doctype-types";

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // 4.1 A3 — one-click "Bill" (PR → Purchase Invoice, submitted).
  const [confirmBill, setConfirmBill] = useState(false);
  const [billing, setBilling] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();
  // 4.1-C2 — cache invalidation for the Bill chain (2Z-R7 standard).
  const queryClient = useQueryClient();

  const { data: pr, isLoading, error, refetch } = useFrappeDoc<PurchaseReceipt>(
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
    { filters: [["Purchase Invoice Item", "purchase_receipt", "=", name]] as [string, string, string, unknown][], fields: ["name"], limit: 5 },
    { enabled: !isLoading && !!pr },
  );

  // 2N Part 1.1: unified flow resolution.
  const { result: chain, isLoading: chainLoading } = useFlowChain("Purchase Receipt", name);

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

  const handleConfirmDelete = async () => {
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/stock/purchase-receipt/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Purchase Receipt deleted");
        router.push("/stock/purchase-receipt");
      } else {
        const body = await res.json().catch(() => ({}));
        showError(resolveFrappeError(body, { doctype: "Purchase Receipt" }));
      }
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Purchase Receipt" }));
    }
  };

  // 4.1-C3 — cascade cancel: submitted Purchase Invoices raised from this
  // receipt are cancelled first, then the receipt (ERPNext blocked the bare
  // cancel with "Cancel the linked document first").
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    setConfirmCancel(false);
    setCancelling(true);
    try {
      const res = await fetch(
        `/api/stock/purchase-receipt/${encodeURIComponent(name)}/cancel`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(
          data?.details || data?.error || "Failed to cancel Purchase Receipt",
        );
      }
      toast.success(`Purchase Receipt ${name} cancelled`, {
        description: data?.message,
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["Purchase Receipt"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["Payment Entry"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
    } catch (err) {
      showError(resolveFrappeError(err, { doctype: "Purchase Receipt" }));
    } finally {
      setCancelling(false);
    }
  };

  // 4.1 A3 — one-click bill: build+submit a Purchase Invoice from this receipt
  // via ERPNext's make_purchase_invoice mapper. The PI wizard stays as the
  // advanced path (edit rates, split, partial billing).
  const handleBill = async () => {
    setConfirmBill(false);
    setBilling(true);
    try {
      const res = await fetch(
        `/api/buying/purchase-receipt/${encodeURIComponent(name)}/bill`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success("Vendor bill raised", {
          description: data?.data?.purchase_invoice,
        });
        refetch();
        void refetchInvoices();
        // 4.1-C2 — 2Z-R7 standard: the PR status advances (To Bill →
        // Completed) and the FlowRail's billing stage activates.
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
        queryClient.invalidateQueries({ queryKey: ["Purchase Receipt"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
      } else {
        toast.error(data?.details || data?.error || "Billing failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Billing failed");
    } finally {
      setBilling(false);
    }
  };

  // 4.1-C3 — Quick "Mark Paid" for the vendor bill raised from this receipt
  // (SO-cockpit Mark-Paid parity on the buying side).
  const { data: linkedInvoices, refetch: refetchInvoices } = useFrappeList<PurchaseInvoice>(
    "Purchase Invoice",
    {
      filters: [["Purchase Invoice Item", "purchase_receipt", "=", name]],
      fields: ["name", "status", "docstatus", "grand_total", "outstanding_amount", "currency"],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 20,
    },
    { enabled: isSubmitted },
  );
  const outstandingLinkedInvoices = useMemo(
    () =>
      (linkedInvoices ?? []).filter(
        (inv) =>
          inv.docstatus === 1 && Number(inv.outstanding_amount ?? 0) > 0.005,
      ),
    [linkedInvoices],
  );
  // 4.1-C4 — linked Payment Entries (PE references the PI, not the PR —
  // resolve PI names first, same indirection as the SO cockpit / PO page).
  const linkedPINames = useMemo(
    () => (linkedInvoices ?? []).map((inv) => inv.name),
    [linkedInvoices],
  );
  const { data: linkedPayments } = useFrappeList<PaymentEntry>(
    "Payment Entry",
    {
      filters: [
        ["Payment Entry Reference", "reference_doctype", "=", "Purchase Invoice"],
        ["Payment Entry Reference", "reference_name", "in", linkedPINames.length ? linkedPINames : ["__none__"]],
      ],
      fields: ["name", "status", "docstatus", "posting_date", "payment_type", "mode_of_payment", "paid_amount"],
      orderBy: { field: "posting_date", order: "desc" },
      limit: 20,
    },
    { enabled: linkedPINames.length > 0 },
  );

  // 4.1-C4 — done-state: the receipt is fully billed (a submitted PI exists
  // and nothing is outstanding) → "Bill" action disables with a ✓.
  const hasSubmittedInvoice = (linkedInvoices ?? []).some(
    (inv) => inv.docstatus === 1,
  );
  const fullyBilled = hasSubmittedInvoice && outstandingLinkedInvoices.length === 0;
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  const handleMarkPaid = useCallback(
    async (invoiceName?: string) => {
      const target = invoiceName ?? outstandingLinkedInvoices[0]?.name;
      if (!target) {
        toast.info("No outstanding vendor bills for this receipt.");
        return;
      }
      setPayingInvoice(target);
      try {
        const res = await fetch("/api/accounting/payment/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoice: target, doctype: "Purchase Invoice" }),
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
        queryClient.invalidateQueries({ queryKey: ["Purchase Invoice"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Payment Entry"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["Purchase Receipt"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["flows", "resolve"] });
      } catch (err) {
        showError(resolveFrappeError(err, { doctype: "Purchase Invoice" }));
      } finally {
        setPayingInvoice(null);
      }
    },
    [outstandingLinkedInvoices, queryClient, showError],
  );

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
      onClick: handleSubmit,
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: fullyBilled ? "Bill more (advanced)" : "Bill",
      description: fullyBilled
        ? "✓ Fully billed — advanced billing for extra quantities only"
        : "Raise the vendor bill from this receipt in one click",
      onClick: handleBill,
      isPrimary: !fullyBilled,
      isLoading: billing,
      disabled: fullyBilled || !isModuleBuilt("Purchase Invoice"),
      disabledReason: fullyBilled
        ? "Receipt fully billed"
        : "Module not available",
    },
    isSubmitted && {
      label: "Purchase Invoice (advanced)",
      description: "Edit rates, split, or bill partially",
      onClick: () => router.push(`/accounting/purchase-invoice/new?purchase_receipt=${encodeURIComponent(name)}`),
      disabled: !isModuleBuilt("Purchase Invoice"),
      disabledReason: "Module not available",
    },
    // 4.1-C3 — settle the vendor bill inline (SO-cockpit Mark-Paid parity).
    // 4.1-C4 — hidden once fully paid.
    isSubmitted &&
      outstandingLinkedInvoices.length > 0 && {
        label: "Mark Paid",
        description: `Pay ${outstandingLinkedInvoices[0].name} (${Number(
          outstandingLinkedInvoices[0].outstanding_amount ?? 0,
        ).toFixed(2)}) in one click`,
        onClick: () => void handleMarkPaid(),
        isLoading: payingInvoice !== null,
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
            <PrintMenu doctype="Purchase Receipt" doc={pr as unknown as Record<string, unknown>} />
            <PrintShare doctype="Purchase Receipt" name={pr.name} showPrint={false} />
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/stock/purchase-receipt/${encodeURIComponent(name)}/edit`}>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-1.5 h-4 w-4" />
                  )}
                  Cancel
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* 2U §A — FlowRail below header (golden placement, matches DN/SO/PI/MR) */}
      <InfoCard title="Receipt Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Purchase Receipt" isLoading={chainLoading} />
      </InfoCard>

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
                <tfoot>
                  <tr className="bg-muted/20">
                    <td colSpan={4} className="px-3 py-3 text-right font-bold uppercase text-xs">Grand Total</td>
                    <td className="px-3 py-3 text-right font-bold text-lg text-primary tabular-nums">{ETB.format(grandTotal)}</td>
                  </tr>
                </tfoot>
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

          {/* 4.1-C4 — Billing & Payments panel (SO-cockpit parity): the
              vendor bills raised from this receipt + payments against them,
              with inline Mark Paid. */}
          {isSubmitted && (
            <InfoCard
              title="Billing & Payments"
              icon={<Receipt className="h-4 w-4" />}
            >
              <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Vendor Bills
              </p>
              {linkedInvoices && linkedInvoices.length > 0 ? (
                <div className="space-y-1.5">
                  {linkedInvoices.map((inv) => {
                    const invOutstanding = Number(inv.outstanding_amount ?? 0);
                    const canPay =
                      inv.docstatus === 1 && invOutstanding > 0.005;
                    return (
                      <div
                        key={inv.name}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/10 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/accounting/purchase-invoice/${encodeURIComponent(inv.name)}`}
                            className="block truncate text-sm font-medium text-primary hover:underline"
                          >
                            {inv.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {ETB.format(inv.grand_total ?? 0)}
                            {invOutstanding ? (
                              <span className="ml-1 text-amber-600 dark:text-amber-400">
                                · {ETB.format(invOutstanding)} outstanding
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {canPay && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => void handleMarkPaid(inv.name)}
                              disabled={payingInvoice !== null}
                            >
                              {payingInvoice === inv.name ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Wallet className="mr-1 h-3 w-3" />
                              )}
                              Mark Paid
                            </Button>
                          )}
                          <StatusBadge status={inv.status ?? ""} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    No vendor bills yet.
                  </p>
                  {/* 4.1-C5 — CTA: fire the same Bill mutation from the empty
                      state, per product feedback. */}
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleBill}
                    disabled={billing || fullyBilled}
                  >
                    {billing ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PackageCheck className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Bill this receipt
                  </Button>
                </div>
              )}
              <p className="mb-3 mt-5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Payments
              </p>
              {linkedPayments && linkedPayments.length > 0 ? (
                <div className="space-y-1.5">
                  {linkedPayments.map((pe) => (
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
                          {pe.mode_of_payment ? ` · ${pe.mode_of_payment}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={pe.status ?? ""} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border/50 px-3 py-3 text-center text-xs text-muted-foreground">
                  No payments recorded against this receipt&apos;s bills yet.
                </p>
              )}
            </InfoCard>
          )}

          <InfoCard title="What's Next">
            <WhatsNext actions={whatsNext} />
          </InfoCard>

          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Purchase Receipt" name={name} />

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
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Purchase Receipt?"
        description="Cancelling also cancels linked Purchase Invoices automatically (cascade) and reverses the stock + accounting entries. This cannot be undone."
        confirmText="Cancel Receipt"
        variant="destructive"
        onConfirm={handleCancel}
        loading={cancelling}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Purchase Receipt?"
        description={`Are you sure you want to delete "${pr.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
