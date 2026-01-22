// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
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

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(WorkOrderCreateSchema),
    defaultValues: {
      naming_series: "MFG-WO-.YYYY.-",
      production_item: preItem || "",
      bom_no: preBom || "",
      company: "",
      qty: 1,
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
    }
  }, [salesOrderDetails, form]);

  const createMutation = useFrappeCreate("Work Order", {
    onSuccess: (response) => {
      toast.success("Work Order created");
      router.push(
        `/manufacturing/work-order/${encodeURIComponent(response.data?.name || response.name)}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: WorkOrderFormData) => {
    // Format required_items from BOM
    const payload = {
      ...data,
      docstatus: 0,
      status: "Draft",
      required_items:
        bomDetails?.items?.map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          source_warehouse: data.source_warehouse,
          required_qty: item.qty * (data.qty / (bomDetails.quantity || 1)),
          doctype: "Work Order Item",
        })) || [],
      operations:
        bomDetails?.operations?.map((op: any) => ({
          operation: op.operation,
          workstation: op.workstation,
          time_in_mins: op.time_in_mins,
          doctype: "Work Order Operation",
        })) || [],
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
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Package className="h-5 w-5 text-primary" />
                Product & Recipe
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormInput
                  control={form.control}
                  name="qty"
                  label="Quantity"
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
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <FileText className="h-5 w-5 text-blue-500" />
                Source & Scheduling
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <FormFrappeSelect
                control={form.control}
                name="material_request"
                label="Material Request (Optional)"
                doctype="Material Request"
                placeholder="Link to MR..."
              />
            </div>

            {/* Warehouses */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Factory className="h-5 w-5 text-amber-500" />
                Warehouse Locations
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <FormSwitch
                control={form.control}
                name="skip_transfer"
                label="Skip Material Transfer"
                description="Check if materials don't need to be transferred to WIP"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* BOM Preview */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-6">
              <h3 className="font-semibold mb-4">BOM Preview</h3>
              {bomDetails ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batch Size</span>
                    <span className="font-medium">
                      {bomDetails.quantity} {bomDetails.uom}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Materials</span>
                    <span className="font-medium">
                      {bomDetails.items?.length || 0} items
                    </span>
                  </div>
                  {bomDetails.with_operations === 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operations</span>
                      <span className="font-medium">
                        {bomDetails.operations?.length || 0} steps
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cost</span>
                      <span className="font-bold text-primary">
                        ETB {bomDetails.total_cost?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Select a BOM to preview
                </p>
              )}

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full mt-6 rounded-full"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Work Order
              </Button>
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
