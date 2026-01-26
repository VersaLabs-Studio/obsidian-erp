# Phase F: Delivery Note & Logistics Module - Part 1

> **Version:** 1.0.0  
> **Module:** Stock / Logistics  
> **DocTypes:** Delivery Note, Driver, Vehicle, Address  
> **Priority:** 🔴 Critical (Last Mile Delivery)  
> **Dependencies:** Sales Order, Customer, Item, Warehouse

---

## Overview

The **Delivery Note (DN)** is the "Last Mile" of the physical workflow. In printing businesses and manufacturing, it's often MORE important than the invoice because it serves as:

1. **Proof of Delivery (POD)** - Legal evidence goods were received
2. **Gate Pass** - Security control for goods leaving premises
3. **Stock Deduction Trigger** - Actually removes inventory from warehouse
4. **Invoice Prerequisite** - You can only bill what you've delivered

### The Delivery Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DELIVERY WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRODUCTION COMPLETE                                                        │
│  ──────────────────                                                         │
│  Work Order (Completed) → Stock in FG Warehouse                            │
│                                                                             │
│  TRIGGER DELIVERY                                                           │
│  ────────────────                                                           │
│  Sales Order → "Create Delivery Note" → Pre-filled DN Form                 │
│                    │                                                        │
│                    ▼                                                        │
│             ┌─────────────────────────────────────────┐                    │
│             │           DELIVERY NOTE                  │                    │
│             │  • Customer & Addresses                  │                    │
│             │  • Items from SO (qty editable)          │                    │
│             │  • Driver + Vehicle + Transporter        │                    │
│             │  • Source Warehouse (FG Store)           │                    │
│             └──────────────────┬──────────────────────┘                    │
│                                │                                            │
│                         SUBMIT (docstatus=1)                               │
│                                │                                            │
│                    ┌───────────┴───────────┐                               │
│                    ▼                       ▼                               │
│             ┌──────────────┐      ┌──────────────────┐                    │
│             │Stock Ledger  │      │ Status: "To Bill"│                    │
│             │ -Qty from WH │      │ Ready for Invoice│                    │
│             └──────────────┘      └──────────────────┘                    │
│                                            │                               │
│                                     Create Invoice                         │
│                                            │                               │
│                                   ┌────────▼────────┐                     │
│                                   │Status: Completed│                     │
│                                   └─────────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Status Lifecycle

```
┌───────────┐    Submit    ┌───────────┐   Invoice    ┌───────────┐
│   Draft   │ ──────────▶  │  To Bill  │ ──────────▶  │ Completed │
└───────────┘              └───────────┘              └───────────┘
                                │
                                │ Return
                                ▼
                         ┌──────────────┐
                         │    Return    │ (is_return=1)
                         └──────────────┘
```

### Status Definitions

| Status            | Color  | Description                  | Actions              |
| ----------------- | ------ | ---------------------------- | -------------------- |
| **Draft**         | Gray   | Being prepared               | Edit, Delete, Submit |
| **To Bill**       | Amber  | Delivered, pending invoice   | Create Invoice       |
| **Completed**     | Green  | Fully invoiced               | View only            |
| **Return**        | Red    | Returned goods (is_return=1) | View only            |
| **Return Issued** | Orange | DN has returns against it    | View only            |
| **Cancelled**     | Gray   | Voided                       | View only            |
| **Closed**        | Gray   | Manually closed              | View only            |

---

## 2. Entity Map & Dependencies

| DocType                         | Role             | Dependency            | Usage                  |
| ------------------------------- | ---------------- | --------------------- | ---------------------- |
| **Delivery Note**               | The Gate Pass    | Sales Order, Customer | Deducts stock, POD     |
| **Delivery Note Item**          | The Contents     | Item                  | Child table            |
| **Driver**                      | The Carrier      | Independent           | Security: Who took it? |
| **Vehicle**                     | The Truck        | Independent           | Plate number tracking  |
| **Supplier (is_transporter=1)** | The Logistics Co | Independent           | "DHL", "In-House"      |
| **Address**                     | Destinations     | Customer              | Shipping vs Billing    |

