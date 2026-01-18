# Phase E1: Warehouse Module Implementation

> **Version:** 1.0.0  
> **Module:** Stock / Inventory  
> **DocType:** Warehouse  
> **Priority:** 🔴 Critical (Foundation)  
> **Dependencies:** None

---

## Overview

The Warehouse module manages **physical storage locations** for inventory. This is the foundation for all inventory movements and must be implemented first.

### Business Context (Print Shop)

- **Raw Material Store** - Paper, ink, binding supplies
- **Work In Progress (WIP)** - Materials currently on machines
- **Finished Goods** - Completed print jobs awaiting delivery

---

## 1. Configuration Updates

### 1.1 DocType Config (`lib/doctype-config.ts`)

The Warehouse config already exists but needs path update. Verify or update:

```typescript
// lib/doctype-config.ts - STOCK MODULE section
Warehouse: {
  apiPath: "stock/warehouse",  // UPDATE: Remove /settings/
  module: "Stock",
  labelField: "warehouse_name",
  searchFields: ["warehouse_name"],
  defaultSortField: "creation",
  defaultSortOrder: "desc",
  // NOTE: isSettings: false - Warehouses are transactional, not settings
},
```

### 1.2 Query Keys (`lib/query-keys.ts`)

Add to the STOCK MODULE section:

```typescript
// lib/query-keys.ts - STOCK MODULE section
warehouse: {
  all: () => ["Warehouse"] as const,
  list: (options?: FrappeListOptions) =>
    ["Warehouse", "list", options] as const,
  doc: (name: string) => ["Warehouse", "doc", name] as const,
  tree: () => ["Warehouse", "tree"] as const,
  byParent: (parentWarehouse: string) =>
    ["Warehouse", "list", "parent", parentWarehouse] as const,
},
```

---

## 2. Type Verification

Ensure the Warehouse type exists in `types/doctype-types.ts`. If not, run:

```bash
pnpm generate-types Warehouse
```

Expected interface (verify exists):

```typescript
export interface Warehouse {
  warehouse_name: string;
  name: string;
  parent_warehouse?: string;
  is_group?: 0 | 1;
  warehouse_type?: string;
  company?: string;
  disabled?: 0 | 1;
  city?: string;
  state?: string;
  country?: string;
  phone_no?: string;
  mobile_no?: string;
  email_id?: string;
  address_line_1?: string;
  address_line_2?: string;
  lft?: number;
  rgt?: number;
  old_parent?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  docstatus?: 0 | 1 | 2;
}
```

---

## 3. Schema Definition

Add to `lib/schemas/doctype-schemas.ts` if not auto-generated:

```typescript
// lib/schemas/doctype-schemas.ts

/**
 * Warehouse Create Schema
 * @doctype Warehouse
 */
export const WarehouseCreateSchema = z.object({
  warehouse_name: z.string().min(1, "Warehouse Name is required"),
  parent_warehouse: z.string().optional(),
  is_group: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .default(0),
  warehouse_type: z.string().optional(),
  company: z.string().optional(),
  disabled: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .default(0),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone_no: z.string().optional(),
  email_id: z.string().email().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
});

export const WarehouseUpdateSchema = WarehouseCreateSchema.partial();

export type WarehouseFormData = z.infer<typeof WarehouseCreateSchema>;
```

---

## 4. API Routes

### 4.1 List & Create Route

**File:** `app/api/stock/warehouse/route.ts`

```typescript
// app/api/stock/warehouse/route.ts
// Pana ERP v3.0 - Warehouse API (List & Create)

import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { WarehouseCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Warehouse", {
  allowedFields: [
    "name",
    "warehouse_name",
    "parent_warehouse",
    "is_group",
    "warehouse_type",
    "company",
    "disabled",
    "city",
    "lft",
    "rgt",
    "Warehouse.creation",
  ],
  defaultSort: { field: "Warehouse.creation", order: "desc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Warehouse", WarehouseCreateSchema);
```

### 4.2 Single Document Route

**File:** `app/api/stock/warehouse/[name]/route.ts`

