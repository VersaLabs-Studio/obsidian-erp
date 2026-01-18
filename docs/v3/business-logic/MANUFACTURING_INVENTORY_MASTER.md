# Pana ERP v3.0 - Manufacturing & Inventory Module

> **Version:** 1.0.0  
> **Created:** 2026-01-18  
> **Module:** Manufacturing & Inventory (Full Scale)  
> **Phase:** 2E - The Factory Floor  
> **Status:** Planning Complete

---

## Executive Summary

This is a **massive pivot** from "Production Lite" to **"Full Standard Manufacturing"**. This transforms Pana ERP from a simple tracker into a true **Enterprise Resource Planning** system.

**The Goal:** Track not just the paper, but the machine time, the labor cost, the electricity, and the exact movement of inventory through the factory floor.

### Module Scope

| Sub-Phase | Module                           | Priority    | Dependencies                 |
| --------- | -------------------------------- | ----------- | ---------------------------- |
| **E1**    | Warehouse (Inventory Locations)  | 🔴 Critical | None                         |
| **E2**    | Workstation (Machines)           | 🔴 Critical | None                         |
| **E3**    | Operation (Actions/Verbs)        | 🔴 Critical | Workstation                  |
| **E4**    | BOM (Bill of Materials - Recipe) | 🔴 Critical | Item, Operation, Workstation |
| **E5**    | Work Order (Production Command)  | 🔴 Critical | BOM, Sales Order             |
| **E6**    | Stock Entry (Inventory Movement) | 🟡 High     | Work Order, Warehouse        |

---

## 1. Entity Map & Dependencies

### Core DocTypes

| **DocType**       | **Role**            | **Dependency**               | **Printing/Job Shop Context**                               |
| ----------------- | ------------------- | ---------------------------- | ----------------------------------------------------------- |
| **Warehouse**     | Storage Locations   | Independent                  | Raw Material Store, WIP, Finished Goods                     |
| **Workstation**   | The Machines        | Independent                  | "Offset Printer A", "Cutting Machine", "Laminator"          |
| **Operation**     | The Actions (Verbs) | Workstation                  | "Printing", "Cutting", "Binding", "Laminating"              |
| **BOM**           | The Recipe          | Item, Operation, Workstation | Defines "1000 Flyers" = "2 Reams Paper" + "1 Hour Printing" |
| **BOM Item**      | Raw Materials       | BOM (Child Table)            | Paper, Ink, Binding materials                               |
| **BOM Operation** | Production Steps    | BOM (Child Table)            | Printing step, Cutting step                                 |
| **Work Order**    | Production Command  | BOM, Sales Order             | "Make 5000 units by Tuesday"                                |
| **Stock Entry**   | Inventory Movement  | Work Order, Warehouse        | Material Transfer, Manufacture                              |

### Warehouse Structure (Required Setup)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WAREHOUSE HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   📦 All Warehouses (Root)                                                  │
│   ├── 📦 Raw Material Store                                                 │
│   │   └── Where paper, ink, and supplies live                              │
│   │                                                                        │
│   ├── 🏭 Work In Progress (WIP)                                            │
│   │   └── The "Black Hole" - materials being worked on                     │
│   │                                                                        │
│   └── ✅ Finished Goods Store                                              │
│       └── Completed jobs waiting for delivery                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Business Workflow Logic

### A. Infrastructure Setup (Prerequisites)

**Before production can begin, map the factory floor:**

1. **Warehouses** - Define the inventory flow locations
2. **Workstations** - Map physical machines with hour rates
3. **Operations** - Define production verbs (actions)

### B. The Engineering Phase (BOM Creation)

**Trigger:** A new Standard Product is defined OR a Custom Job is planned.

**BOM Structure:**

- **Header:** Select the Item to be produced (Finished Good)
- **Materials (Child Table):** Raw Materials with quantities
- **Scrap:** Define standard waste (e.g., 5% paper cuts)
- **Operations (Child Table):** Production steps with time estimates

**Costing Logic:**

```
Total Cost = Raw Material Cost + Operating Cost
Raw Material Cost = Σ (Material Qty × Valuation Rate)
Operating Cost = Σ (Operation Time × Workstation Hour Rate)
```

### C. Production Control (Work Order)

**Trigger:** Sales Order is confirmed OR building inventory stock.

**Work Order Flow:**

