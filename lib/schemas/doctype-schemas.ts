// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2025-12-29T15:30:13.378Z
// Source: Frappe DocType Metadata API
// Script: scripts/generate-types.js

import { z } from "zod";

/**
 * Item Zod Schema
 * @doctype Item
 * @generated 2025-12-29T15:30:13.378Z
 */
export const ItemSchema = z.object({
  naming_series: z.enum(["STO-ITEM-.YYYY.-"]).optional(),
  item_code: z.string().min(1, "Item Code is required"),
  item_name: z.string().optional(),
  item_group: z.string().min(1, "Item Group is required"),
  stock_uom: z.string().min(1, "Default Unit of Measure is required"),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  allow_alternative_item: z.union([z.literal(0), z.literal(1)]).optional(),
  is_stock_item: z.union([z.literal(0), z.literal(1)]).optional(),
  has_variants: z.union([z.literal(0), z.literal(1)]).optional(),
  opening_stock: z.number().optional(),
  valuation_rate: z.number().optional(),
  standard_rate: z.number().optional(),
  is_fixed_asset: z.union([z.literal(0), z.literal(1)]).optional(),
  auto_create_assets: z.union([z.literal(0), z.literal(1)]).optional(),
  is_grouped_asset: z.union([z.literal(0), z.literal(1)]).optional(),
  asset_category: z.string().optional(),
  asset_naming_series: z.string().optional(),
  over_delivery_receipt_allowance: z.number().optional(),
  over_billing_allowance: z.number().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  uoms: z.array(z.unknown()).optional(),
  shelf_life_in_days: z.number().int().optional(),
  end_of_life: z.string().optional(),
  default_material_request_type: z.enum(["Purchase", "Material Transfer", "Material Issue", "Manufacture", "Customer Provided"]).optional(),
  valuation_method: z.enum(["FIFO", "Moving Average", "LIFO"]).optional(),
  warranty_period: z.string().optional(),
  weight_per_unit: z.number().optional(),
  weight_uom: z.string().optional(),
  allow_negative_stock: z.union([z.literal(0), z.literal(1)]).optional(),
  barcodes: z.array(z.unknown()).optional(),
  reorder_levels: z.array(z.unknown()).optional(),
  has_batch_no: z.union([z.literal(0), z.literal(1)]).optional(),
  create_new_batch: z.union([z.literal(0), z.literal(1)]).optional(),
  batch_number_series: z.string().optional(),
  has_expiry_date: z.union([z.literal(0), z.literal(1)]).optional(),
  retain_sample: z.union([z.literal(0), z.literal(1)]).optional(),
  sample_quantity: z.number().int().optional(),
  has_serial_no: z.union([z.literal(0), z.literal(1)]).optional(),
  serial_no_series: z.string().optional(),
  variant_of: z.string().optional(),
  variant_based_on: z.enum(["Item Attribute", "Manufacturer"]).optional(),
  attributes: z.array(z.unknown()).optional(),
  enable_deferred_expense: z.union([z.literal(0), z.literal(1)]).optional(),
  no_of_months_exp: z.number().int().optional(),
  enable_deferred_revenue: z.union([z.literal(0), z.literal(1)]).optional(),
  no_of_months: z.number().int().optional(),
  item_defaults: z.array(z.unknown()).optional(),
  purchase_uom: z.string().optional(),
  min_order_qty: z.number().optional(),
  safety_stock: z.number().optional(),
  is_purchase_item: z.union([z.literal(0), z.literal(1)]).optional(),
  lead_time_days: z.number().int().optional(),
  last_purchase_rate: z.number().optional(),
  is_customer_provided_item: z.union([z.literal(0), z.literal(1)]).optional(),
  customer: z.string().optional(),
  delivered_by_supplier: z.union([z.literal(0), z.literal(1)]).optional(),
  supplier_items: z.array(z.unknown()).optional(),
  country_of_origin: z.string().optional(),
  customs_tariff_number: z.string().optional(),
  sales_uom: z.string().optional(),
  grant_commission: z.union([z.literal(0), z.literal(1)]).optional(),
  is_sales_item: z.union([z.literal(0), z.literal(1)]).optional(),
  max_discount: z.number().optional(),
  customer_items: z.array(z.unknown()).optional(),
  taxes: z.array(z.unknown()).optional(),
  inspection_required_before_purchase: z.union([z.literal(0), z.literal(1)]).optional(),
  quality_inspection_template: z.string().optional(),
  inspection_required_before_delivery: z.union([z.literal(0), z.literal(1)]).optional(),
  include_item_in_manufacturing: z.union([z.literal(0), z.literal(1)]).optional(),
  is_sub_contracted_item: z.union([z.literal(0), z.literal(1)]).optional(),
  default_bom: z.string().optional(),
  customer_code: z.string().optional(),
  default_item_manufacturer: z.string().optional(),
  default_manufacturer_part_no: z.string().optional(),
  total_projected_qty: z.number().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ItemCreateSchema = ItemSchema.pick({
  item_code: true,
  item_group: true,
  stock_uom: true,
}).extend({
  description: z.string().optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const ItemUpdateSchema = ItemSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ItemSchemaType = z.infer<typeof ItemSchema>;

