# Phase E5: Work Order Module - Part 2 (Client Pages)

> **Continuation of PHASE_E5_WORK_ORDER_PART1.md**

---

## 10. List Page

**File:** `app/manufacturing/work-order/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, MoreVertical, Pencil, Trash2, Search, ClipboardList,
  Play, Pause, CheckCircle2, Clock, XCircle, Archive, Eye,
  Package, Calendar, Factory, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFrappeList, useFrappeDelete } from "@/hooks/generic";
import { PageHeader, LoadingState, EmptyState, ConfirmDialog } from "@/components/smart";
import type { WorkOrder } from "@/types/doctype-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO, isPast } from "date-fns";

// Status configuration
const STATUS_CONFIG = {
  Draft: { color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800", icon: Pencil },
  "Not Started": { color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", icon: Clock },
  "In Process": { color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", icon: Play },
  Completed: { color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCircle2 },
  Stopped: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", icon: Pause },
  Closed: { color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800", icon: Archive },
  Cancelled: { color: "text-gray-400", bg: "bg-gray-100 dark:bg-gray-800", icon: XCircle },
};

function WorkOrderCard({ wo, index, onView, onEdit, onDelete }) {
  const statusConfig = STATUS_CONFIG[wo.status] || STATUS_CONFIG.Draft;
  const StatusIcon = statusConfig.icon;
  const isOverdue = wo.expected_delivery_date && isPast(parseISO(wo.expected_delivery_date)) &&
    !["Completed", "Closed", "Cancelled"].includes(wo.status);
  const progress = wo.qty > 0 ? ((wo.produced_qty || 0) / wo.qty) * 100 : 0;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-2xl border p-6",
        "hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
        "transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-4",
        isOverdue ? "border-red-300 dark:border-red-800" : "border-border/50"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onView}
    >
      {/* Overdue Badge */}
      {isOverdue && (
        <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
          OVERDUE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", statusConfig.bg, statusConfig.color)}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
              {wo.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{wo.item_name || wo.production_item}</p>
          </div>
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
            {wo.status === "Draft" && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {wo.status === "Draft" && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{wo.produced_qty || 0} / {wo.qty}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          <span className="truncate">{wo.bom_no}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Factory className="h-3.5 w-3.5" />
          <span className="truncate">{wo.fg_warehouse}</span>
        </div>
        {wo.planned_start_date && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(parseISO(wo.planned_start_date), "MMM d")}</span>
          </div>
        )}
        {wo.sales_order && (
          <div className="flex items-center gap-1.5 text-blue-600">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="truncate">{wo.sales_order}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <Badge className={cn("rounded-full text-xs", statusConfig.bg, statusConfig.color, "border-0")}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {wo.status}
        </Badge>
      </div>
    </div>
  );
}

export default function WorkOrderListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: workOrders, isLoading, refetch } = useFrappeList<WorkOrder>("Work Order", {
    fields: [
      "name", "status", "production_item", "item_name", "bom_no",
      "sales_order", "qty", "produced_qty", "fg_warehouse",
      "planned_start_date", "expected_delivery_date", "docstatus",
    ],
    orderBy: { field: "creation", order: "desc" },
    limit: 100,
  });

  const deleteMutation = useFrappeDelete("Work Order", {
    onSuccess: () => { toast.success("Work Order deleted"); refetch(); setDeleteTarget(null); },
  });

  const filtered = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter(wo => {
      const matchesSearch = !searchTerm ||
        wo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.production_item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.sales_order?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workOrders, searchTerm, statusFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: workOrders?.length || 0 };
    workOrders?.forEach(wo => { counts[wo.status] = (counts[wo.status] || 0) + 1; });
    return counts;
  }, [workOrders]);

  if (isLoading) return <LoadingState message="Loading work orders..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Manage production commands and track manufacturing progress"
        primaryAction={{
          label: "Create Work Order",
          onClick: () => router.push("/manufacturing/work-order/new"),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search work orders..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full lg:w-auto">
          <TabsList className="bg-secondary/30 p-1 rounded-full flex-wrap h-auto">
            {["all", "Not Started", "In Process", "Completed", "Stopped"].map(s => (
              <TabsTrigger key={s} value={s} className="rounded-full capitalize data-[state=active]:shadow-sm">
                {s === "all" ? "All" : s} {statusCounts[s] ? `(${statusCounts[s]})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No work orders found"
          description={searchTerm ? "Try different search terms" : "Create your first work order"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((wo, idx) => (
            <WorkOrderCard key={wo.name} wo={wo} index={idx}
              onView={() => router.push(`/manufacturing/work-order/${encodeURIComponent(wo.name)}`)}
              onEdit={() => router.push(`/manufacturing/work-order/${encodeURIComponent(wo.name)}/edit`)}
              onDelete={() => setDeleteTarget(wo.name)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title="Delete Work Order?" description="This cannot be undone."
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending} variant="destructive" />
    </div>
  );
}
```

---

## 11. Create Page

**File:** `app/manufacturing/work-order/new/page.tsx`

```typescript
// @ts-nocheck
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Save, Loader2, ClipboardList, Package, Calendar, Factory,
  AlertTriangle, CheckCircle2, FileText,
} from "lucide-react";
import { Form } from "@/components/ui/form";
import { useFrappeCreate, useFrappeDoc, useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { FormInput, FormFrappeSelect, FormSwitch, FormTextarea } from "@/components/form";
import { WorkOrderCreateSchema, type WorkOrderFormData } from "@/lib/schemas/doctype-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Bom, SalesOrder, Item } from "@/types/doctype-types";

function CreateWorkOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params for pre-population
  const preItem = searchParams.get("item");
  const preBom = searchParams.get("bom");
  const preSalesOrder = searchParams.get("sales_order");

  const form = useForm<WorkOrderFormData>({
    resolver: zodResolver(WorkOrderCreateSchema),
    defaultValues: {
      naming_series: "MFG-WO-.YYYY.-",
      production_item: preItem || "",
      bom_no: preBom || "",
      company: "",
      qty: 1,
      fg_warehouse: "",
      planned_start_date: new Date().toISOString().slice(0, 16),
      sales_order: preSalesOrder || "",
      project: "",
      source_warehouse: "",
      wip_warehouse: "",
      scrap_warehouse: "",
      use_multi_level_bom: 0,
      skip_transfer: 0,
    },
  });

  const selectedItem = form.watch("production_item");
  const selectedBom = form.watch("bom_no");

  // Fetch BOMs for selected item
  const { data: boms } = useFrappeList<Bom>("BOM", {
    fields: ["name", "item", "item_name", "is_default", "is_active"],
    filters: selectedItem ? [["item", "=", selectedItem], ["is_active", "=", 1]] : [],
    limit: 50,
  });

  // Auto-select default BOM
  useEffect(() => {
    if (boms && boms.length > 0 && !selectedBom) {
      const defaultBom = boms.find(b => b.is_default === 1) || boms[0];
      form.setValue("bom_no", defaultBom.name);
    }
  }, [boms, selectedBom, form]);

  // Fetch BOM details for material preview
  const { data: bomDetails } = useFrappeDoc<Bom>("BOM", selectedBom || "", { enabled: !!selectedBom });

  // Pre-fill from Sales Order
  const { data: salesOrderDetails } = useFrappeDoc<SalesOrder>("Sales Order", preSalesOrder || "", {
    enabled: !!preSalesOrder
  });

  useEffect(() => {
    if (salesOrderDetails) {
      form.setValue("company", salesOrderDetails.company);
      form.setValue("expected_delivery_date", salesOrderDetails.delivery_date);
      // If SO has items, could pre-fill from first item
    }
  }, [salesOrderDetails, form]);

  const createMutation = useFrappeCreate("Work Order", {
    onSuccess: (response) => {
      toast.success("Work Order created");
      router.push(`/manufacturing/work-order/${encodeURIComponent(response.data?.name || response.name)}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: WorkOrderFormData) => {
    // Format required_items from BOM
    const payload = {
      ...data,
      docstatus: 0,
      status: "Draft",
      required_items: bomDetails?.items?.map((item: any) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        source_warehouse: data.source_warehouse,
        required_qty: item.qty * (data.qty / (bomDetails.quantity || 1)),
        doctype: "Work Order Item",
      })) || [],
      operations: bomDetails?.operations?.map((op: any) => ({
        operation: op.operation,
        workstation: op.workstation,
        time_in_mins: op.time_in_mins,
        doctype: "Work Order Operation",
      })) || [],
    };
    createMutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product & BOM */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Package className="h-5 w-5 text-primary" />
                Product & Recipe
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFrappeSelect control={form.control} name="production_item" label="Item to Manufacture"
                  doctype="Item" required placeholder="Select product..."
                  filters={[["is_stock_item", "=", 1]]} />
                <FormFrappeSelect control={form.control} name="bom_no" label="Bill of Materials"
                  doctype="BOM" required placeholder={selectedItem ? "Select BOM..." : "Select item first"}
                  filters={selectedItem ? [["item", "=", selectedItem], ["is_active", "=", 1]] : []}
                  disabled={!selectedItem} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormInput control={form.control} name="qty" label="Quantity" type="number" required />
                <FormFrappeSelect control={form.control} name="company" label="Company" doctype="Company" required />
              </div>
            </div>

            {/* Source & Scheduling */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <FileText className="h-5 w-5 text-blue-500" />
                Source & Scheduling
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFrappeSelect control={form.control} name="sales_order" label="Sales Order (Optional)"
                  doctype="Sales Order" placeholder="Link to SO..." />
                <FormFrappeSelect control={form.control} name="project" label="Project (Optional)"
                  doctype="Project" placeholder="Link to project..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput control={form.control} name="planned_start_date" label="Planned Start"
                  type="datetime-local" required />
                <FormInput control={form.control} name="planned_end_date" label="Planned End"
                  type="datetime-local" />
                <FormInput control={form.control} name="expected_delivery_date" label="Expected Delivery"
                  type="date" />
              </div>
              <FormFrappeSelect control={form.control} name="material_request" label="Material Request (Optional)"
                doctype="Material Request" placeholder="Link to MR..." />
            </div>

            {/* Warehouses */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Factory className="h-5 w-5 text-amber-500" />
                Warehouse Locations
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormFrappeSelect control={form.control} name="source_warehouse" label="Source (Raw Materials)"
                  doctype="Warehouse" placeholder="e.g., Raw Material Store"
                  filters={[["is_group", "=", 0]]} />
                <FormFrappeSelect control={form.control} name="wip_warehouse" label="WIP (Work-in-Progress)"
                  doctype="Warehouse" placeholder="e.g., Production Floor"
                  filters={[["is_group", "=", 0]]} />
                <FormFrappeSelect control={form.control} name="fg_warehouse" label="Target (Finished Goods)"
                  doctype="Warehouse" required placeholder="e.g., Finished Goods"
                  filters={[["is_group", "=", 0]]} />
                <FormFrappeSelect control={form.control} name="scrap_warehouse" label="Scrap Warehouse"
                  doctype="Warehouse" placeholder="e.g., Scrap Store"
                  filters={[["is_group", "=", 0]]} />
              </div>
              <FormSwitch control={form.control} name="skip_transfer" label="Skip Material Transfer"
                description="Check if materials don't need to be transferred to WIP" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* BOM Preview */}
            <div className="bg-card rounded-2xl border border-border/50 p-6 sticky top-6">
              <h3 className="font-semibold mb-4">BOM Preview</h3>
              {bomDetails ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batch Size</span>
                    <span className="font-medium">{bomDetails.quantity} {bomDetails.uom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Materials</span>
                    <span className="font-medium">{bomDetails.items?.length || 0} items</span>
                  </div>
                  {bomDetails.with_operations === 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Operations</span>
                      <span className="font-medium">{bomDetails.operations?.length || 0} steps</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cost</span>
                      <span className="font-bold text-primary">ETB {bomDetails.total_cost?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Select a BOM to preview</p>
              )}

              <Button type="submit" disabled={createMutation.isPending}
                className="w-full mt-6 rounded-full">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Create Work Order
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default function CreateWorkOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Create Work Order" subtitle="Start a new production job"
        backHref="/manufacturing/work-order" />
      <Suspense fallback={<LoadingState />}>
        <CreateWorkOrderForm />
      </Suspense>
    </div>
  );
}
```

---

## 12. Detail Page Actions

Key actions on the Work Order detail page:

```typescript
// Action handlers for Work Order detail page
const handleSubmit = async () => {
  await updateMutation.mutateAsync({ name: woName, data: { docstatus: 1 } });
  toast.success("Work Order submitted");
};

const handleStartProduction = () => {
  // Navigate to Stock Entry creation with pre-filled data
  router.push(`/stock/stock-entry/new?purpose=Material Transfer for Manufacture&work_order=${woName}`);
};

const handleFinishProduction = () => {
  router.push(`/stock/stock-entry/new?purpose=Manufacture&work_order=${woName}`);
};

const handleStop = async () => {
  await updateMutation.mutateAsync({ name: woName, data: { status: "Stopped" } });
};

const handleClose = async () => {
  await updateMutation.mutateAsync({ name: woName, data: { status: "Closed" } });
};

// Render action buttons based on status
{status === "Draft" && <Button onClick={handleSubmit}>Submit</Button>}
{status === "Not Started" && <Button onClick={handleStartProduction}>Start Production</Button>}
{status === "In Process" && <Button onClick={handleFinishProduction}>Finish Production</Button>}
{["Not Started", "In Process"].includes(status) && <Button variant="outline" onClick={handleStop}>Stop</Button>}
{status === "Completed" && <Button variant="outline" onClick={handleClose}>Close</Button>}
```

---

## 13. Sales Order Integration

Add this button to the Sales Order detail page:

```typescript
// In app/sales/sales-order/[name]/page.tsx - Add to actions
{salesOrder.docstatus === 1 && (
  <Button
    variant="outline"
    onClick={() => router.push(`/manufacturing/work-order/new?sales_order=${encodeURIComponent(soName)}`)}
  >
    <ClipboardList className="h-4 w-4 mr-2" />
    Create Work Order
  </Button>
)}
```

---

## 14. Testing Checklist

- [ ] Create Work Order manually
- [ ] Create Work Order from Sales Order (via URL param)
- [ ] Create Work Order from BOM detail page
- [ ] Verify BOM auto-selection for item
- [ ] Verify materials populated from BOM
- [ ] Test all warehouse selections
- [ ] Submit Work Order (Draft → Not Started)
- [ ] Start Production (creates Stock Entry)
- [ ] Finish Production (creates Stock Entry)
- [ ] Stop Work Order
- [ ] Close Work Order
- [ ] Test overdue indicator
- [ ] Test progress bar
- [ ] Filter by status tabs
- [ ] Search by WO name, item, sales order
- [ ] Test dark mode
- [ ] Test mobile responsiveness

---

_End of Phase E5 Work Order Documentation_
