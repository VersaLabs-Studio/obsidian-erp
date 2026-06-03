// app/sales/settings/taxes/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Update Tax Template Page
// @ts-nocheck

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2, Save, X } from "lucide-react";

// v3.0 Imports
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormSwitch, FormFrappeSelect } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { z } from "zod";
import type { SalesTaxesandChargesTemplate } from "@/types/doctype-types";

// Minimal Schema for MVP
const TaxTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().min(1, "Company is required"),
  is_default: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

export default function EditTaxTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // Fetch record
  const {
    data: taxData,
    isLoading,
    error,
  } = useFrappeDoc<SalesTaxesandChargesTemplate>(
    "Sales Taxes and Charges Template",
    name
  );

  // Form definition
  const form = useForm({
    resolver: zodResolver(TaxTemplateSchema),
    defaultValues: {
      title: "",
      company: "",
      is_default: false,
      disabled: false,
    },
  });

  // Prefill form
  useEffect(() => {
    if (taxData) {
      form.reset({
        title: taxData.title,
        company: taxData.company,
        is_default: taxData.is_default === 1,
        disabled: taxData.disabled === 1,
      });
    }
  }, [taxData, form]);

  // Update mutation
  const updateMutation = useFrappeUpdate("Sales Taxes and Charges Template", {
    onSuccess: () => {
      router.push("/sales/settings/taxes");
    },
  });

  const onSubmit = async (values: any) => {
    // Transform booleans to 0/1 for the API (which transforms them again but safe to be explicit)
    const submittedValues = {
      ...values,
      is_default: values.is_default ? 1 : 0,
      disabled: values.disabled ? 1 : 0,
    };
    await updateMutation.mutateAsync({ name, data: submittedValues });
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !taxData)
    return (
      <div className="p-20 text-center font-bold text-destructive">
        Template not found
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <PageHeader
        title={`Edit Template: ${taxData.title}`}
        subtitle="Modify sales tax configuration"
        backHref="/sales/settings/taxes"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InfoCard title="Template Information" icon="percent">
            <div className="space-y-4">
              <FormInput
                control={form.control}
                name="title"
                label="Template Title"
                required
                placeholder="e.g. VAT 15%"
              />
              <FormFrappeSelect
                control={form.control}
                name="company"
                label="Company"
                required
                doctype="Company"
                labelField="company_name"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSwitch
                  control={form.control}
                  name="is_default"
                  label="Set as Default Template"
                />
                <FormSwitch
                  control={form.control}
                  name="disabled"
                  label="Disabled"
                />
              </div>
            </div>
          </InfoCard>

          <div className="bg-secondary/20 p-6 rounded-[2rem] text-sm text-muted-foreground border border-primary/5">
            <p className="font-bold text-foreground mb-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4" />
              Note for Phase 2:
            </p>
            This editor manages the template header. To modify specific tax
            rates or account accounts, please use the ERPNext backend or wait
            for the Advanced Tax Grid update.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6"
              onClick={() => router.push("/sales/settings/taxes")}
            >
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-8 shadow-lg shadow-primary/20"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
