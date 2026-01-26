# Phase G: Accounting & Finance - Part 1 (Configuration & Schemas)

> **Version:** 1.0.0  
> **Module:** Accounting & Finance  
> **Priority:** 🔴 Critical (Final MVP Module)  
> **Dependencies:** Customer, Supplier, Delivery Note, Sales Order, Purchase Order

---

## 1. DocType Configuration

### 1.1 Update `lib/doctype-config.ts`

```typescript
// ============================================================================
// ACCOUNTING MODULE
// ============================================================================

// TRANSACTION DOCUMENTS
"Sales Invoice": {
  apiPath: "accounting/sales-invoice",
  module: "Accounting",
  labelField: "name",
  searchFields: ["name", "customer", "customer_name", "status"],
  defaultSortField: "posting_date",
  defaultSortOrder: "desc",
},
"Sales Invoice Item": {
  apiPath: "accounting/sales-invoice-item",
  module: "Accounting",
  labelField: "item_code",
  isSettings: true,
},
"Purchase Invoice": {
  apiPath: "accounting/purchase-invoice",
  module: "Accounting",
  labelField: "name",
  searchFields: ["name", "supplier", "supplier_name", "status", "bill_no"],
  defaultSortField: "posting_date",
  defaultSortOrder: "desc",
},
"Purchase Invoice Item": {
  apiPath: "accounting/purchase-invoice-item",
  module: "Accounting",
  labelField: "item_code",
  isSettings: true,
},
"Payment Entry": {
  apiPath: "accounting/payment-entry",
  module: "Accounting",
  labelField: "name",
  searchFields: ["name", "party", "party_name", "mode_of_payment"],
  defaultSortField: "posting_date",
  defaultSortOrder: "desc",
},
"Payment Entry Reference": {
  apiPath: "accounting/payment-entry-reference",
  module: "Accounting",
  isSettings: true,
},
"Journal Entry": {
  apiPath: "accounting/journal-entry",
  module: "Accounting",
  labelField: "name",
  searchFields: ["name", "voucher_type", "cheque_no"],
  defaultSortField: "posting_date",
  defaultSortOrder: "desc",
},
"Journal Entry Account": {
  apiPath: "accounting/journal-entry-account",
  module: "Accounting",
  isSettings: true,
},

// SETUP/MASTER DATA
Account: {
  apiPath: "accounting/setup/account",
  module: "Accounting",
  labelField: "account_name",
  searchFields: ["account_name", "account_number", "account_type"],
  isSettings: true,
},
"Cost Center": {
  apiPath: "accounting/setup/cost-center",
  module: "Accounting",
  labelField: "cost_center_name",
  searchFields: ["cost_center_name"],
  isSettings: true,
},
"Mode of Payment": {
  apiPath: "accounting/setup/mode-of-payment",
  module: "Accounting",
  labelField: "mode_of_payment",
  searchFields: ["mode_of_payment"],
  isSettings: true,
},
"Payment Terms Template": {
  apiPath: "accounting/setup/payment-terms-template",
  module: "Accounting",
  labelField: "template_name",
  searchFields: ["template_name"],
  isSettings: true,
},
"Fiscal Year": {
  apiPath: "accounting/setup/fiscal-year",
  module: "Accounting",
  labelField: "year",
  searchFields: ["year"],
  isSettings: true,
},
```

---

## 2. Query Keys

### 2.1 Update `lib/query-keys.ts`

