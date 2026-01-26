# Pana ERP v3.0 - Accounting & Finance Master Workflow

> **Version:** 1.0.0  
> **Created:** 2026-01-26  
> **Module:** Accounting & Finance (Full Suite)  
> **Phase:** G - Financial Management  
> **Status:** Planning Complete

---

## Executive Summary

The **Accounting & Finance Module** is the final and most complex pillar of Pana ERP. This is not just an "Invoice Printer" – it's a **Double-Entry Bookkeeping System** that serves as the source of truth for the company's financial health.

In this full-scale implementation, "Accounting" is the destination where data from **Sales (Revenue)**, **Stock (Assets/COGS)**, and **Buying (Expenses)** converges into a unified financial picture.

### The Golden Rule of Accounting

```
Every Transaction = At Least One Debit + At Least One Credit
∑ Debits = ∑ Credits (ALWAYS)
```

---

## 1. The Complete Financial Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           ACCOUNTING & FINANCE ECOSYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              INFRASTRUCTURE (Setup)                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │ │
│  │  │    Account   │  │ Cost Center  │  │ Mode of      │  │  Payment     │              │ │
│  │  │   (CoA Tree) │  │  (Profit     │  │  Payment     │  │   Terms      │              │ │
│  │  │              │  │   Centers)   │  │  (Cash/Bank) │  │  Template    │              │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘              │ │
│  └───────────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                                   │
│  ┌───────────────────────────────────────┼───────────────────────────────────────────────┐ │
│  │                                       │                                                │ │
│  │  ┌────────────────────────────┐      │      ┌────────────────────────────┐           │ │
│  │  │   ACCOUNTS RECEIVABLE      │      │      │   ACCOUNTS PAYABLE         │           │ │
│  │  │   (Getting Paid)           │      │      │   (Paying Bills)           │           │ │
│  │  │                            │      │      │                            │           │ │
│  │  │  Delivery Note             │      │      │  Purchase Order            │           │ │
│  │  │       │                    │      │      │       │                    │           │ │
│  │  │       ▼                    │      │      │       ▼                    │           │ │
│  │  │  Sales Invoice ────────────┼──────┼──────┼─▶ Purchase Invoice         │           │ │
│  │  │       │                    │      │      │       │                    │           │ │
│  │  │       │   ┌────────────────┼──────┼──────┼───────┘                    │           │ │
│  │  │       │   │                │      │      │                            │           │ │
│  │  │       ▼   ▼                │      │      │                            │           │ │
│  │  │  ┌─────────────────────────┼──────┴──────┼────────────────────────┐   │           │ │
│  │  │  │          PAYMENT ENTRY (Universal Cash Handler)               │   │           │ │
│  │  │  │   • Receive (from Customer)                                   │   │           │ │
│  │  │  │   • Pay (to Supplier)                                         │   │           │ │
│  │  │  │   • Internal Transfer (between accounts)                      │   │           │ │
│  │  │  └───────────────────────────────────────────────────────────────┘   │           │ │
│  │  │                                                                       │           │ │
│  │  └───────────────────────────────────────────────────────────────────────┘           │ │
│  │                                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                                   │
│                                         ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           JOURNAL ENTRY (Manual Adjustments)                          │ │
│  │   • Depreciation    • Salaries    • Corrections    • Opening Balances                │ │
│  └───────────────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                                   │
│                                         ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              GENERAL LEDGER (GL)                                       │ │
│  │         Every submitted document creates GL Entries automatically                     │ │
│  │                     ▼ Debits = Credits (ALWAYS) ▼                                     │ │
│  └───────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Entity Map & Dependencies

### Core DocTypes

| **DocType**                | **Role**              | **Dependencies**           | **Financial Impact**                   |
| -------------------------- | --------------------- | -------------------------- | -------------------------------------- |
| **Sales Invoice**          | Revenue Recognition   | Customer, Delivery Note/SO | Credits Income, Debits Receivables     |
| **Purchase Invoice**       | Expense/Asset Booking | Supplier, Purchase Order   | Debits Expense/Asset, Credits Payables |
| **Payment Entry**          | Cash Movement         | Invoice, Party             | Debits/Credits Bank/Cash, Clears AR/AP |
| **Journal Entry**          | Manual Adjustments    | Account                    | Direct GL posting                      |
| **Account**                | The Buckets           | Company                    | Chart of Accounts tree                 |
| **Cost Center**            | Profit Tracking       | Company                    | Profit by department/division          |
| **Mode of Payment**        | Payment Method        | —                          | Cash, Bank, Mobile Money               |
| **Payment Terms Template** | Due Date Rules        | —                          | Net 30, 50% Advance, etc.              |

### Account Types (Critical)

