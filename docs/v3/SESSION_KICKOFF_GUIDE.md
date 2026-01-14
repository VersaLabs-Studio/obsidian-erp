# Pana ERP v3.0 - Session Kickoff & Implementation Guide

> **Version:** 3.0.4  
> **Created:** 2026-01-14  
> **Purpose:** Quick-start reference for new AI chat sessions to continue v3.0 development  
> **Status:** ✅ PRODUCTION READY

---

## Table of Contents

1. [Quick Context](#1-quick-context)
2. [Project Architecture Overview](#2-project-architecture-overview)
3. [Hybrid Workflow Strategy](#3-hybrid-workflow-strategy)
4. [Type & Schema Generation System](#4-type--schema-generation-system)
5. [DocType Configuration Registry](#5-doctype-configuration-registry)
6. [Module Implementation Workflow](#6-module-implementation-workflow)
7. [Golden Template Reference](#7-golden-template-reference)
8. [Key Patterns & Components](#8-key-patterns--components)
9. [Common Pitfalls to Avoid](#9-common-pitfalls-to-avoid)
10. [Session Handoff Checklist](#10-session-handoff-checklist)

---

## 1. Quick Context

### What is Pana ERP?

Pana ERP is a modern Next.js 15 frontend for **Frappe/ERPNext**, implementing a schema-first architecture with premium UI/UX design patterns.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4.0 + OKLCH colors |
| State | TanStack Query (React Query) |
| Forms | react-hook-form + Zod validation |
| Backend | Frappe REST API (frappe-js-sdk) |
| UI Components | shadcn/ui + custom smart components |

### Core Philosophy

```
Schema-First → Factory Pattern → Generic Hooks → Smart Components
```

1. **All types and schemas are auto-generated** from Frappe DocType metadata
2. **Factory patterns** reduce API route boilerplate by 75%
3. **Generic hooks** (`useFrappeList`, `useFrappeDoc`, etc.) work with any DocType
4. **Smart components** provide theme-aware, reusable UI patterns

---

## 2. Project Architecture Overview

### Directory Structure

```
pana-erp/
├── app/                        # Next.js App Router pages
│   ├── api/                    # API routes (factory-based)
│   │   ├── stock/              # Stock module APIs
│   │   ├── crm/                # CRM module APIs
│   │   └── ...
│   ├── stock/                  # Stock module pages
│   │   └── item/               # Item CRUD pages
│   ├── crm/                    # CRM module pages
│   │   ├── customer/
│   │   ├── lead/
│   │   └── contact/            # NEW: Contact module (Golden Template #2)
│   └── ...
│
├── components/
│   ├── ui/                     # Base UI components (shadcn/ui)
│   ├── smart/                  # Reusable smart components
│   │   ├── page-header.tsx
│   │   ├── frappe-select.tsx
│   │   ├── data-field.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-state.tsx
│   │   └── status-badge.tsx
│   └── form/                   # Form field wrappers
│
├── hooks/
│   └── generic/                # DocType-agnostic hooks
│       ├── useFrappeList.ts    # List query hook
│       ├── useFrappeDoc.ts     # Single document hook
│       ├── useFrappeMutation.ts # CRUD mutations
│       └── useFrappeOptions.ts  # Dropdown options
│
├── lib/
│   ├── api-factory.ts          # API route generators
│   ├── doctype-config.ts       # ⭐ CENTRAL DOCTYPE REGISTRY
│   ├── frappe-client.ts        # Frappe SDK wrapper
│   ├── query-keys.ts           # React Query key factory
│   ├── theme-context.tsx       # Theme state management
│   └── schemas/
│       └── doctype-schemas.ts  # ⭐ AUTO-GENERATED Zod schemas
│
├── types/
│   └── doctype-types.ts        # ⭐ AUTO-GENERATED TypeScript types
│
├── scripts/
│   └── generate-types.js       # Type & schema generation script
│
└── docs/v3/
    ├── ARCHITECTURE_V3.md      # Full architecture documentation
    ├── MODULE_CREATION_WORKFLOW.md  # Step-by-step module guide
    ├── TEMPLATE_REVIEW_V3.md   # Template review & checklist
    └── SESSION_KICKOFF_GUIDE.md # THIS FILE
```

---

## 3. Hybrid Workflow Strategy

### The Two-Agent Collaboration Model

We use a **hybrid workflow** that leverages different AI capabilities optimally:

#### 🧠 Native Chat (Claude/High-Context AI) - Configuration & Strategy

**Use for:**
- DocType configuration (`lib/doctype-config.ts`)
- Query key factory setup (`lib/query-keys.ts`)
- Architecture decisions
- Debugging complex type issues
- Cross-module navigation patterns
- Documentation updates

**Why:** These tasks require deep understanding of the existing codebase structure and architectural consistency.

#### ⚡ GLM 4.7 (Code Generation AI) - Implementation Labor

**Delegate to GLM 4.7:**
- Page component creation (list, detail, create, edit)
- API route implementation
- Form component scaffolding
- Repetitive CRUD patterns
- UI component styling

**Why:** GLM 4.7 excels at fast code generation when given clear patterns and templates.

### Workflow Example: Implementing a New Module

```
┌─────────────────────────────────────────────────────────────────┐
│                    NATIVE CHAT SESSION                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. Add DocType to lib/doctype-config.ts                         │
│ 2. Run: pnpm generate-types --all                               │
│ 3. Add query keys to lib/query-keys.ts (if custom needed)       │
│ 4. Define API route structure                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GLM 4.7 SESSION                              │
├─────────────────────────────────────────────────────────────────┤
│ Prompt: "Create the [DocType] module following the Contact      │
│ template. Use the generated types from doctype-types.ts and     │
│ schemas from doctype-schemas.ts. Create:                        │
│ - app/[module]/[doctype]/page.tsx (list)                        │
│ - app/[module]/[doctype]/new/page.tsx (create)                  │
│ - app/[module]/[doctype]/[name]/page.tsx (detail)               │
│ - app/[module]/[doctype]/[name]/edit/page.tsx (edit)            │
│ - app/api/[module]/[doctype]/route.ts (list, create)            │
│ - app/api/[module]/[doctype]/[name]/route.ts (get, update, del) │
│ Follow the exact patterns from the Contact module."             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NATIVE CHAT (Review)                         │
├─────────────────────────────────────────────────────────────────┤
│ 5. Review generated code for architectural compliance           │
│ 6. Fix any cross-module navigation issues                       │
│ 7. Update documentation                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Type & Schema Generation System

### Auto-Generation Script

Location: `scripts/generate-types.js`

**Command:**
```bash
pnpm generate-types --all
```

**What it generates:**

1. **`types/doctype-types.ts`** - TypeScript interfaces for all DocTypes
2. **`lib/schemas/doctype-schemas.ts`** - Zod schemas for validation

### Generated Output Structure

```typescript
// types/doctype-types.ts
export interface Contact {
  name?: string;
  first_name?: string;
  last_name?: string;
  email_id?: string;
  phone?: string;
  mobile_no?: string;
  // ... all fields from Frappe
}

// lib/schemas/doctype-schemas.ts
export const ContactSchema = z.object({
  name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email_id: z.string().optional(),
  // ... all fields
});

export const ContactCreateSchema = ContactSchema.partial();
export const ContactUpdateSchema = ContactSchema.partial();
```

### When to Regenerate Types

Run `pnpm generate-types --all` when:
- Adding a new DocType to the system
- Frappe backend schema changes
- After adding new DocType to `doctype-config.ts`

---

## 5. DocType Configuration Registry

### The Central Registry

**Location:** `lib/doctype-config.ts`

This is the **SINGLE SOURCE OF TRUTH** for all DocType metadata:

```typescript
export const DOCTYPE_CONFIG: Record<string, DocTypeConfig> = {
  // ============================================================================
  // STOCK MODULE
  // ============================================================================
  Item: {
    apiPath: "stock/item",
    module: "Stock",
    labelField: "item_name",
    searchFields: ["item_code", "item_name", "description"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  
  // ============================================================================
  // CRM MODULE
  // ============================================================================
  Contact: {
    apiPath: "crm/contact",
    module: "CRM",
    labelField: "first_name",
    searchFields: ["first_name", "last_name", "email_id", "mobile_no"],
    defaultSortField: "creation",
    defaultSortOrder: "desc",
  },
  
  // ... more DocTypes
};
```

### Key Utility Functions

```typescript
import { getApiPath, getDocTypeConfig, getLabelField, getSearchFields } from "@/lib/doctype-config";

// Get API path for routing
getApiPath("Sales Order")  // => "crm/sales-order"

// Get full config
getDocTypeConfig("Contact")  // => { apiPath: "crm/contact", module: "CRM", ... }

// Get label field for display
getLabelField("Item")  // => "item_name"

// Get searchable fields
getSearchFields("Contact")  // => ["first_name", "last_name", "email_id", "mobile_no"]
```

### ⚠️ Critical: Always Use getApiPath() for Navigation

When creating links between DocTypes:

```typescript
// ✅ CORRECT - Uses centralized config
import { getApiPath } from "@/lib/doctype-config";
const href = `/${getApiPath("Customer")}/${encodeURIComponent(customerName)}`;

// ❌ WRONG - Hardcoded path
const href = `/crm/customer/${customerName}`;
```

---

## 6. Module Implementation Workflow

### Step-by-Step Process

#### Phase 1: Configuration (Native Chat)

**Step 1: Register DocType**

Edit `lib/doctype-config.ts`:

```typescript
// Add to DOCTYPE_CONFIG
"My DocType": {
  apiPath: "module/my-doctype",
  module: "ModuleCategory",
  labelField: "name_field",
  searchFields: ["field1", "field2"],
  defaultSortField: "creation",
  defaultSortOrder: "desc",
},
```

**Step 2: Generate Types**

```bash
pnpm generate-types --all
```

**Step 3: Verify Generated Files**

Check that your DocType appears in:
- `types/doctype-types.ts` (interface)
- `lib/schemas/doctype-schemas.ts` (Zod schema)

#### Phase 2: Implementation (GLM 4.7 or Manual)

**Step 4: Create API Routes**

```
app/api/[module]/[doctype]/
├── route.ts          # GET (list), POST (create)
└── [name]/
    └── route.ts      # GET (single), PUT (update), DELETE
```

**Step 5: Create Page Components**

```
app/[module]/[doctype]/
├── page.tsx              # List page
├── new/
│   └── page.tsx          # Create page
└── [name]/
    ├── page.tsx          # Detail page (read-only)
    └── edit/
        └── page.tsx      # Edit page
```

#### Phase 3: Review & Documentation (Native Chat)

**Step 6: Verify Implementation**

- [ ] Types imported correctly
- [ ] Schemas used for validation
- [ ] `getApiPath()` used for cross-module links
- [ ] Detail page uses `DataPoint` (read-only)
- [ ] Edit page uses form inputs
- [ ] Theme-aware styling applied
- [ ] Dark mode tested

**Step 7: Update Documentation**

- Update `ARCHITECTURE_V3.md` changelog
- Add to MODULE_CREATION_WORKFLOW.md if new patterns

---

## 7. Golden Template Reference

### Template #1: Item Module (Stock)

**Location:** `app/stock/item/`

Best for: Standard CRUD with settings dropdowns

### Template #2: Contact Module (CRM) ⭐ RECOMMENDED

**Location:** `app/crm/contact/`

Best for: Modules with linked entities, child tables, cross-module navigation

**Key Features:**
- Linked Entity CTA pattern
- `DataPoint` component for read-only display
- `InfoCard` layout structure
- `getApiPath()` for dynamic navigation

---

## 8. Key Patterns & Components

### 8.1 List Page Pattern

```typescript
"use client";

import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader } from "@/components/smart/page-header";
import { EmptyState } from "@/components/smart/empty-state";
import { LoadingState } from "@/components/smart/loading-state";
import { Contact } from "@/types/doctype-types";

export default function ContactListPage() {
  const { data, isLoading, refetch } = useFrappeList<Contact>("Contact", {
    fields: ["name", "first_name", "last_name", "email_id"],
    filters: searchQuery ? [["first_name", "like", `%${searchQuery}%`]] : [],
  });

  const deleteMutation = useFrappeDelete("Contact");

  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState doctype="Contact" />;

  return (
    <div className="p-6">
      <PageHeader title="Contacts" createHref="/crm/contact/new" />
      {/* Table/Grid rendering */}
    </div>
  );
}
```

### 8.2 Detail Page Pattern (Read-Only)

```typescript
"use client";

import { useFrappeDoc } from "@/hooks/generic";
import { InfoCard, DataPoint } from "@/components/ui/info-card";
import { Contact } from "@/types/doctype-types";

export default function ContactDetailPage({ params }: { params: { name: string } }) {
  const { data: contact, isLoading } = useFrappeDoc<Contact>("Contact", params.name);

  if (isLoading) return <LoadingState />;

  return (
    <div className="p-6">
      <InfoCard title="Contact Information" icon="user">
        <div className="grid grid-cols-2 gap-4">
          <DataPoint label="First Name" value={contact?.first_name} />
          <DataPoint label="Last Name" value={contact?.last_name} />
          <DataPoint label="Email" value={contact?.email_id} />
          <DataPoint label="Phone" value={contact?.mobile_no} />
        </div>
      </InfoCard>
    </div>
  );
}
```

### 8.3 Create/Edit Page Pattern

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFrappeCreate } from "@/hooks/generic";
import { ContactCreateSchema } from "@/lib/schemas/doctype-schemas";
import { Contact } from "@/types/doctype-types";

export default function CreateContactPage() {
  const form = useForm<Contact>({
    resolver: zodResolver(ContactCreateSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email_id: "",
    },
  });

  const createMutation = useFrappeCreate<Contact>("Contact");

  const onSubmit = (data: Contact) => {
    createMutation.mutate(data, {
      onSuccess: () => router.push("/crm/contact"),
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 8.4 Linked Entity CTA Pattern

For displaying navigable links to related DocTypes:

```typescript
import { getApiPath } from "@/lib/doctype-config";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

{contact.links?.map((link, idx) => {
  const href = `/${getApiPath(link.link_doctype)}/${encodeURIComponent(link.link_name)}`;
  
  return (
    <div key={idx} className="group flex items-center justify-between p-4 bg-secondary/20 rounded-2xl">
      <div>
        <p className="text-xs uppercase text-muted-foreground">{link.link_doctype}</p>
        <p className="font-semibold">{link.link_name}</p>
      </div>
      <Link href={href}>
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
})}
```

### 8.5 Boolean Field Handling

Frappe returns `0`/`1` for booleans. Always convert:

```typescript
// When loading data for forms
defaultValues: {
  is_active: Boolean(contact?.is_active),
  disabled: Boolean(contact?.disabled),
}

// When submitting
const submitData = {
  ...data,
  is_active: data.is_active ? 1 : 0,
  disabled: data.disabled ? 1 : 0,
};
```

---

## 9. Common Pitfalls to Avoid

### ❌ DON'T: Hardcode API paths

```typescript
// Wrong
const href = "/crm/customer/CUST-001";

// Correct
const href = `/${getApiPath("Customer")}/${encodeURIComponent(name)}`;
```

### ❌ DON'T: Use form inputs on detail pages

```typescript
// Wrong - Detail page with editable input
<Input value={contact.email_id} readOnly />

// Correct - Use DataPoint for display
<DataPoint label="Email" value={contact.email_id} />
```

### ❌ DON'T: Define types manually

```typescript
// Wrong - Manual interface
interface Customer {
  name: string;
  customer_name: string;
}

// Correct - Import generated types
import { Customer } from "@/types/doctype-types";
```

### ❌ DON'T: Inline Zod schemas

```typescript
// Wrong - Inline schema
const schema = z.object({ name: z.string() });

// Correct - Use generated schema
import { CustomerCreateSchema } from "@/lib/schemas/doctype-schemas";
```

### ❌ DON'T: Skip dark mode testing

Always verify components in both light and dark mode using the theme toggle.

---

## 10. Session Handoff Checklist

When starting a new chat session, use this checklist:

### Context Sharing

```
I'm continuing development of Pana ERP v3.0. Please read:
- docs/v3/SESSION_KICKOFF_GUIDE.md (this file)
- docs/v3/ARCHITECTURE_V3.md (if deep dive needed)

Current task: [Describe what you want to implement]
```

### Before Implementation

- [ ] Is the DocType registered in `lib/doctype-config.ts`?
- [ ] Have types been generated? (`pnpm generate-types --all`)
- [ ] Do generated types exist in `types/doctype-types.ts`?
- [ ] Do schemas exist in `lib/schemas/doctype-schemas.ts`?

### Reference Materials

| Document | Purpose |
|----------|---------|
| `SESSION_KICKOFF_GUIDE.md` | Quick-start reference (this file) |
| `ARCHITECTURE_V3.md` | Full architecture deep-dive |
| `MODULE_CREATION_WORKFLOW.md` | Step-by-step module creation |
| `TEMPLATE_REVIEW_V3.md` | Template review & checklist |

### Golden Templates to Reference

| Template | Location | Best For |
|----------|----------|----------|
| Item | `app/stock/item/` | Standard CRUD |
| Contact | `app/crm/contact/` | Linked entities, cross-module nav |

### Key Files to Share with New Session

If the new session needs implementation help, share:

1. `lib/doctype-config.ts` - DocType registry
2. `app/crm/contact/[name]/page.tsx` - Detail page template
3. `app/crm/contact/new/page.tsx` - Create page template

---

## Quick Command Reference

```bash
# Generate types for all DocTypes
pnpm generate-types --all

# Development server
pnpm dev

# Type check
pnpm type-check

# Lint
pnpm lint
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.4 | 2026-01-14 | Initial session kickoff guide, Contact module as Golden Template #2, Linked Entity CTA pattern, DataPoint component |

---

*This document is the authoritative quick-start guide for continuing Pana ERP v3.0 development across chat sessions.*
