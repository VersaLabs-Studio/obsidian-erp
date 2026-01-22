// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  FileInput,
  Plus,
  Trash2,
  Package,
  Calendar,
  ShoppingCart,
  ArrowRightLeft,
  LogOut,
  Factory,
  UserCheck,
  Building2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate, useFrappeDoc } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import {
  FormInput,
  FormFrappeSelect,
  FormSelect,
  FormTextarea,
} from "@/components/form";
import {
  MaterialRequestCreateSchema,
  type MaterialRequestFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REQUEST_TYPES = [
  {
    value: "Purchase",
    label: "Purchase",
    icon: ShoppingCart,
    description: "External supply",
    bgColor: "bg-emerald-500",
  },
  {
    value: "Material Transfer",
    label: "Transfer",
    icon: ArrowRightLeft,
    description: "Internal move",
    bgColor: "bg-blue-500",
  },
  {
    value: "Material Issue",
    label: "Issue",
    icon: LogOut,
    description: "Consumption",
    bgColor: "bg-amber-500",
  },
  {
    value: "Manufacture",
    label: "Production",
    icon: Factory,
    description: "For manufacturing",
    bgColor: "bg-indigo-500",
  },
  {
    value: "Customer Provided",
    label: "Customer",
    icon: UserCheck,
    description: "Free of charge",
    bgColor: "bg-purple-500",
  },
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
      transaction_date: new Date().toISOString().split("T")[0],
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
  const { data: workOrderDetails } = useFrappeDoc(
    "Work Order",
    preWorkOrder || "",
    { enabled: !!preWorkOrder },
  );

  useEffect(() => {
    if (workOrderDetails) {
      form.setValue("company", workOrderDetails.company);
    }
  }, [workOrderDetails, form]);

  const createMutation = useFrappeCreate("Material Request", {
    onSuccess: (response) => {
      toast.success("Material Request created");
      router.push(
        `/stock/material-request/${encodeURIComponent(response.data?.name || response.name)}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: MaterialRequestFormData) => {
    const payload = {
      ...data,
      docstatus: 0,
      items: data.items.map((item) => ({
        ...item,
        warehouse: item.warehouse || data.set_warehouse,
        from_warehouse: isTransfer
          ? item.from_warehouse || data.set_from_warehouse
          : undefined,
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
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileInput className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Request Mode
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define the purpose of this procurement request
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {REQUEST_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      form.setValue("material_request_type", type.value)
                    }
                    className={cn(
                      "group relative p-4 rounded-3xl border transition-all text-left",
                      requestType === type.value
                        ? "border-primary bg-primary/5 shadow-inner"
                        : "border-border/50 hover:border-primary/30 bg-secondary/20",
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center mb-3 transition-colors",
                        requestType === type.value
                          ? type.bgColor
                          : "bg-background text-muted-foreground",
                      )}
                    >
                      <type.icon
                        className={cn(
                          "h-4 w-4",
                          requestType === type.value
                            ? "text-white"
                            : "group-hover:text-primary",
                        )}
                      />
                    </div>
                    <p className="font-black text-xs uppercase tracking-tight">
                      {type.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-medium truncate">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Core Information
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Basic details and timeline for the request
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="company"
                  label="Company"
                  doctype="Company"
                  required
                />
                <FormInput
                  control={form.control}
                  name="transaction_date"
                  label="Request Date"
                  type="date"
                  required
                />
                <FormInput
                  control={form.control}
                  name="schedule_date"
                  label="Required By"
                  type="date"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <FormFrappeSelect
                    control={form.control}
                    name="set_warehouse"
                    label={
                      isTransfer ? "Target Warehouse" : "Default Warehouse"
                    }
                    doctype="Warehouse"
                    placeholder="Auto-fill for items"
                    filters={[["is_group", "=", 0]]}
                  />
                  <p className="text-[10px] text-muted-foreground italic px-1 flex gap-2">
                    <Info className="h-3 w-3" /> Materials will be delivered to
                    this location.
                  </p>
                </div>
                {isTransfer && (
                  <div className="space-y-4">
                    <FormFrappeSelect
                      control={form.control}
                      name="set_from_warehouse"
                      label="Source Warehouse"
                      doctype="Warehouse"
                      placeholder="Default source"
                      filters={[["is_group", "=", 0]]}
                    />
                    <p className="text-[10px] text-muted-foreground italic px-1 flex gap-2">
                      <Info className="h-3 w-3" /> Materials will be moved from
                      this location.
                    </p>
                  </div>
                )}
              </div>

              {(requestType === "Manufacture" || preWorkOrder) && (
                <div className="pt-4 border-t border-border/50">
                  <FormFrappeSelect
                    control={form.control}
                    name="work_order"
                    label="Linked Work Order"
                    doctype="Work Order"
                    placeholder="Link to specific production job..."
                  />
                </div>
              )}

              <FormTextarea
                control={form.control}
                name="reason"
                label="Reason or Internal Note"
                rows={3}
                placeholder="Why are these materials needed?"
              />
            </div>

            {/* Items Table */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-lg shadow-primary/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-tight">
                      Requested Items
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      List all items and quantities needed
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full font-bold h-9"
                  onClick={() =>
                    append({ item_code: "", qty: 1, uom: "Nos", warehouse: "" })
                  }
                >
                  <Plus className="h-3 w-3 mr-2" /> Add Line
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="group relative grid grid-cols-12 gap-4 items-end p-6 bg-secondary/10 rounded-[2rem] border border-border/50 hover:bg-secondary/20 transition-all shadow-inner"
                  >
                    <div className="col-span-12 md:col-span-4">
                      <FormFrappeSelect
                        control={form.control}
                        name={`items.${index}.item_code`}
                        label="Item"
                        doctype="Item"
                        placeholder="Select item..."
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <FormInput
                        control={form.control}
                        name={`items.${index}.qty`}
                        label="Quantity"
                        type="number"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <FormFrappeSelect
                        control={form.control}
                        name={`items.${index}.uom`}
                        label="UOM"
                        doctype="UOM"
                      />
                    </div>
                    {isTransfer && (
                      <div className="col-span-12 md:col-span-2">
                        <FormFrappeSelect
                          control={form.control}
                          name={`items.${index}.from_warehouse`}
                          label="From"
                          doctype="Warehouse"
                          placeholder="Source"
                          filters={[["is_group", "=", 0]]}
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        "col-span-10",
                        isTransfer ? "md:col-span-1" : "md:col-span-3",
                      )}
                    >
                      <FormFrappeSelect
                        control={form.control}
                        name={`items.${index}.warehouse`}
                        label="Target"
                        doctype="Warehouse"
                        placeholder="Warehouse"
                        filters={[["is_group", "=", 0]]}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end pb-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                        disabled={fields.length === 1}
                      >
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
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 sticky top-6 space-y-8 shadow-xl shadow-primary/5">
              <h3 className="font-bold text-lg tracking-tight border-b border-border/50 pb-4">
                Summary View
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Request Mode
                  </span>
                  <Badge
                    variant="secondary"
                    className="rounded-lg font-black uppercase text-[10px]"
                  >
                    {requestType}
                  </Badge>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Line Items
                  </span>
                  <span className="font-black text-lg">{fields.length}</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Gross Qty
                  </span>
                  <span className="font-black text-lg text-primary">
                    {form
                      .watch("items")
                      ?.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {isPurchase && (
                  <div className="p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShoppingCart className="h-4 w-4" />
                      <p className="font-black text-[10px] uppercase tracking-widest">
                        Supply Logic
                      </p>
                    </div>
                    <p className="text-[11px] text-emerald-600/80 leading-relaxed font-medium">
                      This request will be used to generate official Purchase
                      Orders for external vendors.
                    </p>
                  </div>
                )}

                {isTransfer && (
                  <div className="p-5 bg-blue-500/5 rounded-3xl border border-blue-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-blue-600">
                      <ArrowRightLeft className="h-4 w-4" />
                      <p className="font-black text-[10px] uppercase tracking-widest">
                        Movement Logic
                      </p>
                    </div>
                    <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
                      This request monitors internal stock distribution and
                      triggers Material Transfer logs.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-2xl h-14 font-black uppercase tracking-[0.1em] text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Save className="h-5 w-5 mr-3" />
                )}
                Submit for Approval
              </Button>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/30 text-[10px] text-muted-foreground font-medium border border-border/50">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Submitted requests cannot be modified once approved by inventory
                managers.
              </div>
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
      <PageHeader
        title="New Material Request"
        subtitle="Operational demand identification and authorization"
        backHref="/stock/material-request"
      />
      <Suspense fallback={<LoadingState />}>
        <CreateMaterialRequestForm />
      </Suspense>
    </div>
  );
}
