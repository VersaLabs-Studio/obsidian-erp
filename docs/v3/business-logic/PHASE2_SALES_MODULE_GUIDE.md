# Pana ERP v3.0 - Phase 2: Sales Module (Quotation) Implementation Guide

> **Phase:** 2 - Sales Module (Revenue Phase)  
> **Date:** 2026-01-15  
> **Status:** Implementation Ready  
> **Target:** GLM 4.7 Agentic Coding Assistant

---

## Executive Summary

This phase implements the **Sales Module** focused on **Quotations** - the most critical document for a Job Shop/Printing business. We are moving from managing *who* we know (CRM) to *what* we offer (Sales).

**Business Context:** In a printing environment, the Quotation translates vague requests ("I want nice flyers") into binding technical and financial contracts ("1000 units, 150gsm Glossy, $0.05/unit, VAT 15%, Valid 15 days").

**Key Innovation:** Since we cannot add custom fields (like "Paper GSM"), we use the **Item Description** field as the "Technical Spec" area—standard ERPNext practice for service businesses.

---

## Phase 2 Completion Checklist

### ✅ Already Completed (by Lead Agent)

1. **Configuration Updated:**
   - [x] `lib/doctype-config.ts`: Added "Sales" to ModuleCategory, registered Quotation, Sales Taxes Template, Terms and Conditions
   - [x] `lib/query-keys.ts`: Added quotation (with byCustomer), salesOrder, termsAndConditions, salesTaxesTemplate
   - [x] `lib/schemas/doctype-schemas.ts`: Updated QuotationCreateSchema and TermsAndConditionsCreateSchema

2. **API Routes Created:**
   - [x] `app/api/sales/quotation/route.ts` - List & Create
   - [x] `app/api/sales/quotation/[name]/route.ts` - Get, Update, Delete
   - [x] `app/api/sales/terms/route.ts` - List & Create
   - [x] `app/api/sales/terms/[name]/route.ts` - Get, Update, Delete
   - [x] `app/api/sales/taxes-template/route.ts` - List & Create
   - [x] `app/api/sales/taxes-template/[name]/route.ts` - Get, Update, Delete
   - [x] `app/api/sales/sales-order/route.ts` - List (placeholder for Phase 3)

3. **Sidebar Navigation:**
   - [x] Added "Sales" module after CRM with Quotations, Sales Orders, Settings

---

### 🔨 To Be Implemented (Your Task)

## Task 1: Sales Settings Landing Page

**Path:** `app/sales/settings/page.tsx`

**Purpose:** A beautiful settings hub with CTAs (like CRM settings page)

**Reference Template:** `app/crm/settings/page.tsx`

**Settings Items:**
```typescript
const settingsItems = [
  {
    title: "Tax Templates",
    description: "Manage sales tax templates like VAT 15%, Withholding Tax, etc.",
    icon: Calculator, // from lucide-react
    href: "/sales/settings/taxes",
  },
  {
    title: "Terms and Conditions",
    description: "Standard legal terms like '50% Advance Required', 'No Refunds on Custom Print'.",
    icon: FileText,
    href: "/sales/settings/terms",
  },
];
```

---

## Task 2: Terms and Conditions CRUD

**Path:** `app/sales/settings/terms/`

**DocType:** `Terms and Conditions`

**Reference Template:** Any CRM settings module (e.g., `app/crm/settings/customer-group/`)

### 2.1 List View (`page.tsx`)
- Display: `title`, enabled/disabled badge
- Actions: Edit, Delete
- Search by title

### 2.2 Create Form (`new/page.tsx`)
**Form Fields:**
```typescript
// Section 1: Basic Info
- title (FormInput, required)

// Section 2: Applicability
- selling (FormSwitch, default: true) - "Apply to Selling Transactions"
- buying (FormSwitch, default: false) - "Apply to Buying Transactions"

// Section 3: Content
- terms (FormTextarea or RichTextEditor, large) - "Terms Content"
  // This should be a large text area for the legal text
```

**Zod Schema:** Use `TermsAndConditionsCreateSchema` from `@/lib/schemas/doctype-schemas`

### 2.3 Edit Form (`[name]/edit/page.tsx`)
- Same as create, pre-populated with existing data

---

## Task 3: Sales Tax Templates CRUD

**Path:** `app/sales/settings/taxes/`

**DocType:** `Sales Taxes and Charges Template`

**COMPLEXITY NOTE:** This DocType has a child table called `taxes` which contains the actual tax rules. For simplicity, keep the UI minimal.

### 3.1 List View (`page.tsx`)
- Display: `title`, `company`, default badge
- Actions: Edit, Delete

