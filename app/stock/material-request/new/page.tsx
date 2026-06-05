"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  FileInput,
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

interface MRItem {
  item_code: string;
  item_name?: string;
  qty: number;
  uom?: string;
  warehouse?: string;
  schedule_date?: string;
}

interface MRForm {
  naming_series: string;
  material_request_type: string;
  company: string;
  transaction_date: string;
  schedule_date: string;
  set_from_warehouse: string;
  set_warehouse: string;
  items: MRItem[];
}

const EMPTY_ITEM: MRItem = {
  item_code: "",
  item_name: "",
  qty: 1,
  uom: "Nos",
  warehouse: "",
  schedule_date: "",
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Request Type",
    description: "Define the purpose and timeline",
    schema: null,
    fields: [
      "material_request_type",
      "company",
      "transaction_date",
      "schedule_date",
    ],
    icon: "FileInput",
  },
  {
    id: "step2",
    label: "Items & Review",
    description: "Add items and review the request",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
];

const REQUEST_TYPE_OPTIONS = [
  { value: "Purchase", label: "Purchase" },
  { value: "Material Transfer", label: "Material Transfer" },
  { value: "Material Issue", label: "Material Issue" },
];

export default function NewMaterialRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<MRForm>({
    defaultValues: {
      naming_series: "MAT-MR-.YYYY.-",
      material_request_type: "Purchase",
      company: "",
      transaction_date: new Date().toISOString().split("T")[0],
      schedule_date: "",
      set_from_warehouse: "",
      set_warehouse: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const searchParams = useSearchParams();
  const prefillItemCode = searchParams.get("item_code");
  const prefillItemName = searchParams.get("item_name");
  const prefillQty = searchParams.get("qty");
  const prefillWarehouse = searchParams.get("warehouse");

  useEffect(() => {
    if (!prefillItemCode) return;
    setValue("items.0.item_code", prefillItemCode);
    if (prefillItemName) setValue("items.0.item_name", prefillItemName);
    if (prefillQty) setValue("items.0.qty", Number(prefillQty));
    if (prefillWarehouse) {
      setValue("items.0.warehouse", prefillWarehouse);
      setValue("set_warehouse", prefillWarehouse);
    }
  }, [prefillItemCode, prefillItemName, prefillQty, prefillWarehouse, setValue]);

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedType = watchedAll?.material_request_type ?? "";

  const isTransfer = watchedType === "Material Transfer";

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Material Request", "step1", values),
      step2: validateWizardStep("Material Request", "step2", { items: watchedAll?.items ?? [] }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Material Request", {
    successMessage: "Material Request created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/stock/material-request/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Material Request" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the request.");
      setStep(1);
      return;
    }
    createMutation.mutate({
      ...values,
      items: items.map((it) => ({
        ...it,
        schedule_date: it.schedule_date || values.schedule_date,
        warehouse: it.warehouse || values.set_warehouse,
      })),
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Material Request"
        subtitle="Create a material request in two steps"
        backHref="/stock/material-request"
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
            submitLabel="Create Material Request"
            submittingLabel="Creating..."
            renderStep={(s) => {
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<FileInput className="h-5 w-5 text-primary" />}
                      title="Request Type"
                      description="Define the purpose and timeline for this request."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormSelect
                        control={control}
                        name="material_request_type"
                        label="Request Type"
                        required
                        options={REQUEST_TYPE_OPTIONS}
                      />
                      <FormFrappeSelect
                        control={control}
                        name="company"
                        label="Company"
                        required
                        doctype="Company"
                        labelField="company_name"
                        placeholder="Select company..."
                      />
                      <FormDatePicker
                        control={control}
                        name="transaction_date"
                        label="Transaction Date"
                        required
                      />
                      <FormDatePicker
                        control={control}
                        name="schedule_date"
                        label="Required By"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect
                        control={control}
                        name="set_warehouse"
                        label={isTransfer ? "Target Warehouse" : "Default Warehouse"}
                        doctype="Warehouse"
                        placeholder="Auto-fill for items"
                        filters={[["is_group", "=", 0]]}
                      />
                      {isTransfer && (
                        <FormFrappeSelect
                          control={control}
                          name="set_from_warehouse"
                          label="Source Warehouse"
                          doctype="Warehouse"
                          placeholder="Default source"
                          filters={[["is_group", "=", 0]]}
                        />
                      )}
                    </div>
                  </div>
                );
              }

              if (s.id === "step2") {
                const totalQty = (watchedItems ?? []).reduce(
                  (sum, it) => sum + (Number(it?.qty) || 0),
                  0
                );
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<Package className="h-5 w-5 text-primary" />}
                        title="Items & Review"
                        description="Add the items you need."
                      />
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
                              UOM
                            </th>
                            <th className="px-3 py-2.5 text-right font-semibold">
                              Warehouse
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
                                    "item_name",
                                    "stock_uom",
                                  ]}
                                  onValueChange={(_val, doc) => {
                                    if (doc) {
                                      setValue(
                                        `items.${index}.uom`,
                                        doc.stock_uom || "Nos"
                                      );
                                      setValue(
                                        `items.${index}.item_name`,
                                        doc.item_name || ""
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
                                <FormFrappeSelect
                                  control={control}
                                  name={`items.${index}.uom`}
                                  doctype="UOM"
                                  hideLabel
                                  placeholder="UOM"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <FormFrappeSelect
                                  control={control}
                                  name={`items.${index}.warehouse`}
                                  doctype="Warehouse"
                                  hideLabel
                                  placeholder="Warehouse"
                                  filters={[["is_group", "=", 0]]}
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
                            Total Items
                          </p>
                          <p className="text-xl font-bold tabular-nums text-foreground">
                            {totalQty}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">
                          Review Summary
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Request Type
                          </p>
                          <p className="font-medium text-foreground">
                            {watchedType}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Company
                          </p>
                          <p className="font-medium text-foreground">
                            {getValues().company || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Transaction Date
                          </p>
                          <p className="font-medium text-foreground">
                            {getValues().transaction_date}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Required By
                          </p>
                          <p className="font-medium text-foreground">
                            {getValues().schedule_date || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-border/60 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {(watchedItems ?? []).filter((i) => i?.item_code).length}{" "}
                            item(s)
                          </span>
                          <span className="text-lg font-bold tabular-nums text-primary">
                            {totalQty} total units
                          </span>
                        </div>
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
