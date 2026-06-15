// 2N Part 4.1: removed @ts-nocheck.
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  ClipboardList,
  Package,
  Calendar,
  Factory,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeUpdate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import {
  FormInput,
  FormFrappeSelect,
  FormSwitch,
  FormTextarea,
} from "@/components/form";
import {
  WorkOrderUpdateSchema,
  type WorkOrderFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkOrder, Bom, Uom } from "@/types/doctype-types";

function EditWorkOrderForm() {
  const router = useRouter();
  const { name } = useParams();
  const woName = decodeURIComponent(name as string);

  const { data: wo, isLoading } = useFrappeDoc<WorkOrder>("Work Order", woName);

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(WorkOrderUpdateSchema),
    defaultValues: {
      naming_series: "MFG-WO-.YYYY.-",
      production_item: "",
      bom_no: "",
      qty: 1,
      fg_warehouse: "",
      planned_start_date: "",
      sales_order: "",
      project: "",
      source_warehouse: "",
      wip_warehouse: "",
      scrap_warehouse: "",
      use_multi_level_bom: 0,
      skip_transfer: 0,
    },
  });

  useEffect(() => {
    if (wo) {
      if (wo.docstatus !== 0) {
        toast.error("Only draft Work Orders can be edited");
        router.push(`/manufacturing/work-order/${encodeURIComponent(woName)}`);
        return;
      }
      form.reset({
        naming_series: wo.naming_series,
        production_item: wo.production_item,
        bom_no: wo.bom_no,
        company: wo.company,
        qty: wo.qty,
        fg_warehouse: wo.fg_warehouse,
        planned_start_date: wo.planned_start_date
          ? new Date(wo.planned_start_date).toISOString().slice(0, 16)
          : "",
        planned_end_date: wo.planned_end_date
          ? new Date(wo.planned_end_date).toISOString().slice(0, 16)
          : "",
        expected_delivery_date: wo.expected_delivery_date,
        sales_order: wo.sales_order,
        project: wo.project,
        source_warehouse: wo.source_warehouse,
        wip_warehouse: wo.wip_warehouse,
        scrap_warehouse: wo.scrap_warehouse,
        material_request: wo.material_request,
        use_multi_level_bom: wo.use_multi_level_bom,
        skip_transfer: wo.skip_transfer,
      });
    }
  }, [wo, form, woName, router]);

  const selectedItem = form.watch("production_item");
  const selectedBom = form.watch("bom_no");
  const workOrderQty = form.watch("qty");

  // Fetch UOMs for whole number validation
  const { data: uoms } = useFrappeList<Uom>("UOM", {
    fields: ["name", "must_be_whole_number"],
    limit: 1000,
  });

  const uomMap = useMemo(() => {
    const map = new Map<string, number>();
    uoms?.forEach((u) => map.set(u.name, u.must_be_whole_number || 0));
    return map;
  }, [uoms]);

  const { data: bomDetails } = useFrappeDoc<Bom>("BOM", selectedBom || "", {
    enabled: !!selectedBom,
  });

  const updateMutation = useFrappeUpdate("Work Order", {
    onSuccess: () => {
      toast.success("Work Order updated Successfully");
      router.push(`/manufacturing/work-order/${encodeURIComponent(woName)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: WorkOrderFormData) => {
    if (!bomDetails) {
      toast.error("BOM details not loaded yet.");
      return;
    }

    if (!uoms && !uomMap.size) {
      toast.error(
        "UOM validation data is still loading. Please try again in a moment.",
      );
      return;
    }

    const ratio = (data.qty ?? 0) / (bomDetails.quantity || 1);

    // Discrete UOM keywords that almost always require whole numbers in ERP
    const DISCRETE_UOMS = [
      "Nos",
      "Set",
      "Unit",
      "Pcs",
      "Each",
      "Box",
      "Packet",
    ];

    // UOM Validation for parent qty
    const itemUomMustBeInteger = bomDetails.uom ? uomMap.get(bomDetails.uom) : undefined;
    if (itemUomMustBeInteger === 1 && !Number.isInteger(data.qty)) {
      toast.error(
        `Quantity for item ${data.production_item} must be a whole number for UOM ${bomDetails.uom}`,
      );
      return;
    }

    // Format required_items from BOM with UOM validation
    // 2N Part 4.1: typed-cast the `unknown` child rows (Bom.items is
    // `unknown[]` in the generated interface; runtime shape is documented
    // by the Frappe doctype).
    interface BomItemRow {
      item_code: string;
      item_name?: string;
      uom?: string;
      qty: number;
      source_warehouse?: string;
    }
    const required_items: unknown[] = [];
    for (const item of (bomDetails.items ?? []) as BomItemRow[]) {
      let reqQty = (item.qty ?? 0) * ratio;
      const mustBeInt = item.uom ? uomMap.get(item.uom) : undefined;

      // Heuristic: If we know it must be int OR it's a known discrete UOM, round it
      const isDiscrete = DISCRETE_UOMS.some((u) =>
        item.uom?.toLowerCase().includes(u.toLowerCase()),
      );

      if ((mustBeInt === 1 || isDiscrete) && !Number.isInteger(reqQty)) {
        // Use a small epsilon to avoid floating point issues (e.g. 30.000000004 should be 30)
        if (Math.abs(reqQty - Math.round(reqQty)) < 0.0001) {
          reqQty = Math.round(reqQty);
        } else {
          // Round up to nearest integer to satisfy Frappe's UOMMustBeIntegerError
          reqQty = Math.ceil(reqQty);
        }
      }

      required_items.push({
        item_code: item.item_code,
        item_name: item.item_name,
        source_warehouse: data.source_warehouse || item.source_warehouse,
        required_qty: reqQty,
        doctype: "Work Order Item",
      });
    }

    const payload = {
      ...data,
      required_items,
      operations:
        bomDetails?.operations?.map((op: any) => ({
          operation: op.operation,
          workstation: op.workstation,
          time_in_mins: op.time_in_mins,
          planned_operating_cost: op.operating_cost * ratio,
          doctype: "Work Order Operation",
        })) || [],
      planned_operating_cost: (bomDetails.operating_cost || 0) * ratio,
    };
    updateMutation.mutate({ name: woName, data: payload });
  };

  if (isLoading) return <LoadingState type="detail" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product & BOM */}
            <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Product & Recipe
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Verify the item and Bill of Materials
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="production_item"
                  label="Item to Manufacture"
                  doctype="Item"
                  required
                  placeholder="Select product..."
                  filters={[["is_stock_item", "=", 1]]}
                />
                <FormFrappeSelect
                  control={form.control}
                  name="bom_no"
                  label="Bill of Materials"
                  doctype="BOM"
                  required
                  placeholder={
                    selectedItem ? "Select BOM..." : "Select item first"
                  }
                  filters={
                    selectedItem
                      ? [
                          ["item", "=", selectedItem],
                          ["is_active", "=", 1],
                        ]
                      : []
                  }
                  disabled={!selectedItem}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                <FormInput
                  control={form.control}
                  name="qty"
                  label="Quantity to Produce"
                  type="number"
                  required
                />
              </div>
            </div>

            {/* Source & Scheduling */}
            <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Timeline & Source
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Update production dates and links
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="sales_order"
                  label="Sales Order (Optional)"
                  doctype="Sales Order"
                  placeholder="Link to SO..."
                />
                <FormFrappeSelect
                  control={form.control}
                  name="project"
                  label="Project (Optional)"
                  doctype="Project"
                  placeholder="Link to project..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <FormInput
                  control={form.control}
                  name="planned_start_date"
                  label="Planned Start"
                  type="datetime-local"
                  required
                />
                <FormInput
                  control={form.control}
                  name="planned_end_date"
                  label="Planned End"
                  type="datetime-local"
                />
                <FormInput
                  control={form.control}
                  name="expected_delivery_date"
                  label="Expected Delivery"
                  type="date"
                />
              </div>
            </div>

            {/* Warehouses */}
            <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Factory className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Logistics Update
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Modify warehouse assignments
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="source_warehouse"
                  label="Source (Raw Materials)"
                  doctype="Warehouse"
                  placeholder="e.g., Raw Material Store"
                  filters={[["is_group", "=", 0]]}
                />
                <FormFrappeSelect
                  control={form.control}
                  name="wip_warehouse"
                  label="WIP (Work-in-Progress)"
                  doctype="Warehouse"
                  placeholder="e.g., Production Floor"
                  filters={[["is_group", "=", 0]]}
                />
                <FormFrappeSelect
                  control={form.control}
                  name="fg_warehouse"
                  label="Target (Finished Goods)"
                  doctype="Warehouse"
                  required
                  placeholder="e.g., Finished Goods"
                  filters={[["is_group", "=", 0]]}
                />
                <FormFrappeSelect
                  control={form.control}
                  name="scrap_warehouse"
                  label="Scrap Warehouse"
                  doctype="Warehouse"
                  placeholder="e.g., Scrap Store"
                  filters={[["is_group", "=", 0]]}
                />
              </div>
              <div className="pt-2">
                <FormSwitch
                  control={form.control}
                  name="skip_transfer"
                  label="Skip Material Transfer to WIP"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-xl shadow-primary/5 sticky top-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Updated Metrics
              </h3>

              {bomDetails ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                      Recipe Info
                    </p>
                    <p className="font-bold text-sm truncate">
                      {bomDetails.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Batch size: {bomDetails.quantity} {bomDetails.uom}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline pt-4 border-t border-border/50">
                      <span className="text-muted-foreground text-sm font-medium">
                        New Total (Est)
                      </span>
                      <span className="font-black text-xl text-primary">
                        ETB{" "}
                          {(
                            (bomDetails.total_cost || 0) *
                            ((workOrderQty ?? 0) / (bomDetails.quantity || 1))
                          ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground font-bold tracking-tight">
                      Calculation updated based on new quantity
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="w-full mt-6 rounded-xl h-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all uppercase tracking-widest text-[11px]"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="py-10 text-center opacity-40">
                  <p className="text-xs font-bold">
                    Refining production estimates...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function EditWorkOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Work Order"
        subtitle="Modify production job details"
        backHref="/manufacturing/work-order"
      />
      <Suspense fallback={<LoadingState />}>
        <EditWorkOrderForm />
      </Suspense>
    </div>
  );
}
