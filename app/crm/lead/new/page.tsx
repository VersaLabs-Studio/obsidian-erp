// app/crm/lead/new/page.tsx
// Obsidian ERP v4.0 - Create Lead Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormFrappeSelect,
} from "@/components/form";
import { LeadCreateSchema, type LeadFormData } from "@/lib/schemas/doctype-schemas";
import type { Lead } from "@/types/doctype-types";

// Status options
const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "Replied", label: "Replied" },
  { value: "Interested", label: "Interested" },
  { value: "Opportunity", label: "Opportunity" },
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

export default function CreateLeadPage() {
  const router = useRouter();

  // Create mutation
  const createMutation = useFrappeCreate<{ data: Lead }, LeadFormData>(
    "Lead",
    {
      onSuccess: (data) => {
        router.push(`/crm/lead/${encodeURIComponent(data.data.name)}`);
      },
      successMessage: "Lead created successfully",
    }
  );

  // Form setup
  const form = useForm<LeadFormData>({
    resolver: zodResolver(LeadCreateSchema),
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

  // Submit handler
  const onSubmit = async (data: LeadFormData) => {
    // Auto-generate lead_name if not provided
    const submitData = {
      ...data,
      lead_name: data.lead_name || `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.company_name,
    };
    await createMutation.mutateAsync(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Lead"
        subtitle="Capture a new inquiry"
        backHref="/crm/lead"
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
              {/* Status & Actions */}
              <InfoCard title="Status" variant="gradient">
                <div className="space-y-4">
                  <FormSelect
                    control={form.control}
                    name="status"
                    label="Lead Status"
                    required
                    options={STATUS_OPTIONS}
                  />
                </div>
              </InfoCard>

              {/* Actions */}
              <InfoCard title="Actions">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Lead"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push("/crm/lead")}
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