---

## 3. Field Specification

### 3.1 Delivery Note (Main DocType)

```typescript
// From generated types - Key fields for implementation
interface DeliveryNote {
  // Core
  naming_series: "MAT-DN-.YYYY.-" | "MAT-DN-RET-.YYYY.-";
  customer: string; // Required - Link to Customer
  posting_date: string; // Required - Delivery date
  posting_time: string; // Required
  company: string; // Required

  // Status
  status:
    | "Draft"
    | "To Bill"
    | "Completed"
    | "Return"
    | "Return Issued"
    | "Cancelled"
    | "Closed";
  docstatus: 0 | 1 | 2;

  // Items
  items: DeliveryNoteItem[]; // Required - What's being delivered
  set_warehouse?: string; // Default source warehouse for all items

  // Addressing (CRITICAL for logistics)
  shipping_address_name?: string; // Where goods go (Link: Address)
  shipping_address?: string; // Display text
  dispatch_address_name?: string; // Our warehouse location
  dispatch_address?: string; // Display text
  customer_address?: string; // Billing address (Link: Address)

  // Logistics (Security & Traceability)
  transporter?: string; // Link: Supplier (is_transporter=1)
  transporter_name?: string; // Auto-fetched
  driver?: string; // Link: Driver
  driver_name?: string; // Auto-fetched
  vehicle_no?: string; // License plate
  lr_no?: string; // Transport Receipt / Gate Pass No
  lr_date?: string; // Receipt date

  // Returns
  is_return?: 0 | 1; // Is this a return DN?
  return_against?: string; // Original DN being returned

  // Financials (hidden on Gate Pass)
  grand_total?: number;
  total?: number;

  // Print settings
  print_without_amount?: 0 | 1; // CRITICAL: For Gate Pass printing

  // Reference
  po_no?: string; // Customer's PO number
  project?: string; // Link: Project
}
```

### 3.2 Delivery Note Item (Child Table)

```typescript
interface DeliveryNoteItem {
  item_code: string; // Required
  item_name?: string; // Auto-fetched
  description?: string;
  qty: number; // Required - Editable for partial delivery
  uom?: string;
  rate?: number;
  amount?: number; // qty * rate
  warehouse?: string; // Source warehouse (FG Store)

  // From Sales Order
  against_sales_order?: string;
  so_detail?: string; // SO Item row name

  // Batch/Serial
  batch_no?: string;
  serial_no?: string;
}
```

### 3.3 Driver (Utility DocType)

```typescript
interface Driver {
  full_name: string; // Required
  status?: "Active" | "Left";
  // Employee link (optional)
  employee?: string;
  // License info
  license_number?: string;
  issuing_date?: string;
  expiry_date?: string;
  // Contact
  cell_number?: string;
  // Tracking
  transporter?: string; // Which logistics company
}
```

### 3.4 Vehicle (Utility DocType)

```typescript
interface Vehicle {
  license_plate: string; // Required - The plate number
  make?: string; // e.g., "Toyota"
  model?: string; // e.g., "Hilux"
  fuel_type?: "Petrol" | "Diesel" | "Natural Gas" | "Electric";
  // Ownership
  acquisition_date?: string;
  location?: string; // Current location
  // Insurance
  insurance_company?: string;
  policy_no?: string;
  last_carbon_check?: string;
}
```

---

## 4. Configuration Updates

### 4.1 DocType Config (`lib/doctype-config.ts`)

