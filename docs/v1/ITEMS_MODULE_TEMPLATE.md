# Pana ERP v1.3 - Items Module Template Documentation

## Overview

The Items Module serves as the **production-ready template** for all future modules in Pana ERP. This document outlines the architectural patterns, reusable components, and best practices established in this module.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Reusable Components](#reusable-components)
4. [Data Layer Pattern](#data-layer-pattern)
5. [Type System](#type-system)
6. [UI Patterns](#ui-patterns)
7. [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **UI Framework** | Next.js 16 (App Router) | Server/Client Components, Routing |
| **State Management** | TanStack Query 5 | Server state, caching, mutations |
| **Forms** | React Hook Form 7 + Zod 3 | Form state, validation |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Font** | Plus Jakarta Sans (next/font) | Premium typography |
| **Icons** | Lucide React | Consistent iconography |
| **Backend** | Frappe via Next.js API Routes | Data persistence |

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  UI Component   │ ──▶ │ TanStack Query   │ ──▶ │ API Route       │ ──▶ │ Frappe SDK   │
│  (Client)       │ ◀── │ Hook             │ ◀── │ (/api/...)      │ ◀── │ (Backend)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └──────────────┘
```

---

## Directory Structure

```
app/stock/item/                    # Module Root
├── page.tsx                       # List View (index)
├── new/
│   └── page.tsx                   # Create Form
└── [name]/
    ├── page.tsx                   # Detail View
    └── edit/
        └── page.tsx               # Edit Form

hooks/data/
└── useItemsQuery.ts               # Data hooks (queries + mutations)

lib/schemas/
└── item.ts                        # Zod schemas + type utilities

types/
└── item.ts                        # TypeScript interfaces

components/ui/
├── page-header.tsx                # Floating header component
├── info-card.tsx                  # Card components
├── form-field.tsx                 # Form field components
└── list-toolbar.tsx               # Search/Filter/Export toolbar

app/api/stock/item/
├── route.ts                       # CRUD endpoints
├── [name]/
│   └── route.ts                   # Single item endpoints
└── options/
    └── route.ts                   # Dropdown options endpoint
```

---

## Reusable Components

### 1. PageHeader

Floating header with back navigation, title, status, and actions.

```tsx
import { PageHeader } from "@/components/ui/page-header";

<PageHeader
  backUrl="/stock/item"
  label="Editing"
  title={item.item_name}
  status={{ label: "Active", variant: "success" }}
  hasChanges={hasChanges}
  primaryAction={{
    label: "Save",
    icon: <Save className="h-4 w-4" />,
    onClick: handleSubmit,
    loading: isPending,
    disabled: !hasChanges,
  }}
>
  {/* Additional actions (dropdowns, etc.) */}
</PageHeader>
```

**Props:**
- `backUrl` / `onBack` - Navigation
- `label` - Small text above title
- `title` - Main heading
- `status` - Badge with variant (success/warning/destructive/default)
- `hasChanges` - Shows unsaved indicator
- `primaryAction` - Main action button config
- `children` - Additional elements (dropdown menus)

### 2. InfoCard

Card container with title, variants, and animation.

```tsx
import { InfoCard, DataPoint, StatCard } from "@/components/ui/info-card";

<InfoCard
  title={<><Package className="h-4 w-4" /> Core Data</>}
  variant="gradient"
  delay={100}
>
  <DataPoint label="Item Name" value={item.item_name} />
  <StatCard label="Stock" value="1,240" />
</InfoCard>
```

**Variants:**
- `default` - White card with shadow
- `gradient` - Gradient background
- `transparent` - No background/border

### 3. Form Field Components

```tsx
import { DataField, PremiumInput, ToggleCard } from "@/components/ui/form-field";

// Text input with label
<DataField label="Item Name" required error={errors.item_name?.message}>
  <PremiumInput {...register("item_name")} />
</DataField>

// Toggle card
<ToggleCard
  checked={isStockItem}
  onChange={setIsStockItem}
  title="Stock Item"
  description="Track inventory"
  variant="default" // or "destructive"
/>
```

### 4. ListToolbar

Search, filter, and export toolbar.

```tsx
import { ListToolbar } from "@/components/ui/list-toolbar";

<ListToolbar
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder="Search items..."
  onExport={handleExport}
  isExporting={isExporting}
  filters={[
    {
      key: "group",
      label: "Item Group",
      value: groupFilter,
      onChange: setGroupFilter,
      options: [
        { label: "All Groups", value: "all" },
        ...groups.map(g => ({ label: g, value: g })),
      ],
    },
  ]}
/>
```

---

## Data Layer Pattern

### Query Keys Convention

```typescript
// List queries
["items"]                      // All items
["items", { group: "Raw Materials" }]  // Filtered

// Single item queries
["item", "ITEM-001"]

// Options queries  
["itemOptions"]
```

### Hook Structure

```typescript
// hooks/data/useItemsQuery.ts

// 1. List query
export function useItemsQuery(filters?: ItemFilters) {
  return useQuery({
    queryKey: ["items", filters],
    queryFn: async () => fetch("/api/stock/item").then(r => r.json()),
    staleTime: 60 * 1000,
  });
}

// 2. Single item query
export function useItemQuery(name: string) {
  return useQuery({
    queryKey: ["item", name],
    queryFn: async () => fetch(`/api/stock/item/${name}`).then(r => r.json()),
    enabled: !!name,
  });
}

// 3. Options query (for dropdowns)
export function useItemOptionsQuery() {
  return useQuery({
    queryKey: ["itemOptions"],
    staleTime: 10 * 60 * 1000, // Cache longer
  });
}

// 4. Mutations with toast notifications
export function useCreateItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => fetch("/api/stock/item", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success("Item created");
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (error) => toast.error(error.message),
  });
}
```

---

## Type System

### Frappe ↔ Form Type Conversion

Frappe uses `0/1` for booleans, but forms use `true/false`.

```typescript
// lib/schemas/item.ts

// 1. Zod schema for form validation
export const itemFormSchema = z.object({
  item_name: z.string().min(1, "Required"),
  item_code: z.string().min(1, "Required"),
  is_stock_item: z.boolean(),
  // ...
});

export type ItemFormData = z.infer<typeof itemFormSchema>;

// 2. Default values
export const defaultItemFormValues: ItemFormData = {
  item_name: "",
  item_code: "",
  is_stock_item: true,
  // ...
};

// 3. Conversion functions
export function formToFrappe(data: ItemFormData) {
  return {
    ...data,
    is_stock_item: data.is_stock_item ? 1 : 0,
  };
}

export function frappeToForm(item: Item): ItemFormData {
  return {
    ...item,
    is_stock_item: Boolean(item.is_stock_item),
  };
}
```

### Types vs Interfaces

```typescript
// types/item.ts

// Use interfaces for API responses (Frappe format)
export interface Item {
  name: string;
  item_code: string;
  is_stock_item: number; // 0 or 1
}

// Use Zod inference for form types
export type ItemFormData = z.infer<typeof itemFormSchema>;
```

---

## UI Patterns

### 1. Page Layout

```tsx
// Standard page structure
<div className="max-w-6xl mx-auto space-y-8 pb-20">
  <PageHeader ... />
  
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    {/* Main content - 8 columns */}
    <div className="lg:col-span-8 space-y-8">
      <InfoCard>...</InfoCard>
    </div>
    
    {/* Sidebar - 4 columns */}
    <div className="lg:col-span-4 space-y-6">
      <div className="sticky top-20">
        <InfoCard>...</InfoCard>
      </div>
    </div>
  </div>
</div>
```

### 2. Animation Classes

```css
/* Built-in animations */
.animate-slide-up     /* Slide up with fade */
.animate-scale-in     /* Scale up */
.delay-100           /* Animation delay */

/* Usage with stagger */
{items.map((item, idx) => (
  <div 
    className="animate-slide-up"
    style={{ animationDelay: `${idx * 50}ms` }}
  />
))}
```

### 3. Loading Skeleton Pattern

**✨ UPDATED (v1.3.1)**: Skeleton components now use more visible colors for better loading state feedback.

```tsx
function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      {/* Header skeleton - most prominent */}
      <div className="h-16 bg-muted/60 rounded-full" />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main content skeletons */}
        <div className="lg:col-span-8 space-y-6">
          <div className="h-80 bg-muted/50 rounded-[2rem]" />
          <div className="h-40 bg-muted/50 rounded-[2rem]" />
        </div>
        
        {/* Sidebar skeleton - least prominent */}
        <div className="lg:col-span-4 h-60 bg-muted/40 rounded-[2rem]" />
      </div>
    </div>
  );
}
```

**Key Changes:**
- ❌ Old: `bg-secondary/50`, `bg-secondary/30`, `bg-secondary/20` (too subtle, hard to see)
- ✅ New: `bg-muted/60`, `bg-muted/50`, `bg-muted/40` (more visible, better contrast)
- Enhanced `Skeleton` component in `components/ui/skeleton.tsx` with shimmer effect

**Color Hierarchy:**
- Header/Primary: `bg-muted/60` (most visible)
- Main Content: `bg-muted/50` (medium visibility)
- Sidebar/Secondary: `bg-muted/40` (subtle but visible)

### 4. Premium Input Styling

```tsx
// Standard input classes
className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white border-0 shadow-none"

