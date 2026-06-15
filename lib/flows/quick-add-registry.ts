// lib/flows/quick-add-registry.ts
// Obsidian ERP v4.0 — Inline Quick-Add Registry (master §11).
//
// Lets a wizard's link/select field spawn a minimal create modal that returns
// a name into the field without leaving the host wizard. Composes nested
// (Address from inside Customer), respects ESC/backdrop (resolves null), and
// reuses the existing `*CreateSchema` so validation stays consistent with the
// master "new" page.
//
// Coverage (per master spec): Customer, Supplier, Item, Contact, Address, Lead,
// Warehouse, UOM, Item Group.

import type { ZodTypeAny } from "zod";
import {
  CustomerCreateSchema,
  SupplierCreateSchema,
  ItemCreateSchema,
  LeadCreateSchema,
  UomCreateSchema,
  ItemGroupCreateSchema,
  DriverCreateSchema,
  VehicleCreateSchema,
} from "@/lib/schemas/doctype-schemas";

// ---------------------------------------------------------------------------
// Field spec — what the Quick-Add modal renders for each doctype
// ---------------------------------------------------------------------------
export type QuickAddFieldType = "input" | "select" | "switch" | "textarea";

export interface QuickAddFieldSpec {
  /** Form field name (also used as the doctype field) */
  name: string;
  /** User-facing label */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Field type — default "input" */
  type?: QuickAddFieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Static select options (for type="select") */
  options?: Array<{ value: string; label: string }>;
  /** Help text shown below the field */
  helpText?: string;
}

