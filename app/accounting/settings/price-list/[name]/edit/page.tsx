// app/accounting/settings/price-list/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Price List
"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X, BadgeDollarSign, Sparkles } from "lucide-react";

import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { PriceListUpdateSchema } from "@/lib/schemas/doctype-schemas";
import { getActiveCompany } from "@/lib/settings/company";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";

interface PriceList {
  name: string;
  price_list_name: string;
  currency: string;
  buying: number;
  selling: number;
  enabled: number;
}

export default function EditPriceListPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: encodedName } = use(params);
  const name = decodeURIComponent(encodedName);
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();

  const {
    data: priceList,
    isLoading,
    error,
  } = useFrappeDoc<PriceList>("Price List", name);

  const form = useForm({
    resolver: zodResolver(PriceListUpdateSchema),
    defaultValues: {
      price_list_name: "",
      currency: "",
      buying: 0 as const,
      selling: 1 as const,
      enabled: 1 as const,
    },
  });

  useEffect(() => {
    if (priceList) {
      form.reset({
        price_list_name: priceList.price_list_name,
        currency: priceList.currency,
        buying: (priceList.buying as 0 | 1) ?? 0,
        selling: (priceList.selling as 0 | 1) ?? 1,
        enabled: (priceList.enabled as 0 | 1) ?? 1,
      });
    }
  }, [priceList, form]);

  const updateMutation = useFrappeUpdate("Price List", {
    showToast: false,
    onSuccess: () => router.push("/accounting/settings/price-list"),
    onError: (err) => {
      const resolution = resolveFrappeError(err, {
        doctype: "Price List",
        values: form.getValues(),
      });
      showError(resolution);
    },
  });

  const onSubmit = async (values: Record<string, unknown>) => {
    const company = getActiveCompany();
    await updateMutation.mutateAsync({
      name,
      data: { ...values, company },
    });
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !priceList)
    return (
      <div className="p-8 text-center text-destructive">
        Price List not found
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <PageHeader
        title={`Edit: ${priceList.price_list_name}`}
        subtitle="Modify price list settings and configuration."
        backHref={`/accounting/settings/price-list/${encodeURIComponent(name)}`}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <InfoCard
                title="Price List Details"
                icon={<BadgeDollarSign className="h-4 w-4" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <FormInput
                      control={form.control}
                      name="price_list_name"
                      label="Price List Name"
                      placeholder="e.g. Standard Selling"
                      required
                    />
                  </div>
                  <FormFrappeSelect
                    control={form.control}
                    name="currency"
                    label="Currency"
                    required
                    doctype="Currency"
                    labelField="currency_name"
                    placeholder="Select currency..."
                  />
                </div>
              </InfoCard>

              <InfoCard
                title="Configuration"
                icon={<Sparkles className="h-4 w-4" />}
              >
                <div className="space-y-1">
                  <FormSwitch
                    control={form.control}
                    name="selling"
                    label="Selling"
                    description="Use this price list for sales transactions"
                    transform={{
                      input: (val) => val === 1,
                      output: (val) => (val ? 1 : 0) as 0 | 1,
                    }}
                  />
                  <FormSwitch
                    control={form.control}
                    name="buying"
                    label="Buying"
                    description="Use this price list for purchase transactions"
                    transform={{
                      input: (val) => val === 1,
                      output: (val) => (val ? 1 : 0) as 0 | 1,
                    }}
                  />
                  <FormSwitch
                    control={form.control}
                    name="enabled"
                    label="Enabled"
                    description="Enable this price list for use in transactions"
                    transform={{
                      input: (val) => val === 1,
                      output: (val) => (val ? 1 : 0) as 0 | 1,
                    }}
                  />
                </div>
              </InfoCard>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-24 p-8 rounded-2xl bg-primary/5 border border-primary/10 space-y-6">
                <Button
                  type="submit"
                  className="w-full rounded-full h-12 shadow-xl shadow-primary/20"
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full h-12"
                  onClick={() =>
                    router.push(
                      `/accounting/settings/price-list/${encodeURIComponent(
                        name
                      )}`
                    )
                  }
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
