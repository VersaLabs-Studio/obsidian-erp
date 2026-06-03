// lib/schemas/form-helpers.ts
// Obsidian ERP v4.0 - Form Schema Factory & Helpers

import { z } from "zod";

/**
 * Create a form schema with sensible defaults for boolean fields
 * This solves the React Hook Form + Zod type inference issue
 *
 * @example
 * ```ts
 * const itemFormSchema = createFormSchema({
 *   item_code: z.string().min(1, "Required"),
 *   item_name: z.string().min(1, "Required"),
 *   item_group: z.string().min(1, "Required"),
 *   stock_uom: z.string().min(1, "Required"),
 *   description: z.string().optional(),
 *   is_stock_item: z.boolean(),
 *   is_fixed_asset: z.boolean(),
 *   disabled: z.boolean(),
 * }, {
 *   booleanDefaults: {
 *     is_stock_item: true,
 *     is_fixed_asset: false,
 *     disabled: false,
 *   }
 * });
 * ```
 */
export function createFormSchema<T extends z.ZodRawShape>(
  shape: T,
  options?: {
    booleanDefaults?: Record<string, boolean>;
  }
): z.ZodObject<T> {
  const schema = z.object(shape);

  // Note: Boolean defaults are handled in defaultValues, not schema
  // This avoids the type inference issues with .default()
  return schema;
}

/**
 * Generate default values for a form based on schema and boolean defaults
 *
 * @example
 * ```ts
 * const defaultValues = getFormDefaults(itemFormSchema, {
 *   is_stock_item: true,
 *   is_fixed_asset: false,
 *   disabled: false,
 * });
 * ```
 */
export function getFormDefaults<T extends Record<string, unknown>>(
  _schema: z.ZodType<T>,
  booleanDefaults: Record<string, boolean> = {},
  additionalDefaults: Partial<T> = {}
): Partial<T> {
  return {
    ...booleanDefaults,
    ...additionalDefaults,
  } as Partial<T>;
}

/**
 * Common field schemas for reuse across forms
 */
export const commonFields = {
  /** Required string field */
  required: (message = "This field is required") => z.string().min(1, message),

  /** Optional string field */
  optional: () => z.string().optional(),

  /** Email field */
  email: (message = "Invalid email address") => z.string().email(message),

  /** URL field */
  url: (message = "Invalid URL") => z.string().url(message).optional(),

  /** Phone field (basic validation) */
  phone: () =>
    z
      .string()
      .regex(/^[\d\s\-+()]*$/, "Invalid phone number")
      .optional(),

  /** Positive number */
  positiveNumber: () =>
    z.coerce.number().min(0, "Must be a positive number").optional(),

  /** Currency amount */
  currency: () =>
    z.coerce.number().min(0, "Must be a positive amount").optional(),

  /** Percentage (0-100) */
  percentage: () =>
    z.coerce.number().min(0).max(100, "Must be between 0 and 100").optional(),

  /** Date string */
  date: () => z.string().optional(),

  /** Boolean with default */
  boolean: (defaultValue = false) => z.boolean().default(defaultValue),
};

/**
 * Transform form data to Frappe API format
 * Converts booleans to 0/1, undefined to null, etc.
 */
export function formToFrappeData<T extends Record<string, unknown>>(
  data: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "boolean") {
      // Frappe uses 0/1 for booleans
      result[key] = value ? 1 : 0;
    } else if (value === undefined || value === "") {
      // Skip undefined/empty values
      continue;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Transform Frappe API data to form format
 * Converts 0/1 to booleans, etc.
 */
export function frappeToFormData<T extends Record<string, unknown>>(
  data: T,
  booleanFields: string[] = []
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (booleanFields.includes(key)) {
      // Convert 0/1 to boolean
      result[key] = value === 1 || value === true;
    } else {
      result[key] = value ?? "";
    }
  }

  return result;
}
