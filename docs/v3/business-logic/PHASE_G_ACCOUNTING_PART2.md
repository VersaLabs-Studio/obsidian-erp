# Phase G: Accounting & Finance - Part 2 (API Routes)

> **Continuation of PHASE_G_ACCOUNTING_PART1.md**

---

## 6. API Routes

### 6.1 Sales Invoice API

**File:** `app/api/accounting/sales-invoice/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { SalesInvoiceCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Sales Invoice", {
  allowedFields: [
    "name",
    "customer",
    "customer_name",
    "posting_date",
    "due_date",
    "status",
    "grand_total",
    "outstanding_amount",
    "total_qty",
    "currency",
    "is_return",
    "return_against",
    "debit_to",
    "is_pos",
    "paid_amount",
    "company",
    "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Sales Invoice",
  SalesInvoiceCreateSchema,
);
```

**File:** `app/api/accounting/sales-invoice/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { SalesInvoiceUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Sales Invoice");
export const PUT = createUpdateHandler(
  "Sales Invoice",
  SalesInvoiceUpdateSchema,
);
export const DELETE = createDeleteHandler("Sales Invoice");
```

---

### 6.2 Purchase Invoice API

**File:** `app/api/accounting/purchase-invoice/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { PurchaseInvoiceCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Purchase Invoice", {
  allowedFields: [
    "name",
    "supplier",
    "supplier_name",
    "posting_date",
    "due_date",
    "status",
    "grand_total",
    "outstanding_amount",
    "total_qty",
    "bill_no",
    "bill_date",
    "currency",
    "is_return",
    "return_against",
    "credit_to",
    "company",
    "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Purchase Invoice",
  PurchaseInvoiceCreateSchema,
);
```

**File:** `app/api/accounting/purchase-invoice/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { PurchaseInvoiceUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Purchase Invoice");
export const PUT = createUpdateHandler(
  "Purchase Invoice",
  PurchaseInvoiceUpdateSchema,
);
export const DELETE = createDeleteHandler("Purchase Invoice");
```

---

### 6.3 Payment Entry API

**File:** `app/api/accounting/payment-entry/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { PaymentEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Payment Entry", {
  allowedFields: [
    "name",
    "payment_type",
    "posting_date",
    "party_type",
    "party",
    "party_name",
    "paid_amount",
    "received_amount",
    "mode_of_payment",
    "paid_from",
    "paid_to",
    "reference_no",
    "reference_date",
    "status",
    "company",
    "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Payment Entry",
  PaymentEntryCreateSchema,
);
```

**File:** `app/api/accounting/payment-entry/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { PaymentEntryUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Payment Entry");
export const PUT = createUpdateHandler(
  "Payment Entry",
  PaymentEntryUpdateSchema,
);
export const DELETE = createDeleteHandler("Payment Entry");
```

**File:** `app/api/accounting/payment-entry/outstanding/route.ts`

```typescript
// @ts-nocheck
// Special endpoint to get outstanding invoices for a party
import { NextRequest, NextResponse } from "next/server";
import { frappeRequest } from "@/lib/frappe";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partyType = searchParams.get("party_type");
    const party = searchParams.get("party");
    const company = searchParams.get("company");

    if (!partyType || !party) {
      return NextResponse.json(
        { error: "party_type and party are required" },
        { status: 400 },
      );
    }

    // Call ERPNext method to get outstanding documents
    const result = await frappeRequest.call(
      "erpnext.accounts.doctype.payment_entry.payment_entry.get_outstanding_reference_documents",
      {
        args: {
          party_type: partyType,
          party: party,
          company: company,
        },
      },
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch outstanding documents" },
      { status: 500 },
    );
  }
}
```

---

### 6.4 Journal Entry API

**File:** `app/api/accounting/journal-entry/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { JournalEntryCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Journal Entry", {
  allowedFields: [
    "name",
    "voucher_type",
    "posting_date",
    "company",
    "total_debit",
    "total_credit",
    "cheque_no",
    "cheque_date",
    "user_remark",
    "mode_of_payment",
    "docstatus",
    "creation",
  ],
  defaultSort: { field: "posting_date", order: "desc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Journal Entry",
  JournalEntryCreateSchema,
);
```

