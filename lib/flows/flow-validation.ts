// lib/flows/flow-validation.ts
// Obsidian ERP v4.0 - Per-Step Zod Validation
// Validates wizard steps using Zod schemas before allowing progression

import { z } from "zod";

/**
 * Step validation result
 */
export interface StepValidationResult {
  /** Whether the step is valid */
  valid: boolean;
  /** Field-level errors */
  errors: Record<string, string>;
  /** Overall step error message (if any) */
  message?: string;
}

/**
 * Sales Order step schemas
 * Each step in the wizard has its own Zod schema
 */
export const salesOrderStepSchemas = {
  /** Step 1: Customer & Dates */
  step1: z.object({
    customer: z.string().min(1, "Customer is required"),
    transaction_date: z.string().min(1, "Transaction date is required"),
    delivery_date: z.string().min(1, "Delivery date is required"),
    currency: z.string().optional(),
    selling_price_list: z.string().optional(),
    order_type: z.string().optional(),
    territory: z.string().optional(),
    customer_address: z.string().optional(),
    shipping_address_name: z.string().optional(),
    contact_person: z.string().optional(),
  }),

  /** Step 2: Items */
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().min(0, "Rate must be non-negative"),
          amount: z.number().optional(),
          uom: z.string().optional(),
          warehouse: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .min(1, "At least one item is required"),
  }),

  /** Step 3: Review & Submit */
  step3: z.object({
    // Step 3 is read-only review — always valid
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Quotation step schemas
 */
export const quotationStepSchemas = {
  step1: z.object({
    party_name: z.string().min(1, "Customer/Lead is required"),
    transaction_date: z.string().min(1, "Transaction date is required"),
    valid_till: z.string().min(1, "Valid till date is required"),
    quotation_to: z.string().optional(),
    order_type: z.string().optional(),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().min(0, "Rate must be non-negative"),
        })
      )
      .min(1, "At least one item is required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Delivery Note step schemas
 */
export const deliveryNoteStepSchemas = {
  step1: z.object({
    customer: z.string().min(1, "Customer is required"),
    posting_date: z.string().min(1, "Posting date is required"),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          warehouse: z.string().min(1, "Warehouse is required"),
        })
      )
      .min(1, "At least one item is required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Sales Invoice step schemas
 */
export const salesInvoiceStepSchemas = {
  step1: z.object({
    customer: z.string().min(1, "Customer is required"),
    posting_date: z.string().min(1, "Posting date is required"),
    due_date: z.string().min(1, "Due date is required"),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().min(0, "Rate must be non-negative"),
        })
      )
      .min(1, "At least one item is required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Material Request step schemas
 */
export const materialRequestStepSchemas = {
  step1: z.object({
    material_request_type: z.string().min(1, "Request type is required"),
    transaction_date: z.string().min(1, "Transaction date is required"),
    schedule_date: z.string().min(1, "Required by date is required"),
    set_from_warehouse: z.string().optional(),
    set_warehouse: z.string().optional(),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          uom: z.string().optional(),
          warehouse: z.string().optional(),
          schedule_date: z.string().optional(),
        })
      )
      .min(1, "At least one item is required"),
  }),
};

/**
 * Stock Entry step schemas
 */
export const stockEntryStepSchemas = {
  step1: z.object({
    purpose: z.string().min(1, "Purpose is required"),
    posting_date: z.string().min(1, "Posting date is required"),
    from_warehouse: z.string().optional(),
    to_warehouse: z.string().optional(),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().optional(),
          amount: z.number().optional(),
          uom: z.string().optional(),
          s_warehouse: z.string().optional(),
          t_warehouse: z.string().optional(),
          basic_rate: z.number().optional(),
        })
      )
      .min(1, "At least one item is required"),
  }),
};

/**
 * Purchase Invoice step schemas
 */