```typescript
// STOCK MODULE - LOGISTICS
"Delivery Note": {
  apiPath: "stock/delivery-note",
  module: "Stock",
  labelField: "name",
  searchFields: ["name", "customer", "customer_name", "status"],
  defaultSortField: "posting_date",
  defaultSortOrder: "desc",
},
"Delivery Note Item": {
  apiPath: "stock/delivery-note-item",
  module: "Stock",
  labelField: "item_code",
  isSettings: true,
},

// LOGISTICS UTILITIES
Driver: {
  apiPath: "stock/setup/driver",
  module: "Stock",
  labelField: "full_name",
  searchFields: ["full_name", "cell_number", "license_number"],
  isSettings: true,
},
Vehicle: {
  apiPath: "stock/setup/vehicle",
  module: "Stock",
  labelField: "license_plate",
  searchFields: ["license_plate", "make", "model"],
  isSettings: true,
},
```

### 4.2 Query Keys (`lib/query-keys.ts`)

```typescript
// DELIVERY & LOGISTICS
deliveryNote: {
  all: () => ["Delivery Note"] as const,
  list: (options?: FrappeListOptions) => ["Delivery Note", "list", options] as const,
  doc: (name: string) => ["Delivery Note", "doc", name] as const,
  byCustomer: (customer: string) => ["Delivery Note", "list", "customer", customer] as const,
  byStatus: (status: string) => ["Delivery Note", "list", "status", status] as const,
  bySalesOrder: (so: string) => ["Delivery Note", "list", "sales_order", so] as const,
  pendingBilling: () => ["Delivery Note", "list", "to_bill"] as const,
},
driver: {
  all: () => ["Driver"] as const,
  list: (options?: FrappeListOptions) => ["Driver", "list", options] as const,
  doc: (name: string) => ["Driver", "doc", name] as const,
  active: () => ["Driver", "list", "active"] as const,
},
vehicle: {
  all: () => ["Vehicle"] as const,
  list: (options?: FrappeListOptions) => ["Vehicle", "list", options] as const,
  doc: (name: string) => ["Vehicle", "doc", name] as const,
},
// Transporter uses Supplier with is_transporter filter
```

---

## 5. Schemas

Add to `lib/schemas/doctype-schemas.ts`:

```typescript
// ============================================================================
// DELIVERY NOTE SCHEMAS
// ============================================================================

// Delivery Note Item (Child Table)
export const DeliveryNoteItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.number().min(0.001, "Quantity must be greater than 0"),
  uom: z.string().optional(),
  rate: z.number().min(0).optional(),
  amount: z.number().optional(),
  warehouse: z.string().optional(),
  against_sales_order: z.string().optional(),
  so_detail: z.string().optional(),
  batch_no: z.string().optional(),
  serial_no: z.string().optional(),
});

// Delivery Note Create Schema
export const DeliveryNoteCreateSchema = z.object({
  naming_series: z
    .enum(["MAT-DN-.YYYY.-", "MAT-DN-RET-.YYYY.-"])
    .default("MAT-DN-.YYYY.-"),
  customer: z.string().min(1, "Customer is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  posting_time: z.string().optional(),
  company: z.string().min(1, "Company is required"),

  // Items
  items: z.array(DeliveryNoteItemSchema).min(1, "At least one item required"),
  set_warehouse: z.string().optional(),

  // Addressing
  shipping_address_name: z.string().optional(),
  dispatch_address_name: z.string().optional(),
  customer_address: z.string().optional(),

  // Logistics
  transporter: z.string().optional(),
  driver: z.string().optional(),
  vehicle_no: z.string().optional(),
  lr_no: z.string().optional(),
  lr_date: z.string().optional(),

  // Returns
  is_return: z.union([z.literal(0), z.literal(1)]).optional(),
  return_against: z.string().optional(),

  // Settings
  print_without_amount: z.union([z.literal(0), z.literal(1)]).default(1),

  // Pricing (auto-calculated)
  currency: z.string().default("ETB"),
  conversion_rate: z.number().default(1),
  selling_price_list: z.string().optional(),
  price_list_currency: z.string().optional(),
  plc_conversion_rate: z.number().optional(),

  // Reference
  po_no: z.string().optional(),
  project: z.string().optional(),
});

export const DeliveryNoteUpdateSchema = DeliveryNoteCreateSchema.partial();
export type DeliveryNoteFormData = z.input<typeof DeliveryNoteCreateSchema>;
export type DeliveryNoteItemData = z.input<typeof DeliveryNoteItemSchema>;

// ============================================================================
// DRIVER SCHEMAS
// ============================================================================

export const DriverCreateSchema = z.object({
  full_name: z.string().min(1, "Driver name is required"),
  status: z.enum(["Active", "Left"]).default("Active"),
  employee: z.string().optional(),
  license_number: z.string().optional(),
  issuing_date: z.string().optional(),
  expiry_date: z.string().optional(),
  cell_number: z.string().optional(),
  transporter: z.string().optional(),
});

export const DriverUpdateSchema = DriverCreateSchema.partial();
export type DriverFormData = z.input<typeof DriverCreateSchema>;

// ============================================================================
// VEHICLE SCHEMAS
// ============================================================================

export const VehicleCreateSchema = z.object({
  license_plate: z.string().min(1, "License plate is required"),
  make: z.string().optional(),
  model: z.string().optional(),
  fuel_type: z.enum(["Petrol", "Diesel", "Natural Gas", "Electric"]).optional(),
  acquisition_date: z.string().optional(),
  location: z.string().optional(),
  insurance_company: z.string().optional(),
  policy_no: z.string().optional(),
});

export const VehicleUpdateSchema = VehicleCreateSchema.partial();
export type VehicleFormData = z.input<typeof VehicleCreateSchema>;
```

