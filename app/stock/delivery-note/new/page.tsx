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
  Truck,
  Plus,
  Trash2,
  Package,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import {
  DeliveryNoteCreateSchema,
  type DeliveryNoteFormData,
} from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import type { SalesOrder, Customer, Address } from "@/types/doctype-types";

function CreateDeliveryNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-population from Sales Order
  const preSalesOrder = searchParams.get("sales_order");
  const preCustomer = searchParams.get("customer");

  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const form = useForm<DeliveryNoteFormData>({
    resolver: zodResolver(DeliveryNoteCreateSchema),
    defaultValues: {
      naming_series: "MAT-DN-.YYYY.-",
      customer: preCustomer || "",
      posting_date: new Date().toISOString().split("T")[0],
      posting_time: new Date().toTimeString().slice(0, 5),
      company: "",
      items: [],
      set_warehouse: "",
      shipping_address_name: "",
      dispatch_address_name: "",
      transporter: "",
      driver: "",
      vehicle_no: "",
      lr_no: "",
      print_without_amount: 1, // Gate Pass mode by default
      currency: "ETB",
      conversion_rate: 1,
    },
  });

  const customer = form.watch("customer");
  const setWarehouse = form.watch("set_warehouse");

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Fetch Sales Order details to pre-fill items
  const { data: soDetails } = useFrappeDoc<SalesOrder>(
    "Sales Order",
    preSalesOrder || "",
    { enabled: !!preSalesOrder },
  );

  // Fetch addresses for selected customer
  const { data: addresses } = useFrappeList<Address>(
    "Address",
    {
      fields: [
        "name",
        "address_title",
        "address_type",
        "address_line1",
        "city",
        "is_primary_address",
        "is_shipping_address",
      ],
      filters: customer ? [["Dynamic Link", "link_name", "=", customer]] : [],
      limit: 20,
    },
    { enabled: !!customer },
  );

  // Pre-fill from Sales Order
  useEffect(() => {
    if (soDetails) {
      form.setValue("customer", soDetails.customer);
      form.setValue("company", soDetails.company);
      form.setValue("po_no", soDetails.po_no);
      form.setValue(
        "shipping_address_name",
        soDetails.shipping_address_name || "",
      );
      form.setValue("customer_address", soDetails.customer_address || "");
      form.setValue("project", soDetails.project || "");
      form.setValue("selling_price_list", soDetails.selling_price_list);
      form.setValue("currency", soDetails.currency);
      form.setValue("conversion_rate", soDetails.conversion_rate);

      // Map SO items to DN items (only pending qty)
      if (soDetails.items?.length > 0) {
        const dnItems = soDetails.items
          .filter((item: any) => item.qty - (item.delivered_qty || 0) > 0)
          .map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description,
            qty: item.qty - (item.delivered_qty || 0), // Pending quantity
            uom: item.uom,
            rate: item.rate,
            amount: (item.qty - (item.delivered_qty || 0)) * item.rate,
            warehouse: item.warehouse || soDetails.set_warehouse,
            against_sales_order: preSalesOrder,
            so_detail: item.name,
          }));
        replace(dnItems);

        if (dnItems.length === 0) {
          toast.info("All items from this Sales Order have been delivered");
        }
      }
    }
  }, [soDetails, form, replace, preSalesOrder]);

  // Auto-select shipping address
  useEffect(() => {
    if (
      addresses &&
      addresses.length > 0 &&
      !form.getValues("shipping_address_name")
    ) {
      const shippingAddr =
        addresses.find((a) => a.is_shipping_address === 1) || addresses[0];
      form.setValue("shipping_address_name", shippingAddr.name);
    }
  }, [addresses, form]);

  const createMutation = useFrappeCreate("Delivery Note", {
    onSuccess: (response) => {
      toast.success("Delivery Note created");
      router.push(
        `/stock/delivery-note/${encodeURIComponent(response.data?.name || response.name)}`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = async (data: DeliveryNoteFormData) => {
    const payload = {
      ...data,
      docstatus: 0,
      status: "Draft",
      items: data.items.map((item, idx) => ({
        ...item,
        idx: idx + 1,
        warehouse: item.warehouse || data.set_warehouse,
        doctype: "Delivery Note Item",
      })),
    };

    createMutation.mutate(payload);
  };

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

              {preSalesOrder && (
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <p className="text-[10px] font-bold uppercase text-indigo-600 tracking-widest mb-1">
                    Linked Sales Order
                  </p>
                  <p className="font-bold text-indigo-700">{preSalesOrder}</p>
                </div>
              )}
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
                    <p className="text-xs text-muted-foreground">
                      {preSalesOrder
                        ? "Pre-filled from Sales Order"
                        : "Add items for delivery"}
                    </p>
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

              {fields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground text-sm font-medium">
                    No items added
                  </p>
                </div>
              ) : (
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
              )}
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
                disabled={createMutation.isPending || fields.length === 0}
                className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20 uppercase tracking-widest text-[11px]"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Create Delivery Note
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function CreateDeliveryNotePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Delivery Note"
        subtitle="Prepare items for dispatch"
        backHref="/stock/delivery-note"
      />
      <Suspense fallback={<LoadingState />}>
        <CreateDeliveryNoteForm />
      </Suspense>
    </div>
  );
}
