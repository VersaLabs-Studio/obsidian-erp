// app/sales/quotation/[name]/page.tsx
// Obsidian ERP v4.0 - Quotation Detail View (V4 Golden Template)

"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Edit3,
  Send,
  Ban,
  Printer,
  Loader2,
  Package,
  Trash2,
} from "lucide-react";

function getDisplayStatus(quotation: Quotation): string {
  if (quotation.docstatus === 2) return "Cancelled";
  if (
    quotation.status === "Open" &&
    quotation.valid_till &&
    new Date(quotation.valid_till) < new Date()
  ) {
    return "Expired";
  }
  return quotation.status || "Draft";
}

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
import { useFlowChain } from "@/hooks/flows/use-flow-chain";
import { useFrappeDoc, useFrappeUpdate, useFrappeDelete } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import type { Quotation } from "@/types/doctype-types";

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

interface QuotationItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
  uom?: string;
}

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: quote, isLoading, error, refetch } = useFrappeDoc<Quotation>(
    "Quotation",
    name
  );

  // 2N Part 1.1: unified flow resolution.
  // 2U §5b — The server resolver is the single source of truth for downstream
  // documents. We derive the linked Sales Order name from the flow chain
  // result instead of querying the child table directly (which 404s).
  const { result: chain, isLoading: chainLoading } = useFlowChain("Quotation", name);

  // Derive downstream SO name from the flow chain (stage with doctype === "Sales Order")
  const soName = useMemo(() => {
    const soStage = chain?.stages?.find((s) => s.doctype === "Sales Order");
    return soStage?.documentName;
  }, [chain?.stages]);

  const updateMutation = useFrappeUpdate<Quotation>("Quotation", {
    showToast: false,
  });

  const deleteMutation = useFrappeDelete("Quotation", {
    showToast: false,
  });

  const isDraft = quote?.docstatus === 0;
  const isSubmitted = quote?.docstatus === 1;

  const handleSubmit = () => {
    setConfirmSubmit(false);
    updateMutation.mutate(
      { name, data: { docstatus: 1, status: "Open" } },
      {
        onSuccess: () => {
          toast.success(`Quotation ${name} submitted`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Quotation" })),
      }
    );
  };

  const handleCancel = () => {
    setConfirmCancel(false);
    updateMutation.mutate(
      { name, data: { docstatus: 2, status: "Cancelled" } },
      {
        onSuccess: () => {
          toast.success(`Quotation ${name} cancelled`);
          refetch();
        },
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Quotation" })),
      }
    );
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    deleteMutation.mutate(name, {
      onSuccess: () => {
        toast.success(`Quotation ${name} deleted`);
        router.push("/sales/quotation");
      },
      onError: (err) =>
        showError(resolveFrappeError(err, { doctype: "Quotation" })),
    });
  };

  if (isLoading) return <LoadingState />;
  if (error || !quote) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Quotation not found."}
        </p>
        <Button variant="ghost" className="mt-3" onClick={() => router.push("/sales/quotation")}>
          Back to Quotations
        </Button>
      </div>
    );
  }

  const items = (quote.items ?? []) as unknown as QuotationItem[];
  const grandTotal = quote.grand_total ?? quote.total ?? 0;

  const whatsNext = [
    isDraft && {
      label: "Submit Quotation",
      description: "Submit to lock prices and prepare for sales order",
      onClick: () => setConfirmSubmit(true),
      isPrimary: true,
      isLoading: updateMutation.isPending,
    },
    isSubmitted && {
      label: soName ? "View Sales Order" : "Create Sales Order",
      description: soName
        ? `Sales Order ${soName} linked`
        : "Generate a Sales Order from this quotation",
      onClick: () => {
        if (soName) {
          router.push(`/sales/sales-order/${encodeURIComponent(soName)}`);
        } else {
          router.push(`/sales/sales-order/new?quotation=${encodeURIComponent(name)}`);
        }
      },
      isPrimary: !soName,
      disabled: !isModuleBuilt("Sales Order"),
      disabledReason: "Sales Order module not available",
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={quote.name}
        subtitle={quote.customer_name || quote.party_name}
        backHref="/sales/quotation"
        actions={
          <div className="flex items-center gap-2">
            <PrintShare doctype="Quotation" name={quote.name} />
            {isDraft && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sales/quotation/${encodeURIComponent(name)}/edit`}>
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
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
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

      {/* Flow Tracker */}
      <InfoCard title="Lead-to-Cash Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Quotation" isLoading={chainLoading} />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Quotation Summary">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={getDisplayStatus(quote)} />
              <span className="text-2xl font-bold tabular-nums text-primary">
                {ETB.format(grandTotal)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint label="Quotation To" value={quote.quotation_to} />
              <DataPoint label="Party ID" value={quote.party_name} />
              <DataPoint label="Quotation Date" value={quote.transaction_date} />
              <DataPoint label="Valid Till" value={quote.valid_till || "—"} />
              <DataPoint label="Company" value={quote.company} />
              <DataPoint label="Price List" value={quote.selling_price_list || "—"} />
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
                        {it.qty} {it.uom || "Nos"}
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
          {/* 2L 1B: Universal cross-flow actions menu */}
          <CrossFlowActionsMenu doctype="Quotation" name={name} />
          <WhatsNext actions={whatsNext} />
          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "Quotation created",
                user: quote.owner,
                timestamp: quote.creation ?? new Date().toISOString(),
              },
              ...(isSubmitted
                ? [
                    {
                      id: "submitted",
                      type: "submitted" as const,
                      description: "Quotation submitted",
                      user: quote.modified_by,
                      timestamp: quote.modified ?? new Date().toISOString(),
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
        title="Submit this Quotation?"
        description="Submitting locks the quotation. Downstream orders can then be created."
        confirmText="Submit"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this Quotation?"
        description="Cancelling reverses the quotation. This cannot be undone."
        confirmText="Cancel"
        variant="destructive"
        onConfirm={handleCancel}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this Quotation?"
        description="Are you sure you want to delete this draft quotation? This action is permanent."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
