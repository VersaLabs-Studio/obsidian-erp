// app/crm/opportunity/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Opportunity Edit (V4 SmartForm Wizard, edit mode)
// 2-step FlowWizard pre-filled with existing opportunity data.
// Premium UI: OKLCH semantic tokens only, Framer Motion via FlowWizard.

"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { Target, Package, Plus, Trash2 } from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
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
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { Opportunity } from "@/types/doctype-types";

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

export default function EditOpportunityPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(String(params.name));

  const { resolution, showError, dismiss } = useGuidedError();
  const {
    data: opp,
    isLoading,
    error,
  } = useFrappeDoc<Opportunity>("Opportunity", name);

  const form = useForm<OppForm>({
    defaultValues: {
      opportunity_from: "Lead",
      party_name: "",
      transaction_date: "",
      opportunity_type: "",
      sales_stage: "",
      probability: 0,
      expected_closing: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];

  // Prefill from loaded opportunity
  useEffect(() => {
    if (!opp) return;
    const items = ((opp.items ?? []) as unknown as OppItem[]).map((it) => ({
      item_code: it.item_code ?? "",
      item_name: it.item_name,
      qty: Number(it.qty) || 1,
      rate: Number(it.rate) || 0,
    }));
    reset({
      opportunity_from: opp.opportunity_from ?? "Lead",
      party_name: opp.party_name ?? "",
      company: opp.company ?? "",
      transaction_date: opp.transaction_date ?? "",
      opportunity_type: opp.opportunity_type ?? "",
      sales_stage: opp.sales_stage ?? "",
      probability: opp.probability ?? 0,
      expected_closing: opp.expected_closing ?? "",
      items: items.length > 0 ? items : [{ ...EMPTY_ITEM }],
    });
  }, [opp, reset]);

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Opportunity", "step1", values),
      step2: validateWizardStep("Opportunity", "step2", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const updateMutation = useFrappeUpdate<Opportunity>("Opportunity", {
    showToast: false,
    successMessage: "Opportunity updated",
    onSuccess: () =>
      router.push(`/crm/opportunity/${encodeURIComponent(name)}`),
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "Opportunity" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter((it) => it.item_code);
    updateMutation.mutate({
      name,
      data: {
        ...values,
        items: items.map((it) => ({
          ...it,
          qty: Number(it.qty) || 1,
          rate: Number(it.rate) || 0,
        })),
      },
    });
  }, [getValues, name, updateMutation]);

  if (isLoading) return <LoadingState />;
  if (error || !opp) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Opportunity not found."}
        </p>
      </div>
    );
  }

  if (opp.status !== "Open") {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Edit ${name}`}
          backHref={`/crm/opportunity/${encodeURIComponent(name)}`}
        />
        <div className="rounded-xl border border-border/60 bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            Only Open opportunities can be edited. This opportunity is {opp.status}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${opp.title || opp.party_name || name}`}
        subtitle={opp.company}
        backHref={`/crm/opportunity/${encodeURIComponent(name)}`}
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
                      icon={<Target className="h-5 w-5 text-primary" />}
                      title="Source & Contact"
                      description="Update the source and party details."
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
                        label={
                          watchedAll?.opportunity_from === "Lead"
                            ? "Lead"
                            : "Customer"
                        }
                        required
                        doctype={
                          watchedAll?.opportunity_from === "Lead"
                            ? "Lead"
                            : "Customer"
                        }
                        labelField={
                          watchedAll?.opportunity_from === "Lead"
                            ? "lead_name"
                            : "customer_name"
                        }
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
                      description="Update type, stage, and items."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormInput
                        control={control}
                        name="opportunity_type"
                        label="Opportunity Type"
                        required
                        placeholder="e.g. Sales, Service..."
                      />
                      <FormInput
                        control={control}
                        name="sales_stage"
                        label="Sales Stage"
                        placeholder="e.g. Prospecting..."
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

                    {/* Items */}
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
