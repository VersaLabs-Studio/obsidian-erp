// app/sales/settings/terms/new/page.tsx
// Pana ERP v3.0 - Create Terms Page
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
import { FormInput, FormTextarea, FormSwitch } from "@/components/form";
import { TermsAndConditionsCreateSchema } from "@/lib/schemas/doctype-schemas";
import type { TermsandConditions } from "@/types/doctype-types";

export default function CreateTermsPage() {
  const router = useRouter();

  const createMutation = useFrappeCreate<{ data: TermsandConditions }, typeof TermsAndConditionsCreateSchema>(
    "Terms and Conditions",
    {
      onSuccess: () => router.push("/sales/settings/terms"),
      successMessage: "Terms created successfully",
    }
  );

  const form = useForm({
    resolver: zodResolver(TermsAndConditionsCreateSchema),
    defaultValues: {
      title: "",
      selling: true,
      buying: false,
      terms: "",
    },
  });

  const onSubmit = async (data: any) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Terms" subtitle="Define legal terms" backHref="/sales/settings/terms" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="max-w-3xl mx-auto">
            <InfoCard title="Basic Information" icon="file-text">
              <div className="space-y-4">
                <FormInput control={form.control} name="title" label="Title" required placeholder="e.g. Standard Sales Terms" />
                <div className="flex gap-4">
                  <FormSwitch control={form.control} name="selling" label="Apply to Selling" description="For Quotations, Invoices" />
                  <FormSwitch control={form.control} name="buying" label="Apply to Buying" description="For Purchase Orders" />
                </div>
              </div>
            </InfoCard>
            <InfoCard title="Content" icon="scroll-text">
              <FormTextarea
                control={form.control}
                name="terms"
                label="Terms & Conditions"
                required
                placeholder="Enter the legal terms..."
                rows={10}
              />
            </InfoCard>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/sales/settings/terms")}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Terms
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}