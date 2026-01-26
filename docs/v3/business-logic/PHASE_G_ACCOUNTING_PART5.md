# Phase G: Accounting & Finance - Part 5 (Purchase Invoice & Payment Entry)

> **Continuation of PHASE_G_ACCOUNTING_PART4.md**

---

## 13. Purchase Invoice Module

### 13.1 Purchase Invoice List Page

**File:** `app/accounting/purchase-invoice/page.tsx`

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
  AlertTriangle, Building2, DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import type { PurchaseInvoice } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO, isPast } from "date-fns";

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Pencil },
  Unpaid: { color: "text-amber-600", bg: "bg-amber-100", icon: Clock },
  "Partly Paid": { color: "text-blue-600", bg: "bg-blue-100", icon: CreditCard },
  Paid: { color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2 },
  Overdue: { color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

export default function PurchaseInvoiceListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: invoices, isLoading, refetch } = useFrappeList<PurchaseInvoice>("Purchase Invoice", {
    fields: [
      "name", "supplier", "supplier_name", "posting_date", "due_date",
      "status", "grand_total", "outstanding_amount", "bill_no", "currency", "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Purchase Invoice", {
    onSuccess: () => { toast.success("Invoice deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      const matchesSearch = !searchTerm ||
        inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.bill_no?.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === "all") return matchesSearch;
      if (statusFilter === "overdue") {
        return matchesSearch && ["Unpaid", "Partly Paid"].includes(inv.status || "") &&
          inv.due_date && isPast(parseISO(inv.due_date));
      }
      return matchesSearch && inv.status === statusFilter;
    });
  }, [invoices, searchTerm, statusFilter]);

  if (isLoading) return <LoadingState message="Loading purchase invoices..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Invoices"
        subtitle="Manage vendor bills and track payables"
        primaryAction={{
          label: "New Invoice",
          onClick: () => router.push("/accounting/purchase-invoice/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by invoice#, supplier, bill#..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-secondary/30 p-1 rounded-full">
            <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
            <TabsTrigger value="Unpaid" className="rounded-full">Unpaid</TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-full text-red-600">Overdue</TabsTrigger>
            <TabsTrigger value="Paid" className="rounded-full">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground uppercase mb-1">Total Payable</p>
          <p className="text-2xl font-black text-amber-600">
            ETB {invoices?.reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground uppercase mb-1">Overdue</p>
          <p className="text-2xl font-black text-red-600">
            ETB {invoices?.filter(inv =>
              ["Unpaid", "Partly Paid"].includes(inv.status || "") &&
              inv.due_date && isPast(parseISO(inv.due_date))
            ).reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-xs text-muted-foreground uppercase mb-1">Paid This Month</p>
          <p className="text-2xl font-black text-emerald-600">
            ETB {invoices?.filter(inv => inv.status === "Paid")
              .reduce((sum, inv) => sum + (inv.grand_total || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices found" />
      ) : (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30">
              <tr>
                <th className="text-left p-4 font-bold">Invoice</th>
                <th className="text-left p-4 font-bold">Supplier</th>
                <th className="text-left p-4 font-bold">Bill #</th>
                <th className="text-left p-4 font-bold">Date</th>
                <th className="text-right p-4 font-bold">Total</th>
                <th className="text-right p-4 font-bold">Outstanding</th>
                <th className="text-center p-4 font-bold">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                let displayStatus = inv.status || "Draft";
                if (["Unpaid", "Partly Paid"].includes(displayStatus) && inv.due_date && isPast(parseISO(inv.due_date))) {
                  displayStatus = "Overdue";
                }
                const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.Draft;
                const isDraft = inv.docstatus === 0;
                const canPay = ["Unpaid", "Partly Paid", "Overdue"].includes(displayStatus);

                return (
                  <tr key={inv.name} className="border-t hover:bg-secondary/10 cursor-pointer"
                    onClick={() => router.push(`/accounting/purchase-invoice/${encodeURIComponent(inv.name)}`)}>
                    <td className="p-4 font-bold">{inv.name}</td>
                    <td className="p-4">{inv.supplier_name || inv.supplier}</td>
                    <td className="p-4 font-mono text-xs">{inv.bill_no || "—"}</td>
                    <td className="p-4">{inv.posting_date ? format(parseISO(inv.posting_date), "MMM d, yyyy") : "—"}</td>
                    <td className="p-4 text-right font-bold">{inv.grand_total?.toLocaleString()}</td>
                    <td className={cn("p-4 text-right font-bold",
                      (inv.outstanding_amount || 0) > 0 ? "text-amber-600" : "text-emerald-600")}>
                      {(inv.outstanding_amount || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={cn("rounded-full text-[10px]", config.bg, config.color)}>
                        {displayStatus}
                      </Badge>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => router.push(`/accounting/purchase-invoice/${encodeURIComponent(inv.name)}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          {canPay && (
                            <DropdownMenuItem onClick={() => router.push(
                              `/accounting/payment-entry/new?payment_type=Pay&party_type=Supplier&party=${encodeURIComponent(inv.supplier || "")}&reference_doctype=Purchase Invoice&reference_name=${encodeURIComponent(inv.name)}`
                            )} className="text-emerald-600">
                              <CreditCard className="h-4 w-4 mr-2" /> Make Payment
                            </DropdownMenuItem>
                          )}
                          {isDraft && (
                            <DropdownMenuItem onClick={() => setDeleteTarget(inv.name)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Delete Purchase Invoice?" onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

## 14. Payment Entry Module

### 14.1 Payment Entry List Page

**File:** `app/accounting/payment-entry/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  CheckCircle2, Pencil, XCircle, Eye, MoreVertical, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import type { PaymentEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const TYPE_CONFIG = {
  Receive: { color: "text-emerald-600", bg: "bg-emerald-100", icon: ArrowDownLeft, label: "Receipt" },
  Pay: { color: "text-red-600", bg: "bg-red-100", icon: ArrowUpRight, label: "Payment" },
  "Internal Transfer": { color: "text-blue-600", bg: "bg-blue-100", icon: ArrowRightLeft, label: "Transfer" },
};

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Pencil },
  Submitted: { color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2 },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

export default function PaymentEntryListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: payments, isLoading, refetch } = useFrappeList<PaymentEntry>("Payment Entry", {
    fields: [
      "name", "payment_type", "posting_date", "party_type", "party", "party_name",
      "paid_amount", "received_amount", "mode_of_payment", "reference_no", "status", "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Payment Entry", {
    onSuccess: () => { toast.success("Payment deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!payments) return [];
    return payments.filter(p => {
      const matchesSearch = !searchTerm ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.party?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference_no?.toLowerCase().includes(searchTerm.toLowerCase());

      if (typeFilter === "all") return matchesSearch;
      return matchesSearch && p.payment_type === typeFilter;
    });
  }, [payments, searchTerm, typeFilter]);

  const totals = useMemo(() => {
    const received = payments?.filter(p => p.payment_type === "Receive" && p.docstatus === 1)
      .reduce((sum, p) => sum + (p.received_amount || 0), 0) || 0;
    const paid = payments?.filter(p => p.payment_type === "Pay" && p.docstatus === 1)
      .reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0;
    return { received, paid };
  }, [payments]);

  if (isLoading) return <LoadingState message="Loading payments..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Entries"
        subtitle="Record and track all cash movements"
        primaryAction={{
          label: "New Payment",
          onClick: () => router.push("/accounting/payment-entry/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by #, party, reference..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="bg-secondary/30 p-1 rounded-full">
            <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
            <TabsTrigger value="Receive" className="rounded-full">
              <ArrowDownLeft className="h-3 w-3 mr-1" /> Received
            </TabsTrigger>
            <TabsTrigger value="Pay" className="rounded-full">
              <ArrowUpRight className="h-3 w-3 mr-1" /> Paid
            </TabsTrigger>
            <TabsTrigger value="Internal Transfer" className="rounded-full">
              <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfers
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <ArrowDownLeft className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Total Received</p>
            <p className="text-2xl font-black text-emerald-600">ETB {totals.received.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center">
            <ArrowUpRight className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Total Paid Out</p>
            <p className="text-2xl font-black text-red-600">ETB {totals.paid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title="No payments found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((payment, idx) => {
            const typeConfig = TYPE_CONFIG[payment.payment_type] || TYPE_CONFIG.Receive;
            const statusConfig = STATUS_CONFIG[payment.status || "Draft"] || STATUS_CONFIG.Draft;
            const TypeIcon = typeConfig.icon;
            const isDraft = payment.docstatus === 0;
            const amount = payment.payment_type === "Receive" ? payment.received_amount : payment.paid_amount;

            return (
              <div key={payment.name}
                className={cn(
                  "bg-card rounded-2xl border p-6 cursor-pointer group",
                  "hover:shadow-lg hover:border-primary/20 transition-all",
                  "animate-in fade-in slide-in-from-bottom-4"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => router.push(`/accounting/payment-entry/${encodeURIComponent(payment.name)}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", typeConfig.bg)}>
                      <TypeIcon className={cn("h-6 w-6", typeConfig.color)} />
                    </div>
                    <div>
                      <h3 className="font-bold group-hover:text-primary transition-colors">{payment.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {payment.posting_date ? format(parseISO(payment.posting_date), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/accounting/payment-entry/${encodeURIComponent(payment.name)}`); }}>
                        <Eye className="h-4 w-4 mr-2" /> View
                      </DropdownMenuItem>
                      {isDraft && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteTarget(payment.name); }} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {payment.party && (
                  <div className="mb-4 p-3 bg-secondary/20 rounded-xl">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">{payment.party_type}</p>
                    <p className="font-bold truncate">{payment.party_name || payment.party}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className={cn("text-xl font-black", typeConfig.color)}>
                    ETB {amount?.toLocaleString()}
                  </p>
                  <Badge className={cn("rounded-full text-[10px]", statusConfig.bg, statusConfig.color)}>
                    {payment.status || "Draft"}
                  </Badge>
                </div>

                {payment.mode_of_payment && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    via {payment.mode_of_payment}
                    {payment.reference_no && ` • Ref: ${payment.reference_no}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Delete Payment Entry?" onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

### 14.2 Payment Entry Create Page

**File:** `app/accounting/payment-entry/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  Plus, Trash2, CreditCard, Building2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFrappeCreate } from "@/hooks/generic";
import { useOutstandingInvoices } from "@/hooks/use-outstanding-invoices";
import { useAccountBalance } from "@/hooks/use-account-balance";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect, FormTextarea } from "@/components/form";
import { PaymentEntryCreateSchema, type PaymentEntryFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAYMENT_TYPE_CONFIG = {
  Receive: { icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-100", partyType: "Customer" },
  Pay: { icon: ArrowUpRight, color: "text-red-600", bg: "bg-red-100", partyType: "Supplier" },
  "Internal Transfer": { icon: ArrowRightLeft, color: "text-blue-600", bg: "bg-blue-100", partyType: null },
};

function CreatePaymentEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prePaymentType = searchParams.get("payment_type") as "Receive" | "Pay" | "Internal Transfer" || "Receive";
  const prePartyType = searchParams.get("party_type") || "";
  const preParty = searchParams.get("party") || "";
  const preRefDoctype = searchParams.get("reference_doctype") || "";
  const preRefName = searchParams.get("reference_name") || "";

  const form = useForm<PaymentEntryFormData>({
    resolver: zodResolver(PaymentEntryCreateSchema),
    defaultValues: {
      naming_series: "ACC-PAY-.YYYY.-",
      payment_type: prePaymentType,
      posting_date: new Date().toISOString().split('T')[0],
      company: "",
      party_type: prePartyType,
      party: preParty,
      paid_from: "",
      paid_from_account_currency: "ETB",
      paid_to: "",
      paid_to_account_currency: "ETB",
      paid_amount: 0,
      received_amount: 0,
      source_exchange_rate: 1,
      target_exchange_rate: 1,
      mode_of_payment: "",
      reference_no: "",
      references: [],
    },
  });

  const paymentType = form.watch("payment_type");
  const partyType = form.watch("party_type");
  const party = form.watch("party");
  const paidFrom = form.watch("paid_from");
  const company = form.watch("company");
  const paidAmount = form.watch("paid_amount");

  const { fields: refFields, append: appendRef, remove: removeRef, replace: replaceRefs } = useFieldArray({
    control: form.control,
    name: "references",
  });

  // Get outstanding invoices for selected party
  const { data: outstandingInvoices, isLoading: loadingOutstanding } = useOutstandingInvoices(partyType, party, company);

  // Check bank balance for Pay type
  const { data: bankBalance } = useAccountBalance(paymentType === "Pay" ? paidFrom : undefined, company);

  const typeConfig = PAYMENT_TYPE_CONFIG[paymentType] || PAYMENT_TYPE_CONFIG.Receive;
  const TypeIcon = typeConfig.icon;

  // Set party type based on payment type
  useEffect(() => {
    if (paymentType === "Receive" && !partyType) {
      form.setValue("party_type", "Customer");
    } else if (paymentType === "Pay" && !partyType) {
      form.setValue("party_type", "Supplier");
    }
  }, [paymentType, partyType, form]);

  // Auto-add reference if passed in URL
  useEffect(() => {
    if (preRefDoctype && preRefName && refFields.length === 0) {
      appendRef({
        reference_doctype: preRefDoctype as any,
        reference_name: preRefName,
        allocated_amount: 0,
      });
    }
  }, [preRefDoctype, preRefName, refFields.length, appendRef]);

  const handleGetOutstanding = () => {
    if (!outstandingInvoices?.length) {
      toast.info("No outstanding invoices found");
      return;
    }

    const refs = outstandingInvoices.map(inv => ({
      reference_doctype: inv.voucher_type as any,
      reference_name: inv.voucher_no,
      due_date: inv.due_date,
      total_amount: inv.invoice_amount,
      outstanding_amount: inv.outstanding_amount,
      allocated_amount: 0,
    }));
    replaceRefs(refs);
  };

  const totalAllocated = refFields.reduce((sum, _, idx) =>
    sum + (form.watch(`references.${idx}.allocated_amount`) || 0), 0);

  const createMutation = useFrappeCreate("Payment Entry", {
    onSuccess: (response) => {
      toast.success("Payment recorded");
      router.push(`/accounting/payment-entry/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: PaymentEntryFormData) => {
    // Sync amounts for same currency
    if (data.paid_from_account_currency === data.paid_to_account_currency) {
      data.received_amount = data.paid_amount;
    }

    const payload = {
      ...data,
      docstatus: 0,
      base_paid_amount: data.paid_amount,
      base_received_amount: data.received_amount,
      references: data.references?.map((ref, idx) => ({
        ...ref,
        idx: idx + 1,
        doctype: "Payment Entry Reference",
      })),
    };

    createMutation.mutate(payload);
  };

  const lowBalanceWarning = paymentType === "Pay" && bankBalance !== undefined && bankBalance < paidAmount;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Low Balance Warning */}
        {lowBalanceWarning && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Low Balance!</strong> Account balance: ETB {bankBalance?.toLocaleString()}.
              Payment amount: ETB {paidAmount.toLocaleString()}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Type */}
            <div className="bg-card rounded-[2rem] border p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", typeConfig.bg)}>
                  <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Payment Details</h3>
                  <p className="text-xs text-muted-foreground">Type and party information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormSelect control={form.control} name="payment_type" label="Payment Type" required
                  options={[
                    { value: "Receive", label: "Receive (from Customer)" },
                    { value: "Pay", label: "Pay (to Supplier)" },
                    { value: "Internal Transfer", label: "Internal Transfer" },
                  ]} />
                <FormInput control={form.control} name="posting_date" label="Date" type="date" required />
                <FormFrappeSelect control={form.control} name="company" label="Company" doctype="Company" required />
              </div>

              {paymentType !== "Internal Transfer" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormSelect control={form.control} name="party_type" label="Party Type" required
                    options={[
                      { value: "Customer", label: "Customer" },
                      { value: "Supplier", label: "Supplier" },
                    ]} />
                  <FormFrappeSelect control={form.control} name="party" label="Party" required
                    doctype={partyType || "Customer"} placeholder={`Select ${partyType?.toLowerCase()}...`} />
                </div>
              )}
            </div>

            {/* Accounts & Amount */}
            <div className="bg-card rounded-[2rem] border p-8 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Accounts & Amount
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormFrappeSelect control={form.control} name="paid_from" label="Paid From" required
                  doctype="Account" placeholder="Select source account..."
                  filters={[["is_group", "=", 0], ["account_type", "in", ["Bank", "Cash"]]]} />
                <FormFrappeSelect control={form.control} name="paid_to" label="Paid To" required
                  doctype="Account" placeholder="Select destination account..."
                  filters={[["is_group", "=", 0]]} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput control={form.control} name="paid_amount" label="Paid Amount" type="number" required
                  placeholder="0.00" />
                <FormInput control={form.control} name="received_amount" label="Received Amount" type="number" required
                  placeholder="0.00" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormFrappeSelect control={form.control} name="mode_of_payment" label="Mode of Payment"
                  doctype="Mode of Payment" placeholder="Cash, Bank, etc" />
                <FormInput control={form.control} name="reference_no" label="Reference / Check #"
                  placeholder="Check or transfer number" />
                <FormInput control={form.control} name="reference_date" label="Reference Date" type="date" />
              </div>
            </div>

            {/* Invoice Allocation */}
            {paymentType !== "Internal Transfer" && (
              <div className="bg-card rounded-[2rem] border p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Invoice Allocation</h3>
                  <Button type="button" variant="outline" size="sm" className="rounded-full"
                    onClick={handleGetOutstanding} disabled={!party || loadingOutstanding}>
                    {loadingOutstanding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Get Outstanding Invoices
                  </Button>
                </div>

                {refFields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-2xl">
                    <p className="text-muted-foreground text-sm">No invoices selected</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Get Outstanding Invoices" to fetch</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 px-4 text-[10px] font-bold text-muted-foreground uppercase">
                      <div className="col-span-4">Invoice</div>
                      <div className="col-span-2 text-right">Outstanding</div>
                      <div className="col-span-3">Allocate</div>
                      <div className="col-span-2">Due Date</div>
                      <div className="col-span-1"></div>
                    </div>

                    {refFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-4 bg-secondary/20 rounded-xl">
                        <div className="col-span-4">
                          <p className="font-bold text-sm">{form.watch(`references.${index}.reference_name`)}</p>
                          <p className="text-[10px] text-muted-foreground">{form.watch(`references.${index}.reference_doctype`)}</p>
                        </div>
                        <div className="col-span-2 text-right font-bold">
                          {(form.watch(`references.${index}.outstanding_amount`) || 0).toLocaleString()}
                        </div>
                        <div className="col-span-3">
                          <FormInput control={form.control} name={`references.${index}.allocated_amount`} type="number" />
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          {form.watch(`references.${index}.due_date`) || "—"}
                        </div>
                        <div className="col-span-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeRef(index)}
                            className="h-7 w-7 rounded-full text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between pt-4 border-t">
                      <span className="font-bold">Total Allocated:</span>
                      <span className={cn("font-bold text-lg",
                        totalAllocated === paidAmount ? "text-emerald-600" : "text-amber-600")}>
                        ETB {totalAllocated.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-[2rem] border p-8 shadow-xl sticky top-6 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TypeIcon className={cn("h-5 w-5", typeConfig.color)} />
                Payment Summary
              </h3>

              <div className={cn("p-6 rounded-2xl border", typeConfig.bg)}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Amount</p>
                <p className={cn("text-3xl font-black", typeConfig.color)}>
                  ETB {(paidAmount || 0).toLocaleString()}
                </p>
              </div>

              {party && (
                <div className="p-4 bg-secondary/30 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">{partyType}</p>
                  <p className="font-bold truncate">{party}</p>
                </div>
              )}

              {refFields.length > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoices:</span>
                    <span className="font-bold">{refFields.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allocated:</span>
                    <span className="font-bold">{totalAllocated.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unallocated:</span>
                    <span className={cn("font-bold", (paidAmount - totalAllocated) > 0 ? "text-amber-600" : "text-emerald-600")}>
                      {(paidAmount - totalAllocated).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={createMutation.isPending}
                className="w-full rounded-xl h-12 font-bold shadow-lg uppercase tracking-widest text-[11px]">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Record Payment
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function CreatePaymentEntryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New Payment Entry" subtitle="Record incoming or outgoing payment"
        backHref="/accounting/payment-entry" />
      <Suspense fallback={<LoadingState />}>
        <CreatePaymentEntryForm />
      </Suspense>
    </div>
  );
}
```

---

_See Part 6 for Journal Entry & Sidebar Navigation_
