# Pana ERP v3.0 - Quotation Module Business Logic

> **Version:** 1.0.0  
> **Created:** 2026-01-17  
> **Module:** Sales  
> **Status:** Production Ready

---

## Executive Summary

This is the **"Revenue" phase** of Pana ERP. We are moving from managing *who* we know (CRM) to *what* we offer (Sales).

In a **Job Shop / Printing** environment, the **Quotation** is the most important document. It is where you translate a vague request ("I want nice flyers") into a binding technical and financial contract ("1000 units, 150gsm Glossy, $0.05/unit, VAT 15%, Valid 15 days").

Since we cannot add custom fields (like "Paper GSM"), we use the **Item Description** field as the "Technical Spec" area—this is standard ERPNext practice for service businesses.

---

## 1. Entity Map & Dependencies

We are introducing complex "Master-Detail" documents here.

| **DocType** | **Role** | **Dependency** | **Nuance for Printing** |
| --- | --- | --- | --- |
| **Quotation** | The Header | Customer, Address, Contact | The legal container. |
| **Quotation Item** | The Rows | Item | **Child Table**. Holds the specific job details (Flyers, Banners). |
| **Sales Taxes and Charges Template** | Tax Logic | Independent | Automates "VAT 15%" or "Withholding Tax". |
| **Terms and Conditions** | Legal Text | Independent | "50% Advance Required", "No Refunds on Custom Print". |
| **Item** | The Product | Stock Module | We need both "Service Items" (Design) and "Physical Items" (Paper). |

---

## 2. Business Workflow Logic

### A. The Setup (Prerequisites)

Before a user can quote, they need the tools to price and tax correctly.

- **Tax Templates:** We need a way to apply VAT automatically.
- **Terms:** We need standard legal snippets to protect the business.
- **Service Items:** We need non-stock items like "Design Fee" or "Printing Service" defined in the Item master.

### B. The Quotation Creation (The "Estimation")

#### Step 1: Customer Selection
- User selects `Customer` or `Lead`.
- **Logic:** System *must* auto-fetch the `Customer Address` (Billing) and `Contact Person` if they exist. (This leverages the data we built in Phase 1).

#### Step 2: The Job Specs (Line Items)
- User adds an Item (e.g., "Digital Printing Service").
- **The "Job Shop" Logic:** The user *must* edit the **Description** field to specify the custom job (e.g., *"Trifold Brochure, 200gsm, 2-sided"*).
- **Pricing:** The user manually inputs the `Rate`. In printing, this varies per job.

#### Step 3: Financials
- User selects a **Tax Template** (e.g., "In-State VAT").
- System calculates `Grand Total`.

#### Step 4: Legal
- User selects **Terms** (e.g., "Standard Printing Terms").
- System appends the text to the bottom of the quote.

---

## 3. The Quotation Lifecycle

### Status Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         QUOTATION LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    Submit     ┌──────────┐                               │
│   │  DRAFT   │ ─────────────▶│   OPEN   │                               │
│   │(docstatus:0)            │(docstatus:1)                              │
│   └────┬─────┘               └────┬─────┴────────────┐                  │
│        │                          │                  │                  │
│        │ Edit/Delete              │                  │ Cancel           │
│        └──────────────────────────│                  │                  │
│                                   │                  │                  │
│                          ┌────────▼────────┐  ┌──────▼──────┐           │
│                          │ Create Sales    │  │  CANCELLED  │           │
│                          │    Order        │  │ (docstatus:2)│          │
│                          └────────┬────────┘  └─────────────┘           │
│                                   │                                     │
│                          ┌────────▼────────┐                            │
│                          │    ORDERED      │                            │
│                          │ (status only)   │                            │
│                          │ Auto-linked     │                            │
│                          └─────────────────┘                            │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ EXPIRED: Calculated field when valid_till < current_date         │  │
│   │ This is a display-only status, not stored in the database        │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status | `docstatus` | Description | Allowed Actions |
|--------|-------------|-------------|-----------------|
| **Draft** | `0` | Initial state. Quotation is being prepared. | Edit, Delete, Submit |
| **Open** | `1` | Submitted. Sent to client for approval. | Create Sales Order, Cancel |
| **Ordered** | `1` | A Sales Order has been created from this quotation. | View Sales Order |
| **Expired** | N/A | Calculated: `valid_till < today`. Display only. | Same as Open (if docstatus=1) |
| **Cancelled** | `2` | Permanently cancelled. Cannot be modified. | None |

### Action Logic