1. **Creation:** From Sales Order or Manual
2. **BOM Selection:** System fetches default BOM for the Item
3. **Quantity:** Inherited from Sales Order or manually entered
4. **Material Check:** UI shows availability status

**Material Availability Indicator:**

```
┌──────────────────────────────────────────────────────┐
│  MATERIAL AVAILABILITY                               │
├──────────────────────────────────────────────────────┤
│  🟢 Paper A4 80gsm    Required: 500   In Stock: 800  │
│  🔴 Ink Black         Required: 2L    In Stock: 0.5L │
│  🟢 Binding Glue      Required: 100g  In Stock: 500g │
│                                                       │
│  ⚠️ Insufficient materials! Purchase needed.         │
└──────────────────────────────────────────────────────┘
```

**Status Flow:**

```
Not Started → In Process → Completed
     ↓            ↓            ↓
   (Start)    (Finish)     (Done)
```

### D. The Execution (Shop Floor)

**Two Critical Stock Movements:**

#### 1. Start Production (Material Transfer)

```
Action: Operator clicks "Start"
System: Creates Stock Entry (Type: Material Transfer for Manufacture)
Movement: Raw Material Store → WIP Warehouse
Result: Storekeeper no longer has the paper; Machine Operator has it
```

#### 2. Finish Production (Manufacture)

```
Action: Operator clicks "Finish"
System: Creates Stock Entry (Type: Manufacture)
Movement: WIP items consumed → Finished Item created in Finished Goods
Result: Product cost is locked in at this moment
```

---

## 3. DocType Field Specifications

### Warehouse Fields

| Field              | Type             | Required | Description                               |
| ------------------ | ---------------- | -------- | ----------------------------------------- |
| `warehouse_name`   | Data             | ✅       | Display name (e.g., "Raw Material Store") |
| `parent_warehouse` | Link (Warehouse) | ❌       | For tree hierarchy                        |
| `is_group`         | Check            | ❌       | Is parent container?                      |
| `warehouse_type`   | Data             | ❌       | Classification                            |
| `company`          | Link (Company)   | ✅       | Owning company                            |
| `disabled`         | Check            | ❌       | Active status                             |

### Workstation Fields

| Field                   | Type     | Required | Description                             |
| ----------------------- | -------- | -------- | --------------------------------------- |
| `workstation_name`      | Data     | ✅       | Machine name (e.g., "Offset Printer A") |
| `workstation_type`      | Data     | ❌       | Classification                          |
| `hour_rate`             | Currency | ✅       | Total operating cost per hour           |
| `hour_rate_labour`      | Currency | ❌       | Labor component                         |
| `hour_rate_electricity` | Currency | ❌       | Power component                         |
| `hour_rate_consumable`  | Currency | ❌       | Consumables component                   |
| `hour_rate_rent`        | Currency | ❌       | Machine rental/depreciation             |
| `working_hours`         | Table    | ❌       | Availability schedule                   |
| `description`           | Text     | ❌       | Notes                                   |

### Operation Fields

| Field                  | Type               | Required | Description             |
| ---------------------- | ------------------ | -------- | ----------------------- |
| `name`                 | Data               | ✅       | Operation ID (auto)     |
| `workstation`          | Link (Workstation) | ❌       | Default workstation     |
| `description`          | Text               | ❌       | Detailed instructions   |
| `total_operation_time` | Float              | ❌       | Standard time (minutes) |

### BOM Fields

| Field               | Type                   | Required  | Description                |
| ------------------- | ---------------------- | --------- | -------------------------- |
| `item`              | Link (Item)            | ✅        | Product to manufacture     |
| `item_name`         | Data                   | Read Only | Fetched from Item          |
| `quantity`          | Float                  | ✅        | Batch size (e.g., 1000)    |
| `uom`               | Link (UOM)             | ✅        | Unit of measure            |
| `is_active`         | Check                  | ❌        | Active for use             |
| `is_default`        | Check                  | ❌        | Default BOM for Item       |
| `with_operations`   | Check                  | ❌        | Include operations costing |
| `items`             | Table (BOM Item)       | ✅        | Raw materials              |
| `operations`        | Table (BOM Operation)  | ❌        | Production steps           |
| `scrap_items`       | Table (BOM Scrap Item) | ❌        | Waste materials            |
| `raw_material_cost` | Currency               | Read Only | Calculated                 |
| `operating_cost`    | Currency               | Read Only | Calculated                 |
| `total_cost`        | Currency               | Read Only | Calculated                 |
| `company`           | Link (Company)         | ✅        | Owning company             |
| `currency`          | Link (Currency)        | ❌        | Costing currency           |

