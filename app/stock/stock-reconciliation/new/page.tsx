"use client";

// app/stock/stock-reconciliation/new/page.tsx
// Obsidian ERP v4.0 — Stock Reconciliation Create (3-step FlowWizard)
// Standalone stock count. No FlowRail, no auto-fill, no flow chain.

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Scale,
  Package,
  ClipboardCheck,
  Plus,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormDatePicker,
  FormFrappeSelect,
  FormSelect,
} from "@/components/form";
import { QuickAddField } from "@/components/quick-add/QuickAddField";
import { FieldWrap } from "@/components/form/field-wrap";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { stockReconciliationStepSchemas } from "@/lib/flows/flow-validation";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
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

const EMPTY_ITEM: SRItem = {
  item_code: "",
  warehouse: "",
  qty: 0,
  valuation_rate: undefined,
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Setup",
    description: "Set purpose and posting date",
    schema: null,
    fields: ["purpose", "posting_date"],
    icon: "Scale",
  },
  {
    id: "step2",
    label: "Count Items",
    description: "Add items with quantities and warehouses",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review",
    description: "Review everything before creating",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewStockReconciliationPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<SRForm>({
    defaultValues: {
      purpose: "Stock Reconciliation",
      posting_date: new Date().toISOString().split("T")[0],
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];

  // -- Live subtotal ----------------------------------------------------------
  const totalValue = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) =>
          sum +
          (Number(it?.qty) || 0) * (Number(it?.valuation_rate) || 0),
        0,
      ),
    [watchedItems],
  );

  // -- Per-step validation (gates the wizard's Next button) ------------------
  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Stock Reconciliation", "step1", values),
      step2: validateWizardStep("Stock Reconciliation", "step2", values),
      step3: { valid: true, errors: {} },
    };
  }, [watchedAll]);

  // -- Persistence ------------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Stock Reconciliation", {
    successMessage: "Stock Reconciliation created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/stock/stock-reconciliation/${encodeURIComponent(name)}`);
      }
    },
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
    createMutation.mutate({
      purpose: values.purpose,
      posting_date: values.posting_date,
      set_posting_time: 1,
      company: getActiveCompany(),
      items: items.map((it, idx) => ({
        item_code: it.item_code,
        warehouse: it.warehouse,
        qty: Number(it.qty) || 0,
        valuation_rate: Number(it.valuation_rate) || 0,
        idx: idx + 1,
        doctype: "Stock Reconciliation Item",
      })),
      docstatus: 0,
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Stock Reconciliation"
        subtitle="Count or adjust inventory in three steps"
        backHref="/stock/stock-reconciliation"
      />

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
            submitLabel="Create Stock Reconciliation"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Setup -------------------------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Scale className="h-5 w-5 text-primary" />}
                      title="Setup"
                      description="Set the purpose and posting date for this reconciliation."
                    />
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
                  </div>
                );
              }

              // ---- STEP 2 — Count Items -------------------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <StepHeading
                      icon={<Package className="h-5 w-5 text-primary" />}
                      title="Count Items"
                      description="Add items with their quantities and target warehouses."
                    />

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
                                    {/* 2L 1A: Quick-Add enabled per-row Item */}
                                    <QuickAddField
                                      control={control}
                                      name={`items.${index}.item_code`}
                                      doctype="Item"
                                      hideLabel
                                      placeholder="Item..."
                                      extraFields={["item_name", "stock_uom"]}
                                      onValueChange={(_val, doc) => {
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
                                    {/* 2L 1A: Quick-Add enabled per-row Warehouse */}
                                    <QuickAddField
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
                                                e.target.value ? Number(e.target.value) : undefined,
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
                        <div className="text-right">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Total Value
                          </p>
                          <p className="text-xl font-bold tabular-nums text-foreground">
                            {ETB.format(totalValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ---- STEP 3 — Review ------------------------------------------
              const v = getValues();
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review"
                    description="Review everything below — you can still go back to edit."
                  />

                  <div className="bg-card/40 rounded-2xl p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Summary label="Purpose" value={v.purpose} />
                      <Summary label="Posting Date" value={v.posting_date} />
                      <Summary label="Company" value={getActiveCompany()} />
                    </div>
                  </div>

                  <div className="bg-card/40 rounded-2xl overflow-hidden">
                    <div className="px-6 py-3 bg-muted/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Items ({(watchedItems ?? []).filter((i) => i?.item_code).length})
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="border-b border-border/40">
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-6 py-2.5 text-left font-semibold">Item</th>
                          <th className="px-6 py-2.5 text-left font-semibold">Warehouse</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Qty</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Valuation Rate</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {(watchedItems ?? [])
                          .filter((i) => i?.item_code)
                          .map((item, idx) => {
                            const qty = Number(item?.qty) || 0;
                            const rate = Number(item?.valuation_rate) || 0;
                            return (
                              <tr key={idx}>
                                <td className="px-6 py-3 font-medium">
                                  {item.item_name || item.item_code}
                                </td>
                                <td className="px-6 py-3 text-muted-foreground">
                                  {item.warehouse || "—"}
                                </td>
                                <td className="px-6 py-3 text-right tabular-nums">{qty}</td>
                                <td className="px-6 py-3 text-right tabular-nums">
                                  {ETB.format(rate)}
                                </td>
                                <td className="px-6 py-3 text-right font-medium tabular-nums">
                                  {ETB.format(qty * rate)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/20">
                          <td colSpan={4} className="px-6 py-3 text-right font-bold uppercase text-xs">
                            Total Value
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-lg text-primary tabular-nums">
                            {ETB.format(totalValue)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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
