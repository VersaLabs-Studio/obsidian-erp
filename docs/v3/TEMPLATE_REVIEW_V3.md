# Pana ERP v3.0 - Template Review & Pre-Implementation Checklist

> **Date:** 2025-12-30
> **Module Reviewed:** Items (Stock)
> **Status:** ✅ PRODUCTION READY

---

## 1. Template Architecture Summary

### 1.1 Files Structure (Golden Template)

```
app/stock/item/
├── page.tsx              # List page (360 lines)
├── new/
│   └── page.tsx          # Create page (454 lines)
└── [name]/
    ├── page.tsx          # Detail/View page (380 lines)
    └── edit/
        └── page.tsx      # Edit page (566 lines)

app/api/stock/item/
├── route.ts              # GET (list), POST (create)
└── [name]/
    └── route.ts          # GET (single), PUT (update), DELETE

hooks/generic/
├── index.ts              # Barrel export
├── useFrappeList.ts      # List query hook
├── useFrappeDoc.ts       # Single doc query hook
├── useFrappeMutation.ts  # CRUD mutations hook
└── useFrappeOptions.ts   # Dropdown options hook

components/smart/
├── index.ts              # Barrel export
├── page-header.tsx       # Floating header component
├── frappe-select.tsx     # Async dropdown with search
├── searchable-select.tsx # Reusable searchable dropdown
├── data-field.tsx        # Form field wrapper
├── confirm-dialog.tsx    # Delete confirmation
├── print-label-dialog.tsx # Label printing
├── theme-toggle.tsx      # Dark mode toggle
├── empty-state.tsx       # No data display
├── loading-state.tsx     # Loading skeletons
└── status-badge.tsx      # Status indicator

types/
└── doctype-types.ts      # Generated from Frappe metadata

lib/
├── api-factory.ts        # API route generators
├── theme-context.tsx     # Theme state management
└── frappe-client.ts      # Frappe SDK wrapper
```

### 1.2 Page Patterns

| Page | Pattern | Key Components |
|------|---------|----------------|
| **List** | `useFrappeList` + filtering + pagination | `PageHeader`, `ListToolbar`, `EmptyState`, `LoadingState` |
| **Create** | `useForm` + `useFrappeCreate` + validation | `PageHeader`, `FrappeSelect`, `DataField`, `InfoCard` |
| **Detail** | `useFrappeDoc` + actions dropdown | `PageHeader`, `ConfirmDialog`, `PrintLabelDialog` |
| **Edit** | `useFrappeDoc` + `useForm` + `useFrappeUpdate` | Same as Create + data population |

---

## 2. Current Template Strengths ✅

### 2.1 Schema-Driven Architecture
- Types auto-generated from Frappe metadata
- Zod schemas for runtime validation
- Single source of truth (`doctype-types.ts`)

### 2.2 Factory Pattern
- `createListHandler`, `createGetHandler`, `createCreateHandler`, etc.
- ~75% code reduction in API routes
- Consistent error handling

### 2.3 Generic Hooks
- `useFrappeList`, `useFrappeDoc`, `useFrappeMutation`
- DocType-to-API path mapping
- Automatic cache invalidation

### 2.4 Smart Components
- Theme-aware components (dark mode compatible)
- Searchable dropdowns with scroll
- Premium UI with animations

### 2.5 Theme System
- Light/Dark/System modes
- OKLCH color system
- Smooth transitions
- localStorage persistence

---

## 3. Architectural Recommendations Before v3.0 Implementation

### 3.1 🔴 CRITICAL: Centralize DocType-to-API Path Mapping

**Issue:** The `doctypeToApiPath` function is duplicated in 3 files:
- `hooks/generic/useFrappeList.ts`
- `hooks/generic/useFrappeDoc.ts`
- `hooks/generic/useFrappeMutation.ts`

