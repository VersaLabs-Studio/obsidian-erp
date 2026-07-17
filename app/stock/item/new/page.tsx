// app/stock/item/new/page.tsx
// Obsidian ERP v4.0 — Create Item Page (V4 golden template, 2R Part 6).
// Full-field create (master document). 3-step FlowWizard with Zod step
// gating. Items are master docs — we expose the complete Item field
// set (identity, stock/UOM, valuation, purchase/sales defaults, item
// group, accounting) across the wizard steps.

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Package, Calculator, Settings, Plus, Trash2, Loader2, Sparkles, Info } from "lucide-react";

import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormInput,
  FormFrappeSelect,
  FormSwitch,
  FormDatePicker,
} from "@/components/form";
import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeOptions } from "@/hooks/generic";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import { getActiveCompany } from "@/lib/settings/company";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form model — full Item field set per ERPNext v15 master schema
// ---------------------------------------------------------------------------
interface ItemForm {
  // Identity (step 1)
  item_code: string;
  item_name: string;
  item_group: string;
  brand?: string;
  description?: string;
  // Stock & UOM (step 1 too)
  stock_uom: string;
  // Valuation (step 2)
  valuation_method?: string;
  valuation_rate?: number;
  standard_rate?: number;
  // Inventory defaults (step 2)
  default_warehouse?: string;
  weight_per_unit?: number;
  weight_uom?: string;
  // Configuration (step 3)
  is_stock_item: boolean;
  is_fixed_asset: boolean;
  has_batch_no: boolean;
  has_serial_no: boolean;
  disabled: boolean;
  // Accounting defaults (step 3 — collapsed dropdowns via FrappeSelect)
  default_income_account?: string;
  default_expense_account?: string;
  default_buying_cost_center?: string;
  // Sales / purchase defaults (step 3)
  default_supplier?: string;
  customer_code?: string;
  // Barcodes (item-level) — small table to support multi-UOM ops
  barcodes: Array<{ barcode: string; uom?: string }>;
}

const EMPTY_BARCODE = { barcode: "", uom: "" };

