# Phase E6: Stock & Material Management - Part 1

> **Version:** 1.0.0  
> **Module:** Stock / Manufacturing / Buying  
> **DocTypes:** Material Request, Stock Entry, Purchase Order  
> **Priority:** 🔴 Critical (Inventory Foundation)  
> **Dependencies:** Warehouse (E1), BOM (E4), Work Order (E5), Item, Supplier

---

## Overview

Phase E6 is the **inventory backbone** of Pana ERP. It controls how materials flow through your organization - from requesting materials, purchasing from suppliers, receiving into warehouses, transferring between locations, consuming in manufacturing, and issuing for various purposes.

### The Inventory Flow Ecosystem

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   DEMAND SOURCES                        │
                    │  Sales Order │ Work Order │ Manual Request │ Reorder   │
                    └──────────────────────────┬──────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │              MATERIAL REQUEST                           │
                    │  Purpose: Purchase │ Transfer │ Issue │ Manufacture    │
                    └──────────────────────────┬──────────────────────────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
              ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
              │  PURCHASE ORDER  │  │   STOCK ENTRY    │  │   STOCK ENTRY    │
              │  (if Purchase)   │  │   (Transfer)     │  │   (Issue)        │
              └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘
                       │                     │
                       ▼                     ▼
              ┌──────────────────┐  ┌──────────────────┐
              │ PURCHASE RECEIPT │  │  Stock Updated   │
              │  (Stock Entry)   │  │  in Warehouse    │
              └────────┬─────────┘  └──────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   WAREHOUSE      │
              │   Stock Ledger   │
              └──────────────────┘
```

---

## 1. Material Request

### 1.1 Purpose & Business Context

A **Material Request** is the formal way to request materials. It's the starting point for:

- **Purchasing** - Request to buy from suppliers
- **Internal Transfers** - Move stock between warehouses
- **Manufacturing** - Request materials for production
- **Direct Issue** - Consume materials for internal use

### 1.2 Status Lifecycle

```
┌───────────┐    Submit    ┌───────────┐   Ordered/    ┌────────────────┐
│   Draft   │ ──────────▶  │ Submitted │ ─ Transferred │ Partially Met  │
└───────────┘              └───────────┘       │       └────────────────┘
                                  │            │              │
                                  │            ▼              │
                                  │     ┌───────────┐        │
                                  │     │   Stopped │        │
                                  │     └───────────┘        │
                                  │                          │
                                  ▼                          ▼
                           ┌─────────────────────────────────────┐
                           │              Completed              │
                           │  (All items ordered/transferred)    │
                           └─────────────────────────────────────┘
```

### 1.3 Request Types (Purpose)

| Type                  | Description                | Next Action            | Stock Impact              |
| --------------------- | -------------------------- | ---------------------- | ------------------------- |
| **Purchase**          | Buy from external supplier | Creates Purchase Order | Incoming stock            |
| **Material Transfer** | Move between warehouses    | Creates Stock Entry    | Internal movement         |
| **Material Issue**    | Issue for internal use     | Creates Stock Entry    | Stock reduction           |
| **Manufacture**       | Request for production     | Links to Work Order    | For consumption           |
| **Customer Provided** | Customer sends materials   | Creates Stock Entry    | Incoming (customer owned) |

### 1.4 Transfer Status (for Transfer requests)

| Status          | Meaning                                   |
| --------------- | ----------------------------------------- |
| **Not Started** | Transfer request created but not executed |
| **In Transit**  | Materials being moved                     |
| **Completed**   | All materials transferred                 |

### 1.5 Field Specification

```typescript
// Material Request Item (Child Table)
export const MaterialRequestItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.number().min(0.001, "Quantity must be greater than 0"),
  uom: z.string().optional(),
  warehouse: z.string().optional(), // Target warehouse
  schedule_date: z.string().optional(), // Required by date
  description: z.string().optional(),
  // For Transfer type
  from_warehouse: z.string().optional(),
  // Tracking
  ordered_qty: z.number().optional(), // How much already ordered
  received_qty: z.number().optional(), // How much already received
});

