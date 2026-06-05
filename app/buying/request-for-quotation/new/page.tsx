"use client";

// app/buying/request-for-quotation/new/page.tsx
// Request for Quotation Create — 3-step FlowWizard, Zod gating, AUTO_FILL from MR.
// GOLDEN TEMPLATE: FlowWizard + validateWizardStep + useWatch gate + error resolver.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Building2,
  Package,
  ClipboardCheck,
  Plus,
  Trash2,
  Lock,
  Users,
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
import type { MaterialRequest } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { getActiveCompany } from "@/lib/settings/company";
import { FieldWrap } from "@/components/form/field-wrap";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface RFQItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
  schedule_date?: string;
}

interface RFQSupplier {
  supplier: string;
}

interface RFQForm {
  naming_series: string;
  company: string;
  transaction_date: string;
  schedule_date?: string;
  message_for_supplier: string;
  status: string;
  items: RFQItem[];
  suppliers: RFQSupplier[];
}

const EMPTY_ITEM: RFQItem = {
  item_code: "",
  item_name: "",
  description: "",
  qty: 1,
  uom: "Nos",
};

const EMPTY_SUPPLIER: RFQSupplier = {
  supplier: "",
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Company & Date",
    description: "Set the purchasing entity and timeline",
    schema: null,
    fields: ["company", "transaction_date"],
    icon: "Building2",
  },
  {
    id: "step2",
    label: "Items & Suppliers",
    description: "Add items to quote and select suppliers",
    schema: null,
    fields: ["items", "suppliers"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Send",
    description: "Review the RFQ before creating it",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

export default function NewRequestForQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialRequestId = searchParams.get("material_request");

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<RFQForm>({
    defaultValues: {
      naming_series: "PUR-RFQ-.YYYY.-",
      company: "",
      transaction_date: new Date().toISOString().split("T")[0],
      message_for_supplier: "",
      status: "Draft",
      items: [{ ...EMPTY_ITEM }],
      suppliers: [{ ...EMPTY_SUPPLIER }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control, name: "items" });
  const {
    fields: supplierFields,
    append: appendSupplier,
    remove: removeSupplier,
  } = useFieldArray({ control, name: "suppliers" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedSuppliers = watchedAll?.suppliers ?? [];

  // -- Auto-fill from upstream Material Request via the registry -------------
  const { data: materialRequest, isLoading: loadingMR } =
    useFrappeDoc<MaterialRequest>("Material Request", materialRequestId ?? "", {
      enabled: !!materialRequestId,
    });

  useEffect(() => {
    if (!materialRequest) return;
    const mapping = getAutoFillMapping("Material Request", "Request for Quotation");
    if (!mapping) return;

    const header = applyAutoFill(
      materialRequest as unknown as Record<string, unknown>,
      mapping,
    );
    const items = applyItemAutoFill(
      (materialRequest as { items?: Record<string, unknown>[] }).items ?? [],
      mapping,
    ) as unknown as RFQItem[];

    reset({
      ...getValues(),
      ...(header as Partial<RFQForm>),
      items: items.length ? items : [{ ...EMPTY_ITEM }],
      suppliers: [{ ...EMPTY_SUPPLIER }],
      message_for_supplier: "",
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Material Request ${materialRequestId}`, {
      description: "Select suppliers to continue.",
    });
  }, [materialRequest, materialRequestId, reset, getValues]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  // -- Per-step validation (gates the wizard's Next button) ------------------
  const validationResults = useMemo<Record<string, StepValidationResult>>(
    () => {
      const values = {
        ...getValues(),
        ...watchedAll,
        items: watchedAll?.items ?? [],
        suppliers: watchedAll?.suppliers ?? [],
      };
      return {
        step1: validateWizardStep("Request for Quotation", "step1", values),
        step2: validateWizardStep("Request for Quotation", "step2", values),
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
  >("Request for Quotation", {
    successMessage: "Request for Quotation created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(
          `/buying/request-for-quotation/${encodeURIComponent(name)}`,
        );
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "Request for Quotation",
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
    const suppliers = (values.suppliers ?? []).filter((s) => s.supplier);

    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the RFQ.");
      setStep(1);
      return;
    }
    if (suppliers.length === 0) {
      toast.error("Add at least one supplier before creating the RFQ.");
      setStep(1);
      return;
    }

    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      items: items.map((it) => ({
        ...it,
        doctype: "Request for Quotation Item",
      })),
      suppliers: suppliers.map((s) => ({
        ...s,
        doctype: "Request for Quotation Supplier",
      })),
      message_for_supplier:
        values.message_for_supplier || "Please provide your best quote.",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Request for Quotation"
        subtitle={
          materialRequestId
            ? `From Material Request ${materialRequestId}`
            : "Create an RFQ in three steps"
        }
        backHref="/buying/request-for-quotation"
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
            submitLabel="Create RFQ"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Company & Date ----------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Building2 className="h-5 w-5 text-primary" />}
                      title="Company & Date"
                      description="Set the purchasing entity and RFQ date."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap
                        auto={isAuto("company")}
                        loading={loadingMR}
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
                        label="RFQ Date"
                        required
                      />
                      <div className="md:col-span-2">
                        <FormInput
                          control={control}
                          name="message_for_supplier"
                          label="Message for Supplier"
                          placeholder="Please provide your best quote for the following items..."
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Items & Suppliers -------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-8">
                    {/* Items Section */}
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <StepHeading
                          icon={<Package className="h-5 w-5 text-primary" />}
                          title="Items"
                          description="Add items to include in the quotation request."
                        />
                        {isAuto("items") && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            Auto-filled
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
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {itemFields.map((field, index) => (
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
                                <td className="px-2 py-2 text-center align-middle">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                    onClick={() => removeItem(index)}
                                    disabled={
                                      itemFields.length === 1 || isAuto("items")
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="border-t border-border/60 bg-secondary/10 px-3 py-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full border-dashed"
                            onClick={() => appendItem({ ...EMPTY_ITEM })}
                            disabled={isAuto("items")}
                          >
                            <Plus className="mr-1.5 h-4 w-4" /> Add Item
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Suppliers Section */}
                    <div className="space-y-5">
                      <StepHeading
                        icon={<Users className="h-5 w-5 text-primary" />}
                        title="Suppliers"
                        description="Select suppliers to send this RFQ to."
                      />

                      <div className="space-y-3">
                        {supplierFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex items-end gap-3 group"
                          >
                            <div className="flex-1">
                              <FormFrappeSelect
                                control={control}
                                name={`suppliers.${index}.supplier`}
                                doctype="Supplier"
                                label={index === 0 ? "Supplier" : undefined}
                                hideLabel={index > 0}
                                placeholder="Select supplier..."
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-muted-foreground hover:text-destructive"
                              onClick={() => removeSupplier(index)}
                              disabled={supplierFields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-dashed"
                        onClick={() => appendSupplier({ ...EMPTY_SUPPLIER })}
                      >
                        <Plus className="mr-1.5 h-4 w-4" /> Add Supplier
                      </Button>
                    </div>
                  </div>
                );
              }

              // ---- STEP 3 — Review ------------------------------------
              const v = getValues();
              const validItems = (watchedItems ?? []).filter(
                (i) => i?.item_code,
              );
              const validSuppliers = (watchedSuppliers ?? []).filter(
                (s) => s?.supplier,
              );
              return (
                <div className="space-y-5">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review & Send"
                    description="Confirm the details below to create the RFQ."
                  />
                  <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <Summary label="Company" value={v.company} />
                      <Summary label="RFQ Date" value={v.transaction_date} />
                    </div>
                    <div className="mt-4 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {validItems.length} item(s) · {validSuppliers.length}{" "}
                          supplier(s)
                        </span>
                      </div>
                    </div>
                    {v.message_for_supplier && (
                      <div className="mt-4 border-t border-border/60 pt-4">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Message
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {v.message_for_supplier}
                        </p>
                      </div>
                    )}
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