**Recommendation:**
```typescript
// lib/doctype-config.ts
export const DOCTYPE_CONFIG = {
  Item: {
    apiPath: "stock/item",
    module: "Stock",
    labelField: "item_name",
    searchFields: ["item_code", "item_name"],
  },
  "Item Group": {
    apiPath: "stock/settings/item-group",
    module: "Stock",
    labelField: "item_group_name",
  },
  // ... all doctypes
} as const;

export function getApiPath(doctype: string): string {
  return DOCTYPE_CONFIG[doctype]?.apiPath || doctype.toLowerCase().replace(/\s+/g, "-");
}
```

### 3.2 🔴 CRITICAL: Create Domain-Specific Hooks Layer

**Issue:** Business logic is scattered in page components.

**Recommendation:** Create domain hooks for complex operations:

```typescript
// hooks/domain/useItemOperations.ts
export function useItemOperations() {
  const createMutation = useFrappeCreate<Item>("Item");
  const updateMutation = useFrappeUpdate<Item>("Item");
  const deleteMutation = useFrappeDelete("Item");

  const generateItemCode = useCallback((name: string) => {
    // Business logic here
  }, []);

  const validateStock = useCallback((item: Item) => {
    // Domain validation
  }, []);

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    generateItemCode,
    validateStock,
  };
}
```

### 3.3 🟡 RECOMMENDED: Form Schema Factory

**Issue:** Form schemas are defined inline in page components.

**Recommendation:**
```typescript
// lib/schemas/form-schemas.ts
import { z } from "zod";

export const createFormSchema = <T extends z.ZodRawShape>(
  baseFields: T,
  options?: {
    booleanDefaults?: Record<string, boolean>;
  }
) => {
  const schema = z.object(baseFields);
  // Apply boolean defaults
  return schema;
};

// Usage
export const itemFormSchema = createFormSchema({
  item_code: z.string().min(1, "Required"),
  item_name: z.string().min(1, "Required"),
  // ...
}, { booleanDefaults: { is_stock_item: true, disabled: false } });
```

### 3.4 🟡 RECOMMENDED: Create Base Page Components

**Issue:** All 4 page types have similar structure/boilerplate.

**Recommendation:**
```typescript
// components/layouts/list-page-layout.tsx
interface ListPageLayoutProps<T> {
  doctype: string;
  title: string;
  columns: ColumnDef<T>[];
  filters?: FilterConfig[];
  rowComponent?: React.ComponentType<{ item: T }>;
}

// Usage
<ListPageLayout
  doctype="Item"
  title="Items"
  columns={itemColumns}
  filters={itemFilters}
/>
```

### 3.5 🟡 RECOMMENDED: Implement Query Key Factory

**Issue:** Query keys are constructed inconsistently.

**Recommendation:**
```typescript
// lib/query-keys.ts
export const queryKeys = {
  item: {
    all: ["Item"] as const,
    list: (options?: FrappeListOptions) => [...queryKeys.item.all, "list", options] as const,
    doc: (name: string) => [...queryKeys.item.all, "doc", name] as const,
  },
  // ... other doctypes
};
```

### 3.6 🟢 NICE TO HAVE: Optimistic Updates

**Current:** Mutations wait for server response before updating UI.

**Recommendation:** Add optimistic updates for better UX:
```typescript
const updateMutation = useFrappeUpdate<Item>("Item", {
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey: ["Item", "doc", variables.name] });
    const previous = queryClient.getQueryData(["Item", "doc", variables.name]);
    queryClient.setQueryData(["Item", "doc", variables.name], (old) => ({ ...old, ...variables.data }));
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(["Item", "doc", variables.name], context?.previous);
  },
});
```

### 3.7 🟢 NICE TO HAVE: Error Boundary per Module