```typescript
// ============================================================================
// ACCOUNTING MODULE
// ============================================================================

// Sales Invoice
salesInvoice: {
  all: () => ["Sales Invoice"] as const,
  list: (options?: FrappeListOptions) => ["Sales Invoice", "list", options] as const,
  doc: (name: string) => ["Sales Invoice", "doc", name] as const,
  byCustomer: (customer: string) => ["Sales Invoice", "list", "customer", customer] as const,
  byStatus: (status: string) => ["Sales Invoice", "list", "status", status] as const,
  byDeliveryNote: (dn: string) => ["Sales Invoice", "list", "delivery_note", dn] as const,
  bySalesOrder: (so: string) => ["Sales Invoice", "list", "sales_order", so] as const,
  overdue: () => ["Sales Invoice", "list", "overdue"] as const,
  unpaid: () => ["Sales Invoice", "list", "unpaid"] as const,
},

// Purchase Invoice
purchaseInvoice: {
  all: () => ["Purchase Invoice"] as const,
  list: (options?: FrappeListOptions) => ["Purchase Invoice", "list", options] as const,
  doc: (name: string) => ["Purchase Invoice", "doc", name] as const,
  bySupplier: (supplier: string) => ["Purchase Invoice", "list", "supplier", supplier] as const,
  byStatus: (status: string) => ["Purchase Invoice", "list", "status", status] as const,
  overdue: () => ["Purchase Invoice", "list", "overdue"] as const,
  unpaid: () => ["Purchase Invoice", "list", "unpaid"] as const,
},

// Payment Entry
paymentEntry: {
  all: () => ["Payment Entry"] as const,
  list: (options?: FrappeListOptions) => ["Payment Entry", "list", options] as const,
  doc: (name: string) => ["Payment Entry", "doc", name] as const,
  byParty: (partyType: string, party: string) => ["Payment Entry", "list", partyType, party] as const,
  byType: (paymentType: string) => ["Payment Entry", "list", "type", paymentType] as const,
  forInvoice: (doctype: string, name: string) => ["Payment Entry", "list", "invoice", doctype, name] as const,
},

// Journal Entry
journalEntry: {
  all: () => ["Journal Entry"] as const,
  list: (options?: FrappeListOptions) => ["Journal Entry", "list", options] as const,
  doc: (name: string) => ["Journal Entry", "doc", name] as const,
  byType: (voucherType: string) => ["Journal Entry", "list", "type", voucherType] as const,
},

// Account (Chart of Accounts)
account: {
  all: () => ["Account"] as const,
  list: (options?: FrappeListOptions) => ["Account", "list", options] as const,
  doc: (name: string) => ["Account", "doc", name] as const,
  tree: (company: string) => ["Account", "tree", company] as const,
  byType: (accountType: string) => ["Account", "list", "type", accountType] as const,
  receivable: (company: string) => ["Account", "list", "receivable", company] as const,
  payable: (company: string) => ["Account", "list", "payable", company] as const,
  bank: (company: string) => ["Account", "list", "bank", company] as const,
  cash: (company: string) => ["Account", "list", "cash", company] as const,
},

// Cost Center
costCenter: {
  all: () => ["Cost Center"] as const,
  list: (options?: FrappeListOptions) => ["Cost Center", "list", options] as const,
  doc: (name: string) => ["Cost Center", "doc", name] as const,
  tree: (company: string) => ["Cost Center", "tree", company] as const,
},

// Mode of Payment
modeOfPayment: {
  all: () => ["Mode of Payment"] as const,
  list: (options?: FrappeListOptions) => ["Mode of Payment", "list", options] as const,
  doc: (name: string) => ["Mode of Payment", "doc", name] as const,
  enabled: () => ["Mode of Payment", "list", "enabled"] as const,
},

// Payment Terms Template
paymentTermsTemplate: {
  all: () => ["Payment Terms Template"] as const,
  list: (options?: FrappeListOptions) => ["Payment Terms Template", "list", options] as const,
  doc: (name: string) => ["Payment Terms Template", "doc", name] as const,
},

// Fiscal Year
fiscalYear: {
  all: () => ["Fiscal Year"] as const,
  list: (options?: FrappeListOptions) => ["Fiscal Year", "list", options] as const,
  current: () => ["Fiscal Year", "current"] as const,
},
```

---

## 3. Zod Schemas

### 3.1 Add to `lib/schemas/doctype-schemas.ts`

