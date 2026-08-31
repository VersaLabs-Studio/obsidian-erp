"use client";

// app/manufacturing/work-order/new/page.tsx
// Work Order Create — 2-step FlowWizard, Zod gating, AUTO_FILL from Sales Order.
// Step 1: What to Produce (production_item, bom_no, qty, sales_order)
// Step 2: Warehouses (fg_warehouse, wip_warehouse, source_warehouse, planned_start_date)

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  Package,
  Factory,
  ClipboardCheck,
  Lock,
} from "lucide-react";

import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  GuidedErrorDialog,
  useGuidedError,
} from "@/components/errors/GuidedErrorDialog";
import { resolveFrappeError } from "@/lib/errors/frappe-error-resolver";
import {
  FormInput,
  FormFrappeSelect,
  FormDatePicker,
} from "@/components/form";
import { QuickAddField } from "@/components/quick-add/QuickAddField";
import { Form } from "@/components/ui/form";
import { FlowWizard } from "@/components/flows/FlowWizard";
import { useFrappeCreate, useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import {
  getAutoFillMapping,
  applyAutoFill,
} from "@/lib/flows/flow-auto-fill";
import { validateWizardStep } from "@/lib/flows/flow-validation";
import type { StepValidationResult } from "@/lib/flows/flow-validation";
import { getActiveCompany } from "@/lib/settings/company";
import { resolvePrefillWarehouses } from "@/lib/stock/warehouse-defaults";
import type { WizardStep } from "@/types/flow-types";
import type { SalesOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form model
// ---------------------------------------------------------------------------
interface WOForm {
  naming_series: string;
  production_item: string;
  item_name?: string;
  bom_no: string;
  company: string;
  qty: number;
  sales_order: string;
  expected_delivery_date: string;
  fg_warehouse: string;
  wip_warehouse: string;
  source_warehouse: string;
  scrap_warehouse: string;
  planned_start_date: string;
  project: string;
  use_multi_level_bom: number;
  skip_transfer: number;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "step1",
    label: "What to Produce",
    description: "Select the item, BOM, and quantity",
    schema: null,
    fields: ["production_item", "bom_no", "qty", "sales_order", "expected_delivery_date"],
    icon: "Package",
  },
  {
    id: "step2",
    label: "Warehouses & Schedule",
    description: "Set warehouses and production timeline",
    schema: null,
    fields: ["fg_warehouse", "wip_warehouse", "source_warehouse", "planned_start_date"],
    icon: "Factory",
  },
];

function CreateWorkOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const salesOrderId = searchParams.get("sales_order");
  const preBom = searchParams.get("bom");
  const preItem = searchParams.get("item");
  const preQty = searchParams.get("qty");

  const [step, setStep] = useState(0);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());

  const form = useForm<WOForm>({
    defaultValues: {
      naming_series: "MFG-WO-.YYYY.-",
      production_item: preItem || "",
      bom_no: preBom || "",
      qty: preQty ? parseFloat(preQty) : 1,
      sales_order: salesOrderId || "",
      expected_delivery_date: "",
      // 2X P0-A — default to saved warehouse settings (source of truth),
      // with canonical fallback. Replaces the old resolveCompanyWarehouses()
      // call that diverged from user settings (e.g. saved fg=Stores vs
      // canonical fg=Finished Goods).
      fg_warehouse: "",
      wip_warehouse: "",
      source_warehouse: "",
      scrap_warehouse: "",
      planned_start_date: new Date().toISOString().split("T")[0],
      project: "",
      use_multi_level_bom: 0,
      skip_transfer: 0,
    },
  });

  const { control, getValues, reset, setValue } = form;

  const watchedAll = useWatch({ control });
  const selectedItem = watchedAll?.production_item;

  // 2X P0-A — Resolve warehouse defaults from saved settings first,
  // with canonical names as per-field fallback. Replaces the old
  // resolveCompanyWarehouses() effect that diverged from user settings.
  useEffect(() => {
    resolvePrefillWarehouses().then((wh) => {
      if (!getValues("fg_warehouse")) setValue("fg_warehouse", wh.fg);
      if (!getValues("wip_warehouse")) setValue("wip_warehouse", wh.wip);
      if (!getValues("source_warehouse")) setValue("source_warehouse", wh.source);
      if (!getValues("scrap_warehouse")) setValue("scrap_warehouse", wh.scrap);
    });
  }, [getValues, setValue]);

  // -- Auto-fill from Sales Order --------------------------------------------
  const { data: salesOrder, isLoading: loadingSO } = useFrappeDoc<SalesOrder>(
    "Sales Order",
    salesOrderId ?? "",
    { enabled: !!salesOrderId },
  );

  useEffect(() => {
    if (!salesOrder) return;

    const mapping = getAutoFillMapping("Sales Order", "Work Order");
    if (!mapping) return;

    const header = applyAutoFill(
      salesOrder as unknown as Record<string, unknown>,
      mapping,
    );

    reset({
      ...getValues(),
      ...(header as Partial<WOForm>),
    });

    const filled = new Set<string>(
      mapping.headerMappings
        .filter((m) => m.isReadOnly)
        .map((m) => m.targetField),
    );
    setAutoFilledFields(filled);

    toast.success(`Loaded from Sales Order ${salesOrderId}`, {
      description: "Set the BOM and warehouses to continue.",
    });
  }, [salesOrder, salesOrderId, reset, getValues]);

  // -- Fetch BOMs for selected item ------------------------------------------
  const { data: boms } = useFrappeDoc<{ name: string }[]>(
    "BOM",
    "",
    { enabled: false },
  );

  // Auto-select default BOM when item changes
  useEffect(() => {
    if (selectedItem && !getValues("bom_no")) {
      // The FormFrappeSelect for BOM will filter by item
    }
  }, [selectedItem, getValues]);

  const isAuto = useCallback(
    (field: string) => autoFilledFields.has(field),
    [autoFilledFields],
  );

  const validationResults = useMemo<Record<string, StepValidationResult>>(() => {
    const values = {
      ...getValues(),
      ...watchedAll,
    };
    return {
      step1: validateWizardStep("Work Order", "step1", values),
      step2: validateWizardStep("Work Order", "step2", values),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAll]);

  const { resolution, showError, dismiss } = useGuidedError();

  const createMutation = useFrappeCreate<
    { data: { name: string } },
    Record<string, unknown>
  >("Work Order", {
    // 4.1 B2 — no successMessage/onSuccess-nav here: creation is now the first
    // half of a create→submit sequence handled in handleSubmit, so the toast
    // and navigation happen after the submit resolves.
    onError: (err) => {
      const r = resolveFrappeError(err, {
        doctype: "Work Order",
        values: getValues(),
      });
      showError(r);
    },
  });

  // 4.1 B2 — WOs are born submitted on the standalone create path too (the SO
  // cockpit already does this). The BOM, warehouses and qty are fully resolved
  // by the time the operator clicks Create, so the extra "open detail → Submit"
  // hop is pure ceremony. If the submit fails the WO survives as a draft the
  // detail page's Submit button still covers.
  const submitMutation = useFrappeUpdate<{ name: string }>("Work Order", {
    showToast: false,
  });

  const handleSubmit = useCallback(async () => {
    const values = getValues();
    if (!values.production_item) {
      toast.error("Select an item to manufacture.");
      setStep(0);
      return;
    }
    if (!values.bom_no) {
      toast.error("Select a BOM.");
      setStep(0);
      return;
    }
    if (!values.fg_warehouse) {
      toast.error("Set a target warehouse.");
      setStep(1);
      return;
    }
    let woName: string | undefined;
    try {
      const res = await createMutation.mutateAsync({
        ...values,
        company: getActiveCompany(),
        docstatus: 0,
        status: "Draft",
      });
      woName = res?.data?.name;
    } catch {
      // createMutation.onError already surfaced the guided dialog.
      return;
    }
    if (!woName) return;

    try {
      await submitMutation.mutateAsync({
        name: woName,
        data: { docstatus: 1, status: "Not Started" },
      });
      toast.success(`Work Order ${woName} created and submitted`, {
        description: "Ready to start production.",
      });
    } catch {
      toast.warning(`Work Order ${woName} created as a draft`, {
        description: "Submit it from its page when ready.",
      });
    }
    router.push(`/manufacturing/work-order/${encodeURIComponent(woName)}`);
  }, [createMutation, submitMutation, getValues, router]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New Work Order"
        subtitle={
          salesOrderId
            ? `From Sales Order ${salesOrderId}`
            : "Start a new production job"
        }
        backHref="/manufacturing/work-order"
      />

      <Form {...form}>
        <FlowWizard
          steps={WIZARD_STEPS}
          formData={watchedAll as unknown as Record<string, unknown>}
          validationResults={validationResults}
          isSubmitting={createMutation.isPending || submitMutation.isPending}
          onFormDataChange={() => {}}
          onStepChange={setStep}
          onTriedNextChange={setTriedNextSteps}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          submitLabel="Create Work Order"
          submittingLabel="Creating..."
          renderStep={(s) => {
            // ---- STEP 1 — What to Produce ----------------------------------
            if (s.id === "step1") {
              return (
                <div className="space-y-6">
                  <StepHeading
                    icon={<Package className="h-5 w-5 text-primary" />}
                    title="What to Produce"
                    description="Select the item, BOM, and quantity to manufacture."
                  />
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <QuickAddField
                      control={control}
                      name="production_item"
                      label="Item to Manufacture"
                      required
                      doctype="Item"
                      placeholder="Search item..."
                      extraFields={["item_name", "stock_uom", "description"]}
                      onValueChange={(_val, doc) => {
                        if (doc) {
                          setValue("item_name", doc.item_name || "");
                        }
                      }}
                      disabled={isAuto("production_item")}
                    />
                    <FormFrappeSelect
                      control={control}
                      name="bom_no"
                      label="Bill of Materials"
                      required
                      doctype="BOM"
                      placeholder={selectedItem ? "Select BOM..." : "Select item first"}
                      filters={
                        selectedItem
                          ? [
                              ["item", "=", selectedItem],
                              ["is_active", "=", 1],
                            ]
                          : []
                      }
                      disabled={!selectedItem || isAuto("bom_no")}
                    />
                    <FormInput
                      control={control}
                      name="qty"
                      label="Quantity to Produce"
                      type="number"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 pt-2">
                    <FormFrappeSelect
                      control={control}
                      name="sales_order"
                      label="Sales Order (Optional)"
                      doctype="Sales Order"
                      placeholder="Link to SO..."
                      disabled={isAuto("sales_order")}
                    />
                    <FormInput
                      control={control}
                      name="expected_delivery_date"
                      label="Expected Delivery"
                      type="date"
                    />
                  </div>
                </div>
              );
            }

            // ---- STEP 2 — Warehouses & Schedule ----------------------------
            return (
              <div className="space-y-6">
                <StepHeading
                  icon={<Factory className="h-5 w-5 text-primary" />}
                  title="Warehouses & Schedule"
                  description="Set warehouses and production timeline."
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <QuickAddField
                    control={control}
                    name="source_warehouse"
                    label="Source Warehouse (Raw Materials)"
                    doctype="Warehouse"
                    placeholder="e.g., Raw Material Store"
                    filters={[["is_group", "=", 0]]}
                    disabled={isAuto("source_warehouse")}
                  />
                  <QuickAddField
                    control={control}
                    name="wip_warehouse"
                    label="WIP Warehouse"
                    doctype="Warehouse"
                    placeholder="e.g., Production Floor"
                    filters={[["is_group", "=", 0]]}
                    disabled={isAuto("wip_warehouse")}
                  />
                  <QuickAddField
                    control={control}
                    name="fg_warehouse"
                    label="Target Warehouse (Finished Goods)"
                    required
                    doctype="Warehouse"
                    placeholder="e.g., Finished Goods"
                    filters={[["is_group", "=", 0]]}
                    disabled={isAuto("fg_warehouse")}
                  />
                  <FormFrappeSelect
                    control={control}
                    name="scrap_warehouse"
                    label="Scrap Warehouse"
                    doctype="Warehouse"
                    placeholder="e.g., Scrap Store"
                    filters={[["is_group", "=", 0]]}
                    disabled={isAuto("scrap_warehouse")}
                  />
                  <FormDatePicker
                    control={control}
                    name="planned_start_date"
                    label="Planned Start Date"
                    required
                  />
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

export default function NewWorkOrderPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CreateWorkOrderForm />
    </Suspense>
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
