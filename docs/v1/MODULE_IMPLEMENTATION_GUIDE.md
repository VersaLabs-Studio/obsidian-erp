# Pana ERP - Module Implementation Guide for Code Generation

> **Purpose**: This document provides everything needed to implement new modules in Pana ERP.
> **Target Audience**: LLM code generators / AI assistants

---

## Quick Start Checklist

For each new module, create these files in order:

1. `types/{module}.ts` - TypeScript interfaces
2. `lib/schemas/{module}.ts` - Zod schema + converters
3. `hooks/data/use{Module}Query.ts` - TanStack Query hooks
4. `app/api/{path}/route.ts` - API endpoints
5. `app/{path}/page.tsx` - List page
6. `app/{path}/new/page.tsx` - Create page
7. `app/{path}/[name]/page.tsx` - Detail page
8. `app/{path}/[name]/edit/page.tsx` - Edit page

---

## 1. Types File Template

**File**: `types/{module}.ts`

```typescript
// types/{module}.ts
// Pana ERP - {Module} Type Definitions

/**
 * {Module} - Frappe API response format
 * Uses numbers (0/1) for boolean fields as returned by Frappe
 */
export interface {Module} {
  name: string;
  // Add fields based on Frappe doctype
  // Use number for booleans: is_active: number; // 0 or 1
  // Standard Frappe fields
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  docstatus?: 0 | 1 | 2;
}

export interface {Module}CreateRequest {
  // Required fields for creation
}

export interface {Module}UpdateRequest extends Partial<{Module}CreateRequest> {
  name?: string;
}

export interface {Module}Filters {
  // Filter fields for list queries
}

export interface {Module}Options {
  // Dropdown options structure
}
```

---

## 2. Schema File Template

**File**: `lib/schemas/{module}.ts`

```typescript
// lib/schemas/{module}.ts
import { z } from "zod";
import { {Module} } from "@/types/{module}";

export const {module}FormSchema = z.object({
  field_name: z.string().min(1, "Required"),
  optional_field: z.string(),
  is_boolean: z.boolean(),
});

export type {Module}FormData = z.infer<typeof {module}FormSchema>;

export const default{Module}FormValues: {Module}FormData = {
  field_name: "",
  optional_field: "",
  is_boolean: true,
};

// Convert form (boolean) to Frappe API (0/1)
export function formToFrappe(data: {Module}FormData): Record<string, string | number> {
  return {
    ...data,
    is_boolean: data.is_boolean ? 1 : 0,
  };
}

// Convert Frappe API (0/1) to form (boolean)
export function frappeToForm(doc: {Module}): {Module}FormData {
  return {
    field_name: doc.field_name || "",
    optional_field: doc.optional_field || "",
    is_boolean: Boolean(doc.is_boolean),
  };
}
```

---

## 3. Data Hooks Template

**File**: `hooks/data/use{Module}Query.ts`

```typescript
// hooks/data/use{Module}Query.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { {Module}, {Module}CreateRequest, {Module}UpdateRequest, {Module}Filters, {Module}Options } from "@/types/{module}";
import { toast } from "sonner";

// List Query
export function use{Module}sQuery(filters?: {Module}Filters) {
  return useQuery({
    queryKey: ["{module}s", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Add filter params
      const response = await fetch(`/api/{path}?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to fetch");
      }
      return response.json() as Promise<{ data: { {module}s: {Module}[] } }>;
    },
    staleTime: 60 * 1000,
  });
}

