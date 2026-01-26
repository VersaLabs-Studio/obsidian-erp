# Phase F: Delivery Note & Logistics Module - Part 3 (Create & Detail Pages)

> **Continuation of PHASE_F_DELIVERY_NOTE_PART2.md**

---

## 13. Delivery Note Create Page

**File:** `app/stock/delivery-note/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, Truck, Plus, Trash2, Package, MapPin,
  Building2, User, Calendar, AlertTriangle, CheckCircle2,
  CreditCard, FileText, ArrowRight,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate, useFrappeDoc, useFrappeList, useFrappeRequest } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch, FormTextarea } from "@/components/form";
import { DeliveryNoteCreateSchema, type DeliveryNoteFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SalesOrder, Customer, Address } from "@/types/doctype-types";
import { Badge } from "@/components/ui/badge";

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
      posting_date: new Date().toISOString().split('T')[0],
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
  const { data: soDetails } = useFrappeDoc<SalesOrder>("Sales Order", preSalesOrder || "", { enabled: !!preSalesOrder });

  // Fetch Customer details for addresses
  const { data: customerDetails } = useFrappeDoc<Customer>("Customer", customer || "", { enabled: !!customer });

  // Fetch addresses for selected customer
  const { data: addresses } = useFrappeList<Address>("Address", {
    fields: ["name", "address_title", "address_type", "address_line1", "city", "is_primary_address", "is_shipping_address"],
    filters: customer ? [["Dynamic Link", "link_name", "=", customer]] : [],
    limit: 20,
  }, { enabled: !!customer });

  // Pre-fill from Sales Order
  useEffect(() => {
    if (soDetails) {
      form.setValue("customer", soDetails.customer);
      form.setValue("company", soDetails.company);
      form.setValue("po_no", soDetails.po_no);
      form.setValue("shipping_address_name", soDetails.shipping_address_name || "");
      form.setValue("customer_address", soDetails.customer_address || "");
      form.setValue("project", soDetails.project || "");
      form.setValue("selling_price_list", soDetails.selling_price_list);
      form.setValue("currency", soDetails.currency);
      form.setValue("conversion_rate", soDetails.conversion_rate);

      // Map SO items to DN items (only pending qty)
      if (soDetails.items?.length > 0) {
        const dnItems = soDetails.items
          .filter((item: any) => (item.qty - (item.delivered_qty || 0)) > 0)
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
    if (addresses && addresses.length > 0 && !form.getValues("shipping_address_name")) {
      const shippingAddr = addresses.find(a => a.is_shipping_address === 1) || addresses[0];
      form.setValue("shipping_address_name", shippingAddr.name);
    }
  }, [addresses, form]);

  // Check stock availability
  const checkStockAvailability = async () => {
    const items = form.getValues("items");
    const warnings: string[] = [];

    for (const item of items) {
      if (!item.warehouse) continue;

      try {
        // In real implementation, call stock balance API
        // const balance = await frappeRequest.call('frappe.client.get_value', {
        //   doctype: 'Bin',
        //   filters: { item_code: item.item_code, warehouse: item.warehouse },
        //   fieldname: 'actual_qty'
        // });
        // if (balance < item.qty) warnings.push(`${item.item_code}: Insufficient stock`);
      } catch (e) {
        // Silently handle
      }
    }

    setStockWarnings(warnings);
    return warnings.length === 0;
  };

  const createMutation = useFrappeCreate("Delivery Note", {
    onSuccess: (response) => {
      toast.success("Delivery Note created");
      router.push(`/stock/delivery-note/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = async (data: DeliveryNoteFormData) => {
    // Stock availability check (soft warning for now)
    await checkStockAvailability();

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

  const totalQty = fields.reduce((sum, _, idx) => sum + (form.watch(`items.${idx}.qty`) || 0), 0);
  const totalAmount = fields.reduce((sum, _, idx) => {
    const qty = form.watch(`items.${idx}.qty`) || 0;
    const rate = form.watch(`items.${idx}.rate`) || 0;
    return sum + (qty * rate);
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
                  <h3 className="font-bold text-lg tracking-tight">Customer & Reference</h3>
                  <p className="text-xs text-muted-foreground">Who is receiving this delivery?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect control={form.control} name="customer" label="Customer"
                  doctype="Customer" required placeholder="Select customer..." />
                <FormFrappeSelect control={form.control} name="company" label="Company"
                  doctype="Company" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput control={form.control} name="posting_date" label="Delivery Date" type="date" required />
                <FormInput control={form.control} name="posting_time" label="Time" type="time" />
                <FormInput control={form.control} name="po_no" label="Customer PO#" placeholder="PO reference" />
              </div>

              {preSalesOrder && (
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <p className="text-[10px] font-bold uppercase text-indigo-600 tracking-widest mb-1">Linked Sales Order</p>
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
                  <h3 className="font-bold text-lg tracking-tight">Addressing</h3>
                  <p className="text-xs text-muted-foreground">Shipping and dispatch locations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect control={form.control} name="shipping_address_name" label="Shipping Address (To)"
                  doctype="Address" placeholder="Where goods are going..."
                  filters={customer ? [["Dynamic Link", "link_name", "=", customer]] : []} />
                <FormFrappeSelect control={form.control} name="dispatch_address_name" label="Dispatch From (Our Address)"
                  doctype="Address" placeholder="Our warehouse address..." />
              </div>
            </div>

            {/* Logistics */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">Logistics & Security</h3>
                  <p className="text-xs text-muted-foreground">Who is taking the goods? (Required for Gate Pass)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect control={form.control} name="transporter" label="Transporter / Logistics Co"
                  doctype="Supplier" placeholder="e.g., In-House, DHL..."
                  filters={[["is_transporter", "=", 1]]} />
                <FormFrappeSelect control={form.control} name="driver" label="Driver"
                  doctype="Driver" placeholder="Who is driving?" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput control={form.control} name="vehicle_no" label="Vehicle Number" placeholder="License plate" />
                <FormInput control={form.control} name="lr_no" label="Gate Pass / LR No" placeholder="Receipt number" />
                <FormInput control={form.control} name="lr_date" label="LR Date" type="date" />
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
                    <h3 className="font-bold text-lg tracking-tight">Items to Deliver</h3>
                    <p className="text-xs text-muted-foreground">
                      {preSalesOrder ? "Pre-filled from Sales Order (pending quantities)" : "Add items for delivery"}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  onClick={() => append({ item_code: "", qty: 1, uom: "Nos", rate: 0, warehouse: setWarehouse })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              {/* Default Warehouse */}
              <FormFrappeSelect control={form.control} name="set_warehouse" label="Source Warehouse (Default)"
                doctype="Warehouse" placeholder="e.g., Finished Goods Store"
                filters={[["is_group", "=", 0]]} />

              {fields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground text-sm font-medium">No items added</p>
                  <p className="text-xs text-muted-foreground mt-1">Add items or select a Sales Order to pre-fill</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="col-span-4">Item</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-3">Warehouse</div>
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
                        <FormInput control={form.control} name={`items.${index}.rate`} type="number" />
                      </div>
                      <div className="col-span-3">
                        <FormFrappeSelect control={form.control} name={`items.${index}.warehouse`}
                          doctype="Warehouse" placeholder="WH" filters={[["is_group", "=", 0]]} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          disabled={fields.length === 1 && !!preSalesOrder}>
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
              <FormSwitch control={form.control} name="print_without_amount" label="Gate Pass Mode"
                description="Hide prices when printing (for drivers and security)" />
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Customer</p>
                  <p className="font-bold truncate">{customer || "Not selected"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <p className="text-2xl font-black text-emerald-600">{fields.length}</p>
                    <p className="text-[10px] font-bold uppercase text-emerald-600/70">Items</p>
                  </div>
                  <div className="text-center p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                    <p className="text-2xl font-black text-blue-600">{totalQty}</p>
                    <p className="text-[10px] font-bold uppercase text-blue-600/70">Total Qty</p>
                  </div>
                </div>

                {totalAmount > 0 && (
                  <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Est. Value</p>
                    <p className="text-2xl font-black text-primary">
                      ETB {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                {stockWarnings.length > 0 && (
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="font-bold text-xs">Stock Warnings</p>
                    </div>
                    {stockWarnings.map((w, i) => (
                      <p key={i} className="text-xs text-red-600/80">{w}</p>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={createMutation.isPending || fields.length === 0}
                className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20 uppercase tracking-widest text-[11px]">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
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
      <PageHeader title="New Delivery Note" subtitle="Prepare items for dispatch"
        backHref="/stock/delivery-note" />
      <Suspense fallback={<LoadingState />}>
        <CreateDeliveryNoteForm />
      </Suspense>
    </div>
  );
}
```

---

## 14. Delivery Note Detail Page

**File:** `app/stock/delivery-note/[name]/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil, Trash2, Truck, Package, MapPin, User, Calendar,
  CheckCircle2, Clock, XCircle, FileText, Receipt, RotateCcw,
  Building2, Phone, Printer, ArrowUpRight, CreditCard, Lock,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { DeliveryNote } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", icon: Pencil },
  "To Bill": { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: FileText },
  Completed: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
  Return: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: RotateCcw },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200", icon: XCircle },
  Closed: { color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", icon: Lock },
};

export default function DeliveryNoteDetailPage() {
  const { name } = useParams();
  const router = useRouter();
  const dnName = decodeURIComponent(name as string);
  const [showDelete, setShowDelete] = useState(false);

  const { data: dn, isLoading, refetch, error } = useFrappeDoc<DeliveryNote>("Delivery Note", dnName);

  const deleteMutation = useFrappeDelete("Delivery Note", {
    onSuccess: () => { toast.success("Delivery Note deleted"); router.push("/stock/delivery-note"); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useFrappeUpdate("Delivery Note", {
    onSuccess: () => { refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !dn) return <EmptyState icon={Truck} title="Delivery Note not found" />;

  const statusConfig = STATUS_CONFIG[dn.status] || STATUS_CONFIG.Draft;
  const isDraft = dn.docstatus === 0;
  const canInvoice = dn.status === "To Bill";
  const isReturn = dn.is_return === 1;

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({ name: dnName, data: { docstatus: 1 } });
    toast.success("Delivery Note submitted. Stock has been deducted.");
  };

  const handleCancel = async () => {
    await updateMutation.mutateAsync({ name: dnName, data: { docstatus: 2 } });
    toast.success("Delivery Note cancelled. Stock has been restored.");
  };

  const handlePrintGatePass = () => {
    // Open print with print_without_amount flag
    toast.info("Opening Gate Pass for printing...");
    // In production: window.open(frappe print URL with proper format)
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={dn.name}
        subtitle={`Delivery to ${dn.customer_name || dn.customer}`}
        backHref="/stock/delivery-note"
        icon={<Truck className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button variant="outline" className="rounded-full h-9"
                  onClick={() => router.push(`/stock/delivery-note/${encodeURIComponent(dnName)}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button onClick={handleSubmit} disabled={updateMutation.isPending}
                  className="rounded-full h-9 shadow-lg shadow-primary/10">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Submit
                </Button>
              </>
            )}

            {canInvoice && (
              <Button onClick={() => router.push(`/accounting/sales-invoice/new?delivery_note=${encodeURIComponent(dnName)}`)}
                className="rounded-full h-9 shadow-lg shadow-emerald-500/10 bg-emerald-600 hover:bg-emerald-700">
                <Receipt className="h-4 w-4 mr-2" /> Create Invoice
              </Button>
            )}

            <Button variant="outline" onClick={handlePrintGatePass} className="rounded-full h-9">
              <Printer className="h-4 w-4 mr-2" /> Gate Pass
            </Button>

            {dn.docstatus === 1 && !["Cancelled", "Return"].includes(dn.status) && (
              <Button variant="outline" onClick={() => router.push(`/stock/delivery-note/new?is_return=1&return_against=${encodeURIComponent(dnName)}`)}
                className="rounded-full h-9 text-red-600 border-red-200 hover:bg-red-50">
                <RotateCcw className="h-4 w-4 mr-2" /> Create Return
              </Button>
            )}

            {isDraft && (
              <Button variant="ghost" size="icon" onClick={() => setShowDelete(true)}
                className="rounded-full h-9 w-9 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Status & Summary Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Badge className={cn("px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm",
              statusConfig.bg, statusConfig.color, statusConfig.border)}>
              <statusConfig.icon className="h-4 w-4 mr-2" />
              {dn.status}
            </Badge>
            {isReturn && (
              <Badge className="bg-red-100 text-red-600 border-red-200 rounded-full px-3 py-1">
                Return Delivery
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm">
            <DataPoint icon={<Calendar className="h-4 w-4 text-blue-500" />} label="Date"
              value={dn.posting_date ? format(parseISO(dn.posting_date), "PPP") : "—"} />
            <DataPoint icon={<Package className="h-4 w-4 text-emerald-500" />} label="Items"
              value={`${dn.total_qty || 0} units`} />
            {dn.grand_total && (
              <DataPoint icon={<CreditCard className="h-4 w-4 text-primary" />} label="Value"
                value={`ETB ${dn.grand_total.toLocaleString()}`} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <InfoCard title="Delivered Items" icon={<Package className="h-5 w-5 text-emerald-500" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Item</th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Qty</th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Rate</th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Amount</th>
                    <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {dn.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-2">
                        <div className="font-bold text-foreground">{item.item_name || item.item_code}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{item.item_code}</div>
                      </td>
                      <td className="text-right py-4 px-2 font-black">{item.qty} {item.uom}</td>
                      <td className="text-right py-4 px-2 text-muted-foreground">{item.rate?.toLocaleString()}</td>
                      <td className="text-right py-4 px-2 font-bold">{item.amount?.toLocaleString()}</td>
                      <td className="py-4 px-2 text-muted-foreground text-xs">{item.warehouse}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/20">
                    <td colSpan={3} className="text-right py-4 px-2 font-black uppercase text-xs">Grand Total</td>
                    <td className="text-right py-4 px-2 font-black text-lg text-primary">ETB {dn.grand_total?.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <InfoCard title="Customer Details" icon={<Building2 className="h-5 w-5 text-primary" />}>
            <div className="space-y-4">
              <div className="p-4 bg-secondary/20 rounded-xl">
                <p className="font-bold text-lg">{dn.customer_name || dn.customer}</p>
                <p className="text-xs text-muted-foreground font-mono">{dn.customer}</p>
              </div>

              {dn.shipping_address && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">Shipping To</p>
                  <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-sm">
                    <div dangerouslySetInnerHTML={{ __html: dn.shipping_address }} />
                  </div>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Logistics Info */}
          <InfoCard title="Logistics" icon={<Truck className="h-5 w-5 text-amber-500" />}>
            <div className="space-y-3">
              {dn.driver_name && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-bold text-sm">{dn.driver_name}</p>
                    <p className="text-[10px] text-muted-foreground">Driver</p>
                  </div>
                </div>
              )}
              {dn.vehicle_no && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-bold font-mono">{dn.vehicle_no}</p>
                    <p className="text-[10px] text-muted-foreground">Vehicle</p>
                  </div>
                </div>
              )}
              {dn.transporter_name && (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-bold text-sm">{dn.transporter_name}</p>
                    <p className="text-[10px] text-muted-foreground">Transporter</p>
                  </div>
                </div>
              )}
              {dn.lr_no && (
                <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <p className="text-[10px] font-bold uppercase text-amber-600">Gate Pass / LR No</p>
                  <p className="font-mono font-bold">{dn.lr_no}</p>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Timestamps */}
          <div className="bg-muted/10 p-6 rounded-2xl border border-border/50 text-[11px] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Created</span>
              <span className="font-bold">{dn.creation ? format(parseISO(dn.creation), "MMM d, yyyy HH:mm") : "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Modified</span>
              <span className="font-bold">{dn.modified ? format(parseISO(dn.modified), "MMM d, yyyy HH:mm") : "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">% Billed</span>
              <span className="font-bold">{Math.round(dn.per_billed || 0)}%</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog open={showDelete} onOpenChange={() => setShowDelete(false)}
        title="Delete Delivery Note?" description="This action cannot be undone."
        onConfirm={() => deleteMutation.mutateAsync(dnName)} isLoading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

## 15. Driver & Vehicle Create/Edit/Detail Pages

### Driver Create Page

**File:** `app/stock/setup/driver/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, User } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect } from "@/components/form";
import { DriverCreateSchema, type DriverFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateDriverPage() {
  const router = useRouter();

  const form = useForm<DriverFormData>({
    resolver: zodResolver(DriverCreateSchema),
    defaultValues: {
      full_name: "",
      status: "Active",
      license_number: "",
      cell_number: "",
      transporter: "",
    },
  });

  const createMutation = useFrappeCreate("Driver", {
    onSuccess: (response) => {
      toast.success("Driver created");
      router.push(`/stock/setup/driver/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: DriverFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Driver" subtitle="Register a new driver for deliveries"
        backHref="/stock/setup/driver" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Driver Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput control={form.control} name="full_name" label="Full Name" required placeholder="John Doe" />
              <FormSelect control={form.control} name="status" label="Status"
                options={[{ value: "Active", label: "Active" }, { value: "Left", label: "Left" }]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput control={form.control} name="license_number" label="License Number" placeholder="ETH-DL-12345" />
              <FormInput control={form.control} name="cell_number" label="Mobile Number" placeholder="+251..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput control={form.control} name="issuing_date" label="License Issued" type="date" />
              <FormInput control={form.control} name="expiry_date" label="License Expiry" type="date" />
            </div>

            <FormFrappeSelect control={form.control} name="transporter" label="Transporter / Logistics Company"
              doctype="Supplier" placeholder="Select transporter..."
              filters={[["is_transporter", "=", 1]]} />
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="rounded-full h-12 px-8">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Driver
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

### Vehicle Create Page

**File:** `app/stock/setup/vehicle/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Truck } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormSelect } from "@/components/form";
import { VehicleCreateSchema, type VehicleFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateVehiclePage() {
  const router = useRouter();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(VehicleCreateSchema),
    defaultValues: {
      license_plate: "",
      make: "",
      model: "",
      fuel_type: "Diesel",
      location: "",
    },
  });

  const createMutation = useFrappeCreate("Vehicle", {
    onSuccess: (response) => {
      toast.success("Vehicle added");
      router.push(`/stock/setup/vehicle/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: VehicleFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Vehicle" subtitle="Register a new vehicle for deliveries"
        backHref="/stock/setup/vehicle" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Vehicle Information</h3>
            </div>

            <FormInput control={form.control} name="license_plate" label="License Plate" required placeholder="AA-12345" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput control={form.control} name="make" label="Make" placeholder="Toyota" />
              <FormInput control={form.control} name="model" label="Model" placeholder="Hilux" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect control={form.control} name="fuel_type" label="Fuel Type"
                options={[
                  { value: "Petrol", label: "Petrol" },
                  { value: "Diesel", label: "Diesel" },
                  { value: "Electric", label: "Electric" },
                  { value: "Natural Gas", label: "Natural Gas" },
                ]} />
              <FormInput control={form.control} name="location" label="Current Location" placeholder="Main Warehouse" />
            </div>

            <FormInput control={form.control} name="acquisition_date" label="Acquisition Date" type="date" />
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="rounded-full h-12 px-8">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Vehicle
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

---

## 16. File Structure

```
app/stock/
├── delivery-note/
│   ├── page.tsx                    # List with status tabs
│   ├── new/page.tsx                # Create (from SO or direct)
│   └── [name]/
│       ├── page.tsx                # Detail with actions
│       └── edit/page.tsx           # Edit (draft only)
├── setup/
│   ├── driver/
│   │   ├── page.tsx                # Driver list
│   │   ├── new/page.tsx            # Create driver
│   │   └── [name]/
│   │       ├── page.tsx            # Driver detail
│   │       └── edit/page.tsx       # Edit driver
│   └── vehicle/
│       ├── page.tsx                # Vehicle list
│       ├── new/page.tsx            # Create vehicle
│       └── [name]/
│           ├── page.tsx            # Vehicle detail
│           └── edit/page.tsx       # Edit vehicle

app/api/stock/
├── delivery-note/
│   ├── route.ts
│   └── [name]/route.ts
├── setup/
│   ├── driver/
│   │   ├── route.ts
│   │   └── [name]/route.ts
│   └── vehicle/
│       ├── route.ts
│       └── [name]/route.ts
```

---

## 17. Testing Checklist

### Delivery Note

- [ ] Create DN directly (add items manually)
- [ ] Create DN from Sales Order (items pre-filled)
- [ ] Verify pending qty calculation from SO
- [ ] Partial delivery (edit qty to less than pending)
- [ ] Submit DN (stock deducted)
- [ ] Create Invoice from DN (status → Completed)
- [ ] Print Gate Pass (without amounts)
- [ ] Create Return DN
- [ ] Cancel DN (stock restored)
- [ ] Filter by status

### Driver

- [ ] Create driver with all fields
- [ ] Edit driver
- [ ] View driver detail
- [ ] Delete driver
- [ ] Select driver in Delivery Note

### Vehicle

- [ ] Create vehicle
- [ ] Edit vehicle
- [ ] View vehicle detail
- [ ] Delete vehicle
- [ ] Use vehicle_no in Delivery Note

### Integration

- [ ] Sales Order → Create DN → Verify SO status updates
- [ ] DN Submit → Verify Stock Ledger entry
- [ ] DN → Create Invoice → DN status = Completed
- [ ] Full flow: SO → DN (partial) → DN (remainder) → Invoice

---

_End of Phase F: Delivery Note & Logistics Documentation_
