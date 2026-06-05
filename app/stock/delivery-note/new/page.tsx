"use client";

// app/stock/delivery-note/new/page.tsx
// Obsidian ERP v4.0 — Delivery Note Create (V4 SmartForm Wizard)
// Follows the Sales Order golden template exactly.
// Flow engine: FlowWizard (Zod step gating) + AUTO_FILL_REGISTRY (Sales Order→Delivery Note).
// Premium UI: OKLCH semantic tokens only, glassmorphism, Framer Motion via FlowWizard.

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
  Truck,
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
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
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
import type { SalesOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { FieldWrap } from "@/components/form/field-wrap";

// ---------------------------------------------------------------------------
// Form model — concrete item shape so the field array is fully typed
// (avoids the z.array(z.unknown()) inference pain; the factory route's Zod
// schema remains the authoritative server-side gate).
// ---------------------------------------------------------------------------
interface DNItem {
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount?: number;
  uom?: string;
  warehouse?: string;
  against_sales_order?: string;
  so_detail?: string;
}

interface DNForm {
  naming_series: string;
  customer: string;
  customer_name?: string;
  company: string;
  posting_date: string;
  posting_time?: string;
  set_warehouse?: string;
  shipping_address_name?: string;
  dispatch_address_name?: string;
  customer_address?: string;
  po_no?: string;
  project?: string;
  transporter?: string;
  driver?: string;
  vehicle_no?: string;
  lr_no?: string;
  lr_date?: string;
  print_without_amount: number;
  currency: string;
  conversion_rate: number;
  selling_price_list?: string;
  items: DNItem[];
}

const EMPTY_ITEM: DNItem = {
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
    label: "Customer & Shipping",
    description: "Confirm the customer and set delivery details",
    schema: null,
    fields: ["customer", "company", "posting_date", "shipping_address_name", "po_no"],
    icon: "UserRound",
  },
  {
    id: "step2",
    label: "Delivery Items",
    description: "Review and adjust the items for this delivery",
    schema: null,
    fields: ["items"],
    icon: "Package",
  },
  {
    id: "step3",
    label: "Logistics & Review",
    description: "Set transporter details and review before creating",
    schema: null,
    fields: ["transporter", "driver", "vehicle_no", "lr_no"],
    icon: "ClipboardCheck",
  },
];

const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
});

