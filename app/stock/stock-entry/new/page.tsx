"use client";

// app/stock/stock-entry/new/page.tsx
// Obsidian ERP v4.0 — Stock Entry Create (V4 SmartForm Wizard)
// 2-step FlowWizard: Entry Type & Warehouses → Items & Review.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowRightLeft,
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
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
  FormSelect,
} from "@/components/form";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface SEItem {
  item_code: string;
  item_name?: string;
  qty: number;
  rate?: number;
  amount?: number;
  uom?: string;
  s_warehouse?: string;
  t_warehouse?: string;
  basic_rate?: number;
}

interface SEForm {
  naming_series: string;
  stock_entry_type: string;
  purpose: string;
  company: string;
  posting_date: string;
  from_warehouse?: string;
  to_warehouse?: string;
  work_order?: string;
  items: SEItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PURPOSE_OPTIONS = [
  { value: "Material Receipt", label: "Material Receipt" },
  { value: "Material Issue", label: "Material Issue" },
  { value: "Material Transfer", label: "Material Transfer" },
  { value: "Manufacture", label: "Manufacture" },
  { value: "Repack", label: "Repack" },
];

const EMPTY_ITEM: SEItem = {
  item_code: "",
  item_name: "",
  qty: 1,
  rate: 0,
  amount: 0,
  uom: "Nos",
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Entry Type & Warehouses",
    description: "Set the purpose, company, date, and warehouses",
    schema: null,
    fields: ["purpose", "posting_date", "from_warehouse", "to_warehouse"],
    icon: "ArrowRightLeft",
  },
  {
    id: "step2",
    label: "Items & Review",
    description: "Add stock entry line items and review",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function NewStockEntryPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<SEForm>({
    defaultValues: {
      naming_series: "MAT-STE-.YYYY.-",
      stock_entry_type: "Material Transfer",
      purpose: "Material Transfer",
      posting_date: new Date().toISOString().split("T")[0],
      from_warehouse: "",
      to_warehouse: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedPurpose = watchedAll?.purpose ?? "";

  // Keep stock_entry_type in sync with purpose
  useEffect(() => {
    setValue("stock_entry_type", watchedPurpose);
  }, [watchedPurpose, setValue]);

  // -- Live subtotal ----------------------------------------------------------
  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  // -- Per-step validation ----------------------------------------------------
  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Stock Entry", "step1", values),
      step2: validateWizardStep("Stock Entry", "step2", { items: watchedAll?.items ?? [] }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  // -- Persistence ------------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Stock Entry", {
    successMessage: "Stock Entry created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/stock/stock-entry/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Stock Entry" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the entry.");
      setStep(1);
      return;
    }
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      stock_entry_type: values.stock_entry_type || values.purpose,
      items: items.map((it) => ({
        ...it,
        amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
        basic_rate: it.basic_rate ?? it.rate ?? 0,
        s_warehouse: it.s_warehouse || values.from_warehouse || undefined,
        t_warehouse: it.t_warehouse || values.to_warehouse || undefined,
      })),
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Stock Entry"
        subtitle="Record an inventory movement in two steps"
        backHref="/stock/stock-entry"
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
            submitLabel="Create Stock Entry"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Entry Type & Warehouses ----------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<ArrowRightLeft className="h-5 w-5 text-primary" />}
                      title="Entry Type & Warehouses"
                      description="Choose the movement purpose and set source/target warehouses."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormSelect
                        control={control}
                        name="purpose"
                        label="Purpose"
                        required
                        options={PURPOSE_OPTIONS}
                        placeholder="Select purpose..."
                      />
                      <FormDatePicker
                        control={control}
                        name="posting_date"
                        label="Posting Date"
                        required
                      />
                      <div />
                      <FormFrappeSelect
                        control={control}
                        name="from_warehouse"
                        label="Source Warehouse"
                        doctype="Warehouse"
                        labelField="warehouse_name"
                        placeholder="Select source..."
                        filters={[["is_group", "=", 0]]}
                      />
                      <FormFrappeSelect
                        control={control}
                        name="to_warehouse"
                        label="Target Warehouse"
                        doctype="Warehouse"
                        labelField="warehouse_name"
                        placeholder="Select target..."
                        filters={[["is_group", "=", 0]]}
                      />
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Items & Review --------------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <StepHeading
                      icon={<Package className="h-5 w-5 text-primary" />}
                      title="Stock Entry Items"
                      description="Add items to this stock entry."
                    />

                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border/60 bg-secondary/20">
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2.5 text-left font-semibold">Item</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                            <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                            <th className="w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {fields.map((field, index) => {
                            const qty = Number(watchedItems?.[index]?.qty) || 0;
                            const rate = Number(watchedItems?.[index]?.rate) || 0;
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
                                      "standard_rate",
                                      "stock_uom",
                                      "item_name",
                                    ]}
                                    onValueChange={(_val, doc) => {
                                      if (doc) {
                                        setValue(
                                          `items.${index}.rate`,
                                          Number(doc.standard_rate) || 0,
                                        );
                                        setValue(
                                          `items.${index}.uom`,
                                          doc.stock_uom || "Nos",
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
                                  <NumberCell
                                    control={control}
                                    name={`items.${index}.qty`}
                                  />
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <NumberCell
                                    control={control}
                                    name={`items.${index}.rate`}
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
                            Subtotal
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

              // ---- FALLBACK — Review (unused in 2-step but required by type) ---
              return null;
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

function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<SEForm>>["control"];
  name: `items.${number}.qty` | `items.${number}.rate`;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              {...field}
              type="number"
              inputMode="decimal"
              className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