// Material Request Create Schema
export const MaterialRequestCreateSchema = z.object({
  naming_series: z.literal("MAT-MR-.YYYY.-").default("MAT-MR-.YYYY.-"),
  material_request_type: z.enum([
    "Purchase",
    "Material Transfer",
    "Material Issue",
    "Manufacture",
    "Customer Provided",
  ]),
  company: z.string().min(1, "Company is required"),
  transaction_date: z
    .string()
    .default(() => new Date().toISOString().split("T")[0]),
  schedule_date: z.string().min(1, "Required by date is required"),

  // Optional links
  work_order: z.string().optional(),
  sales_order: z.string().optional(),
  project: z.string().optional(),

  // Warehouses
  set_warehouse: z.string().optional(), // Default target warehouse
  set_from_warehouse: z.string().optional(), // Default source (for transfers)

  // Items
  items: z
    .array(MaterialRequestItemSchema)
    .min(1, "At least one item required"),

  // Additional
  reason: z.string().optional(), // Reason for request
  letter_head: z.string().optional(),
});
```

---

## 2. Stock Entry

### 2.1 Purpose & Business Context

A **Stock Entry** is the actual movement of stock. It records every physical stock transaction in your warehouses.

### 2.2 Stock Entry Purposes

| Purpose                                  | Description                  | Source WH | Target WH | Use Case                      |
| ---------------------------------------- | ---------------------------- | --------- | --------- | ----------------------------- |
| **Material Receipt**                     | Receive stock (no PO)        | —         | ✅        | Opening stock, adjustments    |
| **Material Issue**                       | Issue stock out              | ✅        | —         | Internal consumption, samples |
| **Material Transfer**                    | Move between warehouses      | ✅        | ✅        | Relocation, replenishment     |
| **Material Transfer for Manufacture**    | Move to WIP for production   | ✅        | WIP       | Work Order material issue     |
| **Material Consumption for Manufacture** | Consume in production        | WIP       | —         | Record actual consumption     |
| **Manufacture**                          | Finish production            | WIP       | FG        | Create finished goods         |
| **Repack**                               | Break down/combine items     | ✅        | ✅        | Kitting, unpacking            |
| **Send to Subcontractor**                | Send raw materials to vendor | ✅        | Transit   | Outsourced manufacturing      |
| **Disassemble**                          | Reverse manufacturing        | FG        | RM        | Return FG to components       |

### 2.3 Integration Points

```
                        STOCK ENTRY
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │ Work Order  │    │   BOM       │    │  Purchase   │
  │ (Mfg flows) │    │ (Auto items)│    │   Order     │
  └─────────────┘    └─────────────┘    └─────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
  • Transfer for Mfg   • Auto-populate     • Purchase Receipt
  • Manufacture        • Item quantities   • Supplier details
  • Consumption        • Scrap items
```

### 2.4 Field Specification

```typescript
// Stock Entry Detail (Child Table)
export const StockEntryDetailSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.number().min(0.001),
  uom: z.string().optional(),
  s_warehouse: z.string().optional(), // Source warehouse
  t_warehouse: z.string().optional(), // Target warehouse
  basic_rate: z.number().min(0).optional(),
  basic_amount: z.number().optional(),
  // For manufacturing
  is_finished_item: z.boolean().optional(),
  is_scrap_item: z.boolean().optional(),
  // Batch/Serial tracking
  batch_no: z.string().optional(),
  serial_no: z.string().optional(),
});

