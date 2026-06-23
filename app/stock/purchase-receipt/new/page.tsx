"use client";

// app/stock/purchase-receipt/new/page.tsx
// Obsidian ERP v4.0 — Purchase Receipt Create (V4 SmartForm Wizard)
// Inbound goods from suppliers. Mirrors Delivery Note golden template.
// Flow engine: FlowWizard (Zod step gating) + AUTO_FILL_REGISTRY (PO→PR).
// B7: company injected via getActiveCompany(), never user-entered.

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuickAddField } from "@/components/quick-add/QuickAddField";
import { FieldWrap } from "@/components/form/field-wrap";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { useMakeFrom } from "@/hooks/flows/use-make-from";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import { GuidedErrorDialog, useGuidedError } from "@/components/errors/GuidedErrorDialog";
import { getActiveCompany } from "@/lib/settings/company";
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

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface PRItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
  warehouse?: string;
  purchase_order?: string;
  purchase_order_item?: string;
}

interface PRForm {
  naming_series: string;
  supplier: string;
  supplier_name?: string;
  company: string;
  posting_date: string;
  posting_time?: string;
  set_warehouse?: string;
  supplier_address?: string;
  shipping_address?: string;
  purchase_order?: string;
  currency: string;
  conversion_rate: number;
  items: PRItem[];
}