#### Submit (Draft → Open)
```typescript
// Transition: docstatus 0 → 1, status "Draft" → "Open"
// Validation: Must have at least one item
// API: PUT with { docstatus: 1 }
```

#### Create Sales Order (Open → Ordered)
```typescript
// This is Phase 3 functionality
// Transition: status "Open" → "Ordered"  
// Creates a new Sales Order linked to this quotation
// The quotation status auto-updates when SO is created
```

#### Cancel (Open → Cancelled)
```typescript
// Transition: docstatus 1 → 2
// This is a permanent action
// API: PUT with { docstatus: 2 }
// Note: Cancelled quotations cannot be deleted
```

---

## 4. Quotation Form Fields

### Header Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `company` | Link (Company) | ✅ | Your company |
| `quotation_to` | Select | ✅ | "Customer" or "Lead" |
| `party_name` | Link | ✅ | The selected Customer/Lead |
| `transaction_date` | Date | ✅ | Quotation date |
| `valid_till` | Date | ✅ | Expiry date (default: +15 days) |
| `order_type` | Select | ✅ | "Sales" or "Maintenance" |

### Address & Contact Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_address` | Link (Address) | ❌ | Filtered by party_name Dynamic Link |
| `contact_person` | Link (Contact) | ❌ | Filtered by party_name Dynamic Link |

### Items Section (Child Table)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `item_code` | Link (Item) | ✅ | The service/product |
| `description` | Text | ✅ | **Technical specs** (GSM, color, size) |
| `qty` | Float | ✅ | Quantity |
| `rate` | Currency | ✅ | Per-unit price |
| `amount` | Currency | Auto | `qty × rate` (calculated) |

### Financials Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selling_price_list` | Link | ✅ | Price list for currency |
| `taxes_and_charges` | Link | ❌ | Tax template |
| `total` | Currency | Auto | Sum of item amounts |
| `total_taxes_and_charges` | Currency | Auto | Tax amount |
| `grand_total` | Currency | Auto | Final total |

### Footer Section
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tc_name` | Link | ❌ | Terms and Conditions template |
| `terms` | Text | Auto | Populated from tc_name |

---

## 5. Client-Side Calculations

The backend (Frappe) calculates final totals on save. However, for better UX, we implement client-side calculations:

```typescript
// Subtotal Calculation
const subtotal = items.reduce((acc, item) => {
  return acc + (Number(item.qty) || 0) * (Number(item.rate) || 0);
}, 0);

// Display Format
const formatCurrency = (amount: number, currency = "ETB") => {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
  }).format(amount || 0);
};
```

---

## 6. Address & Contact Auto-Selection

When customer/lead is selected, automatically fetch and select the first available address and contact:

```typescript
// Use Dynamic Link server-side filtering
const filters = [
  ["Dynamic Link", "link_doctype", "=", partyType], // "Customer" or "Lead"
  ["Dynamic Link", "link_name", "=", partyName]
];

// Fetch addresses and contacts with these filters
// Auto-select the first result if available
```

---

## 7. Print Format

The quotation detail view should be print-ready with:

1. **Company Header**: Logo, name, address, contact info
2. **Quotation Details**: ID, date, valid till, status
3. **Bill To Section**: Customer name, address, contact person
4. **Items Table**: Item code, description, qty, rate, amount
5. **Totals Section**: Subtotal, taxes, grand total
6. **Terms Section**: Legal terms text
7. **Footer**: Thank you message, signature line

---

## 8. UI/UX Considerations

### List Page
- Premium card-based layout with status badges
- Quick filters by status (All, Draft, Open, Ordered, Expired)
- Search by ID, customer name
- Visual indication of expired quotations

### Detail Page
- Invoice-like professional layout
- Clear action buttons based on current status
- Share functionality (copy URL)
- Print functionality (full professional format)

### Create/Edit Page
- Smart auto-selection of address/contact
- Real-time subtotal calculation
- Premium table editor for items
- Sticky action bar

---

## 9. Testing Checklist

- [ ] Create quotation with customer
- [ ] Verify address/contact auto-selection
- [ ] Add multiple items with technical specs
- [ ] Apply tax template
- [ ] Apply terms and conditions
- [ ] Submit quotation (Draft → Open)
- [ ] Cancel submitted quotation
- [ ] Print quotation
- [ ] Share quotation URL
- [ ] Edit draft quotation
- [ ] Delete draft quotation
- [ ] Verify expired status display

---

*This document serves as the authoritative business logic reference for the Quotation module in Pana ERP v3.0.*
