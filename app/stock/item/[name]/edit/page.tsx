// app/stock/item/[name]/edit/page.tsx
// Obsidian ERP v4.0 — Edit Item Page (V4 golden template, 2R Part 6).
// Mirrors /new with the same full-field form (FlowWizard, Zod step
// gating) but hydrates from the existing doc and submits via
// useFrappeUpdate. Item code is locked (you can't rename a master).

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Package,
  Calculator,
  Settings,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
} from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { LoadingState } from "@/components/smart/loading-state";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import { getActiveCompany } from "@/lib/settings/company";

// Form model — mirrors the /new page; full Item field set.
interface ItemForm {
  item_code: string;
  item_name: string;
  item_group: string;
  brand?: string;
  description?: string;
  stock_uom: string;
  valuation_method?: string;
  valuation_rate?: number;
  standard_rate?: number;
  default_warehouse?: string;
  weight_per_unit?: number;
  weight_uom?: string;
  is_stock_item: boolean;
  is_fixed_asset: boolean;
  has_batch_no: boolean;
  has_serial_no: boolean;
  disabled: boolean;
  default_income_account?: string;
  default_expense_account?: string;
  default_buying_cost_center?: string;
  default_supplier?: string;
  customer_code?: string;
  barcodes: Array<{ barcode: string; uom?: string }>;
}

const EMPTY_BARCODE = { barcode: "", uom: "" };