export default function NewDeliveryNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salesOrderId = searchParams.get("sales_order");

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set(),
  );
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<DNForm>({
    defaultValues: {
      naming_series: "MAT-DN-.YYYY.-",
      customer: "",
      company: "",
      posting_date: new Date().toISOString().split("T")[0],
      posting_time: new Date().toTimeString().slice(0, 5),
      print_without_amount: 0,
      currency: "ETB",
      conversion_rate: 1,
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { control, getValues, reset, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAll = useWatch({ control });
  const watchedItems = watchedAll?.items ?? [];
  const watchedCustomer = watchedAll?.customer ?? "";

  // -- Auto-fill from upstream Sales Order via the registry ------------------
  const { data: salesOrder, isLoading: loadingSO } =
    useFrappeDoc<SalesOrder>("Sales Order", salesOrderId ?? "", {
      enabled: !!salesOrderId,
    });

  useEffect(() => {
    if (!salesOrder) return;
    const mapping = getAutoFillMapping("Sales Order", "Delivery Note");
    if (!mapping) return;

    const header = applyAutoFill(
      salesOrder as unknown as Record<string, unknown>,
      mapping,
    );

    // Map SO items to DN items, computing pending qty (qty - delivered_qty)
    const soItems = (salesOrder as { items?: Record<string, unknown>[] }).items ?? [];
    const pendingItems = soItems
      .map((item) => {
        const totalQty = Number(item.qty) || 0;
        const delivered = Number(item.delivered_qty) || 0;
        const pending = totalQty - delivered;
        return pending > 0 ? { ...item, qty: pending } : null;
      })
      .filter(Boolean) as Record<string, unknown>[];

    const items = applyItemAutoFill(
      pendingItems,
      mapping,
    ).map((item, idx) => ({
      ...item,
      against_sales_order: salesOrderId ?? "",
      so_detail: (pendingItems[idx] as { name?: string })?.name ?? "",
    })) as unknown as DNItem[];

    reset({
      ...getValues(),
      ...(header as Partial<DNForm>),
      items: items.length ? items : [{ ...EMPTY_ITEM }],
    });

    const filled = new Set<string>([
      ...mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
      "items",
    ]);
    setAutoFilledFields(filled);

    if (items.length === 0) {
      toast.info("All items from this Sales Order have been delivered");
    } else {
      toast.success(`Loaded from Sales Order ${salesOrderId}`, {
        description: "Review items and set logistics to continue.",
      });
    }
  }, [salesOrder, salesOrderId, reset, getValues]);

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
      step1: validateWizardStep("Delivery Note", "step1", values),
      step2: validateWizardStep("Delivery Note", "step2", values),
      step3: { valid: true, errors: {} },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  // -- Persistence ------------------------------------------------------------
  const { resolution, showError, dismiss } = useGuidedError();
  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Delivery Note", {
    successMessage: "Delivery Note created",
    onSuccess: (res) => {
      const name = res?.data?.name;
      if (name) {
        router.push(`/stock/delivery-note/${encodeURIComponent(name)}`);
      }
    },
    onError: (err) => showError(resolveFrappeError(err, { doctype: "Delivery Note" })),
  });

  const handleSubmit = useCallback(() => {
    const values = getValues();
    const items = (values.items ?? []).filter(
      (it) => it.item_code && Number(it.qty) > 0,
    );
    if (items.length === 0) {
      toast.error("Add at least one valid item before creating the delivery note.");
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
        warehouse: it.warehouse || values.set_warehouse,
        doctype: "Delivery Note Item",
      })),
      docstatus: 0,
      status: "Draft",
    });
  }, [createMutation, getValues]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Delivery Note"
        subtitle={
          salesOrderId
            ? `From Sales Order ${salesOrderId}`
            : "Create a delivery note in three steps"
        }
        backHref="/stock/delivery-note"
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
            submitLabel="Create Delivery Note"
            submittingLabel="Creating..."
            renderStep={(s) => {
              // ---- STEP 1 — Customer & Shipping ----------------------------
              if (s.id === "step1") {
                return (
                  <div className="space-y-6">
                    <StepHeading
                      icon={<UserRound className="h-5 w-5 text-primary" />}
                      title="Customer & Shipping"
                      description="Confirm who this delivery is for and where it's going."
                    />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FieldWrap
                        auto={isAuto("customer")}
                        loading={loadingSO}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.customer : undefined}
                      >
                        <FormFrappeSelect
                          control={control}
                          name="customer"
                          label="Customer"
                          required
                          doctype="Customer"
                          labelField="customer_name"
                          placeholder="Search customer..."
                          disabled={isAuto("customer")}
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
                        auto={isAuto("shipping_address_name")}
                        error={triedNextSteps.has(step) ? validationResults?.step1?.errors?.shipping_address_name : undefined}
                      >
                        <FormFrappeSelect
                          control={control}
                          name="shipping_address_name"
                          label="Shipping Address"
                          doctype="Address"
                          labelField="address_title"
                          disabled={
                            isAuto("shipping_address_name") || !watchedCustomer
                          }
                          filters={
                            watchedCustomer
                              ? ([
                                  ["Dynamic Link", "link_name", "=", watchedCustomer],
                                ] as unknown as [string, string, unknown][])
                              : []
                          }
                          placeholder={
                            watchedCustomer
                              ? "Select address..."
                              : "Select a customer first"
                          }
                        />
                      </FieldWrap>
                      <FormInput
                        control={control}
                        name="po_no"
                        label="Customer PO No"
                        placeholder="Optional reference"
                      />
                    </div>
                  </div>
                );
              }

              // ---- STEP 2 — Items -----------------------------------------
              if (s.id === "step2") {
                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <StepHeading
                        icon={<Package className="h-5 w-5 text-primary" />}
                        title="Delivery Items"
                        description="Adjust quantities and warehouses as needed."
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
                                  <FormFrappeSelect
                                    control={control}
                                    name={`items.${index}.warehouse`}
                                    doctype="Warehouse"
                                    hideLabel
                                    placeholder="WH..."
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

              // ---- STEP 3 — Logistics & Review -----------------------------
              const v = getValues();
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<Truck className="h-5 w-5 text-primary" />}
                    title="Logistics & Review"
                    description="Review everything below, then create — you can still go back to edit."
                  />

                  {/* Logistics fields */}
                  <div className="bg-card/40 rounded-2xl p-6 space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logistics</p>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <FormFrappeSelect
                        control={control}
                        name="transporter"
                        label="Transporter"
                        doctype="Supplier"
                        placeholder="e.g., In-House, DHL..."
                        filters={[["is_transporter", "=", 1]]}
                      />
                      <FormFrappeSelect
                        control={control}
                        name="driver"
                        label="Driver"
                        doctype="Driver"
                        placeholder="Select driver..."
                      />
                      <FormInput
                        control={control}
                        name="vehicle_no"
                        label="Vehicle Number"
                        placeholder="License plate"
                      />
                      <FormInput
                        control={control}
                        name="lr_no"
                        label="Gate Pass / LR No"
                        placeholder="Receipt number"
                      />
                      <FormDatePicker
                        control={control}
                        name="lr_date"
                        label="LR Date"
                      />
                      <FormFrappeSelect
                        control={control}
                        name="set_warehouse"
                        label="Default Warehouse"
                        doctype="Warehouse"
                        placeholder="Source warehouse..."
                        filters={[["is_group", "=", 0]]}
                      />
                    </div>
                  </div>

                  {/* Header summary */}
                  <div className="bg-card/40 rounded-2xl p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Summary label="Customer" value={v.customer_name || v.customer} />
                      <Summary label="Company" value={v.company} />
                      <Summary label="Posting Date" value={v.posting_date} />
                      <Summary label="Shipping Address" value={v.shipping_address_name} />
                      <Summary label="Customer PO No" value={v.po_no} />
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

// Typed numeric cell for the items table (no @ts-nocheck needed).
function NumberCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<DNForm>>["control"];
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
