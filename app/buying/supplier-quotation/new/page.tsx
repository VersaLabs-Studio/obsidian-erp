"use client";

// app/buying/supplier-quotation/new/page.tsx
// Supplier Quotation Create — 3-step FlowWizard, Zod gating, AUTO_FILL from RFQ.
// GOLDEN TEMPLATE: FlowWizard + validateWizardStep + useWatch gate + error resolver.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Truck,
  Package,
  ClipboardCheck,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormInput, FormFrappeSelect, FormDatePicker } from "@/components/form";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import {
  getAutoFillMapping,
  applyAutoFill,
  applyItemAutoFill,
} from "@/lib/flows/flow-auto-fill";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { RequestForQuotation } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { getActiveCompany } from "@/lib/settings/company";
import { FieldWrap } from "@/components/form/field-wrap";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface SQItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
}

interface SQForm {
  naming_series: string;
  supplier: string;
  company: string;
  transaction_date: string;
  valid_till?: string;
  currency: string;
  conversion_rate: number;
  status: string;
  items: SQItem[];
}

const EMPTY_ITEM: SQItem = {
  item_code: "",
  item_name: "",
  description: "",
  qty: 1,
  rate: 0,
  amount: 0,
  uom: "Nos",
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Supplier & Date",
    description: "Select the supplier and set quotation date",
    schema: null,
    fields: ["supplier", "company", "transaction_date"],
    icon: "Truck",
  },
  {
    id: "step2",
    label: "Items & Rates",
    description: "Set rates for each quoted item",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review",
    description: "Review the quotation before creating it",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewSupplierQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rfqId = searchParams.get("request_for_quotation");

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<SQForm>({
    defaultValues: {
      naming_series: "PUR-SQTN-.YYYY.-",
      supplier: "",
      company: "",
      transaction_date: new Date().toISOString().split("T")[0],
      currency: "ETB",
      conversion_rate: 1,
      status: "Draft",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];

  // -- Auto-fill from upstream RFQ via the registry -------------------------
  const { data: rfq, isLoading: loadingRFQ } =
    useFrappeDoc<RequestForQuotation>("Request for Quotation", rfqId ?? "", {
      enabled: !!rfqId,
    });

  useEffect(() => {
    if (!rfq) return;
    const mapping = getAutoFillMapping(
      "Request for Quotation",
      "Supplier Quotation",
    );
    if (!mapping) return;

    const header = applyAutoFill(
      rfq as unknown as Record<string, unknown>,
      mapping,
    );
    const items = applyItemAutoFill(
      (rfq as { items?: Record<string, unknown>[] }).items ?? [],
      mapping,
    ) as unknown as SQItem[];

    reset({
      ...getValues(),
      ...(header as Partial<SQForm>),
      items: items.length
        ? items.map((it) => ({ ...it, rate: 0, amount: 0 }))
        : [{ ...EMPTY_ITEM }],
      supplier: "",
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from RFQ ${rfqId}`, {
      description: "Set supplier and rates to continue.",
    });
  }, [rfq, rfqId, reset, getValues]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  // -- Live subtotal ---------------------------------------------------------
  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  // -- Per-step validation ---------------------------------------------------
  const validationResults = useMemo<Record<string, StepValidationResult>>(
    () => {
      const values = {
        ...getValues(),
        ...watchedAll,
        items: watchedAll?.items ?? [],
      };
      return {
        step1: validateWizardStep("Supplier Quotation", "step1", values),
        step2: validateWizardStep("Supplier Quotation", "step2", values),
        step3: { valid: true, errors: {} },
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedAll],
  );

  // -- Persistence ------------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Supplier Quotation", {
    successMessage: "Supplier Quotation created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(
          `/buying/supplier-quotation/${encodeURIComponent(name)}`,
        );
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "Supplier Quotation",
        values: getValues(),
      });
      showError(r);
    },
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the quotation.");
      setStep(1);
      return;
    }

    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      items: items.map((it) => ({
        ...it,
        amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
        doctype: "Supplier Quotation Item",
      })),
      conversion_rate: 1,
      currency: values.currency || "ETB",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Supplier Quotation"
        subtitle={
          rfqId
            ? `From RFQ ${rfqId}`
            : "Record a supplier's quotation in three steps"
        }
        backHref="/buying/supplier-quotation"
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
            submitLabel="Create Supplier Quotation"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Supplier & Date ---------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Truck className="h-5 w-5 text-primary" />}
                      title="Supplier & Date"
                      description="Select the supplier providing this quotation."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap
                        auto={isAuto("supplier")}
                        loading={loadingRFQ}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.supplier : undefined}
                      >
                        <FormFrappeSelect
                          control={control}
                          name="supplier"
                          label="Supplier"
                          required
                          doctype="Supplier"
                          labelField="supplier_name"
                          placeholder="Select supplier..."
                          disabled={isAuto("supplier")}
                        />
                      </FieldWrap>
                      <FieldWrap
                        auto={isAuto("company")}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.company : undefined}
                      >
                        <FormFrappeSelect
                          control={control}
                          name="company"
                          label="Company"
                          required
                          doctype="Company"
                          labelField="company_name"
                          placeholder="Select company..."
                          disabled={isAuto("company")}
                        />
                      </FieldWrap>
                      <FormDatePicker
                        control={control}
                        name="transaction_date"
                        label="Quotation Date"
                        required
                      />
                      <FormDatePicker
                        control={control}
                        name="valid_till"
                        label="Valid Till"
                      />
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Items & Rates -----------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<Package className="h-5 w-5 text-primary" />}
                        title="Items & Rates"
                        description="Set the supplier's rate for each item."
                      />
                      {isAuto("items") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Items auto-filled
                        </span>
                      )}
                    </div>

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
                            <th className="px-3 py-2.5 text-right font-semibold">
                              Amount
                            </th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => {
                            const qty =
                              Number(watchedItems?.[index]?.qty) || 0;
                            const rate =
                              Number(watchedItems?.[index]?.rate) || 0;
                            return (
                              <tr key={field.id} className="group">
                                <td className="px-3 py-2 align-top">
                                  <FormFrappeSelect
                                    control={control}
                                    name={`items.${index}.item_code`}
                                    doctype="Item"
                                    hideLabel
                                    placeholder="Item..."
                                    extraFields={[
                                      "item_name",
                                      "description",
                                      "stock_uom",
                                    ]}
                                    onValueChange={(_val, doc) => {
                                      if (doc) {
                                        setValue(
                                          `items.${index}.item_name`,
                                          doc.item_name || "",
                                        );
                                        setValue(
                                          `items.${index}.uom`,
                                          doc.stock_uom || "Nos",
                                        );
                                      }
                                    }}
                                    disabled={isAuto("items")}
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
                                <td className="px-3 py-3 text-right align-middle font-semibold tabular-nums text-foreground">
                                  {ETB.format(qty * rate)}
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
                            Grand Total
                          </p>
                          <p className="text-xl font-bold tabular-nums text-foreground">
                            {ETB.format(subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ---- STEP 3 — Review ------------------------------------
              const v = getValues();
              return (
                <div className="space-y-5">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review"
                    description="Confirm the details below to create the quotation."
                  />
                  <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <Summary
                        label="Supplier"
                        value={v.supplier || "—"}
                      />
                      <Summary label="Company" value={v.company} />
                      <Summary label="Date" value={v.transaction_date} />
                      <Summary label="Valid Till" value={v.valid_till || "—"} />
                    </div>
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {(watchedItems ?? []).filter((i) => i?.item_code).length}{" "}
                          item(s)
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Grand Total
                          </span>
                          <p className="text-2xl font-bold tabular-nums text-primary">
                            {ETB.format(subtotal)}
                          </p>
                        </div>
                      </div>
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