### 3.2 Create Form (`new/page.tsx`)
**Form Fields:**
```typescript
// Section 1: Template Info
- title (FormInput, required) - e.g., "VAT 15%", "Sales Tax 10%"
- company (FormFrappeSelect, doctype: "Company")
- is_default (FormSwitch) - "Set as Default Template"

// NOTE: The `taxes` child table (actual tax rules) is complex.
// For MVP, just create the template header. Users can configure
// the tax lines in the ERPNext backend or via a future advanced editor.
```

### 3.3 Edit Form (`[name]/edit/page.tsx`)
- Same as create, pre-populated

---

## Task 4: Quotation List View

**Path:** `app/sales/quotation/page.tsx`

**DocType:** `Quotation`

**Reference:** `app/crm/lead/page.tsx` (for status filtering pattern)

### List Features:
1. **Filters:** By `status` (Draft, Open, Ordered, Lost, Expired)
2. **Search:** By ID, customer name
3. **Columns:**
   - `name` (Quotation ID)
   - `customer_name` or `party_name`
   - `transaction_date`
   - `valid_till` (with expiry indicator)
   - `grand_total` (formatted currency)
   - `status` (Status Badge)

### Status Badge Colors:
```typescript
const statusColors: Record<string, string> = {
  "Draft": "secondary",    // Gray
  "Open": "blue",          // Sent to client, awaiting response
  "Ordered": "success",    // Converted to Sales Order
  "Lost": "destructive",   // Client rejected
  "Expired": "warning",    // Past valid_till date
};
```

### Actions:
- Create New Quotation
- Edit (only if Draft)
- Delete (only if Draft)
- View Details

---

## Task 5: Quotation Create Form (CRITICAL - Job Shop Core)

**Path:** `app/sales/quotation/new/page.tsx`

**This is the most important form in Phase 2.**

### Form Sections:

#### Section 1: Header
```typescript
// Required Fields
- quotation_to (FormSelect: ["Customer", "Lead"]) - Default "Customer"
- party_name (FormFrappeSelect: doctype = "Customer" or "Lead" based on quotation_to)
- transaction_date (FormDatePicker, default: today)
- valid_till (FormDatePicker, default: today + 15 days)
- order_type (FormSelect: ["Sales", "Maintenance"]) - Default "Sales"
- company (FormFrappeSelect: "Company")
```

#### Section 2: Address & Contact (CONTEXT-AWARE)
```typescript
// These should filter based on selected Customer using Dynamic Link pattern
- customer_address (FormFrappeSelect: "Address")
  // IMPORTANT: Filter where links contains Customer
  // Use the Dynamic Link server filter pattern from CRM module
  
- contact_person (FormFrappeSelect: "Contact")
  // Same Dynamic Link filter pattern
```

**Implementation Pattern for Address Filtering:**
```typescript
// In the component, watch for party_name changes
const selectedCustomer = form.watch("party_name");

// When fetching addresses, use the filter:
const { data: addresses } = useFrappeList<Address>("Address", {
  filters: selectedCustomer ? [
    ["Dynamic Link", "link_doctype", "=", "Customer"],
    ["Dynamic Link", "link_name", "=", selectedCustomer]
  ] : [],
  limit: 50,
});
```

#### Section 3: Items Grid (THE CRITICAL PART)
```typescript
// This is a child table editor. Use useFieldArray from react-hook-form.
// Each row represents a Quotation Item

// Per Row Fields:
- item_code (FormFrappeSelect: "Item") - Filter to show service items
- description (FormTextarea) - **CRUCIAL: This is where printing specs go**
  // Example: "Trifold Brochure, 200gsm Glossy, Full Color 2-Sided, 1000 units"
- qty (FormInput: number)
- rate (FormInput: number) - Manual input for job shop pricing
- amount (Calculated: qty * rate, read-only display)

// Row Actions: Add, Remove, Reorder
// Show running total at bottom of grid
```

**Client-Side Totals Calculation:**
```typescript
// In the component
const items = form.watch("items") || [];
const subtotal = items.reduce((acc, item) => {
  return acc + ((item.qty || 0) * (item.rate || 0));
}, 0);
```

#### Section 4: Financials
```typescript
- taxes_and_charges (FormFrappeSelect: "Sales Taxes and Charges Template")
// Note: When selected, backend will auto-calculate taxes on save

// Display (Read Only):
- total_taxes_and_charges (calculated by backend after save)
- grand_total (calculated by backend after save)
```

#### Section 5: Footer
```typescript
- tc_name (FormFrappeSelect: "Terms and Conditions")
// When selected, the terms text should auto-populate
// Show preview of selected terms below the dropdown
```

