"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput } from "@/components/form";
import { useFrappeCreate } from "@/hooks/generic";
import { SalesPartnerTypeCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { SalesPartnerTypeCreateRequest } from "@/types/doctype-types";
import z from "zod";
import { toast } from "sonner";

type FormData = z.infer<typeof SalesPartnerTypeCreateSchema>;

export default function NewSalesPartnerTypePage() {
  const router = useRouter();
  const createMutation = useFrappeCreate<
    { data: SalesPartnerTypeCreateRequest },
    SalesPartnerTypeCreateRequest
  >("Sales Partner Type", {
    onSuccess: () => {
      toast.success("Partner type created successfully");
      router.push("/sales/settings/sales-partner-type");
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(SalesPartnerTypeCreateSchema),
    defaultValues: {
      sales_partner_type: "",
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Partner Type"
        backHref="/sales/settings/sales-partner-type"
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) =>
            createMutation.mutate(d as SalesPartnerTypeCreateRequest),
          )}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InfoCard title="Type Details" icon="settings-2">
                <div className="space-y-4">
                  <FormInput
                    control={form.control}
                    name="sales_partner_type"
                    label="Partner Type Name"
                    required
                    placeholder="e.g. Agency, Reseller, Distributor"
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
                    {createMutation.isPending ? "Saving..." : "Create Type"}
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
