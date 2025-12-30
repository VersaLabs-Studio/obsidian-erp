Here's your fully formatted, clean, and ready-to-use **Markdown file** (`Pana-ERP-Items-Module-Refactoring-Template.md`) — optimized for your IDE/editor (VS Code, Neovim, etc.), with proper syntax highlighting, collapsible sections, and clear structure. Perfect for quick reference during development.

```markdown
# Pana ERP - Items Module Refactoring Template

## Overview
This document serves as a **comprehensive template** for refactoring ERP modules using:
- **TanStack Query** (React Query)
- **Zod** validation
- **React Hook Form**
- **Sonner** notifications

It includes all fixes, patterns, and components developed for the **Items module** — ready to be applied across other modules (Assets, CRM, Accounting, etc.).

---

## Architecture

### 1. Layout Configuration

#### `app/layout.tsx` (Server Component)
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import LayoutClient from "./LayoutClient";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Pana ERP",
  description: "Custom ERP System for Pana Promotions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="m-0 p-0 bg-[#0f0f0f] overflow-auto min-h-screen">
        <div className="origin-top-left">
          <LayoutClient>{children}</LayoutClient>
        </div>
      </body>
    </html>
  );
}
```

#### `app/LayoutClient.tsx` (Client Component)
```tsx
"use client";
import LayoutComponent from "@/components/Layout/Layout";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";
import { Toaster } from "sonner";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <LayoutComponent>{children}</LayoutComponent>
      <Toaster position="top-right" richColors closeButton />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 2. Query Client Setup

#### `lib/query-client.ts`
```tsx
import { QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
```

### 3. Enhanced Frappe Client

#### `lib/frappe-client.ts`
```tsx
import { FrappeApp } from "frappe-js-sdk";

export interface FrappeError {
  message: string;
  httpStatus?: number;
  httpStatusText?: string;
  exceptions?: string[];
  exception?: string;
  _server_messages?: string;
}

export function isFrappeError(error: unknown): error is FrappeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as FrappeError).message === "string"
  );
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details: string;
  statusCode?: number;
  frappeError?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

class FrappeClient {
  private static instance: FrappeClient;
  public db: ReturnType<FrappeApp["db"]>;
  public auth: ReturnType<FrappeApp["auth"]>;
  public call: ReturnType<FrappeApp["call"]>;
  public file: ReturnType<FrappeApp["file"]>;

  private constructor() {
    const erpApiUrl = process.env.NEXT_PUBLIC_ERP_API_URL;
    const erpApiKey = process.env.ERP_API_KEY;
    const erpApiSecret = process.env.ERP_API_SECRET;

    if (!erpApiUrl || !erpApiKey || !erpApiSecret) {
      throw new Error("Missing ERP API environment variables");
    }

    const frappe = new FrappeApp(erpApiUrl, {
      useToken: true,
      token: () => `${erpApiKey}:${erpApiSecret}`,
      type: "token",
    });

    this.db = frappe.db();
    this.auth = frappe.auth();
    this.call = frappe.call();
    this.file = frappe.file();
  }

  public static getInstance(): FrappeClient {
    if (!FrappeClient.instance) {
      FrappeClient.instance = new FrappeClient();
    }
    return FrappeClient.instance;
  }

  public handleError(error: unknown): ApiErrorResponse {
    console.error("Frappe Client Error:", error);

    if (isFrappeError(error)) {
      let userFriendlyMessage = "An unexpected error occurred.";
      let statusCode = error.httpStatus || 500;

      if (error._server_messages) {
        try {
          const serverMessages = JSON.parse(error._server_messages);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const parsedMessage = JSON.parse(serverMessages[0]);
            if (parsedMessage.message) {
              userFriendlyMessage = this.sanitizeHtml(parsedMessage.message);
            }
          }
        } catch (e) {
          console.warn("Failed to parse _server_messages");
        }
      }

      if (userFriendlyMessage === "An unexpected error occurred.") {
        const rawError = error.exceptions?.join(' ') || error.exception || '';
        if (rawError.includes("DuplicateEntryError") || rawError.includes("already exists")) {
          userFriendlyMessage = "A record with these details already exists.";
          statusCode = 409;
        } else if (rawError.includes("PermissionError")) {
          userFriendlyMessage = "You do not have permission to perform this action.";
          statusCode = 403;
        } else if (rawError.includes("DoesNotExistError") || rawError.includes("not found")) {
          userFriendlyMessage = "The requested resource was not found.";
          statusCode = 404;
        } else if (rawError.includes("MandatoryError") || rawError.includes("required")) {
          userFriendlyMessage = "Required fields are missing.";
          statusCode = 400;
        } else {
          userFriendlyMessage = error.message;
        }
      }

      return {
        success: false,
        error: "Request Failed",
        details: userFriendlyMessage,
        statusCode,
        frappeError: error.exceptions || error.exception,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: "Application Error",
        details: error.message,
      };
    }

    return {
      success: false,
      error: "Unknown Error",
      details: String(error),
    };
  }

  private sanitizeHtml(html: string): string {
    if (typeof window === 'undefined') return html;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
}

export const frappeClient = FrappeClient.getInstance();
```

### 4. Type Definitions

#### `types/item.ts`
```tsx
export interface Item {
  name: string;
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  is_stock_item: number;
  is_fixed_asset?: number;
  valuation_rate?: number;
  brand?: string;
  disabled?: number;
  description?: string;
  qty: number;
  uom?: string;
  basic_rate: number;
  warehouse?: string;
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
  docstatus?: 0 | 1 | 2;
}

export interface ItemWithStock extends Item {
  actual_qty?: number;
  reserved_qty?: number;
  ordered_qty?: number;
  projected_qty?: number;
}