```typescript
// ============================================================================
// ACCOUNTING SCHEMAS
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT (Chart of Accounts)
// ─────────────────────────────────────────────────────────────────────────────

export const AccountCreateSchema = z.object({
  account_name: z.string().min(1, "Account name is required"),
  account_number: z.string().optional(),
  parent_account: z.string().min(1, "Parent account is required"),
  company: z.string().min(1, "Company is required"),
  root_type: z
    .enum(["Asset", "Liability", "Income", "Expense", "Equity"])
    .optional(),
  report_type: z.enum(["Balance Sheet", "Profit and Loss"]).optional(),
  account_type: z.string().optional(),
  account_currency: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).default(0),
  freeze_account: z.enum(["No", "Yes"]).default("No"),
  balance_must_be: z.enum(["Debit", "Credit"]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const AccountUpdateSchema = AccountCreateSchema.partial();
export type AccountFormData = z.input<typeof AccountCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// COST CENTER
// ─────────────────────────────────────────────────────────────────────────────

export const CostCenterCreateSchema = z.object({
  cost_center_name: z.string().min(1, "Cost center name is required"),
  cost_center_number: z.string().optional(),
  parent_cost_center: z.string().min(1, "Parent cost center is required"),
  company: z.string().min(1, "Company is required"),
  is_group: z.union([z.literal(0), z.literal(1)]).default(0),
  disabled: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const CostCenterUpdateSchema = CostCenterCreateSchema.partial();
export type CostCenterFormData = z.input<typeof CostCenterCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MODE OF PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

export const ModeOfPaymentAccountSchema = z.object({
  company: z.string().min(1),
  default_account: z.string().min(1),
});

export const ModeOfPaymentCreateSchema = z.object({
  mode_of_payment: z.string().min(1, "Mode of payment name is required"),
  type: z.enum(["Cash", "Bank", "General", "Phone"]).default("General"),
  enabled: z.union([z.literal(0), z.literal(1)]).default(1),
  accounts: z.array(ModeOfPaymentAccountSchema).optional(),
});

export const ModeOfPaymentUpdateSchema = ModeOfPaymentCreateSchema.partial();
export type ModeOfPaymentFormData = z.input<typeof ModeOfPaymentCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT TERMS TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentTermSchema = z.object({
  payment_term: z.string().optional(),
  description: z.string().optional(),
  invoice_portion: z.number().min(0).max(100),
  due_date_based_on: z
    .enum([
      "Day(s) after invoice date",
      "Day(s) after the end of the invoice month",
      "Month(s) after the end of the invoice month",
    ])
    .default("Day(s) after invoice date"),
  credit_days: z.number().min(0).default(0),
  credit_months: z.number().min(0).default(0),
  mode_of_payment: z.string().optional(),
});

export const PaymentTermsTemplateCreateSchema = z.object({
  template_name: z.string().min(1, "Template name is required"),
  allocate_payment_based_on_payment_terms: z
    .union([z.literal(0), z.literal(1)])
    .default(0),
  terms: z
    .array(PaymentTermSchema)
    .min(1, "At least one payment term is required"),
});

export const PaymentTermsTemplateUpdateSchema =
  PaymentTermsTemplateCreateSchema.partial();
export type PaymentTermsTemplateFormData = z.input<
  typeof PaymentTermsTemplateCreateSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// SALES INVOICE ITEM
// ─────────────────────────────────────────────────────────────────────────────

export const SalesInvoiceItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.number().min(0.001, "Quantity must be greater than 0"),
  uom: z.string().optional(),
  rate: z.number().min(0, "Rate must be 0 or greater"),
  amount: z.number().optional(),
  income_account: z.string().optional(),
  cost_center: z.string().optional(),
  warehouse: z.string().optional(),
  // From Delivery Note / Sales Order
  delivery_note: z.string().optional(),
  dn_detail: z.string().optional(),
  sales_order: z.string().optional(),
  so_detail: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SALES INVOICE
// ─────────────────────────────────────────────────────────────────────────────

export const SalesInvoiceCreateSchema = z.object({
  naming_series: z
    .enum(["ACC-SINV-.YYYY.-", "ACC-SINV-RET-.YYYY.-"])
    .default("ACC-SINV-.YYYY.-"),
  customer: z.string().min(1, "Customer is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  posting_time: z.string().optional(),
  due_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),

  // Items
  items: z
    .array(SalesInvoiceItemSchema)
    .min(1, "At least one item is required"),

  // Accounting
  debit_to: z.string().min(1, "Debit To (Receivable Account) is required"),
  cost_center: z.string().optional(),

  // Pricing
  currency: z.string().default("ETB"),
  conversion_rate: z.number().default(1),
  selling_price_list: z.string().optional(),
  price_list_currency: z.string().optional(),
  plc_conversion_rate: z.number().optional(),

  // Taxes
  taxes_and_charges: z.string().optional(),
  taxes: z.array(z.any()).optional(),

  // Discounts
  apply_discount_on: z.enum(["Grand Total", "Net Total"]).optional(),
  additional_discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),

  // Terms
  payment_terms_template: z.string().optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),

  // POS Mode
  is_pos: z.union([z.literal(0), z.literal(1)]).default(0),
  pos_profile: z.string().optional(),
  payments: z.array(z.any()).optional(),

  // Returns
  is_return: z.union([z.literal(0), z.literal(1)]).default(0),
  return_against: z.string().optional(),

  // Addresses
  customer_address: z.string().optional(),
  shipping_address_name: z.string().optional(),

  // Reference
  po_no: z.string().optional(),
  po_date: z.string().optional(),
  project: z.string().optional(),
  remarks: z.string().optional(),
});

export const SalesInvoiceUpdateSchema = SalesInvoiceCreateSchema.partial();
export type SalesInvoiceFormData = z.input<typeof SalesInvoiceCreateSchema>;
export type SalesInvoiceItemData = z.input<typeof SalesInvoiceItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE INVOICE ITEM
// ─────────────────────────────────────────────────────────────────────────────

export const PurchaseInvoiceItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.number().min(0.001, "Quantity must be greater than 0"),
  uom: z.string().optional(),
  rate: z.number().min(0, "Rate must be 0 or greater"),
  amount: z.number().optional(),
  expense_account: z.string().optional(),
  cost_center: z.string().optional(),
  warehouse: z.string().optional(),
  // From Purchase Order / Receipt
  purchase_order: z.string().optional(),
  po_detail: z.string().optional(),
  purchase_receipt: z.string().optional(),
  pr_detail: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE INVOICE
// ─────────────────────────────────────────────────────────────────────────────

export const PurchaseInvoiceCreateSchema = z.object({
  naming_series: z.string().default("ACC-PINV-.YYYY.-"),
  supplier: z.string().min(1, "Supplier is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  posting_time: z.string().optional(),
  due_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),

  // Vendor Reference
  bill_no: z.string().optional(),
  bill_date: z.string().optional(),

  // Items
  items: z
    .array(PurchaseInvoiceItemSchema)
    .min(1, "At least one item is required"),

  // Accounting
  credit_to: z.string().min(1, "Credit To (Payable Account) is required"),
  cost_center: z.string().optional(),

  // Pricing
  currency: z.string().default("ETB"),
  conversion_rate: z.number().default(1),
  buying_price_list: z.string().optional(),

  // Taxes
  taxes_and_charges: z.string().optional(),
  taxes: z.array(z.any()).optional(),

  // Terms
  payment_terms_template: z.string().optional(),

  // Returns
  is_return: z.union([z.literal(0), z.literal(1)]).default(0),
  return_against: z.string().optional(),

  // Reference
  project: z.string().optional(),
  remarks: z.string().optional(),
});

export const PurchaseInvoiceUpdateSchema =
  PurchaseInvoiceCreateSchema.partial();
export type PurchaseInvoiceFormData = z.input<
  typeof PurchaseInvoiceCreateSchema
>;
export type PurchaseInvoiceItemData = z.input<typeof PurchaseInvoiceItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT ENTRY REFERENCE (Child Table)
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentEntryReferenceSchema = z.object({
  reference_doctype: z.enum([
    "Sales Invoice",
    "Purchase Invoice",
    "Sales Order",
    "Purchase Order",
    "Journal Entry",
  ]),
  reference_name: z.string().min(1, "Reference document is required"),
  due_date: z.string().optional(),
  total_amount: z.number().optional(),
  outstanding_amount: z.number().optional(),
  allocated_amount: z
    .number()
    .min(0.01, "Allocated amount must be greater than 0"),
  exchange_rate: z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentEntryCreateSchema = z.object({
  naming_series: z.string().default("ACC-PAY-.YYYY.-"),
  payment_type: z.enum(["Receive", "Pay", "Internal Transfer"]),
  posting_date: z.string().min(1, "Posting date is required"),
  company: z.string().min(1, "Company is required"),

  // Party (required for Receive/Pay)
  party_type: z.string().optional(),
  party: z.string().optional(),

  // Accounts
  paid_from: z.string().min(1, "Paid From account is required"),
  paid_from_account_currency: z.string().default("ETB"),
  paid_to: z.string().min(1, "Paid To account is required"),
  paid_to_account_currency: z.string().default("ETB"),

  // Amounts
  paid_amount: z.number().min(0.01, "Paid amount must be greater than 0"),
  received_amount: z
    .number()
    .min(0.01, "Received amount must be greater than 0"),
  source_exchange_rate: z.number().default(1),
  target_exchange_rate: z.number().default(1),

  // Mode of Payment
  mode_of_payment: z.string().optional(),

  // Reference (Check, Transfer, etc)
  reference_no: z.string().optional(),
  reference_date: z.string().optional(),

  // Allocations
  references: z.array(PaymentEntryReferenceSchema).optional(),

  // Other
  cost_center: z.string().optional(),
  project: z.string().optional(),
  remarks: z.string().optional(),
});

export const PaymentEntryUpdateSchema = PaymentEntryCreateSchema.partial();
export type PaymentEntryFormData = z.input<typeof PaymentEntryCreateSchema>;
export type PaymentEntryReferenceData = z.input<
  typeof PaymentEntryReferenceSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL ENTRY ACCOUNT (Child Table)
// ─────────────────────────────────────────────────────────────────────────────

export const JournalEntryAccountSchema = z.object({
  account: z.string().min(1, "Account is required"),
  party_type: z.string().optional(),
  party: z.string().optional(),
  cost_center: z.string().optional(),
  project: z.string().optional(),
  debit_in_account_currency: z.number().min(0).default(0),
  credit_in_account_currency: z.number().min(0).default(0),
  user_remark: z.string().optional(),
  reference_type: z.string().optional(),
  reference_name: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export const JournalEntryCreateSchema = z.object({
  naming_series: z.string().default("ACC-JV-.YYYY.-"),
  voucher_type: z
    .enum([
      "Journal Entry",
      "Inter Company Journal Entry",
      "Bank Entry",
      "Cash Entry",
      "Credit Card Entry",
      "Debit Note",
      "Credit Note",
      "Contra Entry",
      "Excise Entry",
      "Write Off Entry",
      "Opening Entry",
      "Depreciation Entry",
      "Exchange Rate Revaluation",
      "Exchange Gain Or Loss",
      "Deferred Revenue",
      "Deferred Expense",
    ])
    .default("Journal Entry"),
  posting_date: z.string().min(1, "Posting date is required"),
  company: z.string().min(1, "Company is required"),

  // Accounts (must balance)
  accounts: z
    .array(JournalEntryAccountSchema)
    .min(2, "At least two account entries required"),

  // Reference
  cheque_no: z.string().optional(),
  cheque_date: z.string().optional(),
  user_remark: z.string().optional(),

  // Mode
  mode_of_payment: z.string().optional(),

  // Multi-currency
  multi_currency: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const JournalEntryUpdateSchema = JournalEntryCreateSchema.partial();
export type JournalEntryFormData = z.input<typeof JournalEntryCreateSchema>;
export type JournalEntryAccountData = z.input<typeof JournalEntryAccountSchema>;
```

