# Phase E6: Stock & Material Management - Part 2 (API Routes & List Pages)

> **Continuation of PHASE_E6_STOCK_MANAGEMENT_PART1.md**

---

## 6. API Routes

### 6.1 Material Request API

**File:** `app/api/stock/material-request/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { MaterialRequestCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Material Request", {
  allowedFields: [
    "name",
    "material_request_type",
    "status",
    "per_ordered",
    "per_received",
    "company",
    "transaction_date",
    "schedule_date",
    "work_order",
    "sales_order",
    "project",
    "set_warehouse",
    "set_from_warehouse",
    "transfer_status",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Material Request",
  MaterialRequestCreateSchema,
);
```

**File:** `app/api/stock/material-request/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { MaterialRequestUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Material Request");
export const PUT = createUpdateHandler(
  "Material Request",
  MaterialRequestUpdateSchema,
);
export const DELETE = createDeleteHandler("Material Request");
```

### 6.2 Stock Entry API

**File:** `app/api/stock/stock-entry/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { StockEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Stock Entry", {
  allowedFields: [
    "name",
    "stock_entry_type",
    "purpose",
    "posting_date",
    "posting_time",
    "work_order",
    "bom_no",
    "from_warehouse",
    "to_warehouse",
    "purchase_order",
    "delivery_note",
    "sales_invoice",
    "material_request",
    "fg_completed_qty",
    "total_outgoing_value",
    "total_incoming_value",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler("Stock Entry", StockEntryCreateSchema);
```

**File:** `app/api/stock/stock-entry/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { StockEntryUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Stock Entry");
export const PUT = createUpdateHandler("Stock Entry", StockEntryUpdateSchema);
export const DELETE = createDeleteHandler("Stock Entry");
```

### 6.3 Purchase Order API

**File:** `app/api/buying/purchase-order/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { PurchaseOrderCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Purchase Order", {
  allowedFields: [
    "name",
    "supplier",
    "supplier_name",
    "status",
    "per_received",
    "per_billed",
    "company",
    "transaction_date",
    "schedule_date",
    "grand_total",
    "currency",
    "set_warehouse",
    "material_request",
    "project",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Purchase Order",
  PurchaseOrderCreateSchema,
);
```

**File:** `app/api/buying/purchase-order/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { PurchaseOrderUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Purchase Order");
export const PUT = createUpdateHandler(
  "Purchase Order",
  PurchaseOrderUpdateSchema,
);
export const DELETE = createDeleteHandler("Purchase Order");
```

### 6.4 Supplier API

**File:** `app/api/buying/supplier/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { SupplierCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Supplier", {
  allowedFields: [
    "name",
    "supplier_name",
    "supplier_group",
    "supplier_type",
    "country",
    "default_currency",
    "default_price_list",
    "disabled",
    "creation",
  ],
  defaultSort: { field: "supplier_name", order: "asc" },
  defaultLimit: 100,
});

export const POST = createCreateHandler("Supplier", SupplierCreateSchema);
```

---

## 7. Status Configurations

### 7.1 Material Request Status Config

```typescript
export const MATERIAL_REQUEST_STATUS_CONFIG = {
  Draft: {
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200",
    icon: Pencil,
  },
  Pending: {
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    border: "border-amber-200",
    icon: Clock,
  },
  "Partially Ordered": {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/10",
    border: "border-blue-200",
    icon: TrendingUp,
  },
  Ordered: {
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/10",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  Transferred: {
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-900/10",
    border: "border-indigo-200",
    icon: ArrowRightLeft,
  },
  Cancelled: {
    color: "text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200",
    icon: XCircle,
  },
  Stopped: {
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/10",
    border: "border-red-200",
    icon: StopCircle,
  },
};

export const MATERIAL_REQUEST_TYPE_CONFIG = {
  Purchase: {
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/20",
    icon: ShoppingCart,
  },
  "Material Transfer": {
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/20",
    icon: ArrowRightLeft,
  },
  "Material Issue": {
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/20",
    icon: LogOut,
  },
  Manufacture: {
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/20",
    icon: Factory,
  },
  "Customer Provided": {
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/20",
    icon: UserCheck,
  },
};
```

