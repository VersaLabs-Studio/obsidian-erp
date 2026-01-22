# Phase E5: Work Order Module Implementation - Part 1

> **Version:** 1.0.0  
> **Module:** Manufacturing  
> **DocType:** Work Order  
> **Priority:** 🔴 Critical (Production Control)  
> **Dependencies:** BOM (E4), Item, Warehouse (E1), Sales Order, Project

---

## Overview

The **Work Order** is the **production command** - it tells the factory floor what to make, how much, and by when. It's the bridge between Sales (demand) and Manufacturing (execution).

### Business Context (Print Shop)

```
Sales Order: SO-2026-0042 "5000 Business Cards for ABC Corp"
    ↓
Work Order: MFG-WO-2026-0001
    ├── Item: Business Cards
    ├── BOM: BOM-BC-001 (Recipe)
    ├── Qty: 5000
    ├── Planned Start: Jan 22, 2026
    ├── Expected Delivery: Jan 25, 2026
    ├── Source Warehouse: Raw Material Store
    ├── WIP Warehouse: Production Floor
    └── Target Warehouse: Finished Goods
        ↓
    [Start Production] → Stock Entry (Material Transfer)
        ↓
    [Finish Production] → Stock Entry (Manufacture)
```

---

## 1. Status Lifecycle

```
                    ┌──────────┐
                    │  Draft   │ ← Initial creation
                    └────┬─────┘
                         │ Submit
                    ┌────▼─────┐
                    │Submitted │
                    └────┬─────┘
                         │ Auto-transition
                    ┌────▼──────┐
                    │Not Started│ ← Ready for production
                    └────┬──────┘
                         │ Start Production (Stock Entry)
                    ┌────▼─────┐
                    │In Process│ ← Materials transferred to WIP
                    └────┬─────┘
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼────┐ ┌───▼───┐ ┌───▼────┐
         │ Stopped │ │Closed │ │Completed│
         └─────────┘ └───────┘ └────────┘
                                    ↑
                         Finish Production (Stock Entry)
```

### Status Definitions

| Status          | Color | Description                | Actions Available             |
| --------------- | ----- | -------------------------- | ----------------------------- |
| **Draft**       | Gray  | Being prepared             | Edit, Submit, Delete          |
| **Submitted**   | Blue  | Approved, auto-transitions | —                             |
| **Not Started** | Amber | Ready to start             | Start Production, Stop, Close |
| **In Process**  | Blue  | Production ongoing         | Finish, Stop, Close           |
| **Completed**   | Green | All qty produced           | Close                         |
| **Stopped**     | Red   | Temporarily halted         | Resume, Close                 |
| **Closed**      | Gray  | Archived                   | —                             |
| **Cancelled**   | Gray  | Voided                     | —                             |

---

## 2. Field Scope Analysis

### ✅ MVP Fields (Implement Now)

| Field                    | Type        | Required | Purpose                    |
| ------------------------ | ----------- | -------- | -------------------------- |
| `naming_series`          | Select      | ✅       | MFG-WO-.YYYY.-             |
| `status`                 | Select      | ✅       | Lifecycle status           |
| `production_item`        | Link (Item) | ✅       | What to manufacture        |
| `item_name`              | Data        | Auto     | Display name               |
| `bom_no`                 | Link (BOM)  | ✅       | Recipe to use              |
| `company`                | Link        | ✅       | Company                    |
| `qty`                    | Float       | ✅       | Quantity to produce        |
| `produced_qty`           | Float       | Read     | Completed quantity         |
| `sales_order`            | Link        | ❌       | Source demand              |
| `project`                | Link        | ❌       | Related project            |
| `source_warehouse`       | Link        | ❌       | Raw material location      |
| `wip_warehouse`          | Link        | ❌       | Work-in-progress location  |
| `fg_warehouse`           | Link        | ✅       | Finished goods destination |
| `scrap_warehouse`        | Link        | ❌       | Waste destination          |
| `planned_start_date`     | Datetime    | ✅       | When to start              |
| `planned_end_date`       | Datetime    | ❌       | When to finish             |
| `expected_delivery_date` | Date        | ❌       | Deadline                   |
| `actual_start_date`      | Datetime    | Read     | When started               |
| `actual_end_date`        | Datetime    | Read     | When completed             |
| `required_items`         | Table       | Auto     | Materials from BOM         |
| `operations`             | Table       | ❌       | Operations from BOM        |
| `material_request`       | Link        | ❌       | Source MR                  |
| `description`            | Text        | Auto     | Item description           |
| `stock_uom`              | Link        | Auto     | Unit of measure            |

