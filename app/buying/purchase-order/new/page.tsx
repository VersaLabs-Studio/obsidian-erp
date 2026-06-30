"use client";

// app/buying/purchase-order/new/page.tsx
// Obsidian ERP v4.0 — Purchase Order Create (V4 FlowWizard)
// 3-step wizard: Supplier & Dates → Items → Review & Submit.
// Auto-fill from Material Request or Supplier Quotation via AUTO_FILL_REGISTRY.
// Error resolver wired. OKLCH tokens only. No @ts-nocheck, no any.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  UserRound,
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
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuickAddField } from "@/components/quick-add/QuickAddField";
import { ItemRateAutoFill } from "@/lib/flows/item-price-lookup";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { useMakeFrom } from "@/hooks/flows/use-make-from";
import {
  getAutoFillMapping,
  applyAutoFill,
  applyItemAutoFill,
} from "@/lib/flows/flow-auto-fill";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import type { WizardStep } from "@/types/flow-types";
import type { PurchaseOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { getActiveCompany } from "@/lib/settings/company";
import { FieldWrap } from "@/components/form/field-wrap";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface POItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
  warehouse?: string;
  schedule_date?: string;
}

interface POForm {
  naming_series: string;
  supplier: string;
  supplier_name?: string;
  company: string;
  transaction_date: string;
  schedule_date: string;
  currency: string;
  conversion_rate: number;
  buying_price_list: string;
  price_list_currency: string;
  plc_conversion_rate: number;
  set_warehouse?: string;
  material_request?: string;
  terms?: string;
  status: string;
  items: POItem[];
}