// Stock Entry Create Schema
export const StockEntryCreateSchema = z.object({
  naming_series: z.literal("MAT-STE-.YYYY.-").default("MAT-STE-.YYYY.-"),
  stock_entry_type: z.string().min(1), // Same as purpose
  purpose: z.enum([
    "Material Issue",
    "Material Receipt",
    "Material Transfer",
    "Material Transfer for Manufacture",
    "Material Consumption for Manufacture",
    "Manufacture",
    "Repack",
    "Send to Subcontractor",
    "Disassemble",
  ]),
  company: z.string().min(1),
  posting_date: z.string(),
  posting_time: z.string().optional(),

  // Source documents
  work_order: z.string().optional(),
  bom_no: z.string().optional(),
  purchase_order: z.string().optional(),
  delivery_note: z.string().optional(),
  sales_invoice: z.string().optional(),
  material_request: z.string().optional(),

  // Warehouses
  from_warehouse: z.string().optional(), // Default source
  to_warehouse: z.string().optional(), // Default target

  // For Manufacture
  fg_completed_qty: z.number().optional(), // Finished goods qty

  // Items
  items: z.array(StockEntryDetailSchema).min(1),

  // Additional costs (landed cost)
  additional_costs: z
    .array(
      z.object({
        expense_account: z.string(),
        description: z.string(),
        amount: z.number(),
      }),
    )
    .optional(),

  // Totals
  total_outgoing_value: z.number().optional(),
  total_incoming_value: z.number().optional(),
  value_difference: z.number().optional(),

  remarks: z.string().optional(),
});
```

---

## 3. Purchase Order

### 3.1 Purpose & Business Context

A **Purchase Order** is the official request to a supplier to deliver goods. It's created from Material Requests (Purchase type) or directly.

### 3.2 Status Lifecycle

```
┌───────────┐   Submit   ┌───────────┐   Receive   ┌────────────────────┐
│   Draft   │ ────────▶  │ To Receive│ ─────────▶  │ To Receive and Bill│
└───────────┘            │ and Bill  │             └────────────────────┘
                         └───────────┘                       │
                                │                            │
                                ▼                            ▼
                         ┌───────────┐              ┌───────────────┐
                         │ Completed │              │   Cancelled   │
                         └───────────┘              └───────────────┘
```

### 3.3 Field Specification

```typescript
// Purchase Order Item (Child Table)
export const PurchaseOrderItemSchema = z.object({
  item_code: z.string().min(1),
  item_name: z.string().optional(),
  qty: z.number().min(0.001),
  rate: z.number().min(0),
  amount: z.number().optional(),
  uom: z.string().optional(),
  warehouse: z.string().optional(), // Target warehouse
  schedule_date: z.string().optional(), // Expected delivery
  // Tracking
  received_qty: z.number().optional(),
  billed_qty: z.number().optional(),
  // Source
  material_request: z.string().optional(),
  material_request_item: z.string().optional(),
});

// Purchase Order Create Schema
export const PurchaseOrderCreateSchema = z.object({
  naming_series: z.literal("PUR-ORD-.YYYY.-").default("PUR-ORD-.YYYY.-"),
  supplier: z.string().min(1, "Supplier is required"),
  company: z.string().min(1),
  transaction_date: z.string(),
  schedule_date: z.string().min(1, "Expected delivery date required"),

  // Optional links
  material_request: z.string().optional(),
  project: z.string().optional(),

  // Warehouses
  set_warehouse: z.string().optional(),

  // Items
  items: z.array(PurchaseOrderItemSchema).min(1),

  // Pricing
  currency: z.string().default("ETB"),
  conversion_rate: z.number().default(1),
  buying_price_list: z.string().optional(),

  // Taxes
  taxes_and_charges: z.string().optional(),

  // Terms
  tc_name: z.string().optional(),
  terms: z.string().optional(),

  // Totals (calculated)
  total: z.number().optional(),
  net_total: z.number().optional(),
  grand_total: z.number().optional(),
});
```

---

## 4. Configuration Updates

### 4.1 DocType Config (`lib/doctype-config.ts`)

```typescript
// STOCK MODULE
"Material Request": {
  apiPath: "stock/material-request",
  module: "Stock",
  labelField: "name",
  searchFields: ["name", "material_request_type", "status"],
  defaultSortField: "creation",
  defaultSortOrder: "desc",
},
"Material Request Item": {
  apiPath: "stock/material-request-item",
  module: "Stock",
  labelField: "item_code",
  isSettings: true,
},
"Stock Entry": {
  apiPath: "stock/stock-entry",
  module: "Stock",
  labelField: "name",
  searchFields: ["name", "purpose", "work_order"],
  defaultSortField: "creation",
  defaultSortOrder: "desc",
},
"Stock Entry Detail": {
  apiPath: "stock/stock-entry-detail",
  module: "Stock",
  labelField: "item_code",
  isSettings: true,
},