const EMPTY_ITEM: PRItem = {
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
    label: "Supplier & Date",
    description: "Confirm the supplier and set posting details",
    schema: null,
    fields: ["supplier", "posting_date"],
    icon: "Truck",
  },
  {
    id: "step2",
    label: "Receive Items",
    description: "Review and adjust the items being received",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Review & Create",
    description: "Review everything below, then create the receipt",
    schema: null,
    fields: [],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewPurchaseReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("purchase_order");

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<PRForm>({
    defaultValues: {
      supplier: "",
      company: "",
      posting_date: new Date().toISOString().split("T")[0],
      posting_time: new Date().toTimeString().slice(0, 5),
      currency: "ETB",
      conversion_rate: 1,
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedSupplier = watchedAll?.supplier ?? "";

  // -- Auto-fill from upstream Purchase Order via the registry ----------------
  const { data: purchaseOrder, isLoading: loadingPO } =
    useFrappeDoc<PurchaseOrder>("Purchase Order", purchaseOrderId ?? "", {
      enabled: !!purchaseOrderId,
    });

  // 2R Part 2 — canonical make-from (server mapper). Takes priority over
  // the hand-mapping registry below; the registry remains as a silent
  // fallback for the route-error case.
  const { draft: poDraft } = useMakeFrom({
    sourceDoctype: "Purchase Order",
    sourceName: purchaseOrderId,
    targetDoctype: "Purchase Receipt",
    enabled: !!purchaseOrderId,
  });

  // 2R Part 2 — hydrate from the canonical draft when it arrives.
  // The mapped doc carries the supplier, all item lines with
  // `purchase_order` + `purchase_order_item` back-links, and any
  // pricing-rule applied amounts ERPNext's mapper computed.
  useEffect(() => {
    if (!poDraft) return;
    const d = poDraft.doc as Partial<PRForm> & { items?: PRItem[] };
    reset({
      ...getValues(),
      ...d,
      items: Array.isArray(d.items) && d.items.length > 0 ? d.items : [{ ...EMPTY_ITEM }],
    });
    // 2S Part 2 — bind the header "Link to Purchase Order" field to the
    // incoming ?purchase_order= param. ERPNext's server mapper may not
    // include it on the PR header (the canonical link lives on PR Item),
    // so we set it explicitly to surface the source PO clearly.
    if (purchaseOrderId) {
      setValue("purchase_order", purchaseOrderId);
    }
    const filled = new Set<string>(
      Object.keys(d).filter((k) => k !== "items"),
    );
    filled.add("items");
    if (purchaseOrderId) filled.add("purchase_order");
    setAutoFilledFields(filled);
    toast.success(`Loaded from Purchase Order ${purchaseOrderId}`, {
      description: "Review items and set warehouse to continue.",
    });
  }, [poDraft, purchaseOrderId, reset, getValues, setValue]);

  useEffect(() => {
    // 2R Part 2 — skip the hand-mapping fallback when the canonical draft
    // already hydrated the form.
    if (poDraft) return;
    if (!purchaseOrder) return;
    const mapping = getAutoFillMapping("Purchase Order", "Purchase Receipt");
    if (!mapping) return;

    const header = applyAutoFill(
      purchaseOrder as unknown as Record<string, unknown>,
      mapping,
    );

    const poItems = (purchaseOrder as { items?: Record<string, unknown>[] }).items ?? [];
    const items = applyItemAutoFill(poItems, mapping).map((item, idx) => ({
      ...item,
      purchase_order: purchaseOrderId ?? "",
      purchase_order_item: (poItems[idx] as { name?: string })?.name ?? "",
    })) as unknown as PRItem[];

    reset({
      ...getValues(),
      ...(header as Partial<PRForm>),
      purchase_order: purchaseOrderId ?? "",
      items: items.length ? items : [{ ...EMPTY_ITEM }],
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
      "purchase_order",
    ]);
    setAutoFilledFields(filled);

    toast.success(`Loaded from Purchase Order ${purchaseOrderId}`, {
      description: "Review items and set warehouse to continue.",
    });
  }, [poDraft, purchaseOrder, purchaseOrderId, reset, getValues]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  // -- Live subtotal ----------------------------------------------------------
  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, it) => sum + (Number(it?.qty) || 0) * (Number(it?.rate) || 0),
        0,
      ),
    [watchedItems],
  );

  // -- Per-step validation (gates the wizard's Next button) ------------------
  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = { ...getValues(), ...watchedAll, items: watchedAll?.items ?? [] };
    return {
      step1: validateWizardStep("Purchase Receipt", "step1", values),
      step2: validateWizardStep("Purchase Receipt", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  // -- Persistence ------------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Purchase Receipt", {
    successMessage: "Purchase Receipt created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/stock/purchase-receipt/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Purchase Receipt" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the receipt.");
      setStep(1);
      return;
    }
    createMutation.mutate({
      ...values,
      company: getActiveCompany(),
      items: items.map((it, idx) => ({
        ...it,
        amount: (Number(it.qty) || 0) * (Number(it.rate) || 0),
        idx: idx + 1,
        warehouse: it.warehouse,
        doctype: "Purchase Receipt Item",
      })),
      docstatus: 0,
      status: "Draft",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Purchase Receipt"
        subtitle={
          purchaseOrderId
            ? `From Purchase Order ${purchaseOrderId}`
            : "Record incoming goods in three steps"
        }
        backHref="/stock/purchase-receipt"
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
            submitLabel="Create Purchase Receipt"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Supplier & Date --------------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<Truck className="h-5 w-5 text-primary" />}
                      title="Supplier & Date"
                      description="Confirm who is delivering goods and when they arrived."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap
                        auto={isAuto("supplier")}
                        loading={loadingPO}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.supplier : undefined}
                      >
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
                        name="posting_date"
                        label="Posting Date"
                        required
                      />
                      <FormInput
                        control={control}
                        name="posting_time"
                        label="Posting Time"
                        placeholder="HH:MM"
                      />
                      <FieldWrap
                        auto={isAuto("purchase_order")}
                      >
                        <FormFrappeSelect
                          control={control}
                          name="purchase_order"
                          label="Purchase Order"
                          doctype="Purchase Order"
                          labelField="name"
                          disabled={isAuto("purchase_order")}
                          placeholder="Link to PO..."
                        />
                      </FieldWrap>
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Items ------------------------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<Package className="h-5 w-5 text-primary" />}
                        title="Receive Items"
                        description="Set quantities and target warehouses for incoming goods."
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
                            <th className="px-3 py-2.5 text-left font-semibold">Warehouse</th>
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
                                <td className="px-3 py-2 align-top">
                                  <FieldWrap
                                    error={triedNextSteps.has(step) ? validationResults?.step2?.errors?.[`items.${index}.warehouse`] : undefined}
                                  >
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

              // ---- STEP 3 — Review & Create --------------------------------
              const v = getValues();
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
                    title="Review & Create"
                    description="Review everything below — you can still go back to edit."
                  />

                  {/* Header summary */}
                  <div className="bg-card/40 rounded-2xl p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Summary label="Supplier" value={v.supplier_name || v.supplier} />
                      <Summary label="Company" value={v.company || getActiveCompany()} />
                      <Summary label="Posting Date" value={v.posting_date} />
                      <Summary label="Purchase Order" value={v.purchase_order} />
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="bg-card/40 rounded-2xl overflow-hidden">
                    <div className="px-6 py-3 bg-muted/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Items ({(watchedItems ?? []).filter(i => i?.item_code).length})
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="border-b border-border/40">
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-6 py-2.5 text-left font-semibold">Item</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Qty</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Rate</th>
                          <th className="px-6 py-2.5 text-right font-semibold">Amount</th>
                          <th className="px-6 py-2.5 text-left font-semibold">Warehouse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {(watchedItems ?? []).filter(i => i?.item_code).map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-3 font-medium">{item.item_name || item.item_code}</td>
                            <td className="px-6 py-3 text-right tabular-nums">{item.qty} {item.uom}</td>
                            <td className="px-6 py-3 text-right tabular-nums">{ETB.format(item.rate ?? 0)}</td>
                            <td className="px-6 py-3 text-right font-medium tabular-nums">{ETB.format((item.qty || 0) * (item.rate || 0))}</td>
                            <td className="px-6 py-3 text-muted-foreground">{item.warehouse || v.set_warehouse || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/20">
                          <td colSpan={4} className="px-6 py-3 text-right font-bold uppercase text-xs">Grand Total</td>
                          <td className="px-6 py-3 text-right font-bold text-lg text-primary tabular-nums">{ETB.format(subtotal)}</td>
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

function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<PRForm>>["control"];
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