// Select trigger
className="h-12 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white border-0"

// Select content
className="rounded-2xl shadow-xl bg-white/95 backdrop-blur-xl border-0"
```

### 5. Status Badges

```tsx
<div className={cn(
  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border",
  isActive 
    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    : "bg-destructive/10 text-destructive border-destructive/20"
)}>
  {isActive ? "Active" : "Inactive"}
</div>
```

---

## Implementation Checklist

When creating a new module, follow this checklist:

### 1. Types & Schema
- [ ] Create `types/{module}.ts` with interfaces
- [ ] Create `lib/schemas/{module}.ts` with Zod schema
- [ ] Add default form values
- [ ] Add `formToFrappe` and `frappeToForm` converters

### 2. Data Layer
- [ ] Create `hooks/data/use{Module}Query.ts`
- [ ] Implement list query hook
- [ ] Implement single item query hook
- [ ] Implement options query hook (if dropdowns needed)
- [ ] Implement create mutation with toast
- [ ] Implement update mutation with toast
- [ ] Implement delete mutation with toast

### 3. API Routes
- [ ] Create `app/api/{module}/route.ts` (GET list, POST create)
- [ ] Create `app/api/{module}/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Create `app/api/{module}/options/route.ts` (if dropdowns)

### 4. Pages
- [ ] Create list page with `ListToolbar`
- [ ] Create detail page with export functionality
- [ ] Create new/create form page
- [ ] Create edit form page

