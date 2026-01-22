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
  ShoppingCart,
  Plus,
  Trash2,
  Package,
  Calendar,
  Building2,
  Truck,
  CreditCard,
  AlertTriangle,
  ArrowRight,
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
  PurchaseOrderCreateSchema,
  type PurchaseOrderFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function CreatePurchaseOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preMR = searchParams.get("material_request");

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(PurchaseOrderCreateSchema),
    defaultValues: {
      naming_series: "PUR-ORD-.YYYY.-",
      supplier: "",
      company: "",
      transaction_date: new Date().toISOString().split("T")[0],
      schedule_date: "",
      material_request: preMR || "",
      set_warehouse: "",
      items: [],
      currency: "ETB",
      conversion_rate: 1,
      terms: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Fetch Material Request details if provided
  const { data: mrDetails } = useFrappeDoc("Material Request", preMR || "", {
    enabled: !!preMR,
  });

  useEffect(() => {
    if (mrDetails) {
      form.setValue("company", mrDetails.company);
      form.setValue("set_warehouse", mrDetails.set_warehouse);

      if (mrDetails.items?.length > 0) {
        const items = mrDetails.items.map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty - (item.ordered_qty || 0),
          uom: item.uom || "Nos",
          rate: 0,
          warehouse: item.warehouse || mrDetails.set_warehouse,
          schedule_date: item.schedule_date,
          material_request: mrDetails.name,
          material_request_item: item.name,
          doctype: "Purchase Order Item",
        }));
        replace(items.filter((i) => i.qty > 0));
      }
    }
  }, [mrDetails, replace, form]);

  const createMutation = useFrappeCreate("Purchase Order", {
    onSuccess: (response) => {
      toast.success("Purchase Order created");
      router.push(
        `/buying/purchase-order/${encodeURIComponent(response.data?.name || response.name)}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: PurchaseOrderFormData) => {
    const payload = {
      ...data,
      docstatus: 0,
      items: data.items.map((item) => ({
        ...item,
        amount: (Number(item.qty) || 0) * (Number(item.rate) || 0),
        doctype: "Purchase Order Item",
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Vendor & Entity */}
            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Procurement Source
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Supplier and corporate context
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="supplier"
                  label="Supplier"
                  doctype="Supplier"
                  required
                />
                <FormFrappeSelect
                  control={form.control}
                  name="company"
                  label="Purchasing Entity"
                  doctype="Company"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  control={form.control}
                  name="transaction_date"
                  label="Order Date"
                  type="date"
                  required
                />
                <FormInput
                  control={form.control}
                  name="schedule_date"
                  label="Target Delivery"
                  type="date"
                  required
                />
              </div>
            </div>

            {/* Warehouse & Reference */}
            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="set_warehouse"
                  label="Receipt Warehouse"
                  doctype="Warehouse"
                  placeholder="Default target..."
                  filters={[["is_group", "=", 0]]}
                />
                <FormFrappeSelect
                  control={form.control}
                  name="material_request"
                  label="Source Request"
                  doctype="Material Request"
                  placeholder="Link to MR..."
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-lg shadow-primary/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Order Items
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full font-bold h-9 bg-secondary/20"
                  onClick={() =>
                    append({
                      item_code: "",
                      qty: 1,
                      uom: "Nos",
                      rate: 0,
                      doctype: "Purchase Order Item",
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-2" /> Add Item
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-[2.5rem] bg-secondary/5">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-sm font-bold text-muted-foreground">
                    No items in this order
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add items or link a Material Request to start.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="group relative grid grid-cols-12 gap-4 items-end p-6 rounded-[2rem] border border-border/50 bg-secondary/10 hover:bg-secondary/20 transition-all shadow-inner"
                    >
                      <div className="col-span-12 md:col-span-4">
                        <FormFrappeSelect
                          control={form.control}
                          name={`items.${index}.item_code`}
                          label="Item"
                          doctype="Item"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormInput
                          control={form.control}
                          name={`items.${index}.qty`}
                          label="Qty"
                          type="number"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <FormInput
                          control={form.control}
                          name={`items.${index}.rate`}
                          label="Rate"
                          type="number"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-3">
                        <FormFrappeSelect
                          control={form.control}
                          name={`items.${index}.warehouse`}
                          label="Target WH"
                          doctype="Warehouse"
                          filters={[["is_group", "=", 0]]}
                        />
                      </div>
                      <div className="col-span-12 md:col-span-1 flex justify-end pb-1.5 pt-2 md:pt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="font-bold text-lg tracking-tight">
                  Commercial Terms
                </h3>
              </div>
              <FormTextarea
                control={form.control}
                name="terms"
                label="Contractual Terms & Conditions"
                rows={4}
                placeholder="Delivery terms, payment delays, warranty..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-[2.5rem] border border-border/50 p-8 sticky top-6 space-y-8 shadow-xl shadow-primary/5 min-h-[500px] flex flex-col">
              <h3 className="font-bold text-lg tracking-tight border-b border-border/50 pb-4">
                Order Value
              </h3>

              <div className="space-y-6 flex-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Net Total
                  </span>
                  <span className="font-black text-xl tabular-nums">
                    {form.watch("currency")}{" "}
                    {form
                      .watch("items")
                      ?.reduce(
                        (sum, i) =>
                          sum + (Number(i.qty) || 0) * (Number(i.rate) || 0),
                        0,
                      )
                      .toLocaleString()}
                  </span>
                </div>

                <div className="p-6 rounded-3xl bg-secondary/30 border border-border/50 space-y-4">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>Items Count</span>
                    <span>{fields.length}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>Total Units</span>
                    <span>
                      {form
                        .watch("items")
                        ?.reduce((sum, i) => sum + (Number(i.qty) || 0), 0)}
                    </span>
                  </div>
                </div>

                {mrDetails && (
                  <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex gap-4">
                    <div className="shrink-0 h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center mt-1">
                      <Info className="h-3 w-3 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium leading-relaxed">
                      Pulling items from <strong>{mrDetails.name}</strong>.
                      Quantities are calculated based on remaining un-ordered
                      balances.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || fields.length === 0}
                  className="w-full rounded-2xl h-14 font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Save className="h-5 w-5 mr-3" />
                  )}
                  Generate Order
                </Button>

                <div className="p-4 rounded-2xl bg-secondary/30 flex items-center gap-3 text-[10px] text-muted-foreground font-bold italic">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Review rates before submission.
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function CreatePurchaseOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        subtitle="Formalize procurement intent with a binding contract"
        backHref="/buying/purchase-order"
      />
      <Suspense fallback={<LoadingState />}>
        <CreatePurchaseOrderForm />
      </Suspense>
    </div>
  );
}