| Type          | Examples                         | Balance | Report        |
| ------------- | -------------------------------- | ------- | ------------- |
| **Asset**     | Bank, Cash, Inventory, Equipment | Debit   | Balance Sheet |
| **Liability** | Accounts Payable, Loans          | Credit  | Balance Sheet |
| **Equity**    | Capital, Retained Earnings       | Credit  | Balance Sheet |
| **Income**    | Sales, Service Revenue           | Credit  | P&L           |
| **Expense**   | COGS, Utilities, Salaries        | Debit   | P&L           |

---

## 3. The Accounts Receivable (AR) Flow

### "Getting Paid" Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            ACCOUNTS RECEIVABLE LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│    TRIGGER: Goods Delivered OR Advance Required                                        │
│                                                                                         │
│    ┌───────────────┐        ┌───────────────┐        ┌───────────────┐                │
│    │ Delivery Note │  ───▶  │ Sales Invoice │  ───▶  │Payment Entry  │                │
│    │ (Physical)    │        │ (Financial)   │        │ (Cash)        │                │
│    └───────────────┘        └───────┬───────┘        └───────┬───────┘                │
│                                     │                        │                         │
│                                     ▼                        ▼                         │
│                             ┌───────────────────────────────────────┐                 │
│                             │           GENERAL LEDGER               │                 │
│                             │  ┌─────────────────────────────────┐  │                 │
│                             │  │ On Invoice Submit:              │  │                 │
│                             │  │   Dr: Accounts Receivable       │  │                 │
│                             │  │   Cr: Sales Income              │  │                 │
│                             │  └─────────────────────────────────┘  │                 │
│                             │  ┌─────────────────────────────────┐  │                 │
│                             │  │ On Payment Receive:             │  │                 │
│                             │  │   Dr: Bank/Cash                 │  │                 │
│                             │  │   Cr: Accounts Receivable       │  │                 │
│                             │  └─────────────────────────────────┘  │                 │
│                             └───────────────────────────────────────┘                 │
│                                                                                         │
│    STATUS FLOW:                                                                        │
│    Draft → Submitted → Unpaid → Partly Paid → Paid                                    │
│                    └─→ Overdue (if past due_date)                                      │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Sales Invoice Status Matrix

| Status          | Meaning                   | Color  | Next Actions          |
| --------------- | ------------------------- | ------ | --------------------- |
| **Draft**       | Not submitted             | Gray   | Edit, Delete, Submit  |
| **Unpaid**      | Submitted, no payment     | Amber  | Make Payment          |
| **Partly Paid** | Partial payment received  | Blue   | Make Payment          |
| **Paid**        | Fully settled             | Green  | View only             |
| **Overdue**     | Past due_date, unpaid     | Red    | Make Payment (urgent) |
| **Return**      | Credit note (is_return=1) | Purple | View only             |
| **Cancelled**   | Voided                    | Gray   | View only             |

---

## 4. The Accounts Payable (AP) Flow

### "Paying Bills" Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            ACCOUNTS PAYABLE LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│    TRIGGER: Vendor Invoice Received OR Stock Receipt                                   │
│                                                                                         │
│    ┌───────────────┐        ┌───────────────┐        ┌───────────────┐                │
│    │Purchase Order │  ───▶  │Purchase Invoic│  ───▶  │Payment Entry  │                │
│    │ (Commitment)  │        │ (Liability)   │        │ (Pay)         │                │
│    └───────────────┘        └───────┬───────┘        └───────┬───────┘                │
│                                     │                        │                         │
│                                     ▼                        ▼                         │
│                             ┌───────────────────────────────────────┐                 │
│                             │           GENERAL LEDGER               │                 │
│                             │  ┌─────────────────────────────────┐  │                 │
│                             │  │ On Invoice Submit:              │  │                 │
│                             │  │   Dr: Expense/Stock Account     │  │                 │
│                             │  │   Cr: Accounts Payable          │  │                 │
│                             │  └─────────────────────────────────┘  │                 │
│                             │  ┌─────────────────────────────────┐  │                 │
│                             │  │ On Payment Made:                │  │                 │
│                             │  │   Dr: Accounts Payable          │  │                 │
│                             │  │   Cr: Bank/Cash                 │  │                 │
│                             │  └─────────────────────────────────┘  │                 │
│                             └───────────────────────────────────────┘                 │
│                                                                                         │
│    3-WAY MATCH (Optional Validation):                                                  │
│    PO Price = Invoice Price = Receipt Qty                                              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Payment Entry - The Universal Cash Handler

Payment Entry is the **single document** for all money movement:

### Payment Types

| Type                  | Party    | Use Case              | Account Flow    |
| --------------------- | -------- | --------------------- | --------------- |
| **Receive**           | Customer | Customer pays invoice | Bank ← Customer |
| **Pay**               | Supplier | We pay vendor         | Supplier ← Bank |
| **Internal Transfer** | None     | Move between accounts | Bank A ← Bank B |

