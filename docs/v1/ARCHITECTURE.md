# Pana ERP - Architecture & Template Documentation

> **Version:** 1.3 | **Last Updated:** December 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Patterns](#architecture-patterns)
5. [UI Template System](#ui-template-system)
6. [Business Logic Layer](#business-logic-layer)
7. [Data Flow](#data-flow)
8. [Module Template Guide](#module-template-guide)
9. [Best Practices](#best-practices)

---

## Overview

Pana ERP is an enterprise resource planning system built with a modern, premium UI and scalable architecture. The system follows a modular architecture where each business domain (Inventory, Accounting, CRM, etc.) is encapsulated as a self-contained module.

### Design Philosophy

- **Premium UI/UX**: Big-tech inspired design (Linear, Stripe, Vercel aesthetic)
- **Modular Architecture**: Each module is independent and self-contained
- **Type Safety**: Full TypeScript with Zod validation
- **Real-time Updates**: React Query for server state management
- **Borderless Design**: Soft shadows, large radii, airy layouts

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | App Router, Server Components, API Routes |
| **React 19** | UI Library |
| **TypeScript 5.9** | Type Safety |
| **Tailwind CSS 4** | Styling (CSS-first configuration) |
| **TanStack Query 5** | Server State Management |
| **React Hook Form 7** | Form Management |
| **Zod 3** | Schema Validation |
| **Radix UI** | Accessible Primitives |

### Backend Integration
| Technology | Purpose |
|------------|---------|
| **Frappe JS SDK** | Backend API Client |
| **Next.js API Routes** | API Proxy Layer |

### UI Components
| Library | Purpose |
|---------|---------|
| **Lucide React** | Icons |
| **Sonner** | Toast Notifications |
| **tw-animate-css** | Animations |

---

## Project Structure

```
pana-erp/
├── app/                          # Next.js App Router
│   ├── globals.css               # Global styles & theme
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── LayoutClient.tsx          # Client-side providers
│   ├── dashboard/                # Dashboard module
│   ├── stock/                    # Inventory module
│   │   ├── item/                 # Items sub-module
│   │   │   ├── page.tsx          # List page
│   │   │   ├── new/page.tsx      # Create page
│   │   │   └── [name]/           # Dynamic route
│   │   │       ├── page.tsx      # Detail page
│   │   │       └── edit/page.tsx # Edit page
│   │   ├── stock-entries/        # Stock entries sub-module
│   │   └── delivery-notes/       # Delivery notes sub-module
│   ├── accounting/               # Accounting module
│   ├── manufacturing/            # Manufacturing module
│   ├── crm/                      # CRM module
│   ├── assets/                   # Assets module
│   └── api/                      # API routes
│       └── stock/
│           └── item/
│               ├── route.ts      # List/Create endpoints
│               └── options/route.ts
├── components/
│   ├── Layout/
│   │   └── Layout.tsx            # Main layout with sidebar
│   └── ui/                       # Shadcn UI components
├── hooks/
│   └── data/
│       └── useItemsQuery.ts      # Data fetching hooks
├── lib/
│   ├── utils.ts                  # Utility functions
│   └── frappeClient.ts           # Frappe SDK instance
└── types/
    └── item.ts                   # Type definitions
```

---

## Architecture Patterns

### 1. Module Pattern

Each business module follows a consistent structure:

```
module/
├── page.tsx              # List view
├── new/page.tsx          # Create form
├── [id]/
│   ├── page.tsx          # Detail view
│   └── edit/page.tsx     # Edit form
└── dashboard/page.tsx    # Module dashboard (optional)
```

### 2. Data Layer Pattern

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│   UI Component  │────▶│  React Query     │────▶│  API Route    │
│   (page.tsx)    │◀────│  Hook            │◀────│  (/api/...)   │
└─────────────────┘     └──────────────────┘     └───────────────┘
                                                        │
                                                        ▼
                                                ┌───────────────┐
                                                │  Frappe SDK   │
                                                │  (Backend)    │
                                                └───────────────┘
```

### 3. Component Composition

```tsx
// Page Structure
<Layout>
  <FloatingHeader />       {/* Sticky header with actions */}
  <MainContent>
    <DataCards />          {/* Primary content */}
    <Sidebar />            {/* Secondary info */}
  </MainContent>
</Layout>
```

---

## UI Template System

### Theme Configuration (`globals.css`)

```css
@theme inline {
  /* Colors - Zinc Palette */
  --color-background: oklch(0.98 0.01 240);
  --color-foreground: oklch(0.15 0.02 240);
  --color-card: oklch(1 0 0);
  --color-primary: oklch(0.15 0.02 240);
  --color-secondary: oklch(0.96 0.01 240);
  
  /* Border Radius - Curvy Design */
  --radius-sm: 0.5rem;   /* 8px */
  --radius-md: 0.75rem;  /* 12px */
  --radius-lg: 1rem;     /* 16px */
  --radius-xl: 1.5rem;   /* 24px */
  
  /* Shadows - Atmospheric */
  --shadow-sm: 0 4px 6px -1px rgb(0 0 0 / 0.02);
  --shadow-md: 0 12px 24px -8px rgb(0 0 0 / 0.04);
  --shadow-lg: 0 20px 32px -8px rgb(0 0 0 / 0.06);
}
```

### Page Templates

#### 1. List Page Template

```tsx
export default function ListPage() {
  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Title</h1>
          <p className="text-muted-foreground mt-1">Description</p>
        </div>
        <Button className="rounded-full px-6 shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" /> New Item
        </Button>
      </div>

      {/* Floating Search Bar */}
      <div className="sticky top-2 z-10 flex items-center gap-2 p-1.5 bg-white/60 backdrop-blur-md rounded-full">
        <Search />
        <input placeholder="Search..." />
      </div>

      {/* Data Rows */}
      <div>
        {items.map((item, idx) => (
          <ItemRow key={item.id} item={item} index={idx} />
        ))}
      </div>
    </div>
  );
}
```

#### 2. Detail Page Template

```tsx
export default function DetailPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Floating Header */}
      <div className="sticky top-4 z-20 bg-white/80 backdrop-blur-xl p-2 pr-4 rounded-full shadow-sm">
        <BackButton />
        <Title />
        <StatusBadge />
        <Actions />
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <InfoCard title="Core Data" />
          <InfoCard title="Configuration" />
        </div>
        <div className="lg:col-span-4">
          <SidebarCard title="Status" />
          <SidebarCard title="Metadata" />
        </div>
      </div>
    </div>
  );
}
```

#### 3. Form Page Template

```tsx
export default function FormPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Floating Header with Save */}
      <div className="sticky top-4 z-20 bg-white/80 backdrop-blur-xl p-2 rounded-full">
        <BackButton />
        <Title />
        <SaveButton />
      </div>

      <Form>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <FormSection title="Basic Info">
              <FormFields />
            </FormSection>
          </div>
          <div className="lg:col-span-4">
            <PreviewCard />
          </div>
        </div>
      </Form>
    </div>
  );
}
```

### Component Patterns

#### Card Component
```tsx
<div className="bg-card rounded-[2rem] p-8 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2">
    <Icon className="h-4 w-4" /> Section Title
  </h3>
  {children}
