// app/crm/opportunity/new/page.tsx
// Obsidian ERP v4.0 — Opportunity Create (V4 SmartForm Wizard)
// 2-step FlowWizard with Zod step gating.
// Supports auto-fill from Lead via query params.
// Premium UI: OKLCH semantic tokens only, Framer Motion via FlowWizard.

"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Target, Package, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
  FormSelect,
} from "@/components/form";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate } from "@/hooks/generic";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import { useFieldArray } from "react-hook-form";
import { getActiveCompany } from "@/lib/settings/company";

interface OppItem {
  item_code: string;
  item_name?: string;
  qty: number;
  rate: number;
}

interface OppForm {
  opportunity_from: string;
  party_name: string;
  company: string;
  transaction_date: string;
  opportunity_type: string;
  sales_stage: string;
  probability: number;
  expected_closing: string;
  items: OppItem[];
}

const EMPTY_ITEM: OppItem = { item_code: "", qty: 1, rate: 0 };

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Source & Contact",
    description: "Where this opportunity comes from",
    schema: null,
    fields: ["opportunity_from", "party_name", "transaction_date"],
    icon: "Target",
  },
  {
    id: "step2",
    label: "Details",
    description: "Opportunity type, stage, and items",
    schema: null,
    fields: ["opportunity_type", "sales_stage", "probability", "expected_closing", "items"],
    icon: "Package",
  },
];

const OPPORTUNITY_FROM_OPTIONS = [
  { value: "Lead", label: "Lead" },
  { value: "Customer", label: "Customer" },
];

export default function NewOpportunityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const oppFrom = searchParams.get("opportunity_from") || "Lead";

  const form = useForm<OppForm>({
    defaultValues: {
      opportunity_from: oppFrom,
      party_name: searchParams.get("party_name") || "",
      transaction_date: new Date().toISOString().split("T")[0],
      opportunity_type: "",
      sales_stage: "",
      probability: 0,
      expected_closing: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedOppFrom = watchedAll?.opportunity_from ?? oppFrom;

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Opportunity", "step1", values),
      step2: validateWizardStep("Opportunity", "step2", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Opportunity", {
    successMessage: "Opportunity created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/crm/opportunity/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "Opportunity",
        values: getValues(),
      });
      showError(r);
    },
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code,
    );
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      items: items.map((it) => ({
        ...it,
        qty: Number(it.qty) || 1,
        rate: Number(it.rate) || 0,
      })),
      naming_series: "CRM-OPP-.YYYY.-",
      status: "Open",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Opportunity"
        subtitle={
          searchParams.get("lead")
            ? `From Lead ${searchParams.get("lead")}`
            : "Track a new sales opportunity"
        }
        backHref="/crm/opportunity"
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
            submitLabel="Create Opportunity"
            submittingLabel="Creating..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Target className="h-5 w-5 text-primary" />}
                      title="Source & Contact"
                      description="Where is this opportunity coming from?"
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormSelect
                        control={control}
                        name="opportunity_from"
                        label="Source Type"
                        required
                        options={OPPORTUNITY_FROM_OPTIONS}
                      />
                      <FormFrappeSelect
                        control={control}
                        name="party_name"
                        label={watchedOppFrom === "Lead" ? "Lead" : "Customer"}
                        required
                        doctype={watchedOppFrom === "Lead" ? "Lead" : "Customer"}
                        labelField={
                          watchedOppFrom === "Lead" ? "lead_name" : "customer_name"
                        }
                        placeholder={`Select ${watchedOppFrom.toLowerCase()}...`}
                      />
                      <FormDatePicker
                        control={control}
                        name="transaction_date"
                        label="Opportunity Date"
                        required
                      />
                    </div>
                  </div>
                );
              }

              if (s.id === "step2") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Package className="h-5 w-5 text-primary" />}
                      title="Details"
                      description="Opportunity type, stage, and line items."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormInput
                        control={control}
                        name="opportunity_type"
                        label="Opportunity Type"
                        required
                        placeholder="e.g. Sales, Service, Support..."
                      />
                      <FormInput
                        control={control}
                        name="sales_stage"
                        label="Sales Stage"
                        placeholder="e.g. Prospecting, Negotiation..."
                      />
                      <FormField
                        control={control}
                        name="probability"
                        render={({ field }) => (
                          <FormItem>
                            <label className="text-sm font-medium text-foreground">
                              Probability (%)
                            </label>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={100}
                                placeholder="0-100"
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormDatePicker
                        control={control}
                        name="expected_closing"
                        label="Expected Closing"
                      />
                    </div>

                    {/* Items child table */}
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border/60 bg-secondary/20">
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2.5 text-left font-semibold">
                              Item
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              Qty
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              Rate
                            </th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => (
                            <tr key={field.id} className="group">
                              <td className="px-3 py-2 align-top">
                                <FormFrappeSelect
                                  control={control}
                                  name={`items.${index}.item_code`}
                                  doctype="Item"
                                  hideLabel
                                  placeholder="Item..."
                                  extraFields={[
                                    "standard_rate",
                                    "item_name",
                                  ]}
                                  onValueChange={(_val, doc) => {
                                    if (doc) {
                                      setValue(
                                        `items.${index}.rate`,
                                        Number(doc.standard_rate) || 0,
                                      );
                                      setValue(
                                        `items.${index}.item_name`,
                                        doc.item_name || "",
                                      );
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <FormField
                                  control={control}
                                  name={`items.${index}.qty`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...f}
                                          type="number"
                                          inputMode="decimal"
                                          className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
                                          onChange={(e) =>
                                            f.onChange(Number(e.target.value))
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <FormField
                                  control={control}
                                  name={`items.${index}.rate`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...f}
                                          type="number"
                                          inputMode="decimal"
                                          className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
                                          onChange={(e) =>
                                            f.onChange(Number(e.target.value))
                                          }
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2 text-center align-middle">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                  onClick={() => remove(index)}
                                  disabled={fields.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex items-center border-t border-border/60 bg-secondary/10 px-3 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-dashed"
                          onClick={() => append({ ...EMPTY_ITEM })}
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Add Item
                        </Button>
                      </div>
                    </div>
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