---

## 4. Status Configurations

### 4.1 Sales Invoice Status

```typescript
export const SALES_INVOICE_STATUS_CONFIG = {
  Draft: {
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
    icon: Pencil,
    description: "Not submitted",
  },
  Unpaid: {
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    border: "border-amber-200 dark:border-amber-800/50",
    icon: Clock,
    description: "Awaiting payment",
  },
  "Partly Paid": {
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/10",
    border: "border-blue-200 dark:border-blue-800/50",
    icon: CreditCard,
    description: "Partial payment received",
  },
  Paid: {
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/10",
    border: "border-emerald-200 dark:border-emerald-800/50",
    icon: CheckCircle2,
    description: "Fully paid",
  },
  Overdue: {
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-900/10",
    border: "border-red-200 dark:border-red-800/50",
    icon: AlertTriangle,
    description: "Past due date",
  },
  Return: {
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-900/10",
    border: "border-purple-200 dark:border-purple-800/50",
    icon: RotateCcw,
    description: "Credit note",
  },
  "Credit Note Issued": {
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-900/10",
    border: "border-orange-200 dark:border-orange-800/50",
    icon: FileWarning,
    description: "Has credit note against it",
  },
  Cancelled: {
    color: "text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800/50",
    border: "border-gray-200 dark:border-gray-700",
    icon: XCircle,
    description: "Voided",
  },
};
```