### 5. Testing
- [ ] Test TypeScript compilation
- [ ] Test all CRUD operations
- [ ] Test filters and search
- [ ] Test export (CSV/PDF)
- [ ] Test form validation
- [ ] Test loading/error states

---

## Quick Reference

### Import Statements Template

```tsx
// Page component imports
"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { DataField, PremiumInput, ToggleCard } from "@/components/ui/form-field";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { useExport } from "@/hooks/useExport";
import { moduleFormSchema, type ModuleFormData, formToFrappe, frappeToForm, defaultFormValues } from "@/lib/schemas/{module}";
import { useModulesQuery, useModuleQuery, useCreateModuleMutation, useUpdateModuleMutation, useDeleteModuleMutation } from "@/hooks/data/use{Module}Query";
```

---

## Troubleshooting Common Issues

### Issue 1: "Uncached data was accessed outside of Suspense" Error

**Problem:** Next.js throws a blocking route error when `useParams()` or other data-fetching hooks are called outside of a `<Suspense>` boundary.

**Error Message:**
```
Server Error: Route "/path/[param]": Uncached data was accessed outside of <Suspense>. 
This delays the entire page from rendering, resulting in a slow user experience.
```

**Solution:** Move all data access (including `useParams()`) inside the Suspense boundary.

**❌ Incorrect Pattern:**
```tsx
export default function DetailPage() {
  const params = useParams<{ name: string }>();  // ❌ Outside Suspense
  const itemName = decodeURIComponent(params.name);

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DetailContent itemName={itemName} />
    </Suspense>
  );
}
```

**✅ Correct Pattern:**
```tsx
function DetailContent() {
  const params = useParams<{ name: string }>();  // ✅ Inside Suspense
  const itemName = decodeURIComponent(params.name);
  const { data, isLoading } = useItemQuery(itemName);
  
  if (isLoading || !data) return <LoadingSkeleton />;
  
  return <div>{/* content */}</div>;
}

export default function DetailPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DetailContent />
    </Suspense>
  );
}
```

**Key Points:**
- Main component should only handle the Suspense wrapper
- All hooks (`useParams`, `useRouter`, data queries) go inside the Suspense boundary
- Loading skeleton shows while params and data are being fetched

---

### Issue 2: Data Fetched But Not Displayed (Stuck on Loading Skeleton)

**Problem:** API successfully returns data (visible in network tab/Postman), but the page remains stuck showing the loading skeleton.

**Root Cause:** Mismatch between the API response structure and what the component expects.

**Common Scenario:**

