// app/sales/settings/terms/new/page.tsx
// Obsidian ERP v4.0 - New Terms and Conditions Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X, FileText, Sparkles } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormTextarea, FormSwitch } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { TermsAndConditionsCreateSchema } from "@/lib/schemas/doctype-schemas";

export default function NewTermsPage() {
  const router = useRouter();

  // Form definition
  const form = useForm({
    resolver: zodResolver(TermsAndConditionsCreateSchema),
    defaultValues: {
      title: "",
      terms: "",
      selling: 1,
      buying: 0,
      disabled: 0,
    },
  });

  // Create mutation
  const createMutation = useFrappeCreate("Terms and Conditions", {
    onSuccess: () => {
      router.push("/sales/settings/terms");
    },
  });

  const onSubmit = async (values: any) => {
    // Convert boolean switches to 0/1 if they are booleans from react-hook-form
    const submittedValues = {
      ...values,
      selling: values.selling ? 1 : 0,
      buying: values.buying ? 1 : 0,
      disabled: values.disabled ? 1 : 0,
    };
    await createMutation.mutateAsync(submittedValues);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <PageHeader
        title="New Policy Template"
        subtitle="Define standard terms and conditions for transactions."
        backHref="/sales/settings/terms"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <InfoCard
                title="Policy Content"
                icon={<FileText className="h-4 w-4" />}
              >
                <div className="space-y-6">
                  <FormInput
                    control={form.control}
                    name="title"
                    label="Policy Title"
                    placeholder="e.g. Standard Sales Agreement"
                    required
                  />
                  <FormTextarea
                    control={form.control}
                    name="terms"
                    label="Terms Content"
                    placeholder="Write your contract terms here..."
                    className="min-h-[300px]"
                    required
                  />
                </div>
              </InfoCard>

              <InfoCard
                title="Visibility & Scope"
                icon={<Sparkles className="h-4 w-4" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <FormSwitch
                      control={form.control}
                      name="selling"
                      label="Available in Sales"
                      description="Show this template in Quotations and Sales Orders."
                    />
                    <FormSwitch
                      control={form.control}
                      name="buying"
                      label="Available in Buying"
                      description="Show this template in Purchase Orders."
                    />
                  </div>
                  <div className="space-y-4 pt-0 md:pt-2">
                    <FormSwitch
                      control={form.control}
                      name="disabled"
                      label="Disabled"
                      description="Temporarily hide this template from selections."
                    />
                  </div>
                </div>
              </InfoCard>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="p-8 rounded-[2.5rem] bg-indigo-600/5 dark:bg-primary/10 border border-primary/10 space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Pro Tip
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Standardize your legal terms to ensure consistency across
                    all sales documents. These terms will be selectable in the{" "}
                    <span className="text-primary font-bold font-mono text-[11px]">
                      Terms and Conditions
                    </span>{" "}
                    section of Quotations.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full rounded-full h-12 shadow-xl shadow-primary/20 text-base font-bold"
                    disabled={createMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createMutation.isPending
                      ? "Configuring..."
                      : "Save Template"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-full h-12 text-muted-foreground"
                    onClick={() => router.push("/sales/settings/terms")}
                  >
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
