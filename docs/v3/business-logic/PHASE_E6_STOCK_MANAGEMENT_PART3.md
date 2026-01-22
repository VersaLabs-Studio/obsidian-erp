# Phase E6: Stock & Material Management - Part 3 (Create & Detail Pages)

> **Continuation of PHASE_E6_STOCK_MANAGEMENT_PART2.md**

---

## 10. Material Request Create Page

**File:** `app/stock/material-request/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, FileInput, Plus, Trash2, Package, Calendar,
  ShoppingCart, ArrowRightLeft, LogOut, Factory, UserCheck,
  Building2, AlertTriangle,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect, FormTextarea } from "@/components/form";
import { MaterialRequestCreateSchema, type MaterialRequestFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REQUEST_TYPES = [
  { value: "Purchase", label: "Purchase", icon: ShoppingCart, description: "Buy from external supplier" },
  { value: "Material Transfer", label: "Material Transfer", icon: ArrowRightLeft, description: "Move between warehouses" },
  { value: "Material Issue", label: "Material Issue", icon: LogOut, description: "Issue for internal use" },
  { value: "Manufacture", label: "Manufacture", icon: Factory, description: "Request for production" },
  { value: "Customer Provided", label: "Customer Provided", icon: UserCheck, description: "Customer sends materials" },
];

function CreateMaterialRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preType = searchParams.get("type") || "Purchase";
  const preWorkOrder = searchParams.get("work_order");

  const form = useForm<MaterialRequestFormData>({
    resolver: zodResolver(MaterialRequestCreateSchema),
    defaultValues: {
      naming_series: "MAT-MR-.YYYY.-",
      material_request_type: preType,
      company: "",
      transaction_date: new Date().toISOString().split('T')[0],
      schedule_date: "",
      work_order: preWorkOrder || "",
      set_warehouse: "",
      set_from_warehouse: "",
      items: [{ item_code: "", qty: 1, uom: "Nos", warehouse: "" }],
      reason: "",
    },
  });

  const requestType = form.watch("material_request_type");
  const isTransfer = requestType === "Material Transfer";
  const isPurchase = requestType === "Purchase";

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Pre-fill from Work Order
  const { data: workOrderDetails } = useFrappeDoc("Work Order", preWorkOrder || "", { enabled: !!preWorkOrder });

  useEffect(() => {
    if (workOrderDetails) {
      form.setValue("company", workOrderDetails.company);
      // Could populate items from WO required_items
    }
  }, [workOrderDetails, form]);

  const createMutation = useFrappeCreate("Material Request", {
    onSuccess: (response) => {
      toast.success("Material Request created");
      router.push(`/stock/material-request/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: MaterialRequestFormData) => {
    const payload = {
      ...data,
      docstatus: 0,
      items: data.items.map(item => ({
        ...item,
        warehouse: item.warehouse || data.set_warehouse,
        from_warehouse: isTransfer ? (item.from_warehouse || data.set_from_warehouse) : undefined,
        doctype: "Material Request Item",
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Request Type Selection */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileInput className="h-5 w-5 text-primary" />
                Request Type
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {REQUEST_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => form.setValue("material_request_type", type.value)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      requestType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <type.icon className={cn("h-5 w-5 mb-2", requestType === type.value ? "text-primary" : "text-muted-foreground")} />
                    <p className="font-bold text-sm">{type.label}</p>
                    <p className="text-[10px] text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Request Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormFrappeSelect control={form.control} name="company" label="Company" doctype="Company" required />
                <FormInput control={form.control} name="transaction_date" label="Request Date" type="date" required />
                <FormInput control={form.control} name="schedule_date" label="Required By" type="date" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFrappeSelect control={form.control} name="set_warehouse" label={isTransfer ? "Target Warehouse" : "Warehouse"}
                  doctype="Warehouse" placeholder="Default for all items" filters={[["is_group", "=", 0]]} />
                {isTransfer && (
                  <FormFrappeSelect control={form.control} name="set_from_warehouse" label="Source Warehouse"
                    doctype="Warehouse" placeholder="Default source" filters={[["is_group", "=", 0]]} />
                )}
              </div>

              {(requestType === "Manufacture" || preWorkOrder) && (
                <FormFrappeSelect control={form.control} name="work_order" label="Work Order"
                  doctype="Work Order" placeholder="Link to production..." />
              )}

              <FormTextarea control={form.control} name="reason" label="Reason for Request" rows={2} />
            </div>

            {/* Items Table */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-500" />
                  Requested Items
                </h3>
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  onClick={() => append({ item_code: "", qty: 1, uom: "Nos", warehouse: "" })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-4">Item</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">UOM</div>
                  {isTransfer && <div className="col-span-2">From</div>}
                  <div className={isTransfer ? "col-span-1" : "col-span-3"}>To</div>
                  <div className="col-span-1"></div>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-4 bg-secondary/20 rounded-xl">
                    <div className="col-span-4">
                      <FormFrappeSelect control={form.control} name={`items.${index}.item_code`}
                        doctype="Item" placeholder="Select item..." />
                    </div>
                    <div className="col-span-2">
                      <FormInput control={form.control} name={`items.${index}.qty`} type="number" />
                    </div>
                    <div className="col-span-2">
                      <FormFrappeSelect control={form.control} name={`items.${index}.uom`} doctype="UOM" />
                    </div>
                    {isTransfer && (
                      <div className="col-span-2">
                        <FormFrappeSelect control={form.control} name={`items.${index}.from_warehouse`}
                          doctype="Warehouse" placeholder="Source" filters={[["is_group", "=", 0]]} />
                      </div>
                    )}
                    <div className={isTransfer ? "col-span-1" : "col-span-3"}>
                      <FormFrappeSelect control={form.control} name={`items.${index}.warehouse`}
                        doctype="Warehouse" placeholder="Target" filters={[["is_group", "=", 0]]} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                        disabled={fields.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-6 space-y-6">
              <h3 className="font-bold text-lg">Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-bold">{requestType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-bold">{fields.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Qty</span>
                  <span className="font-bold">
                    {form.watch("items")?.reduce((sum, item) => sum + (item.qty || 0), 0)}
                  </span>
                </div>
              </div>

              {isPurchase && (
                <div className="p-4 bg-emerald-500/10 rounded-xl text-xs text-emerald-600 border border-emerald-500/20">
                  <ShoppingCart className="h-4 w-4 mb-2" />
                  <p className="font-bold">Purchase Request</p>
                  <p className="text-emerald-600/70">After submission, you can create a Purchase Order from this request.</p>
                </div>
              )}

              {isTransfer && (
                <div className="p-4 bg-blue-500/10 rounded-xl text-xs text-blue-600 border border-blue-500/20">
                  <ArrowRightLeft className="h-4 w-4 mb-2" />
                  <p className="font-bold">Transfer Request</p>
                  <p className="text-blue-600/70">After submission, you can create a Stock Entry to execute the transfer.</p>
                </div>
              )}

              <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-full h-12">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Create Request
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function CreateMaterialRequestPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Material Request" subtitle="Request materials for your operations"
        backHref="/stock/material-request" />
      <Suspense fallback={<LoadingState />}>
        <CreateMaterialRequestForm />
      </Suspense>
    </div>
  );
}
```

---

## 11. Stock Entry Create Page

**File:** `app/stock/stock-entry/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, ArrowRightLeft, Plus, Trash2, Package,
  LogIn, LogOut, Factory, Cog, Truck, Building2, AlertTriangle,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect, FormTextarea } from "@/components/form";
import { StockEntryCreateSchema, type StockEntryFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WorkOrder, Bom, MaterialRequest } from "@/types/doctype-types";

const PURPOSES = [
  { value: "Material Receipt", label: "Material Receipt", icon: LogIn, color: "emerald" },
  { value: "Material Issue", label: "Material Issue", icon: LogOut, color: "red" },
  { value: "Material Transfer", label: "Material Transfer", icon: ArrowRightLeft, color: "blue" },
  { value: "Material Transfer for Manufacture", label: "Transfer for Manufacture", icon: Factory, color: "indigo" },
  { value: "Manufacture", label: "Manufacture", icon: Cog, color: "violet" },
  { value: "Repack", label: "Repack", icon: Package, color: "amber" },
  { value: "Send to Subcontractor", label: "Send to Subcontractor", icon: Truck, color: "cyan" },
];

function CreateStockEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prePurpose = searchParams.get("purpose") || "Material Transfer";
  const preWorkOrder = searchParams.get("work_order");
  const preMaterialRequest = searchParams.get("material_request");

  const form = useForm<StockEntryFormData>({
    resolver: zodResolver(StockEntryCreateSchema),
    defaultValues: {
      naming_series: "MAT-STE-.YYYY.-",
      stock_entry_type: prePurpose,
      purpose: prePurpose,
      company: "",
      posting_date: new Date().toISOString().split('T')[0],
      posting_time: new Date().toTimeString().slice(0, 5),
      work_order: preWorkOrder || "",
      material_request: preMaterialRequest || "",
      from_warehouse: "",
      to_warehouse: "",
      fg_completed_qty: 0,
      items: [],
      remarks: "",
    },
  });

  const purpose = form.watch("purpose");
  const workOrder = form.watch("work_order");
  const fgQty = form.watch("fg_completed_qty");

  const isManufacture = purpose === "Manufacture";
  const isTransferForMfg = purpose === "Material Transfer for Manufacture";
  const needsSource = ["Material Issue", "Material Transfer", "Material Transfer for Manufacture", "Send to Subcontractor"].includes(purpose);
  const needsTarget = ["Material Receipt", "Material Transfer", "Manufacture"].includes(purpose);

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Fetch Work Order details
  const { data: woDetails } = useFrappeDoc<WorkOrder>("Work Order", workOrder || "", { enabled: !!workOrder });

  // Fetch BOM for Manufacture purpose
  const { data: bomDetails } = useFrappeDoc<Bom>("BOM", woDetails?.bom_no || "", { enabled: !!woDetails?.bom_no && isManufacture });

  // Auto-populate items from Work Order for manufacturing
  useEffect(() => {
    if (woDetails && (isManufacture || isTransferForMfg)) {
      form.setValue("company", woDetails.company);
      form.setValue("from_warehouse", woDetails.source_warehouse || woDetails.wip_warehouse);
      form.setValue("to_warehouse", isManufacture ? woDetails.fg_warehouse : woDetails.wip_warehouse);
      form.setValue("fg_completed_qty", woDetails.qty - (woDetails.produced_qty || 0));
      form.setValue("bom_no", woDetails.bom_no);

      // Populate items from WO required_items
      if (woDetails.required_items?.length > 0) {
        const items = woDetails.required_items.map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: isTransferForMfg
            ? item.required_qty - (item.transferred_qty || 0)
            : item.required_qty,
          uom: item.uom || "Nos",
          s_warehouse: woDetails.source_warehouse,
          t_warehouse: isTransferForMfg ? woDetails.wip_warehouse : undefined,
          basic_rate: 0,
        }));
        replace(items.filter(i => i.qty > 0));
      }
    }
  }, [woDetails, isManufacture, isTransferForMfg, form, replace]);

  // Add finished goods item for Manufacture
  useEffect(() => {
    if (isManufacture && woDetails && fgQty > 0) {
      const existingFG = fields.find(f => f.is_finished_item);
      if (!existingFG) {
        append({
          item_code: woDetails.production_item,
          item_name: woDetails.item_name,
          qty: fgQty,
          uom: woDetails.stock_uom || "Nos",
          t_warehouse: woDetails.fg_warehouse,
          is_finished_item: true,
          basic_rate: 0,
        });
      }
    }
  }, [fgQty, isManufacture, woDetails, fields, append]);

  const createMutation = useFrappeCreate("Stock Entry", {
    onSuccess: (response) => {
      toast.success("Stock Entry created");
      router.push(`/stock/stock-entry/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: StockEntryFormData) => {
    const payload = {
      ...data,
      docstatus: 0,
      stock_entry_type: data.purpose,
      items: data.items.map(item => ({
        ...item,
        s_warehouse: item.s_warehouse || (needsSource ? data.from_warehouse : undefined),
        t_warehouse: item.t_warehouse || (needsTarget ? data.to_warehouse : undefined),
        basic_amount: (item.qty || 0) * (item.basic_rate || 0),
        doctype: "Stock Entry Detail",
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Purpose Selection */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Entry Purpose
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PURPOSES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      form.setValue("purpose", p.value);
                      form.setValue("stock_entry_type", p.value);
                    }}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all",
                      purpose === p.value
                        ? `border-${p.color}-500 bg-${p.color}-50 dark:bg-${p.color}-900/10`
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <p.icon className={cn("h-4 w-4 mb-1", purpose === p.value ? `text-${p.color}-600` : "text-muted-foreground")} />
                    <p className="font-bold text-xs">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Entry Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormFrappeSelect control={form.control} name="company" label="Company" doctype="Company" required />
                <FormInput control={form.control} name="posting_date" label="Posting Date" type="date" required />
                <FormInput control={form.control} name="posting_time" label="Posting Time" type="time" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needsSource && (
                  <FormFrappeSelect control={form.control} name="from_warehouse" label="Source Warehouse"
                    doctype="Warehouse" placeholder="From..." filters={[["is_group", "=", 0]]} required />
                )}
                {needsTarget && (
                  <FormFrappeSelect control={form.control} name="to_warehouse" label="Target Warehouse"
                    doctype="Warehouse" placeholder="To..." filters={[["is_group", "=", 0]]} required />
                )}
              </div>

              {(isManufacture || isTransferForMfg) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <FormFrappeSelect control={form.control} name="work_order" label="Work Order"
                    doctype="Work Order" placeholder="Link to WO..." required />
                  {isManufacture && (
                    <FormInput control={form.control} name="fg_completed_qty" label="Finished Goods Qty" type="number" />
                  )}
                </div>
              )}

              <FormTextarea control={form.control} name="remarks" label="Remarks" rows={2} />
            </div>

            {/* Items Table */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-emerald-500" />
                  Items
                </h3>
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  onClick={() => append({ item_code: "", qty: 1, uom: "Nos", basic_rate: 0 })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-border/50 rounded-2xl">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground text-sm">No items added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className={cn(
                      "grid grid-cols-12 gap-2 items-start p-4 rounded-xl",
                      field.is_finished_item ? "bg-violet-500/10 border border-violet-500/20" : "bg-secondary/20"
                    )}>
                      {field.is_finished_item && (
                        <div className="col-span-12 mb-2">
                          <span className="text-[10px] font-bold uppercase text-violet-600 bg-violet-500/20 px-2 py-1 rounded-full">
                            Finished Good
                          </span>
                        </div>
                      )}
                      <div className="col-span-4">
                        <FormFrappeSelect control={form.control} name={`items.${index}.item_code`}
                          label={index === 0 ? "Item" : undefined} doctype="Item" />
                      </div>
                      <div className="col-span-2">
                        <FormInput control={form.control} name={`items.${index}.qty`}
                          label={index === 0 ? "Qty" : undefined} type="number" />
                      </div>
                      <div className="col-span-2">
                        <FormFrappeSelect control={form.control} name={`items.${index}.uom`}
                          label={index === 0 ? "UOM" : undefined} doctype="UOM" />
                      </div>
                      <div className="col-span-2">
                        <FormInput control={form.control} name={`items.${index}.basic_rate`}
                          label={index === 0 ? "Rate" : undefined} type="number" />
                      </div>
                      <div className="col-span-2 flex items-end justify-end">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-6 space-y-6">
              <h3 className="font-bold text-lg">Entry Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purpose</span>
                  <span className="font-bold">{purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-bold">{fields.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Qty</span>
                  <span className="font-bold">
                    {form.watch("items")?.reduce((sum, item) => sum + (item.qty || 0), 0)}
                  </span>
                </div>
              </div>

              {woDetails && (
                <div className="p-4 bg-indigo-500/10 rounded-xl text-xs border border-indigo-500/20">
                  <Factory className="h-4 w-4 text-indigo-600 mb-2" />
                  <p className="font-bold text-indigo-600">{woDetails.name}</p>
                  <p className="text-indigo-600/70">{woDetails.item_name}</p>
                  <p className="text-indigo-600/70 mt-1">Remaining: {woDetails.qty - (woDetails.produced_qty || 0)}</p>
                </div>
              )}

              <Button type="submit" disabled={createMutation.isPending || fields.length === 0}
                className="w-full rounded-full h-12">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Create Stock Entry
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function CreateStockEntryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Stock Entry" subtitle="Record inventory movements"
        backHref="/stock/stock-entry" />
      <Suspense fallback={<LoadingState />}>
        <CreateStockEntryForm />
      </Suspense>
    </div>
  );
}
```

---

## 12. File Structure

```
app/stock/
├── material-request/
│   ├── page.tsx                    # List with type tabs
│   ├── new/page.tsx                # Create with type selection
│   └── [name]/
│       ├── page.tsx                # Detail with actions
│       └── edit/page.tsx           # Edit (draft only)
├── stock-entry/
│   ├── page.tsx                    # List with purpose tabs
│   ├── new/page.tsx                # Create with purpose selection
│   └── [name]/
│       ├── page.tsx                # Detail with submit
│       └── edit/page.tsx           # Edit (draft only)

app/buying/
├── purchase-order/
│   ├── page.tsx                    # List with status tabs
│   ├── new/page.tsx                # Create from MR or direct
│   └── [name]/
│       ├── page.tsx                # Detail with receipt action
│       └── edit/page.tsx           # Edit (draft only)
├── supplier/
│   ├── page.tsx                    # List
│   ├── new/page.tsx                # Create
│   └── [name]/
│       ├── page.tsx                # Detail
│       └── edit/page.tsx           # Edit

app/api/stock/
├── material-request/
│   ├── route.ts
│   └── [name]/route.ts
├── stock-entry/
│   ├── route.ts
│   └── [name]/route.ts

app/api/buying/
├── purchase-order/
│   ├── route.ts
│   └── [name]/route.ts
├── supplier/
│   ├── route.ts
│   └── [name]/route.ts
```

---

## 13. Business Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE INVENTORY FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMAND                                                                     │
│  ──────                                                                     │
│  Sales Order → Work Order → Material Request (Manufacture)                  │
│  Reorder Level → Material Request (Purchase)                                │
│  Manual Need → Material Request (Any type)                                  │
│                                                                             │
│  PROCUREMENT                                                                │
│  ───────────                                                                │
│  Material Request (Purchase) → Purchase Order → Stock Entry (Receipt)      │
│                                                                             │
│  INTERNAL MOVEMENT                                                          │
│  ─────────────────                                                          │
│  Material Request (Transfer) → Stock Entry (Material Transfer)             │
│  Work Order → Stock Entry (Transfer for Manufacture)                       │
│                                                                             │
│  MANUFACTURING                                                              │
│  ─────────────                                                              │
│  Work Order → Stock Entry (Transfer for Mfg) → Stock Entry (Manufacture)  │
│                                                                             │
│  CONSUMPTION                                                                │
│  ───────────                                                                │
│  Material Request (Issue) → Stock Entry (Material Issue)                   │
│                                                                             │
│  DELIVERY                                                                   │
│  ────────                                                                   │
│  Sales Order → Delivery Note → Sales Invoice                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Testing Checklist

### Material Request

- [ ] Create Purchase request
- [ ] Create Transfer request (with from/to warehouses)
- [ ] Create Issue request
- [ ] Create Manufacture request linked to Work Order
- [ ] Submit and create PO from Purchase request
- [ ] Submit and create Stock Entry from Transfer request
- [ ] Filter by type
- [ ] Search functionality

### Stock Entry

- [ ] Create Material Receipt
- [ ] Create Material Issue (stock validation)
- [ ] Create Material Transfer
- [ ] Create Transfer for Manufacture from Work Order
- [ ] Create Manufacture entry from Work Order
- [ ] Auto-populate items from Work Order
- [ ] Finished goods item added for Manufacture
- [ ] Submit and verify stock ledger update
- [ ] Filter by purpose

### Purchase Order

- [ ] Create PO from Material Request
- [ ] Create PO directly
- [ ] Add items with rates
- [ ] Submit PO
- [ ] Create Purchase Receipt (Stock Entry) from PO
- [ ] Track received qty

### Integration

- [ ] Work Order → Start Production → Stock Entry (Transfer for Mfg)
- [ ] Work Order → Finish Production → Stock Entry (Manufacture)
- [ ] Material Request → Purchase Order → Stock Entry (Receipt)
- [ ] Full manufacturing cycle test

---

_End of Phase E6 Stock & Material Management Documentation_
