"use client";

// app/stock/stock-reconciliation/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Stock Reconciliation Edit (FlowWizard, edit mode)
// Only Draft (docstatus 0) reconciliations are editable.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { Plus, Trash2 } from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDatePicker, FormFrappeSelect, FormSelect } from "@/components/form";
import { FieldWrap } from "@/components/form/field-wrap";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { getActiveCompany } from "@/lib/settings/company";
import { stockReconciliationStepSchemas } from "@/lib/flows/flow-validation";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { StockReconciliation } from "@/types/doctype-types";

interface SRItem {
  item_code: string;
  item_name?: string;
  warehouse: string;
  qty: number;
  valuation_rate?: number;
}

interface SRForm {
  purpose: "Opening Stock" | "Stock Reconciliation";
  posting_date: string;
  items: SRItem[];
}

const EMPTY_ITEM: SRItem = { item_code: "", warehouse: "", qty: 0, valuation_rate: undefined };

const WIZARD_STEPS: WizardStep[] = [
  { id: "step1", label: "Setup", schema: null, fields: [], icon: "Scale" },
  { id: "step2", label: "Items", schema: null, fields: [], icon: "Package" },
  { id: "step3", label: "Review", schema: null, fields: [], icon: "ClipboardCheck" },
];

const ETB = new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB" });