---

## 3. Configuration Updates

### 3.1 DocType Config (`lib/doctype-config.ts`)

```typescript
// MANUFACTURING MODULE section
"Work Order": {
  apiPath: "manufacturing/work-order",
  module: "Manufacturing",
  labelField: "name",
  searchFields: ["name", "production_item", "item_name", "sales_order"],
  defaultSortField: "creation",
  defaultSortOrder: "desc",
},
"Work Order Item": {
  apiPath: "manufacturing/work-order-item",
  module: "Manufacturing",
  labelField: "item_code",
  isSettings: true,
},
"Work Order Operation": {
  apiPath: "manufacturing/work-order-operation",
  module: "Manufacturing",
  labelField: "operation",
  isSettings: true,
},
```

### 3.2 Query Keys (`lib/query-keys.ts`)

```typescript
// MANUFACTURING MODULE section
workOrder: {
  all: () => ["Work Order"] as const,
  list: (options?: FrappeListOptions) => ["Work Order", "list", options] as const,
  doc: (name: string) => ["Work Order", "doc", name] as const,
  bySalesOrder: (so: string) => ["Work Order", "list", "sales_order", so] as const,
  byStatus: (status: string) => ["Work Order", "list", "status", status] as const,
  byItem: (item: string) => ["Work Order", "list", "item", item] as const,
  pendingMaterials: (name: string) => ["Work Order", name, "pending_materials"] as const,
},
```

---

## 4. Schema Definition

Add to `lib/schemas/doctype-schemas.ts`:

```typescript
// Work Order Item (Child Table - Required Materials)
export const WorkOrderItemSchema = z.object({
  item_code: z.string().min(1),
  item_name: z.string().optional(),
  source_warehouse: z.string().optional(),
  required_qty: z.number().min(0).default(0),
  transferred_qty: z.number().optional(),
  consumed_qty: z.number().optional(),
  available_qty_at_source_warehouse: z.number().optional(),
});

// Work Order Operation (Child Table)
export const WorkOrderOperationSchema = z.object({
  operation: z.string().min(1),
  workstation: z.string().optional(),
  time_in_mins: z.number().min(0).default(0),
  planned_operating_cost: z.number().optional(),
  actual_operating_cost: z.number().optional(),
  completed_qty: z.number().optional(),
  status: z.enum(["Pending", "Work in Progress", "Completed"]).optional(),
});

// Work Order Create Schema
export const WorkOrderCreateSchema = z.object({
  naming_series: z.literal("MFG-WO-.YYYY.-").default("MFG-WO-.YYYY.-"),
  production_item: z.string().min(1, "Item is required"),
  bom_no: z.string().min(1, "BOM is required"),
  company: z.string().min(1, "Company is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  fg_warehouse: z.string().min(1, "Target warehouse is required"),
  planned_start_date: z.string().min(1, "Planned start date is required"),

  // Optional fields
  sales_order: z.string().optional(),
  project: z.string().optional(),
  source_warehouse: z.string().optional(),
  wip_warehouse: z.string().optional(),
  scrap_warehouse: z.string().optional(),
  planned_end_date: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  material_request: z.string().optional(),
  use_multi_level_bom: z.union([z.literal(0), z.literal(1)]).default(0),
  skip_transfer: z.union([z.literal(0), z.literal(1)]).default(0),

  // Child tables (auto-populated from BOM)
  required_items: z.array(WorkOrderItemSchema).optional(),
  operations: z.array(WorkOrderOperationSchema).optional(),
});

export const WorkOrderUpdateSchema = WorkOrderCreateSchema.partial().extend({
  status: z
    .enum([
      "Draft",
      "Submitted",
      "Not Started",
      "In Process",
      "Completed",
      "Stopped",
      "Closed",
      "Cancelled",
    ])
    .optional(),
});

export type WorkOrderFormData = z.input<typeof WorkOrderCreateSchema>;
export type WorkOrderItemData = z.input<typeof WorkOrderItemSchema>;
export type WorkOrderOperationData = z.input<typeof WorkOrderOperationSchema>;
```

---