```typescript
// app/api/stock/warehouse/[name]/route.ts
// Pana ERP v3.0 - Warehouse Single Document API

import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { WarehouseUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Warehouse");
export const PUT = createUpdateHandler("Warehouse", WarehouseUpdateSchema);
export const DELETE = createDeleteHandler("Warehouse");
```

---

## 5. Client Pages

### 5.1 List Page

**File:** `app/stock/warehouse/page.tsx`

```typescript
// app/stock/warehouse/page.tsx
// Pana ERP v3.0 - Warehouse List Page
// @ts-nocheck

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  Warehouse as WarehouseIcon,
  FolderTree,
  MapPin,
  ChevronRight,
  Building2,
  Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { queryKeys } from "@/lib/query-keys";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import type { Warehouse } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Warehouse Card Component
function WarehouseCard({
  warehouse,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  warehouse: Warehouse;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isGroup = warehouse.is_group === 1;
  const isDisabled = warehouse.disabled === 1;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 p-5",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer",
        "animate-in fade-in slide-in-from-bottom-4",
        isDisabled && "opacity-60"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              isGroup
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {isGroup ? (
              <FolderTree className="h-6 w-6" />
            ) : (
              <WarehouseIcon className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {warehouse.warehouse_name}
            </h3>
            <p className="text-xs text-muted-foreground">{warehouse.name}</p>
          </div>
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-lg"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-lg text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Type Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs rounded-full",
              isGroup
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}
          >
            {isGroup ? "Parent Group" : "Storage Location"}
          </Badge>
          {isDisabled && (
            <Badge variant="secondary" className="text-xs rounded-full">
              Disabled
            </Badge>
          )}
        </div>

        {/* Parent Warehouse */}
        {warehouse.parent_warehouse && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
            <span>Under: {warehouse.parent_warehouse}</span>
          </div>
        )}

        {/* Location Info */}
        {(warehouse.city || warehouse.warehouse_type) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {warehouse.warehouse_type && (
              <div className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                <span>{warehouse.warehouse_type}</span>
              </div>
            )}
            {warehouse.city && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{warehouse.city}</span>
              </div>
            )}
          </div>
        )}

        {/* Company */}
        {warehouse.company && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border/50">
            <Building2 className="h-3.5 w-3.5" />
            <span>{warehouse.company}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Main List Page Component
export default function WarehouseListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<"all" | "groups" | "locations">("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Fetch warehouses
  const {
    data: warehouses,
    isLoading,
    error,
    refetch,
  } = useFrappeList<Warehouse>("Warehouse", {
    fields: [
      "name",
      "warehouse_name",
      "parent_warehouse",
      "is_group",
      "warehouse_type",
      "company",
      "disabled",
      "city",
    ],
    orderBy: { field: "lft", order: "asc" },
    limit: 500,
  });

  // Delete mutation
  const deleteMutation = useFrappeDelete("Warehouse", {
    onSuccess: () => {
      toast.success("Warehouse deleted successfully");
      refetch();
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete warehouse");
    },
  });

  // Filter warehouses
  const filteredWarehouses = useMemo(() => {
    if (!warehouses) return [];

    return warehouses.filter((wh) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        wh.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wh.name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Group filter
      const matchesGroup =
        filterGroup === "all" ||
        (filterGroup === "groups" && wh.is_group === 1) ||
        (filterGroup === "locations" && wh.is_group !== 1);

      return matchesSearch && matchesGroup;
    });
  }, [warehouses, searchTerm, filterGroup]);

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading warehouses..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={WarehouseIcon}
        title="Error loading warehouses"
        description="There was a problem fetching the warehouse list."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Warehouses"
        description="Manage your storage locations and inventory zones"
        action={
          <Button
            onClick={() => router.push("/stock/warehouse/new")}
            className="rounded-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Warehouse
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search warehouses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-full bg-card border-border/50"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { value: "all", label: "All" },
            { value: "groups", label: "Parent Groups" },
            { value: "locations", label: "Locations" },
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={filterGroup === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterGroup(filter.value as typeof filterGroup)}
              className="rounded-full"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Warehouses Grid */}
      {filteredWarehouses.length === 0 ? (
        <EmptyState
          icon={WarehouseIcon}
          title="No warehouses found"
          description={
            searchTerm
              ? "Try adjusting your search criteria"
              : "Create your first warehouse to get started"
          }
          action={
            !searchTerm && (
              <Button
                onClick={() => router.push("/stock/warehouse/new")}
                className="rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((warehouse, index) => (
            <WarehouseCard
              key={warehouse.name}
              warehouse={warehouse}
              index={index}
              onView={() => router.push(`/stock/warehouse/${encodeURIComponent(warehouse.name)}`)}
              onEdit={() => router.push(`/stock/warehouse/${encodeURIComponent(warehouse.name)}/edit`)}
              onDelete={() => setDeleteTarget(warehouse.name)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Warehouse"
        description={`Are you sure you want to delete "${deleteTarget}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
