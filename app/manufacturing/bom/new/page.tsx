"use client";

// app/manufacturing/bom/new/page.tsx
// BOM Create — 3-step FlowWizard, Zod gating, error resolver.
// Step 1: Product (item, qty, is_active, is_default)
// Step 2: Materials & Operations (items table, operations table)
// Step 3: Review (costing rollup)

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Package,
  Layers,
  ClipboardCheck,
  Plus,
  Trash2,
  Cog,
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
import {
  FormInput,
  FormFrappeSelect,
  FormSwitch,
} from "@/components/form";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import { getActiveCompany } from "@/lib/settings/company";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { BOMFormData, BOMItemData, BOMOperationData } from "@/lib/schemas/doctype-schemas";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface BOMForm {
  item: string;
  company: string;
  quantity: number;
  uom: string;
  currency: string;
  conversion_rate: number;
  is_active: number;
  is_default: number;
  with_operations: number;
  items: BOMItemData[];
  operations: BOMOperationData[];
}

const EMPTY_ITEM: BOMItemData = {
  item_code: "",
  item_name: "",
  qty: 1,
  rate: 0,
  amount: 0,
  uom: "Nos",
  source_warehouse: "",
};

const EMPTY_OPERATION: BOMOperationData = {
  operation: "",
  workstation: "",
  time_in_mins: 0,
  operating_cost: 0,
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Product",
    description: "Select the item and set batch quantity",
    schema: null,
    fields: ["item", "quantity", "is_active", "is_default"],
    icon: "Package",
  },
  {
    id: "step2",
    label: "Materials & Operations",
    description: "Add raw materials and optional operations",
    schema: null,
    fields: ["items", "operations"],
    icon: "Layers",
  },
  {
    id: "step3",
    label: "Review",
    description: "Review the BOM before creating",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewBOMPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillItem = searchParams.get("item");

  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<BOMForm>({
    defaultValues: {
      item: prefillItem || "",
      quantity: 1,
      uom: "Nos",
      currency: "ETB",
      conversion_rate: 1,
      is_active: 1,
      is_default: 0,
      with_operations: 0,
      items: [{ ...EMPTY_ITEM }],
      operations: [],
    },
  });

  const { control, getValues, setValue } = form;

  const { data: itemDoc } = useFrappeDoc<{ stock_uom?: string }>(
    "Item",
    prefillItem || "",
    { enabled: !!prefillItem }
  );

  useEffect(() => {
    if (prefillItem) {
      setValue("item", prefillItem);
      if (itemDoc?.stock_uom) {
        setValue("uom", itemDoc.stock_uom);
      }
    }
  }, [prefillItem, itemDoc, setValue]);
  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: "items" });
  const {
    fields: opFields,
    append: appendOp,
    remove: removeOp,
  } = useFieldArray({ control, name: "operations" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedOps = watchedAll?.operations ?? [];
  const withOps = watchedAll?.with_operations === 1;

  const rawMaterialCost = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  const operatingCost = useMemo(
    () =>
      (watchedOps ?? []).reduce(
        (sum, op) => sum + (Number(op?.operating_cost) || 0),
        0,
      ),
    [watchedOps],
  );

  const totalCost = rawMaterialCost + operatingCost;

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = {
      ...getValues(),
      ...watchedAll,
      items: watchedAll?.items ?? [],
      operations: watchedAll?.operations ?? [],
    };
    return {
      step1: validateWizardStep("BOM", "step1", values),
      step2: validateWizardStep("BOM", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("BOM", {
    successMessage: "BOM created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/manufacturing/bom/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "BOM",
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
      toast.error("Add at least one material before creating the BOM.");
      setStep(1);
      return;
    }
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      items: items.map((it) => ({
        ...it,
        amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
      })),
      operations: (values.operations ?? []).filter((op) => op.operation),
      conversion_rate: 1,
      currency: "ETB",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New BOM"
        subtitle="Define a production recipe in three steps"
        backHref="/manufacturing/bom"
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
          submitLabel="Create BOM"
          submittingLabel="Creating..."
          renderStep={(s) => {
            // ---- STEP 1 — Product ------------------------------------------
            if (s.id === "step1") {
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<Package className="h-5 w-5 text-primary" />}
                    title="Product"
                    description="Select the item to manufacture and set the batch quantity."
                  />
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <FormFrappeSelect
                      control={control}
                      name="item"
                      label="Item to Manufacture"
                      required
                      doctype="Item"
                      placeholder="Search item..."
                      extraFields={["item_name", "stock_uom", "description"]}
                      onValueChange={(_val, doc) => {
                        if (doc) {
                          setValue("uom", doc.stock_uom || "Nos");
                        }
                      }}
                    />
                    <FormInput
                      control={control}
                      name="quantity"
                      label="Batch Quantity"
                      type="number"
                      required
                    />
                    <FormInput
                      control={control}
                      name="uom"
                      label="UOM"
                      placeholder="Nos"
                    />
                  </div>
                  <div className="flex gap-6 pt-2">
                    <FormSwitch
                      control={control}
                      name="is_active"
                      label="Active"
                    />
                    <FormSwitch
                      control={control}
                      name="is_default"
                      label="Default BOM"
                    />
                  </div>
                </div>
              );
            }

            // ---- STEP 2 — Materials & Operations ---------------------------
            if (s.id === "step2") {
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<Layers className="h-5 w-5 text-primary" />}
                    title="Materials & Operations"
                    description="Add raw materials and optional production operations."
                  />

                  {/* Materials Table */}
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
                        {itemFields.map((field, index) => {
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
                                  extraFields={["standard_rate", "stock_uom", "item_name"]}
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
                                  onClick={() => removeItem(index)}
                                  disabled={itemFields.length === 1}
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
                        onClick={() => appendItem({ ...EMPTY_ITEM })}
                      >
                        <Plus className="mr-1.5 h-4 w-4" /> Add Material
                      </Button>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Raw Material Cost
                        </p>
                        <p className="text-xl font-bold tabular-nums text-foreground">
                          {ETB.format(rawMaterialCost)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Operations */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cog className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold">Operations (Optional)</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-dashed"
                        onClick={() => appendOp({ ...EMPTY_OPERATION })}
                      >
                        <Plus className="mr-1.5 h-4 w-4" /> Add Operation
                      </Button>
                    </div>

                    {opFields.length > 0 && (
                      <div className="space-y-3">
                        {opFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-secondary/20 border border-border/30"
                          >
                            <div className="col-span-4">
                              <FormFrappeSelect
                                control={control}
                                name={`operations.${index}.operation`}
                                doctype="Operation"
                                hideLabel
                                placeholder="Operation..."
                              />
                            </div>
                            <div className="col-span-3">
                              <FormFrappeSelect
                                control={control}
                                name={`operations.${index}.workstation`}
                                doctype="Workstation"
                                hideLabel
                                placeholder="Workstation..."
                              />
                            </div>
                            <div className="col-span-2">
                              <NumberCell
                                control={control}
                                name={`operations.${index}.time_in_mins`}
                                placeholder="Time (min)"
                              />
                            </div>
                            <div className="col-span-2">
                              <NumberCell
                                control={control}
                                name={`operations.${index}.operating_cost`}
                                placeholder="Cost"
                              />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeOp(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ---- STEP 3 — Review -------------------------------------------
            const v = getValues();
            return (
              <div className="space-y-5">
                <StepHeading
                  icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                  title="Review & Confirm"
                  description="Confirm the details below to create the BOM."
                />
                <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Summary label="Item" value={v.item} />
                    <Summary label="Company" value={v.company} />
                    <Summary label="Batch Quantity" value={`${v.quantity} ${v.uom || "Nos"}`} />
                    <Summary
                      label="Status"
                      value={v.is_active ? "Active" : "Inactive"}
                    />
                  </div>
                  <div className="mt-4 border-t border-border/60 pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {(watchedItems ?? []).filter((i) => i?.item_code).length}{" "}
                        material(s)
                      </span>
                      <span className="font-semibold">{ETB.format(rawMaterialCost)}</span>
                    </div>
                    {watchedOps.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {watchedOps.filter((o) => o?.operation).length} operation(s)
                        </span>
                        <span className="font-semibold">{ETB.format(operatingCost)}</span>
                      </div>
                    )}
                    <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                      <span className="font-bold text-foreground">Total Cost</span>
                      <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums text-primary">
                          {ETB.format(totalCost)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Per {v.quantity} {v.uom || "Nos"}
                        </p>
                      </div>
                    </div>
                  </div>
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

function NumberCell({
  control,
  name,
  placeholder,
}: {
  control: ReturnType<typeof useForm<BOMForm>>["control"];
  name: `items.${number}.qty` | `items.${number}.rate` | `operations.${number}.time_in_mins` | `operations.${number}.operating_cost`;
  placeholder?: string;
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
              placeholder={placeholder}
              className="h-10 rounded-lg border-0 bg-secondary/30 text-right tabular-nums"
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
