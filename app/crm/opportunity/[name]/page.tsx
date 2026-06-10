// app/crm/opportunity/[name]/page.tsx
// Obsidian ERP v4.0 — Opportunity Detail (V4 Golden Template B1 Sidebar)
// FlowRail (Lead-to-Cash chain, position 2) + WhatsNext + ActivityTimeline.
// Every mutation routes through resolveFrappeError → GuidedErrorDialog.

"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import {
  Edit3,
  Loader2,
  FileText,
  XCircle,
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
import { useFrappeDoc, useFrappeList, useFrappeUpdate } from "@/hooks/generic";
import type { Opportunity } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmLost, setConfirmLost] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: opp,
    isLoading,
    error,
  } = useFrappeDoc<Opportunity>("Opportunity", name);

  // Resolve downstream quotation
  const { data: quotations } = useFrappeList<{ name: string; status: string }>(
    "Quotation",
    {
      filters: [["party_name", "=", name]],
      fields: ["name", "status"],
      limit: 5,
    },
    { enabled: !isLoading && !!opp },
  );

  // Resolve upstream lead
  const upstreamLead = opp?.opportunity_from === "Lead" ? opp?.party_name : undefined;

  // Build flow chain
  const chain = useMemo(() => {
    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    if (upstreamLead) {
      stageStatuses["Lead"] = {
        status: "completed",
        documentName: upstreamLead,
        documentUrl: `/crm/lead/${encodeURIComponent(upstreamLead)}`,
      };
    }

    if (quotations && quotations.length > 0) {
      const q = quotations[0];
      stageStatuses["Quotation"] = {
        status: q.status === "Ordered" ? "completed" : "current",
        documentName: q.name,
        documentUrl: `/sales/quotation/${encodeURIComponent(q.name)}`,
      };
    }

    return resolveFlowChain("Opportunity", name, stageStatuses);
  }, [upstreamLead, quotations, name]);

  // Status update mutation
  const updateMutation = useFrappeUpdate<Opportunity>("Opportunity", {
    showToast: false,
  });

  const handleMarkAsLost = useCallback(() => {
    setConfirmLost(false);
    updateMutation.mutate(
      { name, data: { status: "Lost" } },
      {
        onSuccess: () => toast.success("Opportunity marked as Lost"),
        onError: (err) =>
          showError(resolveFrappeError(err, { doctype: "Opportunity" })),
      },
    );
  }, [name, updateMutation, showError]);

  // Loading / error
  if (isLoading) return <LoadingState />;
  if (error || !opp) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Opportunity not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/crm/opportunity")}
        >
          Back to Opportunities
        </Button>
      </div>
    );
  }

  const isOpen = opp.status === "Open";
  const isLost = opp.status === "Lost";

  // WhatsNext actions
  const whatsNext = [
    isOpen &&
    isModuleBuilt("Quotation") && {
      label: "Create Quotation",
      description: "Send a price proposal for this opportunity",
      onClick: () =>
        router.push(
          `/sales/quotation/new?party_name=${encodeURIComponent(name)}&quotation_to=Customer`,
        ),
      isPrimary: true,
    },
    isOpen && {
      label: "Mark as Lost",
      description: "Close this opportunity as lost",
      onClick: () => setConfirmLost(true),
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={opp.title || opp.party_name || name}
        subtitle={opp.company}
        backHref="/crm/opportunity"
        actions={
          <div className="flex items-center gap-2">
            {isOpen && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/crm/opportunity/${encodeURIComponent(name)}/edit`}>
                  <Edit3 className="mr-1.5 h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Flow Tracker */}
      <InfoCard title="Lead-to-Cash Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Opportunity" />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Opportunity Details">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={opp.status} />
              {opp.probability != null && (
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {opp.probability}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint label="Party Name" value={opp.party_name} />
              <DataPoint label="Source Type" value={opp.opportunity_from} />
              <DataPoint label="Opportunity Type" value={opp.opportunity_type} />
              <DataPoint label="Sales Stage" value={opp.sales_stage} />
              <DataPoint label="Company" value={opp.company} />
              <DataPoint label="Date" value={opp.transaction_date} />
              <DataPoint label="Expected Closing" value={opp.expected_closing} />
              <DataPoint label="Territory" value={opp.territory} />
              <DataPoint label="Source" value={opp.source} />
              <DataPoint label="Opportunity Owner" value={opp.opportunity_owner} />
              <DataPoint label="Currency" value={opp.currency} />
              <DataPoint
                label="Amount"
                value={opp.opportunity_amount?.toString()}
              />
            </div>
          </InfoCard>

          {/* Items */}
          {opp.items && (opp.items as unknown[]).length > 0 && (
            <InfoCard title="Items">
              <div className="overflow-hidden rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-secondary/20">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(opp.items as Array<{ item_code: string; item_name?: string; qty: number; rate: number }>).map(
                      (it, i) => (
                        <tr key={`${it.item_code}-${i}`}>
                          <td className="px-3 py-2.5 font-medium text-foreground">
                            {it.item_name || it.item_code}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {it.qty}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {it.rate}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WhatsNext actions={whatsNext} />
          <ActivityTimeline
            items={[
              {
                id: "created",
                type: "created",
                description: "Opportunity created",
                user: opp.owner,
                timestamp: opp.creation ?? new Date().toISOString(),
              },
              ...(opp.modified && opp.modified !== opp.creation
                ? [
                    {
                      id: "updated",
                      type: "updated" as const,
                      description: "Opportunity updated",
                      user: opp.modified_by,
                      timestamp: opp.modified,
                    },
                  ]
                : []),
              ...(isLost
                ? [
                    {
                      id: "lost",
                      type: "status_change" as const,
                      description: "Marked as Lost",
                      timestamp: opp.modified ?? new Date().toISOString(),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmLost}
        onOpenChange={setConfirmLost}
        title="Mark this opportunity as Lost?"
        description="This will close the opportunity. You can still view it later."
        confirmText="Mark as Lost"
        variant="destructive"
        onConfirm={handleMarkAsLost}
        loading={updateMutation.isPending}
      />

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