### 4.2 Payment Entry Status

```typescript
export const PAYMENT_ENTRY_STATUS_CONFIG = {
  Draft: {
    color: "text-slate-600",
    bg: "bg-slate-50",
    icon: Pencil,
  },
  Submitted: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
  },
  Cancelled: {
    color: "text-gray-400",
    bg: "bg-gray-50",
    icon: XCircle,
  },
};
```

### 4.3 Payment Type Icons

```typescript
export const PAYMENT_TYPE_CONFIG = {
  Receive: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: ArrowDownLeft,
    description: "Receive from Customer",
  },
  Pay: {
    color: "text-red-600",
    bg: "bg-red-50",
    icon: ArrowUpRight,
    description: "Pay to Supplier",
  },
  "Internal Transfer": {
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: ArrowRightLeft,
    description: "Transfer between accounts",
  },
};
```

---

## 5. File Structure

```
app/accounting/
├── page.tsx                        # Dashboard (optional)
├── sales-invoice/
│   ├── page.tsx                    # List with status tabs
│   ├── new/page.tsx                # Create from DN/SO or direct
│   └── [name]/
│       ├── page.tsx                # Detail with payment action
│       └── edit/page.tsx           # Edit (draft only)
├── purchase-invoice/
│   ├── page.tsx                    # List with status tabs
│   ├── new/page.tsx                # Create from PO or direct
│   └── [name]/
│       ├── page.tsx                # Detail with payment action
│       └── edit/page.tsx           # Edit (draft only)
├── payment-entry/
│   ├── page.tsx                    # List with type tabs
│   ├── new/page.tsx                # Create with party selection
│   └── [name]/
│       ├── page.tsx                # Detail
│       └── edit/page.tsx           # Edit (draft only)
├── journal-entry/
│   ├── page.tsx                    # List with type tabs
│   ├── new/page.tsx                # Create with debit/credit rows
│   └── [name]/
│       ├── page.tsx                # Detail
│       └── edit/page.tsx           # Edit (draft only)
└── setup/
    ├── account/
    │   ├── page.tsx                # Tree view
    │   ├── new/page.tsx            # Create
    │   └── [name]/
    │       ├── page.tsx            # Detail
    │       └── edit/page.tsx       # Edit
    ├── cost-center/
    │   ├── page.tsx                # Tree view
    │   ├── new/page.tsx            # Create
    │   └── [name]/
    │       ├── page.tsx            # Detail
    │       └── edit/page.tsx       # Edit
    ├── mode-of-payment/
    │   ├── page.tsx                # List
    │   ├── new/page.tsx            # Create
    │   └── [name]/
    │       ├── page.tsx            # Detail
    │       └── edit/page.tsx       # Edit
    └── payment-terms/
        ├── page.tsx                # List
        ├── new/page.tsx            # Create
        └── [name]/
            ├── page.tsx            # Detail
            └── edit/page.tsx       # Edit
```

---

_See Part 2 for API Routes_