### Payment Reconciliation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PAYMENT RECONCILIATION LOGIC                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO: Customer pays $1500, has two outstanding invoices               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Outstanding Invoices:                                               │   │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────────────────┐  │   │
│  │  │ Invoice #   │ Grand Total │ Outstanding │ Allocate            │  │   │
│  │  ├─────────────┼─────────────┼─────────────┼─────────────────────┤  │   │
│  │  │ SINV-0001   │ $1,000      │ $1,000      │ [✓] $1,000          │  │   │
│  │  │ SINV-0002   │ $800        │ $800        │ [✓] $500            │  │   │
│  │  │ SINV-0003   │ $500        │ $500        │ [ ] —               │  │   │
│  │  └─────────────┴─────────────┴─────────────┴─────────────────────┘  │   │
│  │                                                                      │   │
│  │  Payment Amount: $1,500                                              │   │
│  │  Total Allocated: $1,500                                              │   │
│  │  Unallocated: $0                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RESULT:                                                                    │
│  • SINV-0001 → Status: Paid (Outstanding: $0)                              │
│  • SINV-0002 → Status: Partly Paid (Outstanding: $300)                     │
│  • SINV-0003 → Status: Unpaid (Outstanding: $500)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Journal Entry - The Manual Override

For transactions that don't fit standard flows:

| Entry Type             | Use Case            | Example                 |
| ---------------------- | ------------------- | ----------------------- |
| **Journal Entry**      | General adjustments | Reclassify expense      |
| **Bank Entry**         | Bank transactions   | Bank charges            |
| **Cash Entry**         | Petty cash          | Office supplies cash    |
| **Depreciation Entry** | Asset depreciation  | Monthly depreciation    |
| **Opening Entry**      | Starting balances   | Account opening values  |
| **Write Off Entry**    | Bad debt            | Write off uncollectible |

---

## 7. Enhanced Features (Beyond Basic)

### 7.1 Credit Limit Management

```typescript
// Frontend check before Sales Invoice creation
if (customer.outstanding_amount + invoiceAmount > customer.credit_limit) {
  showWarning(`Customer credit limit exceeded! 
    Outstanding: ${customer.outstanding_amount}
    This Invoice: ${invoiceAmount}
    Credit Limit: ${customer.credit_limit}`);
}
```

### 7.2 Bank Balance Validation

```typescript
// Before Payment Entry (Pay type)
const bankBalance = await getBankAccountBalance(selectedAccount);
if (bankBalance < paymentAmount) {
  showWarning(`Insufficient bank balance!
    Available: ${bankBalance}
    Required: ${paymentAmount}`);
}
```

### 7.3 Overdue Invoice Alerts

- Dashboard widget showing overdue invoices
- Color-coded aging buckets (0-30, 31-60, 61-90, 90+)
- Outstanding amount by customer ranking

### 7.4 Payment Terms Automation

- Auto-calculate due_date from posting_date
- Multi-term schedules (50% in 15 days, 50% in 30 days)
- Installment tracking

### 7.5 Quick Actions

| From             | Quick Action     | Creates                 |
| ---------------- | ---------------- | ----------------------- |
| Sales Invoice    | "Make Payment"   | Payment Entry (Receive) |
| Purchase Invoice | "Make Payment"   | Payment Entry (Pay)     |
| Delivery Note    | "Create Invoice" | Sales Invoice           |
| Sales Order      | "Create Invoice" | Sales Invoice           |

### 7.6 Dashboard Widgets

1. **Revenue vs Expenses** - Monthly comparison chart
2. **Outstanding Receivables** - Aging breakdown
3. **Outstanding Payables** - Vendor-wise breakdown
4. **Cash Position** - Bank/Cash account balances
5. **Today's Transactions** - Recent activity feed

### 7.7 Reporting Views

1. **General Ledger** - Raw debit/credit entries
2. **Trial Balance** - Account-wise totals
3. **Accounts Receivable Report** - Customer-wise outstanding
4. **Accounts Payable Report** - Supplier-wise outstanding
5. **Cash Flow Statement** - Money movement summary

---

## 8. Integration Points

### From Other Modules

| Source               | Trigger | Creates          | Pre-filled                    |
| -------------------- | ------- | ---------------- | ----------------------------- |
| **Sales Order**      | Manual  | Sales Invoice    | Customer, Items               |
| **Delivery Note**    | Manual  | Sales Invoice    | Customer, Items, DN link      |
| **Purchase Order**   | Manual  | Purchase Invoice | Supplier, Items               |
| **Purchase Receipt** | Manual  | Purchase Invoice | Supplier, Items, Receipt link |