export default function EditStockReconciliationPage() {
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(String(params.name));

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());
  const { resolution, showError, dismiss } = useGuidedError();
  const { data: doc, isLoading, error } = useFrappeDoc<StockReconciliation>(
    "Stock Reconciliation",
    name,
  );

  const form = useForm<SRForm>({
    defaultValues: {
      purpose: "Stock Reconciliation",
      posting_date: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });
  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];

  useEffect(() => {
    if (!doc) return;
    reset({
      purpose: (doc.purpose as "Opening Stock" | "Stock Reconciliation") || "Stock Reconciliation",
      posting_date: doc.posting_date ?? "",
      items: ((doc.items ?? []) as unknown as SRItem[]).map((it) => ({
        item_code: it.item_code,
        item_name: it.item_name,
        warehouse: it.warehouse,
        qty: Number(it.qty) || 0,
        valuation_rate: Number(it.valuation_rate) || undefined,
      })),
    });
  }, [doc, reset]);

  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (s, it) => s + (Number(it?.qty) || 0) * (Number(it?.valuation_rate) || 0),
        0,
      ),
    [watchedItems],
  );

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Stock Reconciliation", "step1", values),
      step2: validateWizardStep("Stock Reconciliation", "step2", values),
      step3: { valid: true, errors: {} },
    };
  }, [watchedAll]);

  const updateMutation = useFrappeUpdate<StockReconciliation>("Stock Reconciliation", {
    showToast: false,
    successMessage: "Stock Reconciliation updated",
    onSuccess: () =>
      router.push(`/stock/stock-reconciliation/${encodeURIComponent(name)}`),
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "Stock Reconciliation" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter((it) => it.item_code && it.warehouse);
    if (items.length === 0) {
      toast.error("Add at least one valid item with a warehouse.");
      setStep(1);
      return;
    }
    updateMutation.mutate({
      name,
      data: {
        purpose: values.purpose,
        company: getActiveCompany(),
        posting_date: values.posting_date,
        set_posting_time: 1,
        items: items.map((it, idx) => ({
          item_code: it.item_code,
          warehouse: it.warehouse,
          qty: Number(it.qty) || 0,
          valuation_rate: Number(it.valuation_rate) || 0,
          idx: idx + 1,
        })),
      },
    });
  }, [getValues, name, updateMutation]);

  if (isLoading) return <LoadingState />;
  if (error || !doc) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          {error?.message ?? "Stock Reconciliation not found."}
        </p>
      </div>
    );
  }
  if (doc.docstatus !== 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Edit ${name}`}
          backHref={`/stock/stock-reconciliation/${encodeURIComponent(name)}`}
        />
        <div className="rounded-xl border border-border/60 bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            Only Draft stock reconciliations can be edited. This document has been submitted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${doc.name}`}
        subtitle={doc.purpose || "Stock Reconciliation"}
        backHref={`/stock/stock-reconciliation/${encodeURIComponent(name)}`}
      />
      <Form {...form}>
        <InfoCard>
          <FlowWizard
            steps={WIZARD_STEPS}
            formData={watchedAll as unknown as Record<string, unknown>}
            validationResults={validationResults}
            isSubmitting={updateMutation.isPending}
            onFormDataChange={() => {}}
            onStepChange={setStep}
            onTriedNextChange={setTriedNextSteps}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            submitLabel="Save Changes"
            submittingLabel="Saving..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FieldWrap
                      error={
                        triedNextSteps.has(step)
                          ? validationResults?.step1?.errors?.purpose
                          : undefined
                      }
                    >
                      <FormSelect
                        control={control}
                        name="purpose"
                        label="Purpose"
                        required
                        options={[
                          { value: "Opening Stock", label: "Opening Stock" },
                          { value: "Stock Reconciliation", label: "Stock Reconciliation" },
                        ]}
                      />
                    </FieldWrap>
                    <FieldWrap
                      error={
                        triedNextSteps.has(step)
                          ? validationResults?.step1?.errors?.posting_date
                          : undefined
                      }
                    >
                      <FormDatePicker
                        control={control}
                        name="posting_date"
                        label="Posting Date"
                        required
                      />
                    </FieldWrap>
                  </div>
                );
              }
              if (s.id === "step2") {
                return (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border/60 bg-secondary/20">
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                            <th className="px-3 py-2.5 text-left font-semibold">Warehouse</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Valuation Rate</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => {
                            const qty = Number(watchedItems?.[index]?.qty) || 0;
                            const rate = Number(watchedItems?.[index]?.valuation_rate) || 0;
                            return (
                              <tr key={field.id} className="group">
                                <td className="px-3 py-2 align-top">
                                  <FieldWrap
                                    error={
                                      triedNextSteps.has(step)
                                        ? validationResults?.step2?.errors?.[`items.${index}.item_code`]
                                        : undefined
                                    }
                                  >
                                    <FormFrappeSelect
                                      control={control}
                                      name={`items.${index}.item_code`}
                                      doctype="Item"
                                      hideLabel
                                      placeholder="Item..."
                                      extraFields={["item_name", "stock_uom"]}
                                      onValueChange={(_v, doc) => {
                                        if (doc) {
                                          setValue(
                                            `items.${index}.item_name`,
                                            doc.item_name || "",
                                          );
                                        }
                                      }}
                                    />
                                  </FieldWrap>
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <FieldWrap
                                    error={
                                      triedNextSteps.has(step)
                                        ? validationResults?.step2?.errors?.[`items.${index}.warehouse`]
                                        : undefined
                                    }
                                  >
                                    <FormFrappeSelect
                                      control={control}
                                      name={`items.${index}.warehouse`}
                                      doctype="Warehouse"
                                      hideLabel
                                      placeholder="WH..."
                                      filters={[["is_group", "=", 0]]}
                                    />
                                  </FieldWrap>
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <FormField
                                    control={control}
                                    name={`items.${index}.qty`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            type="number"
                                            inputMode="decimal"
                                            className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
                                            onChange={(e) =>
                                              field.onChange(Number(e.target.value))
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
                                    name={`items.${index}.valuation_rate`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            type="number"
                                            inputMode="decimal"
                                            className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
                                            onChange={(e) =>
                                              field.onChange(
                                                e.target.value
                                                  ? Number(e.target.value)
                                                  : undefined,
                                              )
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
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between border-t border-border/60 bg-secondary/10 px-3 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-dashed"
                          onClick={() => append({ ...EMPTY_ITEM })}
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Add Item
                        </Button>
                        <p className="text-xl font-bold tabular-nums text-foreground">
                          {ETB.format(subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              // Step 3: Review
              const v = getValues();
              return (
                <div className="space-y-4">
                  <div className="bg-card/40 rounded-2xl p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Summary label="Purpose" value={v.purpose} />
                      <Summary label="Posting Date" value={v.posting_date} />
                      <Summary
                        label="Items"
                        value={`${(watchedItems ?? []).filter((i) => i?.item_code).length}`}
                      />
                    </div>
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
