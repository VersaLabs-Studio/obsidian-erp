# Pana ERP - Developer Quick Reference

> Quick reference for common patterns and code snippets

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

---

## 📁 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | `page.tsx` | `app/stock/item/page.tsx` |
| Dynamic Routes | `[param]/page.tsx` | `app/stock/item/[name]/page.tsx` |
| API Routes | `route.ts` | `app/api/stock/item/route.ts` |
| Hooks | `use[Name]Query.ts` | `hooks/data/useItemsQuery.ts` |
| Types | `[module].ts` | `types/item.ts` |
| Components | `PascalCase.tsx` | `components/Layout/Layout.tsx` |

---

## 🎨 UI Quick Reference

### Card Pattern
```tsx
<div className="bg-card rounded-[2rem] p-8 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 mb-6 flex items-center gap-2">
    <Icon className="h-4 w-4" /> Title
  </h3>
  {children}
</div>
```

### Floating Header
```tsx
<div className="sticky top-4 z-20 bg-white/80 backdrop-blur-xl p-2 pr-4 rounded-full shadow-sm">
  <BackButton />
  <Title />
  <Actions />
</div>
```

### Input Field
```tsx
<input className="w-full h-12 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 focus:bg-white focus:shadow-lg outline-none transition-all duration-300" />
```

### Toggle/Checkbox
```tsx
<div 
  onClick={() => onChange(!value)}
  className={cn(
    "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300",
    value ? "bg-primary/10 shadow-md" : "bg-secondary/30 hover:bg-secondary/50"
  )}
>
  <div className={cn("h-6 w-6 rounded-lg", value ? "bg-primary" : "bg-muted")}>
    {value && <CheckCircle2 className="h-4 w-4 text-white" />}
  </div>
  <span>Label</span>
</div>
```

### Button Pattern
```tsx
<Button className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300">
  <Icon className="h-4 w-4 mr-2" /> Label
</Button>
```

### Status Badge
```tsx
<div className={cn(
  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
  active ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
)}>
  {status}
</div>
```

---

## 🔄 Data Fetching Patterns

### List Query
```tsx
const { data, isLoading, error } = useItemsQuery({ group: "Products" });
const items = data?.data?.items || [];
```

### Single Item Query
```tsx
const { data, isLoading } = useItemQuery(itemName);
const item = data?.item;
```

### Create Mutation
```tsx
const createMutation = useCreateItemMutation();

const handleCreate = async (data) => {
  await createMutation.mutateAsync(data);
  router.push("/stock/item");
};
```

### Update Mutation
```tsx
const updateMutation = useUpdateItemMutation();

const handleUpdate = async (data) => {
  await updateMutation.mutateAsync({ name: itemName, data });
};
```

### Delete Mutation
```tsx
const deleteMutation = useDeleteItemMutation();

const handleDelete = async () => {
  if (confirm("Delete?")) {
    await deleteMutation.mutateAsync(itemName);
  }
};
```

---

## 🎯 Animation Classes

| Class | Effect |
|-------|--------|
| `animate-in fade-in` | Fade in |
| `slide-in-from-left-4` | Slide from left |
| `slide-in-from-right-4` | Slide from right |
| `slide-in-from-top-2` | Slide from top |
| `slide-in-from-bottom-4` | Slide from bottom |
| `duration-300` | 300ms duration |
| `duration-500` | 500ms duration |
| `delay-100` | 100ms delay |

### Staggered Animation
```tsx
{items.map((item, idx) => (
  <div 
    key={item.id}
    className="animate-in fade-in slide-in-from-left-4"
    style={{ animationDelay: `${idx * 50}ms` }}
  >
    {item.name}
  </div>
))}
```

---

## 📝 Form Validation

### Zod Schema
```tsx
const schema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required"),
  group: z.string().min(1, "Required"),
  uom: z.string().min(1, "Required"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});
```

### Form Setup
```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { is_active: true },
});

// With reset from API data
useEffect(() => {
  if (data) form.reset(data);
}, [data, form]);
```

### Change Detection
```tsx
const hasChanges = JSON.stringify(watchedValues) !== JSON.stringify(originalData);
```

---

## 🗂 Module Checklist

When creating a new module:

- [ ] Create folder structure: `app/[module]/`
- [ ] Create pages: `page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`
- [ ] Create types: `types/[module].ts`
- [ ] Create hooks: `hooks/data/use[Module]Query.ts`
- [ ] Create API routes: `app/api/[module]/route.ts`
- [ ] Add to navigation: Update `Layout.tsx`
- [ ] Test all CRUD operations

---

## 🔧 Common Fixes

### Hydration Error
Wrap dynamic content in `useEffect` or use `suppressHydrationWarning`.

### Query Not Fetching
Ensure `enabled: !!param` for conditional queries.

### Form Not Resetting
Use `form.reset(data)` in a `useEffect` watching the data.

### Tailwind Classes Not Working
Check if using Tailwind v4 syntax correctly (no `@apply` in utilities layer).

---

*Last updated: December 2024*
