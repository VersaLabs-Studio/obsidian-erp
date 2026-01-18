"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput } from "@/components/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { SalesPartnerTypeUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type {
  SalesPartnerType,
  SalesPartnerTypeUpdateRequest,
} from "@/types/doctype-types";
import z from "zod";
import { toast } from "sonner";
import { useEffect } from "react";

type FormData = z.infer<typeof SalesPartnerTypeUpdateSchema>;

export default function EditSalesPartnerTypePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();

  const {
    data: partnerType,
    isLoading,
    error,
  } = useFrappeDoc<SalesPartnerType>("Sales Partner Type", name);

  const updateMutation = useFrappeUpdate<
    { data: SalesPartnerType },
    { name: string; data: SalesPartnerTypeUpdateRequest }
  >("Sales Partner Type", {
    onSuccess: () => {
      toast.success("Partner type updated successfully");
      router.push("/sales/settings/sales-partner-type");
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(SalesPartnerTypeUpdateSchema),
    defaultValues: {
      sales_partner_type: "",
    },
  });

  useEffect(() => {
    if (partnerType) {
      form.reset({
        sales_partner_type: partnerType.sales_partner_type,
      });
    }
  }, [partnerType, form]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading partner type</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Partner Type: ${name}`}
        backHref="/sales/settings/sales-partner-type"
      />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) =>
            updateMutation.mutate({
              name,
              data: d as SalesPartnerTypeUpdateRequest,
            }),
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
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