const EMPTY_ITEM: POItem = {
  item_code: "",
  item_name: "",
  description: "",
  qty: 1,
  rate: 0,
  amount: 0,
  uom: "Nos",
  warehouse: "",
};

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "Supplier & Dates",
    description: "Confirm the supplier and set the delivery timeline",
    schema: null,
    fields: ["supplier", "transaction_date", "schedule_date"],
    icon: "UserRound",
  },
  {
    id: "step2",
    label: "Order Items",
    description: "Add items, quantities, and rates",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Submit",
    description: "Review the order before creating it",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const materialRequestId = searchParams.get("material_request");
  const supplierQuotationId = searchParams.get("supplier_quotation");
  // 2V P0-2 — shortfall prefill: optional shortfall param from the
  // StartProductionModal. Format: "ITEM-001:qty,ITEM-002:qty". Items are
  // prefilled with the specified qty; supplier stays blank.
  const shortfallParam = searchParams.get("shortfall");
  const workOrderParam = searchParams.get("work_order");

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<POForm>({
    defaultValues: {
      naming_series: "PUR-ORD-.YYYY.-",
      supplier: "",
      transaction_date: new Date().toISOString().split("T")[0],
      schedule_date: "",
      currency: "ETB",
      conversion_rate: 1,
      buying_price_list: "Standard Buying",
      price_list_currency: "ETB",
      plc_conversion_rate: 1,
      status: "Draft",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];

  // -- Auto-fill from Material Request ---------------------------------------
  const { data: materialRequest, isLoading: loadingMR } =
    useFrappeDoc<PurchaseOrder>("Material Request", materialRequestId ?? "", {
      enabled: !!materialRequestId,
    });

  // -- Auto-fill from Supplier Quotation -------------------------------------
  const { data: supplierQuotation, isLoading: loadingSQ } =
    useFrappeDoc<PurchaseOrder>("Supplier Quotation", supplierQuotationId ?? "", {
      enabled: !!supplierQuotationId,
    });

  // 2R Part 2 — canonical make-from (server mapper). Takes priority
  // over the hand-mapping registry below. The registry remains as a
  // silent fallback for the route-error case (e.g. the user lacks
  // CREATE on PO, the mapper errors out, or the MR has no supplier).
  const { draft: mrDraft } = useMakeFrom({
    sourceDoctype: "Material Request",
    sourceName: materialRequestId,
    targetDoctype: "Purchase Order",
    enabled: !!materialRequestId,
  });
  const { draft: sqDraft } = useMakeFrom({
    sourceDoctype: "Supplier Quotation",
    sourceName: supplierQuotationId,
    targetDoctype: "Purchase Order",
    enabled: !!supplierQuotationId,
  });
  const canonicalDraft = mrDraft ?? sqDraft;
  const canonicalSourceType = materialRequestId
    ? "Material Request"
    : supplierQuotationId
      ? "Supplier Quotation"
      : null;

  // 2R Part 2 — hydrate from the canonical draft when it arrives.
  // Runs BEFORE the hand-mapping fallback effect so the canonical path
  // wins; the fallback only runs when `canonicalDraft` is null.
  useEffect(() => {
    if (!canonicalDraft || !canonicalSourceType) return;
    const d = canonicalDraft.doc as Partial<POForm> & { items?: POItem[] };
    reset({
      ...getValues(),
      ...d,
      items: Array.isArray(d.items) && d.items.length > 0 ? d.items : [{ ...EMPTY_ITEM }],
      schedule_date: "",
    });
    // Mark every header field from the draft as auto-filled.
    const filled = new Set<string>(
      Object.keys(d).filter((k) => k !== "items" && k !== "schedule_date"),
    );
    filled.add("items");
    setAutoFilledFields(filled);
    toast.success(`Loaded from ${canonicalSourceType} ${materialRequestId ?? supplierQuotationId}`, {
      description: "Set the schedule date to continue.",
    });
  }, [canonicalDraft, canonicalSourceType, materialRequestId, supplierQuotationId, reset, getValues]);

  useEffect(() => {
    // 2R Part 2 — the canonical server-mapper draft takes priority.
    // Skip the hand-mapping fallback when the draft is already present.
    if (canonicalDraft) return;
    const source = materialRequest ?? supplierQuotation;
    const sourceType = materialRequest
      ? "Material Request"
      : supplierQuotation
        ? "Supplier Quotation"
        : null;
    if (!source || !sourceType) return;

    const mapping = getAutoFillMapping(sourceType, "Purchase Order");
    if (!mapping) return;

    const header = applyAutoFill(
      source as unknown as Record<string, unknown>,
      mapping,
    );
    const items = applyItemAutoFill(
      (source as { items?: Record<string, unknown>[] }).items ?? [],
      mapping,
    ) as unknown as POItem[];

    reset({
      ...getValues(),
      ...(header as Partial<POForm>),
      items: items.length ? items : [{ ...EMPTY_ITEM }],
      schedule_date: "",
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from ${sourceType} ${materialRequestId ?? supplierQuotationId}`, {
      description: "Set the schedule date to continue.",
    });
  }, [
    canonicalDraft,
    materialRequest,
    supplierQuotation,
    materialRequestId,
    supplierQuotationId,
    reset,
    getValues,
  ]);

  // 2V P0-2 — shortfall prefill. When ?shortfall= is provided (from
  // StartProductionModal), populate items with the shortfall pairs.
  // Runs only when no canonical source doc auto-fill is in progress.
  useEffect(() => {
    if (!shortfallParam) return;
    if (canonicalDraft || materialRequest || supplierQuotation) return;

    const pairs = shortfallParam.split(",").filter(Boolean);
    const items: POItem[] = pairs.map((pair) => {
      const [item_code, qtyStr] = pair.split(":");
      return {
        item_code: item_code ?? "",
        item_name: "",
        description: "",
        qty: Math.max(1, Number(qtyStr) || 1),
        rate: 0,
        amount: 0,
        uom: "Nos",
        warehouse: "",
      };
    });

    if (items.length === 0) return;

    reset({
      ...getValues(),
      items,
      ...(workOrderParam ? { material_request: `WO: ${workOrderParam}` } : {}),
      schedule_date: "",
    });

    setAutoFilledFields(new Set(["items"]));

    toast.success("Shortfall items loaded", {
      description: `${items.length} item(s) prefilled from the production shortfall. Set a supplier to continue.`,
    });
  }, [
    shortfallParam,
    workOrderParam,
    canonicalDraft,
    materialRequest,
    supplierQuotation,
    reset,
    getValues,
  ]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = {
      ...getValues(),
      ...watchedAll,
      items: watchedAll?.items ?? [],
    };
    return {
      step1: validateWizardStep("Purchase Order", "step1", values),
      step2: validateWizardStep("Purchase Order", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Purchase Order", {
    successMessage: "Purchase Order created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/buying/purchase-order/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "Purchase Order",
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
      toast.error("Add at least one valid item before creating the order.");
      setStep(1);
      return;
    }
    // 2L P0-A: propagate the header `set_warehouse` to every item that
    // lacks a per-row warehouse. Frappe's Purchase Order Item requires
    // `warehouse` per row; the wizard exposes a single header "Receipt
    // Warehouse" (`set_warehouse`). When the user only fills the header,
    // each item is given the header value here.
    const headerWarehouse = values.set_warehouse || "";
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      items: items.map((it) => ({
        ...it,
        warehouse: it.warehouse || headerWarehouse,
        amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
      })),
      conversion_rate: 1,
      plc_conversion_rate: 1,
      currency: "ETB",
      price_list_currency: "ETB",
    });
  }, [createMutation, getValues]);

  const isLoadingSource = loadingMR || loadingSQ;
  const sourceId = materialRequestId ?? supplierQuotationId;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Purchase Order"
        subtitle={
          sourceId
            ? `From ${materialRequestId ? "Material Request" : "Supplier Quotation"} ${sourceId}`
            : "Create a purchase order in three steps"
        }
        backHref="/buying/purchase-order"
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
            submitLabel="Create Purchase Order"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Supplier & Dates ----------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<UserRound className="h-5 w-5 text-primary" />}
                      title="Supplier & Dates"
                      description="Confirm the supplier and set the delivery timeline."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap
                        auto={isAuto("supplier")}
                        loading={isLoadingSource}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.supplier : undefined}
                      >
                        {/* 2L 1A: Quick-Add enabled Supplier */}
                        <QuickAddField
                          control={control}
                          name="supplier"
                          label="Supplier"
                          required
                          doctype="Supplier"
                          labelField="supplier_name"
                          placeholder="Search supplier..."
                          disabled={isAuto("supplier")}
                        />
                      </FieldWrap>
                      <FormDatePicker
                        control={control}
                        name="transaction_date"
                        label="Order Date"
                        required
                      />
                      <FormDatePicker
                        control={control}
                        name="schedule_date"
                        label="Required By"
                        required
                      />
                      <FieldWrap
                        auto={isAuto("set_warehouse")}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.set_warehouse : undefined}
                      >
                        {/* 2L 1A: Quick-Add enabled Warehouse */}
                        <QuickAddField
                          control={control}
                          name="set_warehouse"
                          label="Receipt Warehouse"
                          doctype="Warehouse"
                          placeholder="Default target..."
                          filters={[["is_group", "=", 0]] as unknown as [string, string, unknown][]}
                          disabled={isAuto("set_warehouse")}
                        />
                      </FieldWrap>
                      <FormInput
                        control={control}
                        name="terms"
                        label="Terms & Conditions"
                        placeholder="Optional delivery terms..."
                      />
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Items ---------------------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<Package className="h-5 w-5 text-primary" />}
                        title="Order Items"
                        description="Add items, quantities, and rates."
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
                                  {/* 2L 1A: Quick-Add enabled per-row Item */}
                                  <QuickAddField
                                    control={control}
                                    name={`items.${index}.item_code`}
                                    doctype="Item"
                                    hideLabel
                                    placeholder="Item..."
                                    extraFields={[
                                      "standard_rate",
                                      "stock_uom",
                                      "item_name",
                                      "description",
                                    ]}
                                    onValueChange={(_val, doc) => {
                                      if (doc) {
                                        setValue(
                                          `items.${index}.uom`,
                                          doc.stock_uom || "Nos",
                                        );
                                        setValue(
                                          `items.${index}.item_name`,
                                          doc.item_name || "",
                                        );
                                        // 2L Part 2: rate is auto-filled by ItemRateAutoFill
                                      }
                                    }}
                                  />
                                  {/* 2L Part 2: Auto-rate via Item Price (buying side) */}
                                  <ItemRateAutoFill<POForm>
                                    itemCodePath={`items.${index}.item_code`}
                                    ratePath={`items.${index}.rate`}
                                    priceList={watchedAll?.buying_price_list || ""}
                                    currency={watchedAll?.currency || "ETB"}
                                    side="buying"
                                    setValue={setValue as any}
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

              // ---- STEP 3 — Review --------------------------------------
              const v = getValues();
              return (
                <div className="space-y-5">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review & Confirm"
                    description="Confirm the details below to create the order."
                  />
                  <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <Summary label="Supplier" value={v.supplier_name || v.supplier} />
                      <Summary label="Company" value={v.company} />
                      <Summary label="Order Date" value={v.transaction_date} />
                      <Summary label="Required By" value={v.schedule_date} />
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

function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<POForm>>["control"];
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
