# Phase G: Accounting & Finance - Part 4 (Sales Invoice)

> **Continuation of PHASE_G_ACCOUNTING_PART3.md**

---

## 12. Sales Invoice Module

### 12.1 Sales Invoice List Page

**File:** `app/accounting/sales-invoice/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MoreVertical, Pencil, Trash2, Search, FileText,
  CheckCircle2, Clock, XCircle, Eye, CreditCard, Calendar,
  AlertTriangle, RotateCcw, Building2, DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import type { SalesInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO, isPast } from "date-fns";

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Pencil },
  Unpaid: { color: "text-amber-600", bg: "bg-amber-100", icon: Clock },
  "Partly Paid": { color: "text-blue-600", bg: "bg-blue-100", icon: CreditCard },
  Paid: { color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2 },
  Overdue: { color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle },
  Return: { color: "text-purple-600", bg: "bg-purple-100", icon: RotateCcw },
  "Credit Note Issued": { color: "text-orange-600", bg: "bg-orange-100", icon: FileText },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

function SalesInvoiceCard({ invoice, index, onView, onEdit, onDelete, onMakePayment }) {
  // Determine display status (check if overdue)
  let displayStatus = invoice.status || "Draft";
  if (
    ["Unpaid", "Partly Paid"].includes(displayStatus) &&
    invoice.due_date &&
    isPast(parseISO(invoice.due_date))
  ) {
    displayStatus = "Overdue";
  }

  const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;
  const isDraft = invoice.docstatus === 0;
  const canPay = ["Unpaid", "Partly Paid", "Overdue"].includes(displayStatus);
  const isReturn = invoice.is_return === 1;

  const outstandingPercent = invoice.grand_total > 0
    ? ((invoice.outstanding_amount || 0) / invoice.grand_total) * 100
    : 0;
  const paidPercent = 100 - outstandingPercent;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
        displayStatus === "Overdue" ? "border-red-200 dark:border-red-800/50" : "border-border/50",
        isReturn ? "border-purple-200 dark:border-purple-800/50" : ""
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Return Badge */}
      {isReturn && (
        <div className="absolute -top-2 -left-2 px-2.5 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-full shadow-lg">
          CREDIT NOTE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border", statusConfig.bg, statusConfig.color)}>
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {invoice.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {invoice.posting_date ? format(parseISO(invoice.posting_date), "MMM d, yyyy") : "—"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            {isDraft && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {canPay && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMakePayment(); }}
                  className="text-emerald-600 focus:text-emerald-600">
                  <CreditCard className="h-4 w-4 mr-2" /> Make Payment
                </DropdownMenuItem>
              </>
            )}
            {isDraft && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Customer Info */}
      <div className="mb-4 p-3 bg-secondary/20 rounded-xl">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold truncate">{invoice.customer_name || invoice.customer}</span>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-secondary/10 rounded-xl">
          <p className="text-lg font-black text-foreground">
            {invoice.currency} {invoice.grand_total?.toLocaleString()}
          </p>
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total</p>
        </div>
        <div className={cn(
          "text-center p-3 rounded-xl",
          (invoice.outstanding_amount || 0) > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"
        )}>
          <p className={cn(
            "text-lg font-black",
            (invoice.outstanding_amount || 0) > 0 ? "text-amber-600" : "text-emerald-600"
          )}>
            {invoice.currency} {(invoice.outstanding_amount || 0).toLocaleString()}
          </p>
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Outstanding</p>
        </div>
      </div>

      {/* Payment Progress */}
      {!isReturn && invoice.grand_total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted-foreground uppercase font-bold tracking-wider">Paid</span>
            <span className="font-bold">{Math.round(paidPercent)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                paidPercent === 100 ? "bg-emerald-500" : "bg-blue-500"
              )}
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Due Date Warning */}
      {invoice.due_date && displayStatus !== "Paid" && (
        <div className={cn(
          "mb-4 p-2 rounded-lg text-center text-xs",
          displayStatus === "Overdue" ? "bg-red-500/10 text-red-600" : "bg-secondary/30 text-muted-foreground"
        )}>
          <Calendar className="h-3 w-3 inline mr-1" />
          Due: {format(parseISO(invoice.due_date), "MMM d, yyyy")}
          {displayStatus === "Overdue" && " (OVERDUE)"}
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
        <Badge className={cn("rounded-full text-[10px] font-bold border", statusConfig.bg, statusConfig.color)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {displayStatus}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {invoice.total_qty} items
        </span>
      </div>
    </div>
  );
}

export default function SalesInvoiceListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: invoices, isLoading, refetch } = useFrappeList<SalesInvoice>("Sales Invoice", {
    fields: [
      "name", "customer", "customer_name", "posting_date", "due_date",
      "status", "grand_total", "outstanding_amount", "total_qty",
      "currency", "is_return", "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Sales Invoice", {
    onSuccess: () => { toast.success("Invoice deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      const matchesSearch = !searchTerm ||
        inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = statusFilter === "all";
      if (!matchesStatus) {
        if (statusFilter === "overdue") {
          matchesStatus = ["Unpaid", "Partly Paid"].includes(inv.status || "") &&
            inv.due_date && isPast(parseISO(inv.due_date));
        } else {
          matchesStatus = inv.status === statusFilter;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    invoices?.forEach(inv => {
      counts.all++;
      counts[inv.status || "Draft"] = (counts[inv.status || "Draft"] || 0) + 1;
      // Count overdue
      if (["Unpaid", "Partly Paid"].includes(inv.status || "") && inv.due_date && isPast(parseISO(inv.due_date))) {
        counts.overdue = (counts.overdue || 0) + 1;
      }
    });
    return counts;
  }, [invoices]);

  if (isLoading) return <LoadingState message="Loading sales invoices..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage customer invoices and track receivables"
        primaryAction={{
          label: "New Invoice",
          onClick: () => router.push("/accounting/sales-invoice/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by invoice#, customer..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-secondary/30 p-1 rounded-full h-auto flex-wrap">
            <TabsTrigger value="all" className="rounded-full">All ({statusCounts.all || 0})</TabsTrigger>
            <TabsTrigger value="Unpaid" className="rounded-full">Unpaid</TabsTrigger>
            <TabsTrigger value="Partly Paid" className="rounded-full">Partly Paid</TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-full text-red-600">
              <AlertTriangle className="h-3 w-3 mr-1" /> Overdue ({statusCounts.overdue || 0})
            </TabsTrigger>
            <TabsTrigger value="Paid" className="rounded-full">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Outstanding</p>
          <p className="text-2xl font-black text-amber-600">
            ETB {invoices?.reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overdue Amount</p>
          <p className="text-2xl font-black text-red-600">
            ETB {invoices?.filter(inv =>
              ["Unpaid", "Partly Paid"].includes(inv.status || "") &&
              inv.due_date && isPast(parseISO(inv.due_date))
            ).reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paid This Month</p>
          <p className="text-2xl font-black text-emerald-600">
            ETB {invoices?.filter(inv => inv.status === "Paid").reduce((sum, inv) => sum + (inv.grand_total || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Invoices</p>
          <p className="text-2xl font-black text-foreground">{invoices?.length || 0}</p>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found"
          description={searchTerm ? "Try different search terms" : "Create your first sales invoice"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((inv, idx) => (
            <SalesInvoiceCard key={inv.name} invoice={inv} index={idx}
              onView={() => router.push(`/accounting/sales-invoice/${encodeURIComponent(inv.name)}`)}
              onEdit={() => router.push(`/accounting/sales-invoice/${encodeURIComponent(inv.name)}/edit`)}
              onDelete={() => setDeleteTarget(inv.name)}
              onMakePayment={() => router.push(`/accounting/payment-entry/new?payment_type=Receive&party_type=Customer&party=${encodeURIComponent(inv.customer || "")}&reference_doctype=Sales Invoice&reference_name=${encodeURIComponent(inv.name)}`)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Delete Sales Invoice?" description="This will permanently delete this invoice."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

### 12.2 Sales Invoice Create Page

**File:** `app/accounting/sales-invoice/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, FileText, Plus, Trash2, Package,
  Building2, Calendar, AlertTriangle, CheckCircle2,
  CreditCard, Wallet, AlertCircle,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFrappeCreate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { useCustomerCreditCheck } from "@/hooks/use-customer-credit";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch, FormTextarea } from "@/components/form";
