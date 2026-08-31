// app/crm/customer/new/page.tsx
// Obsidian ERP v4.0 — Create Customer (V4 FlowWizard 3-step)
// Zod gating via validateWizardStep, reactive validation via useWatch.
// OKLCH semantic tokens only, real persistence.

"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  UserRound,
  PhoneCall,
  ClipboardCheck,
  UserPlus,
  Lock,
} from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import {
  FormInput,
  FormTextarea,
  FormFrappeSelect,
  FormSelect,
} from "@/components/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { Customer } from "@/types/doctype-types";
import { FieldWrap } from "@/components/form/field-wrap";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
const customerFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_type: z.enum(["Company", "Individual", "Partnership"]),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  email_id: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile_no: z.string().optional(),
  tax_id: z.string().optional(),
  website: z.string().optional(),
  customer_details: z.string().optional(),
  lead_name: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

// ---------------------------------------------------------------------------
// Wizard steps
// ---------------------------------------------------------------------------
const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Basic Info",
    description: "Set the customer name, type, and classification",
    schema: null,
    fields: ["customer_name", "customer_type", "customer_group", "territory", "tax_id"],
    icon: "UserRound",
  },
  {
    id: "step2",
    label: "Contact Details",
    description: "Email, phone, and website",
    schema: null,
    fields: ["email_id", "mobile_no", "website", "customer_details"],
    icon: "PhoneCall",
  },
  {
    id: "step3",
    label: "Review & Create",
    description: "Confirm the details before creating",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function CreateCustomerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromLead = searchParams.get("from_lead");
  const isConversion = Boolean(fromLead);

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    () => {
      const init = new Set<string>();
      // Pre-fill lead-sourced fields as auto-filled
      if (searchParams.get("customer_name")) init.add("customer_name");
      if (searchParams.get("territory")) init.add("territory");
      if (searchParams.get("email_id")) init.add("email_id");
      if (searchParams.get("mobile_no")) init.add("mobile_no");
      return init;
    },
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customer_name: searchParams.get("customer_name") || "",
      customer_type: "Company",
      customer_group: "",
      territory: searchParams.get("territory") || "",
      email_id: searchParams.get("email_id") || "",
      mobile_no: searchParams.get("mobile_no") || "",
      tax_id: "",
      website: "",
      customer_details: "",
      lead_name: fromLead || "",
    },
  });

  const { control, getValues } = form;
  const watchedAll = useWatch({ control });

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  // -- Per-step validation ---------------------------------------------------
  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll };
    return {
      step1: validateWizardStep("Customer", "step1", values),
      step2: validateWizardStep("Customer", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  // -- Persistence -----------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();
  const createMutation = useFrappeCreate<{ data: Customer }, Partial<Customer>>(
    "Customer",
    {
      onSuccess: () => router.push("/crm/customer"),
      successMessage: isConversion
        ? "Lead converted to Customer successfully"
        : "Customer created successfully",
      onError: (err) => {
        showError(resolveFrappeError(err, { doctype: "Customer", values: getValues() }));
      },
    },
  );

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const submitData: Partial<Customer> = {
      ...values,
      customer_group: values.customer_group || undefined,
      territory: values.territory || undefined,
      email_id: values.email_id || undefined,
      mobile_no: values.mobile_no || undefined,
      lead_name: values.lead_name || undefined,
    };
    createMutation.mutate(submitData);
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={isConversion ? "Convert Lead to Customer" : "New Customer"}
        subtitle={
          isConversion
            ? `Converting lead: ${fromLead}`
            : "Create a new customer in three steps"
        }
        backHref="/crm/customer"
      />

      {isConversion && (
        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <UserPlus className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-primary">Lead Conversion</p>
            <p className="text-sm text-muted-foreground">
              This customer will be linked to lead: <strong>{fromLead}</strong>
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
      <InfoCard>
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
          submitLabel={isConversion ? "Convert to Customer" : "Create Customer"}
          submittingLabel={isConversion ? "Converting..." : "Creating..."}
          renderStep={(s) => {
            // ---- STEP 1 — Basic Info --------------------------------
            if (s.id === "step1") {
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<UserRound className="h-5 w-5 text-primary" />}
                    title="Basic Information"
                    description="Set the customer name, type, and classification."
                  />
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <FieldWrap auto={isAuto("customer_name")}>
                        <FormInput
                          control={control}
                          name="customer_name"
                          label="Customer Name"
                          required
                          placeholder="Enter customer or company name..."
                        />
                      </FieldWrap>
                    </div>
                    <FormSelect
                      control={control}
                      name="customer_type"
                      label="Customer Type"
                      required
                      options={[
                        { value: "Company", label: "Company" },
                        { value: "Individual", label: "Individual" },
                        { value: "Partnership", label: "Partnership" },
                      ]}
                    />
                    <FormFrappeSelect
                      control={control}
                      name="customer_group"
                      label="Customer Group"
                      doctype="Customer Group"
                      labelField="customer_group_name"
                    />
                    <FieldWrap auto={isAuto("territory")}>
                      <FormFrappeSelect
                        control={control}
                        name="territory"
                        label="Territory"
                        doctype="Territory"
                        labelField="territory_name"
                      />
                    </FieldWrap>
                    <FormInput
                      control={control}
                      name="tax_id"
                      label="Tax ID"
                      placeholder="e.g., TIN number"
                    />
                  </div>
                </div>
              );
            }

            // ---- STEP 2 — Contact Details ----------------------------
            if (s.id === "step2") {
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<PhoneCall className="h-5 w-5 text-primary" />}
                    title="Contact Details"
                    description="Email, phone, and website information."
                  />
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrap auto={isAuto("email_id")}>
                      <FormInput
                        control={control}
                        name="email_id"
                        label="Email"
                        type="email"
                        placeholder="email@company.com"
                      />
                    </FieldWrap>
                    <FieldWrap auto={isAuto("mobile_no")}>
                      <FormInput
                        control={control}
                        name="mobile_no"
                        label="Mobile No"
                        placeholder="+251 9XX XXX XXX"
                      />
                    </FieldWrap>
                    <div className="md:col-span-2">
                      <FormInput
                        control={control}
                        name="website"
                        label="Website"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FormTextarea
                        control={control}
                        name="customer_details"
                        label="Notes"
                        placeholder="Additional information about this customer..."
                        minHeight="120px"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            // ---- STEP 3 — Review & Create ----------------------------
            const v = getValues();
            return (
              <div className="space-y-5">
                <StepHeading
                  icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                  title="Review & Create"
                  description="Confirm the details below before creating the customer."
                />
                <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Summary label="Customer Name" value={v.customer_name} />
                    <Summary label="Type" value={v.customer_type} />
                    <Summary label="Group" value={v.customer_group || "—"} />
                    <Summary label="Territory" value={v.territory || "—"} />
                    <Summary label="Tax ID" value={v.tax_id || "—"} />
                    <Summary label="Email" value={v.email_id || "—"} />
                    <Summary label="Mobile" value={v.mobile_no || "—"} />
                    <Summary label="Website" value={v.website || "—"} />
                  </div>
                  {v.customer_details && (
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-foreground">{v.customer_details}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      </InfoCard>
      </Form>
      <GuidedErrorDialog resolution={resolution} onDismiss={dismiss} />
    </div>
  );
}

export default function CreateCustomerPage() {
  return (
    <Suspense fallback={<LoadingState type="detail" />}>
      <CreateCustomerForm />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Local presentational helpers
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

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}
