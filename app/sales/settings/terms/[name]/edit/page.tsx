// app/sales/settings/terms/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Update Terms and Conditions Page
// @ts-nocheck

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X, FileText, Sparkles } from "lucide-react";

// v3.0 Imports
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormTextarea, FormSwitch } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { TermsAndConditionsUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { TermsandConditions } from "@/types/doctype-types";

export default function EditTermsPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // Fetch record
  const {
    data: termsData,
    isLoading,
    error,
  } = useFrappeDoc<TermsandConditions>("Terms and Conditions", name);

  // Form definition
  const form = useForm({
    resolver: zodResolver(TermsAndConditionsUpdateSchema),
    defaultValues: {
      title: "",
      terms: "",
      selling: 0,
      buying: 0,
      disabled: 0,
    },
  });

  // Prefill form
  useEffect(() => {
    if (termsData) {
      form.reset({
        title: termsData.title,
        terms: termsData.terms || "",
        selling: termsData.selling === 1,
        buying: termsData.buying === 1,
        disabled: termsData.disabled === 1,
      });
    }
  }, [termsData, form]);

  // Update mutation
  const updateMutation = useFrappeUpdate("Terms and Conditions", {
    onSuccess: () => {
      router.push("/sales/settings/terms");
    },
  });

  const onSubmit = async (values: any) => {
    const submittedValues = {
      ...values,
      selling: values.selling ? 1 : 0,
      buying: values.buying ? 1 : 0,
      disabled: values.disabled ? 1 : 0,
    };
    await updateMutation.mutateAsync({ name, data: submittedValues });
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !termsData)
    return (
      <div className="p-20 text-center font-bold text-destructive">
        Policy not found
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <PageHeader
        title={`Edit Policy: ${termsData.title}`}
        subtitle="Modify standard terms and conditions for transactions."
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
                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full rounded-full h-12 shadow-xl shadow-primary/20 text-base font-bold"
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "Updating..." : "Save Changes"}
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
