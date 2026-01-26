# Phase G: Accounting & Finance - Part 3 (Utility Module Pages)

> **Continuation of PHASE_G_ACCOUNTING_PART2.md**

---

## 9. Utility Module: Account (Chart of Accounts)

### 9.1 Account List Page (Tree View)

**File:** `app/accounting/setup/account/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, ChevronRight, ChevronDown,
  Wallet, Building2, CreditCard, PiggyBank,
  TrendingUp, TrendingDown, CircleDollarSign,
  Eye, Pencil, Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { cn } from "@/lib/utils";
import type { Account } from "@/types/doctype-types";

const ROOT_TYPE_CONFIG = {
  Asset: { color: "text-blue-600", bg: "bg-blue-100", icon: Wallet },
  Liability: { color: "text-orange-600", bg: "bg-orange-100", icon: CreditCard },
  Equity: { color: "text-purple-600", bg: "bg-purple-100", icon: Building2 },
  Income: { color: "text-emerald-600", bg: "bg-emerald-100", icon: TrendingUp },
  Expense: { color: "text-red-600", bg: "bg-red-100", icon: TrendingDown },
};

const ACCOUNT_TYPE_ICONS: Record<string, any> = {
  Bank: Wallet,
  Cash: CircleDollarSign,
  Receivable: TrendingUp,
  Payable: TrendingDown,
  Stock: PiggyBank,
};

interface AccountTreeNodeProps {
  account: Account;
  level: number;
  expanded: Record<string, boolean>;
  onToggle: (name: string) => void;
  onView: (name: string) => void;
  onEdit: (name: string) => void;
  children: Account[];
  allAccounts: Account[];
}

function AccountTreeNode({ account, level, expanded, onToggle, onView, onEdit, children, allAccounts }: AccountTreeNodeProps) {
  const isExpanded = expanded[account.name];
  const hasChildren = children.length > 0;
  const rootConfig = ROOT_TYPE_CONFIG[account.root_type as keyof typeof ROOT_TYPE_CONFIG];
  const IconComponent = ACCOUNT_TYPE_ICONS[account.account_type || ""] || CircleDollarSign;
  const isDisabled = account.disabled === 1;
  const isFrozen = account.freeze_account === "Yes";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all",
          "hover:bg-secondary/50 group",
          isDisabled && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => onView(account.name)}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(account.name); }}
            className="p-1 rounded hover:bg-secondary"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-6" />
        )}

        {/* Icon */}
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          account.is_group ? "bg-secondary" : (rootConfig?.bg || "bg-gray-100")
        )}>
          <IconComponent className={cn("h-4 w-4", rootConfig?.color || "text-gray-600")} />
        </div>

        {/* Name & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-medium truncate", account.is_group && "font-bold")}>
              {account.account_name}
            </span>
            {account.account_number && (
              <span className="text-xs font-mono text-muted-foreground">{account.account_number}</span>
            )}
            {isFrozen && <Lock className="h-3 w-3 text-amber-500" />}
          </div>
          {account.account_type && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {account.account_type}
            </span>
          )}
        </div>

        {/* Root Type Badge */}
        {account.root_type && !account.is_group && (
          <Badge className={cn("text-[10px] rounded-full", rootConfig?.bg, rootConfig?.color)}>
            {account.root_type}
          </Badge>
        )}

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"
            onClick={(e) => { e.stopPropagation(); onView(account.name); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"
            onClick={(e) => { e.stopPropagation(); onEdit(account.name); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {children.map(child => {
            const grandChildren = allAccounts.filter(a => a.parent_account === child.name);
            return (
              <AccountTreeNode
                key={child.name}
                account={child}
                level={level + 1}
                expanded={expanded}
                onToggle={onToggle}
                onView={onView}
                onEdit={onEdit}
                children={grandChildren}
                allAccounts={allAccounts}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AccountListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: accounts, isLoading } = useFrappeList<Account>("Account", {
    fields: [
      "name", "account_name", "account_number", "parent_account",
      "root_type", "account_type", "is_group", "disabled", "freeze_account", "lft", "rgt",
    ],
    orderBy: { field: "lft", order: "asc" },
    limit: 500,
  });

  const filtered = useMemo(() => {
    if (!accounts) return [];
    if (!searchTerm) return accounts;
    return accounts.filter(a =>
      a.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accounts, searchTerm]);

  // Build tree for non-search view
  const rootAccounts = useMemo(() => {
    if (!accounts || searchTerm) return [];
    return accounts.filter(a => !a.parent_account || a.parent_account === "");
  }, [accounts, searchTerm]);

  const toggleExpand = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const expandAll = () => {
    if (!accounts) return;
    const allExpanded: Record<string, boolean> = {};
    accounts.filter(a => a.is_group).forEach(a => { allExpanded[a.name] = true; });
    setExpanded(allExpanded);
  };

  if (isLoading) return <LoadingState message="Loading chart of accounts..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage your account structure"
        backHref="/accounting/setup"
        primaryAction={{
          label: "Add Account",
          onClick: () => router.push("/accounting/setup/account/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>
        <Button variant="outline" size="sm" onClick={expandAll} className="rounded-full">
          Expand All
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-4 min-h-[400px]">
        {searchTerm ? (
          // Flat list for search
          <div className="space-y-1">
            {filtered.map(account => (
              <div
                key={account.name}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer"
                onClick={() => router.push(`/accounting/setup/account/${encodeURIComponent(account.name)}`)}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  ROOT_TYPE_CONFIG[account.root_type as keyof typeof ROOT_TYPE_CONFIG]?.bg || "bg-gray-100"
                )}>
                  <CircleDollarSign className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{account.account_name}</p>
                  <p className="text-xs text-muted-foreground">{account.parent_account}</p>
                </div>
                {account.root_type && (
                  <Badge variant="outline" className="text-xs">{account.root_type}</Badge>
                )}
              </div>
            ))}
          </div>
        ) : rootAccounts.length === 0 ? (
          <EmptyState icon={Wallet} title="No accounts found" description="Create your chart of accounts" />
        ) : (
          // Tree view
          <div className="space-y-1">
            {rootAccounts.map(account => {
              const children = accounts?.filter(a => a.parent_account === account.name) || [];
              return (
                <AccountTreeNode
                  key={account.name}
                  account={account}
                  level={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onView={(name) => router.push(`/accounting/setup/account/${encodeURIComponent(name)}`)}
                  onEdit={(name) => router.push(`/accounting/setup/account/${encodeURIComponent(name)}/edit`)}
                  children={children}
                  allAccounts={accounts || []}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 9.2 Account Create Page

**File:** `app/accounting/setup/account/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Wallet } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSelect, FormSwitch } from "@/components/form";
import { AccountCreateSchema, type AccountFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateAccountPage() {
  const router = useRouter();

  const form = useForm<AccountFormData>({
    resolver: zodResolver(AccountCreateSchema),
    defaultValues: {
      account_name: "",
      account_number: "",
      parent_account: "",
      company: "",
      root_type: undefined,
      account_type: "",
      is_group: 0,
      freeze_account: "No",
      disabled: 0,
    },
  });

  const isGroup = form.watch("is_group");

  const createMutation = useFrappeCreate("Account", {
    onSuccess: (response) => {
      toast.success("Account created");
      router.push(`/accounting/setup/account/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: AccountFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Account" subtitle="Create a new account in the chart of accounts"
        backHref="/accounting/setup/account" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Account Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput control={form.control} name="account_name" label="Account Name" required
                placeholder="e.g., Cash On Hand" />
              <FormInput control={form.control} name="account_number" label="Account Number"
                placeholder="e.g., 1100" />
            </div>

            <FormFrappeSelect control={form.control} name="parent_account" label="Parent Account"
              doctype="Account" required placeholder="Select parent account..."
              filters={[["is_group", "=", 1]]} />

            <FormFrappeSelect control={form.control} name="company" label="Company"
              doctype="Company" required />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormSelect control={form.control} name="root_type" label="Root Type"
                options={[
                  { value: "Asset", label: "Asset" },
                  { value: "Liability", label: "Liability" },
                  { value: "Equity", label: "Equity" },
                  { value: "Income", label: "Income" },
                  { value: "Expense", label: "Expense" },
                ]} placeholder="Auto from parent" />
              <FormInput control={form.control} name="account_type" label="Account Type"
                placeholder="e.g., Bank, Cash, Receivable" />
            </div>

            <div className="flex flex-wrap gap-6">
              <FormSwitch control={form.control} name="is_group" label="Is Group"
                description="Can contain child accounts" />
              <FormSwitch control={form.control} name="disabled" label="Disabled"
                description="Hide from selection" />
            </div>
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="rounded-full h-12 px-8">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Account
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

---

## 10. Utility Module: Mode of Payment

### 10.1 Mode of Payment List Page

**File:** `app/accounting/setup/mode-of-payment/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MoreVertical, Pencil, Trash2, Search,
  Wallet, CreditCard, Building2, Phone, CheckCircle, XCircle, Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ModeOfPayment } from "@/types/doctype-types";

const TYPE_CONFIG = {
  Cash: { color: "text-emerald-600", bg: "bg-emerald-100", icon: Wallet },
  Bank: { color: "text-blue-600", bg: "bg-blue-100", icon: Building2 },
  General: { color: "text-gray-600", bg: "bg-gray-100", icon: CreditCard },
  Phone: { color: "text-purple-600", bg: "bg-purple-100", icon: Phone },
};

function ModeOfPaymentCard({ mode, index, onView, onEdit, onDelete }) {
  const typeConfig = TYPE_CONFIG[mode.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.General;
  const TypeIcon = typeConfig.icon;
  const isEnabled = mode.enabled !== 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 p-6",
        "hover:shadow-lg hover:border-primary/20 transition-all duration-300 cursor-pointer",
        "animate-in fade-in slide-in-from-bottom-4",
        !isEnabled && "opacity-60"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", typeConfig.bg)}>
            <TypeIcon className={cn("h-6 w-6", typeConfig.color)} />
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {mode.mode_of_payment}
            </h3>
            <Badge className={cn("text-[10px] rounded-full mt-1", typeConfig.bg, typeConfig.color)}>
              {mode.type || "General"}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        {isEnabled ? (
          <Badge className="bg-emerald-100 text-emerald-600 rounded-full text-xs">
            <CheckCircle className="h-3 w-3 mr-1" /> Enabled
          </Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-500 rounded-full text-xs">
            <XCircle className="h-3 w-3 mr-1" /> Disabled
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function ModeOfPaymentListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: modes, isLoading, refetch } = useFrappeList<ModeOfPayment>("Mode of Payment", {
    fields: ["name", "mode_of_payment", "type", "enabled"],
    orderBy: { field: "mode_of_payment", order: "asc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Mode of Payment", {
    onSuccess: () => { toast.success("Mode of payment deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!modes) return [];
    return modes.filter(m =>
      !searchTerm || m.mode_of_payment?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [modes, searchTerm]);

  if (isLoading) return <LoadingState message="Loading modes of payment..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modes of Payment"
        subtitle="Define payment methods (Cash, Bank, Mobile Money)"
        backHref="/accounting/setup"
        primaryAction={{
          label: "Add Mode",
          onClick: () => router.push("/accounting/setup/mode-of-payment/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search modes..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No modes of payment"
          description="Add payment methods like Cash, Bank Transfer" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((mode, idx) => (
            <ModeOfPaymentCard key={mode.name} mode={mode} index={idx}
              onView={() => router.push(`/accounting/setup/mode-of-payment/${encodeURIComponent(mode.name)}`)}
              onEdit={() => router.push(`/accounting/setup/mode-of-payment/${encodeURIComponent(mode.name)}/edit`)}
              onDelete={() => setDeleteTarget(mode.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Delete Mode of Payment?" description="This action cannot be undone."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

### 10.2 Mode of Payment Create Page

**File:** `app/accounting/setup/mode-of-payment/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, CreditCard } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormSelect, FormSwitch } from "@/components/form";
import { ModeOfPaymentCreateSchema, type ModeOfPaymentFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateModeOfPaymentPage() {
  const router = useRouter();

  const form = useForm<ModeOfPaymentFormData>({
    resolver: zodResolver(ModeOfPaymentCreateSchema),
    defaultValues: {
      mode_of_payment: "",
      type: "General",
      enabled: 1,
    },
  });

  const createMutation = useFrappeCreate("Mode of Payment", {
    onSuccess: (response) => {
      toast.success("Mode of payment created");
      router.push(`/accounting/setup/mode-of-payment/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: ModeOfPaymentFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Mode of Payment" subtitle="Define a new payment method"
        backHref="/accounting/setup/mode-of-payment" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Payment Mode Details</h3>
            </div>

            <FormInput control={form.control} name="mode_of_payment" label="Mode of Payment" required
              placeholder="e.g., Cash, Wire Transfer, Mobile Money" />

            <FormSelect control={form.control} name="type" label="Type"
              options={[
                { value: "Cash", label: "Cash" },
                { value: "Bank", label: "Bank" },
                { value: "General", label: "General" },
                { value: "Phone", label: "Phone / Mobile Money" },
              ]} />

            <FormSwitch control={form.control} name="enabled" label="Enabled"
              description="Available for selection in transactions" />
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="rounded-full h-12 px-8">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Mode
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

---

## 11. Utility Module: Cost Center

### 11.1 Cost Center List Page (Tree View)

**File:** `app/accounting/setup/cost-center/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, ChevronRight, ChevronDown,
  Building, Eye, Pencil, FolderTree,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import { cn } from "@/lib/utils";
import type { CostCenter } from "@/types/doctype-types";

interface CostCenterTreeNodeProps {
  costCenter: CostCenter;
  level: number;
  expanded: Record<string, boolean>;
  onToggle: (name: string) => void;
  onView: (name: string) => void;
  onEdit: (name: string) => void;
  children: CostCenter[];
  allCostCenters: CostCenter[];
}

function CostCenterTreeNode({ costCenter, level, expanded, onToggle, onView, onEdit, children, allCostCenters }: CostCenterTreeNodeProps) {
  const isExpanded = expanded[costCenter.name];
  const hasChildren = children.length > 0;
  const isDisabled = costCenter.disabled === 1;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all",
          "hover:bg-secondary/50 group",
          isDisabled && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => onView(costCenter.name)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(costCenter.name); }}
            className="p-1 rounded hover:bg-secondary"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-6" />
        )}

        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          costCenter.is_group ? "bg-amber-100" : "bg-blue-100"
        )}>
          {costCenter.is_group ? <FolderTree className="h-4 w-4 text-amber-600" /> : <Building className="h-4 w-4 text-blue-600" />}
        </div>

        <div className="flex-1 min-w-0">
          <span className={cn("font-medium truncate", costCenter.is_group && "font-bold")}>
            {costCenter.cost_center_name}
          </span>
          {costCenter.cost_center_number && (
            <span className="ml-2 text-xs font-mono text-muted-foreground">{costCenter.cost_center_number}</span>
          )}
        </div>

        {costCenter.is_group ? (
          <Badge className="bg-amber-100 text-amber-600 text-[10px] rounded-full">Group</Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-600 text-[10px] rounded-full">Ledger</Badge>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"
            onClick={(e) => { e.stopPropagation(); onEdit(costCenter.name); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map(child => {
            const grandChildren = allCostCenters.filter(c => c.parent_cost_center === child.name);
            return (
              <CostCenterTreeNode
                key={child.name}
                costCenter={child}
                level={level + 1}
                expanded={expanded}
                onToggle={onToggle}
                onView={onView}
                onEdit={onEdit}
                children={grandChildren}
                allCostCenters={allCostCenters}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CostCenterListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: costCenters, isLoading } = useFrappeList<CostCenter>("Cost Center", {
    fields: [
      "name", "cost_center_name", "cost_center_number", "parent_cost_center",
      "company", "is_group", "disabled", "lft", "rgt",
    ],
    orderBy: { field: "lft", order: "asc" },
    limit: 200,
  });

  const rootCostCenters = useMemo(() => {
    if (!costCenters || searchTerm) return [];
    return costCenters.filter(c => !c.parent_cost_center || c.parent_cost_center === "");
  }, [costCenters, searchTerm]);

  const filtered = useMemo(() => {
    if (!costCenters) return [];
    if (!searchTerm) return costCenters;
    return costCenters.filter(c =>
      c.cost_center_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [costCenters, searchTerm]);

  const toggleExpand = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (isLoading) return <LoadingState message="Loading cost centers..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Centers"
        subtitle="Track profitability by department or division"
        backHref="/accounting/setup"
        primaryAction={{
          label: "Add Cost Center",
          onClick: () => router.push("/accounting/setup/cost-center/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search cost centers..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
      </div>

      <div className="bg-card rounded-2xl border border-border/50 p-4 min-h-[300px]">
        {searchTerm ? (
          <div className="space-y-2">
            {filtered.map(cc => (
              <div key={cc.name}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 cursor-pointer"
                onClick={() => router.push(`/accounting/setup/cost-center/${encodeURIComponent(cc.name)}`)}
              >
                <Building className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{cc.cost_center_name}</span>
              </div>
            ))}
          </div>
        ) : rootCostCenters.length === 0 ? (
          <EmptyState icon={Building} title="No cost centers" description="Create cost centers to track profitability" />
        ) : (
          <div className="space-y-1">
            {rootCostCenters.map(cc => {
              const children = costCenters?.filter(c => c.parent_cost_center === cc.name) || [];
              return (
                <CostCenterTreeNode
                  key={cc.name}
                  costCenter={cc}
                  level={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onView={(name) => router.push(`/accounting/setup/cost-center/${encodeURIComponent(name)}`)}
                  onEdit={(name) => router.push(`/accounting/setup/cost-center/${encodeURIComponent(name)}/edit`)}
                  children={children}
                  allCostCenters={costCenters || []}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 11.2 Cost Center Create Page

**File:** `app/accounting/setup/cost-center/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Building } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch } from "@/components/form";
import { CostCenterCreateSchema, type CostCenterFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";

export default function CreateCostCenterPage() {
  const router = useRouter();

  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(CostCenterCreateSchema),
    defaultValues: {
      cost_center_name: "",
      cost_center_number: "",
      parent_cost_center: "",
      company: "",
      is_group: 0,
      disabled: 0,
    },
  });

  const createMutation = useFrappeCreate("Cost Center", {
    onSuccess: (response) => {
      toast.success("Cost center created");
      router.push(`/accounting/setup/cost-center/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: CostCenterFormData) => createMutation.mutate(data);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Cost Center" subtitle="Create a new profit tracking division"
        backHref="/accounting/setup/cost-center" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-lg">Cost Center Details</h3>
            </div>

            <FormInput control={form.control} name="cost_center_name" label="Cost Center Name" required
              placeholder="e.g., Digital Printing, Offset Division" />

            <FormInput control={form.control} name="cost_center_number" label="Cost Center Number"
              placeholder="e.g., CC-001" />

            <FormFrappeSelect control={form.control} name="parent_cost_center" label="Parent Cost Center"
              doctype="Cost Center" required placeholder="Select parent..."
              filters={[["is_group", "=", 1]]} />

            <FormFrappeSelect control={form.control} name="company" label="Company"
              doctype="Company" required />

            <div className="flex gap-6">
              <FormSwitch control={form.control} name="is_group" label="Is Group"
                description="Can contain child cost centers" />
              <FormSwitch control={form.control} name="disabled" label="Disabled" />
            </div>
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="rounded-full h-12 px-8">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Cost Center
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

---

_See Part 4 for Sales Invoice & Purchase Invoice Pages_
