// lib/print/print-config.ts
// Obsidian ERP v4.0 — Phase 2Y-R2: per-doctype print templates.
//
// The print subsystem renders a real, self-contained document (see
// components/print/PrintDocument.tsx) driven entirely by these configs.
// One config per doctype (+ variants like the Delivery Note "gate-pass")
// means "SO print says SALES ORDER, SI print says TAX INVOICE" falls out
// of data, and wiring a new module is a single <PrintMenu /> line.
//
// Field accessors are intentionally defensive: ERPNext doc shapes differ
// (transaction_date vs posting_date, customer_name vs supplier_name), so
// each config names the fields it wants and PrintDocument falls back
// gracefully when one is absent.

export type PrintVariant = "standard" | "gate-pass";

export type ColumnType = "text" | "qty" | "currency" | "rate";

export interface PrintColumn {
  /** Field on each item row. */
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  type?: ColumnType;
  /** Hidden when the template hides rates (e.g. gate pass). */
  monetary?: boolean;
}

export interface HeaderField {
  /** Field on the header doc. */
  key: string;
  label: string;
  /** "date" formats yyyy-mm-dd; "currency" applies ETB. */
  format?: "date" | "currency" | "text";
}

export interface PrintTemplate {
  /** Big document title, e.g. "TAX INVOICE". */
  title: string;
  /** Label above the primary party block, e.g. "Bill To" / "Supplier". */
  partyLabel: string;
  /** Field holding the party display name. */
  partyNameField: string;
  /** Field holding the party id (fallback if name absent). */
  partyIdField: string;
  /** Field holding the primary address display (rendered as-is). */
  partyAddressField?: string;
  /** Show a second "Ship To" party block. */
  shipTo?: { label: string; addressField: string };
  /** Header meta fields shown top-right (number/date/etc.). */
  headerFields: HeaderField[];
  /** Item columns, left-to-right. */
  columns: PrintColumn[];
  /**
   * Field on the doc that holds the printable line rows. Defaults to
   * "items". Some doctypes carry their lines in a differently-named child
   * table (Work Order → "required_items", Job Card → "time_logs"), so the
   * template names the real field here.
   */
  itemsField?: string;
  /** Whether monetary columns + the totals block render. */
  showMoney: boolean;
  /** Whether to render the totals block (subtotal/tax/grand). */
  showTotals: boolean;
  /** Gate-pass style logistics box (vehicle/driver/warehouse). */
  showLogistics?: boolean;
  /** Signature block labels along the footer. */
  signatures: string[];
  /** Optional standing footer note. */
  footerNote?: string;
}

const MONEY_COLS: PrintColumn[] = [
  { key: "item_code", label: "Item", align: "left", type: "text" },
  { key: "qty", label: "Qty", align: "right", type: "qty" },
  { key: "uom", label: "UOM", align: "left", type: "text" },
  { key: "rate", label: "Rate", align: "right", type: "rate", monetary: true },
  { key: "amount", label: "Amount", align: "right", type: "currency", monetary: true },
];

const SIG_SALES = ["Prepared By", "Authorized Signature", "Customer Acceptance"];
const SIG_PURCHASE = ["Prepared By", "Approved By"];