**File:** `app/api/accounting/journal-entry/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { JournalEntryUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Journal Entry");
export const PUT = createUpdateHandler(
  "Journal Entry",
  JournalEntryUpdateSchema,
);
export const DELETE = createDeleteHandler("Journal Entry");
```

---

### 6.5 Account (Chart of Accounts) API

**File:** `app/api/accounting/setup/account/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { AccountCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Account", {
  allowedFields: [
    "name",
    "account_name",
    "account_number",
    "parent_account",
    "root_type",
    "report_type",
    "account_type",
    "account_currency",
    "is_group",
    "company",
    "disabled",
    "freeze_account",
    "lft",
    "rgt",
  ],
  defaultSort: { field: "lft", order: "asc" },
  defaultLimit: 500, // Chart of Accounts can be large
});

export const POST = createCreateHandler("Account", AccountCreateSchema);
```

**File:** `app/api/accounting/setup/account/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { AccountUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Account");
export const PUT = createUpdateHandler("Account", AccountUpdateSchema);
export const DELETE = createDeleteHandler("Account");
```

**File:** `app/api/accounting/setup/account/balance/route.ts`

```typescript
// @ts-nocheck
// Special endpoint to get account balance
import { NextRequest, NextResponse } from "next/server";
import { frappeRequest } from "@/lib/frappe";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get("account");
    const company = searchParams.get("company");

    if (!account) {
      return NextResponse.json(
        { error: "account is required" },
        { status: 400 },
      );
    }

    // Get GL balance
    const result = await frappeRequest.call(
      "erpnext.accounts.utils.get_balance_on",
      {
        account: account,
        company: company,
      },
    );

    return NextResponse.json({ balance: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch account balance" },
      { status: 500 },
    );
  }
}
```

---

### 6.6 Cost Center API

**File:** `app/api/accounting/setup/cost-center/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { CostCenterCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Cost Center", {
  allowedFields: [
    "name",
    "cost_center_name",
    "cost_center_number",
    "parent_cost_center",
    "company",
    "is_group",
    "disabled",
    "lft",
    "rgt",
  ],
  defaultSort: { field: "lft", order: "asc" },
  defaultLimit: 200,
});

export const POST = createCreateHandler("Cost Center", CostCenterCreateSchema);
```

**File:** `app/api/accounting/setup/cost-center/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { CostCenterUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Cost Center");
export const PUT = createUpdateHandler("Cost Center", CostCenterUpdateSchema);
export const DELETE = createDeleteHandler("Cost Center");
```

---

### 6.7 Mode of Payment API

**File:** `app/api/accounting/setup/mode-of-payment/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { ModeOfPaymentCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Mode of Payment", {
  allowedFields: ["name", "mode_of_payment", "type", "enabled"],
  defaultSort: { field: "mode_of_payment", order: "asc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Mode of Payment",
  ModeOfPaymentCreateSchema,
);
```

**File:** `app/api/accounting/setup/mode-of-payment/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { ModeOfPaymentUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Mode of Payment");
export const PUT = createUpdateHandler(
  "Mode of Payment",
  ModeOfPaymentUpdateSchema,
);
export const DELETE = createDeleteHandler("Mode of Payment");
```

---

### 6.8 Payment Terms Template API

**File:** `app/api/accounting/setup/payment-terms/route.ts`

```typescript
// @ts-nocheck
import { createListHandler, createCreateHandler } from "@/lib/api-factory";
import { PaymentTermsTemplateCreateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createListHandler("Payment Terms Template", {
  allowedFields: [
    "name",
    "template_name",
    "allocate_payment_based_on_payment_terms",
  ],
  defaultSort: { field: "template_name", order: "asc" },
  defaultLimit: 50,
});

export const POST = createCreateHandler(
  "Payment Terms Template",
  PaymentTermsTemplateCreateSchema,
);
```

**File:** `app/api/accounting/setup/payment-terms/[name]/route.ts`

