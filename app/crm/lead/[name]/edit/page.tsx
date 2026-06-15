// app/crm/lead/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Lead Edit (V4 SmartForm Wizard, edit mode)
// 2-step FlowWizard pre-filled with existing lead data.
// Premium UI: OKLCH semantic tokens only, Framer Motion via FlowWizard.

"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { UserRound, Target } from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { FormInput, FormTextarea, FormFrappeSelect } from "@/components/form";
import { Form } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
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

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(String(params.name));

  const { resolution, showError, dismiss } = useGuidedError();
  const {
    data: lead,
    isLoading,
    error,
  } = useFrappeDoc<Lead>("Lead", name);

  const form = useForm<LeadForm>({
    defaultValues: {
      lead_name: "",
      company_name: "",
      mobile_no: "",
      email_id: "",
      source: "",
      territory: "",
      industry: "",
      notes: "",
    },
  });

  const { control, getValues, reset } = form;
  const watchedAll = useWatch({ control });

  // Prefill from loaded lead
  useEffect(() => {
    if (!lead) return;
    reset({
      lead_name: lead.lead_name ?? "",
      company_name: lead.company_name ?? "",
      mobile_no: lead.mobile_no ?? "",
      email_id: lead.email_id ?? "",
      source: lead.source ?? "",
      territory: lead.territory ?? "",
      industry: lead.industry ?? "",
      notes: "",
    });
  }, [lead, reset]);

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll };
    return {
      step1: validateWizardStep("Lead", "step1", values),
      step2: validateWizardStep("Lead", "step2", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const updateMutation = useFrappeUpdate<Lead>("Lead", {
    showToast: false,
    successMessage: "Lead updated",
    onSuccess: () =>
      router.push(`/crm/lead/${encodeURIComponent(name)}`),
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "Lead" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    updateMutation.mutate({ name, data: values });
  }, [getValues, name, updateMutation]);

  if (isLoading) return <LoadingState />;
  if (error || !lead) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Lead not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${lead.lead_name || name}`}
        subtitle={lead.company_name || lead.email_id}
        backHref={`/crm/lead/${encodeURIComponent(name)}`}
      />

      <Form {...form}>
        <InfoCard>
          <FlowWizard
            steps={WIZARD_STEPS}
            formData={watchedAll as unknown as Record<string, unknown>}
            validationResults={validationResults}
            isSubmitting={updateMutation.isPending}
            onFormDataChange={() => {}}
            onStepChange={() => {}}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            submitLabel="Save Changes"
            submittingLabel="Saving..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<UserRound className="h-5 w-5 text-primary" />}
                      title="Contact Info"
                      description="Update the name and contact details."
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
                      description="Update source, territory, and notes."
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
                      placeholder="Any additional context..."
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
