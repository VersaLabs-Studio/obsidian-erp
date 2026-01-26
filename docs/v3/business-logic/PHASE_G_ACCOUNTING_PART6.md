# Phase G: Accounting & Finance - Part 6 (Journal Entry & Navigation)

> **Continuation of PHASE_G_ACCOUNTING_PART5.md**

---

## 15. Journal Entry Module

### 15.1 Journal Entry List Page

**File:** `app/accounting/journal-entry/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, BookOpen, CheckCircle2, Pencil, XCircle,
  Eye, MoreVertical, Trash2, Building2, Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import type { JournalEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const VOUCHER_TYPE_CONFIG = {
  "Journal Entry": { color: "text-blue-600", bg: "bg-blue-100" },
  "Bank Entry": { color: "text-emerald-600", bg: "bg-emerald-100" },
  "Cash Entry": { color: "text-amber-600", bg: "bg-amber-100" },
  "Depreciation Entry": { color: "text-purple-600", bg: "bg-purple-100" },
  "Opening Entry": { color: "text-indigo-600", bg: "bg-indigo-100" },
  "Write Off Entry": { color: "text-red-600", bg: "bg-red-100" },
};

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Pencil },
  Submitted: { color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2 },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

export default function JournalEntryListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: entries, isLoading, refetch } = useFrappeList<JournalEntry>("Journal Entry", {
    fields: [
      "name", "voucher_type", "posting_date", "company",
      "total_debit", "total_credit", "cheque_no", "user_remark", "docstatus",
    ],
    orderBy: { field: "posting_date", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Journal Entry", {
    onSuccess: () => { toast.success("Entry deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => {
      const matchesSearch = !searchTerm ||
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.cheque_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.user_remark?.toLowerCase().includes(searchTerm.toLowerCase());

      if (typeFilter === "all") return matchesSearch;
      return matchesSearch && e.voucher_type === typeFilter;
    });
  }, [entries, searchTerm, typeFilter]);

  if (isLoading) return <LoadingState message="Loading journal entries..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        subtitle="Manual accounting adjustments and transfers"
        primaryAction={{
          label: "New Entry",
          onClick: () => router.push("/accounting/journal-entry/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search entries..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="bg-secondary/30 p-1 rounded-full flex-wrap">
            <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
            <TabsTrigger value="Journal Entry" className="rounded-full">Journal</TabsTrigger>
            <TabsTrigger value="Bank Entry" className="rounded-full">Bank</TabsTrigger>
            <TabsTrigger value="Cash Entry" className="rounded-full">Cash</TabsTrigger>
            <TabsTrigger value="Depreciation Entry" className="rounded-full">Depreciation</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No journal entries found" />
      ) : (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/30">
              <tr>
                <th className="text-left p-4 font-bold">Entry #</th>
                <th className="text-left p-4 font-bold">Type</th>
                <th className="text-left p-4 font-bold">Date</th>
                <th className="text-right p-4 font-bold">Debit</th>
                <th className="text-right p-4 font-bold">Credit</th>
                <th className="text-left p-4 font-bold">Reference</th>
                <th className="text-center p-4 font-bold">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const typeConfig = VOUCHER_TYPE_CONFIG[entry.voucher_type] || VOUCHER_TYPE_CONFIG["Journal Entry"];
                const status = entry.docstatus === 0 ? "Draft" : entry.docstatus === 1 ? "Submitted" : "Cancelled";
                const statusConfig = STATUS_CONFIG[status];
                const isDraft = entry.docstatus === 0;

                return (
                  <tr key={entry.name} className="border-t hover:bg-secondary/10 cursor-pointer"
                    onClick={() => router.push(`/accounting/journal-entry/${encodeURIComponent(entry.name)}`)}>
                    <td className="p-4 font-bold">{entry.name}</td>
                    <td className="p-4">
                      <Badge className={cn("rounded-full text-[10px]", typeConfig.bg, typeConfig.color)}>
                        {entry.voucher_type}
                      </Badge>
                    </td>
                    <td className="p-4">{entry.posting_date ? format(parseISO(entry.posting_date), "MMM d, yyyy") : "—"}</td>
                    <td className="p-4 text-right font-mono">{entry.total_debit?.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono">{entry.total_credit?.toLocaleString()}</td>
                    <td className="p-4 text-muted-foreground">{entry.cheque_no || entry.user_remark?.slice(0, 30) || "—"}</td>
                    <td className="p-4 text-center">
                      <Badge className={cn("rounded-full text-[10px]", statusConfig.bg, statusConfig.color)}>
                        {status}
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
                          <DropdownMenuItem onClick={() => router.push(`/accounting/journal-entry/${encodeURIComponent(entry.name)}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          {isDraft && (
                            <DropdownMenuItem onClick={() => setDeleteTarget(entry.name)} className="text-destructive">
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
        title="Delete Journal Entry?" onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

### 15.2 Journal Entry Create Page

**File:** `app/accounting/journal-entry/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, BookOpen, Plus, Trash2, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect, FormTextarea } from "@/components/form";
import { JournalEntryCreateSchema, type JournalEntryFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CreateJournalEntryPage() {
  const router = useRouter();

  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(JournalEntryCreateSchema),
    defaultValues: {
      naming_series: "ACC-JV-.YYYY.-",
      voucher_type: "Journal Entry",
      posting_date: new Date().toISOString().split('T')[0],
      company: "",
      accounts: [
        { account: "", debit_in_account_currency: 0, credit_in_account_currency: 0 },
        { account: "", debit_in_account_currency: 0, credit_in_account_currency: 0 },
      ],
      cheque_no: "",
      cheque_date: "",
      user_remark: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "accounts",
  });

  const accounts = form.watch("accounts");
  const totalDebit = accounts.reduce((sum, acc) => sum + (acc.debit_in_account_currency || 0), 0);
  const totalCredit = accounts.reduce((sum, acc) => sum + (acc.credit_in_account_currency || 0), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  const createMutation = useFrappeCreate("Journal Entry", {
    onSuccess: (response) => {
      toast.success("Journal Entry created");
      router.push(`/accounting/journal-entry/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: JournalEntryFormData) => {
    if (!isBalanced) {
      toast.error("Entry must balance! Debits must equal Credits.");
      return;
    }

    const payload = {
      ...data,
      docstatus: 0,
      total_debit: totalDebit,
      total_credit: totalCredit,
      accounts: data.accounts.map((acc, idx) => ({
        ...acc,
        idx: idx + 1,
        doctype: "Journal Entry Account",
      })),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Journal Entry" subtitle="Manual accounting adjustment"
        backHref="/accounting/journal-entry" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!isBalanced && totalDebit > 0 && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Entry is not balanced! Difference: <strong>{Math.abs(difference).toLocaleString()}</strong>
                ({difference > 0 ? "Debit excess" : "Credit excess"})
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="bg-card rounded-[2rem] border p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-lg">Entry Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormSelect control={form.control} name="voucher_type" label="Entry Type" required
                    options={[
                      { value: "Journal Entry", label: "Journal Entry" },
                      { value: "Bank Entry", label: "Bank Entry" },
                      { value: "Cash Entry", label: "Cash Entry" },
                      { value: "Depreciation Entry", label: "Depreciation Entry" },
                      { value: "Opening Entry", label: "Opening Entry" },
                      { value: "Write Off Entry", label: "Write Off Entry" },
                    ]} />
                  <FormInput control={form.control} name="posting_date" label="Date" type="date" required />
                  <FormFrappeSelect control={form.control} name="company" label="Company" doctype="Company" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput control={form.control} name="cheque_no" label="Reference #" placeholder="Check or reference number" />
                  <FormInput control={form.control} name="cheque_date" label="Reference Date" type="date" />
                </div>

                <FormTextarea control={form.control} name="user_remark" label="Remarks" placeholder="Purpose of this entry..." />
              </div>

              {/* Accounting Entries */}
              <div className="bg-card rounded-[2rem] border p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Accounting Entries</h3>
                  <Button type="button" variant="outline" size="sm" className="rounded-full"
                    onClick={() => append({ account: "", debit_in_account_currency: 0, credit_in_account_currency: 0 })}>
                    <Plus className="h-3 w-3 mr-1" /> Add Row
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 px-4 text-[10px] font-bold text-muted-foreground uppercase">
                    <div className="col-span-5">Account</div>
                    <div className="col-span-3">Debit</div>
                    <div className="col-span-3">Credit</div>
                    <div className="col-span-1"></div>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-center p-4 bg-secondary/20 rounded-xl">
                      <div className="col-span-5">
                        <FormFrappeSelect control={form.control} name={`accounts.${index}.account`}
                          doctype="Account" placeholder="Select account..."
                          filters={[["is_group", "=", 0]]} />
                      </div>
                      <div className="col-span-3">
                        <FormInput control={form.control} name={`accounts.${index}.debit_in_account_currency`}
                          type="number" placeholder="0.00" />
                      </div>
                      <div className="col-span-3">
                        <FormInput control={form.control} name={`accounts.${index}.credit_in_account_currency`}
                          type="number" placeholder="0.00" />
                      </div>
                      <div className="col-span-1">
                        {fields.length > 2 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
                            className="h-8 w-8 rounded-full text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="grid grid-cols-12 gap-2 px-4 pt-4 border-t font-bold">
                    <div className="col-span-5 text-right">Totals:</div>
                    <div className="col-span-3 text-emerald-600">{totalDebit.toLocaleString()}</div>
                    <div className="col-span-3 text-red-600">{totalCredit.toLocaleString()}</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 px-4">
                    <div className="col-span-5 text-right text-muted-foreground">Difference:</div>
                    <div className={cn("col-span-6 font-bold", isBalanced ? "text-emerald-600" : "text-red-600")}>
                      {isBalanced ? "✓ Balanced" : `${Math.abs(difference).toLocaleString()} ${difference > 0 ? "(Dr)" : "(Cr)"}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-[2rem] border p-8 shadow-xl sticky top-6 space-y-6">
                <h3 className="font-bold text-lg">Summary</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-[10px] font-bold uppercase text-emerald-600/70">Total Debit</p>
                    <p className="text-2xl font-black text-emerald-600">{totalDebit.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p className="text-[10px] font-bold uppercase text-red-600/70">Total Credit</p>
                    <p className="text-2xl font-black text-red-600">{totalCredit.toLocaleString()}</p>
                  </div>
                  <div className={cn("p-4 rounded-xl border", isBalanced ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
                    <p className="text-[10px] font-bold uppercase opacity-70">Status</p>
                    <p className={cn("text-lg font-black", isBalanced ? "text-emerald-600" : "text-red-600")}>
                      {isBalanced ? "✓ Balanced" : "✗ Unbalanced"}
                    </p>
                  </div>
                </div>

                <Button type="submit" disabled={createMutation.isPending || !isBalanced}
                  className="w-full rounded-xl h-12 font-bold shadow-lg uppercase tracking-widest text-[11px]">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Create Entry
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

---

## 16. Sidebar Navigation Update

### 16.1 Update Layout Navigation

**File:** `components/Layout/Layout.tsx` - Add Accounting section:

```typescript
// Add these imports
import {
  Calculator, Receipt, CreditCard, BookOpen, Wallet,
  Settings, Building, PieChart,
} from "lucide-react";

// Add to navigation array:
{
  title: "Accounting",
  icon: Calculator,
  items: [
    { title: "Sales Invoices", href: "/accounting/sales-invoice", icon: Receipt },
    { title: "Purchase Invoices", href: "/accounting/purchase-invoice", icon: Receipt },
    { title: "Payment Entries", href: "/accounting/payment-entry", icon: CreditCard },
    { title: "Journal Entries", href: "/accounting/journal-entry", icon: BookOpen },
    { title: "Settings", href: "/accounting/setup", icon: Settings },
  ],
},
```

### 16.2 Accounting Setup Hub Page

**File:** `app/accounting/setup/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import {
  Wallet, Building, CreditCard, Calendar, ArrowRight, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/smart";
import { cn } from "@/lib/utils";

const SETUP_MODULES = [
  {
    title: "Chart of Accounts",
    description: "Manage your account structure (Assets, Liabilities, Income, Expenses)",
    href: "/accounting/setup/account",
    icon: Wallet,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    title: "Cost Centers",
    description: "Track profitability by department or division",
    href: "/accounting/setup/cost-center",
    icon: Building,
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
  {
    title: "Modes of Payment",
    description: "Define payment methods (Cash, Bank, Mobile Money)",
    href: "/accounting/setup/mode-of-payment",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  {
    title: "Payment Terms",
    description: "Create payment term templates (Net 30, 50% Advance)",
    href: "/accounting/setup/payment-terms",
    icon: Calendar,
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
];

export default function AccountingSetupPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting Setup"
        subtitle="Configure your financial infrastructure"
        backHref="/accounting/sales-invoice"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SETUP_MODULES.map((module, idx) => {
          const Icon = module.icon;
          return (
            <div
              key={module.href}
              onClick={() => router.push(module.href)}
              className={cn(
                "bg-card rounded-2xl border p-6 cursor-pointer group",
                "hover:shadow-xl hover:border-primary/20 transition-all",
                "animate-in fade-in slide-in-from-bottom-4"
              )}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", module.bg)}>
                  <Icon className={cn("h-7 w-7", module.color)} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                    {module.title}
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 17. Testing Checklist

### Setup Tests

- [ ] Create Chart of Accounts (verify tree structure)
- [ ] Create "Cash" and "Bank" Mode of Payment
- [ ] Create "Net 30" Payment Terms Template
- [ ] Create Cost Centers

### Accounts Receivable Tests

- [ ] Create Sales Invoice manually
- [ ] Create Sales Invoice from Delivery Note
- [ ] Submit Sales Invoice → Status = Unpaid
- [ ] Create Payment Entry (Receive) against invoice
- [ ] Verify invoice status changes to Paid
- [ ] Test partial payment → Status = Partly Paid
- [ ] Test credit limit warning

### Accounts Payable Tests

- [ ] Create Purchase Invoice manually
- [ ] Submit Purchase Invoice
- [ ] Create Payment Entry (Pay) against invoice
- [ ] Verify invoice status changes to Paid

### Journal Entry Tests

- [ ] Create balanced Journal Entry
- [ ] Verify unbalanced entry is rejected
- [ ] Test different voucher types

### Integration Tests

- [ ] Full flow: SO → DN → Sales Invoice → Payment → Paid
- [ ] Verify outstanding amounts update correctly

---

_This completes the Phase G: Accounting & Finance implementation documentation._