## 5. API Routes

### 5.1 List & Create

**File:** `app/api/manufacturing/work-order/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { WorkOrderCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Work Order", {
  allowedFields: [
    "name",
    "status",
    "production_item",
    "item_name",
    "bom_no",
    "sales_order",
    "project",
    "company",
    "qty",
    "produced_qty",
    "fg_warehouse",
    "wip_warehouse",
    "source_warehouse",
    "planned_start_date",
    "planned_end_date",
    "expected_delivery_date",
    "actual_start_date",
    "actual_end_date",
    "creation",
    "docstatus",
  ],
  defaultSort: { field: "creation", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler("Work Order", WorkOrderCreateSchema);
```

### 5.2 Single Document

**File:** `app/api/manufacturing/work-order/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { WorkOrderUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Work Order");
export const PUT = createUpdateHandler("Work Order", WorkOrderUpdateSchema);
export const DELETE = createDeleteHandler("Work Order");
```

---

## 6. Status Configuration (UI)

```typescript
// Status badge colors for Work Order
export const WORK_ORDER_STATUS_CONFIG: Record<
  string,
  {
    color: string;
    bgColor: string;
    icon: LucideIcon;
    label: string;
  }
> = {
  Draft: {
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: Pencil,
    label: "Draft",
  },
  Submitted: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: CheckCircle,
    label: "Submitted",
  },
  "Not Started": {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: Clock,
    label: "Not Started",
  },
  "In Process": {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Play,
    label: "In Process",
  },
  Completed: {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: CheckCircle2,
    label: "Completed",
  },
  Stopped: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: Pause,
    label: "Stopped",
  },
  Closed: {
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: Archive,
    label: "Closed",
  },
  Cancelled: {
    color: "text-gray-500 dark:text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    icon: XCircle,
    label: "Cancelled",
  },
};
```

---

## 7. Material Availability Indicator

A key feature for the Work Order is showing whether materials are available:

```typescript
// Material availability check component
function MaterialAvailabilityIndicator({ items }: { items: WorkOrderItem[] }) {
  const allAvailable = items.every(
    (item) => (item.available_qty_at_source_warehouse || 0) >= (item.required_qty || 0)
  );
  const someAvailable = items.some(
    (item) => (item.available_qty_at_source_warehouse || 0) >= (item.required_qty || 0)
  );

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-xl text-sm font-medium",
      allAvailable
        ? "bg-emerald-500/10 text-emerald-600"
        : someAvailable
          ? "bg-amber-500/10 text-amber-600"
          : "bg-red-500/10 text-red-600"
    )}>
      {allAvailable ? (
        <><CheckCircle2 className="h-4 w-4" /> All materials available</>
      ) : someAvailable ? (
        <><AlertTriangle className="h-4 w-4" /> Some materials unavailable</>
      ) : (
        <><XCircle className="h-4 w-4" /> Materials not available</>
      )}
    </div>
  );
}
```

---

## 8. Integration Points

| Source               | Action                     | Target                                |
| -------------------- | -------------------------- | ------------------------------------- |
| **Sales Order**      | "Create Work Order" button | Pre-fills item, qty, dates            |
| **BOM**              | Selection                  | Auto-populates materials & operations |
| **Work Order**       | "Start Production"         | Creates Stock Entry (Transfer)        |
| **Work Order**       | "Finish Production"        | Creates Stock Entry (Manufacture)     |
| **Material Request** | Link                       | Tracks procurement request            |

### URL Parameters for Pre-population

| Parameter                  | Source             | Usage               |
| -------------------------- | ------------------ | ------------------- |
| `?sales_order=SO-2026-001` | Sales Order detail | Pre-fill from SO    |
| `?bom=BOM-001`             | BOM detail         | Pre-fill item & BOM |
| `?item=ITEM-001`           | Item detail        | Pre-fill item       |

---

## 9. File Structure

```
app/manufacturing/work-order/
├── page.tsx                    # List with status tabs
├── new/page.tsx                # Create with BOM selection
└── [name]/
    ├── page.tsx                # Detail with actions
    └── edit/page.tsx           # Edit (draft only)

app/api/manufacturing/work-order/
├── route.ts                    # GET list, POST create
└── [name]/route.ts             # GET, PUT, DELETE
```

---

_See Part 2 for complete List, Create, and Detail page implementations._
