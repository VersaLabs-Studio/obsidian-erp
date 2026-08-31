"use client";

// app/manufacturing/job-card/new/page.tsx
// Job Card Create — 2-step FlowWizard, Zod gating, pre-fill from ?work_order=.
// Step 1: Job Details (work_order, operation, workstation, for_quantity)
// Step 2: Review (summary of what will be created)

import { useMemo, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  Wrench,
  ClipboardCheck,
} from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  FormInput,
  FormFrappeSelect,
} from "@/components/form";
import { Form } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate } from "@/hooks/generic";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import { getActiveCompany } from "@/lib/settings/company";
import type { WizardStep } from "@/types/flow-types";

// ---------------------------------------------------------------------------
// Form model — mirrors the API route's allowed fields
// ---------------------------------------------------------------------------
interface JobCardForm {
  naming_series: string;
  work_order: string;
  operation: string;
  workstation: string;
  for_quantity: number;
  company: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Job Details",
    description: "Select the work order, operation, and workstation",
    schema: null,
    fields: ["work_order", "operation", "workstation", "for_quantity"],
    icon: "Wrench",
  },
  {
    id: "step2",
    label: "Review",
    description: "Confirm the job card details before creation",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

// ---------------------------------------------------------------------------
// Local presentational helper
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Page body
// ---------------------------------------------------------------------------
function CreateJobCardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preWorkOrder = searchParams.get("work_order") ?? "";

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<JobCardForm>({
    defaultValues: {
      naming_series: "MFG-JC-.YYYY.-",
      work_order: preWorkOrder,
      operation: "",
      workstation: "",
      for_quantity: 0,
      company: getActiveCompany(),
    },
  });

  const { control, getValues, watch } = form;
  const watchedAll = watch();

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = getValues();
    return {
      step1: validateWizardStep("Job Card", "step1", values),
      step2: validateWizardStep("Job Card", "step2", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Job Card", {
    successMessage: "Job Card created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/manufacturing/job-card`);
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "Job Card",
        values: getValues(),
      });
      showError(r);
    },
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    if (!values.work_order) {
      setStep(0);
      return;
    }
    createMutation.mutate({
      ...values,
      company: values.company || getActiveCompany(),
      docstatus: 0,
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Job Card"
        subtitle={
          preWorkOrder
            ? `For Work Order ${preWorkOrder}`
            : "Start a new production job card"
        }
        backHref="/manufacturing/job-card"
      />

      <Form {...form}>
        <FlowWizard
          steps={WIZARD_STEPS}
          formData={watchedAll as unknown as Record<string, unknown>}
          validationResults={validationResults}
          isSubmitting={createMutation.isPending}
          onFormDataChange={() => {}}
          onStepChange={setStep}
          onTriedNextChange={setTriedNextSteps}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          submitLabel="Create Job Card"
          submittingLabel="Creating..."
          renderStep={(s) => {
            // ---- STEP 1 — Job Details ------------------------------------
            if (s.id === "step1") {
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<Wrench className="h-5 w-5 text-primary" />}
                    title="Job Details"
                    description="Select the work order, operation, and workstation for this job card."
                  />
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormFrappeSelect
                      control={control}
                      name="work_order"
                      label="Work Order"
                      required
                      doctype="Work Order"
                      placeholder="Search work order..."
                      filters={[["docstatus", "=", 1]]}
                    />
                    <FormFrappeSelect
                      control={control}
                      name="operation"
                      label="Operation"
                      required
                      doctype="Operation"
                      placeholder="Select operation..."
                    />
                    <FormFrappeSelect
                      control={control}
                      name="workstation"
                      label="Workstation"
                      required
                      doctype="Workstation"
                      placeholder="Select workstation..."
                    />
                    <FormInput
                      control={control}
                      name="for_quantity"
                      label="Quantity to Produce"
                      type="number"
                    />
                  </div>
                </div>
              );
            }

            // ---- STEP 2 — Review ----------------------------------------
            return (
              <div className="space-y-6">
                <StepHeading
                  icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                  title="Review Job Card"
                  description="Review the details before creating the job card."
                />
                <div className="rounded-xl bg-card p-6 shadow-sm">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReviewRow
                      label="Work Order"
                      value={watchedAll.work_order || "—"}
                    />
                    <ReviewRow
                      label="Operation"
                      value={watchedAll.operation || "—"}
                    />
                    <ReviewRow
                      label="Workstation"
                      value={watchedAll.workstation || "—"}
                    />
                    <ReviewRow
                      label="Quantity"
                      value={String(watchedAll.for_quantity ?? 0)}
                    />
                    <ReviewRow
                      label="Company"
                      value={watchedAll.company || getActiveCompany()}
                    />
                  </dl>
                </div>
              </div>
            );
          }}
        />
      </Form>

      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}

export default function NewJobCardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CreateJobCardForm />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Review row helper
// ---------------------------------------------------------------------------
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