// Single Item Query
export function use{Module}Query(name: string) {
  return useQuery({
    queryKey: ["{module}", name],
    queryFn: async () => {
      const response = await fetch(`/api/{path}/${encodeURIComponent(name)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch");
      }
      return response.json() as Promise<{ data: { {module}: {Module} } }>;
    },
    enabled: !!name,
    staleTime: 60 * 1000,
  });
}

// Options Query (for dropdowns)
export function use{Module}OptionsQuery() {
  return useQuery({
    queryKey: ["{module}Options"],
    queryFn: async () => {
      const response = await fetch("/api/{path}/options");
      if (!response.ok) throw new Error("Failed to fetch options");
      return response.json() as Promise<{ data: {Module}Options }>;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Create Mutation
export function useCreate{Module}Mutation(options?: {
  onSuccess?: (data: { data: { {module}: {Module} } }) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {Module}CreateRequest) => {
      const response = await fetch("/api/{path}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to create");
      }
      return response.json() as Promise<{ data: { {module}: {Module} } }>;
    },
    onSuccess: (data) => {
      toast.success("{Module} created successfully");
      queryClient.invalidateQueries({ queryKey: ["{module}s"] });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create: ${error.message}`);
      options?.onError?.(error);
    },
  });
}

// Update Mutation
export function useUpdate{Module}Mutation(options?: {
  onSuccess?: (data: { data: { {module}: {Module} } }) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: {Module}UpdateRequest }) => {
      const response = await fetch(`/api/{path}?name=${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to update");
      }
      return response.json() as Promise<{ data: { {module}: {Module} } }>;
    },
    onSuccess: (data, variables) => {
      toast.success("{Module} updated successfully");
      queryClient.invalidateQueries({ queryKey: ["{module}s"] });
      queryClient.invalidateQueries({ queryKey: ["{module}", variables.name] });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
      options?.onError?.(error);
    },
  });
}

// Delete Mutation
export function useDelete{Module}Mutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/{path}?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to delete");
      }
      return response.json() as Promise<{ message: string }>;
    },
    onSuccess: (_, name) => {
      toast.success("{Module} deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["{module}s"] });
      queryClient.removeQueries({ queryKey: ["{module}", name] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
```

---

## 4. API Route Template

**File**: `app/api/{path}/route.ts`

```typescript
// app/api/{path}/route.ts
import { NextRequest } from 'next/server';
import { frappeClient } from '@/lib/frappe-client';
import { handleApiRequest, withEndpointLogging } from '@/lib/api-template';
import { {Module}, {Module}CreateRequest, {Module}UpdateRequest } from '@/types/{module}';

const DOCTYPE = '{FrappeDocType}'; // e.g., 'Item', 'Item Price'

// GET - Fetch all
export async function GET(request: NextRequest) {
  return handleApiRequest<{ {module}s: {Module}[] }>(
    withEndpointLogging('/api/{path} - GET')(async () => {
      const { searchParams } = new URL(request.url);
      const fields = ['name', /* add required fields */];
      const filters: any[] = [];
      // Build filters from searchParams
      
      const docs = await frappeClient.db.getDocList(DOCTYPE, {
        fields,
        filters,
        orderBy: { field: 'modified', order: 'desc' },
        limit: 100,
      });
      return { {module}s: docs };
    })
  );
}

// POST - Create
export async function POST(request: NextRequest) {
  return handleApiRequest<{ {module}: {Module} }>(
    withEndpointLogging('/api/{path} - POST')(async () => {
      const data: {Module}CreateRequest = await request.json();
      // Validation
      await frappeClient.db.createDoc(DOCTYPE, data);
      const doc = await frappeClient.db.getDoc<{Module}>(DOCTYPE, data.name);
      return { {module}: doc as {Module} };
    })
  );
}

// PUT - Update
export async function PUT(request: NextRequest) {
  return handleApiRequest<{ {module}: {Module} }>(
    withEndpointLogging('/api/{path} - PUT')(async () => {
      const { searchParams } = new URL(request.url);
      const name = searchParams.get('name');
      if (!name) throw new Error('Name parameter required');
      
      const data: {Module}UpdateRequest = await request.json();
      await frappeClient.db.updateDoc(DOCTYPE, name, data);
      const doc = await frappeClient.db.getDoc<{Module}>(DOCTYPE, name);
      return { {module}: doc as {Module} };
    })
  );
}

// DELETE
export async function DELETE(request: NextRequest) {
  return handleApiRequest<{ message: string }>(
    withEndpointLogging('/api/{path} - DELETE')(async () => {
      const { searchParams } = new URL(request.url);
      const name = searchParams.get('name');
      if (!name) throw new Error('Name parameter required');
      
      await frappeClient.db.deleteDoc(DOCTYPE, name);
      return { message: `Deleted successfully` };
    })
  );
}
```

---

## 5. List Page Template

**File**: `app/{path}/page.tsx`

```tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { useExport } from "@/hooks/useExport";
import { use{Module}sQuery, useDelete{Module}Mutation } from "@/hooks/data/use{Module}Query";
import { Plus, Package, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function {Module}ListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = use{Module}sQuery();
  const deleteMutation = useDelete{Module}Mutation();
  const { exportData, isExporting } = useExport();

  const items = data?.data?.{module}s || [];

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleExport = async (format: "csv" | "pdf") => {
    await exportData(filteredItems, "{module}s-export", "{Module}s Report", format);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{Module}s</h1>
          <p className="text-muted-foreground mt-1">
            Manage your {module}s ({filteredItems.length} total)
          </p>
        </div>
        <Button
          onClick={() => router.push("/{path}/new")}
          className="rounded-full px-6 shadow-lg shadow-primary/25"
        >
          <Plus className="h-4 w-4 mr-2" /> New {Module}
        </Button>
      </div>

      {/* Toolbar */}
      <ListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search {module}s..."
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* List */}
      <div className="space-y-2">
        {filteredItems.map((item, idx) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-left-4"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">Description here</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem onClick={() => router.push(`/{path}/${encodeURIComponent(item.name)}`)}>
                  <Eye className="h-4 w-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/{path}/${encodeURIComponent(item.name)}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(item.name)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-muted/50 rounded-2xl w-1/3" />
      <div className="h-12 bg-muted/50 rounded-full" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-muted/40 rounded-2xl" />
      ))}
    </div>
  );
}
```

---

## 6. Detail Page Template

**File**: `app/{path}/[name]/page.tsx`

```tsx
"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { use{Module}Query, useDelete{Module}Mutation } from "@/hooks/data/use{Module}Query";
import { PageHeader } from "@/components/ui/page-header";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { useExport } from "@/hooks/useExport";
import { Edit, Trash2, Download, Package, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-16 bg-muted/60 rounded-full" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-80 bg-muted/50 rounded-[2rem]" />
        </div>
        <div className="lg:col-span-4 h-60 bg-muted/40 rounded-[2rem]" />
      </div>
    </div>
  );
}

function DetailContent() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const name = decodeURIComponent(params.name);
  
  const { data, isLoading } = use{Module}Query(name);
  const deleteMutation = useDelete{Module}Mutation();
  const { exportData, isExporting } = useExport();

  if (isLoading || !data) return <LoadingSkeleton />;

  const item = data.data.{module};
  const isActive = !item.disabled;

  const handleDelete = async () => {
    if (confirm("Are you sure?")) {
      await deleteMutation.mutateAsync(name);
      router.push("/{path}");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader
        backUrl="/{path}"
        label="Details"
        title={item.name}
        status={{
          label: isActive ? "Active" : "Inactive",
          variant: isActive ? "success" : "destructive",
        }}
        primaryAction={{
          label: "Edit",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => router.push(`/{path}/${encodeURIComponent(name)}/edit`),
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={() => exportData([item], "export", "Report", "pdf")}>
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <InfoCard title={<><Package className="h-4 w-4" /> Core Data</>} delay={100}>
            <div className="grid grid-cols-2 gap-6">
              <DataPoint label="Name" value={item.name} />
              {/* Add more DataPoints */}
            </div>
          </InfoCard>
        </div>

        <div className="lg:col-span-4">
          <div className="sticky top-20 space-y-6">
            <InfoCard title="Metadata" variant="gradient" delay={200}>
              <div className="space-y-4">
                <DataPoint label="Created" value={item.creation} />
                <DataPoint label="Modified" value={item.modified} />
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function {Module}DetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DetailContent />
    </Suspense>
  );
}
```

---

## 7. Create Page Template

**File**: `app/{path}/new/page.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/ui/page-header";
import { InfoCard } from "@/components/ui/info-card";
import { DataField, PremiumInput, ToggleCard } from "@/components/ui/form-field";
import { useCreate{Module}Mutation, use{Module}OptionsQuery } from "@/hooks/data/use{Module}Query";
import { {module}FormSchema, {Module}FormData, default{Module}FormValues, formToFrappe } from "@/lib/schemas/{module}";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Package } from "lucide-react";

export default function Create{Module}Page() {
  const router = useRouter();
  const createMutation = useCreate{Module}Mutation({
    onSuccess: (data) => {
      router.push(`/{path}/${encodeURIComponent(data.data.{module}.name)}`);
    },
  });
  const { data: optionsData } = use{Module}OptionsQuery();

  const form = useForm<{Module}FormData>({
    resolver: zodResolver({module}FormSchema),
    defaultValues: default{Module}FormValues,
  });

  const onSubmit = (data: {Module}FormData) => {
    createMutation.mutate(formToFrappe(data) as any);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader
        backUrl="/{path}"
        label="Creating"
        title="New {Module}"
        primaryAction={{
          label: "Create",
          icon: <Save className="h-4 w-4" />,
          onClick: form.handleSubmit(onSubmit),
          loading: createMutation.isPending,
          disabled: !form.formState.isValid,
        }}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <InfoCard title={<><Package className="h-4 w-4" /> Basic Info</>} delay={100}>
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="field_name"
                    render={({ field }) => (
                      <FormItem>
                        <DataField label="Field Name" required error={form.formState.errors.field_name?.message}>
                          <FormControl>
                            <PremiumInput {...field} placeholder="Enter value" />
                          </FormControl>
                        </DataField>
                      </FormItem>
                    )}
                  />
                </div>
              </InfoCard>
            </div>

            <div className="lg:col-span-4">
              <InfoCard title="Settings" variant="gradient" delay={200}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="is_boolean"
                    render={({ field }) => (
                      <ToggleCard
                        checked={field.value}
                        onChange={field.onChange}
                        title="Toggle Option"
                        description="Enable this feature"
                      />
                    )}
                  />
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

---

## 8. Edit Page Template

Similar to Create page, but:
1. Fetch existing data with `use{Module}Query(name)`
2. Use `useUpdate{Module}Mutation` instead of create
3. Reset form when data loads: `useEffect(() => { if (data) form.reset(frappeToForm(data.data.{module})); }, [data])`
4. Add change detection: `const hasChanges = form.formState.isDirty`

---

## Critical Patterns

### API Response Structure
All API responses use this wrapper:
```json
{ "success": true, "data": { /* your data */ }, "message": "..." }
```

### Boolean Conversion
- Frappe uses `0` and `1` for booleans
- Forms use `true` and `false`
- Always convert with `formToFrappe()` and `frappeToForm()`

### Suspense Boundaries
Always wrap dynamic pages with Suspense:
```tsx
function Content() {
  const params = useParams(); // Inside Suspense
  // ...
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Content /></Suspense>;
}
```

### Query Keys Convention
```typescript
["items"]           // List
["item", "ITEM-01"] // Single
["itemOptions"]     // Options
```

---

## Component Import Reference

```tsx
// Core UI
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { InfoCard, DataPoint, StatCard } from "@/components/ui/info-card";
import { DataField, PremiumInput, ToggleCard } from "@/components/ui/form-field";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { SearchableSelect } from "@/components/ui/searchable-select";

// Forms
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Utilities
import { useExport } from "@/hooks/useExport";
import { cn } from "@/lib/utils";

// Icons (Lucide)
import { Plus, Edit, Trash2, Save, Settings, Package, Eye, MoreHorizontal } from "lucide-react";
```

---

*Generated: December 16, 2024 | Pana ERP v1.3.3*
