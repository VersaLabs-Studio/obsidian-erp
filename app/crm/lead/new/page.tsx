// app/crm/lead/new/page.tsx
// Obsidian ERP v4.0 — Lead Create (V4 SmartForm Wizard)
// 2-step FlowWizard with Zod step gating.
// Premium UI: OKLCH semantic tokens only, Framer Motion via FlowWizard.

"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { UserRound, Target } from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { FormInput, FormTextarea, FormFrappeSelect } from "@/components/form";
import { Form } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate } from "@/hooks/generic";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { Lead } from "@/types/doctype-types";

interface LeadForm {
  lead_name: string;
  company_name: string;
  mobile_no: string;
  email_id: string;
  source: string;
  territory: string;
  industry: string;
  notes: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Contact Info",
    description: "Name and contact details for this lead",
    schema: null,
    fields: ["lead_name", "company_name", "mobile_no", "email_id"],
    icon: "UserRound",
  },
  {
    id: "step2",
    label: "Qualification",
    description: "Source, territory, and qualification details",
    schema: null,
    fields: ["source", "territory", "industry", "notes"],
    icon: "Target",
  },
];

export default function NewLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<LeadForm>({
    defaultValues: {
      lead_name: searchParams.get("lead_name") || "",
      company_name: searchParams.get("company_name") || "",
      mobile_no: searchParams.get("mobile_no") || "",
      email_id: searchParams.get("email_id") || "",
      source: searchParams.get("source") || "",
      territory: searchParams.get("territory") || "",
      industry: "",
      notes: "",
    },
  });

  const { control, getValues } = form;
  const watchedAll = useWatch({ control });

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll };
    return {
      step1: validateWizardStep("Lead", "step1", values),
      step2: validateWizardStep("Lead", "step2", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Lead", {
    successMessage: "Lead created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/crm/lead/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "Lead",
        values: getValues(),
      });
      showError(r);
    },
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    createMutation.mutate({
      ...values,
      status: "Lead",
      naming_series: "CRM-LEAD-.YYYY.-",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Lead"
        subtitle="Capture a new sales inquiry"
        backHref="/crm/lead"
      />

      <Form {...form}>
        <InfoCard>
          <FlowWizard
            steps={WIZARD_STEPS}
            formData={watchedAll as unknown as Record<string, unknown>}
            validationResults={validationResults}
            isSubmitting={createMutation.isPending}
            onFormDataChange={() => {}}
            onStepChange={() => {}}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            submitLabel="Create Lead"
            submittingLabel="Creating..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<UserRound className="h-5 w-5 text-primary" />}
                      title="Contact Info"
                      description="Who is this lead? Provide their name and contact details."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormInput
                        control={control}
                        name="lead_name"
                        label="Lead Name"
                        required
                        placeholder="Full name or company..."
                      />
                      <FormInput
                        control={control}
                        name="company_name"
                        label="Company Name"
                        placeholder="Organization name..."
                      />
                      <FormInput
                        control={control}
                        name="mobile_no"
                        label="Mobile No"
                        placeholder="+251 9XX XXX XXX"
                      />
                      <FormInput
                        control={control}
                        name="email_id"
                        label="Email"
                        type="email"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                );
              }

              if (s.id === "step2") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Target className="h-5 w-5 text-primary" />}
                      title="Qualification"
                      description="How did this lead find you and what are they interested in?"
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect
                        control={control}
                        name="source"
                        label="Lead Source"
                        doctype="Lead Source"
                        labelField="source_name"
                        placeholder="Select source..."
                      />
                      <FormFrappeSelect
                        control={control}
                        name="territory"
                        label="Territory"
                        doctype="Territory"
                        labelField="territory_name"
                        placeholder="Select territory..."
                      />
                      <FormFrappeSelect
                        control={control}
                        name="industry"
                        label="Industry"
                        doctype="Industry Type"
                        labelField="industry"
                        placeholder="Select industry..."
                      />
                    </div>
                    <FormTextarea
                      control={control}
                      name="notes"
                      label="Notes"
                      placeholder="Any additional context about this lead..."
                    />
                  </div>
                );
              }

              return null;
            }}
          />
        </InfoCard>
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}

function StepHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
