"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { SalesPersonCreateSchema } from "@/lib/schemas/doctype-schemas";
import type {
  SalesPerson,
  SalesPersonCreateRequest,
} from "@/types/doctype-types";

type FormData = z.infer<typeof SalesPersonCreateSchema>;

export default function NewSalesPersonPage() {
  const router = useRouter();
  const createMutation = useFrappeCreate<SalesPerson, FormData>(
    "Sales Person",
    {
      onSuccess: () => router.push("/sales/settings/sales-person"),
    }
  );

  const form = useForm<FormData>({
    resolver: zodResolver(SalesPersonCreateSchema) as any,
    defaultValues: {
      sales_person_name: "",
      enabled: 1,
    } as any,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Person"
        backHref="/sales/settings/sales-person"
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) => createMutation.mutate(d as any))}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Details" icon="user">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="sales_person_name"
                    label="Full Name"
                    required
                    placeholder="e.g. John Doe"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="parent_sales_person"
                    label="Parent Sales Person"
                    doctype="Sales Person"
                    labelField="sales_person_name"
                    filters={[["is_group", "=", 1]]}
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="employee"
                    label="Linked Employee"
                    doctype="Employee"
                    labelField="employee_name"
                  />
                </div>
              </InfoCard>
            </div>
            <div className="space-y-6">
              <InfoCard title="Status" variant="gradient">
                <div className="space-y-4">
                  <FormSwitch
                    control={form.control}
                    name="enabled"
                    label="Enabled"
                    description="Allow this person to be selected in transactions"
                    transform={{
                      input: (val) => val === 1,
                      output: (val) => (val ? 1 : 0),
                    }}
                  />
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending
                      ? "Saving..."
                      : "Create Sales Person"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.back()}
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