### 7.2 Stock Entry Purpose Config

```typescript
export const STOCK_ENTRY_PURPOSE_CONFIG = {
  "Material Issue": {
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/10",
    icon: LogOut,
    description: "Issue items out of stock",
  },
  "Material Receipt": {
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/10",
    icon: LogIn,
    description: "Receive items into stock",
  },
  "Material Transfer": {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/10",
    icon: ArrowRightLeft,
    description: "Move between warehouses",
  },
  "Material Transfer for Manufacture": {
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-900/10",
    icon: Factory,
    description: "Move raw materials to WIP",
  },
  Manufacture: {
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-900/10",
    icon: Cog,
    description: "Produce finished goods",
  },
  Repack: {
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    icon: Package,
    description: "Repackage or combine items",
  },
  "Send to Subcontractor": {
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-900/10",
    icon: Truck,
    description: "Send for outsourced work",
  },
};
```

---

## 8. Material Request List Page

**File:** `app/stock/material-request/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MoreVertical, Pencil, Trash2, Search, FileInput,
  ShoppingCart, ArrowRightLeft, LogOut, Factory, UserCheck,
  Clock, CheckCircle2, XCircle, Eye, Package, Calendar,
  TrendingUp, Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import type { MaterialRequest } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const TYPE_CONFIG = {
  Purchase: { color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: ShoppingCart },
  "Material Transfer": { color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", icon: ArrowRightLeft },
  "Material Issue": { color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20", icon: LogOut },
  Manufacture: { color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/20", icon: Factory },
  "Customer Provided": { color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/20", icon: UserCheck },
};

const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100", icon: Pencil },
  Pending: { color: "text-amber-600", bg: "bg-amber-100", icon: Clock },
  "Partially Ordered": { color: "text-blue-600", bg: "bg-blue-100", icon: TrendingUp },
  Ordered: { color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2 },
  Transferred: { color: "text-indigo-600", bg: "bg-indigo-100", icon: CheckCircle2 },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100", icon: XCircle },
};

function MaterialRequestCard({ mr, index, onView, onEdit, onDelete, onCreatePO, onCreateSE }) {
  const typeConfig = TYPE_CONFIG[mr.material_request_type] || TYPE_CONFIG.Purchase;
  const statusConfig = STATUS_CONFIG[mr.status] || STATUS_CONFIG.Draft;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  const isDraft = mr.status === "Draft" || mr.docstatus === 0;
  const progress = mr.per_ordered || mr.per_received || 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Type Badge */}
      <div className={cn("absolute -top-2 left-4 px-3 py-1 rounded-full text-[10px] font-bold", typeConfig.bg, typeConfig.color)}>
        <TypeIcon className="h-3 w-3 inline mr-1" />
        {mr.material_request_type}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mt-3 mb-4">
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
            {mr.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {mr.transaction_date ? format(parseISO(mr.transaction_date), "MMM d, yyyy") : "—"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            {isDraft && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {mr.material_request_type === "Purchase" && mr.docstatus === 1 && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreatePO(); }}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Create PO
              </DropdownMenuItem>
            )}
            {mr.material_request_type === "Material Transfer" && mr.docstatus === 1 && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateSE(); }}>
                <ArrowRightLeft className="h-4 w-4 mr-2" /> Create Transfer
              </DropdownMenuItem>
            )}
            {isDraft && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress */}
      {progress > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Fulfillment</span>
            <span className="font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", progress >= 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{mr.company}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Due: {mr.schedule_date ? format(parseISO(mr.schedule_date), "MMM d") : "—"}</span>
        </div>
        {mr.work_order && (
          <div className="flex items-center gap-1.5 text-indigo-600 col-span-2">
            <Factory className="h-3.5 w-3.5" />
            <span className="truncate">{mr.work_order}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border/50">
        <Badge className={cn("rounded-full text-[10px] border-0", statusConfig.bg, statusConfig.color)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {mr.status}
        </Badge>
      </div>
    </div>
  );
}

export default function MaterialRequestListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: requests, isLoading, refetch } = useFrappeList<MaterialRequest>("Material Request", {
    fields: [
      "name", "material_request_type", "status", "per_ordered", "per_received",
      "company", "transaction_date", "schedule_date", "work_order", "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Material Request", {
    onSuccess: () => { toast.success("Material Request deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!requests) return [];
    return requests.filter(mr => {
      const matchesSearch = !searchTerm ||
        mr.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mr.work_order?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || mr.material_request_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [requests, searchTerm, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests?.length || 0 };
    requests?.forEach(mr => { counts[mr.material_request_type] = (counts[mr.material_request_type] || 0) + 1; });
    return counts;
  }, [requests]);

  if (isLoading) return <LoadingState message="Loading material requests..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Requests"
        subtitle="Request materials for purchase, transfer, or production"
        primaryAction={{
          label: "New Request",
          onClick: () => router.push("/stock/material-request/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>

        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="bg-secondary/30 p-1 rounded-full h-auto flex-wrap">
            <TabsTrigger value="all" className="rounded-full">All ({typeCounts.all || 0})</TabsTrigger>
            <TabsTrigger value="Purchase" className="rounded-full">
              <ShoppingCart className="h-3 w-3 mr-1" /> Purchase
            </TabsTrigger>
            <TabsTrigger value="Material Transfer" className="rounded-full">
              <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
            </TabsTrigger>
            <TabsTrigger value="Material Issue" className="rounded-full">
              <LogOut className="h-3 w-3 mr-1" /> Issue
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileInput} title="No material requests"
          description={searchTerm ? "Try different search terms" : "Create your first request"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((mr, idx) => (
            <MaterialRequestCard key={mr.name} mr={mr} index={idx}
              onView={() => router.push(`/stock/material-request/${encodeURIComponent(mr.name)}`)}
              onEdit={() => router.push(`/stock/material-request/${encodeURIComponent(mr.name)}/edit`)}
              onDelete={() => setDeleteTarget(mr.name)}
              onCreatePO={() => router.push(`/buying/purchase-order/new?material_request=${encodeURIComponent(mr.name)}`)}
              onCreateSE={() => router.push(`/stock/stock-entry/new?material_request=${encodeURIComponent(mr.name)}&purpose=Material Transfer`)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Delete Material Request?" description="This cannot be undone."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

## 9. Stock Entry List Page

**File:** `app/stock/stock-entry/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MoreVertical, Pencil, Trash2, Search, ArrowRightLeft,
  LogIn, LogOut, Factory, Cog, Package, Truck, Eye, Calendar,
  Building2, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import type { StockEntry } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const PURPOSE_CONFIG = {
  "Material Issue": { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20", icon: LogOut },
  "Material Receipt": { color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: LogIn },
  "Material Transfer": { color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", icon: ArrowRightLeft },
  "Material Transfer for Manufacture": { color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/20", icon: Factory },
  "Manufacture": { color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/20", icon: Cog },
  "Repack": { color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20", icon: Package },
  "Send to Subcontractor": { color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/20", icon: Truck },
};

function StockEntryCard({ entry, index, onView, onEdit, onDelete }) {
  const purposeConfig = PURPOSE_CONFIG[entry.purpose] || PURPOSE_CONFIG["Material Transfer"];
  const PurposeIcon = purposeConfig.icon;
  const isDraft = entry.docstatus === 0;
  const isSubmitted = entry.docstatus === 1;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border border-border/50 p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Purpose Badge */}
      <div className={cn("absolute -top-2 left-4 px-3 py-1 rounded-full text-[10px] font-bold", purposeConfig.bg, purposeConfig.color)}>
        <PurposeIcon className="h-3 w-3 inline mr-1" />
        {entry.purpose}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mt-3 mb-4">
        <div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
            {entry.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {entry.posting_date ? format(parseISO(entry.posting_date), "MMM d, yyyy") : "—"}
            {entry.posting_time && ` at ${entry.posting_time.slice(0, 5)}`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            {isDraft && (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Warehouse Flow */}
      <div className="flex items-center gap-2 text-xs mb-4 p-3 bg-secondary/20 rounded-xl">
        {entry.from_warehouse && (
          <span className="font-medium text-red-600 truncate max-w-[80px]">{entry.from_warehouse.split(" - ")[0]}</span>
        )}
        {entry.from_warehouse && entry.to_warehouse && (
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        {entry.to_warehouse && (
          <span className="font-medium text-emerald-600 truncate max-w-[80px]">{entry.to_warehouse.split(" - ")[0]}</span>
        )}
        {!entry.from_warehouse && !entry.to_warehouse && (
          <span className="text-muted-foreground italic">No warehouse specified</span>
        )}
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        {entry.work_order && (
          <div className="flex items-center gap-1.5 text-indigo-600 col-span-2">
            <Factory className="h-3.5 w-3.5" />
            <span className="truncate">{entry.work_order}</span>
          </div>
        )}
        {entry.fg_completed_qty && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>FG: {entry.fg_completed_qty}</span>
          </div>
        )}
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/50">
        {entry.total_outgoing_value > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Outgoing</p>
            <p className="font-bold text-red-600">ETB {entry.total_outgoing_value?.toLocaleString()}</p>
          </div>
        )}
        {entry.total_incoming_value > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase">Incoming</p>
            <p className="font-bold text-emerald-600">ETB {entry.total_incoming_value?.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mt-3">
        <Badge className={cn("rounded-full text-[10px] border-0",
          isSubmitted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
        )}>
          {isSubmitted ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
          {isSubmitted ? "Submitted" : "Draft"}
        </Badge>
      </div>
    </div>
  );
}

export default function StockEntryListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workOrderFilter = searchParams.get("work_order");

  const [searchTerm, setSearchTerm] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filters: any[] = [];
  if (workOrderFilter) filters.push(["work_order", "=", workOrderFilter]);

  const { data: entries, isLoading, refetch } = useFrappeList<StockEntry>("Stock Entry", {
    fields: [
      "name", "stock_entry_type", "purpose", "posting_date", "posting_time",
      "work_order", "from_warehouse", "to_warehouse", "fg_completed_qty",
      "total_outgoing_value", "total_incoming_value", "docstatus",
    ],
    filters: filters.length > 0 ? filters : undefined,
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Stock Entry", {
    onSuccess: () => { toast.success("Stock Entry deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => {
      const matchesSearch = !searchTerm ||
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.work_order?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPurpose = purposeFilter === "all" || e.purpose === purposeFilter;
      return matchesSearch && matchesPurpose;
    });
  }, [entries, searchTerm, purposeFilter]);

  if (isLoading) return <LoadingState message="Loading stock entries..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Entries"
        subtitle={workOrderFilter ? `Entries for ${workOrderFilter}` : "Track all inventory movements"}
        primaryAction={{
          label: "New Entry",
          onClick: () => router.push("/stock/stock-entry/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search entries..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>

        <Tabs value={purposeFilter} onValueChange={setPurposeFilter}>
          <TabsList className="bg-secondary/30 p-1 rounded-full h-auto flex-wrap">
            <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
            <TabsTrigger value="Material Receipt" className="rounded-full">
              <LogIn className="h-3 w-3 mr-1" /> Receipt
            </TabsTrigger>
            <TabsTrigger value="Material Issue" className="rounded-full">
              <LogOut className="h-3 w-3 mr-1" /> Issue
            </TabsTrigger>
            <TabsTrigger value="Material Transfer" className="rounded-full">
              <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
            </TabsTrigger>
            <TabsTrigger value="Manufacture" className="rounded-full">
              <Cog className="h-3 w-3 mr-1" /> Manufacture
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title="No stock entries"
          description={searchTerm ? "Try different search terms" : "Create your first entry"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((entry, idx) => (
            <StockEntryCard key={entry.name} entry={entry} index={idx}
              onView={() => router.push(`/stock/stock-entry/${encodeURIComponent(entry.name)}`)}
              onEdit={() => router.push(`/stock/stock-entry/${encodeURIComponent(entry.name)}/edit`)}
              onDelete={() => setDeleteTarget(entry.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Delete Stock Entry?" description="This cannot be undone. Stock ledger will not be affected for draft entries."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

_See Part 3 for Create pages and Detail pages._
