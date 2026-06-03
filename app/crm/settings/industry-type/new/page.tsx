// app/crm/settings/industry-type/new/page.tsx
// Obsidian ERP v4.0 - New Industry Type Page
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
import { FormInput } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { IndustryTypeCreateSchema } from "@/lib/schemas/doctype-schemas";

export default function NewIndustryTypePage() {
  const router = useRouter();

  // Form definition
  const form = useForm({
    resolver: zodResolver(IndustryTypeCreateSchema),
    defaultValues: {
      industry: "",
    },
  });

  // Create mutation
  const createMutation = useFrappeCreate("Industry Type", {
    onSuccess: () => {
      router.push("/crm/settings/industry-type");
    },
  });

  const onSubmit = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="New Industry Type"
        subtitle="Create a new classification for your CRM entities."
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
              disabled={createMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />{" "}
              {createMutation.isPending ? "Saving..." : "Save Industry Type"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
