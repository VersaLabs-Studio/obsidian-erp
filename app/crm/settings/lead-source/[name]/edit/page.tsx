// app/crm/settings/lead-source/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Lead Source Page
// @ts-nocheck

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X } from "lucide-react";

// v3.0 Imports
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormTextarea } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { LeadSourceUpdateSchema } from "@/lib/schemas/doctype-schemas";

export default function EditLeadSourcePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // Fetch record
  const {
    data: leadSource,
    isLoading,
    error,
  } = useFrappeDoc("Lead Source", name);

  // Form definition
  const form = useForm({
    resolver: zodResolver(LeadSourceUpdateSchema),
    defaultValues: {
      source_name: "",
      details: "",
    },
  });

  // Prefill form
  useEffect(() => {
    if (leadSource) {
      form.reset({
        source_name: leadSource.source_name,
        details: leadSource.details || "",
      });
    }
  }, [leadSource, form]);

  // Update mutation
  const updateMutation = useFrappeUpdate("Lead Source", {
    onSuccess: () => {
      router.push("/crm/settings/lead-source");
    },
  });

  const onSubmit = async (values: any) => {
    await updateMutation.mutateAsync({ name, data: values });
  };

  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  if (error || !leadSource) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive font-bold text-lg">
          Lead Source not found
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Edit: ${leadSource.source_name}`}
        subtitle={`Update the details for this lead acquisition channel.`}
        backHref="/crm/settings/lead-source"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InfoCard title="Source Details" icon="tag">
            <div className="grid grid-cols-1 gap-6">
              <FormInput
                control={form.control}
                name="source_name"
                label="Source Name"
                placeholder="e.g. Website, Referral, Cold Call"
                required
              />
              <FormTextarea
                control={form.control}
                name="details"
                label="Description"
                placeholder="Additional details about this source..."
              />
            </div>
          </InfoCard>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/crm/settings/lead-source")}
            >
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-8 shadow-lg shadow-primary/20"
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />{" "}
              {updateMutation.isPending ? "Updating..." : "Update Lead Source"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
