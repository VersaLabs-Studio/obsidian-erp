// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2025-12-30T15:35:04.337Z
// Source: Frappe DocType Metadata API
// Script: scripts/generate-types.js

/**
 * Lead DocType
 * @doctype Lead
 * @generated 2025-12-30T15:35:04.341Z
 */
export interface Lead {
  /** Series */
  naming_series?: "CRM-LEAD-.YYYY.-";
  /** Salutation */
  salutation?: string;
  /** First Name */
  first_name?: string;
  /** Middle Name */
  middle_name?: string;
  /** Last Name */
  last_name?: string;
  /** Full Name */
  lead_name?: string;
  /** Job Title */
  job_title?: string;
  /** Gender */
  gender?: string;
  /** Source */
  source?: string;
  /** Lead Owner */
  lead_owner?: string;
  /** Status */
  status: "Lead" | "Open" | "Replied" | "Opportunity" | "Quotation" | "Lost Quotation" | "Interested" | "Converted" | "Do Not Contact";
  /** From Customer */
  customer?: string;
  /** Lead Type */
  type?: "Client" | "Channel Partner" | "Consultant";
  /** Request Type */
  request_type?: "Product Enquiry" | "Request for Information" | "Suggestions" | "Other";
  /** Email */
  email_id?: string;
  /** Website */
  website?: string;
  /** Mobile No */
  mobile_no?: string;
  /** WhatsApp */
  whatsapp_no?: string;
  /** Phone */
  phone?: string;
  /** Phone Ext. */
  phone_ext?: string;
  /** Organization Name */
  company_name?: string;
  /** No of Employees */
  no_of_employees?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
  /** Annual Revenue */
  annual_revenue?: number;
  /** Industry */
  industry?: string;
  /** Market Segment */
  market_segment?: string;
  /** Territory */
  territory?: string;
  /** Fax */
  fax?: string;
  /** Address HTML */
  address_html?: string;
  /** City */
  city?: string;
  /** State/Province */
  state?: string;
  /** Country */
  country?: string;
  /** Contact HTML */
  contact_html?: string;
  /** Qualification Status */
  qualification_status?: "Unqualified" | "In Process" | "Qualified";
  /** Qualified By */
  qualified_by?: string;
  /** Qualified on */
  qualified_on?: string;
  /** Campaign Name */
  campaign_name?: string;
  /** Company */
  company?: string;
  /** Print Language */
  language?: string;
  /** Image */
  image?: string;
  /** Title */
  title?: string;
  /** Disabled */
  disabled?: 0 | 1;
  /** Unsubscribed */
  unsubscribed?: 0 | 1;
  /** Blog Subscriber */
  blog_subscriber?: 0 | 1;
  /** Open Activities HTML */
  open_activities_html?: string;
  /** All Activities HTML */
  all_activities_html?: string;
  /** Notes HTML */
  notes_html?: string;
  /** Notes */
  notes?: unknown[];
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
 * Lead Create Request
 * Fields required to create a new Lead
 */
export type LeadCreateRequest = Pick<Lead, "status"> & Partial<Pick<Lead, "naming_series" | "salutation" | "first_name" | "middle_name" | "last_name" | "lead_name" | "job_title" | "gender" | "source" | "lead_owner">>;

/**
 * Lead Update Request
 * All fields optional for update
 */
export type LeadUpdateRequest = Partial<Omit<Lead, "name" | "creation" | "owner" | "docstatus">>;

/**
 * Customer DocType
 * @doctype Customer
 * @generated 2025-12-30T15:35:04.341Z
 */
export interface Customer {
  /** Series */
  naming_series?: "CUST-.YYYY.-";
  /** Salutation */
  salutation?: string;
  /** Customer Name */
  customer_name: string;
  /** Customer Type */
  customer_type: "Company" | "Individual" | "Partnership";
  /** Customer Group */
  customer_group?: string;
  /** Territory */
  territory?: string;
  /** Gender */
  gender?: string;
  /** From Lead */
  lead_name?: string;
  /** From Opportunity */
  opportunity_name?: string;
  /** From Prospect */
  prospect_name?: string;
  /** Account Manager */
  account_manager?: string;
  /** Image */
  image?: string;
  /** Billing Currency */
  default_currency?: string;
  /** Default Company Bank Account */
  default_bank_account?: string;
  /** Default Price List */
  default_price_list?: string;
  /** Is Internal Customer */
  is_internal_customer?: 0 | 1;
  /** Represents Company */
  represents_company?: string;
  /** Allowed To Transact With */
  companies?: unknown[];
  /** Market Segment */
  market_segment?: string;
  /** Industry */
  industry?: string;
  /** Customer POS id */
  customer_pos_id?: string;
  /** Website */
  website?: string;
  /** Print Language */
  language?: string;
  /** Customer Details - Additional information regarding the customer. */
  customer_details?: string;
  /** Address HTML */
  address_html?: string;
  /** Contact HTML */
  contact_html?: string;
  /** Customer Primary Address - Reselect, if the chosen address is edited after save */
  customer_primary_address?: string;
  /** Primary Address */
  primary_address?: string;
  /** Customer Primary Contact - Reselect, if the chosen contact is edited after save */
  customer_primary_contact?: string;
  /** Mobile No */
  mobile_no?: string;
  /** Email Id */
  email_id?: string;
  /** First Name */
  first_name?: string;
  /** Last Name */
  last_name?: string;
  /** Tax ID */
  tax_id?: string;
  /** Tax Category */
  tax_category?: string;
  /** Tax Withholding Category */
  tax_withholding_category?: string;
  /** Default Payment Terms Template */
  payment_terms?: string;
  /** Credit Limit */
  credit_limits?: unknown[];
  /** Accounts - Mention if non-standard Receivable account */
  accounts?: unknown[];
  /** Loyalty Program */
  loyalty_program?: string;
  /** Loyalty Program Tier */
  loyalty_program_tier?: string;
  /** Sales Team */
  sales_team?: unknown[];
  /** Sales Partner */
  default_sales_partner?: string;
  /** Commission Rate */
  default_commission_rate?: number;
  /** Allow Sales Invoice Creation Without Sales Order */
  so_required?: 0 | 1;
  /** Allow Sales Invoice Creation Without Delivery Note */
  dn_required?: 0 | 1;
  /** Is Frozen */
  is_frozen?: 0 | 1;
  /** Disabled */
  disabled?: 0 | 1;
  /** Customer Portal Users */
  portal_users?: unknown[];
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
 * Customer Create Request
 * Fields required to create a new Customer
 */
export type CustomerCreateRequest = Pick<Customer, "customer_name" | "customer_type"> & Partial<Pick<Customer, "naming_series" | "salutation" | "customer_group" | "territory" | "gender" | "lead_name" | "opportunity_name" | "prospect_name" | "account_manager" | "image">>;

/**
 * Customer Update Request
 * All fields optional for update
 */
export type CustomerUpdateRequest = Partial<Omit<Customer, "name" | "creation" | "owner" | "docstatus">>;

/**
 * Address DocType
 * @doctype Address
 * @generated 2025-12-30T15:35:04.341Z
 */
export interface Address {
  /** Address Title */
  address_title?: string;
  /** Address Type */
  address_type: "Billing" | "Shipping" | "Office" | "Personal" | "Plant" | "Postal" | "Shop" | "Subsidiary" | "Warehouse" | "Current" | "Permanent" | "Other";
  /** Address Line 1 */
  address_line1: string;
  /** Address Line 2 */
  address_line2?: string;
  /** City/Town */
  city: string;
  /** County */
  county?: string;
  /** State/Province */
  state?: string;
  /** Country */
  country: string;
  /** Postal Code */
  pincode?: string;
  /** Email Address */
  email_id?: string;
  /** Phone */
  phone?: string;
  /** Fax */
  fax?: string;
  /** Preferred Billing Address */
  is_primary_address?: 0 | 1;
  /** Preferred Shipping Address */
  is_shipping_address?: 0 | 1;
  /** Disabled */
  disabled?: 0 | 1;
  /** Links */
  links?: unknown[];
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
 * Address Create Request
 * Fields required to create a new Address
 */
export type AddressCreateRequest = Pick<Address, "address_type" | "address_line1" | "city" | "country"> & Partial<Pick<Address, "address_title" | "address_line2" | "county" | "state" | "pincode" | "email_id" | "phone" | "fax" | "is_primary_address" | "is_shipping_address">>;

/**
 * Address Update Request
 * All fields optional for update
 */
export type AddressUpdateRequest = Partial<Omit<Address, "name" | "creation" | "owner" | "docstatus">>;

/**
 * Contact DocType
 * @doctype Contact
 * @generated 2025-12-30T15:35:04.341Z
 */
export interface Contact {
  /** First Name */
  first_name?: string;
  /** Middle Name */
  middle_name?: string;
  /** Last Name */
  last_name?: string;
  /** Full Name */
  full_name?: string;
  /** Email Address */
  email_id?: string;
  /** User Id */
  user?: string;
  /** Address */
  address?: string;
  /** Sync with Google Contacts */
  sync_with_google_contacts?: 0 | 1;
  /** Status */
  status?: "Passive" | "Open" | "Replied";
  /** Salutation */
  salutation?: string;
  /** Designation */
  designation?: string;
  /** Gender */
  gender?: string;
  /** Phone */
  phone?: string;
  /** Mobile No */
  mobile_no?: string;
  /** Company Name */
  company_name?: string;
  /** Image */
  image?: string;
  /** Google Contacts */
  google_contacts?: string;
  /** Google Contacts Id */
  google_contacts_id?: string;
  /** Pulled from Google Contacts */
  pulled_from_google_contacts?: 0 | 1;
  /** Email IDs */
  email_ids?: unknown[];
  /** Contact Numbers */
  phone_nos?: unknown[];
  /** Links */
  links?: unknown[];
  /** Is Primary Contact */
  is_primary_contact?: 0 | 1;
  /** Department */
  department?: string;
  /** Unsubscribed */
  unsubscribed?: 0 | 1;
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
 * Contact Update Request
 * All fields optional for update
 */
export type ContactUpdateRequest = Partial<Omit<Contact, "name" | "creation" | "owner" | "docstatus">>;

