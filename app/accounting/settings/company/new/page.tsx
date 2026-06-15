// app/accounting/settings/company/new/page.tsx
// Obsidian ERP v4.0 - Register New Company
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, X, Building2, Sparkles } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormSelect } from "@/components/form";
import { InfoCard } from "@/components/ui/info-card";
import { CompanyCreateSchema } from "@/lib/schemas/doctype-schemas";

export default function NewCompanyPage() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(CompanyCreateSchema),
    defaultValues: {
      company_name: "",
      abbr: "",
      default_currency: "ETB",
      country: "Ethiopia",
    },
  });

  const createMutation = useFrappeCreate("Company", {
    onSuccess: () => router.push("/accounting/settings/company"),
  });

  const onSubmit = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <PageHeader
        title="Register Company"
        subtitle="Establish a new organizational profile in the system."
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
                    placeholder="e.g. Obsidian Softwares PLC"
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
              <div className="sticky top-24 p-8 rounded-2xl bg-primary/5 border border-primary/10 space-y-6">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Guide
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                  The{" "}
                  <span className="text-primary font-bold">Abbreviation</span>{" "}
                  is used in your Chart of Accounts to uniquely identify
                  accounts belonging to this entity.
                </p>
                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-full h-12 shadow-xl shadow-primary/20"
                    disabled={createMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {createMutation.isPending
                      ? "Saving Profile..."
                      : "Register Company"}
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
          </div>
        </form>
      </Form>
    </div>
  );
}