### To Other Modules

| Action                  | Updates                           |
| ----------------------- | --------------------------------- |
| Sales Invoice Submit    | Customer outstanding_amount       |
| Payment Entry Submit    | Invoice status (Paid/Partly Paid) |
| Purchase Invoice Submit | Supplier outstanding_amount       |

---

## 9. DocType Field Specifications

### Account (Chart of Accounts)

| Field             | Type           | Required | Description                           |
| ----------------- | -------------- | -------- | ------------------------------------- |
| `account_name`    | Data           | ✅       | Display name                          |
| `account_number`  | Data           | ❌       | Optional number                       |
| `parent_account`  | Link (Account) | ✅       | Hierarchy parent                      |
| `root_type`       | Select         | ❌       | Asset/Liability/Income/Expense/Equity |
| `account_type`    | Data           | ❌       | Bank/Cash/Receivable/Payable/Stock    |
| `is_group`        | Check          | ❌       | Is container node?                    |
| `company`         | Link (Company) | ✅       | Owning company                        |
| `balance_must_be` | Select         | ❌       | Debit/Credit constraint               |
| `freeze_account`  | Select         | ❌       | Prevent transactions                  |

### Cost Center

| Field                | Type           | Required | Description                             |
| -------------------- | -------------- | -------- | --------------------------------------- |
| `cost_center_name`   | Data           | ✅       | Display name (e.g., "Digital Printing") |
| `parent_cost_center` | Link           | ✅       | Hierarchy parent                        |
| `company`            | Link (Company) | ✅       | Owning company                          |
| `is_group`           | Check          | ❌       | Is container?                           |

### Mode of Payment

| Field             | Type   | Required | Description                          |
| ----------------- | ------ | -------- | ------------------------------------ |
| `mode_of_payment` | Data   | ✅       | Name (e.g., "Cash", "Wire Transfer") |
| `type`            | Select | ❌       | Cash/Bank/General/Phone              |
| `enabled`         | Check  | ❌       | Active status                        |
| `accounts`        | Table  | ❌       | Default accounts per company         |

### Sales Invoice (Key Fields)

| Field                | Type           | Required | Description               |
| -------------------- | -------------- | -------- | ------------------------- |
| `customer`           | Link           | ✅\*     | Who we're billing         |
| `posting_date`       | Date           | ✅       | Invoice date              |
| `due_date`           | Date           | ❌       | Payment due date          |
| `items`              | Table          | ✅       | Line items                |
| `grand_total`        | Currency       | Auto     | Total amount              |
| `outstanding_amount` | Currency       | Auto     | Amount unpaid             |
| `status`             | Select         | Auto     | Draft/Unpaid/Paid/Overdue |
| `debit_to`           | Link (Account) | ✅       | Receivable account        |
| `is_pos`             | Check          | ❌       | Point of Sale mode        |
| `is_return`          | Check          | ❌       | Is credit note?           |

### Payment Entry (Key Fields)

| Field             | Type           | Required | Description                   |
| ----------------- | -------------- | -------- | ----------------------------- |
| `payment_type`    | Select         | ✅       | Receive/Pay/Internal Transfer |
| `party_type`      | Select         | ✅\*     | Customer/Supplier             |
| `party`           | Link           | ✅\*     | Party name                    |
| `posting_date`    | Date           | ✅       | Transaction date              |
| `paid_amount`     | Currency       | ✅       | Amount paid                   |
| `paid_from`       | Link (Account) | ✅       | Source account                |
| `paid_to`         | Link (Account) | ✅       | Destination account           |
| `mode_of_payment` | Link           | ❌       | Cash/Bank/etc                 |
| `reference_no`    | Data           | ❌       | Check/transfer number         |
| `references`      | Table          | ❌       | Invoice allocations           |

---

## 10. Testing Scenarios

### Happy Path Tests

1. **Complete AR Cycle**
   - Create Sales Order → Deliver → Invoice → Receive Payment → Verify Paid

2. **Complete AP Cycle**
   - Create Purchase Order → Receive → Invoice → Pay → Verify Paid

3. **Partial Payment**
   - Invoice for $1000 → Pay $400 → Status = Partly Paid → Pay $600 → Status = Paid

4. **Multi-Invoice Payment**
   - Customer has 3 invoices → Single payment covers 2.5 → Verify allocations

### Edge Case Tests

1. **Credit Limit Check**
   - Customer over limit → Warning shown → Can still proceed with override

2. **Overdue Detection**
   - Invoice past due_date → Status changes to Overdue

3. **Bank Balance Check**
   - Pay more than bank balance → Warning shown

4. **Return/Credit Note**
   - Create credit note against invoice → Outstanding reduces

---

_This document defines the complete Accounting & Finance workflow for Pana ERP v3.0_
