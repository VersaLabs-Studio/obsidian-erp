// app/crm/lead/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Lead Page
// @ts-nocheck

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// v3.0 Imports
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormSelect,
  FormFrappeSelect,
} from "@/components/form";
import { LeadUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Lead } from "@/types/doctype-types";
import type { z } from "zod";

type LeadUpdateFormData = z.infer<typeof LeadUpdateSchema>;

// Status options
const STATUS_OPTIONS = [
  { value: "Lead", label: "Lead" },
  { value: "Open", label: "Open" },
  { value: "Replied", label: "Replied" },
  { value: "Interested", label: "Interested" },
  { value: "Opportunity", label: "Opportunity" },
  { value: "Quotation", label: "Quotation" },
  { value: "Lost Quotation", label: "Lost Quotation" },
  { value: "Converted", label: "Converted" },
  { value: "Do Not Contact", label: "Do Not Contact" },
];

const TYPE_OPTIONS = [
  { value: "Client", label: "Client" },
  { value: "Channel Partner", label: "Channel Partner" },
  { value: "Consultant", label: "Consultant" },
];

const REQUEST_TYPE_OPTIONS = [
  { value: "Product Enquiry", label: "Product Enquiry" },
  { value: "Request for Information", label: "Request for Information" },
  { value: "Suggestions", label: "Suggestions" },
  { value: "Other", label: "Other" },
];

export default function EditLeadPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // Fetch existing lead
  const { data: lead, isLoading: isLoadingLead, error } = useFrappeDoc<Lead>("Lead", name);

  // Update mutation
  const updateMutation = useFrappeUpdate<{ data: Lead }, LeadUpdateFormData>(
    "Lead",
    {
      onSuccess: () => {
        router.push(`/crm/lead/${encodeURIComponent(name)}`);
      },
      successMessage: "Lead updated successfully",
    }
  );

  // Form setup
  const form = useForm<LeadUpdateFormData>({
    resolver: zodResolver(LeadUpdateSchema),
    defaultValues: {
      status: "Open",
      first_name: "",
      last_name: "",
      lead_name: "",
      company_name: "",
      email_id: "",
      mobile_no: "",
      phone: "",
      source: "",
      territory: "",
      industry: "",
      type: undefined,
      request_type: undefined,
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (lead) {
      form.reset({
        status: lead.status,
        first_name: lead.first_name || "",
        last_name: lead.last_name || "",
        lead_name: lead.lead_name || "",
        company_name: lead.company_name || "",
        email_id: lead.email_id || "",
        mobile_no: lead.mobile_no || "",
        phone: lead.phone || "",
        source: lead.source || "",
        territory: lead.territory || "",
        industry: lead.industry || "",
        type: lead.type as LeadUpdateFormData["type"],
        request_type: lead.request_type as LeadUpdateFormData["request_type"],
      });
    }
  }, [lead, form]);

  // Submit handler
  const onSubmit = async (data: LeadUpdateFormData) => {
    await updateMutation.mutateAsync({ name, data });
  };

  // Loading state
  if (isLoadingLead) {
    return <LoadingState type="detail" />;
  }

  // Error state
  if (error || !lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Lead not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${lead.lead_name || "Lead"}`}
        subtitle={`ID: ${lead.name}`}
        backHref={`/crm/lead/${encodeURIComponent(name)}`}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <InfoCard title="Personal Information" icon="user">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="first_name"
                    label="First Name"
                    placeholder="Enter first name..."
                  />
                  <FormInput
                    control={form.control}
                    name="last_name"
                    label="Last Name"
                    placeholder="Enter last name..."
                  />
                  <FormInput
                    control={form.control}
                    name="email_id"
                    label="Email"
                    type="email"
                    placeholder="email@example.com"
                  />
                  <FormInput
                    control={form.control}
                    name="mobile_no"
                    label="Mobile No"
                    placeholder="+251 9XX XXX XXX"
                  />
                  <FormInput
                    control={form.control}
                    name="phone"
                    label="Phone"
                    placeholder="Office phone..."
                  />
                </div>
              </InfoCard>

              {/* Organization */}
              <InfoCard title="Organization" icon="building">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="company_name"
                    label="Company Name"
                    placeholder="Enter company name..."
                    className="md:col-span-2"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="industry"
                    label="Industry"
                    doctype="Industry Type"
                    labelField="industry"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="territory"
                    label="Territory"
                    doctype="Territory"
                    labelField="territory_name"
                  />
                </div>
              </InfoCard>

              {/* Classification */}
              <InfoCard title="Classification" icon="tag">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormSelect
                    control={form.control}
                    name="type"
                    label="Lead Type"
                    options={TYPE_OPTIONS}
                    placeholder="Select type..."
                  />
                  <FormSelect
                    control={form.control}
                    name="request_type"
                    label="Request Type"
                    options={REQUEST_TYPE_OPTIONS}
                    placeholder="Select request type..."
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="source"
                    label="Source"
                    doctype="Lead Source"
                    labelField="source_name"
                  />
                </div>
              </InfoCard>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Status */}
              <InfoCard title="Status" variant="gradient">
                <FormSelect
                  control={form.control}
                  name="status"
                  label="Lead Status"
                  required
                  options={STATUS_OPTIONS}
                />
              </InfoCard>

              {/* Actions */}
              <InfoCard title="Actions">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push(`/crm/lead/${encodeURIComponent(name)}`)}
                  >
                    Cancel
                  </Button>
                </div>
              </InfoCard>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}