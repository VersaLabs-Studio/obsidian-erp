// @ts-nocheck
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { useFrappeCreate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import {
  FormInput,
  FormFrappeSelect,
  FormSwitch,
  FormTextarea,
} from "@/components/form";
import {
  WorkOrderCreateSchema,
  type WorkOrderFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Bom, SalesOrder, Item } from "@/types/doctype-types";

function CreateWorkOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params for pre-population
  const preItem = searchParams.get("item");
  const preBom = searchParams.get("bom");
  const preSalesOrder = searchParams.get("sales_order");
  const preQty = searchParams.get("qty");

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(WorkOrderCreateSchema),
    defaultValues: {
      naming_series: "MFG-WO-.YYYY.-",
      production_item: preItem || "",
      bom_no: preBom || "",
      company: "",
      qty: preQty ? parseFloat(preQty) : 1,
      fg_warehouse: "",
      planned_start_date: new Date().toISOString().slice(0, 16),
      sales_order: preSalesOrder || "",
      project: "",
      source_warehouse: "",
      wip_warehouse: "",
      scrap_warehouse: "",
      use_multi_level_bom: 0,
      skip_transfer: 0,
    },
  });

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

  // Fetch BOMs for selected item
  const { data: boms } = useFrappeList<Bom>("BOM", {
    fields: ["name", "item", "item_name", "is_default", "is_active"],
    filters: selectedItem
      ? [
          ["item", "=", selectedItem],
          ["is_active", "=", 1],
        ]
      : [],
    limit: 50,
  });

  // Auto-select default BOM
  useEffect(() => {
    if (boms && boms.length > 0 && !selectedBom) {
      const defaultBom = boms.find((b) => b.is_default === 1) || boms[0];
      form.setValue("bom_no", defaultBom.name);
    }
  }, [boms, selectedBom, form]);

  // Fetch BOM details for material preview
  const { data: bomDetails } = useFrappeDoc<Bom>("BOM", selectedBom || "", {
    enabled: !!selectedBom,
  });

  // Pre-fill from Sales Order
  const { data: salesOrderDetails } = useFrappeDoc<SalesOrder>(
    "Sales Order",
    preSalesOrder || "",
    {
      enabled: !!preSalesOrder,
    },
  );

  useEffect(() => {
    if (salesOrderDetails) {
      form.setValue("company", salesOrderDetails.company);
      form.setValue("expected_delivery_date", salesOrderDetails.delivery_date);
      form.setValue("project", salesOrderDetails.project || "");

      // If no item selected, try to find a manufacturable item from SO
      if (
        !form.getValues("production_item") &&
        salesOrderDetails.items?.length > 0
      ) {
        // If preItem was passed but didn't match defaultValues (e.g. async timing), this ensures it stays.
        // Otherwise, pick the first item that might be manufacturable
        const candidate = salesOrderDetails.items[0].item_code;
        form.setValue("production_item", candidate);
        // Quantity often matches the SO quantity
        if (!preQty) {
          form.setValue("qty", salesOrderDetails.items[0].qty);
        }
      }
    }
  }, [salesOrderDetails, form, preQty]);

  const createMutation = useFrappeCreate("Work Order", {
    onSuccess: (response) => {
      toast.success("Work Order created Successfully");
      router.push(
        `/manufacturing/work-order/${encodeURIComponent(response.data?.name || response.name)}`,
      );
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

    const ratio = data.qty / (bomDetails.quantity || 1);

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
    const itemUomMustBeInteger = uomMap.get(bomDetails.uom);
    if (itemUomMustBeInteger === 1 && !Number.isInteger(data.qty)) {
      toast.error(
        `Quantity for item ${data.production_item} must be a whole number for UOM ${bomDetails.uom}`,
      );
      return;
    }

    // Format required_items from BOM with UOM validation
    const required_items = [];
    for (const item of bomDetails.items || []) {
      let reqQty = item.qty * ratio;
      const mustBeInt = uomMap.get(item.uom);

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
      docstatus: 0,
      status: "Draft",
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

    createMutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product & BOM */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Product & Recipe
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select the item you want to produce and its BOM
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
                <FormFrappeSelect
                  control={form.control}
                  name="company"
                  label="Company"
                  doctype="Company"
                  required
                />
              </div>
            </div>

            {/* Source & Scheduling */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Source & Scheduling
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Link production to demand and set timelines
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
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Factory className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Warehouse Logistics
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define where materials come from and where FG goes
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
                  description="Enable if raw materials are already present at the production location"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* BOM Preview Enhanced */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-xl shadow-primary/5 sticky top-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Production Summary
              </h3>

              {bomDetails ? (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                      Selected Recipe
                    </p>
                    <p className="font-bold text-sm truncate">
                      {bomDetails.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Base batch size: {bomDetails.quantity} {bomDetails.uom}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">
                          Planned Output
                        </span>
                        <span className="text-[10px] uppercase font-bold text-primary">
                          Calculation based
                        </span>
                      </div>
                      <span className="font-black text-lg">
                        {workOrderQty || 0} {bomDetails.uom}
                      </span>
                    </div>

                    <div className="h-px bg-border/50" />

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">
                          Raw Materials
                        </span>
                        <span>
                          {bomDetails.items?.length || 0} unique items
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">
                          Operations
                        </span>
                        <span>{bomDetails.operations?.length || 0} steps</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border/50 space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                            Est. Operating Cost
                          </p>
                          <p className="text-lg font-black text-primary">
                            ETB{" "}
                            {(
                              (bomDetails.operating_cost || 0) *
                              (workOrderQty / bomDetails.quantity)
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                            Est. Material Cost
                          </p>
                          <p className="text-lg font-black text-emerald-600">
                            ETB{" "}
                            {(
                              (bomDetails.raw_material_cost || 0) *
                              (workOrderQty / bomDetails.quantity)
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {salesOrderDetails && (
                    <div className="mt-8 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">
                        Demand Source
                      </p>
                      <p className="font-bold text-xs truncate">
                        {salesOrderDetails.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Customer:{" "}
                        {salesOrderDetails.customer_name ||
                          salesOrderDetails.customer}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full mt-6 rounded-xl h-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all uppercase tracking-widest text-[11px]"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Generate Work Order
                  </Button>
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 opacity-40">
                  <div className="h-16 w-16 rounded-full bg-secondary mx-auto flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground px-4 leading-relaxed">
                    Choose a product and Bill of Materials to see production
                    metrics
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

export default function CreateWorkOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Work Order"
        subtitle="Start a new production job"
        backHref="/manufacturing/work-order"
      />
      <Suspense fallback={<LoadingState />}>
        <CreateWorkOrderForm />
      </Suspense>
    </div>
  );
}
