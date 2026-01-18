"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormFrappeSelect,
  FormSelect,
  FormTextarea,
} from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { SalesPartnerCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { SalesPartnerCreateRequest } from "@/types/doctype-types";
import z from "zod";

type FormData = z.infer<typeof SalesPartnerCreateSchema>;

export default function NewSalesPartnerPage() {
  const router = useRouter();
  const createMutation = useFrappeCreate<
    { data: SalesPartnerCreateRequest },
    SalesPartnerCreateRequest
  >("Sales Partner", {
    onSuccess: () => router.push("/sales/settings/sales-partner"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(SalesPartnerCreateSchema),
    defaultValues: {
      partner_type: "Reseller",
      commission_rate: 0,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Partner"
        backHref="/sales/settings/sales-partner"
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) =>
            createMutation.mutate(d as SalesPartnerCreateRequest),
          )}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Partner Details" icon="handshake">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="partner_name"
                    label="Partner Name"
                    required
                    placeholder="e.g. ABC Design Agency"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="partner_type"
                    label="Partner Type"
                    doctype="Sales Partner Type"
                    labelField="name"
                  />
                  <FormInput
                    control={form.control}
                    name="commission_rate"
                    label="Commission Rate (%)"
                    type="number"
                    required
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="territory"
                    label="Territory"
                    doctype="Territory"
                    labelField="territory_name"
                  />
                </div>
                <div className="mt-4">
                  <FormTextarea
                    control={form.control}
                    name="description"
                    label="Description"
                    placeholder="Notes about this partner..."
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
                    {createMutation.isPending ? "Saving..." : "Create Partner"}
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
