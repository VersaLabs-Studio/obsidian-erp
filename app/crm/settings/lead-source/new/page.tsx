// app/crm/settings/lead-source/new/page.tsx
// Obsidian ERP v4.0 - New Lead Source Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormTextarea } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { LeadSourceCreateSchema } from "@/lib/schemas/doctype-schemas";

export default function NewLeadSourcePage() {
  const router = useRouter();

  // Form definition
  const form = useForm({
    resolver: zodResolver(LeadSourceCreateSchema),
    defaultValues: {
      source_name: "",
      details: "",
    },
  });

  // Create mutation
  const createMutation = useFrappeCreate("Lead Source", {
    onSuccess: () => {
      router.push("/crm/settings/lead-source");
    },
  });

  const onSubmit = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="New Lead Source"
        subtitle="Define a new channel for tracking lead acquisition."
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
              disabled={createMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />{" "}
              {createMutation.isPending ? "Saving..." : "Save Lead Source"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
