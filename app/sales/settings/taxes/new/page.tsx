// app/sales/settings/taxes/new/page.tsx
// Obsidian ERP v4.0 - Create Tax Template Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormSwitch, FormFrappeSelect } from "@/components/form";
import { z } from "zod";
import type { SalesTaxesandChargesTemplate } from "@/types/doctype-types";

// Minimal Schema for MVP
const TaxTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company: z.string().min(1, "Company is required"),
  is_default: z.boolean().optional(),
});

export default function CreateTaxTemplatePage() {
  const router = useRouter();

  const createMutation = useFrappeCreate<{ data: SalesTaxesandChargesTemplate }, any>(
    "Sales Taxes and Charges Template",
    {
      onSuccess: () => router.push("/sales/settings/taxes"),
      successMessage: "Tax template created",
    }
  );

  const form = useForm({
    resolver: zodResolver(TaxTemplateSchema),
    defaultValues: {
      title: "",
      company: "",
      is_default: false,
    },
  });

  const onSubmit = async (data: any) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Tax Template" subtitle="Configure sales taxes" backHref="/sales/settings/taxes" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="max-w-3xl mx-auto">
            <InfoCard title="Template Information" icon="percent">
              <div className="space-y-4">
                <FormInput control={form.control} name="title" label="Template Title" required placeholder="e.g. VAT 15%" />
                <FormFrappeSelect
                  control={form.control}
                  name="company"
                  label="Company"
                  required
                  doctype="Company"
                  labelField="company_name"
                />
                <FormSwitch control={form.control} name="is_default" label="Set as Default Template" />
              </div>
            </InfoCard>
            
            <div className="bg-secondary/20 p-4 rounded-xl text-sm text-muted-foreground">
              <p className="font-medium mb-1">Note for Phase 2:</p>
              This creates the template header. Tax lines (rates, charge types) should be configured in the ERPNext backend or a future advanced editor.
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/sales/settings/taxes")}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Template
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}