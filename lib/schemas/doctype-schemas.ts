// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2025-12-30T15:35:04.341Z
// Source: Frappe DocType Metadata API
// Script: scripts/generate-types.js

import { z } from "zod";

/**
 * Lead Zod Schema
 * @doctype Lead
 * @generated 2025-12-30T15:35:04.341Z
 */
export const LeadSchema = z.object({
  naming_series: z.enum(["CRM-LEAD-.YYYY.-"]).optional(),
  salutation: z.string().optional(),
  first_name: z.string().optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  lead_name: z.string().optional(),
  job_title: z.string().optional(),
  gender: z.string().optional(),
  source: z.string().optional(),
  lead_owner: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  customer: z.string().optional(),
  type: z.enum(["Client", "Channel Partner", "Consultant"]).optional(),
  request_type: z.enum(["Product Enquiry", "Request for Information", "Suggestions", "Other"]).optional(),
  email_id: z.string().optional(),
  website: z.string().optional(),
  mobile_no: z.string().optional(),
  whatsapp_no: z.string().optional(),
  phone: z.string().optional(),
  phone_ext: z.string().optional(),
  company_name: z.string().optional(),
  no_of_employees: z.enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]).optional(),
  annual_revenue: z.number().optional(),
  industry: z.string().optional(),
  market_segment: z.string().optional(),
  territory: z.string().optional(),
  fax: z.string().optional(),
  address_html: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  contact_html: z.string().optional(),
  qualification_status: z.enum(["Unqualified", "In Process", "Qualified"]).optional(),
  qualified_by: z.string().optional(),
  qualified_on: z.string().optional(),
  campaign_name: z.string().optional(),
  company: z.string().optional(),
  language: z.string().optional(),
  image: z.string().optional(),
  title: z.string().optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  unsubscribed: z.union([z.literal(0), z.literal(1)]).optional(),
  blog_subscriber: z.union([z.literal(0), z.literal(1)]).optional(),
  open_activities_html: z.string().optional(),
  all_activities_html: z.string().optional(),
  notes_html: z.string().optional(),
  notes: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const LeadCreateSchema = LeadSchema.pick({
  status: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const LeadUpdateSchema = LeadSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type LeadSchemaType = z.infer<typeof LeadSchema>;

/**
 * Customer Zod Schema
 * @doctype Customer
 * @generated 2025-12-30T15:35:04.342Z
 */
export const CustomerSchema = z.object({
  naming_series: z.enum(["CUST-.YYYY.-"]).optional(),
  salutation: z.string().optional(),
  customer_name: z.string().min(1, "Customer Name is required"),
  customer_type: z.string().min(1, "Customer Type is required"),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  gender: z.string().optional(),
  lead_name: z.string().optional(),
  opportunity_name: z.string().optional(),
  prospect_name: z.string().optional(),
  account_manager: z.string().optional(),
  image: z.string().optional(),
  default_currency: z.string().optional(),
  default_bank_account: z.string().optional(),
  default_price_list: z.string().optional(),
  is_internal_customer: z.union([z.literal(0), z.literal(1)]).optional(),
  represents_company: z.string().optional(),
  companies: z.array(z.unknown()).optional(),
  market_segment: z.string().optional(),
  industry: z.string().optional(),
  customer_pos_id: z.string().optional(),
  website: z.string().optional(),
  language: z.string().optional(),
  customer_details: z.string().optional(),
  address_html: z.string().optional(),
  contact_html: z.string().optional(),
  customer_primary_address: z.string().optional(),
  primary_address: z.string().optional(),
  customer_primary_contact: z.string().optional(),
  mobile_no: z.string().optional(),
  email_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  tax_id: z.string().optional(),
  tax_category: z.string().optional(),
  tax_withholding_category: z.string().optional(),
  payment_terms: z.string().optional(),
  credit_limits: z.array(z.unknown()).optional(),
  accounts: z.array(z.unknown()).optional(),
  loyalty_program: z.string().optional(),
  loyalty_program_tier: z.string().optional(),
  sales_team: z.array(z.unknown()).optional(),
  default_sales_partner: z.string().optional(),
  default_commission_rate: z.number().optional(),
  so_required: z.union([z.literal(0), z.literal(1)]).optional(),
  dn_required: z.union([z.literal(0), z.literal(1)]).optional(),
  is_frozen: z.union([z.literal(0), z.literal(1)]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  portal_users: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const CustomerCreateSchema = CustomerSchema.pick({
  customer_name: true,
  customer_type: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const CustomerUpdateSchema = CustomerSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type CustomerSchemaType = z.infer<typeof CustomerSchema>;

/**
 * Address Zod Schema
 * @doctype Address
 * @generated 2025-12-30T15:35:04.342Z
 */
export const AddressSchema = z.object({
  address_title: z.string().optional(),
  address_type: z.string().min(1, "Address Type is required"),
  address_line1: z.string().min(1, "Address Line 1 is required"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City/Town is required"),
  county: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  pincode: z.string().optional(),
  email_id: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  is_primary_address: z.union([z.literal(0), z.literal(1)]).optional(),
  is_shipping_address: z.union([z.literal(0), z.literal(1)]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  links: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const AddressCreateSchema = AddressSchema.pick({
  address_type: true,
  address_line1: true,
  city: true,
  country: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const AddressUpdateSchema = AddressSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type AddressSchemaType = z.infer<typeof AddressSchema>;

/**
 * Contact Zod Schema
 * @doctype Contact
 * @generated 2025-12-30T15:35:04.342Z
 */
export const ContactSchema = z.object({
  first_name: z.string().optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  email_id: z.string().optional(),
  user: z.string().optional(),
  address: z.string().optional(),
  sync_with_google_contacts: z.union([z.literal(0), z.literal(1)]).optional(),
  status: z.enum(["Passive", "Open", "Replied"]).optional(),
  salutation: z.string().optional(),
  designation: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  mobile_no: z.string().optional(),
  company_name: z.string().optional(),
  image: z.string().optional(),
  google_contacts: z.string().optional(),
  google_contacts_id: z.string().optional(),
  pulled_from_google_contacts: z.union([z.literal(0), z.literal(1)]).optional(),
  email_ids: z.array(z.unknown()).optional(),
  phone_nos: z.array(z.unknown()).optional(),
  links: z.array(z.unknown()).optional(),
  is_primary_contact: z.union([z.literal(0), z.literal(1)]).optional(),
  department: z.string().optional(),
  unsubscribed: z.union([z.literal(0), z.literal(1)]).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ContactUpdateSchema = ContactSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ContactSchemaType = z.infer<typeof ContactSchema>;

