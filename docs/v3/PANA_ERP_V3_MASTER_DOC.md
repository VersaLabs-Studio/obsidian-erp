# Pana ERP v3.0 - Master Documentation

> **Version:** 3.0.0 MVP  
> **Last Updated:** 2026-01-27  
> **Status:** PRODUCTION READY  
> **First Client:** Pana Promotion (Printing Company)  
> **Architecture Philosophy:** Schema-First, Factory Pattern, ERPNext Standard DocTypes Only

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Abstract Business Workflow](#3-abstract-business-workflow)
4. [Completed Modules](#4-completed-modules)
5. [Module Integration Map](#5-module-integration-map)
6. [Technology Stack](#6-technology-stack)
7. [Future Roadmap (v3.1+)](#7-future-roadmap-v31)
8. [Appendix: Quick Reference](#appendix-quick-reference)

---

## 1. Executive Summary

### 1.1 What is Pana ERP?

Pana ERP v3.0 is a **complete Enterprise Resource Planning** system tailored for **Make-to-Order manufacturing businesses**, specifically the printing and promotions industry. Built as a **SaaS-ready** Next.js frontend that connects to the **ERPNext (Frappe)** backend, it provides:

- **Full CRM:** Lead → Customer conversion with address/contact management
- **Complete Sales Cycle:** Quotation → Sales Order workflow
- **Production Management:** BOM → Work Order → Stock Entry (Manufacture)
- **Inventory Control:** Warehouses, Material Requests, Stock Entries, Delivery Notes
- **Accounting & Finance:** Sales/Purchase Invoices, Payment Entry, Journal Entry, Chart of Accounts

### 1.2 Core Design Principles

| Principle                   | Description                                                   |
| --------------------------- | ------------------------------------------------------------- |
| **Zero Custom Fields**      | Uses 100% standard ERPNext DocTypes for upgrade compatibility |
| **Schema-First**            | All types auto-generated from Frappe metadata                 |
| **Factory Pattern**         | Generic hooks/API handlers reduce boilerplate by 70%+         |
| **Premium UI**              | Dual-theme (light/dark), responsive, "Big Tech" aesthetic     |
| **Printing Industry Focus** | Workflows designed for job shop/make-to-order operations      |

### 1.3 First Client Profile

**Company:** Pana Promotion  
**Industry:** Printing & Promotional Materials  
**Business Model:** Make-to-Order (custom print jobs)  
**Key Workflows:**

- Customer inquiries converted to formal quotations
- Technical specs captured in item description fields
- Job-based manufacturing with raw material tracking
- Delivery with gate pass printing
- Invoice and payment collection

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PANA ERP v3.0 ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         NEXT.JS FRONTEND                            │   │
│   │  • App Router (15.x)  • React Query  • React Hook Form  • Zod       │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │                                       │
│                              REST API Calls                                  │
│                                      │                                       │
│   ┌──────────────────────────────────▼──────────────────────────────────┐   │
│   │                         NEXT.JS API ROUTES                           │   │
│   │           /api/{module}/{doctype}/route.ts                          │   │
│   │           Factory Pattern: createListHandler, createGetHandler...   │   │
│   └──────────────────────────────────┬──────────────────────────────────┘   │
│                                      │                                       │
│                           Frappe JS SDK                                     │
│                                      │                                       │
│   ┌──────────────────────────────────▼──────────────────────────────────┐   │
│   │                         ERPNEXT BACKEND                              │   │
│   │  • Frappe Framework v15  • MariaDB  • Standard DocTypes Only        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Schema-First Flow

```
Frappe DocType ──► generate-types.js ──► TypeScript Interfaces + Zod Schemas
                                                    │
                                                    ▼
                      ┌─────────────────────────────────────────┐
                      │  Centralized Config + Query Key Factory  │
                      └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                      ┌─────────────────────────────────────────┐
                      │       Generic Hooks (useFrappeList...)   │
                      └─────────────────────────────────────────┘
                                                    │
                                                    ▼
                      ┌─────────────────────────────────────────┐
                      │              UI Components               │
                      └─────────────────────────────────────────┘
```

### 2.3 Key Configuration Files

| File                             | Purpose                                                |
| -------------------------------- | ------------------------------------------------------ |
| `lib/doctype-config.ts`          | DocType registry with API paths, labels, search fields |
| `lib/query-keys.ts`              | React Query cache key factory                          |
| `lib/schemas/doctype-schemas.ts` | Generated Zod validation schemas                       |
| `types/doctype-types.ts`         | Generated TypeScript interfaces                        |
| `lib/api-factory.ts`             | Factory functions for API route handlers               |

---

## 3. Abstract Business Workflow

This is the **master workflow** that the entire v3.0 system is built around. Every module implements a piece of this flow.

### 3.1 The Complete Value Stream

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PANA ERP v3.0 COMPLETE WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌──────────────────┐                                                                       │
│  │      CRM         │                                                                       │
│  │   Lead → Opp     │                                                                       │
│  └────────┬─────────┘                                                                       │
│           ▼                                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐                    │
│  │    QUOTATION     │ ──► │   SALES ORDER    │ ──► │   WORK ORDER     │                    │
│  │   (Price Quote)  │     │   (Confirmation) │     │   (Production)   │                    │
│  └──────────────────┘     └────────┬─────────┘     └────────┬─────────┘                    │
│                                    │                        │                               │
│           ┌────────────────────────┴────────────────────────┘                               │
│           │                                                                                 │
│           │           ┌─────────────────────────────────────────────────┐                   │
│           │           │              MANUFACTURING                       │                   │
│           ▼           │  ┌────────────┐     ┌────────────┐              │                   │
│  ┌─────────────────┐  │  │Material Req│ ──► │Stock Entry │              │                   │
│  │MATERIAL REQUEST │──│  │(Get Raw Mat)│     │(Transfer)  │              │                   │
│  │   (Purchase)    │  │  └────────────┘     └─────┬──────┘              │                   │
│  └────────┬────────┘  │                           │                     │                   │
│           │           │                           ▼                     │                   │
│           ▼           │                    ┌────────────┐               │                   │
│  ┌─────────────────┐  │                    │   WIP      │               │                   │
│  │ PURCHASE ORDER  │  │                    │ Production │               │                   │
│  │  (From Vendor)  │  │                    └─────┬──────┘               │                   │
│  └────────┬────────┘  │                          │                      │                   │
│           │           │                          ▼                      │                   │
│           ▼           │                    ┌────────────┐               │                   │
│  ┌─────────────────┐  │                    │Stock Entry │               │                   │
│  │ PURCHASE INVOICE│  │                    │(Manufacture)│              │                   │
│  │  (Vendor Bill)  │  │                    └─────┬──────┘               │                   │
│  └────────┬────────┘  │                          │                      │                   │
│           │           └──────────────────────────┼──────────────────────┘                   │
│           │                                      │                                          │
│           ▼                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐               │
│  │                        FINISHED GOODS WAREHOUSE                          │               │
│  └─────────────────────────────────────┬───────────────────────────────────┘               │
│                                        │                                                    │
│                                        ▼                                                    │
│                               ┌─────────────────┐                                          │
│                               │  DELIVERY NOTE  │                                          │
│                               │   (Ship Goods)  │                                          │
│                               └────────┬────────┘                                          │
│                                        │                                                    │
│                                        ▼                                                    │
│                               ┌─────────────────┐                                          │
│                               │ SALES INVOICE   │ ◄─── Accounts Receivable                 │
│                               │   (Bill Cust)   │                                          │
│                               └────────┬────────┘                                          │
│                                        │                                                    │
│                                        ▼                                                    │
│                               ┌─────────────────┐                                          │
│                               │ PAYMENT ENTRY   │ ◄─── Cash Management                     │
│                               │  (Collect $$$)  │                                          │
│                               └─────────────────┘                                          │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              GENERAL LEDGER                                            │ │
│  │                    All transactions post to GL automatically                          │ │
│  └───────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Phase-by-Phase Breakdown

#### **Phase 1: The Front Office (CRM)**

**Objective:** Capture leads and convert to paying customers.

| Stage         | DocType      | Action                                                   |
| ------------- | ------------ | -------------------------------------------------------- |
| Inquiry       | Lead         | Person calls/walks in with a question                    |
| Qualification | Lead Status  | Open → Replied → Interested                              |
| Conversion    | Customer     | Lead promoted to Customer with address/contact           |
| Data Anchor   | Customer Hub | Customer becomes the central entity for all transactions |

#### **Phase 2: The Sales Cycle**

**Objective:** Define the job and secure the commitment.

| Stage         | DocType          | Action                                                   |
| ------------- | ---------------- | -------------------------------------------------------- |
| Estimation    | Quotation        | Create price quote with technical specs in description   |
| Negotiation   | Quotation Status | Open → (Client reviews)                                  |
| Commitment    | Sales Order      | Quote accepted, create Sales Order with delivery date    |
| Artwork Check | SO (Frontend)    | UI gatekeeper ensures artwork verified before production |

#### **Phase 3: Manufacturing & Production**

**Objective:** Convert raw materials into finished goods.

| Stage             | DocType                   | Action                                        |
| ----------------- | ------------------------- | --------------------------------------------- |
| Bill of Materials | BOM                       | Recipe: what inputs produce what output       |
| Work Order        | Work Order                | Production instruction with qty and deadline  |
| Material Transfer | Stock Entry (Transfer)    | Move raw materials to WIP warehouse           |
| Manufacturing     | Stock Entry (Manufacture) | Consume raw materials, produce finished goods |

#### **Phase 4: Fulfillment**

**Objective:** Deliver products to customer.

| Stage       | DocType       | Action                                       |
| ----------- | ------------- | -------------------------------------------- |
| Pickup/Ship | Delivery Note | Goods leave warehouse, stock deducted        |
| Gate Pass   | DN Print      | Security document for goods leaving premises |

#### **Phase 5: Accounting**

**Objective:** Bill, collect, and reconcile.

| Stage            | DocType          | Action                                          |
| ---------------- | ---------------- | ----------------------------------------------- |
| Invoice Customer | Sales Invoice    | Create from Delivery Note or Sales Order        |
| Receive Payment  | Payment Entry    | Record cash/bank receipt, reconcile to invoice  |
| Pay Vendors      | Purchase Invoice | Record vendor bills                             |
| Disbursements    | Payment Entry    | Pay vendor invoices                             |
| Adjustments      | Journal Entry    | Manual GL adjustments (write-offs, corrections) |

### 3.3 Role-Based Responsibility Map

| **Role**                  | **Primary Module** | **Key Responsibilities**                                                        |
| ------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| **Front Desk / Sales**    | CRM, Sales         | Create Leads, Convert to Customer, Make Quotes, Create Sales Orders             |
| **Production / Operator** | Manufacturing      | Check "Artwork Approved," Create Work Orders, Execute Stock Entry (Manufacture) |
| **Storekeeper**           | Stock              | Receive Raw Materials (Purchase Receipt), Release Goods (Delivery Note)         |
| **Accountant**            | Accounting         | Create Invoices, Record Payments, Chase unpaid invoices                         |
| **Manager**               | Dashboard          | View "Sales Funnel," "Monthly Revenue," and "Stock Levels"                      |

---

## 4. Completed Modules

### 4.1 Module Status Overview

| Phase | Module                        | Path                               | Status      | Documentation                             |
| ----- | ----------------------------- | ---------------------------------- | ----------- | ----------------------------------------- |
| **A** | CRM - Lead                    | `app/crm/lead/`                    | ✅ Complete | `CRM_MODULE_BUSINESS_WORKFLOW.md`         |
| **A** | CRM - Customer                | `app/crm/customer/`                | ✅ Complete | `CRM_MODULE_BUSINESS_WORKFLOW.md`         |
| **A** | CRM - Address                 | `app/crm/address/`                 | ✅ Complete | `CRM_MODULE_BUSINESS_WORKFLOW.md`         |
| **A** | CRM - Contact                 | `app/crm/contact/`                 | ✅ Complete | `CRM_MODULE_BUSINESS_WORKFLOW.md`         |
| **A** | CRM - Settings                | `app/crm/settings/`                | ✅ Complete | `CRM_MODULE_BUSINESS_WORKFLOW.md`         |
| **B** | Sales - Quotation             | `app/sales/quotation/`             | ✅ Complete | `QUOTATION_WORKFLOW.md`                   |
| **B** | Sales - Sales Order           | `app/sales/sales-order/`           | ✅ Complete | `SALES_ORDER_WORKFLOW.md`                 |
| **B** | Sales - Settings              | `app/sales/settings/`              | ✅ Complete | `PHASE2_SALES_MODULE_GUIDE.md`            |
| **C** | Stock - Item                  | `app/stock/item/`                  | ✅ Complete | `ITEMS_STOCK_MODULE_BUSINESS_WORKFLOW.md` |
| **C** | Stock - Warehouse             | `app/stock/warehouse/`             | ✅ Complete | `PHASE_E1_WAREHOUSE.md`                   |
| **D** | Manufacturing - Workstation   | `app/manufacturing/workstation/`   | ✅ Complete | `PHASE_E2_WORKSTATION.md`                 |
| **D** | Manufacturing - Operation     | `app/manufacturing/operation/`     | ✅ Complete | `PHASE_E3_OPERATION.md`                   |
| **D** | Manufacturing - BOM           | `app/manufacturing/bom/`           | ✅ Complete | `PHASE_E4_BOM_PART1/2.md`                 |
| **D** | Manufacturing - Work Order    | `app/manufacturing/work-order/`    | ✅ Complete | `PHASE_E5_WORK_ORDER_PART1/2.md`          |
| **E** | Stock - Material Request      | `app/stock/material-request/`      | ✅ Complete | `PHASE_E6_STOCK_MANAGEMENT.md`            |
| **E** | Stock - Stock Entry           | `app/stock/stock-entry/`           | ✅ Complete | `PHASE_E6_STOCK_MANAGEMENT.md`            |
| **E** | Stock - Delivery Note         | `app/stock/delivery-note/`         | ✅ Complete | `PHASE_F_DELIVERY_NOTE.md`                |
| **F** | Buying - Supplier             | `app/buying/supplier/`             | ✅ Complete | `PHASE_E6_STOCK_MANAGEMENT.md`            |
| **F** | Buying - Purchase Order       | `app/buying/purchase-order/`       | ✅ Complete | `PHASE_E6_STOCK_MANAGEMENT.md`            |
| **G** | Accounting - Sales Invoice    | `app/accounting/sales-invoice/`    | ✅ Complete | `PHASE_G_ACCOUNTING.md`                   |
| **G** | Accounting - Purchase Invoice | `app/accounting/purchase-invoice/` | ✅ Complete | `PHASE_G_ACCOUNTING.md`                   |
| **G** | Accounting - Payment Entry    | `app/accounting/payment-entry/`    | ✅ Complete | `PHASE_G_ACCOUNTING.md`                   |
| **G** | Accounting - Journal Entry    | `app/accounting/journal-entry/`    | ✅ Complete | `PHASE_G_ACCOUNTING.md`                   |
| **G** | Accounting - Setup            | `app/accounting/setup/`            | ✅ Complete | `PHASE_G_ACCOUNTING.md`                   |

### 4.2 Settings & Configuration Modules

| Module     | Settings Path           | Available Settings                                                          |
| ---------- | ----------------------- | --------------------------------------------------------------------------- |
| CRM        | `app/crm/settings/`     | Customer Group, Territory, Lead Source, Industry Type                       |
| Sales      | `app/sales/settings/`   | Terms & Conditions, Tax Templates, Price Lists, Sales Person, Sales Partner |
| Accounting | `app/accounting/setup/` | Chart of Accounts, Cost Centers, Mode of Payment, Payment Terms             |
| Stock      | `app/stock/setup/`      | Driver, Vehicle (for Delivery Notes)                                        |

### 4.3 Special Features Implemented

| Feature                       | Module        | Description                                              |
| ----------------------------- | ------------- | -------------------------------------------------------- |
| **Dynamic Link Filtering**    | CRM/Sales     | Address/Contact filter by linked Customer                |
| **Create From**               | Sales, Stock  | Create Sales Order from Quotation, Delivery Note from SO |
| **Artwork Gatekeeper**        | Sales Order   | Frontend-only verification before submit                 |
| **Gate Pass Printing**        | Delivery Note | Print without amount for security handoff                |
| **Bank Balance Warning**      | Payment Entry | Warns before overdraft                                   |
| **Outstanding Invoice Fetch** | Payment Entry | Auto-allocate payments to invoices                       |
| **Journal Entry Balancing**   | Accounting    | Enforces debit = credit                                  |

---

## 5. Module Integration Map

### 5.1 Document Creation Flow

```
Lead ──► [Convert] ──► Customer
                          │
                          ▼
Customer ──► [Create Quotation] ──► Quotation
                                        │
                                        ▼
Quotation ──► [Create Sales Order] ──► Sales Order
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
              Work Order          Delivery Note           Sales Invoice
                  │                     │                       │
                  ▼                     │                       ▼
            Stock Entry                 │               Payment Entry
          (Manufacture)                 │
                  │                     │
                  └─────────────────────┘
                            │
                            ▼
                    General Ledger
```

### 5.2 Key DocType Linkages

| Parent DocType | Child/Linked DocTypes                          | Link Field                                         |
| -------------- | ---------------------------------------------- | -------------------------------------------------- |
| Customer       | Address, Contact                               | Dynamic Link (`link_doctype`, `link_name`)         |
| Quotation      | Customer, Address, Contact, Quotation Item     | `party_name`, `customer_address`, `contact_person` |
| Sales Order    | Customer, Quotation (source), Sales Order Item | `customer`, `quotation`                            |
| Delivery Note  | Sales Order, Customer, Delivery Note Item      | `sales_order`, `customer`                          |
| Sales Invoice  | Customer, Sales Order, Delivery Note           | `customer`, linked items                           |
| Work Order     | BOM, Sales Order, Item                         | `bom_no`, `sales_order`, `production_item`         |
| Stock Entry    | Work Order (if manufacture)                    | `work_order`                                       |
| Payment Entry  | Sales Invoice, Purchase Invoice                | Payment references child table                     |

---

## 6. Technology Stack

### 6.1 Core Technologies

| Layer          | Technology       | Version           | Purpose                    |
| -------------- | ---------------- | ----------------- | -------------------------- |
| **Framework**  | Next.js          | 15.x (App Router) | Full-stack React framework |
| **Language**   | TypeScript       | 5.x (Strict Mode) | Type safety                |
| **Styling**    | Tailwind CSS     | v4.x              | Utility-first CSS          |
| **State**      | TanStack Query   | v5.x              | Server state management    |
| **Forms**      | React Hook Form  | v7.x              | Form handling              |
| **Validation** | Zod              | v3.x              | Runtime type validation    |
| **Backend**    | Frappe Framework | v15               | REST API provider          |
| **Icons**      | Lucide React     | Latest            | Consistent iconography     |
| **Animations** | Framer Motion    | v12.x             | Micro-interactions         |
| **Toasts**     | Sonner           | Latest            | Notifications              |

### 6.2 Key Patterns

| Pattern               | Implementation                           | Benefit              |
| --------------------- | ---------------------------------------- | -------------------- |
| **Schema-First**      | Auto-generate types from Frappe          | Zero type drift      |
| **Factory Pattern**   | `createListHandler()`, `useFrappeList()` | 70% less boilerplate |
| **Query Key Factory** | `queryKeys.customer.list()`              | Consistent caching   |
| **Theme-Aware CSS**   | `bg-card` not `bg-white`                 | Dual-theme support   |

---

## 7. Future Roadmap (v3.1+)

### 7.1 Version Release Plan

| Version  | Codename    | Target  | Theme                                     |
| -------- | ----------- | ------- | ----------------------------------------- |
| **v3.1** | _Fundament_ | Q1 2026 | Core Enhancements & Quick Wins            |
| **v3.2** | _Precision_ | Q2 2026 | Quality, Project & Advanced Manufacturing |
| **v3.3** | _Commerce_  | Q3 2026 | Procurement & Pricing Enhancements        |
| **v3.4** | _Scale_     | Q4 2026 | Multi-Tenant SaaS & Client Onboarding     |

---

### 7.2 v3.1 Features (Core Enhancements)

#### 7.2.1 Artwork & Document Attachments

**Problem:** Currently, artwork verification is a UI-only checkbox. Customers send artwork via email/WhatsApp, and staff manually verify.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Quotation Request Attachment** | Customer can attach artwork/specs when requesting a quote. Template upload field for job requirements. | 🔴 High |
| **Sales Order Artwork Upload** | Dedicated attachment field at SO level. "Artwork Approved" status synced with file presence. | 🔴 High |
| **Artwork Approval Status** | Backend field to track: `Pending`, `Approved`, `Rejected`, `Revision Requested` | 🔴 High |

**Implementation Notes:**

- Use Frappe's built-in File DocType with links to Customer/SO
- Client-side validation acceptable for MVP (can enhance with Frappe workflow later)
- Consider thumbnail preview in SO detail page

#### 7.2.2 Tax Templates & Payment Terms Expansion

**Problem:** Tax Templates and Payment Terms are buried in Sales settings. Need master-level management.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Tax Template Master Module** | Promote from Settings to main Accounting menu. Full CRUD with versioning. | 🟡 Medium |
| **Tax Template in Accounting Menu** | Add navigation link to Accounting sidebar in addition to Sales. | 🟢 Low |
| **Payment Terms Template Expansion** | Multi-row payment terms (30% deposit, 70% on delivery). Master module treatment. | 🟡 Medium |
| **Terms & Conditions Master Module** | Expand to full module with categorization (Quote Terms, Invoice Terms, PO Terms). | 🟡 Medium |

**Ethiopia Tax Context:**

- VAT: 15% (standard)
- TOT (Turnover Tax): 2% for small businesses
- Withholding: 2% on services

#### 7.2.3 Overdue Sales Order Notifications

**Problem:** Sales Orders can become overdue without anyone noticing until the customer complains.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Dashboard Overdue Widget** | Red badge count of SOs past delivery date | 🔴 High |
| **System Notifications** | In-app notification when SO becomes overdue | 🟡 Medium |
| **Email Alerts** | Configurable daily digest of overdue SOs to manager email | 🟡 Medium |
| **Remote Monitoring** | API endpoint for overdue SO count (for external dashboards) | 🟢 Low |

#### 7.2.4 Operation → Workstation Flow Enhancement

**Problem:** Current Operation/Workstation linkage is basic. Need better flow visualization.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Operation Routing** | Define sequence of operations for a BOM | 🟡 Medium |
| **Workstation Capacity** | Hours per day, working days calendar | 🟡 Medium |
| **Workstation Load View** | Visual display of jobs scheduled per workstation | 🟢 Low |
| **Operation Time Tracking** | Start/Stop buttons on Work Order operations | 🟢 Low |

#### 7.2.5 Activity Tracking Module

**Problem:** No history of who did what on a document. Audit trail is on Frappe but not surfaced.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Detail Page Footer Timeline** | Show creation, edits, status changes with user/timestamp | 🟡 Medium |
| **Comment System** | Allow users to add notes to any document | 🟡 Medium |
| **Activity Log Page** | Global activity feed for managers | 🟢 Low |

---

### 7.3 v3.2 Features (Quality & Projects)

#### 7.3.1 Quality Inspection Module

**Problem:** No quality control workflow. Defects discovered at delivery or by customer.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Quality Inspection DocType** | Standalone QC record linked to Stock Entry or Delivery Note | 🔴 High |
| **BOM Quality Required Flag** | `quality_inspection_required` on BOM to mandate QC before completion | 🔴 High |
| **Inspection Templates** | Predefined check items per Item Group (e.g., "Print Quality", "Color Match") | 🟡 Medium |
| **QC Status Integration** | Block delivery if QC failed or pending | 🟡 Medium |

#### 7.3.2 BOM Enhancements

**Problem:** Current BOM is basic. Missing key manufacturing features.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Fixed Time on Operations** | Allow fixed setup time + per-unit time for operations | 🟡 Medium |
| **Scrap & Process Loss** | Define expected scrap % per raw material. Auto-add to material requirement. | 🟡 Medium |
| **Quality Inspection Required** | Flag to mandate QC on production output | 🔴 High |

#### 7.3.3 Project Master Module

**Problem:** Project is a minor feature. Needs promotion to first-class entity for job shop tracking.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Project Menu in Main Nav** | Direct access from sidebar, not buried in settings | 🔴 High |
| **Project ↔ Sales Order Link** | Each SO can be linked to a Project (or create from SO) | 🔴 High |
| **Project ↔ Work Order Link** | Manufacturing tracked under Project | 🟡 Medium |
| **Project Status Display Fix** | Current graph bug needs resolution | 🔴 High (Bug) |
| **Project Dashboard** | Gantt chart or timeline view of project progress | 🟢 Low |

#### 7.3.4 Item Reservation Workflow

**Problem:** Stock shown as available can be promised to multiple SOs, causing allocation conflicts.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Reserve Stock from SO** | On SO submit, reserve qty for that order | 🟡 Medium |
| **Reserved Qty Display** | Show "Available" vs "Reserved" in stock reports | 🟡 Medium |
| **Reservation Release** | Auto-release on Delivery Note or manual cancel | 🟡 Medium |

---

### 7.4 v3.3 Features (Procurement & Pricing)

#### 7.4.1 Request for Quotation (RFQ) Module

**Problem:** No formal process for getting prices from suppliers.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **RFQ DocType** | Request quotes from multiple suppliers for same items | 🟡 Medium |
| **Supplier Quotation** | Record supplier responses with prices | 🟡 Medium |
| **RFQ → PO Conversion** | Accept a supplier quotation to create PO | 🟡 Medium |

#### 7.4.2 Auto Repeat for Purchase Orders

**Problem:** Regular purchases (e.g., monthly paper order) require manual recreation.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Auto Repeat Schedule** | Link to any DocType, create copies on schedule | 🟡 Medium |
| **PO Templates** | Save a PO as template for easy re-use | 🟢 Low |

#### 7.4.3 Advanced Pricing

**Problem:** Single rate per item is too simplistic. Need customer-specific and quantity-based pricing.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Item Price DocType** | Multiple prices per item (by customer, currency, qty) | 🔴 High |
| **Price List Assignment** | Assign price list to Customer Group or Customer | 🟡 Medium |
| **Product Bundles** | Define a package of items sold together (e.g., "Stationery Set") | 🟡 Medium |

#### 7.4.4 Item Module Expansion

**Problem:** Items are basic. Need export, variants, and better organization.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Item Export Feature** | Export item list to Excel/CSV | 🟡 Medium |
| **Item as Master Module** | Promote to main menu, not just under Stock | 🟡 Medium |
| **Item Variants** | Parent-child item relationships (e.g., Paper → A4/A3/Letter) | 🟢 Low |

#### 7.4.5 UOM Improvements

**Problem:** Work Order calculations can result in fractional UOMs where whole numbers are needed.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **UOM Round-Up in Work Order** | Always round up raw material requirements | 🔴 High |
| **UOM Conversion Accuracy** | Better handling of conversion factors | 🟡 Medium |

---

### 7.5 v3.4 Features (SaaS & Scale)

#### 7.5.1 Reseller Utility Module (Add-On)

**Problem:** Some printing companies resell products from partners. Need to track these differently.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Reseller Flag on Items** | Mark items sourced from resellers | 🟢 Low |
| **Reseller Commission Tracking** | Track margin on resold items | 🟢 Low |
| **Reseller Partner Management** | Similar to Sales Partner but for sourcing | 🟢 Low |

#### 7.5.2 Service Items vs Stock Items Workflow

**Problem:** Service items (Design Fee, Rush Processing) need different handling than physical stock.

**Solution:**
| Feature | Description | Priority |
|---------|-------------|----------|
| **Service Item Designation** | Clear UI distinction for `is_stock_item=0` items | 🟡 Medium |
| **No Stock Check for Services** | Skip warehouse selection for service lines | 🟡 Medium |
| **Time-Based Services** | Link service items to timesheet entries (optional) | 🟢 Low |

**Frappe Built-In:** ERPNext already handles this via `is_stock_item`. Frontend needs to respect this flag in forms.

#### 7.5.3 Versalabs ERP Onboarding Portal

**Context:** Versalabs is your company, the SaaS provider. Pana Promotion is the first client.

| Feature                       | Description                                              | Priority  |
| ----------------------------- | -------------------------------------------------------- | --------- |
| **Whitelabel Website**        | Versalabs-branded landing page for ERP onboarding        | 🟡 Medium |
| **Client Logo Upload**        | During onboarding, client uploads their logo             | 🟡 Medium |
| **Setup Wizard**              | Guided first-time setup (Company, Currency, First Users) | 🟡 Medium |
| **Multi-Tenant Architecture** | Each client gets isolated Frappe site or tenant          | 🔴 High   |

#### 7.5.4 Technical Tests & Configuration

| Feature                       | Description                                     | Priority  |
| ----------------------------- | ----------------------------------------------- | --------- |
| **Query Client Config Check** | Diagnostic endpoint to verify Frappe connection | 🟡 Medium |
| **System Health Dashboard**   | API latency, error rates, queue status          | 🟢 Low    |

---

### 7.6 Integration Targets

| Integration       | Version | Status      | Notes                |
| ----------------- | ------- | ----------- | -------------------- |
| ERPNext API       | v3.0    | ✅ Complete | Frappe JS SDK        |
| Email (SMTP)      | v3.1    | 📝 Planned  | Send quotes/invoices |
| File Storage      | v3.1    | 📝 Planned  | Artwork attachments  |
| Instagram Feed    | v3.2    | 📝 Planned  | Portfolio display    |
| WhatsApp Business | v3.2    | 📝 Planned  | Send documents       |
| Bank Statements   | v3.3    | 📝 Planned  | Auto-reconciliation  |
| Payment Gateway   | v3.4    | 📝 Planned  | Telebirr, CBE Birr   |

---

### 7.7 Known Bugs & Technical Debt

| Issue                            | Module        | Status  | Target |
| -------------------------------- | ------------- | ------- | ------ |
| Project status graph display bug | Projects      | 🔴 Open | v3.2   |
| UOM rounding in Work Order       | Manufacturing | 🔴 Open | v3.3   |

---

## Appendix: Quick Reference

### A. Generate Types Command

```bash
# Single DocType
pnpm generate-types "Customer"

# Multiple DocTypes
pnpm generate-types "Customer" "Lead" "Sales Order"

# All known DocTypes
pnpm generate-types --all
```

### B. File Structure Reference

```
pana-erp/
├── app/
│   ├── api/{module}/{doctype}/     # API Routes
│   ├── crm/                         # CRM Module Pages
│   ├── sales/                       # Sales Module Pages
│   ├── stock/                       # Stock Module Pages
│   ├── manufacturing/               # Manufacturing Module Pages
│   ├── accounting/                  # Accounting Module Pages
│   └── buying/                      # Purchasing Module Pages
├── components/
│   ├── ui/                          # Primitive UI (shadcn/ui)
│   ├── smart/                       # Frappe-Aware Components
│   └── form/                        # Form Field Wrappers
├── hooks/
│   └── generic/                     # Generic Frappe Hooks
├── lib/
│   ├── doctype-config.ts           # DocType Registry
│   ├── query-keys.ts               # Query Key Factory
│   ├── api-factory.ts              # API Route Factories
│   └── schemas/                     # Zod Schemas
├── types/
│   └── doctype-types.ts            # Generated Interfaces
└── docs/v3/                         # This Documentation
```

### C. Common API Patterns

```typescript
// List with filters
GET /api/sales/quotation?filters=[["status","=","Open"]]&limit=50

// Single document
GET /api/sales/quotation/QTN-00001

// Create
POST /api/sales/quotation
Body: { ...quotationData }

// Update
PUT /api/sales/quotation/QTN-00001
Body: { ...updates }

// Delete
DELETE /api/sales/quotation/QTN-00001
```

### D. Key Environment Variables

```env
FRAPPE_API_URL=https://your-erpnext-instance.com
FRAPPE_API_KEY=your-api-key
FRAPPE_API_SECRET=your-api-secret
```

---

_This is the authoritative master documentation for Pana ERP v3.0. For module-specific implementation details, see the corresponding workflow documents in `docs/v3/business-logic/`._