// BUYING MODULE
"Purchase Order": {
  apiPath: "buying/purchase-order",
  module: "Buying",
  labelField: "name",
  searchFields: ["name", "supplier", "supplier_name"],
  defaultSortField: "creation",
  defaultSortOrder: "desc",
},
"Purchase Order Item": {
  apiPath: "buying/purchase-order-item",
  module: "Buying",
  labelField: "item_code",
  isSettings: true,
},
"Supplier": {
  apiPath: "buying/supplier",
  module: "Buying",
  labelField: "supplier_name",
  searchFields: ["name", "supplier_name", "supplier_group"],
  defaultSortField: "supplier_name",
},
```

### 4.2 Query Keys (`lib/query-keys.ts`)

```typescript
// STOCK MODULE
materialRequest: {
  all: () => ["Material Request"] as const,
  list: (options?: FrappeListOptions) => ["Material Request", "list", options] as const,
  doc: (name: string) => ["Material Request", "doc", name] as const,
  byType: (type: string) => ["Material Request", "list", "type", type] as const,
  byWorkOrder: (wo: string) => ["Material Request", "list", "work_order", wo] as const,
  pending: () => ["Material Request", "list", "pending"] as const,
},
stockEntry: {
  all: () => ["Stock Entry"] as const,
  list: (options?: FrappeListOptions) => ["Stock Entry", "list", options] as const,
  doc: (name: string) => ["Stock Entry", "doc", name] as const,
  byPurpose: (purpose: string) => ["Stock Entry", "list", "purpose", purpose] as const,
  byWorkOrder: (wo: string) => ["Stock Entry", "list", "work_order", wo] as const,
  byWarehouse: (wh: string) => ["Stock Entry", "list", "warehouse", wh] as const,
},

// BUYING MODULE
purchaseOrder: {
  all: () => ["Purchase Order"] as const,
  list: (options?: FrappeListOptions) => ["Purchase Order", "list", options] as const,
  doc: (name: string) => ["Purchase Order", "doc", name] as const,
  bySupplier: (supplier: string) => ["Purchase Order", "list", "supplier", supplier] as const,
  toReceive: () => ["Purchase Order", "list", "to_receive"] as const,
  toBill: () => ["Purchase Order", "list", "to_bill"] as const,
},
supplier: {
  all: () => ["Supplier"] as const,
  list: (options?: FrappeListOptions) => ["Supplier", "list", options] as const,
  doc: (name: string) => ["Supplier", "doc", name] as const,
},
```

---

## 5. Business Rules & Validations

### 5.1 Material Request Rules

| Rule                 | Validation                                                   |
| -------------------- | ------------------------------------------------------------ |
| **Purchase Type**    | Must have supplier info or be linked to approved vendor list |
| **Transfer Type**    | Both source and target warehouses required for each item     |
| **Issue Type**       | Source warehouse required, items must have sufficient stock  |
| **Manufacture Type** | Should link to Work Order or BOM                             |
| **Schedule Date**    | Cannot be in the past for new requests                       |

### 5.2 Stock Entry Rules

| Rule                 | Validation                                        |
| -------------------- | ------------------------------------------------- |
| **Material Receipt** | Target warehouse required for all items           |
| **Material Issue**   | Source warehouse required, sufficient stock check |
| **Transfer**         | Both warehouses required, different warehouses    |
| **Manufacture**      | Work Order required, BOM items auto-populated     |
| **Posting Date**     | Cannot post to frozen/closed periods              |

### 5.3 Purchase Order Rules

| Rule          | Validation                                           |
| ------------- | ---------------------------------------------------- |
| **Supplier**  | Must be an approved/active supplier                  |
| **Items**     | All items must be purchasable (is_purchase_item = 1) |
| **Rates**     | Must be positive, can reference Price List           |
| **Warehouse** | Required for receipt tracking                        |

---

_See Part 2 for API routes and List pages, Part 3 for Create/Detail pages._