The `handleApiRequest` wrapper in `lib/api-template.ts` wraps all responses in this structure:
```json
{
  "success": true,
  "data": { /* your data here */ },
  "message": "Request successful"
}
```

**❌ Incorrect Hook Return Type:**
```typescript
export function useItemPriceQuery(name: string) {
  return useQuery({
    queryKey: ["item-price", name],
    queryFn: async () => {
      const response = await fetch(`/api/stock/item-price/${name}`);
      // ❌ Missing the 'data' wrapper
      return response.json() as Promise<{ item_price: ItemPrice }>;
    },
  });
}
```

**❌ Incorrect Component Access:**
```typescript
const { data: priceData } = useItemPriceQuery(priceName);
const price = priceData?.item_price;  // ❌ Undefined! Should be priceData?.data?.item_price
```

**✅ Correct Hook Return Type:**
```typescript
export function useItemPriceQuery(name: string) {
  return useQuery({
    queryKey: ["item-price", name],
    queryFn: async () => {
      const response = await fetch(`/api/stock/item-price/${name}`);
      // ✅ Include the 'data' wrapper
      return response.json() as Promise<{ data: { item_price: ItemPrice } }>;
    },
  });
}
```

**✅ Correct Component Access:**
```typescript
const { data: priceData } = useItemPriceQuery(priceName);
const price = priceData?.data?.item_price;  // ✅ Correct path
```

**Debugging Checklist:**
1. ✅ Check browser DevTools Network tab - is the API returning data?
2. ✅ Check the response structure - does it have a `data` wrapper?
3. ✅ Check the hook's return type - does it match the actual response?
4. ✅ Check component data access - are you using the correct path?
5. ✅ Add `console.log(priceData)` to see what you're actually getting

**Quick Test:**
```typescript
const { data: priceData, isLoading } = useItemPriceQuery(priceName);

// Add this temporarily to debug
console.log('Query State:', { priceData, isLoading });

const price = priceData?.data?.item_price;
```

---

## Additional Components

### 5. SearchableSelect

For dropdowns with many options (Items, Customers, Suppliers, etc.), use the searchable select component:

```tsx
import { SearchableSelect } from "@/components/ui/searchable-select";

<SearchableSelect
  options={items.map(item => ({
    value: item.name,
    label: item.item_name,
    description: item.stock_uom, // Optional
  }))}
  value={selectedItem}
  onValueChange={setSelectedItem}
  placeholder="Select item..."
  searchPlaceholder="Search items..."
  emptyText="No items found."
/>
```

### 6. Export Utilities

The export system provides CSV and PDF export functionality:

```tsx
import { useExport } from "@/hooks/useExport";

const { exportData, isExporting } = useExport();

// In your handler
const handleExport = async (format: "csv" | "pdf") => {
  await exportData(
    items,                    // Data array
    "items-export",           // Filename (without extension)
    "Items Report",           // PDF title
    format,                   // "csv" or "pdf"
    {                         // Optional header mapping
      item_code: "Item Code",
      item_name: "Item Name",
    }
  );
};
```

---

## Mutation Options Pattern

For flexible mutation callbacks, use the generic MutationOptions pattern:

```typescript
interface MutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useCreateItemMutation(
  options?: MutationOptions<{ data: { item: Item } }>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ItemCreateRequest) => {
      // ... fetch logic
    },
    onSuccess: (data) => {
      toast.success("Created successfully");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      options?.onSuccess?.(data);  // Call custom callback
    },
    onError: (error: Error) => {
      toast.error(error.message);
      options?.onError?.(error);   // Call custom callback
    },
  });
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-14 | Initial template finalization |
| 1.3.1 | 2024-12-15 | **Skeleton Visibility Update**: Changed loading skeleton colors from `bg-secondary` to `bg-muted` for better visibility. Updated base `Skeleton` component with shimmer effect. Applied to Item and Item Price modules. |
| 1.3.2 | 2024-12-15 | **Critical Fixes & Troubleshooting**: Added troubleshooting section covering: (1) Suspense boundary errors with `useParams()` - moved data access inside Suspense boundaries, (2) API response structure mismatches - documented the `data` wrapper pattern from `handleApiRequest`. Fixed Item Price detail page loading issues. |
| 1.3.3 | 2024-12-16 | **Template Refinement**: Added SearchableSelect component documentation, Export utilities pattern, MutationOptions generic pattern. Full codebase alignment verification completed. |

---

*This template is maintained by the Pana ERP development team. For questions or improvements, contact the architecture team.*