</div>
```

#### Input Component
```tsx
<input
  className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white focus:shadow-lg focus:shadow-primary/5 outline-none transition-all duration-300"
/>
```

#### Toggle Component
```tsx
<div 
  onClick={() => onChange(!value)}
  className={cn(
    "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300",
    value ? "bg-primary/10 shadow-md shadow-primary/5" : "bg-secondary/30 hover:bg-secondary/50"
  )}
>
  <div className={cn(
    "h-6 w-6 rounded-lg flex items-center justify-center",
    value ? "bg-primary" : "bg-muted"
  )}>
    {value && <CheckCircle2 className="h-4 w-4 text-white" />}
  </div>
  <span>Label</span>
</div>
```

---

## Business Logic Layer

### Data Hook Pattern

```typescript
// hooks/data/useItemsQuery.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// 1. List Query
export function useItemsQuery(filters?: ItemFilters) {
  return useQuery({
    queryKey: ["items", filters],
    queryFn: async () => {
      const res = await fetch(`/api/stock/item?${new URLSearchParams(filters)}`);
      return res.json();
    },
  });
}

// 2. Single Item Query
export function useItemQuery(name: string) {
  return useQuery({
    queryKey: ["item", name],
    queryFn: async () => {
      const res = await fetch(`/api/stock/item/${encodeURIComponent(name)}`);
      return res.json();
    },
    enabled: !!name,
  });
}

// 3. Create Mutation
export function useCreateItemMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ItemFormData) => {
      const res = await fetch("/api/stock/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create item", { description: error.message });
    },
  });
}