### Form Defaults:
```typescript
const defaultValues = {
  naming_series: "SAL-QTN-.YYYY.-",
  quotation_to: "Customer",
  transaction_date: new Date().toISOString().split('T')[0],
  valid_till: addDays(new Date(), 15).toISOString().split('T')[0],
  order_type: "Sales",
  status: "Draft",
  currency: "ETB", // Ethiopian Birr or your default
  conversion_rate: 1,
  selling_price_list: "Standard Selling",
  price_list_currency: "ETB",
  plc_conversion_rate: 1,
  items: [],
};
```

---

## Task 6: Quotation Edit Form

**Path:** `app/sales/quotation/[name]/edit/page.tsx`

- Identical structure to create form
- Pre-populate all fields from existing document
- Only allow editing if `status === "Draft"` or `docstatus === 0`
- Show warning if trying to edit submitted quotation

---

## Task 7: Quotation Detail View

**Path:** `app/sales/quotation/[name]/page.tsx`

**Design:** Invoice-like layout (professional, print-ready feel)

### Layout:
1. **Header:** Company logo, Quotation ID, Date, Valid Till
2. **Customer Section:** Customer name, Address, Contact
3. **Items Table:** Item code, Description (with specs), Qty, Rate, Amount
4. **Totals Section:** Subtotal, Tax, Grand Total
5. **Terms Section:** Legal terms text

### Actions (Based on Status):
```typescript
// Draft (docstatus: 0)
- Edit
- Delete
- Submit (→ changes docstatus to 1, status to "Open")

// Open (docstatus: 1, status: "Open")
- Mark as Lost (→ prompt for lost reason, update status)
- Create Sales Order (→ placeholder for Phase 3)
- Print/Download

// Ordered
- View linked Sales Order

// Lost
- View lost reason
```

### Mark as Lost Flow:
```typescript
// When user clicks "Mark as Lost":
1. Show ConfirmDialog with lost reason input
2. Options: "Competitor Quoted Lower", "Customer Changed Requirements", "Budget Constraints", "Other"
3. On confirm, update:
   - status: "Lost"
   - order_lost_reason: selectedReason
```

---

## Critical Implementation Notes

### 1. Schema Integrity (FROM CRM LEARNINGS)
Always ensure CreateSchema includes all fields that will be submitted. `zodResolver` silently drops undefined schema fields.

### 2. Server-Side Filtering for Dynamic Links
Never client-side filter addresses/contacts. Use:
```typescript
filters: [
  ["Dynamic Link", "link_doctype", "=", "Customer"],
  ["Dynamic Link", "link_name", "=", customerName]
]
```

### 3. Component Usage
- **Detail Pages:** Use `DataPoint` for read-only display
- **Form Pages:** Use `FormInput`, `FormFrappeSelect`, etc.

### 4. Currency Formatting
Use Intl.NumberFormat for displaying amounts:
```typescript
const formatCurrency = (amount: number, currency = "ETB") => {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
  }).format(amount);
};
```

### 5. Child Table Items
The `items` array in Quotation is a child table. Each item should have:
```typescript
interface QuotationItem {
  item_code: string;
  item_name?: string;
  description: string;  // Technical specs here!
  qty: number;
  rate: number;
  amount: number;
  stock_uom?: string;
}
```

---

## File Structure Summary

```
app/sales/
├── quotation/
│   ├── page.tsx                   # List View
│   ├── new/page.tsx               # Create Form
│   └── [name]/
│       ├── page.tsx               # Detail View
│       └── edit/page.tsx          # Edit Form
│
├── sales-order/
│   └── page.tsx                   # List View (placeholder)
│
└── settings/
    ├── page.tsx                   # Settings Hub
    ├── terms/
    │   ├── page.tsx               # List
    │   ├── new/page.tsx           # Create
    │   └── [name]/edit/page.tsx   # Edit
    └── taxes/
        ├── page.tsx               # List
        ├── new/page.tsx           # Create
        └── [name]/edit/page.tsx   # Edit
```

---

## Testing Verification

After implementation:

1. **Create Tax Template:** "VAT 15%" for your default company
2. **Create Terms:** "Standard Printing Terms" with text like "50% advance required"
3. **Create Quotation:**
   - Select existing customer from CRM
   - Verify address/contact filtering works
   - Add item with detailed description (printing specs)
   - Select tax template and terms
   - Save and verify totals

---

## Next Phase Preview

**Phase 3: Sales Order**
- Convert Quotation to Sales Order
- Handle Sales Order workflow
- Link to Delivery Note and Invoice

---

*This document serves as the comprehensive implementation guide for Phase 2 of Pana ERP v3.0 development.*
