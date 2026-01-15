// app/sales/settings/terms/[name]/edit/page.tsx
// Pana ERP v3.0 - Edit Terms Page
// @ts-nocheck

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { FormInput, FormTextarea, FormSwitch } from "@/components/form";
import { TermsAndConditionsCreateSchema } from "@/lib/schemas/doctype-schemas"; // Reusing create schema
import type { TermsandConditions } from "@/types/doctype-types";

export default function EditTermsPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const { data: term, isLoading } = useFrappeDoc<TermsandConditions>("Terms and Conditions", name);

  const updateMutation = useFrappeUpdate<{ data: TermsandConditions }, any>(
    "Terms and Conditions",
    {
      onSuccess: () => router.push("/sales/settings/terms"),
      successMessage: "Terms updated successfully",
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

  useEffect(() => {
    if (term) {
      form.reset(term);
    }
  }, [term, form]);

  if (isLoading) return <LoadingState type="detail" />;

  const onSubmit = async (data: any) => {
    await updateMutation.mutateAsync({ name, data });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit: ${term?.title}`} backHref="/sales/settings/terms" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="max-w-3xl mx-auto">
            <InfoCard title="Basic Information" icon="file-text">
              <div className="space-y-4">
                <FormInput control={form.control} name="title" label="Title" required />
                <div className="flex gap-4">
                  <FormSwitch control={form.control} name="selling" label="Apply to Selling" />
                  <FormSwitch control={form.control} name="buying" label="Apply to Buying" />
                </div>
              </div>
            </InfoCard>
            <InfoCard title="Content" icon="scroll-text">
              <FormTextarea control={form.control} name="terms" label="Terms & Conditions" required rows={10} />
            </InfoCard>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/sales/settings/terms")}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}