// 4. Update Mutation
export function useUpdateItemMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: ItemFormData }) => {
      const res = await fetch(`/api/stock/item/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", name] });
      toast.success("Item updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update item", { description: error.message });
    },
  });
}

// 5. Delete Mutation
export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/stock/item/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete item", { description: error.message });
    },
  });
}

// 6. Options Query (for dropdowns)
export function useItemOptionsQuery() {
  return useQuery({
    queryKey: ["item_options"],
    queryFn: async () => {
      const res = await fetch("/api/stock/item/options");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
```

### API Route Pattern

```typescript
// app/api/stock/item/route.ts

import { frappeClient } from "@/lib/frappeClient";
import { NextRequest, NextResponse } from "next/server";

// GET - List items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: any[] = [];
    
    if (searchParams.get("name")) {
      filters.push(["item_name", "like", `%${searchParams.get("name")}%`]);
    }
    
    const items = await frappeClient.getDocList("Item", {
      fields: ["name", "item_name", "item_code", "item_group", "stock_uom", "disabled"],
      filters,
      orderBy: { field: "creation", order: "desc" },
      limit: 100,
    });
    
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create item
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const doc = await frappeClient.createDoc("Item", {
      item_name: data.item_name,
      item_code: data.item_code,
      item_group: data.item_group,
      stock_uom: data.stock_uom,
      description: data.description,
      brand: data.brand,
      is_stock_item: data.is_stock_item ? 1 : 0,
      is_fixed_asset: data.is_fixed_asset ? 1 : 0,
    });
    
    return NextResponse.json({ item: doc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Type Definitions

```typescript
// types/item.ts

export interface Item {
  name: string;
  item_name: string;
  item_code: string;
  item_group: string;
  stock_uom: string;
  description?: string;
  brand?: string;
  is_stock_item?: boolean;
  is_fixed_asset?: boolean;
  disabled?: boolean;
  creation?: string;
  modified?: string;
}

export interface ItemFilters {
  name?: string;
  group?: string;
  status?: string;
}
```

---

## Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│                         USER ACTION                            │
│                    (Click, Submit, etc.)                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                       REACT COMPONENT                          │
│              (page.tsx with form handlers)                     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      REACT QUERY HOOK                          │
│     (useItemsQuery, useCreateItemMutation, etc.)              │
│  • Caches data                                                 │
│  • Handles loading/error states                                │
│  • Auto-invalidates on mutations                               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     NEXT.JS API ROUTE                          │
│              (app/api/stock/item/route.ts)                     │
│  • Validates requests                                          │
│  • Transforms data                                             │
│  • Error handling                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                       FRAPPE SDK                               │
│              (lib/frappeClient.ts)                             │
│  • createDoc, getDoc, updateDoc, deleteDoc                     │
│  • Authentication                                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                      FRAPPE BACKEND                            │
│                   (ERPNext / Custom)                           │
└────────────────────────────────────────────────────────────────┘
```

---

## Module Template Guide

### Creating a New Module

1. **Create folder structure:**
```bash
app/
└── [module-name]/
    ├── page.tsx              # List
    ├── new/page.tsx          # Create
    ├── [id]/
    │   ├── page.tsx          # Detail
    │   └── edit/page.tsx     # Edit
    └── dashboard/page.tsx    # Dashboard (optional)
```

2. **Create data hooks:**
```bash
hooks/data/use[Module]Query.ts
```

3. **Create API routes:**
```bash
app/api/[module]/
├── route.ts                  # List + Create
├── [id]/route.ts             # Get + Update + Delete
└── options/route.ts          # Dropdown options
```

4. **Create types:**
```bash
types/[module].ts
```

5. **Add to navigation:**
Update `components/Layout/Layout.tsx` navigation array.

---

## Best Practices

### 1. UI Consistency
- Use `rounded-[2rem]` for main cards
- Use `rounded-xl` for inputs and buttons
- Use `bg-secondary/30` for input backgrounds
- Use `shadow-sm` for cards, `shadow-lg shadow-primary/20` for buttons

### 2. Animation Patterns
- Page entrance: `animate-in fade-in slide-in-from-left-4 duration-500`
- Stagger children: Add `delay-100`, `delay-200`, etc.
- Hover effects: `hover:-translate-y-0.5 transition-all duration-300`

### 3. Data Fetching
- Always use React Query hooks
- Implement optimistic updates for better UX
- Cache dropdown options with `staleTime: 5 * 60 * 1000`

### 4. Form Handling
- Use React Hook Form + Zod for validation
- Show change detection for edit forms
- Auto-generate codes where applicable

### 5. Error Handling
- Use Sonner toasts for user feedback
- Catch errors in mutations
- Show loading states

---

## Quick Reference

### Color Classes
| Class | Usage |
|-------|-------|
| `bg-card` | Card backgrounds |
| `bg-secondary/30` | Input backgrounds |
| `bg-primary/10` | Active states |
| `text-muted-foreground` | Secondary text |
| `text-foreground` | Primary text |

### Spacing
| Size | Usage |
|------|-------|
| `p-8` | Card padding |
| `gap-8` | Grid gaps |
| `space-y-6` | Section spacing |
| `rounded-[2rem]` | Card radius |
| `rounded-xl` | Input radius |

### Typography
| Class | Usage |
|-------|-------|
| `text-3xl font-extrabold` | Page titles |
| `text-lg font-bold` | Section headers |
| `text-sm font-semibold` | Labels |
| `text-xs uppercase tracking-wider` | Small labels |
| `font-mono` | Codes/IDs |

---

*This documentation is auto-generated based on the Pana ERP v1.3 codebase.*