const itemFormSchema = z.object({
  item_code: z.string().min(1),
  item_name: z.string().min(1, "Item name is required"),
  item_group: z.string().min(1, "Item group is required"),
  stock_uom: z.string().min(1, "Stock UOM is required"),
  brand: z.string().optional(),
  description: z.string().optional(),
  valuation_method: z.string().optional(),
  valuation_rate: z.number().min(0).optional(),
  standard_rate: z.number().min(0).optional(),
  default_warehouse: z.string().optional(),
  weight_per_unit: z.number().min(0).optional(),
  weight_uom: z.string().optional(),
  is_stock_item: z.boolean(),
  is_fixed_asset: z.boolean(),
  has_batch_no: z.boolean(),
  has_serial_no: z.boolean(),
  disabled: z.boolean(),
  default_income_account: z.string().optional(),
  default_expense_account: z.string().optional(),
  default_buying_cost_center: z.string().optional(),
  default_supplier: z.string().optional(),
  customer_code: z.string().optional(),
  barcodes: z.array(
    z.object({
      barcode: z.string(),
      uom: z.string().optional(),
    }),
  ),
});
type ItemFormData = z.infer<typeof itemFormSchema>;

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Identity",
    description: "Item code, name, group, UOM",
    schema: null,
    fields: ["item_code", "item_name", "item_group", "stock_uom"],
    icon: "Package",
  },
  {
    id: "step2",
    label: "Stock & Valuation",
    description: "Valuation, default warehouse, weight, barcodes",
    schema: null,
    fields: ["valuation_method", "valuation_rate", "default_warehouse"],
    icon: "Calculator",
  },
  {
    id: "step3",
    label: "Configuration",
    description: "Toggles, accounting, sales/purchase",
    schema: null,
    fields: ["is_stock_item", "is_sales_item", "is_purchase_item"],
    icon: "Settings",
  },
];

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);
  const { resolution, showError, dismiss } = useGuidedError();
  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Fetch the existing doc.
  const { data: item, isLoading } = useFrappeDoc<Record<string, unknown>>("Item", name, {});

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    mode: "onChange",
    defaultValues: {
      item_code: name,
      item_name: "",
      item_group: "",
      brand: "",
      description: "",
      stock_uom: "Nos",
      valuation_method: "FIFO",
      valuation_rate: 0,
      standard_rate: 0,
      default_warehouse: "",
      weight_per_unit: 0,
      weight_uom: "Kg",
      is_stock_item: true,
      is_fixed_asset: false,
      has_batch_no: false,
      has_serial_no: false,
      disabled: false,
      default_income_account: "",
      default_expense_account: "",
      default_buying_cost_center: "",
      default_supplier: "",
      customer_code: "",
      barcodes: [{ ...EMPTY_BARCODE }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields: barcodeFields, append: appendBarcode, remove: removeBarcode } = useFieldArray({
    control,
    name: "barcodes",
  });

  // Hydrate once the doc arrives. We coerce booleans + numbers safely;
  // the form re-resets, re-validates, and the wizard gates on the new
  // values.
  useEffect(() => {
    if (!item || hydrated) return;
    const doc = item as Record<string, unknown>;
    const list = Array.isArray(doc.barcodes) ? doc.barcodes : [];
    reset({
      item_code: String(doc.item_code ?? name),
      item_name: String(doc.item_name ?? ""),
      item_group: String(doc.item_group ?? ""),
      brand: String(doc.brand ?? "") || undefined,
      description: String(doc.description ?? "") || undefined,
      stock_uom: String(doc.stock_uom ?? "Nos"),
      valuation_method: String(doc.valuation_method ?? "FIFO"),
      valuation_rate: Number(doc.valuation_rate ?? 0),
      standard_rate: Number(doc.standard_rate ?? 0),
      default_warehouse: String(doc.default_warehouse ?? "") || undefined,
      weight_per_unit: Number(doc.weight_per_unit ?? 0),
      weight_uom: String(doc.weight_uom ?? "Kg") || undefined,
      is_stock_item: Number(doc.is_stock_item ?? 1) === 1,
      is_fixed_asset: Number(doc.is_fixed_asset ?? 0) === 1,
      has_batch_no: Number(doc.has_batch_no ?? 0) === 1,
      has_serial_no: Number(doc.has_serial_no ?? 0) === 1,
      disabled: Number(doc.disabled ?? 0) === 1,
      default_income_account: String(doc.default_income_account ?? "") || undefined,
      default_expense_account: String(doc.default_expense_account ?? "") || undefined,
      default_buying_cost_center: String(doc.default_buying_cost_center ?? "") || undefined,
      default_supplier: String(doc.default_supplier ?? "") || undefined,
      customer_code: String(doc.customer_code ?? "") || undefined,
      barcodes: list.length > 0
        ? list.map((b) => ({
            barcode: String((b as Record<string, unknown>).barcode ?? ""),
            uom: String((b as Record<string, unknown>).uom ?? "") || undefined,
          }))
        : [{ ...EMPTY_BARCODE }],
    });
    setHydrated(true);
  }, [item, hydrated, name, reset]);

  const watchedAll = useWatch({ control });

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll };
    return {
      step1: validateWizardStep("Item", "step1", values),
      step2: validateWizardStep("Item", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const updateMutation = useFrappeUpdate<{ data: { name: string } }>("Item", {
    successMessage: "Item updated",
    onSuccess: () => router.push(`/stock/item/${encodeURIComponent(name)}`),
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "Item", values: getValues() })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const cleanedBarcodes = (values.barcodes ?? [])
      .map((b) => ({ barcode: (b.barcode ?? "").trim(), uom: (b.uom ?? "").trim() }))
      .filter((b) => b.barcode);
    const payload: Record<string, unknown> = {
      ...values,
      item_code: values.item_code, // locked; can't rename a master
      valuation_method: values.valuation_method || "FIFO",
      valuation_rate: values.valuation_rate || 0,
      standard_rate: values.standard_rate || 0,
      weight_per_unit: values.weight_per_unit || 0,
      is_stock_item: values.is_stock_item ? 1 : 0,
      is_fixed_asset: values.is_fixed_asset ? 1 : 0,
      // 2Y-R3 — all items are always sellable + purchasable (guardrails removed)
      is_sales_item: 1,
      is_purchase_item: 1,
      has_batch_no: values.has_batch_no ? 1 : 0,
      has_serial_no: values.has_serial_no ? 1 : 0,
      disabled: values.disabled ? 1 : 0,
      barcodes: cleanedBarcodes.length > 0 ? cleanedBarcodes : undefined,
    };
    updateMutation.mutate({ name, data: payload });
  }, [name, updateMutation, getValues]);

  if (isLoading || !hydrated) {
    return <LoadingState type="cards" count={4} />;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Edit ${name}`}
        subtitle="Update the item's fields across three steps"
        backHref={`/stock/item/${encodeURIComponent(name)}`}
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
              // Reuse the same renderStep as /new (full-field layout).
              // The item_code field is readOnly here.
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Package className="h-5 w-5 text-primary" />}
                      title="Identity"
                      description="Canonical identifier, name, group, and stock UOM."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <FormInput
                          control={control}
                          name="item_name"
                          label="Item Name"
                          required
                          placeholder="What is this item?"
                        />
                      </div>
                      <FormInput
                        control={control}
                        name="item_code"
                        label="Item Code (locked)"
                        readOnly
                      />
                      <FormInput
                        control={control}
                        name="brand"
                        label="Brand"
                        placeholder="Optional"
                      />
                      <FormFrappeSelect
                        control={control}
                        name="item_group"
                        label="Item Group"
                        required
                        doctype="Item Group"
                        labelField="item_group_name"
                      />
                      <FormFrappeSelect
                        control={control}
                        name="stock_uom"
                        label="Stock UOM"
                        required
                        doctype="UOM"
                        labelField="uom_name"
                      />
                      <div className="md:col-span-2">
                        <FormField
                          control={control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Notes about this item…"
                                  className="min-h-[100px] rounded-xl bg-secondary/30 border-0 focus:bg-card"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              }
              if (s.id === "step2") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Calculator className="h-5 w-5 text-primary" />}
                      title="Stock & Valuation"
                      description="Valuation, default warehouse, weight, barcodes."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect
                        control={control}
                        name="valuation_method"
                        label="Valuation Method"
                        doctype="Stock Settings"
                        labelField="valuation_method"
                      />
                      <FormInput
                        control={control}
                        name="valuation_rate"
                        label="Valuation Rate"
                        type="number"
                      />
                      <FormInput
                        control={control}
                        name="standard_rate"
                        label="Standard Rate"
                        type="number"
                      />
                      <FormFrappeSelect
                        control={control}
                        name="default_warehouse"
                        label="Default Warehouse"
                        doctype="Warehouse"
                        labelField="warehouse_name"
                      />
                      <FormInput
                        control={control}
                        name="weight_per_unit"
                        label="Weight per Unit"
                        type="number"
                      />
                      <FormFrappeSelect
                        control={control}
                        name="weight_uom"
                        label="Weight UOM"
                        doctype="UOM"
                        labelField="uom_name"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Barcodes</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-dashed"
                          onClick={() => appendBarcode({ ...EMPTY_BARCODE })}
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Add Barcode
                        </Button>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
                        <table className="w-full text-sm">
                          <thead className="border-b border-border/60 bg-secondary/20">
                            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              <th className="px-3 py-2.5 text-left font-semibold">Barcode</th>
                              <th className="px-3 py-2.5 text-left font-semibold">UOM</th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {barcodeFields.map((f, idx) => (
                              <tr key={f.id} className="group">
                                <td className="px-3 py-2">
                                  <FormInput
                                    control={control}
                                    name={`barcodes.${idx}.barcode`}
                                    hideLabel
                                    placeholder="e.g. 2001234567890"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <FormFrappeSelect
                                    control={control}
                                    name={`barcodes.${idx}.uom`}
                                    hideLabel
                                    doctype="UOM"
                                    labelField="uom_name"
                                  />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                    onClick={() => removeBarcode(idx)}
                                    disabled={barcodeFields.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              }
              // step3 — Configuration
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<Settings className="h-5 w-5 text-primary" />}
                    title="Configuration"
                    description="Toggles + accounting/sales/purchase defaults."
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConfigToggle control={control} name="is_stock_item" title="Maintain Stock" description="Track inventory levels" />
                    <ConfigToggle control={control} name="is_fixed_asset" title="Fixed Asset" description="Depreciate over time" />
                    <ConfigToggle control={control} name="has_batch_no" title="Has Batch No" description="Track by batch" />
                    <ConfigToggle control={control} name="has_serial_no" title="Has Serial No" description="Track by serial" />
                    <ConfigToggle control={control} name="disabled" title="Disabled" description="Hide from transactions" />
                  </div>

                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-semibold text-foreground">Accounting Defaults</p>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect control={control} name="default_income_account" label="Default Income Account" doctype="Account" labelField="account_name" filters={[["account_type","=","Income Account"],["company","=",getActiveCompany()],["is_group","=",0]]} />
                      <FormFrappeSelect control={control} name="default_expense_account" label="Default Expense Account" doctype="Account" labelField="account_name" filters={[["account_type","=","Expense Account"],["company","=",getActiveCompany()],["is_group","=",0]]} />
                      <FormFrappeSelect control={control} name="default_buying_cost_center" label="Default Buying Cost Center" doctype="Cost Center" labelField="cost_center_name" />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-semibold text-foreground">Sales / Purchase Defaults</p>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect control={control} name="default_supplier" label="Default Supplier" doctype="Supplier" labelField="supplier_name" />
                      <FormInput control={control} name="customer_code" label="Customer Code" placeholder="Optional" />
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

function ConfigToggle({
  control,
  name,
  title,
  description,
}: {
  control: ReturnType<typeof useForm<ItemForm>>["control"];
  name: keyof ItemForm;
  title: string;
  description: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center space-x-3 space-y-0 p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
          <FormControl>
            <Checkbox
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="font-medium">{title}</FormLabel>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </FormItem>
      )}
    />
  );
}