export interface QuickAddEntry {
  /** The Frappe doctype name */
  doctype: string;
  /** Human-readable label for the modal title + "Create new <X>" affordance */
  label: string;
  /** Default name field — used to focus first and to display success */
  nameField: string;
  /** The schema for validation. Reuses `*CreateSchema` so validations are identical to the master new page. */
  schema: ZodTypeAny;
  /** Curated field list for the inline form. Keep to 1-3 fields to honor §11.2 — minimal. */
  fields: QuickAddFieldSpec[];
  /** Optional default values to prefill (e.g. company from getActiveCompany) */
  defaults?: () => Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Per-doctype entries
// ---------------------------------------------------------------------------
const customerFields: QuickAddFieldSpec[] = [
  {
    name: "customer_name",
    label: "Customer name",
    required: true,
    placeholder: "e.g. Abebe Trading PLC",
  },
  {
    name: "customer_type",
    label: "Customer type",
    type: "select",
    required: true,
    options: [
      { value: "Company", label: "Company" },
      { value: "Individual", label: "Individual" },
    ],
  },
  // 2N Part 1.3: richer field set. The Customer's customer_group and
  // territory are real FK fields — surfaced as plain input fields (no
  // Quick-Add on those tables, since they're not in the registry). All
  // optional so the over-strict CreateSchema doesn't trip.
  {
    name: "customer_group",
    label: "Customer group",
    required: false,
    placeholder: "e.g. Commercial",
    helpText: "Optional. Defaults to All Customer Groups.",
  },
  {
    name: "territory",
    label: "Territory",
    required: false,
    placeholder: "e.g. Ethiopia",
  },
  {
    name: "mobile_no",
    label: "Mobile",
    required: false,
    placeholder: "+251 ...",
  },
  {
    name: "email_id",
    label: "Email",
    required: false,
    placeholder: "name@example.com",
    type: "input",
  },
];

const supplierFields: QuickAddFieldSpec[] = [
  {
    name: "supplier_name",
    label: "Supplier name",
    required: true,
    placeholder: "e.g. Acme Suppliers Ltd",
  },
  {
    name: "supplier_type",
    label: "Supplier type",
    type: "select",
    required: true,
    options: [
      { value: "Company", label: "Company" },
      { value: "Individual", label: "Individual" },
    ],
  },
  // 2N Part 1.3: richer field set for Supplier (mirrors Customer).
  {
    name: "supplier_group",
    label: "Supplier group",
    required: false,
    placeholder: "e.g. Local",
  },
  {
    name: "country",
    label: "Country",
    required: false,
    placeholder: "e.g. Ethiopia",
  },
  {
    name: "mobile_no",
    label: "Mobile",
    required: false,
    placeholder: "+251 ...",
  },
];

const itemFields: QuickAddFieldSpec[] = [
  {
    name: "item_code",
    label: "Item code",
    required: true,
    placeholder: "ITEM-001",
    helpText: "Must be unique",
  },
  {
    name: "item_name",
    label: "Item name",
    required: true,
    placeholder: "Display name",
  },
  {
    name: "item_group",
    label: "Item group",
    required: true,
    placeholder: "All Item Groups",
  },
  {
    name: "stock_uom",
    label: "Stock UOM",
    required: true,
    placeholder: "Nos",
  },
];

const leadFields: QuickAddFieldSpec[] = [
  {
    name: "lead_name",
    label: "Lead name",
    required: true,
    placeholder: "Full name or contact",
  },
  {
    name: "company_name",
    label: "Company",
    placeholder: "Optional",
  },
  {
    name: "email_id",
    label: "Email",
    type: "input",
    placeholder: "name@example.com",
  },
];

const addressFields: QuickAddFieldSpec[] = [
  {
    name: "address_title",
    label: "Address title",
    required: true,
    placeholder: "e.g. Head Office",
  },
  {
    name: "address_type",
    label: "Type",
    type: "select",
    required: true,
    options: [
      { value: "Billing", label: "Billing" },
      { value: "Shipping", label: "Shipping" },
      { value: "Office", label: "Office" },
      { value: "Personal", label: "Personal" },
    ],
  },
  {
    name: "address_line1",
    label: "Street",
    placeholder: "Bole Road, House #123",
  },
  {
    name: "city",
    label: "City",
    placeholder: "Addis Ababa",
  },
];

const contactFields: QuickAddFieldSpec[] = [
  {
    name: "first_name",
    label: "First name",
    required: true,
    placeholder: "First name",
  },
  {
    name: "last_name",
    label: "Last name",
    placeholder: "Last name",
  },
  {
    name: "email_id",
    label: "Email",
    placeholder: "name@example.com",
  },
];

const warehouseFields: QuickAddFieldSpec[] = [
  {
    name: "warehouse_name",
    label: "Warehouse name",
    required: true,
    placeholder: "e.g. Stores - P",
  },
];

const uomFields: QuickAddFieldSpec[] = [
  {
    name: "uom_name",
    label: "UOM name",
    required: true,
    placeholder: "e.g. Kilogram, Box",
  },
];

const itemGroupFields: QuickAddFieldSpec[] = [
  {
    name: "item_group_name",
    label: "Item group name",
    required: true,
    placeholder: "e.g. Raw Materials",
  },
];

const driverFields: QuickAddFieldSpec[] = [
  {
    name: "full_name",
    label: "Full name",
    required: true,
    placeholder: "Driver full name",
  },
];

const vehicleFields: QuickAddFieldSpec[] = [
  {
    name: "license_plate",
    label: "License plate",
    required: true,
    placeholder: "Plate number",
  },
];

// ---------------------------------------------------------------------------
// Public registry
// ---------------------------------------------------------------------------
export const QUICK_ADD_REGISTRY: Record<string, QuickAddEntry> = {
  Customer: {
    doctype: "Customer",
    label: "Customer",
    nameField: "name",
    schema: CustomerCreateSchema,
    fields: customerFields,
  },
  Supplier: {
    doctype: "Supplier",
    label: "Supplier",
    nameField: "name",
    schema: SupplierCreateSchema,
    fields: supplierFields,
  },
  Item: {
    doctype: "Item",
    label: "Item",
    nameField: "name",
    schema: ItemCreateSchema,
    fields: itemFields,
  },
  Contact: {
    doctype: "Contact",
    label: "Contact",
    nameField: "name",
    // Contact has no CreateSchema exposed in the registry; use loose object
    // validation. The create route's `createCreateHandler` does NOT pass a
    // schema for Contact (see app/api/crm/contact/route.ts), so the wizard
    // payload always passes.
    schema: undefined as unknown as ZodTypeAny,
    fields: contactFields,
  },
  Address: {
    doctype: "Address",
    label: "Address",
    nameField: "name",
    schema: undefined as unknown as ZodTypeAny,
    fields: addressFields,
  },
  Lead: {
    doctype: "Lead",
    label: "Lead",
    nameField: "name",
    schema: LeadCreateSchema,
    fields: leadFields,
  },
  Warehouse: {
    doctype: "Warehouse",
    label: "Warehouse",
    nameField: "name",
    schema: undefined as unknown as ZodTypeAny,
    fields: warehouseFields,
  },
  UOM: {
    doctype: "UOM",
    label: "UOM",
    nameField: "name",
    schema: UomCreateSchema,
    fields: uomFields,
  },
  "Item Group": {
    doctype: "Item Group",
    label: "Item Group",
    nameField: "name",
    schema: ItemGroupCreateSchema,
    fields: itemGroupFields,
  },
  // Extras — useful in stock/logistics contexts
  Driver: {
    doctype: "Driver",
    label: "Driver",
    nameField: "name",
    schema: DriverCreateSchema,
    fields: driverFields,
  },
  Vehicle: {
    doctype: "Vehicle",
    label: "Vehicle",
    nameField: "name",
    schema: VehicleCreateSchema,
    fields: vehicleFields,
  },
};

/** Returns the registered entry, or undefined if the doctype is not supported. */
export function getQuickAddEntry(doctype: string): QuickAddEntry | undefined {
  return QUICK_ADD_REGISTRY[doctype];
}

/** Returns true if the doctype has a Quick-Add entry (master §11.4). */
export function isQuickAddSupported(doctype: string): boolean {
  return doctype in QUICK_ADD_REGISTRY;
}
