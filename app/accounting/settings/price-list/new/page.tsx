// app/accounting/settings/price-list/new/page.tsx
// Obsidian ERP v4.0 - Create New Price List
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X, BadgeDollarSign, Sparkles } from "lucide-react";

import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { PriceListCreateSchema } from "@/lib/schemas/doctype-schemas";
import { getActiveCompany } from "@/lib/settings/company";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";

export default function NewPriceListPage() {
  const router = useRouter();
  const { resolution, showError, dismiss } = useGuidedError();

  const form = useForm({
    resolver: zodResolver(PriceListCreateSchema),
    defaultValues: {
      price_list_name: "",
      currency: "",
      buying: 0 as const,
      selling: 1 as const,
      enabled: 1 as const,
    },
  });

  const createMutation = useFrappeCreate("Price List", {
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
    await createMutation.mutateAsync({
      ...values,
      company,
    } as Record<string, unknown>);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <PageHeader
        title="New Price List"
        subtitle="Create a new price list for buying or selling rates."
        backHref="/accounting/settings/price-list"
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
                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Guide
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                  A <span className="text-primary font-bold">Price List</span>{" "}
                  defines the rates at which items are bought or sold. Toggle{" "}
                  <span className="text-primary font-bold">Buying</span> and{" "}
                  <span className="text-primary font-bold">Selling</span> to set
                  the usage context.
                </p>
                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-full h-12 shadow-xl shadow-primary/20"
                    disabled={createMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createMutation.isPending
                      ? "Creating..."
                      : "Create Price List"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-full h-12"
                    onClick={() =>
                      router.push("/accounting/settings/price-list")
                    }
                  >
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}
