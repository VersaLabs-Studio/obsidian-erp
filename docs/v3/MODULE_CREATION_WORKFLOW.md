# Pana ERP v3.0 - Module Creation Workflow

> **Version:** 3.0.4  
> **Last Updated:** 2026-01-14  
> **Status:** PRODUCTION READY

This document provides step-by-step instructions for creating new modules in Pana ERP v3.0. Follow this workflow exactly to ensure consistency across the codebase.

---

## Table of Contents

1. [Quick Reference Checklist](#1-quick-reference-checklist)
2. [Prerequisites](#2-prerequisites)
3. [Step 1: Generate Types](#3-step-1-generate-types)
4. [Step 2: Register DocType](#4-step-2-register-doctype)
5. [Step 3: Create API Routes](#5-step-3-create-api-routes)
6. [Step 4: Create List Page](#6-step-4-create-list-page)
7. [Step 5: Create Detail Page](#7-step-5-create-detail-page)
8. [Step 6: Create New/Edit Pages](#8-step-6-create-newedit-pages)
9. [Step 7: Final Verification](#9-step-7-final-verification)
10. [Code Templates](#10-code-templates)
11. [Common Patterns](#11-common-patterns)
12. [Linked Entity Navigation](#12-linked-entity-navigation)

---

## 1. Quick Reference Checklist

Use this checklist for every new module:

```
[ ] Types generated from Frappe
[ ] DocType added to lib/doctype-config.ts
[ ] DocType added to lib/query-keys.ts
[ ] API route created: app/api/{module}/{doctype}/route.ts
[ ] API route created: app/api/{module}/{doctype}/[name]/route.ts
[ ] Page created: app/{module}/{doctype}/page.tsx (List)
[ ] Page created: app/{module}/{doctype}/new/page.tsx (Create)
[ ] Page created: app/{module}/{doctype}/[name]/page.tsx (Detail)
[ ] Page created: app/{module}/{doctype}/[name]/edit/page.tsx (Edit)
[ ] Dark mode tested
[ ] CRUD operations tested
[ ] Responsive design tested
```

---

## 2. Prerequisites

Before creating a new module, ensure:

1. **Frappe backend is running** and the DocType exists
2. **Environment variables** are configured (`.env.local`)
3. **Dependencies are installed** (`pnpm install`)

---

## 3. Step 1: Generate Types

Generate TypeScript types from Frappe DocType metadata:

```bash
pnpm generate-types "DocType Name"
```

This creates/updates `types/doctype-types.ts` with:
- Main interface (e.g., `Customer`)
- Create request type (e.g., `CustomerCreateRequest`)
- Update request type (e.g., `CustomerUpdateRequest`)

**Verify the generated types:**

```typescript
// types/doctype-types.ts
export interface Customer {
  name: string;
  customer_name: string;
  customer_group: string;
  territory: string;
  // ... other fields
}

export type CustomerCreateRequest = Pick<Customer, "customer_name" | "customer_group"> &
  Partial<Pick<Customer, "territory" | "...">>;

export type CustomerUpdateRequest = Partial<Omit<Customer, "name" | "creation">>;
```

---

## 4. Step 2: Register DocType

### 4.1 Add to doctype-config.ts

```typescript
// lib/doctype-config.ts

export const DOCTYPE_CONFIG: Record<string, DocTypeConfig> = {
  // ... existing doctypes

  // ADD YOUR NEW DOCTYPE HERE
  Customer: {
    apiPath: "crm/customer",
    module: "CRM",
    labelField: "customer_name",
    searchFields: ["customer_name", "customer_id", "email_id"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
};
```

### 4.2 Add to query-keys.ts

```typescript
// lib/query-keys.ts

export const queryKeys = {
  // ... existing keys

  // ADD YOUR NEW DOCTYPE KEYS
  customer: {
    all: () => ["Customer"] as const,
    list: (options?: FrappeListOptions) =>
      ["Customer", "list", options] as const,
    doc: (name: string) => ["Customer", "doc", name] as const,
  },
};
```

---

## 5. Step 3: Create API Routes

### 5.1 List/Create Route

Create `app/api/{module}/{doctype}/route.ts`:

```typescript
// app/api/crm/customer/route.ts
// Pana ERP v3.0 - Customer API (GET list, POST create)

import {
  createListHandler,
  createCreateHandler,
} from "@/lib/api-factory";
import { CustomerCreateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/crm/customer - List customers
export const GET = createListHandler("Customer", {
  allowedFields: [
    "name",
    "customer_name",
    "customer_group",
    "territory",
    "email_id",
    "mobile_no",
    "creation",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

// POST /api/crm/customer - Create customer
export const POST = createCreateHandler("Customer", CustomerCreateSchema);
```

### 5.2 Single Document Route

Create `app/api/{module}/{doctype}/[name]/route.ts`:

```typescript
// app/api/crm/customer/[name]/route.ts
// Pana ERP v3.0 - Customer Single Doc API (GET, PUT, DELETE)

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { CustomerUpdateSchema } from "@/lib/schemas/doctype-schemas";

// GET /api/crm/customer/[name] - Get single customer
export const GET = createGetHandler("Customer");

// PUT /api/crm/customer/[name] - Update customer
export const PUT = createUpdateHandler("Customer", CustomerUpdateSchema);

// DELETE /api/crm/customer/[name] - Delete customer
export const DELETE = createDeleteHandler("Customer");
```

---

## 6. Step 4: Create List Page

Create `app/{module}/{doctype}/page.tsx`:

```typescript
// app/crm/customer/page.tsx
// Pana ERP v3.0 - Customers List Page
// @ts-nocheck

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// v3.0 Imports
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, EmptyState, LoadingState, ConfirmDialog } from "@/components/smart";
import type { Customer } from "@/types/doctype-types";

// Row Component
function CustomerRow({
  customer,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group relative flex items-start justify-between p-4 mb-2 bg-card hover:bg-card/80 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-bold text-muted-foreground">
          {customer.customer_name?.slice(0, 2).toUpperCase() || "CU"}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {customer.customer_name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {customer.customer_group}
          </p>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="rounded-xl border-none shadow-xl bg-popover/90 backdrop-blur-xl"
        >
          <DropdownMenuItem className="rounded-lg" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-lg text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Main Page
export default function CustomersListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Fetch data
  const { data: customers, isLoading, error } = useFrappeList<Customer>("Customer", {
    orderBy: { field: "creation", order: "desc" },
    search,
    limit: 100,
  });

  // Delete mutation
  const deleteMutation = useFrappeDelete("Customer", {
    onSuccess: () => setDeleteTarget(null),
  });

  // Filtered data
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!search) return customers;
    const searchLower = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.customer_name?.toLowerCase().includes(searchLower) ||
        c.name?.toLowerCase().includes(searchLower)
    );
  }, [customers, search]);

  // Handlers
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
  };

  // Loading
  if (isLoading) {
    return <LoadingState type="table" count={8} />;
  }

  // Error
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load customers</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle={`${filteredCustomers.length} total`}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customers..."
        actions={
          <Button
            className="rounded-full"
            onClick={() => router.push("/crm/customer/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        }
      />

      {/* List */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Create your first customer to get started"
          action={
            <Button onClick={() => router.push("/crm/customer/new")}>
              <Plus className="h-4 w-4 mr-2" /> Add Customer
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer, index) => (
            <CustomerRow
              key={customer.name}
              customer={customer}
              index={index}
              onView={() => router.push(`/crm/customer/${encodeURIComponent(customer.name)}`)}
              onEdit={() => router.push(`/crm/customer/${encodeURIComponent(customer.name)}/edit`)}
              onDelete={() => setDeleteTarget(customer)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleteTarget?.customer_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
```

---

## 7. Step 5: Create Detail Page

Create `app/{module}/{doctype}/[name]/page.tsx`:

```typescript
// app/crm/customer/[name]/page.tsx
// Pana ERP v3.0 - Customer Detail Page

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreVertical, FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// v3.0 Imports
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  LoadingState,
  ConfirmDialog,
  DataField,
  TextDataField,
} from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import type { Customer } from "@/types/doctype-types";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch data
  const { data: customer, isLoading, error } = useFrappeDoc<Customer>("Customer", name);

  // Delete mutation
  const deleteMutation = useFrappeDelete("Customer", {
    onSuccess: () => router.push("/crm/customer"),
  });

  const handleDeleteConfirm = async () => {
    await deleteMutation.mutateAsync(name);
  };

  // Loading
  if (isLoading) {
    return <LoadingState type="detail" />;
  }

  // Error
  if (error || !customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.customer_name || "Customer"}
        subtitle={`ID: ${customer.name}`}
        backHref="/crm/customer"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => router.push(`/crm/customer/${encodeURIComponent(name)}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="rounded-2xl border-none shadow-xl bg-popover/90 backdrop-blur-xl p-2"
              >
                <DropdownMenuItem className="rounded-xl">
                  <FileDown className="h-4 w-4 mr-2" /> Export
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <InfoCard title="Customer Information" icon="user">
            <div className="grid grid-cols-2 gap-4">
              <TextDataField label="Customer Name" value={customer.customer_name} />
              <TextDataField label="Customer Group" value={customer.customer_group} />
              <TextDataField label="Territory" value={customer.territory} />
              <TextDataField label="Type" value={customer.customer_type} />
            </div>
          </InfoCard>

          <InfoCard title="Contact Information" icon="contact">
            <div className="grid grid-cols-2 gap-4">
              <TextDataField label="Email" value={customer.email_id} />
              <TextDataField label="Phone" value={customer.mobile_no} />
            </div>
          </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <InfoCard title="Quick Stats" variant="gradient">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-semibold">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding</span>
                <span className="font-semibold">—</span>
              </div>
            </div>
          </InfoCard>
        </div>
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Customer"
        description={`Are you sure you want to delete "${customer.customer_name}"?`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
```

---

## 8. Step 6: Create New/Edit Pages

### 8.1 Create Page

Create `app/{module}/{doctype}/new/page.tsx`:

```typescript
// app/crm/customer/new/page.tsx
// Pana ERP v3.0 - Create Customer Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// v3.0 Imports
import { useFrappeCreate } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormTextarea,
  FormFrappeSelect,
} from "@/components/form";
import type { CustomerCreateRequest } from "@/types/doctype-types";

// Form Schema
const customerFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_group: z.string().min(1, "Customer group is required"),
  territory: z.string().optional(),
  customer_type: z.string().optional(),
  email_id: z.string().email("Invalid email").optional().or(z.literal("")),
  mobile_no: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function CreateCustomerPage() {
  const router = useRouter();

  // Create mutation
  const createMutation = useFrappeCreate<{ data: CustomerCreateRequest }, CustomerCreateRequest>(
    "Customer",
    {
      onSuccess: () => router.push("/crm/customer"),
      successMessage: "Customer created successfully",
    }
  );

  // Form
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customer_name: "",
      customer_group: "",
      territory: "",
      customer_type: "Company",
      email_id: "",
      mobile_no: "",
    },
  });

  // Submit
  const onSubmit = async (data: CustomerFormData) => {
    await createMutation.mutateAsync(data as CustomerCreateRequest);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Customer"
        subtitle="Create a new customer"
        backHref="/crm/customer"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Basic Information" icon="user">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="customer_name"
                    label="Customer Name"
                    required
                    placeholder="Enter customer name..."
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="customer_group"
                    label="Customer Group"
                    required
                    doctype="Customer Group"
                    labelField="customer_group_name"
                  />
                  <FormFrappeSelect
                    control={form.control}
                    name="territory"
                    label="Territory"
                    doctype="Territory"
                    labelField="territory_name"
                  />
                </div>
              </InfoCard>

              <InfoCard title="Contact" icon="contact">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    control={form.control}
                    name="email_id"
                    label="Email"
                    type="email"
                    placeholder="email@example.com"
                  />
                  <FormInput
                    control={form.control}
                    name="mobile_no"
                    label="Phone"
                    placeholder="+1 234 567 890"
                  />
                </div>
              </InfoCard>
            </div>

            {/* Sidebar - Actions */}
            <div className="space-y-6">
              <InfoCard title="Actions" variant="gradient">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Customer"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => router.push("/crm/customer")}
                  >
                    Cancel
                  </Button>
                </div>
              </InfoCard>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

### 8.2 Edit Page

Create `app/{module}/{doctype}/[name]/edit/page.tsx`:

Follow the same pattern as Create, but:
1. Fetch existing data with `useFrappeDoc`
2. Use `useFrappeUpdate` instead of `useFrappeCreate`
3. Populate form with fetched data using `useEffect`

---

## 9. Step 7: Final Verification

### 9.1 Test Checklist

```
[ ] List page loads with data
[ ] Search/filter works
[ ] Create new record
[ ] View record details
[ ] Edit record
[ ] Delete record with confirmation
[ ] Dark mode looks correct
[ ] Mobile responsive
[ ] Loading states display correctly
[ ] Error states display correctly
[ ] Empty states display correctly
```

### 9.2 Common Issues

| Issue | Solution |
|-------|----------|
| 404 on API | Check `doctype-config.ts` apiPath |
| Data not updating | Check query key in `query-keys.ts` |
| Form not validating | Check Zod schema matches fields |
| Dark mode broken | Use `bg-card` not `bg-white` |
| Dropdown not working | Use `SearchableSelect` or `FrappeSelect` |

---

## 10. Code Templates

### 10.1 Required Files Structure

```
app/
├── api/
│   └── {module}/
│       └── {doctype}/
│           ├── route.ts           # GET (list), POST (create)
│           └── [name]/
│               └── route.ts       # GET, PUT, DELETE
└── {module}/
    └── {doctype}/
        ├── page.tsx               # List page
        ├── new/
        │   └── page.tsx           # Create page
        └── [name]/
            ├── page.tsx           # Detail page
            └── edit/
                └── page.tsx       # Edit page
```

### 10.2 Import Patterns

```typescript
// v3.0 Standard Imports for List Page
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import {
  PageHeader,
  EmptyState,
  LoadingState,
  ConfirmDialog,
} from "@/components/smart";
import type { YourDocType } from "@/types/doctype-types";

// v3.0 Standard Imports for Form Page
import { useFrappeCreate, useFrappeUpdate, useFrappeDoc } from "@/hooks/generic";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormSwitch,
  FormFrappeSelect,
} from "@/components/form";
```

---

## 11. Common Patterns

### 11.1 Boolean Field Handling

Frappe uses `0`/`1` for booleans, React uses `true`/`false`:

```typescript
// Form to Frappe
const frappeData = {
  ...formData,
  disabled: formData.disabled ? 1 : 0,
  is_active: formData.is_active ? 1 : 0,
};

// Frappe to Form
const formData = {
  ...frappeData,
  disabled: frappeData.disabled === 1,
  is_active: frappeData.is_active === 1,
};
```

### 11.2 Link Field (References)

```typescript
<FormFrappeSelect
  control={form.control}
  name="customer"
  label="Customer"
  required
  doctype="Customer"
  labelField="customer_name"
/>
```

### 11.3 Status Badge

```typescript
import { StatusBadge } from "@/components/smart";

<StatusBadge
  status={item.status}
  variant={getStatusVariant(item.status)}
/>
```

### 11.4 Child Tables

For doctypes with child tables, handle them as arrays:

```typescript
// In form schema
items: z.array(z.object({
  item_code: z.string(),
  qty: z.number(),
  rate: z.number(),
})).default([]),
```

---

## Summary

Follow this workflow exactly for every new module:

1. **Generate types** from Frappe
2. **Register doctype** in config files
3. **Create API routes** using factory functions
4. **Create pages** following the templates
5. **Verify** all CRUD operations and UI

**DO NOT:**
- ❌ Use `bg-white` (use `bg-card`)
- ❌ Use native `confirm()` (use `ConfirmDialog`)
- ❌ Skip the doctype registration
- ❌ Create inline styles
- ❌ Skip dark mode testing

**ALWAYS:**

- ✅ Use theme-aware colors
- ✅ Use smart components
- ✅ Use generic hooks
- ✅ Use factory patterns for API
- ✅ Test in both light and dark mode
- ✅ Use `getApiPath()` for cross-module links

---

## 12. Linked Entity Navigation

### 12.1 Cross-Module Navigation with getApiPath()

When implementing navigation between related DocTypes (e.g., Contact → Customer), always use the centralized `getApiPath()` utility:

```typescript
import { getApiPath } from "@/lib/doctype-config";
import Link from "next/link";

// Dynamic URL generation
const linkDoctype = "Customer"; // from linked data
const linkName = "CUST-001";
const href = `/${getApiPath(linkDoctype)}/${encodeURIComponent(linkName)}`;

// Usage in component
<Link href={href}>View {linkDoctype}</Link>
```

**Why this matters:**
- DocType names may have spaces (e.g., "Sales Order")
- URL paths vary by module (e.g., `crm/customer`, `stock/item`)
- `getApiPath()` is the **single source of truth** for path resolution

### 12.2 DataPoint Component for Read-Only Display

Use `DataPoint` from `@/components/ui/info-card` for displaying read-only data in detail pages:

```typescript
import { InfoCard, DataPoint } from "@/components/ui/info-card";

<InfoCard title="Contact Details" icon="contact">
  <div className="grid grid-cols-2 gap-4">
    <DataPoint label="Email" value={contact.email_id} />
    <DataPoint label="Phone" value={contact.phone} />
    <DataPoint label="Mobile" value={contact.mobile_no} />
  </div>
</InfoCard>
```

**Key distinction:**
- **Detail pages** (read-only): Use `DataPoint`
- **Edit/Create pages** (editable): Use `FormInput`, `FormSelect`, etc.

### 12.3 Linked Entities Sidebar Pattern

Standard UI pattern for displaying and navigating to linked DocTypes:

```tsx
import { getApiPath } from "@/lib/doctype-config";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/ui/info-card";
import { Building2, ArrowUpRight } from "lucide-react";

{/* In sidebar of detail page */}
{contact.links && contact.links.length > 0 && (
  <InfoCard title="Linked To" icon="link">
    <div className="space-y-3">
      {(contact.links as any[]).map((link, idx) => {
        const href = `/${getApiPath(link.link_doctype)}/${encodeURIComponent(link.link_name)}`;
        
        return (
          <div
            key={idx}
            className="group flex items-center justify-between p-4 bg-secondary/20 rounded-2xl hover:bg-secondary/40 transition-all duration-300 border border-transparent hover:border-primary/10"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
                  {link.link_doctype}
                </p>
                <p className="font-semibold text-sm">{link.link_name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-primary hover:text-primary-foreground transform active:scale-90 transition-all"
              asChild
            >
              <Link href={href}>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  </InfoCard>
)}
```

**UI Pattern Features:**
- Icon bag with scale-up on hover
- Uppercase metadata label for DocType
- Bold entity name
- Ghost button CTA with primary color on hover
- Active scale-down effect for tactile feedback

### 12.4 Pro Tips

> **🔗 Cross-Module Navigation:**  
> Always rely on `getApiPath(doctype)` from `@/lib/doctype-config`. This ensures that as you migrate more DocTypes to v3.0, any links to them will automatically resolve to the correct folder structure.

> **📝 Detail vs Edit Pages:**  
> Detail pages should use `DataPoint` for read-only display. Never use form inputs on detail pages—this maintains the "quiet luxury" aesthetic and clear UX distinction.

> **🎨 Linked Entities UI:**  
> The pattern here (Icon Bag + Metadata + CTA Button) is the standard for "Linked Entities" sidebars. It maintains a clean, read-only appearance that reveals interactivity only on hover.

---

*This workflow document is the authoritative guide for creating new modules in Pana ERP v3.0.*

