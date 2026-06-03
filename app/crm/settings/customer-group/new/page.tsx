// app/crm/settings/customer-group/new/page.tsx
// Obsidian ERP v4.0 - Create Customer Group Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import type { CustomerGroup } from "@/types/doctype-types";

// Form Schema
const customerGroupFormSchema = z.object({
  customer_group_name: z.string().min(1, "Group name is required"),
  parent_customer_group: z.string().optional(),
  is_group: z.boolean().optional(),
});

type CustomerGroupFormData = z.infer<typeof customerGroupFormSchema>;

export default function CreateCustomerGroupPage() {
  const router = useRouter();

  const createMutation = useFrappeCreate<
    { data: CustomerGroup },
    Partial<CustomerGroup>
  >("Customer Group", {
    onSuccess: () => router.push("/crm/settings/customer-group"),
    successMessage: "Customer group created successfully",
  });

  const form = useForm<CustomerGroupFormData>({
    resolver: zodResolver(customerGroupFormSchema),
    defaultValues: {
      customer_group_name: "",
      parent_customer_group: "All Customer Groups",
      is_group: false,
    },
  });

  const onSubmit = async (data: CustomerGroupFormData) => {
    const submitData: Partial<CustomerGroup> = {
      customer_group_name: data.customer_group_name,
      parent_customer_group: data.parent_customer_group || undefined,
      is_group: data.is_group ? 1 : 0,
    };
    await createMutation.mutateAsync(submitData);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Customer Group"
        subtitle="Create a new customer classification group"
        backHref="/crm/settings/customer-group"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Group Information" icon="folder">
                <div className="grid grid-cols-1 gap-4">
                  <FormInput
                    control={form.control}
                    name="customer_group_name"
                    label="Group Name"
                    required
                    placeholder="e.g., Retail, Enterprise, Individual..."
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="parent_customer_group"
                    label="Parent Group"
                    doctype="Customer Group"
                    labelField="customer_group_name"
                  />
                  <FormSwitch
                    control={form.control}
                    name="is_group"
                    label="Is Parent Group"
                    description="Enable if this group will contain sub-groups"
                  />
                </div>
              </InfoCard>
            </div>

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
                        Creating...
                      </>
                    ) : (
                      "Create Group"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push("/crm/settings/customer-group")}
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