```

### 5.2 Create Page

**File:** `app/stock/warehouse/new/page.tsx`

```typescript
// app/stock/warehouse/new/page.tsx
// Pana ERP v3.0 - Create Warehouse Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, Warehouse as WarehouseIcon } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate } from "@/hooks/generic";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader } from "@/components/smart";
import {
  FormInput,
  FormSwitch,
  FormFrappeSelect,
  FormTextarea,
} from "@/components/form";
import { WarehouseCreateSchema, type WarehouseFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateWarehousePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Initialize form
  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(WarehouseCreateSchema),
    defaultValues: {
      warehouse_name: "",
      parent_warehouse: "",
      is_group: 0,
      warehouse_type: "",
      company: "",
      disabled: 0,
      city: "",
      state: "",
      country: "",
      address_line_1: "",
      address_line_2: "",
      phone_no: "",
      email_id: "",
    },
  });

  // Create mutation
  const createMutation = useFrappeCreate<WarehouseFormData>("Warehouse", {
    onSuccess: (data) => {
      toast.success("Warehouse created successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.all() });
      router.push(`/stock/warehouse/${encodeURIComponent(data.name)}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create warehouse");
    },
  });

  const onSubmit = (data: WarehouseFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Create Warehouse"
        description="Add a new storage location to your inventory system"
        backHref="/stock/warehouse"
        icon={WarehouseIcon}
      />

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Main Card */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="warehouse_name"
                  label="Warehouse Name"
                  placeholder="e.g., Raw Material Store"
                  required
                />

                <FormFrappeSelect
                  control={form.control}
                  name="parent_warehouse"
                  label="Parent Warehouse"
                  doctype="Warehouse"
                  placeholder="Select parent (optional)"
                  filters={[["is_group", "=", 1]]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="warehouse_type"
                  label="Warehouse Type"
                  placeholder="e.g., Raw Materials, WIP, Finished Goods"
                />

                <FormFrappeSelect
                  control={form.control}
                  name="company"
                  label="Company"
                  doctype="Company"
                  placeholder="Select company"
                />
              </div>

              {/* Switches */}
              <div className="flex flex-wrap gap-6 pt-2">
                <FormSwitch
                  control={form.control}
                  name="is_group"
                  label="Is Parent Group"
                  description="Enable if this warehouse contains sub-warehouses"
                />

                <FormSwitch
                  control={form.control}
                  name="disabled"
                  label="Disabled"
                  description="Disable this warehouse from transactions"
                />
              </div>
            </div>
          </div>

          {/* Location Details Card - Collapsible */}
          <details className="bg-card rounded-2xl border border-border/50 overflow-hidden group">
            <summary className="p-6 cursor-pointer list-none flex items-center justify-between hover:bg-secondary/30 transition-colors">
              <h3 className="font-semibold text-lg">Location Details</h3>
              <span className="text-sm text-muted-foreground">Optional</span>
            </summary>
            <div className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="address_line_1"
                  label="Address Line 1"
                  placeholder="Street address"
                />
                <FormInput
                  control={form.control}
                  name="address_line_2"
                  label="Address Line 2"
                  placeholder="Suite, building, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  control={form.control}
                  name="city"
                  label="City"
                  placeholder="City"
                />
                <FormInput
                  control={form.control}
                  name="state"
                  label="State"
                  placeholder="State/Province"
                />
                <FormFrappeSelect
                  control={form.control}
                  name="country"
                  label="Country"
                  doctype="Country"
                  placeholder="Select country"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="phone_no"
                  label="Phone Number"
                  placeholder="+1 234 567 8900"
                />
                <FormInput
                  control={form.control}
                  name="email_id"
                  label="Email"
                  placeholder="warehouse@company.com"
                  type="email"
                />
              </div>
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-full min-w-[120px]"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Warehouse
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

### 5.3 Detail Page

**File:** `app/stock/warehouse/[name]/page.tsx`

```typescript
// app/stock/warehouse/[name]/page.tsx
// Pana ERP v3.0 - Warehouse Detail Page
// @ts-nocheck

"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Warehouse as WarehouseIcon,
  FolderTree,
  MapPin,
  Building2,
  Phone,
  Mail,
  Package,
  ChevronRight,
} from "lucide-react";
import { useFrappeDoc, useFrappeDelete } from "@/hooks/generic";
import { queryKeys } from "@/lib/query-keys";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ConfirmDialog,
} from "@/components/smart";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import type { Warehouse } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const warehouseName = decodeURIComponent(params.name as string);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch warehouse
  const { data: warehouse, isLoading, error } = useFrappeDoc<Warehouse>(
    "Warehouse",
    warehouseName
  );

  // Delete mutation
  const deleteMutation = useFrappeDelete("Warehouse", {
    onSuccess: () => {
      toast.success("Warehouse deleted successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.all() });
      router.push("/stock/warehouse");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete warehouse");
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading warehouse details..." />;
  }

  if (error || !warehouse) {
    return (
      <EmptyState
        icon={WarehouseIcon}
        title="Warehouse not found"
        description="The requested warehouse could not be found."
        action={
          <Button onClick={() => router.push("/stock/warehouse")} className="rounded-full">
            Back to Warehouses
          </Button>
        }
      />
    );
  }

  const isGroup = warehouse.is_group === 1;
  const isDisabled = warehouse.disabled === 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={warehouse.warehouse_name}
        description={warehouse.name}
        backHref="/stock/warehouse"
        icon={isGroup ? FolderTree : WarehouseIcon}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/stock/warehouse/${encodeURIComponent(warehouseName)}/edit`)}
              className="rounded-full"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="rounded-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      {/* Status Badges */}
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={cn(
            "rounded-full",
            isGroup
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}
        >
          {isGroup ? "Parent Group" : "Storage Location"}
        </Badge>
        {isDisabled && (
          <Badge variant="destructive" className="rounded-full">
            Disabled
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information Card */}
        <InfoCard title="Basic Information" icon={WarehouseIcon}>
          <div className="grid grid-cols-2 gap-4">
            <DataPoint label="Warehouse Name" value={warehouse.warehouse_name} />
            <DataPoint label="Warehouse ID" value={warehouse.name} />
            <DataPoint
              label="Parent Warehouse"
              value={warehouse.parent_warehouse || "—"}
              link={warehouse.parent_warehouse ? `/stock/warehouse/${encodeURIComponent(warehouse.parent_warehouse)}` : undefined}
            />
            <DataPoint label="Type" value={warehouse.warehouse_type || "—"} />
            <DataPoint
              label="Company"
              value={warehouse.company || "—"}
            />
            <DataPoint
              label="Status"
              value={isDisabled ? "Disabled" : "Active"}
              badge={true}
              badgeVariant={isDisabled ? "destructive" : "default"}
            />
          </div>
        </InfoCard>

        {/* Location Card */}
        <InfoCard title="Location Details" icon={MapPin}>
          <div className="grid grid-cols-2 gap-4">
            <DataPoint label="Address Line 1" value={warehouse.address_line_1 || "—"} />
            <DataPoint label="Address Line 2" value={warehouse.address_line_2 || "—"} />
            <DataPoint label="City" value={warehouse.city || "—"} />
            <DataPoint label="State" value={warehouse.state || "—"} />
            <DataPoint label="Country" value={warehouse.country || "—"} />
          </div>
        </InfoCard>

        {/* Contact Card */}
        <InfoCard title="Contact Information" icon={Phone}>
          <div className="grid grid-cols-2 gap-4">
            <DataPoint label="Phone" value={warehouse.phone_no || "—"} />
            <DataPoint label="Mobile" value={warehouse.mobile_no || "—"} />
            <DataPoint label="Email" value={warehouse.email_id || "—"} />
          </div>
        </InfoCard>

        {/* Metadata Card */}
        <InfoCard title="System Information" icon={Package}>
          <div className="grid grid-cols-2 gap-4">
            <DataPoint
              label="Created On"
              value={warehouse.creation ? new Date(warehouse.creation).toLocaleDateString() : "—"}
            />
            <DataPoint
              label="Last Modified"
              value={warehouse.modified ? new Date(warehouse.modified).toLocaleDateString() : "—"}
            />
            <DataPoint label="Owner" value={warehouse.owner || "—"} />
          </div>
        </InfoCard>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Warehouse"
        description={`Are you sure you want to delete "${warehouse.warehouse_name}"? This action cannot be undone and may affect existing stock entries.`}
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate(warehouseName)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
```

### 5.4 Edit Page

**File:** `app/stock/warehouse/[name]/edit/page.tsx`

```typescript
// app/stock/warehouse/[name]/edit/page.tsx
// Pana ERP v3.0 - Edit Warehouse Page
// @ts-nocheck

"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Warehouse as WarehouseIcon } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeDoc, useFrappeUpdate } from "@/hooks/generic";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader, LoadingState, EmptyState } from "@/components/smart";
import {
  FormInput,
  FormSwitch,
  FormFrappeSelect,
} from "@/components/form";
import { WarehouseCreateSchema, type WarehouseFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Warehouse } from "@/types/doctype-types";

export default function EditWarehousePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const warehouseName = decodeURIComponent(params.name as string);

  // Fetch existing warehouse
  const { data: warehouse, isLoading, error } = useFrappeDoc<Warehouse>(
    "Warehouse",
    warehouseName
  );

  // Initialize form
  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(WarehouseCreateSchema),
    defaultValues: {
      warehouse_name: "",
      parent_warehouse: "",
      is_group: 0,
      warehouse_type: "",
      company: "",
      disabled: 0,
      city: "",
      state: "",
      country: "",
      address_line_1: "",
      address_line_2: "",
      phone_no: "",
      email_id: "",
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (warehouse) {
      form.reset({
        warehouse_name: warehouse.warehouse_name || "",
        parent_warehouse: warehouse.parent_warehouse || "",
        is_group: warehouse.is_group ?? 0,
        warehouse_type: warehouse.warehouse_type || "",
        company: warehouse.company || "",
        disabled: warehouse.disabled ?? 0,
        city: warehouse.city || "",
        state: warehouse.state || "",
        country: warehouse.country || "",
        address_line_1: warehouse.address_line_1 || "",
        address_line_2: warehouse.address_line_2 || "",
        phone_no: warehouse.phone_no || "",
        email_id: warehouse.email_id || "",
      });
    }
  }, [warehouse, form]);

  // Update mutation
  const updateMutation = useFrappeUpdate<WarehouseFormData>("Warehouse", warehouseName, {
    onSuccess: () => {
      toast.success("Warehouse updated successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.doc(warehouseName) });
      router.push(`/stock/warehouse/${encodeURIComponent(warehouseName)}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update warehouse");
    },
  });

  const onSubmit = (data: WarehouseFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <LoadingState message="Loading warehouse..." />;
  }

  if (error || !warehouse) {
    return (
      <EmptyState
        icon={WarehouseIcon}
        title="Warehouse not found"
        description="The requested warehouse could not be found."
        action={
          <Button onClick={() => router.push("/stock/warehouse")} className="rounded-full">
            Back to Warehouses
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Edit: ${warehouse.warehouse_name}`}
        description="Update warehouse details"
        backHref={`/stock/warehouse/${encodeURIComponent(warehouseName)}`}
        icon={WarehouseIcon}
      />

      {/* Form - Same structure as Create page */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Main Card */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="warehouse_name"
                  label="Warehouse Name"
                  placeholder="e.g., Raw Material Store"
                  required
                />

                <FormFrappeSelect
                  control={form.control}
                  name="parent_warehouse"
                  label="Parent Warehouse"
                  doctype="Warehouse"
                  placeholder="Select parent (optional)"
                  filters={[["is_group", "=", 1], ["name", "!=", warehouseName]]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="warehouse_type"
                  label="Warehouse Type"
                  placeholder="e.g., Raw Materials, WIP, Finished Goods"
                />

                <FormFrappeSelect
                  control={form.control}
                  name="company"
                  label="Company"
                  doctype="Company"
                  placeholder="Select company"
                />
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <FormSwitch
                  control={form.control}
                  name="is_group"
                  label="Is Parent Group"
                  description="Enable if this warehouse contains sub-warehouses"
                />

                <FormSwitch
                  control={form.control}
                  name="disabled"
                  label="Disabled"
                  description="Disable this warehouse from transactions"
                />
              </div>
            </div>
          </div>

          {/* Location Details Card */}
          <details className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <summary className="p-6 cursor-pointer list-none flex items-center justify-between hover:bg-secondary/30 transition-colors">
              <h3 className="font-semibold text-lg">Location Details</h3>
              <span className="text-sm text-muted-foreground">Optional</span>
            </summary>
            <div className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  control={form.control}
                  name="address_line_1"
                  label="Address Line 1"
                  placeholder="Street address"
                />
                <FormInput
                  control={form.control}
                  name="address_line_2"
                  label="Address Line 2"
                  placeholder="Suite, building, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput control={form.control} name="city" label="City" placeholder="City" />
                <FormInput control={form.control} name="state" label="State" placeholder="State/Province" />
                <FormFrappeSelect
                  control={form.control}
                  name="country"
                  label="Country"
                  doctype="Country"
                  placeholder="Select country"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput control={form.control} name="phone_no" label="Phone" placeholder="+1 234 567 8900" />
                <FormInput control={form.control} name="email_id" label="Email" placeholder="warehouse@company.com" type="email" />
              </div>
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="rounded-full min-w-[120px]">
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
```

---

## 6. File Structure Summary

```
app/stock/warehouse/
├── page.tsx                    # List View
├── new/page.tsx                # Create Form
└── [name]/
    ├── page.tsx                # Detail View
    └── edit/page.tsx           # Edit Form

app/api/stock/warehouse/
├── route.ts                    # GET list, POST create
└── [name]/route.ts             # GET, PUT, DELETE
```

---

## 7. Testing Checklist

- [ ] Create parent warehouse "All Warehouses" (is_group: true)
- [ ] Create "Raw Material Store" under "All Warehouses"
- [ ] Create "Work In Progress" under "All Warehouses"
- [ ] Create "Finished Goods" under "All Warehouses"
- [ ] Verify list page shows all warehouses
- [ ] Verify filter by groups vs locations works
- [ ] Search by warehouse name
- [ ] View warehouse detail page
- [ ] Edit warehouse
- [ ] Delete warehouse (without stock)
- [ ] Test dark mode on all pages
- [ ] Test mobile responsiveness

---

## 8. Common Pitfalls to Avoid

1. **DO NOT** hardcode API paths - always use `getApiPath()` or DocType config
2. **DO NOT** use form inputs on detail pages - use `DataPoint` component
3. **DO NOT** manually define types - use auto-generated from `types/doctype-types.ts`
4. **DO NOT** skip `@ts-nocheck` at top of client components (temporary measure)
5. **DO** use `encodeURIComponent()` for URL params with warehouse names (they have spaces)
6. **DO** use `"Warehouse.creation"` in API sort to avoid ambiguous column errors
7. **DO** convert Frappe's `0/1` booleans to proper display values

---

_This document provides complete implementation specifications for Phase E1: Warehouse Module._