```typescript
// @ts-nocheck
import {
  createGetHandler,
  createUpdateHandler,
  createDeleteHandler,
} from "@/lib/api-factory";
import { PaymentTermsTemplateUpdateSchema } from "@/lib/schemas/doctype-schemas";

export const GET = createGetHandler("Payment Terms Template");
export const PUT = createUpdateHandler(
  "Payment Terms Template",
  PaymentTermsTemplateUpdateSchema,
);
export const DELETE = createDeleteHandler("Payment Terms Template");
```

---

## 7. API File Structure Summary

```
app/api/accounting/
├── sales-invoice/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [name]/route.ts             # GET, PUT, DELETE
├── purchase-invoice/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [name]/route.ts             # GET, PUT, DELETE
├── payment-entry/
│   ├── route.ts                    # GET (list), POST (create)
│   ├── [name]/route.ts             # GET, PUT, DELETE
│   └── outstanding/route.ts        # GET outstanding invoices
├── journal-entry/
│   ├── route.ts                    # GET (list), POST (create)
│   └── [name]/route.ts             # GET, PUT, DELETE
└── setup/
    ├── account/
    │   ├── route.ts                # GET (list), POST (create)
    │   ├── [name]/route.ts         # GET, PUT, DELETE
    │   └── balance/route.ts        # GET account balance
    ├── cost-center/
    │   ├── route.ts                # GET (list), POST (create)
    │   └── [name]/route.ts         # GET, PUT, DELETE
    ├── mode-of-payment/
    │   ├── route.ts                # GET (list), POST (create)
    │   └── [name]/route.ts         # GET, PUT, DELETE
    └── payment-terms/
        ├── route.ts                # GET (list), POST (create)
        └── [name]/route.ts         # GET, PUT, DELETE
```

---

## 8. Helper Hooks for Accounting

### 8.1 Custom Hook: `useOutstandingInvoices`

```typescript
// hooks/use-outstanding-invoices.ts
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface OutstandingInvoice {
  voucher_type: string;
  voucher_no: string;
  due_date: string;
  invoice_amount: number;
  outstanding_amount: number;
  payment_amount: number;
}

export function useOutstandingInvoices(
  partyType: string | undefined,
  party: string | undefined,
  company?: string,
) {
  return useQuery({
    queryKey: ["outstanding", partyType, party, company],
    queryFn: async () => {
      if (!partyType || !party) return [];

      const params = new URLSearchParams({
        party_type: partyType,
        party: party,
        ...(company && { company }),
      });

      const response = await fetch(
        `/api/accounting/payment-entry/outstanding?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch outstanding invoices");

      const data = await response.json();
      return data.data as OutstandingInvoice[];
    },
    enabled: !!partyType && !!party,
  });
}
```

### 8.2 Custom Hook: `useAccountBalance`

```typescript
// hooks/use-account-balance.ts
import { useQuery } from "@tanstack/react-query";

export function useAccountBalance(
  account: string | undefined,
  company?: string,
) {
  return useQuery({
    queryKey: ["account-balance", account, company],
    queryFn: async () => {
      if (!account) return 0;

      const params = new URLSearchParams({
        account: account,
        ...(company && { company }),
      });

      const response = await fetch(
        `/api/accounting/setup/account/balance?${params}`,
      );
      if (!response.ok) throw new Error("Failed to fetch account balance");

      const data = await response.json();
      return data.balance as number;
    },
    enabled: !!account,
  });
}
```

### 8.3 Custom Hook: `useCustomerCreditLimit`

```typescript
// hooks/use-customer-credit.ts
import { useFrappeDoc } from "@/hooks/generic";
import type { Customer } from "@/types/doctype-types";

export function useCustomerCreditCheck(customerName: string | undefined) {
  const { data: customer } = useFrappeDoc<Customer>(
    "Customer",
    customerName || "",
    { enabled: !!customerName },
  );

  const outstanding = customer?.outstanding_amount || 0;
  const creditLimit = customer?.credit_limit || 0;
  const hasLimit = creditLimit > 0;
  const isOverLimit = hasLimit && outstanding > creditLimit;
  const availableCredit = hasLimit ? creditLimit - outstanding : Infinity;

  return {
    customer,
    outstanding,
    creditLimit,
    hasLimit,
    isOverLimit,
    availableCredit,
  };
}
```

---

_See Part 3 for Utility Module Pages (Account, Cost Center, Mode of Payment)_
