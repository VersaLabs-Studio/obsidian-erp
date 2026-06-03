// app/crm/settings/industry-type/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Edit Industry Type Page
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
import { FormInput } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { IndustryTypeUpdateSchema } from "@/lib/schemas/doctype-schemas";

export default function EditIndustryTypePage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  // Fetch record
  const {
    data: industryType,
    isLoading,
    error,
  } = useFrappeDoc("Industry Type", name);

  // Form definition
  const form = useForm({
    resolver: zodResolver(IndustryTypeUpdateSchema),
    defaultValues: {
      industry: "",
    },
  });

  // Prefill form
  useEffect(() => {
    if (industryType) {
      form.reset({
        industry: industryType.industry,
      });
    }
  }, [industryType, form]);

  // Update mutation
  const updateMutation = useFrappeUpdate("Industry Type", {
    onSuccess: () => {
      router.push("/crm/settings/industry-type");
    },
  });

  const onSubmit = async (values: any) => {
    await updateMutation.mutateAsync({ name, data: values });
  };

  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  if (error || !industryType) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive font-bold text-lg">
          Industry Type not found
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Edit: ${industryType.industry}`}
        subtitle={`Update the details for this industry classification.`}
        backHref="/crm/settings/industry-type"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <InfoCard title="Industry Details" icon="briefcase">
            <div className="grid grid-cols-1 gap-6">
              <FormInput
                control={form.control}
                name="industry"
                label="Industry Name"
                placeholder="e.g. Technology, Manufacturing, Healthcare"
                required
              />
            </div>
          </InfoCard>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => router.push("/crm/settings/industry-type")}
            >
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-8 shadow-lg shadow-primary/20"
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />{" "}
              {updateMutation.isPending
                ? "Updating..."
                : "Update Industry Type"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