### Work Order Fields

| Field                    | Type                    | Required  | Description                                            |
| ------------------------ | ----------------------- | --------- | ------------------------------------------------------ |
| `naming_series`          | Select                  | ✅        | MFG-WO-.YYYY.-                                         |
| `status`                 | Select                  | ✅        | Not Started, In Process, Completed, Stopped, Cancelled |
| `production_item`        | Link (Item)             | ✅        | Item to produce                                        |
| `item_name`              | Data                    | Read Only | Fetched from Item                                      |
| `bom_no`                 | Link (BOM)              | ✅        | Recipe to use                                          |
| `qty`                    | Float                   | ✅        | Quantity to produce                                    |
| `produced_qty`           | Float                   | Read Only | Amount completed                                       |
| `sales_order`            | Link (Sales Order)      | ❌        | Source order                                           |
| `project`                | Link (Project)          | ❌        | Related project                                        |
| `wip_warehouse`          | Link (Warehouse)        | ✅        | Work in progress location                              |
| `fg_warehouse`           | Link (Warehouse)        | ✅        | Finished goods destination                             |
| `source_warehouse`       | Link (Warehouse)        | ❌        | Raw material source                                    |
| `company`                | Link (Company)          | ✅        | Owning company                                         |
| `planned_start_date`     | Datetime                | ❌        | Planned start                                          |
| `planned_end_date`       | Datetime                | ❌        | Planned completion                                     |
| `actual_start_date`      | Datetime                | Read Only | When started                                           |
| `actual_end_date`        | Datetime                | Read Only | When completed                                         |
| `expected_delivery_date` | Date                    | ❌        | Deadline                                               |
| `required_items`         | Table (Work Order Item) | Read Only | Fetched from BOM                                       |

### Stock Entry Fields

| Field                  | Type                       | Required  | Description                                                            |
| ---------------------- | -------------------------- | --------- | ---------------------------------------------------------------------- |
| `naming_series`        | Select                     | ✅        | MAT-STE-.YYYY.-                                                        |
| `stock_entry_type`     | Link                       | ✅        | Entry type                                                             |
| `purpose`              | Select                     | ✅        | Material Issue, Material Receipt, Material Transfer, Manufacture, etc. |
| `work_order`           | Link (Work Order)          | ❌        | Related production order                                               |
| `bom_no`               | Link (BOM)                 | ❌        | Recipe reference                                                       |
| `from_warehouse`       | Link (Warehouse)           | ❌        | Source location                                                        |
| `to_warehouse`         | Link (Warehouse)           | ❌        | Destination location                                                   |
| `items`                | Table (Stock Entry Detail) | ✅        | Line items                                                             |
| `posting_date`         | Date                       | ✅        | Transaction date                                                       |
| `posting_time`         | Time                       | ❌        | Transaction time                                                       |
| `company`              | Link (Company)             | ✅        | Owning company                                                         |
| `total_incoming_value` | Currency                   | Read Only | Value added                                                            |
| `total_outgoing_value` | Currency                   | Read Only | Value removed                                                          |

---

## 4. Implementation Phases

### Phase E1: Warehouse Module

- **Priority:** 🔴 Critical (Foundation)
- **Path:** `app/stock/warehouse/`
- **Depends On:** None

### Phase E2: Workstation Module

- **Priority:** 🔴 Critical (Foundation)
- **Path:** `app/manufacturing/workstation/`
- **Depends On:** None

### Phase E3: Operation Module

- **Priority:** 🔴 Critical (Foundation)
- **Path:** `app/manufacturing/operation/`
- **Depends On:** Workstation (for default assignment)

### Phase E4: BOM Module

- **Priority:** 🔴 Critical (Core)
- **Path:** `app/manufacturing/bom/`
- **Depends On:** Item, Operation, Workstation

### Phase E5: Work Order Module

- **Priority:** 🔴 Critical (Core)
- **Path:** `app/manufacturing/work-order/`
- **Depends On:** BOM, Sales Order, Warehouse

### Phase E6: Stock Entry Module

- **Priority:** 🟡 High (Execution)
- **Path:** `app/stock/stock-entry/`
- **Depends On:** Work Order, Warehouse, Item

---

## 5. Sidebar Navigation (v3.0)

**Remove all v2 menu items and replace with v3 structure:**

