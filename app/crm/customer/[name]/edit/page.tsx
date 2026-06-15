// app/crm/customer/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Customer Page

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, User, PhoneCall, Info } from "lucide-react";

import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormTextarea,
  FormFrappeSelect,
  FormSelect,
} from "@/components/form";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import type { Customer } from "@/types/doctype-types";

const customerUpdateSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_type: z.enum(["Company", "Individual", "Partnership"]).optional(),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  email_id: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile_no: z.string().optional(),
  tax_id: z.string().optional(),
  website: z.string().optional(),
  customer_details: z.string().optional(),
  lead_name: z.string().optional(),
});

type CustomerUpdateFormData = z.infer<typeof customerUpdateSchema>;

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { resolution, showError, dismiss } = useGuidedError();

  const { data: customer, isLoading: isLoadingCustomer, error } = useFrappeDoc<Customer>("Customer", name);

  const form = useForm<CustomerUpdateFormData>({
    resolver: zodResolver(customerUpdateSchema),
    defaultValues: {
      customer_name: "",
      customer_type: "Company",
      customer_group: "",
      territory: "",
      email_id: "",
      mobile_no: "",
      tax_id: "",
      website: "",
      customer_details: "",
      lead_name: "",
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        customer_name: customer.customer_name || "",
        customer_type: customer.customer_type || "Company",
        customer_group: customer.customer_group || "",
        territory: customer.territory || "",
        email_id: customer.email_id || "",
        mobile_no: customer.mobile_no || "",
        tax_id: customer.tax_id || "",
        website: customer.website || "",
        customer_details: customer.customer_details || "",
        lead_name: customer.lead_name || "",
      });
    }
  }, [customer, form]);

  const updateMutation = useFrappeUpdate<{ data: Customer }, { name: string; data: Partial<Customer> }>(
    "Customer",
    {
      onSuccess: () => {
        router.push(`/crm/customer/${encodeURIComponent(name)}`);
      },
      successMessage: "Customer updated successfully",
      onError: (err) => {
        showError(resolveFrappeError(err, { doctype: "Customer", values: form.getValues() }));
      }
    }
  );

  const onSubmit = async (data: CustomerUpdateFormData) => {
    const submitData: Partial<Customer> = {
      ...data,
      customer_group: data.customer_group || undefined,
      territory: data.territory || undefined,
      email_id: data.email_id || undefined,
      mobile_no: data.mobile_no || undefined,
      lead_name: data.lead_name || undefined,
    };
    await updateMutation.mutateAsync({ name, data: submitData });
  };

  if (isLoadingCustomer) {
    return <LoadingState type="detail" />;
  }

  if (error || !customer) {
    return (
      <div className="flex items-center justify-center h-64 bg-destructive/5 rounded-xl border border-destructive/20 p-6">
        <p className="text-destructive">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${customer.customer_name}`}
        subtitle={`ID: ${customer.name}`}
        backHref={`/crm/customer/${encodeURIComponent(name)}`}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Basic Information" icon={<User className="h-4 w-4 text-primary" />}>
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

              <InfoCard title="Contact Information" icon={<PhoneCall className="h-4 w-4 text-primary" />}>
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

              <InfoCard title="Additional Details" icon={<Info className="h-4 w-4 text-primary" />}>
                <FormTextarea
                  control={form.control}
                  name="customer_details"
                  label="Notes"
                  placeholder="Additional information about this customer..."
                  minHeight="120px"
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
                    onClick={() => router.push(`/crm/customer/${encodeURIComponent(name)}`)}
                  >
                    Cancel
                  </Button>
                </div>
              </InfoCard>
            </div>
          </div>
        </form>
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}