---

## 6. Business Rules

### 6.1 Frontend Validations (STRICT)

| Rule                      | Validation                                          | User Feedback                                                       |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| **Negative Stock Check**  | Before submit: Check if warehouse has qty available | "Insufficient stock in {warehouse}. Available: {x}, Requested: {y}" |
| **Over-Delivery Warning** | If DN qty > SO pending qty                          | Warning: "You are delivering more than ordered. Continue?"          |
| **Warehouse Required**    | Each item must have a source warehouse              | "Source warehouse required for {item}"                              |
| **Customer Required**     | Cannot save without customer                        | "Customer is required"                                              |
| **Address Validation**    | Shipping address should exist                       | Soft warning if blank                                               |

### 6.2 Status Transitions

| Current | Action         | Result                          |
| ------- | -------------- | ------------------------------- |
| Draft   | Submit         | To Bill                         |
| Draft   | Delete         | Removed                         |
| To Bill | Create Invoice | Completed (when fully invoiced) |
| To Bill | Create Return  | Return DN created               |
| Any     | Cancel         | Cancelled (stock reversed)      |

### 6.3 The "Pull" Logic

When creating DN from Sales Order:

1. Fetch SO items with pending quantities
2. Calculate `pending_qty = ordered_qty - delivered_qty`
3. Pre-fill DN items with pending quantities
4. User can adjust qty for partial delivery
5. After submit, SO status updates to "Partially Delivered" or "Completed"

---

## 7. Gate Pass Feature

The Gate Pass is a **print-friendly** version of the Delivery Note that:

- **HIDES** all prices (rates, amounts, totals)
- **SHOWS** items, quantities, driver, vehicle, customer
- Used by security guards and drivers

### Implementation

```typescript
// In DN detail page
const handlePrintGatePass = () => {
  // Open print preview with print_without_amount = 1
  window.open(
    `${frappeUrl}/api/method/frappe.utils.print_format.download_pdf?` +
      `doctype=Delivery%20Note&name=${encodeURIComponent(dnName)}` +
      `&format=Gate%20Pass&no_letterhead=0`,
    "_blank",
  );
};

// OR use a custom modal that renders items without prices
```

---

_See Part 2 for API routes and Client pages_
