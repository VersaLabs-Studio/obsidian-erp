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
    company: z.string().min(1, "Company is required"),
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
    company: z.string().min(1, "Company is required"),
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
    company: z.string().min(1, "Company is required"),
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
    company: z.string().min(1, "Company is required"),
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
 * All step schemas indexed by doctype
 */
export const WIZARD_STEP_SCHEMAS: Record<string, Record<string, z.ZodType>> = {
  "Sales Order": salesOrderStepSchemas,
  "Quotation": quotationStepSchemas,
  "Delivery Note": deliveryNoteStepSchemas,
  "Sales Invoice": salesInvoiceStepSchemas,
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
