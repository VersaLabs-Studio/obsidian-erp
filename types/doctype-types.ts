// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2025-12-29T15:30:13.376Z
// Source: Frappe DocType Metadata API
// Script: scripts/generate-types.js

/**
 * Item DocType
 * @doctype Item
 * @generated 2025-12-29T15:30:13.378Z
 */
export interface Item {
  /** Series */
  naming_series?: "STO-ITEM-.YYYY.-";
  /** Item Code */
  item_code: string;
  /** Item Name */
  item_name?: string;
  /** Item Group */
  item_group: string;
  /** Default Unit of Measure */
  stock_uom: string;
  /** Disabled */
  disabled?: 0 | 1;
  /** Allow Alternative Item */
  allow_alternative_item?: 0 | 1;
  /** Maintain Stock */
  is_stock_item?: 0 | 1;
  /** Has Variants - If this item has variants, then it cannot be selected in sales orders etc. */
  has_variants?: 0 | 1;
  /** Opening Stock */
  opening_stock?: number;
  /** Valuation Rate */
  valuation_rate?: number;
  /** Standard Selling Rate */
  standard_rate?: number;
  /** Is Fixed Asset */
  is_fixed_asset?: 0 | 1;
  /** Auto Create Assets on Purchase */
  auto_create_assets?: 0 | 1;
  /** Create Grouped Asset */
  is_grouped_asset?: 0 | 1;
  /** Asset Category */
  asset_category?: string;
  /** Asset Naming Series */
  asset_naming_series?: string;
  /** Over Delivery/Receipt Allowance (%) */
  over_delivery_receipt_allowance?: number;
  /** Over Billing Allowance (%) */
  over_billing_allowance?: number;
  /** Image */
  image?: string;
  /** Description */
  description?: string;
  /** Brand */
  brand?: string;
  /** UOMs - Will also apply for variants */
  uoms?: unknown[];
  /** Shelf Life In Days */
  shelf_life_in_days?: number;
  /** End of Life */
  end_of_life?: string;
  /** Default Material Request Type */
  default_material_request_type?:
    | "Purchase"
    | "Material Transfer"
    | "Material Issue"
    | "Manufacture"
    | "Customer Provided";
  /** Valuation Method */
  valuation_method?: "FIFO" | "Moving Average" | "LIFO";
  /** Warranty Period (in days) */
  warranty_period?: string;
  /** Weight Per Unit */
  weight_per_unit?: number;
  /** Weight UOM */
  weight_uom?: string;
  /** Allow Negative Stock */
  allow_negative_stock?: 0 | 1;
  /** Barcodes */
  barcodes?: unknown[];
  /** Reorder level based on Warehouse - Will also apply for variants unless overrridden */
  reorder_levels?: unknown[];
  /** Has Batch No */
  has_batch_no?: 0 | 1;
  /** Automatically Create New Batch */
  create_new_batch?: 0 | 1;
  /** Batch Number Series - Example: ABCD.#####. If series is set and Batch No is not mentioned in transactions, then automatic batch number will be created based on this series. If you always want to explicitly mention Batch No for this item, leave this blank. Note: this setting will take priority over the Naming Series Prefix in Stock Settings. */
  batch_number_series?: string;
  /** Has Expiry Date */
  has_expiry_date?: 0 | 1;
  /** Retain Sample */
  retain_sample?: 0 | 1;
  /** Max Sample Quantity - Maximum sample quantity that can be retained */
  sample_quantity?: number;
  /** Has Serial No */
  has_serial_no?: 0 | 1;
  /** Serial Number Series - Example: ABCD.#####
If series is set and Serial No is not mentioned in transactions, then automatic serial number will be created based on this series. If you always want to explicitly mention Serial Nos for this item. leave this blank. */
  serial_no_series?: string;
  /** Variant Of - If item is a variant of another item then description, image, pricing, taxes etc will be set from the template unless explicitly specified */
  variant_of?: string;
  /** Variant Based On */
  variant_based_on?: "Item Attribute" | "Manufacturer";
  /** Variant Attributes */
  attributes?: unknown[];
  /** Enable Deferred Expense */
  enable_deferred_expense?: 0 | 1;
  /** No of Months (Expense) */
  no_of_months_exp?: number;
  /** Enable Deferred Revenue */
  enable_deferred_revenue?: 0 | 1;
  /** No of Months (Revenue) */
  no_of_months?: number;
  /** Item Defaults */
  item_defaults?: unknown[];
  /** Default Purchase Unit of Measure */
  purchase_uom?: string;
  /** Minimum Order Qty - Minimum quantity should be as per Stock UOM */
  min_order_qty?: number;
  /** Safety Stock */
  safety_stock?: number;
  /** Allow Purchase */
  is_purchase_item?: 0 | 1;
  /** Lead Time in days - Average time taken by the supplier to deliver */
  lead_time_days?: number;
  /** Last Purchase Rate */
  last_purchase_rate?: number;
  /** Is Customer Provided Item */
  is_customer_provided_item?: 0 | 1;
  /** Customer */
  customer?: string;
  /** Delivered by Supplier (Drop Ship) */
  delivered_by_supplier?: 0 | 1;
  /** Supplier Items */
  supplier_items?: unknown[];
  /** Country of Origin */
  country_of_origin?: string;
  /** Customs Tariff Number */
  customs_tariff_number?: string;
  /** Default Sales Unit of Measure */
  sales_uom?: string;
  /** Grant Commission */
  grant_commission?: 0 | 1;
  /** Allow Sales */
  is_sales_item?: 0 | 1;
  /** Max Discount (%) */
  max_discount?: number;
  /** Customer Items */
  customer_items?: unknown[];
  /** Taxes - Will also apply for variants */
  taxes?: unknown[];
  /** Inspection Required before Purchase */
  inspection_required_before_purchase?: 0 | 1;
  /** Quality Inspection Template */
  quality_inspection_template?: string;
  /** Inspection Required before Delivery */
  inspection_required_before_delivery?: 0 | 1;
  /** Include Item In Manufacturing */
  include_item_in_manufacturing?: 0 | 1;
  /** Supply Raw Materials for Purchase - If subcontracted to a vendor */
  is_sub_contracted_item?: 0 | 1;
  /** Default BOM */
  default_bom?: string;
  /** Customer Code */
  customer_code?: string;
  /** Default Item Manufacturer */
  default_item_manufacturer?: string;
  /** Default Manufacturer Part No */
  default_manufacturer_part_no?: string;
  /** Total Projected Qty */
  total_projected_qty?: number;
  /** ID */
  name: string;
  /** Owner */
  owner?: string;
  /** Created On */
  creation?: string;
  /** Modified On */
  modified?: string;
  /** Modified By */
  modified_by?: string;
  /** Document Status */
  docstatus?: 0 | 1 | 2;
}

/**
 * Item Create Request
 * Fields required to create a new Item
 */
export type ItemCreateRequest = Pick<
  Item,
  "item_code" | "item_group" | "stock_uom"
> &
  Partial<
    Pick<
      Item,
      | "naming_series"
      | "item_name"
      | "description"
      | "brand"
      | "disabled"
      | "allow_alternative_item"
      | "is_stock_item"
      | "has_variants"
      | "opening_stock"
      | "valuation_rate"
      | "standard_rate"
      | "is_fixed_asset"
    >
  >;

/**
 * Item Update Request
 * All fields optional for update
 */
export type ItemUpdateRequest = Partial<
  Omit<Item, "name" | "creation" | "owner" | "docstatus">
>;
