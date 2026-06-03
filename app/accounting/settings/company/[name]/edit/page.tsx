// app/accounting/settings/company/[name]/edit/page.tsx
// Obsidian ERP v4.0 - Update Company Profile
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X, Building2, Sparkles } from "lucide-react";

// v3.0 Imports
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { CompanyUpdateSchema } from "@/lib/schemas/doctype-schemas";
import type { Company } from "@/types/doctype-types";

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const {
    data: company,
    isLoading,
    error,
  } = useFrappeDoc<Company>("Company", name);

  const form = useForm({
    resolver: zodResolver(CompanyUpdateSchema),
    defaultValues: {
      company_name: "",
      abbr: "",
      default_currency: "",
      country: "",
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        company_name: company.company_name,
        abbr: company.abbr,
        default_currency: company.default_currency,
        country: company.country,
      });
    }
  }, [company, form]);

  const updateMutation = useFrappeUpdate("Company", {
    onSuccess: () => router.push("/accounting/settings/company"),
  });

  const onSubmit = async (values: any) => {
    await updateMutation.mutateAsync({ name, data: values });
  };

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !company)
    return (
      <div className="p-20 text-center font-bold text-destructive">
        Profile not found
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <PageHeader
        title={`Edit: ${company.company_name}`}
        subtitle="Modify organizational settings and regional defaults."
        backHref="/accounting/settings/company"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <InfoCard
                title="Core Identity"
                icon={<Building2 className="h-4 w-4" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    control={form.control}
                    name="company_name"
                    label="Legal Entity Name"
                    placeholder="e.g. Obsidian Labs PLC"
                    required
                  />
                  <FormInput
                    control={form.control}
                    name="abbr"
                    label="Abbreviation"
                    placeholder="e.g. PS"
                    required
                  />
                </div>
              </InfoCard>

              <InfoCard
                title="Regional Defaults"
                icon={<Sparkles className="h-4 w-4" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    control={form.control}
                    name="country"
                    label="Country"
                    placeholder="e.g. Ethiopia"
                    required
                  />
                  <FormInput
                    control={form.control}
                    name="default_currency"
                    label="Base Currency"
                    placeholder="e.g. ETB"
                    required
                  />
                </div>
              </InfoCard>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-24 p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 space-y-6">
                <Button
                  type="submit"
                  className="w-full rounded-full h-12 shadow-xl shadow-primary/20"
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full h-12"
                  onClick={() => router.push("/accounting/settings/company")}
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