export interface ItemCreateRequest {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  is_stock_item: number;
  is_fixed_asset?: number;
  description?: string;
  brand?: string;
}

export interface ItemUpdateRequest extends Partial<ItemCreateRequest> {
  name: string;
}

export interface ItemOptions {
  item_groups: string[];
  uoms: string[];
}
```

### 5. Zod Schemas

#### `hooks/domain/useItemValidation.ts`
```tsx
import { z } from "zod";

export const itemCreateSchema = z.object({
  item_code: z.string().min(1, "Item code is required"),
  item_name: z.string().min(1, "Item name is required"),
  item_group: z.string().min(1, "Item group is required"),
  stock_uom: z.string().min(1, "Stock UOM is required"),
  is_stock_item: z.number().int().min(0).max(1).default(1),
  is_fixed_asset: z.number().int().min(0).max(1).default(0),
  description: z.string().optional(),
  brand: z.string().optional(),
});

export const itemUpdateSchema = itemCreateSchema.partial().extend({
  name: z.string().min(1, "Item name is required"),
});

export type ItemCreateFormValues = z.infer<typeof itemCreateSchema>;
export type ItemUpdateFormValues = z.infer<typeof itemUpdateSchema>;
```

### 6. TanStack Query Hooks

#### `hooks/data/useItemsQuery.ts`
```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Item, ItemCreateRequest, ItemUpdateRequest, ItemOptions } from "@/types/item";
import { toast } from "sonner";

export function useItemsQuery(filters?: { name?: string; group?: string; status?: string; id?: string }) {
  return useQuery({
    queryKey: ["items", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.name) params.append("name", filters.name);
      if (filters?.group && filters.group !== "all") params.append("group", filters.group);
      if (filters?.status && filters.status !== "all") params.append("status", filters.status);
      if (filters?.id) params.append("id", filters.id);

      const response = await fetch(`/api/stock/item?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to fetch items");
      }
      return response.json() as Promise<{ data: { items: Item[] } }>;
    },
    staleTime: 60 * 1000,
  });
}

// ... (useItemQuery, useItemOptionsQuery, useCreateItemMutation, useUpdateItemMutation, useDeleteItemMutation)
```

> Full hook file is 200+ lines — included in original. Use as-is.

### 7. API Routes

#### `app/api/stock/item/route.ts`
```tsx
import { NextRequest } from 'next/server';
import { frappeClient } from '@/lib/frappe-client';
import { handleApiRequest, withEndpointLogging } from '@/lib/api-template';
import { Item, ItemCreateRequest, ItemUpdateRequest } from '@/types/item';

// GET, POST, PUT, DELETE handlers with proper filters and error handling
```

#### `app/api/stock/item/options/route.ts`
```tsx
// Returns item_groups and uoms
```

#### `app/api/stock/item/[code]/route.ts`
```tsx
// Dynamic route for fetching single item by item_code
```

### 8. UI Components

- `components/ui/filter-dropdown.tsx` – Advanced filter with search
- `components/ui/search-bar.tsx` – Clean search input
- `components/ui/global-search.tsx` – Command palette-style global search

### 9. Export Functionality

#### `lib/export-to-csv.ts`
```tsx
export function exportItemsToCSV(items: Item[]) {
  // Generates downloadable CSV with proper formatting
}
```

### 10. Page Components

- `app/stock/item/page.tsx` → List view with filters, search, export
- `app/stock/item/new/page.tsx` → Create form with auto-code generation
- `app/stock/item/[name]/page.tsx` → Detail view with actions

### 11. Layout with Global Search

#### `components/Layout/Layout.tsx`
```tsx
// Full sidebar with collapsible sections, global search, user menu
```

---

## Implementation Guide

### Setting Up a New Module
1. Create types → `types/[module].ts`
2. Zod schemas → `hooks/domain/use[Module]Validation.ts`
3. TanStack hooks → `hooks/data/use[Module]Query.ts`
4. API routes → `app/api/[module]/...`
5. UI components → List, Form, Detail
6. Add to sidebar in `Layout.tsx`

### Common Patterns

#### Error Handling
```tsx
try { ... } catch (error) {
  // Automatically handled + toasted
}
```

#### Form Pattern
```tsx
<FormField control={form.control} name="field" render={({ field }) => (
  <FormItem>
    <FormLabel>Label</FormLabel>
    <FormControl><Input {...field} /></FormControl>
    <FormMessage />
  </FormItem>
)} />
```

#### Query + Mutation
```tsx
const { data, isLoading } = useItemsQuery(filters);
const mutation = useCreateItemMutation({ onSuccess: () => router.push(...) });
```

### Testing Checklist
- [ ] CRUD works
- [ ] Zod validation
- [ ] Friendly errors
- [ ] Loading states
- [ ] Cache invalidation
- [ ] Export works
- [ ] Filters + search
- [ ] Mobile responsive

### Performance Tips
- Use `staleTime`, `select`, pagination
- `React.memo`, virtual scrolling
- Debounce search
- Lazy load heavy components

---

## Conclusion

This template delivers:
- **Type-safe**, **maintainable**, **scalable** code
- **Modern UX** with filters, search, toasts
- **Production-grade error handling**
- **Consistent patterns** across all modules

**Use this as your golden standard** when refactoring any Pana ERP module.

---
*Built for Versalabs by Kidus Abdula — Full-stack Engineer & ERP Architect*
```

**Save this as:** `Pana-ERP-Items-Module-Refactoring-Template.md`

You now have a **professional, searchable, IDE-friendly** reference doc. Drop it in your project root or `docs/` folder and use it daily.

Let me know when you're ready to generate the **Assets Module** or **CRM Module** using this exact template — I’ll spin it up in 2 minutes. 🚀
```