import { SalesInvoiceCreateSchema, type SalesInvoiceFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DeliveryNote, SalesOrder } from "@/types/doctype-types";
import { addDays, format } from "date-fns";

function CreateSalesInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-population sources
  const preDeliveryNote = searchParams.get("delivery_note");
  const preSalesOrder = searchParams.get("sales_order");
  const preCustomer = searchParams.get("customer");

  const form = useForm<SalesInvoiceFormData>({
    resolver: zodResolver(SalesInvoiceCreateSchema),
    defaultValues: {
      naming_series: "ACC-SINV-.YYYY.-",
      customer: preCustomer || "",
      posting_date: new Date().toISOString().split('T')[0],
      posting_time: new Date().toTimeString().slice(0, 5),
      due_date: addDays(new Date(), 30).toISOString().split('T')[0],
      company: "",
      items: [],
      debit_to: "",
      currency: "ETB",
      conversion_rate: 1,
      is_pos: 0,
      is_return: 0,
    },
  });

  const customer = form.watch("customer");
  const items = form.watch("items");

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Credit limit check
  const { outstanding, creditLimit, isOverLimit, availableCredit, hasLimit } = useCustomerCreditCheck(customer);

  // Fetch Delivery Note to pre-fill
  const { data: dnDetails } = useFrappeDoc<DeliveryNote>("Delivery Note", preDeliveryNote || "", { enabled: !!preDeliveryNote });

  // Fetch Sales Order to pre-fill
  const { data: soDetails } = useFrappeDoc<SalesOrder>("Sales Order", preSalesOrder || "", { enabled: !!preSalesOrder && !preDeliveryNote });

  // Pre-fill from Delivery Note
  useEffect(() => {
    if (dnDetails) {
      form.setValue("customer", dnDetails.customer || "");
      form.setValue("company", dnDetails.company);
      form.setValue("currency", dnDetails.currency || "ETB");
      form.setValue("conversion_rate", dnDetails.conversion_rate || 1);
      form.setValue("shipping_address_name", dnDetails.shipping_address_name);
      form.setValue("customer_address", dnDetails.customer_address);
      form.setValue("po_no", dnDetails.po_no);

      // Map DN items to invoice items
      if (dnDetails.items?.length > 0) {
        const invItems = dnDetails.items.map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          qty: item.qty,
          uom: item.uom,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
          delivery_note: preDeliveryNote,
          dn_detail: item.name,
          income_account: item.income_account,
        }));
        replace(invItems);
      }
    }
  }, [dnDetails, form, replace, preDeliveryNote]);

  // Pre-fill from Sales Order (if no DN)
  useEffect(() => {
    if (soDetails && !preDeliveryNote) {
      form.setValue("customer", soDetails.customer);
      form.setValue("company", soDetails.company);
      form.setValue("currency", soDetails.currency);
      form.setValue("conversion_rate", soDetails.conversion_rate);
      form.setValue("selling_price_list", soDetails.selling_price_list);
      form.setValue("po_no", soDetails.po_no);
      form.setValue("payment_terms_template", soDetails.payment_terms_template);

      // Map SO items (unbilled portion)
      if (soDetails.items?.length > 0) {
        const invItems = soDetails.items
          .filter((item: any) => (item.qty - (item.billed_qty || 0)) > 0)
          .map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description,
            qty: item.qty - (item.billed_qty || 0),
            uom: item.uom,
            rate: item.rate,
            amount: (item.qty - (item.billed_qty || 0)) * item.rate,
            warehouse: item.warehouse,
            sales_order: preSalesOrder,
            so_detail: item.name,
          }));
        replace(invItems);
      }
    }
  }, [soDetails, form, replace, preSalesOrder, preDeliveryNote]);

  const createMutation = useFrappeCreate("Sales Invoice", {
    onSuccess: (response) => {
      toast.success("Sales Invoice created");
      router.push(`/accounting/sales-invoice/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: SalesInvoiceFormData) => {
    // Calculate totals
    const total = data.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);

    const payload = {
      ...data,
      docstatus: 0,
      items: data.items.map((item, idx) => ({
        ...item,
        idx: idx + 1,
        amount: item.qty * item.rate,
        doctype: "Sales Invoice Item",
      })),
      total,
      net_total: total,
      base_net_total: total * (data.conversion_rate || 1),
      grand_total: total,
      base_grand_total: total * (data.conversion_rate || 1),
    };

    createMutation.mutate(payload);
  };

  const totalAmount = items.reduce((sum, item) => sum + ((item.qty || 0) * (item.rate || 0)), 0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Credit Limit Warning */}
        {isOverLimit && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Credit Limit Exceeded!</strong> Customer outstanding: ETB {outstanding.toLocaleString()}.
              Credit limit: ETB {creditLimit.toLocaleString()}.
              You can still proceed, but payment collection is recommended.
            </AlertDescription>
          </Alert>
        )}

        {hasLimit && !isOverLimit && availableCredit < totalAmount && (
          <Alert className="rounded-xl border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-600">
              This invoice ({totalAmount.toLocaleString()}) may exceed available credit ({availableCredit.toLocaleString()}).
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Customer & Date */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">Invoice Details</h3>
                  <p className="text-xs text-muted-foreground">Customer and date information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect control={form.control} name="customer" label="Customer"
                  doctype="Customer" required placeholder="Select customer..." />
                <FormFrappeSelect control={form.control} name="company" label="Company"
                  doctype="Company" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput control={form.control} name="posting_date" label="Invoice Date" type="date" required />
                <FormInput control={form.control} name="due_date" label="Due Date" type="date" />
                <FormInput control={form.control} name="po_no" label="Customer PO#" placeholder="Reference" />
              </div>

              {/* Source reference */}
              {preDeliveryNote && (
                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                  <p className="text-[10px] font-bold uppercase text-blue-600 tracking-widest mb-1">From Delivery Note</p>
                  <p className="font-bold text-blue-700">{preDeliveryNote}</p>
                </div>
              )}
              {preSalesOrder && !preDeliveryNote && (
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <p className="text-[10px] font-bold uppercase text-indigo-600 tracking-widest mb-1">From Sales Order</p>
                  <p className="font-bold text-indigo-700">{preSalesOrder}</p>
                </div>
              )}
            </div>

            {/* Accounting */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg tracking-tight">Accounting</h3>
                  <p className="text-xs text-muted-foreground">Receivable account and cost center</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect control={form.control} name="debit_to" label="Debit To (Receivable Account)"
                  doctype="Account" required placeholder="Select receivable account..."
                  filters={[["account_type", "=", "Receivable"], ["is_group", "=", 0]]} />
                <FormFrappeSelect control={form.control} name="cost_center" label="Cost Center"
                  doctype="Cost Center" placeholder="Optional"
                  filters={[["is_group", "=", 0]]} />
              </div>

              <FormFrappeSelect control={form.control} name="payment_terms_template" label="Payment Terms"
                doctype="Payment Terms Template" placeholder="e.g., Net 30" />
            </div>

            {/* Items */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-tight">Invoice Items</h3>
                    <p className="text-xs text-muted-foreground">
                      {preDeliveryNote ? "Pre-filled from Delivery Note" : preSalesOrder ? "Pre-filled from Sales Order" : "Add items to invoice"}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-full"
                  onClick={() => append({ item_code: "", qty: 1, uom: "Nos", rate: 0 })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground text-sm font-medium">No items added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-1"></div>
                  </div>

                  {fields.map((field, index) => {
                    const qty = form.watch(`items.${index}.qty`) || 0;
                    const rate = form.watch(`items.${index}.rate`) || 0;
                    const amount = qty * rate;

                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-4 bg-secondary/20 rounded-xl">
                        <div className="col-span-5">
                          <FormFrappeSelect control={form.control} name={`items.${index}.item_code`}
                            doctype="Item" placeholder="Select item..." />
                        </div>
                        <div className="col-span-2">
                          <FormInput control={form.control} name={`items.${index}.qty`} type="number" />
                        </div>
                        <div className="col-span-2">
                          <FormInput control={form.control} name={`items.${index}.rate`} type="number" />
                        </div>
                        <div className="col-span-2 flex items-center h-10 px-3 bg-secondary/30 rounded-lg font-bold text-sm">
                          {amount.toLocaleString()}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
                            className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-sm">
              <FormTextarea control={form.control} name="remarks" label="Internal Remarks"
                placeholder="Notes (not printed on invoice)" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-[2rem] border border-border/50 p-8 shadow-xl shadow-primary/5 sticky top-6 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Invoice Summary
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
                    <p className="text-2xl font-black text-blue-600">
                      {items.reduce((sum, item) => sum + (item.qty || 0), 0)}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-blue-600/70">Qty</p>
                  </div>
                </div>

                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Grand Total</p>
                  <p className="text-3xl font-black text-primary">
                    ETB {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Credit Info */}
                {hasLimit && (
                  <div className={cn(
                    "p-4 rounded-xl border",
                    isOverLimit ? "bg-red-500/10 border-red-500/20" : "bg-secondary/20 border-border/50"
                  )}>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Credit Status</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Limit:</span>
                        <span className="font-bold">{creditLimit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Outstanding:</span>
                        <span className="font-bold">{outstanding.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>Available:</span>
                        <span className={cn("font-bold", isOverLimit ? "text-red-600" : "text-emerald-600")}>
                          {availableCredit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={createMutation.isPending || fields.length === 0}
                className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20 uppercase tracking-widest text-[11px]">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function CreateSalesInvoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Sales Invoice" subtitle="Create customer invoice"
        backHref="/accounting/sales-invoice" />
      <Suspense fallback={<LoadingState />}>
        <CreateSalesInvoiceForm />
      </Suspense>
    </div>
  );
}
```

---

### 12.3 Sales Invoice Detail Page

**File:** `app/accounting/sales-invoice/[name]/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil, Trash2, FileText, Package, Calendar,
  CheckCircle2, Clock, XCircle, CreditCard, RotateCcw,
  Building2, Printer, AlertTriangle, Wallet,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete, useFrappeUpdate } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { SalesInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { format, parseISO, isPast } from "date-fns";

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-50", icon: Pencil },
  Unpaid: { color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  "Partly Paid": { color: "text-blue-600", bg: "bg-blue-50", icon: CreditCard },
  Paid: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  Overdue: { color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
  Return: { color: "text-purple-600", bg: "bg-purple-50", icon: RotateCcw },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-50", icon: XCircle },
};

export default function SalesInvoiceDetailPage() {
  const { name } = useParams();
  const router = useRouter();
  const invName = decodeURIComponent(name as string);
  const [showDelete, setShowDelete] = useState(false);

  const { data: invoice, isLoading, refetch, error } = useFrappeDoc<SalesInvoice>("Sales Invoice", invName);

  const deleteMutation = useFrappeDelete("Sales Invoice", {
    onSuccess: () => { toast.success("Invoice deleted"); router.push("/accounting/sales-invoice"); },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useFrappeUpdate("Sales Invoice", {
    onSuccess: () => { refetch(); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState type="detail" />;
  if (error || !invoice) return <EmptyState icon={FileText} title="Invoice not found" />;

  // Determine display status
  let displayStatus = invoice.status || "Draft";
  if (
    ["Unpaid", "Partly Paid"].includes(displayStatus) &&
    invoice.due_date &&
    isPast(parseISO(invoice.due_date))
  ) {
    displayStatus = "Overdue";
  }

  const statusConfig = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Draft;
  const isDraft = invoice.docstatus === 0;
  const canPay = ["Unpaid", "Partly Paid", "Overdue"].includes(displayStatus);
  const isReturn = invoice.is_return === 1;

  const paidAmount = (invoice.grand_total || 0) - (invoice.outstanding_amount || 0);
  const paidPercent = invoice.grand_total > 0 ? (paidAmount / invoice.grand_total) * 100 : 0;

  const handleSubmit = async () => {
    await updateMutation.mutateAsync({ name: invName, data: { docstatus: 1 } });
    toast.success("Invoice submitted");
  };

  const handleCancel = async () => {
    await updateMutation.mutateAsync({ name: invName, data: { docstatus: 2 } });
    toast.success("Invoice cancelled");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.name}
        subtitle={`Invoice to ${invoice.customer_name || invoice.customer}`}
        backHref="/accounting/sales-invoice"
        icon={<FileText className="h-5 w-5 text-primary" />}
        actions={
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button variant="outline" className="rounded-full h-9"
                  onClick={() => router.push(`/accounting/sales-invoice/${encodeURIComponent(invName)}/edit`)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button onClick={handleSubmit} disabled={updateMutation.isPending}
                  className="rounded-full h-9 shadow-lg shadow-primary/10">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Submit
                </Button>
              </>
            )}

            {canPay && (
              <Button
                onClick={() => router.push(`/accounting/payment-entry/new?payment_type=Receive&party_type=Customer&party=${encodeURIComponent(invoice.customer || "")}&reference_doctype=Sales Invoice&reference_name=${encodeURIComponent(invName)}`)}
                className="rounded-full h-9 shadow-lg shadow-emerald-500/10 bg-emerald-600 hover:bg-emerald-700">
                <CreditCard className="h-4 w-4 mr-2" /> Make Payment
              </Button>
            )}

            <Button variant="outline" className="rounded-full h-9">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>

            {!isReturn && invoice.docstatus === 1 && (
              <Button variant="outline"
                onClick={() => router.push(`/accounting/sales-invoice/new?is_return=1&return_against=${encodeURIComponent(invName)}`)}
                className="rounded-full h-9 text-purple-600 border-purple-200 hover:bg-purple-50">
                <RotateCcw className="h-4 w-4 mr-2" /> Create Credit Note
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

      {/* Status Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Badge className={cn("px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm",
              statusConfig.bg, statusConfig.color)}>
              <statusConfig.icon className="h-4 w-4 mr-2" />
              {displayStatus}
            </Badge>
            {isReturn && (
              <Badge className="bg-purple-100 text-purple-600 border-purple-200 rounded-full px-3 py-1">
                Credit Note
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm">
            <DataPoint icon={<Calendar className="h-4 w-4 text-blue-500" />} label="Invoice Date"
              value={invoice.posting_date ? format(parseISO(invoice.posting_date), "PPP") : "—"} />
            {invoice.due_date && (
              <DataPoint icon={<Clock className="h-4 w-4 text-amber-500" />} label="Due Date"
                value={format(parseISO(invoice.due_date), "PPP")} />
            )}
          </div>
        </div>

        {/* Payment Progress */}
        {!isReturn && invoice.grand_total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Payment Progress</span>
              <span className="font-bold">
                ETB {paidAmount.toLocaleString()} / {invoice.grand_total.toLocaleString()} ({Math.round(paidPercent)}%)
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  paidPercent === 100 ? "bg-emerald-500" : paidPercent > 0 ? "bg-blue-500" : "bg-gray-300"
                )}
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <InfoCard title="Invoice Items" icon={<Package className="h-5 w-5 text-emerald-500" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Item</th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Qty</th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Rate</th>
                    <th className="text-right py-3 px-2 font-medium uppercase text-[10px] tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="py-4 px-2">
                        <div className="font-bold">{item.item_name || item.item_code}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{item.item_code}</div>
                      </td>
                      <td className="text-right py-4 px-2 font-black">{item.qty} {item.uom}</td>
                      <td className="text-right py-4 px-2">{item.rate?.toLocaleString()}</td>
                      <td className="text-right py-4 px-2 font-bold">{item.amount?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/20">
                    <td colSpan={3} className="text-right py-4 px-2 font-black uppercase text-xs">Grand Total</td>
                    <td className="text-right py-4 px-2 font-black text-lg text-primary">
                      {invoice.currency} {invoice.grand_total?.toLocaleString()}
                    </td>
                  </tr>
                  {displayStatus !== "Paid" && (
                    <tr className="bg-amber-500/10">
                      <td colSpan={3} className="text-right py-4 px-2 font-black uppercase text-xs text-amber-600">Outstanding</td>
                      <td className="text-right py-4 px-2 font-black text-lg text-amber-600">
                        {invoice.currency} {(invoice.outstanding_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          {/* Customer */}
          <InfoCard title="Customer" icon={<Building2 className="h-5 w-5 text-primary" />}>
            <div className="p-4 bg-secondary/20 rounded-xl">
              <p className="font-bold text-lg">{invoice.customer_name || invoice.customer}</p>
              <p className="text-xs text-muted-foreground font-mono">{invoice.customer}</p>
            </div>
            {invoice.address_display && (
              <div className="mt-4 p-3 bg-secondary/10 rounded-lg text-sm"
                dangerouslySetInnerHTML={{ __html: invoice.address_display }} />
            )}
          </InfoCard>

          {/* Accounting */}
          <InfoCard title="Accounting" icon={<Wallet className="h-5 w-5 text-amber-500" />}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Debit To</span>
                <span className="font-mono text-xs">{invoice.debit_to}</span>
              </div>
              {invoice.cost_center && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Center</span>
                  <span className="font-mono text-xs">{invoice.cost_center}</span>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Timestamps */}
          <div className="bg-muted/10 p-6 rounded-2xl border text-[11px] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Created</span>
              <span className="font-bold">{invoice.creation ? format(parseISO(invoice.creation), "MMM d, yyyy HH:mm") : "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Modified</span>
              <span className="font-bold">{invoice.modified ? format(parseISO(invoice.modified), "MMM d, yyyy HH:mm") : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog open={showDelete} onOpenChange={() => setShowDelete(false)}
        title="Delete Sales Invoice?" description="This action cannot be undone."
        onConfirm={() => deleteMutation.mutateAsync(invName)} isLoading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

_See Part 5 for Purchase Invoice & Payment Entry Pages_