```typescript
// NEW v3.0 Navigation Structure
const navigation = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
    items: [],
  },
  {
    title: "CRM",
    icon: Users,
    items: [
      { title: "Dashboard", href: "/crm", icon: LayoutDashboard },
      { title: "Leads", href: "/crm/lead", icon: Target },
      { title: "Customers", href: "/crm/customer", icon: Users },
      { title: "Contacts", href: "/crm/contact", icon: User },
      { title: "Addresses", href: "/crm/address", icon: MapPin },
      { title: "Settings", href: "/crm/settings", icon: Settings },
    ],
  },
  {
    title: "Sales",
    icon: FileText,
    items: [
      { title: "Quotations", href: "/sales/quotation", icon: FileText },
      {
        title: "Sales Orders",
        href: "/sales/sales-order",
        icon: ClipboardList,
      },
      { title: "Settings", href: "/sales/settings", icon: Settings },
    ],
  },
  {
    title: "Inventory",
    icon: Package,
    items: [
      { title: "Items", href: "/stock/item", icon: Box },
      { title: "Warehouses", href: "/stock/warehouse", icon: Warehouse },
      {
        title: "Stock Entries",
        href: "/stock/stock-entry",
        icon: ArrowRightLeft,
      },
      { title: "Stock Balance", href: "/stock/balance", icon: Scale },
      { title: "Settings", href: "/stock/settings", icon: Settings },
    ],
  },
  {
    title: "Manufacturing",
    icon: Factory,
    items: [
      {
        title: "Work Orders",
        href: "/manufacturing/work-order",
        icon: ClipboardList,
      },
      { title: "Bill of Materials", href: "/manufacturing/bom", icon: Layers },
      { title: "Workstations", href: "/manufacturing/workstation", icon: Cpu },
      { title: "Operations", href: "/manufacturing/operation", icon: Cog },
      { title: "Settings", href: "/manufacturing/settings", icon: Settings },
    ],
  },
  {
    title: "Purchasing",
    icon: ShoppingCart,
    items: [
      {
        title: "Purchase Orders",
        href: "/purchasing/purchase-order",
        icon: FileText,
      },
      { title: "Suppliers", href: "/purchasing/supplier", icon: Truck },
      { title: "Settings", href: "/purchasing/settings", icon: Settings },
    ],
  },
  {
    title: "Accounting",
    icon: Calculator,
    items: [
      {
        title: "Dashboard",
        href: "/accounting/dashboard",
        icon: LayoutDashboard,
      },
      { title: "Payments", href: "/accounting/payments", icon: CreditCard },
      { title: "Settings", href: "/accounting/settings", icon: Settings },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/reports",
    items: [],
  },
];
```

---

## 6. Testing Checklist

### Phase E1: Warehouse

- [ ] Create parent warehouse "All Warehouses"
- [ ] Create "Raw Material Store" under parent
- [ ] Create "Work In Progress" under parent
- [ ] Create "Finished Goods" under parent
- [ ] Verify tree structure displays correctly
- [ ] Edit warehouse
- [ ] Disable warehouse

### Phase E2: Workstation

- [ ] Create workstation "Offset Printer A" with hour_rate = 50
- [ ] Create workstation "Cutting Machine" with hour_rate = 30
- [ ] Verify hour rate displays correctly
- [ ] Edit workstation
- [ ] Delete unused workstation

### Phase E3: Operation

- [ ] Create operation "Printing" linked to "Offset Printer A"
- [ ] Create operation "Cutting" linked to "Cutting Machine"
- [ ] Verify workstation auto-populates rates

### Phase E4: BOM

- [ ] Create BOM for Service Item "1000 Flyers"
- [ ] Add raw materials (Paper, Ink)
- [ ] Add operations (Printing, Cutting)
- [ ] Verify cost calculations
- [ ] Set as default BOM for item
- [ ] Copy BOM functionality

### Phase E5: Work Order

- [ ] Create Work Order from Sales Order
- [ ] Create manual Work Order
- [ ] Verify material availability indicator
- [ ] Start production (create Stock Entry)
- [ ] Finish production (create Stock Entry)
- [ ] View production progress

### Phase E6: Stock Entry

- [ ] Create Material Transfer entry
- [ ] Create Manufacture entry
- [ ] Verify stock levels update
- [ ] Verify valuation calculations

---

_This master document guides the implementation of the Full Manufacturing & Inventory module for Pana ERP v3.0._
