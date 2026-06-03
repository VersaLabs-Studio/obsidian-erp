// app/crm/customer/new/page.tsx
// Obsidian ERP v4.0 - Create Customer Page
// @ts-nocheck

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, UserPlus } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormTextarea,
  FormFrappeSelect,
  FormSelect,
} from "@/components/form";
import type { Customer } from "@/types/doctype-types";

// Form Schema
const customerFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_type: z.enum(["Company", "Individual", "Partnership"]),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  email_id: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile_no: z.string().optional(),
  tax_id: z.string().optional(),
  website: z.string().optional(),
  customer_details: z.string().optional(),
  // Hidden field for Lead conversion tracking
  lead_name: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function CreateCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if coming from Lead conversion
  const fromLead = searchParams.get("from_lead");
  const isConversion = Boolean(fromLead);

  // Create mutation
  const createMutation = useFrappeCreate<{ data: Customer }, Partial<Customer>>(
    "Customer",
    {
      onSuccess: () => router.push("/crm/customer"),
      successMessage: isConversion 
        ? "Lead converted to Customer successfully" 
        : "Customer created successfully",
    }
  );

  // Form with pre-filled values from Lead
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customer_name: searchParams.get("customer_name") || "",
      customer_type: "Company",
      customer_group: "",
      territory: searchParams.get("territory") || "",
      email_id: searchParams.get("email_id") || "",
      mobile_no: searchParams.get("mobile_no") || "",
      tax_id: "",
      website: "",
      customer_details: "",
      lead_name: fromLead || "",
    },
  });

  // Submit handler
  const onSubmit = async (data: CustomerFormData) => {
    // Clean up empty strings
    const submitData: Partial<Customer> = {
      ...data,
      customer_group: data.customer_group || undefined,
      territory: data.territory || undefined,
      email_id: data.email_id || undefined,
      mobile_no: data.mobile_no || undefined,
      lead_name: data.lead_name || undefined,
    };
    await createMutation.mutateAsync(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isConversion ? "Convert Lead to Customer" : "New Customer"}
        subtitle={isConversion 
          ? `Converting lead: ${fromLead}` 
          : "Create a new customer record"}
        backHref="/crm/customer"
      />

      {/* Conversion Notice */}
      {isConversion && (
        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <UserPlus className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-primary">Lead Conversion</p>
            <p className="text-sm text-muted-foreground">
              This customer will be linked to lead: <strong>{fromLead}</strong>
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Basic Information" icon="user">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormInput
                      control={form.control}
                      name="customer_name"
                      label="Customer Name"
                      required
                      placeholder="Enter customer or company name..."
                    />
                  </div>
                  <FormSelect
                    control={form.control}
                    name="customer_type"
                    label="Customer Type"
                    required
                    options={[
                      { value: "Company", label: "Company" },
                      { value: "Individual", label: "Individual" },
                      { value: "Partnership", label: "Partnership" },
                    ]}
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="customer_group"
                    label="Customer Group"
                    doctype="Customer Group"
                    labelField="customer_group_name"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="territory"
                    label="Territory"
                    doctype="Territory"
                    labelField="territory_name"
                  />
                  <FormInput
                    control={form.control}
                    name="tax_id"
                    label="Tax ID"
                    placeholder="e.g., TIN number"
                  />
                </div>
              </InfoCard>

              <InfoCard title="Contact Information" icon="contact">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="email_id"
                    label="Email"
                    type="email"
                    placeholder="email@company.com"
                  />
                  <FormInput
                    control={form.control}
                    name="mobile_no"
                    label="Mobile No"
                    placeholder="+251 9XX XXX XXX"
                  />
                  <div className="col-span-2">
                    <FormInput
                      control={form.control}
                      name="website"
                      label="Website"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </InfoCard>

              <InfoCard title="Additional Details" icon="info">
                <FormTextarea
                  control={form.control}
                  name="customer_details"
                  label="Notes"
                  placeholder="Additional information about this customer..."
                  rows={4}
                />
              </InfoCard>
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-6">
              <InfoCard title="Actions" variant="gradient">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isConversion ? "Converting..." : "Creating..."}
                      </>
                    ) : (
                      isConversion ? "Convert to Customer" : "Create Customer"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push("/crm/customer")}
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