export const purchaseInvoiceStepSchemas = {
  step1: z.object({
    supplier: z.string().min(1, "Supplier is required"),
    posting_date: z.string().min(1, "Posting date is required"),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().min(0, "Rate must be non-negative"),
        })
      )
      .min(1, "At least one item is required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Payment Entry step schemas
 */
export const paymentEntryStepSchemas = {
  step1: z.object({
    payment_type: z.string().min(1, "Payment type is required"),
    party_type: z.string().min(1, "Party type is required"),
    party: z.string().min(1, "Party is required"),
    paid_amount: z.number().min(0.01, "Amount must be greater than 0"),
    mode_of_payment: z.string().min(1, "Mode of payment is required"),
  }),
  step2: z.object({
    references: z.array(z.object({
      reference_doctype: z.string(),
      reference_name: z.string(),
      allocated_amount: z.number(),
    })).optional(),
  }),
  step3: z.object({
    posting_date: z.string().min(1, "Posting date is required"),
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Journal Entry step schemas
 */
export const journalEntryStepSchemas = {
  step1: z.object({
    voucher_type: z.string().min(1, "Voucher type is required"),
    posting_date: z.string().min(1, "Posting date is required"),
  }),
  step2: z.object({
    accounts: z
      .array(
        z.object({
          account: z.string().min(1, "Account is required"),
          debit_in_account_currency: z.number().min(0).optional(),
          credit_in_account_currency: z.number().min(0).optional(),
        })
      )
      .min(2, "At least two accounts required"),
  }),
};

/**
 * Purchase Order step schemas
 */
export const purchaseOrderStepSchemas = {
  step1: z.object({
    supplier: z.string().min(1, "Supplier is required"),
    transaction_date: z.string().min(1, "Transaction date is required"),
    schedule_date: z.string().min(1, "Required by date is required"),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().min(0, "Rate must be non-negative"),
          warehouse: z.string().optional(),
        })
      )
      .min(1, "At least one item is required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Request for Quotation step schemas
 */
export const rfqStepSchemas = {
  step1: z.object({
    transaction_date: z.string().min(1, "Transaction date is required"),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
        })
      )
      .min(1, "At least one item is required"),
    suppliers: z
      .array(
        z.object({
          supplier: z.string().min(1, "Supplier is required"),
        })
      )
      .min(1, "At least one supplier required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Supplier Quotation step schemas
 */
export const supplierQuotationStepSchemas = {
  step1: z.object({
    supplier: z.string().min(1, "Supplier is required"),
    transaction_date: z.string().min(1, "Transaction date is required"),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().min(0.01, "Rate must be greater than 0"),
        })
      )
      .min(1, "At least one item is required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * BOM step schemas
 */
export const bomStepSchemas = {
  step1: z.object({
    item: z.string().min(1, "Item is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    is_active: z.coerce.number().optional(),
    is_default: z.coerce.number().optional(),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.coerce.number().min(0, "Rate must be non-negative"),
          uom: z.string().optional(),
          amount: z.coerce.number().optional(),
          source_warehouse: z.string().optional(),
        })
      )
      .min(1, "At least one material is required"),
    operations: z
      .array(
        z.object({
          operation: z.string().min(1, "Operation is required"),
          workstation: z.string().optional(),
          time_in_mins: z.coerce.number().min(0).default(0),
          operating_cost: z.coerce.number().optional(),
        })
      )
      .optional(),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Lead step schemas
 */
export const leadStepSchemas = {
  step1: z.object({
    lead_name: z.string().min(1, "Lead name is required"),
    company_name: z.string().optional(),
    mobile_no: z.string().optional(),
    email_id: z.string().optional(),
  }),
  step2: z.object({
    source: z.string().optional(),
    territory: z.string().optional(),
    industry: z.string().optional(),
    notes: z.string().optional(),
  }),
};

/**
 * Opportunity step schemas
 */
export const opportunityStepSchemas = {
  step1: z.object({
    opportunity_from: z.string().min(1, "Source type is required"),
    party_name: z.string().min(1, "Lead/Customer is required"),
    transaction_date: z.string().min(1, "Date is required"),
  }),
  step2: z.object({
    opportunity_type: z.string().min(1, "Opportunity type is required"),
    sales_stage: z.string().optional(),
    probability: z.number().optional(),
    expected_closing: z.string().optional(),
    items: z.array(z.object({
      item_code: z.string().min(1, "Item is required"),
      qty: z.number().min(0.01).optional(),
      rate: z.number().min(0).optional(),
    })).optional(),
  }),
};

/**
 * Purchase Receipt step schemas (Phase 2H — inbound goods)
 * Mirrors Delivery Note but for supplier deliveries.
 */
export const purchaseReceiptStepSchemas = {
  step1: z.object({
    supplier: z.string().min(1, "Supplier is required"),
    posting_date: z.string().min(1, "Posting date is required"),
  }),
  step2: z.object({
    items: z
      .array(
        z.object({
          item_code: z.string().min(1, "Item code is required"),
          qty: z.number().min(0.01, "Quantity must be greater than 0"),
          rate: z.number().min(0, "Rate must be non-negative").optional(),
          warehouse: z.string().min(1, "Warehouse is required"),
        })
      )
      .min(1, "At least one item is required"),
  }),
  step3: z.object({
    confirmed: z.boolean().optional(),
  }),
};

/**
 * Work Order step schemas
 */
export const workOrderStepSchemas = {
  step1: z.object({
    production_item: z.string().min(1, "Production item is required"),
    bom_no: z.string().min(1, "BOM is required"),
    qty: z.coerce.number().min(1, "Quantity must be at least 1"),
    sales_order: z.string().optional(),
    expected_delivery_date: z.string().optional(),
  }),
  step2: z.object({
    fg_warehouse: z.string().min(1, "Target warehouse is required"),
    wip_warehouse: z.string().optional(),
    source_warehouse: z.string().optional(),
    planned_start_date: z.string().min(1, "Planned start date is required"),
  }),
};

/**
 * All step schemas indexed by doctype
 */
export const WIZARD_STEP_SCHEMAS: Record<string, Record<string, z.ZodType>> = {
  "Sales Order": salesOrderStepSchemas,
  "Quotation": quotationStepSchemas,
  "Delivery Note": deliveryNoteStepSchemas,
  "Sales Invoice": salesInvoiceStepSchemas,
  "Purchase Invoice": purchaseInvoiceStepSchemas,
  "Payment Entry": paymentEntryStepSchemas,
  "Journal Entry": journalEntryStepSchemas,
  "Material Request": materialRequestStepSchemas,
  "Stock Entry": stockEntryStepSchemas,
  "Purchase Order": purchaseOrderStepSchemas,
  "Request for Quotation": rfqStepSchemas,
  "Supplier Quotation": supplierQuotationStepSchemas,
  "BOM": bomStepSchemas,
  "Work Order": workOrderStepSchemas,
  "Lead": leadStepSchemas,
  "Opportunity": opportunityStepSchemas,
  "Purchase Receipt": purchaseReceiptStepSchemas,
};

/**
 * Validate a single wizard step
 *
 * @param doctype - The doctype being created
 * @param stepId - The step ID (e.g., "step1", "step2")
 * @param data - The form data for this step
 * @returns StepValidationResult with errors if invalid
 */
export function validateWizardStep(
  doctype: string,
  stepId: string,
  data: unknown
): StepValidationResult {
  const schemas = WIZARD_STEP_SCHEMAS[doctype];
  if (!schemas) {
    return { valid: true, errors: {} };
  }

  const schema = schemas[stepId];
  if (!schema) {
    return { valid: true, errors: {} };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }

  return {
    valid: false,
    errors,
    message: `Validation failed: ${result.error.issues.length} error(s)`,
  };
}

/**
 * Validate all steps of a wizard
 *
 * @param doctype - The doctype being created
 * @param allData - All form data organized by step
 * @returns Map of step ID → validation result
 */
export function validateAllSteps(
  doctype: string,
  allData: Record<string, unknown>
): Record<string, StepValidationResult> {
  const schemas = WIZARD_STEP_SCHEMAS[doctype];
  if (!schemas) return {};

  const results: Record<string, StepValidationResult> = {};

  for (const stepId of Object.keys(schemas)) {
    results[stepId] = validateWizardStep(doctype, stepId, allData[stepId]);
  }

  return results;
}

/**
 * Check if all steps are valid
 */
export function allStepsValid(
  results: Record<string, StepValidationResult>
): boolean {
  return Object.values(results).every((r) => r.valid);
}
