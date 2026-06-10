// app/crm/lead/[name]/page.tsx
// Obsidian ERP v4.0 — Lead Detail (V4 Golden Template B1 Sidebar)
// FlowRail (Lead-to-Cash chain) + WhatsNext + ActivityTimeline.
// Every mutation routes through resolveFrappeError → GuidedErrorDialog.
// Status changes via update mutation (Lead is a master doctype, no docstatus).

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
  Ban,
  UserPlus,
  FileText,
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
import { useFrappeDoc, useFrappeList, useFrappeUpdate, useFrappeCreate } from "@/hooks/generic";
import { getActiveCompany } from "@/lib/settings/company";
import type { Lead } from "@/types/doctype-types";
import type { FlowStageStatus } from "@/types/flow-types";

// Lead status machine: Lead → Open → Replied → Opportunity → Converted → Do Not Contact
const STATUS_TRANSITIONS: Record<string, string[]> = {
  Lead: ["Open", "Replied", "Do Not Contact"],
  Open: ["Replied", "Opportunity", "Converted", "Do Not Contact"],
  Replied: ["Open", "Opportunity", "Interested", "Converted", "Do Not Contact"],
  Interested: ["Opportunity", "Converted", "Do Not Contact"],
  Opportunity: ["Converted", "Lost Quotation", "Do Not Contact"],
  Quotation: ["Converted", "Lost Quotation", "Do Not Contact"],
  Converted: [],
  "Do Not Contact": ["Lead"],
  "Lost Quotation": ["Open", "Do Not Contact"],
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(String(params.name));

  const [confirmStatusChange, setConfirmStatusChange] = useState<{
    open: boolean;
    newStatus: string;
  }>({ open: false, newStatus: "" });
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: lead,
    isLoading,
    error,
  } = useFrappeDoc<Lead>("Lead", name);

  // Resolve downstream Opportunity linked to this lead
  const { data: opportunities } = useFrappeList<{ name: string; status: string }>(
    "Opportunity",
    {
      filters: [["party_name", "=", name]],
      fields: ["name", "status"],
      limit: 5,
    },
    { enabled: !isLoading && !!lead },
  );

  // Build the flow chain
  const chain = useMemo(() => {
    const stageStatuses: Record<
      string,
      { status: FlowStageStatus; documentName?: string; documentUrl?: string }
    > = {};

    if (opportunities && opportunities.length > 0) {
      const opp = opportunities[0];
      stageStatuses["Opportunity"] = {
        status: opp.status === "Converted" ? "completed" : "current",
        documentName: opp.name,
        documentUrl: `/crm/opportunity/${encodeURIComponent(opp.name)}`,
      };
    }

    return resolveFlowChain("Lead", name, stageStatuses);
  }, [opportunities, name]);

  // Status update mutation
  const updateMutation = useFrappeUpdate<Lead>("Lead", { showToast: false });

  // Customer create mutation (for Lead → Customer conversion)
  const createCustomerMutation = useFrappeCreate("Customer", {
    showToast: false,
  });

  // Check if already converted (Lead.customer is the linked Customer field)
  const isConverted = lead?.status === "Converted" && lead?.customer;

  const handleConvertToCustomer = useCallback(() => {
    if (isConverted && lead?.customer) {
      router.push(`/crm/customer/${encodeURIComponent(lead.customer)}`);
      return;
    }

    const customerData = {
      customer_name: lead?.company_name || lead?.lead_name || name,
      customer_type: "Company",
      customer_group: "All Customer Groups",
      territory: lead?.territory || "",
      email_id: lead?.email_id || "",
      mobile_no: lead?.mobile_no || "",
      company: getActiveCompany(),
      lead_name: name,
    };

    createCustomerMutation.mutate(customerData, {
      onSuccess: (res) => {
        const customerName = (res as { data?: { name?: string } })?.data?.name;
        if (customerName) {
          // Update Lead with customer link + status
          updateMutation.mutate(
            {
              name,
              data: {
                customer: customerName,
                status: "Converted",
              },
            },
            {
              onSuccess: () => {
                toast.success(`Converted to Customer ${customerName}`);
                router.push(`/crm/customer/${encodeURIComponent(customerName)}`);
              },
              onError: (err) =>
                showError(resolveFrappeError(err, { doctype: "Lead" })),
            },
          );
        }
      },
      onError: (err) =>
        showError(resolveFrappeError(err, { doctype: "Customer" })),
    });
  }, [isConverted, lead, name, createCustomerMutation, updateMutation, router, showError]);

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      setConfirmStatusChange({ open: false, newStatus: "" });
      updateMutation.mutate(
        { name, data: { status: newStatus } },
        {
          onSuccess: () => {
            toast.success(`Lead status changed to ${newStatus}`);
          },
          onError: (err) =>
            showError(resolveFrappeError(err, { doctype: "Lead" })),
        },
      );
    },
    [name, updateMutation, showError],
  );

  // Loading / error
  if (isLoading) return <LoadingState />;
  if (error || !lead) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Lead not found."}
        </p>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() => router.push("/crm/lead")}
        >
          Back to Leads
        </Button>
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[lead.status] ?? [];

  // WhatsNext actions
  const whatsNext = [
    isModuleBuilt("Customer") && {
      label: isConverted ? "View Customer" : "Convert to Customer",
      description: isConverted
        ? `Converted to ${lead?.customer}`
        : "Create a Customer record from this lead",
      onClick: handleConvertToCustomer,
      isPrimary: !isConverted,
      isLoading: createCustomerMutation.isPending || updateMutation.isPending,
    },
    !isConverted &&
    isModuleBuilt("Quotation") && {
      label: "Create Quotation",
      description: "Send a price proposal to this lead",
      onClick: () =>
        router.push(
          `/sales/quotation/new?party_name=${encodeURIComponent(name)}&quotation_to=Lead`,
        ),
    },
    allowedTransitions.length > 0 && {
      label: "Change Status",
      description: `Current: ${lead.status}`,
      onClick: () => {
        // Scroll to the status change menu in the header
        const statusMenu = document.querySelector("[data-status-menu]");
        if (statusMenu) {
          statusMenu.scrollIntoView({ behavior: "smooth", block: "center" });
          (statusMenu as HTMLElement).focus();
        }
      },
      disabled: false,
    },
  ].filter(Boolean) as React.ComponentProps<typeof WhatsNext>["actions"];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={lead.lead_name || name}
        subtitle={lead.company_name || lead.email_id}
        backHref="/crm/lead"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/crm/lead/${encodeURIComponent(name)}/edit`}>
                <Edit3 className="mr-1.5 h-4 w-4" /> Edit
              </Link>
            </Button>
            {allowedTransitions.length > 0 && (
              <StatusChangeMenu
                currentStatus={lead.status}
                transitions={allowedTransitions}
                onSelect={(status) =>
                  setConfirmStatusChange({ open: true, newStatus: status })
                }
                isLoading={updateMutation.isPending}
              />
            )}
          </div>
        }
      />

      {/* Flow Tracker */}
      <InfoCard title="Lead-to-Cash Flow" className="overflow-hidden">
        <FlowRail result={chain} currentDocName={name} sourceDoctype="Lead" />
      </InfoCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Lead Details">
            <div className="mb-4 flex items-center justify-between">
              <StatusBadge status={lead.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DataPoint label="Lead Name" value={lead.lead_name} />
              <DataPoint label="Company" value={lead.company_name} />
              <DataPoint label="Email" value={lead.email_id} />
              <DataPoint label="Mobile" value={lead.mobile_no} />
              <DataPoint label="Phone" value={lead.phone} />
              <DataPoint label="Source" value={lead.source} />
              <DataPoint label="Territory" value={lead.territory} />
              <DataPoint label="Industry" value={lead.industry} />
              <DataPoint label="Lead Type" value={lead.type} />
              <DataPoint label="Request Type" value={lead.request_type} />
              <DataPoint label="Lead Owner" value={lead.lead_owner} />
              <DataPoint label="Campaign" value={lead.campaign_name} />
            </div>
          </InfoCard>

          {(lead.no_of_employees || lead.annual_revenue || lead.website) && (
            <InfoCard title="Organization">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <DataPoint label="No of Employees" value={lead.no_of_employees} />
                <DataPoint label="Annual Revenue" value={lead.annual_revenue?.toString()} />
                <DataPoint label="Website" value={lead.website} />
                <DataPoint label="City" value={lead.city} />
                <DataPoint label="State" value={lead.state} />
                <DataPoint label="Country" value={lead.country} />
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
                description: "Lead created",
                user: lead.owner,
                timestamp: lead.creation ?? new Date().toISOString(),
              },
              ...(lead.modified && lead.modified !== lead.creation
                ? [
                    {
                      id: "updated",
                      type: "updated" as const,
                      description: "Lead updated",
                      user: lead.modified_by,
                      timestamp: lead.modified,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmStatusChange.open}
        onOpenChange={(open) =>
          !open && setConfirmStatusChange({ open: false, newStatus: "" })
        }
        title={`Change status to "${confirmStatusChange.newStatus}"?`}
        description={`This will update the lead status from "${lead.status}" to "${confirmStatusChange.newStatus}".`}
        confirmText="Change Status"
        onConfirm={() => handleStatusChange(confirmStatusChange.newStatus)}
        loading={updateMutation.isPending}
      />

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}

function StatusChangeMenu({
  currentStatus,
  transitions,
  onSelect,
  isLoading,
}: {
  currentStatus: string;
  transitions: string[];
  onSelect: (status: string) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {transitions.slice(0, 2).map((status) => (
        <Button
          key={status}
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => onSelect(status)}
        >
          {isLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
          {status}
        </Button>
      ))}
      {transitions.length > 2 && (
        <Button variant="ghost" size="sm" disabled>
          +{transitions.length - 2} more
        </Button>
      )}
    </div>
  );
}
