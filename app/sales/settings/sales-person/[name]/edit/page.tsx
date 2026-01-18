"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { SalesPersonUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type {
  SalesPerson,
  SalesPersonUpdateRequest,
} from "@/types/doctype-types";

type FormData = z.infer<typeof SalesPersonUpdateSchema>;

export default function EditSalesPersonPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const { data: sp, isLoading } = useFrappeDoc<SalesPerson>(
    "Sales Person",
    name
  );
  const updateMutation = useFrappeUpdate<SalesPerson, SalesPersonUpdateRequest>(
    "Sales Person",
    {
      onSuccess: () => router.push("/sales/settings/sales-person"),
    }
  );

  const form = useForm<FormData>({
    resolver: zodResolver(SalesPersonUpdateSchema),
    defaultValues: {
      sales_person_name: "",
      enabled: 1,
    },
  });

  useEffect(() => {
    if (sp) {
      form.reset({
        sales_person_name: sp.sales_person_name || "",
        parent_sales_person: sp.parent_sales_person || "",
        employee: sp.employee || "",
        enabled: sp.enabled === 1 ? 1 : 0,
      } as any);
    }
  }, [sp, form]);

  if (isLoading)
    return (
      <div className="p-8">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${sp?.sales_person_name}`}
        backHref={`/sales/settings/sales-person/${encodeURIComponent(name)}`}
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) =>
            updateMutation.mutate({ name, data: d } as any)
          )}
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
                    // Handle the conversion between 0/1 and boolean for the switch
                    transform={{
                      input: (val) => val === 1,
                      output: (val) => (val ? 1 : 0),
                    }}
                  />
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