// ---------------------------------------------------------------------------
// Base templates keyed by doctype.
// ---------------------------------------------------------------------------
const TEMPLATES: Record<string, PrintTemplate> = {
  "Sales Order": {
    title: "SALES ORDER",
    partyLabel: "Bill To",
    partyNameField: "customer_name",
    partyIdField: "customer",
    partyAddressField: "address_display",
    shipTo: { label: "Ship To", addressField: "shipping_address_display" },
    headerFields: [
      { key: "name", label: "Order No" },
      { key: "transaction_date", label: "Date", format: "date" },
      { key: "po_no", label: "Customer PO" },
      { key: "delivery_date", label: "Delivery Date", format: "date" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: SIG_SALES,
  },
  Quotation: {
    title: "QUOTATION",
    partyLabel: "Prepared For",
    partyNameField: "customer_name",
    partyIdField: "party_name",
    partyAddressField: "address_display",
    headerFields: [
      { key: "name", label: "Quotation No" },
      { key: "transaction_date", label: "Date", format: "date" },
      { key: "valid_till", label: "Valid Till", format: "date" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: SIG_SALES,
  },
  "Sales Invoice": {
    title: "TAX INVOICE",
    partyLabel: "Bill To",
    partyNameField: "customer_name",
    partyIdField: "customer",
    partyAddressField: "address_display",
    shipTo: { label: "Ship To", addressField: "shipping_address_display" },
    headerFields: [
      { key: "name", label: "Invoice No" },
      { key: "posting_date", label: "Date", format: "date" },
      { key: "due_date", label: "Due Date", format: "date" },
      { key: "po_no", label: "Customer PO" },
      { key: "pana_fs_number", label: "FS No" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: SIG_SALES,
    footerNote: "This is a computer-generated tax invoice.",
  },
  "Purchase Invoice": {
    title: "PURCHASE INVOICE",
    partyLabel: "Supplier",
    partyNameField: "supplier_name",
    partyIdField: "supplier",
    partyAddressField: "address_display",
    headerFields: [
      { key: "name", label: "Invoice No" },
      { key: "posting_date", label: "Date", format: "date" },
      { key: "bill_no", label: "Supplier Bill No" },
      { key: "bill_date", label: "Bill Date", format: "date" },
      { key: "pana_fs_number", label: "FS No" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: SIG_PURCHASE,
  },
  "Purchase Order": {
    title: "PURCHASE ORDER",
    partyLabel: "Supplier",
    partyNameField: "supplier_name",
    partyIdField: "supplier",
    partyAddressField: "address_display",
    headerFields: [
      { key: "name", label: "PO No" },
      { key: "transaction_date", label: "Date", format: "date" },
      { key: "schedule_date", label: "Required By", format: "date" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: SIG_PURCHASE,
  },
  "Purchase Receipt": {
    title: "PURCHASE RECEIPT",
    partyLabel: "Supplier",
    partyNameField: "supplier_name",
    partyIdField: "supplier",
    partyAddressField: "address_display",
    headerFields: [
      { key: "name", label: "Receipt No" },
      { key: "posting_date", label: "Date", format: "date" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: ["Received By", "Store Keeper"],
  },
  "Delivery Note": {
    title: "DELIVERY NOTE",
    partyLabel: "Deliver To",
    partyNameField: "customer_name",
    partyIdField: "customer",
    partyAddressField: "shipping_address_display",
    headerFields: [
      { key: "name", label: "Delivery No" },
      { key: "posting_date", label: "Date", format: "date" },
      { key: "po_no", label: "Customer PO" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: ["Delivered By", "Received By"],
  },
  "Payment Entry": {
    title: "PAYMENT VOUCHER",
    partyLabel: "Party",
    partyNameField: "party_name",
    partyIdField: "party",
    headerFields: [
      { key: "name", label: "Voucher No" },
      { key: "posting_date", label: "Date", format: "date" },
      { key: "mode_of_payment", label: "Mode" },
      { key: "reference_no", label: "Reference" },
      { key: "paid_amount", label: "Amount", format: "currency" },
    ],
    columns: [],
    showMoney: true,
    showTotals: false,
    signatures: ["Received By", "Authorized Signature"],
  },
  // 2Y-R3 — Work Order: lines live in `required_items` (not `items`), and
  // the party is the production item (optionally the linked customer).
  "Work Order": {
    title: "WORK ORDER",
    partyLabel: "Producing",
    partyNameField: "item_name",
    partyIdField: "production_item",
    partyAddressField: "customer_name",
    headerFields: [
      { key: "name", label: "WO No" },
      { key: "posting_date", label: "Date", format: "date" },
      { key: "expected_delivery_date", label: "Due Date", format: "date" },
      { key: "status", label: "Status" },
      { key: "qty", label: "Qty", format: "text" },
    ],
    itemsField: "required_items",
    columns: [
      { key: "item_code", label: "Item", align: "left", type: "text" },
      { key: "item_name", label: "Description", align: "left", type: "text" },
      { key: "required_qty", label: "Required", align: "right", type: "qty" },
      { key: "transferred_qty", label: "Transferred", align: "right", type: "qty" },
      { key: "consumed_qty", label: "Consumed", align: "right", type: "qty" },
    ],
    showMoney: false,
    showTotals: false,
    signatures: ["Prepared By", "Production Supervisor"],
  },
  // 2Y-R3 — Material Request: internal requisition, no prices (an MR carries
  // no rates); the "party" slot shows the request purpose.
  "Material Request": {
    title: "MATERIAL REQUEST",
    partyLabel: "Purpose",
    partyNameField: "material_request_type",
    partyIdField: "material_request_type",
    headerFields: [
      { key: "name", label: "MR No" },
      { key: "transaction_date", label: "Date", format: "date" },
      { key: "schedule_date", label: "Required By", format: "date" },
      { key: "status", label: "Status" },
    ],
    columns: [
      { key: "item_code", label: "Item", align: "left", type: "text" },
      { key: "item_name", label: "Description", align: "left", type: "text" },
      { key: "qty", label: "Qty", align: "right", type: "qty" },
      { key: "uom", label: "UOM", align: "left", type: "text" },
      { key: "schedule_date", label: "Required By", align: "left", type: "text" },
    ],
    showMoney: false,
    showTotals: false,
    signatures: ["Requested By", "Approved By"],
  },
  // 2Y-R3 — Job Card: no line-item table; print the time logs (employee,
  // from/to time, completed qty) so the shop floor has a real record.
  "Job Card": {
    title: "JOB CARD",
    partyLabel: "Work Order",
    partyNameField: "work_order",
    partyIdField: "work_order",
    partyAddressField: "operation",
    headerFields: [
      { key: "name", label: "Job Card No" },
      { key: "operation", label: "Operation" },
      { key: "workstation", label: "Workstation" },
      { key: "status", label: "Status" },
      { key: "for_quantity", label: "For Qty", format: "text" },
    ],
    itemsField: "time_logs",
    columns: [
      { key: "employee", label: "Employee", align: "left", type: "text" },
      { key: "from_time", label: "Start", align: "left", type: "text" },
      { key: "to_time", label: "End", align: "left", type: "text" },
      { key: "completed_qty", label: "Completed", align: "right", type: "qty" },
    ],
    showMoney: false,
    showTotals: false,
    signatures: ["Operator", "Supervisor"],
  },
};

// Delivery Note → Gate Pass: no money, logistics box, gate signatures.
const GATE_PASS: PrintTemplate = {
  ...TEMPLATES["Delivery Note"]!,
  title: "GATE PASS",
  headerFields: [
    { key: "name", label: "Ref (DN) No" },
    { key: "posting_date", label: "Date", format: "date" },
    { key: "customer_name", label: "Destination" },
  ],
  columns: [
    { key: "item_code", label: "Item", align: "left", type: "text" },
    { key: "qty", label: "Qty", align: "right", type: "qty" },
    { key: "uom", label: "UOM", align: "left", type: "text" },
    { key: "warehouse", label: "From Warehouse", align: "left", type: "text" },
  ],
  showMoney: false,
  showTotals: false,
  showLogistics: true,
  signatures: ["Store Keeper", "Security / Gate", "Driver"],
  footerNote: "GATE PASS — internal use only. Not a tax document.",
};

/**
 * Resolve the print template for a doctype + variant. Falls back to a
 * generic document template for doctypes without an explicit config so a
 * newly-wired module still prints *something* labeled correctly.
 */
export function getPrintTemplate(
  doctype: string,
  variant: PrintVariant = "standard",
): PrintTemplate {
  if (doctype === "Delivery Note" && variant === "gate-pass") return GATE_PASS;
  const found = TEMPLATES[doctype];
  if (found) return found;
  return {
    title: doctype.toUpperCase(),
    partyLabel: "Party",
    partyNameField: "customer_name",
    partyIdField: "customer",
    partyAddressField: "address_display",
    headerFields: [
      { key: "name", label: "No" },
      { key: "posting_date", label: "Date", format: "date" },
    ],
    columns: MONEY_COLS,
    showMoney: true,
    showTotals: true,
    signatures: ["Prepared By", "Authorized Signature"],
  };
}

export const ETB = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  minimumFractionDigits: 2,
});