**Recommendation:**
```typescript
// components/error-boundary.tsx
export function ModuleErrorBoundary({ module, children }) {
  return (
    <ErrorBoundary
      fallback={<ModuleError module={module} />}
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## 4. Code Deduplication Opportunities

### 4.1 Form Field Patterns
The following form field pattern is repeated across Create/Edit pages:
```tsx
<FormField
  control={form.control}
  name="field_name"
  render={({ field }) => (
    <FormItem>
      <DataField label="Label" required>
        <Input {...field} className="..." />
      </DataField>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Recommendation:** Create `FormField` variants:
```typescript
// components/form/form-input.tsx
export function FormInput({ control, name, label, required, ...inputProps }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <DataField label={label} required={required}>
            <Input {...field} {...inputProps} />
          </DataField>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Usage
<FormInput control={form.control} name="item_name" label="Item Name" required />
```

### 4.2 Delete Confirmation Pattern
Repeated delete confirmation logic in List/Detail/Edit pages.

**Recommendation:** Create `useDeleteWithConfirmation` hook:
```typescript
export function useDeleteWithConfirmation<T>(doctype: string) {
  const [target, setTarget] = useState<T | null>(null);
  const deleteMutation = useFrappeDelete(doctype);

  const open = (item: T) => setTarget(item);
  const close = () => setTarget(null);

  const confirm = async () => {
    await deleteMutation.mutateAsync(target.name);
    close();
  };

  return {
    target,
    isOpen: target !== null,
    open,
    close,
    confirm,
    isPending: deleteMutation.isPending,
  };
}
```

---

## 5. Module Migration Checklist

When creating a new module, follow this checklist:

### Step 1: Types & Schemas
- [ ] Run `pnpm generate-types <DocType>`
- [ ] Verify `types/doctype-types.ts` has the new type
- [ ] Create form schema in page or `lib/schemas/`

### Step 2: API Routes
- [ ] Create `app/api/<module>/<doctype>/route.ts`
- [ ] Create `app/api/<module>/<doctype>/[name]/route.ts`
- [ ] Use factory functions from `lib/api-factory.ts`
- [ ] Add to `doctypeToApiPath` mapping in hooks

### Step 3: Pages
- [ ] Create List page (`page.tsx`)
- [ ] Create New page (`new/page.tsx`)
- [ ] Create Detail page (`[name]/page.tsx`)
- [ ] Create Edit page (`[name]/edit/page.tsx`)

### Step 4: UI Polish
- [ ] Verify dark mode compatibility
- [ ] Test responsive design
- [ ] Add loading states
- [ ] Add empty states
- [ ] Test all CRUD operations

### Step 5: Documentation
- [ ] Update `ARCHITECTURE_V3.md` changelog
- [ ] Add to module map if needed

---

## 6. Pre-Implementation Action Items

Before starting full v3.0 implementation:

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 🔴 | Centralize `doctypeToApiPath` | 1 hour | High |
| 🔴 | Add remaining doctypes to mapping | 2 hours | High |
| 🟡 | Create `FormInput`, `FormSelect` wrappers | 2 hours | Medium |
| 🟡 | Create `useDeleteWithConfirmation` hook | 1 hour | Medium |
| 🟡 | Create query key factory | 1 hour | Medium |
| 🟢 | Add optimistic updates | 3 hours | Low |
| 🟢 | Add error boundaries | 2 hours | Low |

---

## 7. Template Finalization Verdict

### ✅ APPROVED FOR v3.0 IMPLEMENTATION

The Items module template is **production-ready** with the following characteristics:

1. **Architecture:** Clean separation of concerns (types, hooks, components, pages)
2. **Patterns:** Consistent patterns for all CRUD operations
3. **UI/UX:** Premium design with dark mode support
4. **Type Safety:** Generated types with runtime validation
5. **Developer Experience:** Factory patterns reduce boilerplate

### Recommended Pre-Implementation Tasks (Optional but Beneficial):
1. Centralize DocType-to-API path mapping
2. Create form field wrapper components
3. Create delete confirmation hook

---

*This document serves as the final template review before Pana ERP v3.0 full implementation.*