const itemFormSchema = z.object({
  item_code: z.string().min(1, "Item code is required"),
  item_name: z.string().min(1, "Item name is required"),
  item_group: z.string().min(1, "Item group is required"),
  brand: z.string().optional(),
  description: z.string().optional(),
  stock_uom: z.string().min(1, "Stock UOM is required"),
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

// ---------------------------------------------------------------------------
// Wizard steps
// ---------------------------------------------------------------------------
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
    description: "UOM defaults, valuation, weight",
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

function generateItemCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 20);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CreateItemPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const { resolution, showError, dismiss } = useGuidedError();

  // 2R Part 7 — defaults from settings: default Item Group + UOM from the
  // active company's settings (configured in the Inventory → Settings
  // page). Falls back to "All Item Groups" / "Nos" if not configured.
  const { data: itemGroupOptions } = useFrappeOptions("Item Group", { limit: 1 });
  const { data: uomOptions } = useFrappeOptions("UOM", { limit: 1 });
  const defaultItemGroup = (itemGroupOptions ?? []).find(
    (o) => o.value === "All Item Groups" || o.value === "Products",
  )?.value ?? (itemGroupOptions ?? [])[0]?.value ?? "All Item Groups";
  const defaultUom = (uomOptions ?? []).find(
    (o) => o.value === "Nos" || o.value === "Unit",
  )?.value ?? (uomOptions ?? [])[0]?.value ?? "Nos";

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    mode: "onChange",
    defaultValues: {
      item_code: "",
      item_name: "",
      item_group: defaultItemGroup,
      brand: "",
      description: "",
      stock_uom: defaultUom,
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

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.barcodes ?? [];

  // Auto-generate item code from name (only while the user hasn't manually edited it).
  const handleNameChange = (name: string) => {
    form.setValue("item_name", name, { shouldValidate: true });
    if (!form.getValues("item_code") || isGeneratingCode) {
      setIsGeneratingCode(true);
      const code = generateItemCode(name);
      form.setValue("item_code", code, { shouldValidate: true });
      setTimeout(() => setIsGeneratingCode(false), 300);
    }
  };

  // Validation gate (gates Next + Submit)
  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, barcodes: watchedItems };
    return {
      step1: validateWizardStep("Item", "step1", values),
      step2: validateWizardStep("Item", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  // -- Create mutation ------------------------------------------------------
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Item", {
    successMessage: "Item created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) router.push(`/stock/item/${encodeURIComponent(name)}`);
    },
    onError: (err) =>
      showError(resolveFrappeError(err, { doctype: "Item", values: getValues() })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    // Map form values → ERPNext payload. Booleans → 0/1 (Frappe
    // convention); drop empty strings + empty barcodes.
    const cleanedBarcodes = (values.barcodes ?? [])
      .map((b) => ({ barcode: (b.barcode ?? "").trim(), uom: (b.uom ?? "").trim() }))
      .filter((b) => b.barcode);
    const payload: Record<string, unknown> = {
      ...values,
      company: getActiveCompany(),
      item_code: values.item_code,
      item_name: values.item_name,
      item_group: values.item_group,
      stock_uom: values.stock_uom,
      brand: values.brand || undefined,
      description: values.description || undefined,
      valuation_method: values.valuation_method || "FIFO",
      valuation_rate: values.valuation_rate || 0,
      standard_rate: values.standard_rate || 0,
      weight_per_unit: values.weight_per_unit || 0,
      weight_uom: values.weight_uom || undefined,
      default_warehouse: values.default_warehouse || undefined,
      default_supplier: values.default_supplier || undefined,
      customer_code: values.customer_code || undefined,
      default_income_account: values.default_income_account || undefined,
      default_expense_account: values.default_expense_account || undefined,
      default_buying_cost_center: values.default_buying_cost_center || undefined,
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
    createMutation.mutate(payload);
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Item"
        subtitle="Create an item across three steps"
        backHref="/stock/item"
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
            submitLabel="Create Item"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Identity -----------------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Package className="h-5 w-5 text-primary" />}
                      title="Identity"
                      description="Set the canonical identifier, name, group, and stock UOM for this item."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <FormInput
                          control={control}
                          name="item_name"
                          label="Item Name"
                          required
                          placeholder="What is this item?"
                          onChangeAfter={(v) => handleNameChange(v)}
                        />
                      </div>
                      <FormInput
                        control={control}
                        name="item_code"
                        label="Item Code"
                        required
                        placeholder="Auto-generated from name"
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
                                  placeholder="Notes about this item — vendor specs, packaging, storage instructions…"
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

              // ---- STEP 2 — Stock & Valuation ---------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Calculator className="h-5 w-5 text-primary" />}
                      title="Stock & Valuation"
                      description="Set the valuation method, default warehouse, weight, and any barcodes."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect
                        control={control}
                        name="valuation_method"
                        label="Valuation Method"
                        doctype="Stock Settings"
                        labelField="valuation_method"
                        placeholder="FIFO"
                      />
                      <FormInput
                        control={control}
                        name="valuation_rate"
                        label="Valuation Rate"
                        type="number"
                        placeholder="0.00"
                      />
                      <FormInput
                        control={control}
                        name="standard_rate"
                        label="Standard Rate"
                        type="number"
                        placeholder="0.00"
                      />
                      <FormFrappeSelect
                        control={control}
                        name="default_warehouse"
                        label="Default Warehouse"
                        doctype="Warehouse"
                        labelField="warehouse_name"
                        placeholder="Select default warehouse…"
                      />
                      <FormInput
                        control={control}
                        name="weight_per_unit"
                        label="Weight per Unit"
                        type="number"
                        placeholder="0.00"
                      />
                      <FormFrappeSelect
                        control={control}
                        name="weight_uom"
                        label="Weight UOM"
                        doctype="UOM"
                        labelField="uom_name"
                        placeholder="Kg"
                      />
                    </div>

                    {/* Barcodes table — Item Barcode child rows */}
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
                                    placeholder="UOM…"
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

              // ---- STEP 3 — Configuration -------------------------------
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<Settings className="h-5 w-5 text-primary" />}
                    title="Configuration"
                    description="Toggles + accounting/sales/purchase defaults."
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ConfigToggle
                      control={control}
                      name="is_stock_item"
                      title="Maintain Stock"
                      description="Track inventory levels (raw materials, finished goods)"
                    />
                    <ConfigToggle
                      control={control}
                      name="is_fixed_asset"
                      title="Fixed Asset"
                      description="Depreciate over time"
                    />
                    <ConfigToggle
                      control={control}
                      name="has_batch_no"
                      title="Has Batch No"
                      description="Track by batch (pharma, food)"
                    />
                    <ConfigToggle
                      control={control}
                      name="has_serial_no"
                      title="Has Serial No"
                      description="Track by serial (electronics, equipment)"
                    />
                    <ConfigToggle
                      control={control}
                      name="disabled"
                      title="Disabled"
                      description="Hide from transactions"
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-semibold text-foreground">Accounting Defaults</p>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect
                        control={control}
                        name="default_income_account"
                        label="Default Income Account"
                        doctype="Account"
                        labelField="account_name"
                        placeholder="Account…"
                        filters={[
                          ["account_type", "=", "Income Account"],
                          ["company", "=", getActiveCompany()],
                          ["is_group", "=", 0],
                        ]}
                      />
                      <FormFrappeSelect
                        control={control}
                        name="default_expense_account"
                        label="Default Expense Account"
                        doctype="Account"
                        labelField="account_name"
                        placeholder="Account…"
                        filters={[
                          ["account_type", "=", "Expense Account"],
                          ["company", "=", getActiveCompany()],
                          ["is_group", "=", 0],
                        ]}
                      />
                      <FormFrappeSelect
                        control={control}
                        name="default_buying_cost_center"
                        label="Default Buying Cost Center"
                        doctype="Cost Center"
                        labelField="cost_center_name"
                        placeholder="Cost Center…"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-semibold text-foreground">Sales / Purchase Defaults</p>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect
                        control={control}
                        name="default_supplier"
                        label="Default Supplier"
                        doctype="Supplier"
                        labelField="supplier_name"
                        placeholder="Supplier…"
                      />
                      <FormInput
                        control={control}
                        name="customer_code"
                        label="Customer Code (optional)"
                        placeholder="Code the customer uses for this item"
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