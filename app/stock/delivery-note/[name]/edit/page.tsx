// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save,
  Loader2,
  Truck,
  Plus,
  Trash2,
  Package,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeUpdate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import {
  DeliveryNoteCreateSchema,
  type DeliveryNoteFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import type { DeliveryNote, Address } from "@/types/doctype-types";

function EditDeliveryNoteForm() {
  const router = useRouter();
  const { name } = useParams();
  const dnName = decodeURIComponent(name as string);

  const { data: dn, isLoading } = useFrappeDoc<DeliveryNote>(
    "Delivery Note",
    dnName,
  );

  const form = useForm<DeliveryNoteFormData>({
    resolver: zodResolver(DeliveryNoteCreateSchema),
    defaultValues: {
      naming_series: "MAT-DN-.YYYY.-",
      customer: "",
      posting_date: "",
      posting_time: "",
      company: "",
      items: [],
      set_warehouse: "",
      shipping_address_name: "",
      dispatch_address_name: "",
      transporter: "",
      driver: "",
      vehicle_no: "",
      lr_no: "",
      print_without_amount: 1,
    },
  });

  const customer = form.watch("customer");
  const setWarehouse = form.watch("set_warehouse");

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Pre-fill from existing DN
  useEffect(() => {
    if (dn) {
      if (dn.docstatus !== 0) {
        toast.error("Only draft delivery notes can be edited");
        router.push(`/stock/delivery-note/${encodeURIComponent(dnName)}`);
        return;
      }

      form.reset({
        ...dn,
        posting_date: dn.posting_date,
        posting_time: dn.posting_time,
        items:
          dn.items?.map((item) => ({
            ...item,
            idx: item.idx,
          })) || [],
      });
    }
  }, [dn, form, dnName, router]);

  const updateMutation = useFrappeUpdate("Delivery Note", {
    onSuccess: () => {
      toast.success("Delivery Note updated");
      router.push(`/stock/delivery-note/${encodeURIComponent(dnName)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = async (data: DeliveryNoteFormData) => {
    const payload = {
      ...data,
      items: data.items.map((item, idx) => ({
        ...item,
        idx: idx + 1,
        warehouse: item.warehouse || data.set_warehouse,
        doctype: "Delivery Note Item",
      })),
    };

    updateMutation.mutate({ name: dnName, data: payload });
  };

  if (isLoading) return <LoadingState />;

  const totalQty = fields.reduce(
    (sum, _, idx) => sum + (form.watch(`items.${idx}.qty`) || 0),
    0,
  );
  const totalAmount = fields.reduce((sum, _, idx) => {
    const qty = form.watch(`items.${idx}.qty`) || 0;
    const rate = form.watch(`items.${idx}.rate`) || 0;
    return sum + qty * rate;
  }, 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Reference */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Customer & Reference
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Who is receiving this delivery?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="customer"
                  label="Customer"
                  doctype="Customer"
                  required
                  placeholder="Select customer..."
                  disabled
                />
                <FormFrappeSelect
                  control={form.control}
                  name="company"
                  label="Company"
                  doctype="Company"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput
                  control={form.control}
                  name="posting_date"
                  label="Delivery Date"
                  type="date"
                  required
                />
                <FormInput
                  control={form.control}
                  name="posting_time"
                  label="Time"
                  type="time"
                />
                <FormInput
                  control={form.control}
                  name="po_no"
                  label="Customer PO#"
                  placeholder="PO reference"
                />
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Addressing
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Shipping and dispatch locations
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="shipping_address_name"
                  label="Shipping Address (To)"
                  doctype="Address"
                  placeholder="Where goods are going..."
                  filters={
                    customer
                      ? [["Dynamic Link", "link_name", "=", customer]]
                      : []
                  }
                />
                <FormFrappeSelect
                  control={form.control}
                  name="dispatch_address_name"
                  label="Dispatch From (Our Address)"
                  doctype="Address"
                  placeholder="Our warehouse address..."
                />
              </div>
            </div>

            {/* Logistics */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">
                    Logistics & Security
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Who is taking the goods?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect
                  control={form.control}
                  name="transporter"
                  label="Transporter / Logistics Co"
                  doctype="Supplier"
                  placeholder="e.g., In-House, DHL..."
                  filters={[["is_transporter", "=", 1]]}
                />
                <FormFrappeSelect
                  control={form.control}
                  name="driver"
                  label="Driver"
                  doctype="Driver"
                  placeholder="Who is driving?"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput
                  control={form.control}
                  name="vehicle_no"
                  label="Vehicle Number"
                  placeholder="License plate"
                />
                <FormInput
                  control={form.control}
                  name="lr_no"
                  label="Gate Pass / LR No"
                  placeholder="Receipt number"
                />
                <FormInput
                  control={form.control}
                  name="lr_date"
                  label="LR Date"
                  type="date"
                />
              </div>
            </div>

            {/* Items */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-tight">
                      Items to Deliver
                    </h3>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    append({
                      item_code: "",
                      qty: 1,
                      uom: "Nos",
                      rate: 0,
                      warehouse: setWarehouse,
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              {/* Default Warehouse */}
              <FormFrappeSelect
                control={form.control}
                name="set_warehouse"
                label="Source Warehouse (Default)"
                doctype="Warehouse"
                placeholder="e.g., Finished Goods Store"
                filters={[["is_group", "=", 0]]}
              />

              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <div className="col-span-4">Item</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Rate</div>
                  <div className="col-span-3">Warehouse</div>
                  <div className="col-span-1"></div>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-2 items-start p-4 bg-secondary/20 rounded-xl"
                  >
                    <div className="col-span-4">
                      <FormFrappeSelect
                        control={form.control}
                        name={`items.${index}.item_code`}
                        doctype="Item"
                        placeholder="Item..."
                      />
                    </div>
                    <div className="col-span-2">
                      <FormInput
                        control={form.control}
                        name={`items.${index}.qty`}
                        type="number"
                      />
                    </div>
                    <div className="col-span-2">
                      <FormInput
                        control={form.control}
                        name={`items.${index}.rate`}
                        type="number"
                      />
                    </div>
                    <div className="col-span-3">
                      <FormFrappeSelect
                        control={form.control}
                        name={`items.${index}.warehouse`}
                        doctype="Warehouse"
                        placeholder="WH"
                        filters={[["is_group", "=", 0]]}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm">
              <FormSwitch
                control={form.control}
                name="print_without_amount"
                label="Gate Pass Mode"
                description="Hide prices when printing (for drivers and security)"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-xl shadow-primary/5 sticky top-6 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Delivery Summary
              </h3>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Customer
                  </p>
                  <p className="font-bold truncate">
                    {customer || "Not selected"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <p className="text-2xl font-black text-emerald-600">
                      {fields.length}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-emerald-600/70">
                      Items
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                    <p className="text-2xl font-black text-blue-600">
                      {totalQty}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-blue-600/70">
                      Total Qty
                    </p>
                  </div>
                </div>

                {totalAmount > 0 && (
                  <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
                      Est. Value
                    </p>
                    <p className="text-2xl font-black text-primary">
                      ETB {totalAmount.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={updateMutation.isPending || fields.length === 0}
                className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20 uppercase tracking-widest text-[11px]"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function EditDeliveryNotePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Delivery Note"
        subtitle="Modify draft delivery note"
        backHref="/stock/delivery-note"
      />
      <Suspense fallback={<LoadingState />}>
        <EditDeliveryNoteForm />
      </Suspense>
    </div>
  );
}
