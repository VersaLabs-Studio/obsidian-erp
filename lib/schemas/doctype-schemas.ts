// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2026-01-14T17:57:59.373Z
// Source: Frappe DocType Metadata API
// Script: scripts/generate-types.js

import { z } from "zod";

/**
 * User Zod Schema
 * @doctype User
 * @generated 2026-01-14T18:05:48.295Z
 */
export const UserSchema = z.object({
  enabled: z.union([z.literal(0), z.literal(1)]).optional(),
  email: z.string().min(1, "Email is required"),
  first_name: z.string().min(1, "First Name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  full_name: z.string().optional(),
  username: z.string().optional(),
  language: z.string().optional(),
  time_zone: z.unknown().optional(),
  send_welcome_email: z.union([z.literal(0), z.literal(1)]).optional(),
  unsubscribed: z.union([z.literal(0), z.literal(1)]).optional(),
  user_image: z.string().optional(),
  role_profile_name: z.string().optional(),
  roles_html: z.string().optional(),
  roles: z.array(z.unknown()).optional(),
  module_profile: z.string().optional(),
  modules_html: z.string().optional(),
  block_modules: z.array(z.unknown()).optional(),
  home_settings: z.string().optional(),
  gender: z.string().optional(),
  birth_date: z.string().optional(),
  interest: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  mobile_no: z.string().optional(),
  mute_sounds: z.union([z.literal(0), z.literal(1)]).optional(),
  desk_theme: z.enum(["Light", "Dark", "Automatic"]).optional(),
  banner_image: z.string().optional(),
  search_bar: z.union([z.literal(0), z.literal(1)]).optional(),
  notifications: z.union([z.literal(0), z.literal(1)]).optional(),
  list_sidebar: z.union([z.literal(0), z.literal(1)]).optional(),
  bulk_actions: z.union([z.literal(0), z.literal(1)]).optional(),
  view_switcher: z.union([z.literal(0), z.literal(1)]).optional(),
  form_sidebar: z.union([z.literal(0), z.literal(1)]).optional(),
  timeline: z.union([z.literal(0), z.literal(1)]).optional(),
  dashboard: z.union([z.literal(0), z.literal(1)]).optional(),
  new_password: z.string().optional(),
  logout_all_sessions: z.union([z.literal(0), z.literal(1)]).optional(),
  reset_password_key: z.string().optional(),
  last_reset_password_key_generated_on: z.string().optional(),
  last_password_reset_date: z.string().optional(),
  redirect_url: z.string().optional(),
  document_follow_notify: z.union([z.literal(0), z.literal(1)]).optional(),
  document_follow_frequency: z.enum(["Hourly", "Daily", "Weekly"]).optional(),
  follow_created_documents: z.union([z.literal(0), z.literal(1)]).optional(),
  follow_commented_documents: z.union([z.literal(0), z.literal(1)]).optional(),
  follow_liked_documents: z.union([z.literal(0), z.literal(1)]).optional(),
  follow_assigned_documents: z.union([z.literal(0), z.literal(1)]).optional(),
  follow_shared_documents: z.union([z.literal(0), z.literal(1)]).optional(),
  email_signature: z.string().optional(),
  thread_notify: z.union([z.literal(0), z.literal(1)]).optional(),
  send_me_a_copy: z.union([z.literal(0), z.literal(1)]).optional(),
  allowed_in_mentions: z.union([z.literal(0), z.literal(1)]).optional(),
  user_emails: z.array(z.unknown()).optional(),
  default_workspace: z.string().optional(),
  default_app: z.string().optional(),
  defaults: z.array(z.unknown()).optional(),
  simultaneous_sessions: z.number().int().optional(),
  restrict_ip: z.string().optional(),
  last_ip: z.string().optional(),
  login_after: z.number().int().optional(),
  user_type: z.string().optional(),
  last_active: z.string().optional(),
  login_before: z.number().int().optional(),
  bypass_restrict_ip_check_if_2fa_enabled: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  last_login: z.string().optional(),
  last_known_versions: z.string().optional(),
  social_logins: z.array(z.unknown()).optional(),
  api_key: z.string().optional(),
  generate_keys: z.unknown().optional(),
  api_secret: z.string().optional(),
  onboarding_status: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const UserCreateSchema = UserSchema.pick({
  email: true,
  first_name: true,
}).extend({});

export const UserUpdateSchema = UserSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type UserSchemaType = z.infer<typeof UserSchema>;

/**
 * Company Zod Schema
 * @doctype Company
 * @generated 2026-01-14T18:05:48.296Z
 */
export const CompanySchema = z.object({
  company_name: z.string().min(1, "Company is required"),
  abbr: z.string().min(1, "Abbr is required"),
  default_currency: z.string().min(1, "Default Currency is required"),
  country: z.string().min(1, "Country is required"),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  default_holiday_list: z.string().optional(),
  default_letter_head: z.string().optional(),
  tax_id: z.string().optional(),
  domain: z.string().optional(),
  date_of_establishment: z.string().optional(),
  parent_company: z.string().optional(),
  company_logo: z.string().optional(),
  date_of_incorporation: z.string().optional(),
  phone_no: z.string().optional(),
  email: z.string().optional(),
  company_description: z.string().optional(),
  date_of_commencement: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  address_html: z.string().optional(),
  registration_details: z.string().optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  create_chart_of_accounts_based_on: z
    .enum(["Standard Template", "Existing Company"])
    .optional(),
  existing_company: z.string().optional(),
  chart_of_accounts: z.string().optional(),
  default_bank_account: z.string().optional(),
  default_cash_account: z.string().optional(),
  default_receivable_account: z.string().optional(),
  default_payable_account: z.string().optional(),
  write_off_account: z.string().optional(),
  unrealized_profit_loss_account: z.string().optional(),
  allow_account_creation_against_child_company: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  default_expense_account: z.string().optional(),
  default_income_account: z.string().optional(),
  default_discount_account: z.string().optional(),
  payment_terms: z.string().optional(),
  cost_center: z.string().optional(),
  default_finance_book: z.string().optional(),
  exchange_gain_loss_account: z.string().optional(),
  unrealized_exchange_gain_loss_account: z.string().optional(),
  round_off_account: z.string().optional(),
  round_off_cost_center: z.string().optional(),
  round_off_for_opening: z.string().optional(),
  default_deferred_revenue_account: z.string().optional(),
  default_deferred_expense_account: z.string().optional(),
  book_advance_payments_in_separate_party_account: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  reconcile_on_advance_payment_date: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  reconciliation_takes_effect_on: z
    .enum([
      "Advance Payment Date",
      "Oldest Of Invoice Or Advance",
      "Reconciliation Date",
    ])
    .optional(),
  default_advance_received_account: z.string().optional(),
  default_advance_paid_account: z.string().optional(),
  auto_exchange_rate_revaluation: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  auto_err_frequency: z.enum(["Daily", "Weekly", "Monthly"]).optional(),
  submit_err_jv: z.union([z.literal(0), z.literal(1)]).optional(),
  exception_budget_approver_role: z.string().optional(),
  accumulated_depreciation_account: z.string().optional(),
  depreciation_expense_account: z.string().optional(),
  series_for_depreciation_entry: z.string().optional(),
  expenses_included_in_asset_valuation: z.string().optional(),
  disposal_account: z.string().optional(),
  depreciation_cost_center: z.string().optional(),
  capital_work_in_progress_account: z.string().optional(),
  asset_received_but_not_billed: z.string().optional(),
  default_buying_terms: z.string().optional(),
  sales_monthly_history: z.string().optional(),
  monthly_sales_target: z.number().optional(),
  total_monthly_sales: z.number().optional(),
  default_selling_terms: z.string().optional(),
  default_sales_contact: z.string().optional(),
  default_warehouse_for_sales_return: z.string().optional(),
  credit_limit: z.number().optional(),
  transactions_annual_history: z.string().optional(),
  enable_perpetual_inventory: z.union([z.literal(0), z.literal(1)]).optional(),
  enable_provisional_accounting_for_non_stock_items: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  default_inventory_account: z.string().optional(),
  stock_adjustment_account: z.string().optional(),
  default_in_transit_warehouse: z.string().optional(),
  stock_received_but_not_billed: z.string().optional(),
  default_provisional_account: z.string().optional(),
  expenses_included_in_valuation: z.string().optional(),
  default_operating_cost_account: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const CompanyCreateSchema = CompanySchema.pick({
  company_name: true,
  abbr: true,
  default_currency: true,
  country: true,
}).extend({
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const CompanyUpdateSchema = CompanySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type CompanySchemaType = z.infer<typeof CompanySchema>;

/**
 * Currency Zod Schema
 * @doctype Currency
 * @generated 2026-01-14T18:05:48.296Z
 */
export const CurrencySchema = z.object({
  currency_name: z.string().min(1, "Currency Name is required"),
  enabled: z.union([z.literal(0), z.literal(1)]).optional(),
  fraction: z.string().optional(),
  fraction_units: z.number().int().optional(),
  smallest_currency_fraction_value: z.number().optional(),
  symbol: z.string().optional(),
  symbol_on_right: z.union([z.literal(0), z.literal(1)]).optional(),
  number_format: z
    .enum([
      "#,###.##",
      "#.###,##",
      "# ###.##",
      "# ###,##",
      "#'###.##",
      "#, ###.##",
      "#,##,###.##",
      "#,###.###",
      "#.###",
      "#,###",
    ])
    .optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const CurrencyCreateSchema = CurrencySchema.pick({
  currency_name: true,
}).extend({});

export const CurrencyUpdateSchema = CurrencySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type CurrencySchemaType = z.infer<typeof CurrencySchema>;

/**
 * Country Zod Schema
 * @doctype Country
 * @generated 2026-01-14T18:05:48.296Z
 */
export const CountrySchema = z.object({
  country_name: z.string().min(1, "Country Name is required"),
  date_format: z.string().optional(),
  time_format: z.string().optional(),
  time_zones: z.string().optional(),
  code: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const CountryCreateSchema = CountrySchema.pick({
  country_name: true,
}).extend({});

export const CountryUpdateSchema = CountrySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type CountrySchemaType = z.infer<typeof CountrySchema>;

/**
 * Territory Zod Schema
 * @doctype Territory
 * @generated 2026-01-14T18:05:48.296Z
 */
export const TerritorySchema = z.object({
  territory_name: z.string().min(1, "Territory Name is required"),
  parent_territory: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  territory_manager: z.string().optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  targets: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const TerritoryCreateSchema = TerritorySchema.pick({
  territory_name: true,
  parent_territory: true,
}).extend({
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const TerritoryUpdateSchema = TerritorySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type TerritorySchemaType = z.infer<typeof TerritorySchema>;

/**
 * Department Zod Schema
 * @doctype Department
 * @generated 2026-01-14T18:05:48.296Z
 */
export const DepartmentSchema = z.object({
  department_name: z.string().min(1, "Department is required"),
  parent_department: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const DepartmentCreateSchema = DepartmentSchema.pick({
  department_name: true,
  company: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const DepartmentUpdateSchema = DepartmentSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type DepartmentSchemaType = z.infer<typeof DepartmentSchema>;

/**
 * Designation Zod Schema
 * @doctype Designation
 * @generated 2026-01-14T18:05:48.296Z
 */
export const DesignationSchema = z.object({
  designation_name: z.string().min(1, "Designation is required"),
  description: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const DesignationCreateSchema = DesignationSchema.pick({
  designation_name: true,
}).extend({
  description: z.string().optional(),
});

export const DesignationUpdateSchema = DesignationSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type DesignationSchemaType = z.infer<typeof DesignationSchema>;

/**
 * Branch Zod Schema
 * @doctype Branch
 * @generated 2026-01-14T18:05:48.296Z
 */
export const BranchSchema = z.object({
  branch: z.string().min(1, "Branch is required"),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const BranchCreateSchema = BranchSchema.pick({
  branch: true,
}).extend({});

export const BranchUpdateSchema = BranchSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type BranchSchemaType = z.infer<typeof BranchSchema>;

/**
 * Employee Zod Schema
 * @doctype Employee
 * @generated 2026-01-14T18:05:48.296Z
 */
export const EmployeeSchema = z.object({
  employee: z.string().optional(),
  naming_series: z.enum(["HR-EMP-"]).optional(),
  first_name: z.string().min(1, "First Name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  employee_name: z.string().optional(),
  gender: z.string().min(1, "Gender is required"),
  date_of_birth: z.string().min(1, "Date of Birth is required"),
  salutation: z.string().optional(),
  date_of_joining: z.string().min(1, "Date of Joining is required"),
  image: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  user_id: z.string().optional(),
  create_user: z.unknown().optional(),
  create_user_permission: z.union([z.literal(0), z.literal(1)]).optional(),
  company: z.string().min(1, "Company is required"),
  department: z.string().optional(),
  employee_number: z.string().optional(),
  designation: z.string().optional(),
  reports_to: z.string().optional(),
  branch: z.string().optional(),
  scheduled_confirmation_date: z.string().optional(),
  final_confirmation_date: z.string().optional(),
  contract_end_date: z.string().optional(),
  notice_number_of_days: z.number().int().optional(),
  date_of_retirement: z.string().optional(),
  cell_number: z.string().optional(),
  personal_email: z.string().optional(),
  company_email: z.string().optional(),
  prefered_contact_email: z
    .enum(["Company Email", "Personal Email", "User ID"])
    .optional(),
  prefered_email: z.string().optional(),
  unsubscribed: z.union([z.literal(0), z.literal(1)]).optional(),
  current_address: z.string().optional(),
  current_accommodation_type: z.enum(["Rented", "Owned"]).optional(),
  permanent_address: z.string().optional(),
  permanent_accommodation_type: z.enum(["Rented", "Owned"]).optional(),
  person_to_be_contacted: z.string().optional(),
  emergency_phone_number: z.string().optional(),
  relation: z.string().optional(),
  attendance_device_id: z.string().optional(),
  holiday_list: z.string().optional(),
  ctc: z.number().optional(),
  salary_currency: z.string().optional(),
  salary_mode: z.enum(["Bank", "Cash", "Cheque"]).optional(),
  bank_name: z.string().optional(),
  bank_ac_no: z.string().optional(),
  iban: z.string().optional(),
  marital_status: z
    .enum(["Single", "Married", "Divorced", "Widowed"])
    .optional(),
  family_background: z.string().optional(),
  blood_group: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional(),
  health_details: z.string().optional(),
  passport_number: z.string().optional(),
  valid_upto: z.string().optional(),
  date_of_issue: z.string().optional(),
  place_of_issue: z.string().optional(),
  bio: z.string().optional(),
  education: z.array(z.unknown()).optional(),
  external_work_history: z.array(z.unknown()).optional(),
  internal_work_history: z.array(z.unknown()).optional(),
  resignation_letter_date: z.string().optional(),
  relieving_date: z.string().optional(),
  held_on: z.string().optional(),
  new_workplace: z.string().optional(),
  leave_encashed: z.enum(["Yes", "No"]).optional(),
  encashment_date: z.string().optional(),
  reason_for_leaving: z.string().optional(),
  feedback: z.string().optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const EmployeeCreateSchema = EmployeeSchema.pick({
  first_name: true,
  last_name: true,
  employee_name: true,
  gender: true,
  date_of_birth: true,
  date_of_joining: true,
  status: true,
  company: true,
  department: true,
  designation: true,
}).extend({});

export const EmployeeUpdateSchema = EmployeeSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type EmployeeSchemaType = z.infer<typeof EmployeeSchema>;

/**
 * Salutation Zod Schema
 * @doctype Salutation
 * @generated 2026-01-14T18:05:48.297Z
 */
export const SalutationSchema = z.object({
  salutation: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SalutationUpdateSchema = SalutationSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type SalutationSchemaType = z.infer<typeof SalutationSchema>;

/**
 * Gender Zod Schema
 * @doctype Gender
 * @generated 2026-01-14T18:05:48.297Z
 */
export const GenderSchema = z.object({
  gender: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const GenderUpdateSchema = GenderSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type GenderSchemaType = z.infer<typeof GenderSchema>;

/**
 * Letter Head Zod Schema
 * @doctype Letter Head
 * @generated 2026-01-14T18:05:48.297Z
 */
export const LetterHeadSchema = z.object({
  letter_head_name: z.string().min(1, "Letter Head Name is required"),
  source: z.enum(["Image", "HTML"]).optional(),
  footer_source: z.enum(["Image", "HTML"]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  is_default: z.union([z.literal(0), z.literal(1)]).optional(),
  image: z.string().optional(),
  image_height: z.number().optional(),
  image_width: z.number().optional(),
  align: z.enum(["Left", "Right", "Center"]).optional(),
  content: z.string().optional(),
  footer: z.string().optional(),
  footer_image: z.string().optional(),
  footer_image_height: z.number().optional(),
  footer_image_width: z.number().optional(),
  footer_align: z.enum(["Left", "Right", "Center"]).optional(),
  header_script: z.string().optional(),
  footer_script: z.string().optional(),
  instructions: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const LetterHeadCreateSchema = LetterHeadSchema.pick({
  letter_head_name: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const LetterHeadUpdateSchema = LetterHeadSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type LetterHeadSchemaType = z.infer<typeof LetterHeadSchema>;

/**
 * Print Heading Zod Schema
 * @doctype Print Heading
 * @generated 2026-01-14T18:05:48.297Z
 */
export const PrintHeadingSchema = z.object({
  print_heading: z.string().min(1, "Print Heading is required"),
  description: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const PrintHeadingCreateSchema = PrintHeadingSchema.pick({
  print_heading: true,
}).extend({
  description: z.string().optional(),
});

export const PrintHeadingUpdateSchema = PrintHeadingSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type PrintHeadingSchemaType = z.infer<typeof PrintHeadingSchema>;

/**
 * Terms and Conditions Zod Schema
 * @doctype Terms and Conditions
 * @generated 2026-01-14T18:05:48.297Z
 */
export const TermsAndConditionsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  selling: z.union([z.literal(0), z.literal(1)]).optional(),
  buying: z.union([z.literal(0), z.literal(1)]).optional(),
  terms: z.string().optional(),
  terms_and_conditions_help: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const TermsAndConditionsCreateSchema = TermsAndConditionsSchema.pick({
  title: true,
  terms: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  selling: z.union([z.literal(0), z.literal(1)]).optional(),
  buying: z.union([z.literal(0), z.literal(1)]).optional(),
  terms: z.string().optional(),
});

export const TermsAndConditionsUpdateSchema =
  TermsAndConditionsSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type TermsAndConditionsSchemaType = z.infer<
  typeof TermsAndConditionsSchema
>;

/**
 * Lead Zod Schema
 * @doctype Lead
 * @generated 2026-01-14T18:05:48.297Z
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
  request_type: z
    .enum([
      "Product Enquiry",
      "Request for Information",
      "Suggestions",
      "Other",
    ])
    .optional(),
  email_id: z.string().optional(),
  website: z.string().optional(),
  mobile_no: z.string().optional(),
  whatsapp_no: z.string().optional(),
  phone: z.string().optional(),
  phone_ext: z.string().optional(),
  company_name: z.string().optional(),
  no_of_employees: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
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
  qualification_status: z
    .enum(["Unqualified", "In Process", "Qualified"])
    .optional(),
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
  first_name: true,
  last_name: true,
  lead_name: true,
  email_id: true,
  mobile_no: true,
  phone: true,
  company_name: true,
  industry: true,
  territory: true,
  source: true,
  type: true,
  request_type: true,
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
 * Lead Source Zod Schema
 * @doctype Lead Source
 * @generated 2026-01-14T18:05:48.297Z
 */
export const LeadSourceSchema = z.object({
  source_name: z.string().min(1, "Source Name is required"),
  details: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const LeadSourceCreateSchema = LeadSourceSchema.pick({
  source_name: true,
}).extend({});

export const LeadSourceUpdateSchema = LeadSourceSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type LeadSourceSchemaType = z.infer<typeof LeadSourceSchema>;

/**
 * Industry Type Zod Schema
 * @doctype Industry Type
 * @generated 2026-01-14T18:05:48.297Z
 */
export const IndustryTypeSchema = z.object({
  industry: z.string().min(1, "Industry is required"),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const IndustryTypeCreateSchema = IndustryTypeSchema.pick({
  industry: true,
}).extend({});

export const IndustryTypeUpdateSchema = IndustryTypeSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type IndustryTypeSchemaType = z.infer<typeof IndustryTypeSchema>;

/**
 * Opportunity Zod Schema
 * @doctype Opportunity
 * @generated 2026-01-14T18:05:48.297Z
 */
export const OpportunitySchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  opportunity_from: z.string().min(1, "Opportunity From is required"),
  party_name: z.string().min(1, "Party is required"),
  customer_name: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  opportunity_type: z.string().optional(),
  source: z.string().optional(),
  opportunity_owner: z.string().optional(),
  sales_stage: z.string().optional(),
  expected_closing: z.string().optional(),
  probability: z.number().optional(),
  no_of_employees: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
  annual_revenue: z.number().optional(),
  customer_group: z.string().optional(),
  industry: z.string().optional(),
  market_segment: z.string().optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  territory: z.string().optional(),
  currency: z.string().optional(),
  conversion_rate: z.number().optional(),
  opportunity_amount: z.number().optional(),
  base_opportunity_amount: z.number().optional(),
  company: z.string().min(1, "Company is required"),
  campaign: z.string().optional(),
  transaction_date: z.string().min(1, "Opportunity Date is required"),
  language: z.string().optional(),
  amended_from: z.string().optional(),
  title: z.string().optional(),
  first_response_time: z.string().optional(),
  lost_reasons: z.array(z.unknown()).optional(),
  order_lost_reason: z.string().optional(),
  competitors: z.array(z.unknown()).optional(),
  contact_person: z.string().optional(),
  job_title: z.string().optional(),
  contact_email: z.string().optional(),
  contact_mobile: z.string().optional(),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  phone_ext: z.string().optional(),
  address_html: z.string().optional(),
  customer_address: z.string().optional(),
  address_display: z.string().optional(),
  contact_html: z.string().optional(),
  contact_display: z.string().optional(),
  items: z.array(z.unknown()).optional(),
  base_total: z.number().optional(),
  total: z.number().optional(),
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

export const OpportunityCreateSchema = OpportunitySchema.pick({
  naming_series: true,
  opportunity_from: true,
  party_name: true,
  status: true,
  company: true,
  transaction_date: true,
}).extend({});

export const OpportunityUpdateSchema = OpportunitySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type OpportunitySchemaType = z.infer<typeof OpportunitySchema>;

/**
 * Customer Group Zod Schema
 * @doctype Customer Group
 * @generated 2026-01-14T18:05:48.297Z
 */
export const CustomerGroupSchema = z.object({
  customer_group_name: z.string().min(1, "Customer Group Name is required"),
  parent_customer_group: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  default_price_list: z.string().optional(),
  payment_terms: z.string().optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  accounts: z.array(z.unknown()).optional(),
  credit_limits: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const CustomerGroupCreateSchema = CustomerGroupSchema.pick({
  customer_group_name: true,
  parent_customer_group: true,
}).extend({
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const CustomerGroupUpdateSchema = CustomerGroupSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type CustomerGroupSchemaType = z.infer<typeof CustomerGroupSchema>;

/**
 * Contact Zod Schema
 * @doctype Contact
 * @generated 2026-01-14T18:05:48.297Z
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

/**
 * Address Zod Schema
 * @doctype Address
 * @generated 2026-01-14T18:05:48.297Z
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
  address_title: true,
  address_type: true,
  address_line1: true,
  address_line2: true,
  city: true,
  state: true,
  country: true,
  pincode: true,
  email_id: true,
  phone: true,
  fax: true,
  is_primary_address: true,
  is_shipping_address: true,
  links: true,
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
 * Quotation Zod Schema
 * @doctype Quotation
 * @generated 2026-01-14T18:05:48.297Z
 */
export const QuotationSchema = z.object({
  title: z.string().optional(),
  naming_series: z.string().min(1, "Series is required"),
  quotation_to: z.string().min(1, "Quotation To is required"),
  party_name: z.string().optional(),
  customer_name: z.string().optional(),
  transaction_date: z.string().min(1, "Date is required"),
  valid_till: z.string().optional(),
  order_type: z.string().min(1, "Order Type is required"),
  company: z.string().min(1, "Company is required"),
  has_unit_price_items: z.union([z.literal(0), z.literal(1)]).optional(),
  amended_from: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  conversion_rate: z.number(),
  selling_price_list: z.string().min(1, "Price List is required"),
  price_list_currency: z.string().min(1, "Price List Currency is required"),
  plc_conversion_rate: z.number(),
  ignore_pricing_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  items: z.array(z.unknown()),
  total_qty: z.number().optional(),
  total_net_weight: z.number().optional(),
  base_total: z.number().optional(),
  base_net_total: z.number().optional(),
  total: z.number().optional(),
  net_total: z.number().optional(),
  tax_category: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  shipping_rule: z.string().optional(),
  incoterm: z.string().optional(),
  named_place: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  base_total_taxes_and_charges: z.number().optional(),
  total_taxes_and_charges: z.number().optional(),
  base_grand_total: z.number().optional(),
  base_rounding_adjustment: z.number().optional(),
  base_rounded_total: z.number().optional(),
  base_in_words: z.string().optional(),
  grand_total: z.number().optional(),
  rounding_adjustment: z.number().optional(),
  rounded_total: z.number().optional(),
  disable_rounded_total: z.union([z.literal(0), z.literal(1)]).optional(),
  in_words: z.string().optional(),
  apply_discount_on: z.enum(["Grand Total", "Net Total"]).optional(),
  base_discount_amount: z.number().optional(),
  coupon_code: z.string().optional(),
  additional_discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),
  referral_sales_partner: z.string().optional(),
  other_charges_calculation: z.string().optional(),
  packed_items: z.array(z.unknown()).optional(),
  pricing_rules: z.array(z.unknown()).optional(),
  customer_address: z.string().optional(),
  address_display: z.string().optional(),
  contact_person: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  shipping_address_name: z.string().optional(),
  shipping_address: z.string().optional(),
  company_address: z.string().optional(),
  company_address_display: z.string().optional(),
  company_contact_person: z.string().optional(),
  payment_terms_template: z.string().optional(),
  payment_schedule: z.array(z.unknown()).optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  auto_repeat: z.string().optional(),
  update_auto_repeat_reference: z.unknown().optional(),
  letter_head: z.string().optional(),
  group_same_items: z.union([z.literal(0), z.literal(1)]).optional(),
  select_print_heading: z.string().optional(),
  language: z.string().optional(),
  lost_reasons: z.array(z.unknown()).optional(),
  competitors: z.array(z.unknown()).optional(),
  order_lost_reason: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  campaign: z.string().optional(),
  source: z.string().optional(),
  opportunity: z.string().optional(),
  supplier_quotation: z.string().optional(),
  enq_det: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const QuotationCreateSchema = QuotationSchema.pick({
  naming_series: true,
  quotation_to: true,
  party_name: true,
  customer_name: true,
  transaction_date: true,
  valid_till: true,
  order_type: true,
  company: true,
  currency: true,
  conversion_rate: true,
  selling_price_list: true,
  price_list_currency: true,
  plc_conversion_rate: true,
  items: true,
  status: true,
  // Address & Contact
  customer_address: true,
  contact_person: true,
  // Taxes & Terms
  taxes_and_charges: true,
  taxes: true,
  tc_name: true,
  terms: true,
}).extend({
  // Make some fields optional for flexible creation
  party_name: z.string().optional(),
  customer_name: z.string().optional(),
  valid_till: z.string().optional(),
  customer_address: z.string().optional(),
  contact_person: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
});

export const QuotationUpdateSchema = QuotationSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type QuotationSchemaType = z.infer<typeof QuotationSchema>;

/**
 * Sales Order Zod Schema
 * @doctype Sales Order
 * @generated 2026-01-17T16:29:14.100Z
 */
export const SalesOrderSchema = z.object({
  title: z.string().optional(),
  naming_series: z.string().min(1, "Series is required"),
  customer: z.string().min(1, "Customer is required"),
  customer_name: z.string().optional(),
  tax_id: z.string().optional(),
  order_type: z.string().min(1, "Order Type is required"),
  transaction_date: z.string().min(1, "Date is required"),
  delivery_date: z.string().optional(),
  po_no: z.string().optional(),
  po_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  skip_delivery_note: z.union([z.literal(0), z.literal(1)]).optional(),
  has_unit_price_items: z.union([z.literal(0), z.literal(1)]).optional(),
  amended_from: z.string().optional(),
  cost_center: z.string().optional(),
  project: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  conversion_rate: z.number(),
  selling_price_list: z.string().min(1, "Price List is required"),
  price_list_currency: z.string().min(1, "Price List Currency is required"),
  plc_conversion_rate: z.number(),
  ignore_pricing_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  set_warehouse: z.string().optional(),
  reserve_stock: z.union([z.literal(0), z.literal(1)]).optional(),
  items: z.array(z.unknown()),
  total_qty: z.number().optional(),
  total_net_weight: z.number().optional(),
  base_total: z.number().optional(),
  base_net_total: z.number().optional(),
  total: z.number().optional(),
  net_total: z.number().optional(),
  tax_category: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  shipping_rule: z.string().optional(),
  incoterm: z.string().optional(),
  named_place: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  base_total_taxes_and_charges: z.number().optional(),
  total_taxes_and_charges: z.number().optional(),
  base_grand_total: z.number().optional(),
  base_rounding_adjustment: z.number().optional(),
  base_rounded_total: z.number().optional(),
  base_in_words: z.string().optional(),
  grand_total: z.number().optional(),
  rounding_adjustment: z.number().optional(),
  rounded_total: z.number().optional(),
  in_words: z.string().optional(),
  advance_paid: z.number().optional(),
  disable_rounded_total: z.union([z.literal(0), z.literal(1)]).optional(),
  apply_discount_on: z.enum(["Grand Total", "Net Total"]).optional(),
  base_discount_amount: z.number().optional(),
  coupon_code: z.string().optional(),
  additional_discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),
  other_charges_calculation: z.string().optional(),
  packed_items: z.array(z.unknown()).optional(),
  pricing_rules: z.array(z.unknown()).optional(),
  customer_address: z.string().optional(),
  address_display: z.string().optional(),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  contact_person: z.string().optional(),
  contact_display: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  shipping_address_name: z.string().optional(),
  shipping_address: z.string().optional(),
  dispatch_address_name: z.string().optional(),
  dispatch_address: z.string().optional(),
  company_address: z.string().optional(),
  company_address_display: z.string().optional(),
  company_contact_person: z.string().optional(),
  payment_terms_template: z.string().optional(),
  payment_schedule: z.array(z.unknown()).optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  delivery_status: z
    .enum([
      "Not Delivered",
      "Fully Delivered",
      "Partly Delivered",
      "Closed",
      "Not Applicable",
    ])
    .optional(),
  per_delivered: z.number().optional(),
  per_billed: z.number().optional(),
  per_picked: z.number().optional(),
  billing_status: z
    .enum(["Not Billed", "Fully Billed", "Partly Billed", "Closed"])
    .optional(),
  sales_partner: z.string().optional(),
  amount_eligible_for_commission: z.number().optional(),
  commission_rate: z.number().optional(),
  total_commission: z.number().optional(),
  sales_team: z.array(z.unknown()).optional(),
  loyalty_points: z.number().int().optional(),
  loyalty_amount: z.number().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  auto_repeat: z.string().optional(),
  update_auto_repeat_reference: z.unknown().optional(),
  letter_head: z.string().optional(),
  group_same_items: z.union([z.literal(0), z.literal(1)]).optional(),
  select_print_heading: z.string().optional(),
  language: z.string().optional(),
  is_internal_customer: z.union([z.literal(0), z.literal(1)]).optional(),
  represents_company: z.string().optional(),
  source: z.string().optional(),
  inter_company_order_reference: z.string().optional(),
  campaign: z.string().optional(),
  party_account_currency: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SalesOrderCreateSchema = SalesOrderSchema.pick({
  naming_series: true,
  customer: true,
  order_type: true,
  transaction_date: true,
  company: true,
  currency: true,
  conversion_rate: true,
  selling_price_list: true,
  price_list_currency: true,
  plc_conversion_rate: true,
  items: true,
  status: true,
}).extend({
  // Make delivery_date required for Sales Order (Due Date is critical)
  delivery_date: z.string().min(1, "Delivery Date is required"),
  // Address & Contact
  customer_address: z.string().optional(),
  contact_person: z.string().optional(),
  // Sales Team
  sales_partner: z.string().optional(),
  commission_rate: z.number().optional(),
  // Taxes & Terms
  taxes_and_charges: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  // Customer PO (B2B tracking)
  po_no: z.string().optional(),
  po_date: z.string().optional(),
  // Project linking
  project: z.string().optional(),
});

export const SalesOrderUpdateSchema = SalesOrderSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type SalesOrderSchemaType = z.infer<typeof SalesOrderSchema>;

/**
 * Sales Partner Zod Schema
 * @doctype Sales Partner
 * @generated 2026-01-17T16:29:14.100Z
 */
export const SalesPartnerSchema = z.object({
  partner_name: z.string().min(1, "Sales Partner Name is required"),
  partner_type: z.string().optional(),
  territory: z.string().min(1, "Territory is required"),
  commission_rate: z.number(),
  address_desc: z.string().optional(),
  address_html: z.string().optional(),
  contact_desc: z.string().optional(),
  contact_html: z.string().optional(),
  targets: z.array(z.unknown()).optional(),
  show_in_website: z.union([z.literal(0), z.literal(1)]).optional(),
  referral_code: z.string().optional(),
  route: z.string().optional(),
  logo: z.string().optional(),
  partner_website: z.string().optional(),
  introduction: z.string().optional(),
  description: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SalesPartnerCreateSchema = SalesPartnerSchema.pick({
  partner_name: true,
  commission_rate: true,
}).extend({
  partner_type: z.string().optional(),
  territory: z.string().optional(),
  description: z.string().optional(),
});

export const SalesPartnerUpdateSchema = SalesPartnerSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type SalesPartnerSchemaType = z.infer<typeof SalesPartnerSchema>;

/**
 * Sales Person Zod Schema
 * @doctype Sales Person
 * @generated 2026-01-17T16:29:14.100Z
 */
export const SalesPersonSchema = z.object({
  sales_person_name: z.string().min(1, "Sales Person Name is required"),
  parent_sales_person: z.string().optional(),
  commission_rate: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]),
  enabled: z.union([z.literal(0), z.literal(1)]).optional(),
  employee: z.string().optional(),
  department: z.string().optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  targets: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SalesPersonCreateSchema = SalesPersonSchema.pick({
  sales_person_name: true,
}).extend({
  is_group: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .default(0),
  enabled: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .default(1),
  parent_sales_person: z.string().optional(),
  employee: z.string().optional(),
});

export const SalesPersonUpdateSchema = SalesPersonSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type SalesPersonSchemaType = z.infer<typeof SalesPersonSchema>;

/**
 * Blanket Order Zod Schema
 * @doctype Blanket Order
 * @generated 2026-01-14T18:05:48.298Z
 */
export const BlanketOrderSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  blanket_order_type: z.string().min(1, "Order Type is required"),
  customer: z.string().optional(),
  customer_name: z.string().optional(),
  supplier: z.string().optional(),
  supplier_name: z.string().optional(),
  order_no: z.string().optional(),
  order_date: z.string().optional(),
  from_date: z.string().min(1, "From Date is required"),
  to_date: z.string().min(1, "To Date is required"),
  company: z.string().min(1, "Company is required"),
  items: z.array(z.unknown()),
  amended_from: z.string().optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const BlanketOrderCreateSchema = BlanketOrderSchema.pick({
  naming_series: true,
  blanket_order_type: true,
  from_date: true,
  to_date: true,
  company: true,
  items: true,
}).extend({});

export const BlanketOrderUpdateSchema = BlanketOrderSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type BlanketOrderSchemaType = z.infer<typeof BlanketOrderSchema>;

/**
 * Installation Note Zod Schema
 * @doctype Installation Note
 * @generated 2026-01-14T18:05:48.298Z
 */
export const InstallationNoteSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  customer: z.string().min(1, "Customer is required"),
  customer_address: z.string().optional(),
  contact_person: z.string().optional(),
  customer_name: z.string().optional(),
  address_display: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  territory: z.string().min(1, "Territory is required"),
  customer_group: z.string().optional(),
  inst_date: z.string().min(1, "Installation Date is required"),
  inst_time: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  company: z.string().min(1, "Company is required"),
  amended_from: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(z.unknown()),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const InstallationNoteCreateSchema = InstallationNoteSchema.pick({
  naming_series: true,
  customer: true,
  territory: true,
  inst_date: true,
  status: true,
  company: true,
  items: true,
}).extend({});

export const InstallationNoteUpdateSchema =
  InstallationNoteSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type InstallationNoteSchemaType = z.infer<typeof InstallationNoteSchema>;

/**
 * Supplier Zod Schema
 * @doctype Supplier
 * @generated 2026-01-14T18:05:48.298Z
 */
export const SupplierSchema = z.object({
  naming_series: z.enum(["SUP-.YYYY.-"]).optional(),
  supplier_name: z.string().min(1, "Supplier Name is required"),
  country: z.string().optional(),
  supplier_group: z.string().optional(),
  supplier_type: z.string().min(1, "Supplier Type is required"),
  is_transporter: z.union([z.literal(0), z.literal(1)]).optional(),
  image: z.string().optional(),
  default_currency: z.string().optional(),
  default_bank_account: z.string().optional(),
  default_price_list: z.string().optional(),
  is_internal_supplier: z.union([z.literal(0), z.literal(1)]).optional(),
  represents_company: z.string().optional(),
  companies: z.array(z.unknown()).optional(),
  supplier_details: z.string().optional(),
  website: z.string().optional(),
  language: z.string().optional(),
  tax_id: z.string().optional(),
  tax_category: z.string().optional(),
  tax_withholding_category: z.string().optional(),
  address_html: z.string().optional(),
  contact_html: z.string().optional(),
  supplier_primary_address: z.string().optional(),
  primary_address: z.string().optional(),
  supplier_primary_contact: z.string().optional(),
  mobile_no: z.string().optional(),
  email_id: z.string().optional(),
  payment_terms: z.string().optional(),
  accounts: z.array(z.unknown()).optional(),
  allow_purchase_invoice_creation_without_purchase_order: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  allow_purchase_invoice_creation_without_purchase_receipt: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  is_frozen: z.union([z.literal(0), z.literal(1)]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  warn_rfqs: z.union([z.literal(0), z.literal(1)]).optional(),
  warn_pos: z.union([z.literal(0), z.literal(1)]).optional(),
  prevent_rfqs: z.union([z.literal(0), z.literal(1)]).optional(),
  prevent_pos: z.union([z.literal(0), z.literal(1)]).optional(),
  on_hold: z.union([z.literal(0), z.literal(1)]).optional(),
  hold_type: z.enum(["All", "Invoices", "Payments"]).optional(),
  release_date: z.string().optional(),
  portal_users: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SupplierCreateSchema = SupplierSchema.pick({
  supplier_name: true,
  supplier_type: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const SupplierUpdateSchema = SupplierSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type SupplierSchemaType = z.infer<typeof SupplierSchema>;

/**
 * Supplier Group Zod Schema
 * @doctype Supplier Group
 * @generated 2026-01-14T18:05:48.298Z
 */
export const SupplierGroupSchema = z.object({
  supplier_group_name: z.string().min(1, "Supplier Group Name is required"),
  parent_supplier_group: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  payment_terms: z.string().optional(),
  accounts: z.array(z.unknown()).optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SupplierGroupCreateSchema = SupplierGroupSchema.pick({
  supplier_group_name: true,
}).extend({
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const SupplierGroupUpdateSchema = SupplierGroupSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type SupplierGroupSchemaType = z.infer<typeof SupplierGroupSchema>;

/**
 * Material Request Zod Schema
 * @doctype Material Request
 * @generated 2026-01-14T18:05:48.298Z
 */
export const MaterialRequestSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  title: z.string().optional(),
  material_request_type: z.string().min(1, "Purpose is required"),
  customer: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  transaction_date: z.string().min(1, "Transaction Date is required"),
  schedule_date: z.string().optional(),
  buying_price_list: z.string().optional(),
  amended_from: z.string().optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  set_from_warehouse: z.string().optional(),
  set_warehouse: z.string().optional(),
  items: z.array(z.unknown()),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  status: z
    .enum([
      "Draft",
      "Submitted",
      "Stopped",
      "Cancelled",
      "Pending",
      "Partially Ordered",
      "Partially Received",
      "Ordered",
      "Issued",
      "Transferred",
      "Received",
    ])
    .optional(),
  per_ordered: z.number().optional(),
  transfer_status: z
    .enum(["Not Started", "In Transit", "Completed"])
    .optional(),
  per_received: z.number().optional(),
  letter_head: z.string().optional(),
  select_print_heading: z.string().optional(),
  job_card: z.string().optional(),
  work_order: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const MaterialRequestCreateSchema = MaterialRequestSchema.pick({
  naming_series: true,
  material_request_type: true,
  company: true,
  transaction_date: true,
  items: true,
}).extend({});

export const MaterialRequestUpdateSchema = MaterialRequestSchema.partial().omit(
  {
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  },
);

export type MaterialRequestSchemaType = z.infer<typeof MaterialRequestSchema>;

/**
 * Request for Quotation Zod Schema
 * @doctype Request for Quotation
 * @generated 2026-01-14T18:05:48.298Z
 */
export const RequestForQuotationSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  company: z.string().min(1, "Company is required"),
  billing_address: z.string().optional(),
  billing_address_display: z.string().optional(),
  vendor: z.string().optional(),
  transaction_date: z.string().min(1, "Date is required"),
  schedule_date: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  has_unit_price_items: z.union([z.literal(0), z.literal(1)]).optional(),
  amended_from: z.string().optional(),
  suppliers: z.array(z.unknown()),
  items: z.array(z.unknown()),
  email_template: z.string().optional(),
  preview: z.unknown().optional(),
  html_llwp: z.string().optional(),
  send_attached_files: z.union([z.literal(0), z.literal(1)]).optional(),
  send_document_print: z.union([z.literal(0), z.literal(1)]).optional(),
  message_for_supplier: z.string().min(1, "Message for Supplier is required"),
  incoterm: z.string().optional(),
  named_place: z.string().optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  select_print_heading: z.string().optional(),
  letter_head: z.string().optional(),
  opportunity: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const RequestForQuotationCreateSchema = RequestForQuotationSchema.pick({
  naming_series: true,
  company: true,
  transaction_date: true,
  status: true,
  suppliers: true,
  items: true,
  message_for_supplier: true,
}).extend({});

export const RequestForQuotationUpdateSchema =
  RequestForQuotationSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type RequestForQuotationSchemaType = z.infer<
  typeof RequestForQuotationSchema
>;

/**
 * Supplier Quotation Zod Schema
 * @doctype Supplier Quotation
 * @generated 2026-01-14T18:05:48.298Z
 */
export const SupplierQuotationSchema = z.object({
  title: z.string().optional(),
  naming_series: z.string().min(1, "Series is required"),
  supplier: z.string().min(1, "Supplier is required"),
  supplier_name: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  status: z.string().min(1, "Status is required"),
  transaction_date: z.string().min(1, "Date is required"),
  valid_till: z.string().optional(),
  quotation_number: z.string().optional(),
  has_unit_price_items: z.union([z.literal(0), z.literal(1)]).optional(),
  amended_from: z.string().optional(),
  cost_center: z.string().optional(),
  project: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  conversion_rate: z.number(),
  buying_price_list: z.string().optional(),
  price_list_currency: z.string().optional(),
  plc_conversion_rate: z.number().optional(),
  ignore_pricing_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  items: z.array(z.unknown()),
  total_qty: z.number().optional(),
  total_net_weight: z.number().optional(),
  base_total: z.number().optional(),
  base_net_total: z.number().optional(),
  total: z.number().optional(),
  net_total: z.number().optional(),
  tax_category: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  shipping_rule: z.string().optional(),
  incoterm: z.string().optional(),
  named_place: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  base_taxes_and_charges_added: z.number().optional(),
  base_taxes_and_charges_deducted: z.number().optional(),
  base_total_taxes_and_charges: z.number().optional(),
  taxes_and_charges_added: z.number().optional(),
  taxes_and_charges_deducted: z.number().optional(),
  total_taxes_and_charges: z.number().optional(),
  apply_discount_on: z.enum(["Grand Total", "Net Total"]).optional(),
  base_discount_amount: z.number().optional(),
  additional_discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),
  base_grand_total: z.number().optional(),
  base_rounding_adjustment: z.number().optional(),
  base_rounded_total: z.number().optional(),
  base_in_words: z.string().optional(),
  grand_total: z.number().optional(),
  rounding_adjustment: z.number().optional(),
  rounded_total: z.number().optional(),
  in_words: z.string().optional(),
  disable_rounded_total: z.union([z.literal(0), z.literal(1)]).optional(),
  other_charges_calculation: z.string().optional(),
  pricing_rules: z.array(z.unknown()).optional(),
  supplier_address: z.string().optional(),
  address_display: z.string().optional(),
  contact_person: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_address_display: z.string().optional(),
  billing_address: z.string().optional(),
  billing_address_display: z.string().optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  letter_head: z.string().optional(),
  group_same_items: z.union([z.literal(0), z.literal(1)]).optional(),
  select_print_heading: z.string().optional(),
  language: z.string().optional(),
  auto_repeat: z.string().optional(),
  update_auto_repeat_reference: z.unknown().optional(),
  is_subcontracted: z.union([z.literal(0), z.literal(1)]).optional(),
  opportunity: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SupplierQuotationCreateSchema = SupplierQuotationSchema.pick({
  naming_series: true,
  supplier: true,
  company: true,
  status: true,
  transaction_date: true,
  currency: true,
  conversion_rate: true,
  items: true,
}).extend({});

export const SupplierQuotationUpdateSchema =
  SupplierQuotationSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type SupplierQuotationSchemaType = z.infer<
  typeof SupplierQuotationSchema
>;

/**
 * Purchase Order Zod Schema
 * @doctype Purchase Order
 * @generated 2026-01-14T18:05:48.298Z
 */
export const PurchaseOrderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  naming_series: z.string().min(1, "Series is required"),
  supplier: z.string().min(1, "Supplier is required"),
  supplier_name: z.string().optional(),
  order_confirmation_no: z.string().optional(),
  order_confirmation_date: z.string().optional(),
  get_items_from_open_material_requests: z.unknown().optional(),
  transaction_date: z.string().min(1, "Date is required"),
  schedule_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  apply_tds: z.union([z.literal(0), z.literal(1)]).optional(),
  tax_withholding_category: z.string().optional(),
  is_subcontracted: z.union([z.literal(0), z.literal(1)]).optional(),
  has_unit_price_items: z.union([z.literal(0), z.literal(1)]).optional(),
  supplier_warehouse: z.string().optional(),
  amended_from: z.string().optional(),
  cost_center: z.string().optional(),
  project: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  conversion_rate: z.number(),
  buying_price_list: z.string().optional(),
  price_list_currency: z.string().optional(),
  plc_conversion_rate: z.number().optional(),
  ignore_pricing_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  set_from_warehouse: z.string().optional(),
  set_warehouse: z.string().optional(),
  items: z.array(z.unknown()),
  total_qty: z.number().optional(),
  total_net_weight: z.number().optional(),
  base_total: z.number().optional(),
  base_net_total: z.number().optional(),
  total: z.number().optional(),
  net_total: z.number().optional(),
  tax_withholding_net_total: z.number().optional(),
  base_tax_withholding_net_total: z.number().optional(),
  pricing_rules: z.array(z.unknown()).optional(),
  set_reserve_warehouse: z.string().optional(),
  supplied_items: z.array(z.unknown()).optional(),
  tax_category: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  shipping_rule: z.string().optional(),
  incoterm: z.string().optional(),
  named_place: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  base_taxes_and_charges_added: z.number().optional(),
  base_taxes_and_charges_deducted: z.number().optional(),
  base_total_taxes_and_charges: z.number().optional(),
  taxes_and_charges_added: z.number().optional(),
  taxes_and_charges_deducted: z.number().optional(),
  total_taxes_and_charges: z.number().optional(),
  base_grand_total: z.number().optional(),
  base_rounding_adjustment: z.number().optional(),
  base_in_words: z.string().optional(),
  base_rounded_total: z.number().optional(),
  grand_total: z.number().optional(),
  rounding_adjustment: z.number().optional(),
  rounded_total: z.number().optional(),
  disable_rounded_total: z.union([z.literal(0), z.literal(1)]).optional(),
  in_words: z.string().optional(),
  advance_paid: z.number().optional(),
  apply_discount_on: z.enum(["Grand Total", "Net Total"]).optional(),
  base_discount_amount: z.number().optional(),
  additional_discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),
  other_charges_calculation: z.string().optional(),
  supplier_address: z.string().optional(),
  address_display: z.string().optional(),
  contact_person: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  dispatch_address: z.string().optional(),
  dispatch_address_display: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_address_display: z.string().optional(),
  billing_address: z.string().optional(),
  billing_address_display: z.string().optional(),
  customer: z.string().optional(),
  customer_name: z.string().optional(),
  customer_contact_person: z.string().optional(),
  customer_contact_display: z.string().optional(),
  customer_contact_mobile: z.string().optional(),
  customer_contact_email: z.string().optional(),
  payment_terms_template: z.string().optional(),
  payment_schedule: z.array(z.unknown()).optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  per_billed: z.number().optional(),
  per_received: z.number().optional(),
  letter_head: z.string().optional(),
  group_same_items: z.union([z.literal(0), z.literal(1)]).optional(),
  select_print_heading: z.string().optional(),
  language: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  auto_repeat: z.string().optional(),
  update_auto_repeat_reference: z.unknown().optional(),
  is_internal_supplier: z.union([z.literal(0), z.literal(1)]).optional(),
  represents_company: z.string().optional(),
  ref_sq: z.string().optional(),
  party_account_currency: z.string().optional(),
  inter_company_order_reference: z.string().optional(),
  is_old_subcontracting_flow: z.union([z.literal(0), z.literal(1)]).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const PurchaseOrderCreateSchema = PurchaseOrderSchema.pick({
  title: true,
  naming_series: true,
  supplier: true,
  transaction_date: true,
  company: true,
  currency: true,
  conversion_rate: true,
  items: true,
  status: true,
}).extend({});

export const PurchaseOrderUpdateSchema = PurchaseOrderSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type PurchaseOrderSchemaType = z.infer<typeof PurchaseOrderSchema>;

/**
 * Purchase Receipt Zod Schema
 * @doctype Purchase Receipt
 * @generated 2026-01-14T18:05:48.298Z
 */
export const PurchaseReceiptSchema = z.object({
  title: z.string().optional(),
  naming_series: z.string().min(1, "Series is required"),
  supplier: z.string().min(1, "Supplier is required"),
  supplier_name: z.string().optional(),
  supplier_delivery_note: z.string().optional(),
  subcontracting_receipt: z.string().optional(),
  posting_date: z.string().min(1, "Date is required"),
  posting_time: z.string().min(1, "Posting Time is required"),
  set_posting_time: z.union([z.literal(0), z.literal(1)]).optional(),
  company: z.string().min(1, "Company is required"),
  apply_putaway_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  is_return: z.union([z.literal(0), z.literal(1)]).optional(),
  return_against: z.string().optional(),
  cost_center: z.string().optional(),
  project: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  conversion_rate: z.number(),
  buying_price_list: z.string().optional(),
  price_list_currency: z.string().optional(),
  plc_conversion_rate: z.number().optional(),
  ignore_pricing_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  set_warehouse: z.string().optional(),
  set_from_warehouse: z.string().optional(),
  rejected_warehouse: z.string().optional(),
  is_subcontracted: z.union([z.literal(0), z.literal(1)]).optional(),
  supplier_warehouse: z.string().optional(),
  items: z.array(z.unknown()),
  total_qty: z.number().optional(),
  total_net_weight: z.number().optional(),
  base_total: z.number().optional(),
  base_net_total: z.number(),
  total: z.number().optional(),
  net_total: z.number().optional(),
  tax_withholding_net_total: z.number().optional(),
  base_tax_withholding_net_total: z.number().optional(),
  tax_category: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  shipping_rule: z.string().optional(),
  incoterm: z.string().optional(),
  named_place: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  base_taxes_and_charges_added: z.number().optional(),
  base_taxes_and_charges_deducted: z.number().optional(),
  base_total_taxes_and_charges: z.number().optional(),
  taxes_and_charges_added: z.number().optional(),
  taxes_and_charges_deducted: z.number().optional(),
  total_taxes_and_charges: z.number().optional(),
  base_grand_total: z.number().optional(),
  base_rounding_adjustment: z.number().optional(),
  base_rounded_total: z.number().optional(),
  base_in_words: z.string().optional(),
  grand_total: z.number().optional(),
  rounding_adjustment: z.number().optional(),
  rounded_total: z.number().optional(),
  in_words: z.string().optional(),
  disable_rounded_total: z.union([z.literal(0), z.literal(1)]).optional(),
  apply_discount_on: z.enum(["Grand Total", "Net Total"]).optional(),
  base_discount_amount: z.number().optional(),
  additional_discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),
  other_charges_calculation: z.string().optional(),
  pricing_rules: z.array(z.unknown()).optional(),
  get_current_stock: z.unknown().optional(),
  supplied_items: z.array(z.unknown()).optional(),
  supplier_address: z.string().optional(),
  address_display: z.string().optional(),
  contact_person: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  dispatch_address: z.string().optional(),
  dispatch_address_display: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_address_display: z.string().optional(),
  billing_address: z.string().optional(),
  billing_address_display: z.string().optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  per_billed: z.number().optional(),
  per_returned: z.number().optional(),
  auto_repeat: z.string().optional(),
  letter_head: z.string().optional(),
  group_same_items: z.union([z.literal(0), z.literal(1)]).optional(),
  select_print_heading: z.string().optional(),
  language: z.string().optional(),
  transporter_name: z.string().optional(),
  lr_no: z.string().optional(),
  lr_date: z.string().optional(),
  instructions: z.string().optional(),
  is_internal_supplier: z.union([z.literal(0), z.literal(1)]).optional(),
  represents_company: z.string().optional(),
  inter_company_reference: z.string().optional(),
  remarks: z.string().optional(),
  range: z.string().optional(),
  amended_from: z.string().optional(),
  is_old_subcontracting_flow: z.union([z.literal(0), z.literal(1)]).optional(),
  other_details: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const PurchaseReceiptCreateSchema = PurchaseReceiptSchema.pick({
  naming_series: true,
  supplier: true,
  posting_date: true,
  posting_time: true,
  company: true,
  currency: true,
  conversion_rate: true,
  items: true,
  base_net_total: true,
  status: true,
}).extend({});

export const PurchaseReceiptUpdateSchema = PurchaseReceiptSchema.partial().omit(
  {
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  },
);

export type PurchaseReceiptSchemaType = z.infer<typeof PurchaseReceiptSchema>;

/** Purchase Invoice moved to ACCOUNTING MODULE section at end of file */
// Purchase Invoice removed

/**
 * Item Zod Schema
 * @doctype Item
 * @generated 2026-01-14T18:05:48.299Z
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
  default_material_request_type: z
    .enum([
      "Purchase",
      "Material Transfer",
      "Material Issue",
      "Manufacture",
      "Customer Provided",
    ])
    .optional(),
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
  inspection_required_before_purchase: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  quality_inspection_template: z.string().optional(),
  inspection_required_before_delivery: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  include_item_in_manufacturing: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
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

/**
 * Item Group Zod Schema
 * @doctype Item Group
 * @generated 2026-01-14T18:05:48.299Z
 */
export const ItemGroupSchema = z.object({
  item_group_name: z.string().min(1, "Item Group Name is required"),
  parent_item_group: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  image: z.string().optional(),
  item_group_defaults: z.array(z.unknown()).optional(),
  taxes: z.array(z.unknown()).optional(),
  lft: z.number().int().optional(),
  old_parent: z.string().optional(),
  rgt: z.number().int().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ItemGroupCreateSchema = ItemGroupSchema.pick({
  item_group_name: true,
}).extend({
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const ItemGroupUpdateSchema = ItemGroupSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ItemGroupSchemaType = z.infer<typeof ItemGroupSchema>;

/**
 * Item Price Zod Schema
 * @doctype Item Price
 * @generated 2026-01-14T18:05:48.299Z
 */
export const ItemPriceSchema = z.object({
  item_code: z.string().min(1, "Item Code is required"),
  uom: z.string().min(1, "UOM is required"),
  packing_unit: z.number().int().optional(),
  item_name: z.string().optional(),
  brand: z.string().optional(),
  item_description: z.string().optional(),
  price_list: z.string().min(1, "Price List is required"),
  customer: z.string().optional(),
  supplier: z.string().optional(),
  batch_no: z.string().optional(),
  buying: z.union([z.literal(0), z.literal(1)]).optional(),
  selling: z.union([z.literal(0), z.literal(1)]).optional(),
  currency: z.string().optional(),
  price_list_rate: z.number(),
  valid_from: z.string().optional(),
  lead_time_days: z.number().int().optional(),
  valid_upto: z.string().optional(),
  note: z.string().optional(),
  reference: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ItemPriceCreateSchema = ItemPriceSchema.pick({
  item_code: true,
  uom: true,
  price_list: true,
  price_list_rate: true,
}).extend({});

export const ItemPriceUpdateSchema = ItemPriceSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ItemPriceSchemaType = z.infer<typeof ItemPriceSchema>;

/**
 * Product Bundle Zod Schema
 * @doctype Product Bundle
 * @generated 2026-01-14T18:05:48.299Z
 */
export const ProductBundleSchema = z.object({
  new_item_code: z.string().min(1, "Parent Item is required"),
  description: z.string().optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  items: z.array(z.unknown()),
  about: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ProductBundleCreateSchema = ProductBundleSchema.pick({
  new_item_code: true,
  items: true,
}).extend({
  description: z.string().optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const ProductBundleUpdateSchema = ProductBundleSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ProductBundleSchemaType = z.infer<typeof ProductBundleSchema>;

/**
 * Warehouse Create Schema
 * @doctype Warehouse
 */
export const WarehouseCreateSchema = z.object({
  warehouse_name: z.string().min(1, "Warehouse Name is required"),
  parent_warehouse: z.string().optional(),
  is_group: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .default(0),
  warehouse_type: z.string().optional(),
  company: z.string().optional(),
  disabled: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .default(0),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  phone_no: z.string().optional(),
  email_id: z.string().email().optional(),
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
});

export const WarehouseUpdateSchema = WarehouseCreateSchema.partial();

export type WarehouseFormData = z.infer<typeof WarehouseCreateSchema>;

export type WarehouseSchemaType = z.infer<typeof WarehouseCreateSchema>;

/**
 * UOM Zod Schema
 * @doctype UOM
 * @generated 2026-01-14T18:05:48.299Z
 */
export const UomSchema = z.object({
  enabled: z.union([z.literal(0), z.literal(1)]).optional(),
  uom_name: z.string().min(1, "UOM Name is required"),
  must_be_whole_number: z.union([z.literal(0), z.literal(1)]).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const UomCreateSchema = UomSchema.pick({
  uom_name: true,
}).extend({});

export const UomUpdateSchema = UomSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type UomSchemaType = z.infer<typeof UomSchema>;

/**
 * Brand Zod Schema
 * @doctype Brand
 * @generated 2026-01-14T18:05:48.299Z
 */
export const BrandSchema = z.object({
  brand: z.string().min(1, "Brand Name is required"),
  image: z.string().optional(),
  description: z.string().optional(),
  brand_defaults: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const BrandCreateSchema = BrandSchema.pick({
  brand: true,
}).extend({
  description: z.string().optional(),
});

export const BrandUpdateSchema = BrandSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type BrandSchemaType = z.infer<typeof BrandSchema>;

/**
 * Stock Entry Zod Schema
 * @doctype Stock Entry
 * @generated 2026-01-14T18:05:48.299Z
 */
export const StockEntrySchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  stock_entry_type: z.string().min(1, "Stock Entry Type is required"),
  outgoing_stock_entry: z.string().optional(),
  purpose: z
    .enum([
      "Material Issue",
      "Material Receipt",
      "Material Transfer",
      "Material Transfer for Manufacture",
      "Material Consumption for Manufacture",
      "Manufacture",
      "Repack",
      "Send to Subcontractor",
      "Disassemble",
    ])
    .optional(),
  add_to_transit: z.union([z.literal(0), z.literal(1)]).optional(),
  work_order: z.string().optional(),
  purchase_order: z.string().optional(),
  subcontracting_order: z.string().optional(),
  delivery_note_no: z.string().optional(),
  sales_invoice_no: z.string().optional(),
  pick_list: z.string().optional(),
  purchase_receipt_no: z.string().optional(),
  asset_repair: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  posting_date: z.string().optional(),
  posting_time: z.string().optional(),
  set_posting_time: z.union([z.literal(0), z.literal(1)]).optional(),
  inspection_required: z.union([z.literal(0), z.literal(1)]).optional(),
  apply_putaway_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  from_bom: z.union([z.literal(0), z.literal(1)]).optional(),
  use_multi_level_bom: z.union([z.literal(0), z.literal(1)]).optional(),
  bom_no: z.string().optional(),
  fg_completed_qty: z.number().optional(),
  get_items: z.unknown().optional(),
  process_loss_percentage: z.number().optional(),
  process_loss_qty: z.number().optional(),
  from_warehouse: z.string().optional(),
  source_warehouse_address: z.string().optional(),
  source_address_display: z.string().optional(),
  to_warehouse: z.string().optional(),
  target_warehouse_address: z.string().optional(),
  target_address_display: z.string().optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  items: z.array(z.unknown()),
  get_stock_and_rate: z.unknown().optional(),
  total_outgoing_value: z.number().optional(),
  total_incoming_value: z.number().optional(),
  value_difference: z.number().optional(),
  additional_costs: z.array(z.unknown()).optional(),
  total_additional_costs: z.number().optional(),
  supplier: z.string().optional(),
  supplier_name: z.string().optional(),
  supplier_address: z.string().optional(),
  address_display: z.string().optional(),
  project: z.string().optional(),
  select_print_heading: z.string().optional(),
  letter_head: z.string().optional(),
  is_opening: z.enum(["No", "Yes"]).optional(),
  remarks: z.string().optional(),
  per_transferred: z.number().optional(),
  total_amount: z.number().optional(),
  job_card: z.string().optional(),
  amended_from: z.string().optional(),
  credit_note: z.string().optional(),
  is_return: z.union([z.literal(0), z.literal(1)]).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const StockEntryCreateSchema = StockEntrySchema.pick({
  naming_series: true,
  stock_entry_type: true,
  company: true,
  items: true,
}).extend({
  // Allow purpose as alias (maps to stock_entry_type on ERPNext)
  purpose: z
    .enum([
      "Material Issue",
      "Material Receipt",
      "Material Transfer",
      "Material Transfer for Manufacture",
      "Material Consumption for Manufacture",
      "Manufacture",
      "Repack",
      "Send to Subcontractor",
      "Disassemble",
    ])
    .optional(),
  // Additional optional fields
  posting_date: z.string().optional(),
  posting_time: z.string().optional(),
  from_warehouse: z.string().optional(),
  to_warehouse: z.string().optional(),
  work_order: z.string().optional(),
  bom_no: z.string().optional(),
  fg_completed_qty: z.number().optional(),
  remarks: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const StockEntryUpdateSchema = StockEntrySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type StockEntrySchemaType = z.infer<typeof StockEntrySchema>;
export type StockEntryFormData = z.infer<typeof StockEntryCreateSchema>;

/**
 * Delivery Note Zod Schema
 * @doctype Delivery Note
 * @generated 2026-01-14T18:05:48.299Z
 */
export const DeliveryNoteSchema = z.object({
  title: z.string().optional(),
  naming_series: z.string().min(1, "Series is required"),
  customer: z.string().min(1, "Customer is required"),
  tax_id: z.string().optional(),
  customer_name: z.string().optional(),
  posting_date: z.string().min(1, "Date is required"),
  posting_time: z.string().min(1, "Posting Time is required"),
  set_posting_time: z.union([z.literal(0), z.literal(1)]).optional(),
  company: z.string().min(1, "Company is required"),
  amended_from: z.string().optional(),
  is_return: z.union([z.literal(0), z.literal(1)]).optional(),
  issue_credit_note: z.union([z.literal(0), z.literal(1)]).optional(),
  return_against: z.string().optional(),
  cost_center: z.string().optional(),
  project: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  conversion_rate: z.number(),
  selling_price_list: z.string().min(1, "Price List is required"),
  price_list_currency: z.string().min(1, "Price List Currency is required"),
  plc_conversion_rate: z.number(),
  ignore_pricing_rule: z.union([z.literal(0), z.literal(1)]).optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  set_warehouse: z.string().optional(),
  set_target_warehouse: z.string().optional(),
  items: z.array(z.unknown()),
  total_qty: z.number().optional(),
  total_net_weight: z.number().optional(),
  base_total: z.number().optional(),
  base_net_total: z.number().optional(),
  total: z.number().optional(),
  net_total: z.number().optional(),
  tax_category: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  shipping_rule: z.string().optional(),
  incoterm: z.string().optional(),
  named_place: z.string().optional(),
  taxes: z.array(z.unknown()).optional(),
  base_total_taxes_and_charges: z.number().optional(),
  total_taxes_and_charges: z.number().optional(),
  base_grand_total: z.number().optional(),
  base_rounding_adjustment: z.number().optional(),
  base_rounded_total: z.number().optional(),
  base_in_words: z.string().optional(),
  grand_total: z.number().optional(),
  rounding_adjustment: z.number().optional(),
  rounded_total: z.number().optional(),
  in_words: z.string().optional(),
  disable_rounded_total: z.union([z.literal(0), z.literal(1)]).optional(),
  apply_discount_on: z.enum(["Grand Total", "Net Total"]).optional(),
  base_discount_amount: z.number().optional(),
  additional_discount_percentage: z.number().optional(),
  discount_amount: z.number().optional(),
  other_charges_calculation: z.string().optional(),
  packed_items: z.array(z.unknown()).optional(),
  product_bundle_help: z.string().optional(),
  pricing_rules: z.array(z.unknown()).optional(),
  customer_address: z.string().optional(),
  address_display: z.string().optional(),
  contact_person: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  shipping_address_name: z.string().optional(),
  shipping_address: z.string().optional(),
  dispatch_address_name: z.string().optional(),
  dispatch_address: z.string().optional(),
  company_address: z.string().optional(),
  company_address_display: z.string().optional(),
  company_contact_person: z.string().optional(),
  tc_name: z.string().optional(),
  terms: z.string().optional(),
  per_billed: z.number().optional(),
  status: z.string().min(1, "Status is required"),
  per_installed: z.number().optional(),
  installation_status: z.string().optional(),
  per_returned: z.number().optional(),
  transporter: z.string().optional(),
  driver: z.string().optional(),
  lr_no: z.string().optional(),
  vehicle_no: z.string().optional(),
  transporter_name: z.string().optional(),
  driver_name: z.string().optional(),
  lr_date: z.string().optional(),
  po_no: z.string().optional(),
  po_date: z.string().optional(),
  sales_partner: z.string().optional(),
  amount_eligible_for_commission: z.number().optional(),
  commission_rate: z.number().optional(),
  total_commission: z.number().optional(),
  sales_team: z.array(z.unknown()).optional(),
  auto_repeat: z.string().optional(),
  letter_head: z.string().optional(),
  print_without_amount: z.union([z.literal(0), z.literal(1)]).optional(),
  group_same_items: z.union([z.literal(0), z.literal(1)]).optional(),
  select_print_heading: z.string().optional(),
  language: z.string().optional(),
  is_internal_customer: z.union([z.literal(0), z.literal(1)]).optional(),
  represents_company: z.string().optional(),
  inter_company_reference: z.string().optional(),
  customer_group: z.string().optional(),
  territory: z.string().optional(),
  source: z.string().optional(),
  campaign: z.string().optional(),
  excise_page: z.string().optional(),
  instructions: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

// ============================================================================
// DELIVERY NOTE SCHEMAS
// ============================================================================

// Delivery Note Item (Child Table)
export const DeliveryNoteItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.number().min(0.001, "Quantity must be greater than 0"),
  uom: z.string().optional(),
  rate: z.number().min(0).optional(),
  amount: z.number().optional(),
  warehouse: z.string().optional(),
  against_sales_order: z.string().optional(),
  so_detail: z.string().optional(),
  batch_no: z.string().optional(),
  serial_no: z.string().optional(),
});

// Delivery Note Create Schema
export const DeliveryNoteCreateSchema = z.object({
  naming_series: z
    .enum(["MAT-DN-.YYYY.-", "MAT-DN-RET-.YYYY.-"])
    .default("MAT-DN-.YYYY.-"),
  customer: z.string().min(1, "Customer is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  posting_time: z.string().optional(),
  company: z.string().min(1, "Company is required"),

  // Items
  items: z.array(DeliveryNoteItemSchema).min(1, "At least one item required"),
  set_warehouse: z.string().optional(),

  // Addressing
  shipping_address_name: z.string().optional(),
  dispatch_address_name: z.string().optional(),
  customer_address: z.string().optional(),

  // Logistics
  transporter: z.string().optional(),
  driver: z.string().optional(),
  vehicle_no: z.string().optional(),
  lr_no: z.string().optional(),
  lr_date: z.string().optional(),

  // Returns
  is_return: z.union([z.literal(0), z.literal(1)]).optional(),
  return_against: z.string().optional(),

  // Settings
  print_without_amount: z.union([z.literal(0), z.literal(1)]).default(1),

  // Pricing (auto-calculated)
  currency: z.string().default("ETB"),
  conversion_rate: z.number().default(1),
  selling_price_list: z.string().optional(),
  price_list_currency: z.string().optional(),
  plc_conversion_rate: z.number().optional(),

  // Reference
  po_no: z.string().optional(),
  project: z.string().optional(),
});

export const DeliveryNoteUpdateSchema = DeliveryNoteCreateSchema.partial();
export type DeliveryNoteFormData = z.input<typeof DeliveryNoteCreateSchema>;
export type DeliveryNoteItemData = z.input<typeof DeliveryNoteItemSchema>;
export type DeliveryNoteSchemaType = z.infer<typeof DeliveryNoteSchema>;

/**
 * Stock Reconciliation Zod Schema
 * @doctype Stock Reconciliation
 * @generated 2026-01-14T18:05:48.299Z
 */
export const StockReconciliationSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  company: z.string().min(1, "Company is required"),
  purpose: z.string().min(1, "Purpose is required"),
  posting_date: z.string().min(1, "Posting Date is required"),
  posting_time: z.string().min(1, "Posting Time is required"),
  set_posting_time: z.union([z.literal(0), z.literal(1)]).optional(),
  set_warehouse: z.string().optional(),
  scan_barcode: z.string().optional(),
  last_scanned_warehouse: z.string().optional(),
  scan_mode: z.union([z.literal(0), z.literal(1)]).optional(),
  items: z.array(z.unknown()),
  expense_account: z.string().optional(),
  difference_amount: z.number().optional(),
  amended_from: z.string().optional(),
  cost_center: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const StockReconciliationCreateSchema = StockReconciliationSchema.pick({
  naming_series: true,
  company: true,
  purpose: true,
  posting_date: true,
  posting_time: true,
  items: true,
}).extend({});

export const StockReconciliationUpdateSchema =
  StockReconciliationSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type StockReconciliationSchemaType = z.infer<
  typeof StockReconciliationSchema
>;

/**
 * Batch Zod Schema
 * @doctype Batch
 * @generated 2026-01-14T18:05:48.299Z
 */
export const BatchSchema = z.object({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  use_batchwise_valuation: z.union([z.literal(0), z.literal(1)]).optional(),
  batch_id: z.string().min(1, "Batch ID is required"),
  item: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  image: z.string().optional(),
  parent_batch: z.string().optional(),
  manufacturing_date: z.string().optional(),
  batch_qty: z.number().optional(),
  stock_uom: z.string().optional(),
  expiry_date: z.string().optional(),
  supplier: z.string().optional(),
  reference_doctype: z.string().optional(),
  reference_name: z.string().optional(),
  description: z.string().optional(),
  qty_to_produce: z.number().optional(),
  produced_qty: z.number().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const BatchCreateSchema = BatchSchema.pick({
  batch_id: true,
  item: true,
}).extend({
  description: z.string().optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const BatchUpdateSchema = BatchSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type BatchSchemaType = z.infer<typeof BatchSchema>;

/**
 * Serial No Zod Schema
 * @doctype Serial No
 * @generated 2026-01-14T18:05:48.299Z
 */
export const SerialNoSchema = z.object({
  serial_no: z.string().min(1, "Serial No is required"),
  item_code: z.string().min(1, "Item Code is required"),
  batch_no: z.string().optional(),
  warehouse: z.string().optional(),
  purchase_rate: z.number().optional(),
  customer: z.string().optional(),
  status: z
    .enum(["Active", "Inactive", "Consumed", "Delivered", "Expired"])
    .optional(),
  item_name: z.string().optional(),
  description: z.string().optional(),
  item_group: z.string().optional(),
  brand: z.string().optional(),
  asset: z.string().optional(),
  asset_status: z.enum(["Issue", "Receipt", "Transfer"]).optional(),
  location: z.string().optional(),
  employee: z.string().optional(),
  warranty_expiry_date: z.string().optional(),
  amc_expiry_date: z.string().optional(),
  maintenance_status: z
    .enum(["Under Warranty", "Out of Warranty", "Under AMC", "Out of AMC"])
    .optional(),
  warranty_period: z.number().int().optional(),
  company: z.string().min(1, "Company is required"),
  work_order: z.string().optional(),
  purchase_document_no: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SerialNoCreateSchema = SerialNoSchema.pick({
  serial_no: true,
  item_code: true,
  company: true,
}).extend({
  description: z.string().optional(),
});

export const SerialNoUpdateSchema = SerialNoSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type SerialNoSchemaType = z.infer<typeof SerialNoSchema>;

/**
 * Quality Inspection Zod Schema
 * @doctype Quality Inspection
 * @generated 2026-01-14T18:05:48.299Z
 */
export const QualityInspectionSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  company: z.string().optional(),
  report_date: z.string().min(1, "Report Date is required"),
  status: z.string().min(1, "Status is required"),
  child_row_reference: z.string().optional(),
  inspection_type: z.string().min(1, "Inspection Type is required"),
  reference_type: z.string().min(1, "Reference Type is required"),
  reference_name: z.string().min(1, "Reference Name is required"),
  item_code: z.string().min(1, "Item Code is required"),
  item_serial_no: z.string().optional(),
  batch_no: z.string().optional(),
  sample_size: z.number(),
  item_name: z.string().optional(),
  description: z.string().optional(),
  bom_no: z.string().optional(),
  quality_inspection_template: z.string().optional(),
  manual_inspection: z.union([z.literal(0), z.literal(1)]).optional(),
  readings: z.array(z.unknown()).optional(),
  inspected_by: z.string().min(1, "Inspected By is required"),
  verified_by: z.string().optional(),
  remarks: z.string().optional(),
  amended_from: z.string().optional(),
  letter_head: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const QualityInspectionCreateSchema = QualityInspectionSchema.pick({
  naming_series: true,
  report_date: true,
  status: true,
  inspection_type: true,
  reference_type: true,
  reference_name: true,
  item_code: true,
  sample_size: true,
  inspected_by: true,
}).extend({
  description: z.string().optional(),
});

export const QualityInspectionUpdateSchema =
  QualityInspectionSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type QualityInspectionSchemaType = z.infer<
  typeof QualityInspectionSchema
>;

/**
 * Landed Cost Voucher Zod Schema
 * @doctype Landed Cost Voucher
 * @generated 2026-01-14T18:05:48.299Z
 */
export const LandedCostVoucherSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  company: z.string().min(1, "Company is required"),
  posting_date: z.string().min(1, "Posting Date is required"),
  purchase_receipts: z.array(z.unknown()),
  get_items_from_purchase_receipts: z.unknown().optional(),
  items: z.array(z.unknown()),
  taxes: z.array(z.unknown()),
  total_taxes_and_charges: z.number(),
  distribute_charges_based_on: z
    .string()
    .min(1, "Distribute Charges Based On is required"),
  amended_from: z.string().optional(),
  landed_cost_help: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const LandedCostVoucherCreateSchema = LandedCostVoucherSchema.pick({
  naming_series: true,
  company: true,
  posting_date: true,
  purchase_receipts: true,
  items: true,
  taxes: true,
  total_taxes_and_charges: true,
  distribute_charges_based_on: true,
}).extend({});

export const LandedCostVoucherUpdateSchema =
  LandedCostVoucherSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type LandedCostVoucherSchemaType = z.infer<
  typeof LandedCostVoucherSchema
>;

/**
 * Stock Ledger Entry Zod Schema
 * @doctype Stock Ledger Entry
 * @generated 2026-01-14T18:05:48.299Z
 */
export const StockLedgerEntrySchema = z.object({
  item_code: z.string().optional(),
  warehouse: z.string().optional(),
  posting_date: z.string().optional(),
  posting_time: z.string().optional(),
  posting_datetime: z.string().optional(),
  is_adjustment_entry: z.union([z.literal(0), z.literal(1)]).optional(),
  auto_created_serial_and_batch_bundle: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  voucher_type: z.string().optional(),
  voucher_no: z.string().optional(),
  voucher_detail_no: z.string().optional(),
  serial_and_batch_bundle: z.string().optional(),
  dependant_sle_voucher_detail_no: z.string().optional(),
  recalculate_rate: z.union([z.literal(0), z.literal(1)]).optional(),
  actual_qty: z.number().optional(),
  qty_after_transaction: z.number().optional(),
  incoming_rate: z.number().optional(),
  outgoing_rate: z.number().optional(),
  valuation_rate: z.number().optional(),
  stock_value: z.number().optional(),
  stock_value_difference: z.number().optional(),
  stock_queue: z.string().optional(),
  company: z.string().optional(),
  stock_uom: z.string().optional(),
  project: z.string().optional(),
  fiscal_year: z.string().optional(),
  has_batch_no: z.union([z.literal(0), z.literal(1)]).optional(),
  has_serial_no: z.union([z.literal(0), z.literal(1)]).optional(),
  is_cancelled: z.union([z.literal(0), z.literal(1)]).optional(),
  to_rename: z.union([z.literal(0), z.literal(1)]).optional(),
  serial_no: z.string().optional(),
  batch_no: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const StockLedgerEntryUpdateSchema =
  StockLedgerEntrySchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type StockLedgerEntrySchemaType = z.infer<typeof StockLedgerEntrySchema>;

/**
 * Account Zod Schema
 * @doctype Account
 * @generated 2026-01-26T11:14:16.771Z
 */
export const AccountSchema = z.object({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  account_name: z.string().min(1, "Account Name is required"),
  account_number: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  company: z.string().min(1, "Company is required"),
  root_type: z
    .enum(["Asset", "Liability", "Income", "Expense", "Equity"])
    .optional(),
  report_type: z.enum(["Balance Sheet", "Profit and Loss"]).optional(),
  account_currency: z.string().optional(),
  parent_account: z.string().min(1, "Parent Account is required"),
  account_type: z.string().optional(),
  tax_rate: z.number().optional(),
  freeze_account: z.enum(["No", "Yes"]).optional(),
  balance_must_be: z.enum(["Debit", "Credit"]).optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  include_in_gross: z.union([z.literal(0), z.literal(1)]).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

// Account & Cost Center schemas are auto-generated above.

// Journal Entry moved

// Accounting transactions moved to consolidated section at end of file.

// ─────────────────────────────────────────────────────────────────────────────
// MODE OF PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

export const ModeOfPaymentAccountSchema = z.object({
  company: z.string().min(1),
  default_account: z.string().min(1),
});

export const ModeOfPaymentCreateSchema = z.object({
  mode_of_payment: z.string().min(1, "Mode of payment name is required"),
  type: z.enum(["Cash", "Bank", "General", "Phone"]).default("General"),
  enabled: z.union([z.literal(0), z.literal(1)]).default(1),
  accounts: z.array(ModeOfPaymentAccountSchema).optional(),
});

export const ModeOfPaymentUpdateSchema = ModeOfPaymentCreateSchema.partial();
export type ModeOfPaymentFormData = z.input<typeof ModeOfPaymentCreateSchema>;

// ModeOfPaymentSchemaType derived from CreateSchema
export type ModeOfPaymentSchemaType = z.infer<typeof ModeOfPaymentCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT TERMS TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentTermSchema = z.object({
  payment_term: z.string().optional(),
  description: z.string().optional(),
  invoice_portion: z.number().min(0).max(100),
  due_date_based_on: z
    .enum([
      "Day(s) after invoice date",
      "Day(s) after the end of the invoice month",
      "Month(s) after the end of the invoice month",
    ])
    .default("Day(s) after invoice date"),
  credit_days: z.number().min(0).default(0),
  credit_months: z.number().min(0).default(0),
  mode_of_payment: z.string().optional(),
});

export const PaymentTermsTemplateCreateSchema = z.object({
  template_name: z.string().min(1, "Template name is required"),
  allocate_payment_based_on_payment_terms: z
    .union([z.literal(0), z.literal(1)])
    .default(0),
  terms: z
    .array(PaymentTermSchema)
    .min(1, "At least one payment term is required"),
});

export const PaymentTermsTemplateUpdateSchema =
  PaymentTermsTemplateCreateSchema.partial();
export type PaymentTermsTemplateFormData = z.input<
  typeof PaymentTermsTemplateCreateSchema
>;

/**
 * Fiscal Year Zod Schema
 * @doctype Fiscal Year
 * @generated 2026-01-26T11:14:16.771Z
 */
export const FiscalYearSchema = z.object({
  year: z.string().min(1, "Year Name is required"),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  is_short_year: z.union([z.literal(0), z.literal(1)]).optional(),
  year_start_date: z.string().min(1, "Year Start Date is required"),
  year_end_date: z.string().min(1, "Year End Date is required"),
  companies: z.array(z.unknown()).optional(),
  auto_created: z.union([z.literal(0), z.literal(1)]).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const FiscalYearCreateSchema = FiscalYearSchema.pick({
  year: true,
  year_start_date: true,
  year_end_date: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const FiscalYearUpdateSchema = FiscalYearSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type FiscalYearSchemaType = z.infer<typeof FiscalYearSchema>;

/**
 * Period Closing Voucher Zod Schema
 * @doctype Period Closing Voucher
 * @generated 2026-01-14T18:05:48.302Z
 */
export const PeriodClosingVoucherSchema = z.object({
  transaction_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  fiscal_year: z.string().min(1, "Fiscal Year is required"),
  period_start_date: z.string().min(1, "Period Start Date is required"),
  period_end_date: z.string().min(1, "Period End Date is required"),
  amended_from: z.string().optional(),
  closing_account_head: z.string().min(1, "Closing Account Head is required"),
  gle_processing_status: z
    .enum(["In Progress", "Completed", "Failed"])
    .optional(),
  remarks: z.string().min(1, "Remarks is required"),
  error_message: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const PeriodClosingVoucherCreateSchema = PeriodClosingVoucherSchema.pick(
  {
    company: true,
    fiscal_year: true,
    period_start_date: true,
    period_end_date: true,
    closing_account_head: true,
    remarks: true,
  },
).extend({});

export const PeriodClosingVoucherUpdateSchema =
  PeriodClosingVoucherSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type PeriodClosingVoucherSchemaType = z.infer<
  typeof PeriodClosingVoucherSchema
>;

/**
 * Asset Zod Schema
 * @doctype Asset
 * @generated 2026-01-14T18:05:48.302Z
 */
export const AssetSchema = z.object({
  company: z.string().min(1, "Company is required"),
  item_code: z.string().min(1, "Item Code is required"),
  item_name: z.string().optional(),
  asset_owner: z.enum(["Company", "Supplier", "Customer"]).optional(),
  asset_owner_company: z.string().optional(),
  is_existing_asset: z.union([z.literal(0), z.literal(1)]).optional(),
  is_composite_asset: z.union([z.literal(0), z.literal(1)]).optional(),
  supplier: z.string().optional(),
  customer: z.string().optional(),
  image: z.string().optional(),
  journal_entry_for_scrap: z.string().optional(),
  naming_series: z.enum(["ACC-ASS-.YYYY.-"]).optional(),
  asset_name: z.string().min(1, "Asset Name is required"),
  asset_category: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  split_from: z.string().optional(),
  custodian: z.string().optional(),
  department: z.string().optional(),
  disposal_date: z.string().optional(),
  cost_center: z.string().optional(),
  purchase_receipt: z.string().optional(),
  purchase_receipt_item: z.string().optional(),
  purchase_invoice: z.string().optional(),
  purchase_invoice_item: z.string().optional(),
  purchase_date: z.string().min(1, "Purchase Date is required"),
  available_for_use_date: z.string().optional(),
  gross_purchase_amount: z.number().optional(),
  asset_quantity: z.number().int().optional(),
  additional_asset_cost: z.number().optional(),
  total_asset_cost: z.number().optional(),
  calculate_depreciation: z.union([z.literal(0), z.literal(1)]).optional(),
  opening_accumulated_depreciation: z.number().optional(),
  opening_number_of_booked_depreciations: z.number().int().optional(),
  is_fully_depreciated: z.union([z.literal(0), z.literal(1)]).optional(),
  finance_books: z.array(z.unknown()).optional(),
  depreciation_method: z
    .enum(["Straight Line", "Double Declining Balance", "Manual"])
    .optional(),
  value_after_depreciation: z.number().optional(),
  total_number_of_depreciations: z.number().int().optional(),
  frequency_of_depreciation: z.number().int().optional(),
  next_depreciation_date: z.string().optional(),
  depreciation_schedule_view: z.string().optional(),
  policy_number: z.string().optional(),
  insurer: z.string().optional(),
  insured_value: z.string().optional(),
  insurance_start_date: z.string().optional(),
  insurance_end_date: z.string().optional(),
  comprehensive_insurance: z.string().optional(),
  maintenance_required: z.union([z.literal(0), z.literal(1)]).optional(),
  status: z
    .enum([
      "Draft",
      "Submitted",
      "Cancelled",
      "Partially Depreciated",
      "Fully Depreciated",
      "Sold",
      "Scrapped",
      "In Maintenance",
      "Out of Order",
      "Issue",
      "Receipt",
      "Capitalized",
      "Work In Progress",
    ])
    .optional(),
  booked_fixed_asset: z.union([z.literal(0), z.literal(1)]).optional(),
  purchase_amount: z.number().optional(),
  default_finance_book: z.string().optional(),
  depr_entry_posting_status: z.enum(["Successful", "Failed"]).optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const AssetCreateSchema = AssetSchema.pick({
  company: true,
  item_code: true,
  asset_name: true,
  location: true,
  purchase_date: true,
}).extend({});

export const AssetUpdateSchema = AssetSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type AssetSchemaType = z.infer<typeof AssetSchema>;

/**
 * Asset Category Zod Schema
 * @doctype Asset Category
 * @generated 2026-01-14T18:05:48.302Z
 */
export const AssetCategorySchema = z.object({
  asset_category_name: z.string().min(1, "Asset Category Name is required"),
  enable_cwip_accounting: z.union([z.literal(0), z.literal(1)]).optional(),
  non_depreciable_category: z.union([z.literal(0), z.literal(1)]).optional(),
  finance_books: z.array(z.unknown()).optional(),
  accounts: z.array(z.unknown()),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const AssetCategoryCreateSchema = AssetCategorySchema.pick({
  asset_category_name: true,
  accounts: true,
}).extend({});

export const AssetCategoryUpdateSchema = AssetCategorySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type AssetCategorySchemaType = z.infer<typeof AssetCategorySchema>;

/**
 * Asset Movement Zod Schema
 * @doctype Asset Movement
 * @generated 2026-01-14T18:05:48.302Z
 */
export const AssetMovementSchema = z.object({
  company: z.string().min(1, "Company is required"),
  purpose: z.string().min(1, "Purpose is required"),
  transaction_date: z.string().min(1, "Transaction Date is required"),
  assets: z.array(z.unknown()),
  reference_doctype: z.string().optional(),
  reference_name: z.string().optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const AssetMovementCreateSchema = AssetMovementSchema.pick({
  company: true,
  purpose: true,
  transaction_date: true,
  assets: true,
}).extend({});

export const AssetMovementUpdateSchema = AssetMovementSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type AssetMovementSchemaType = z.infer<typeof AssetMovementSchema>;

/**
 * Work Order Zod Schema
 * @doctype Work Order
 * @generated 2026-01-14T18:05:48.302Z
 */
export const WorkOrderSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  status: z.string().min(1, "Status is required"),
  production_item: z.string().min(1, "Item To Manufacture is required"),
  item_name: z.string().optional(),
  image: z.string().optional(),
  bom_no: z.string().min(1, "BOM No is required"),
  sales_order: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  qty: z.number(),
  material_transferred_for_manufacturing: z.number().optional(),
  produced_qty: z.number().optional(),
  disassembled_qty: z.number().optional(),
  process_loss_qty: z.number().optional(),
  project: z.string().optional(),
  required_items: z.array(z.unknown()).optional(),
  allow_alternative_item: z.union([z.literal(0), z.literal(1)]).optional(),
  use_multi_level_bom: z.union([z.literal(0), z.literal(1)]).optional(),
  skip_transfer: z.union([z.literal(0), z.literal(1)]).optional(),
  from_wip_warehouse: z.union([z.literal(0), z.literal(1)]).optional(),
  update_consumed_material_cost_in_project: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  source_warehouse: z.string().optional(),
  wip_warehouse: z.string().optional(),
  fg_warehouse: z.string().min(1, "Target Warehouse is required"),
  scrap_warehouse: z.string().optional(),
  has_serial_no: z.union([z.literal(0), z.literal(1)]).optional(),
  has_batch_no: z.union([z.literal(0), z.literal(1)]).optional(),
  batch_size: z.number().optional(),
  transfer_material_against: z.enum(["Work Order", "Job Card"]).optional(),
  operations: z.array(z.unknown()).optional(),
  planned_start_date: z.string().min(1, "Planned Start Date is required"),
  planned_end_date: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  actual_start_date: z.string().optional(),
  actual_end_date: z.string().optional(),
  lead_time: z.number().optional(),
  planned_operating_cost: z.number().optional(),
  actual_operating_cost: z.number().optional(),
  additional_operating_cost: z.number().optional(),
  corrective_operation_cost: z.number().optional(),
  total_operating_cost: z.number().optional(),
  description: z.string().optional(),
  stock_uom: z.string().optional(),
  material_request: z.string().optional(),
  material_request_item: z.string().optional(),
  sales_order_item: z.string().optional(),
  production_plan: z.string().optional(),
  production_plan_item: z.string().optional(),
  production_plan_sub_assembly_item: z.string().optional(),
  product_bundle_item: z.string().optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export type WorkOrderSchemaType = z.infer<typeof WorkOrderSchema>;

/**
 * BOM Item (Child Table Row)
 */
export const BOMItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.coerce.number().min(0, "Quantity cannot be negative").default(1),
  uom: z.string().optional(),
  rate: z.coerce.number().min(0, "Rate cannot be negative").default(0),
  amount: z.coerce.number().optional(),
  source_warehouse: z.string().optional(),
});

/**
 * BOM Operation (Child Table Row)
 */
export const BOMOperationSchema = z.object({
  operation: z.string().min(1, "Operation is required"),
  workstation: z.string().optional(),
  time_in_mins: z.coerce.number().min(0).default(0),
  operating_cost: z.coerce.number().optional(),
  hour_rate: z.coerce.number().optional(),
});

/**
 * BOM Scrap Item (Child Table Row)
 */
export const BOMScrapItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  qty: z.coerce.number().min(0).default(0),
  uom: z.string().optional(),
  rate: z.coerce.number().min(0).default(0),
  amount: z.coerce.number().optional(),
});

/**
 * BOM Create Schema
 */
export const BOMCreateSchema = z.object({
  item: z.string().min(1, "Item is required"),
  company: z.string().min(1, "Company is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  uom: z.string().optional(),
  currency: z.string().default("ETB"),
  conversion_rate: z.coerce.number().default(1),
  is_active: z.coerce.number().default(1),
  is_default: z.coerce.number().default(0),
  with_operations: z.coerce.number().default(0),
  rm_cost_as_per: z
    .enum(["Valuation Rate", "Last Purchase Rate", "Price List"])
    .default("Valuation Rate"),
  items: z.array(BOMItemSchema).min(1, "At least one material is required"),
  operations: z.array(BOMOperationSchema).optional(),
  scrap_items: z.array(BOMScrapItemSchema).optional(),
});

export const BOMUpdateSchema = BOMCreateSchema.partial();

export type BOMFormData = z.input<typeof BOMCreateSchema>;
export type BOMItemData = z.input<typeof BOMItemSchema>;
export type BOMOperationData = z.input<typeof BOMOperationSchema>;
export type BOMScrapItemData = z.input<typeof BOMScrapItemSchema>;

/**
 * Work Order Item (Child Table - Required Materials)
 */
export const WorkOrderItemSchema = z.object({
  item_code: z.string().min(1),
  item_name: z.string().optional(),
  source_warehouse: z.string().optional(),
  required_qty: z.number().min(0).default(0),
  transferred_qty: z.number().optional(),
  consumed_qty: z.number().optional(),
  available_qty_at_source_warehouse: z.number().optional(),
});

/**
 * Work Order Operation (Child Table)
 */
export const WorkOrderOperationSchema = z.object({
  operation: z.string().min(1),
  workstation: z.string().optional(),
  time_in_mins: z.number().min(0).default(0),
  planned_operating_cost: z.number().optional(),
  actual_operating_cost: z.number().optional(),
  completed_qty: z.number().optional(),
  status: z.enum(["Pending", "Work in Progress", "Completed"]).optional(),
});

/**
 * Work Order Create Schema
 */
export const WorkOrderCreateSchema = z.object({
  naming_series: z.literal("MFG-WO-.YYYY.-").default("MFG-WO-.YYYY.-"),
  production_item: z.string().min(1, "Item is required"),
  bom_no: z.string().min(1, "BOM is required"),
  company: z.string().min(1, "Company is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  fg_warehouse: z.string().min(1, "Target warehouse is required"),
  planned_start_date: z.string().min(1, "Planned start date is required"),

  // Optional fields
  sales_order: z.string().optional(),
  project: z.string().optional(),
  source_warehouse: z.string().optional(),
  wip_warehouse: z.string().optional(),
  scrap_warehouse: z.string().optional(),
  planned_end_date: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  material_request: z.string().optional(),
  use_multi_level_bom: z.union([z.literal(0), z.literal(1)]).default(0),
  skip_transfer: z.union([z.literal(0), z.literal(1)]).default(0),

  // Child tables (auto-populated from BOM)
  required_items: z.array(WorkOrderItemSchema).optional(),
  operations: z.array(WorkOrderOperationSchema).optional(),
});

export const WorkOrderUpdateSchema = WorkOrderCreateSchema.partial().extend({
  status: z
    .enum([
      "Draft",
      "Submitted",
      "Not Started",
      "In Process",
      "Completed",
      "Stopped",
      "Closed",
      "Cancelled",
    ])
    .optional(),
});

export type WorkOrderFormData = z.input<typeof WorkOrderCreateSchema>;
export type WorkOrderItemData = z.input<typeof WorkOrderItemSchema>;
export type WorkOrderOperationData = z.input<typeof WorkOrderOperationSchema>;

/**
 * Sub Operation Schema (Child Table Row)
 * This defines the structure of each row in the sub_operations child table.
 * @doctype Sub Operation
 */
export const SubOperationSchema = z.object({
  /** Link to another Operation DocType (the sub-operation) */
  operation: z.string().min(1, "Sub-operation is required"),
  /** Time in minutes for this sub-operation */
  time_in_mins: z.number().min(0, "Time must be 0 or greater").default(0),
});

/**
 * Workstation Create Schema
 * @doctype Workstation
 * Enhanced with full DocType fields
 */
export const WorkstationCreateSchema = z.object({
  // Required fields
  workstation_name: z.string().min(1, "Workstation Name is required"),
  production_capacity: z.number().min(1).default(1),

  // Optional classification
  workstation_type: z.string().optional(),
  plant_floor: z.string().optional(),
  warehouse: z.string().optional(),

  // Status fields
  status: z
    .enum(["Production", "Off", "Idle", "Problem", "Maintenance", "Setup"])
    .optional(),

  // Cost rates (ETB per hour)
  hour_rate: z.number().min(0).default(0),
  hour_rate_labour: z.number().min(0).optional().default(0),
  hour_rate_electricity: z.number().min(0).optional().default(0),
  hour_rate_consumable: z.number().min(0).optional().default(0),
  hour_rate_rent: z.number().min(0).optional().default(0),

  // Additional info
  description: z.string().optional(),
  holiday_list: z.string().optional(),
});

export const WorkstationUpdateSchema = WorkstationCreateSchema.partial();

// Use z.input for Form Initialization to handle defaults correctly
export type WorkstationFormData = z.input<typeof WorkstationCreateSchema>;

export type WorkstationSchemaType = z.infer<typeof WorkstationCreateSchema>;

/**
 * Operation Create Schema
 * @doctype Operation
 * @scope MVP - Print Shop Manufacturing
 * @note total_operation_time is computed by backend from sub_operations
 */
export const OperationCreateSchema = z.object({
  // The operation name IS the DocType name field (auto-generated as ID)
  name: z.string().min(1, "Operation Name is required"),
  workstation: z.string().optional(),
  description: z.string().optional(),
  // Sub-operations child table - required for time calculation
  sub_operations: z.array(SubOperationSchema).optional().default([]),
});

export const OperationUpdateSchema = z.object({
  workstation: z.string().optional(),
  description: z.string().optional(),
  sub_operations: z.array(SubOperationSchema).optional(),
});

// Type exports
export type SubOperationData = z.infer<typeof SubOperationSchema>;
export type OperationFormData = z.input<typeof OperationCreateSchema>;
export type OperationUpdateData = z.input<typeof OperationUpdateSchema>;
export type OperationSchemaType = z.infer<typeof OperationCreateSchema>;

/**
 * Production Plan Zod Schema
 * @doctype Production Plan
 * @generated 2026-01-14T18:05:48.302Z
 */
export const ProductionPlanSchema = z.object({
  naming_series: z.string().min(1, "Naming Series is required"),
  company: z.string().min(1, "Company is required"),
  get_items_from: z.enum(["Sales Order", "Material Request"]).optional(),
  posting_date: z.string().min(1, "Posting Date is required"),
  item_code: z.string().optional(),
  customer: z.string().optional(),
  warehouse: z.string().optional(),
  project: z.string().optional(),
  sales_order_status: z
    .enum(["To Deliver and Bill", "To Bill", "To Deliver"])
    .optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  from_delivery_date: z.string().optional(),
  to_delivery_date: z.string().optional(),
  get_sales_orders: z.unknown().optional(),
  sales_orders: z.array(z.unknown()).optional(),
  get_material_request: z.unknown().optional(),
  material_requests: z.array(z.unknown()).optional(),
  get_items: z.unknown().optional(),
  combine_items: z.union([z.literal(0), z.literal(1)]).optional(),
  po_items: z.array(z.unknown()),
  prod_plan_references: z.array(z.unknown()).optional(),
  combine_sub_items: z.union([z.literal(0), z.literal(1)]).optional(),
  sub_assembly_warehouse: z.string().optional(),
  skip_available_sub_assembly_item: z
    .union([z.literal(0), z.literal(1)])
    .optional(),
  get_sub_assembly_items: z.unknown().optional(),
  sub_assembly_items: z.array(z.unknown()).optional(),
  download_materials_required: z.unknown().optional(),
  include_non_stock_items: z.union([z.literal(0), z.literal(1)]).optional(),
  include_subcontracted_items: z.union([z.literal(0), z.literal(1)]).optional(),
  consider_minimum_order_qty: z.union([z.literal(0), z.literal(1)]).optional(),
  include_safety_stock: z.union([z.literal(0), z.literal(1)]).optional(),
  ignore_existing_ordered_qty: z.union([z.literal(0), z.literal(1)]).optional(),
  for_warehouse: z.string().optional(),
  get_items_for_mr: z.unknown().optional(),
  transfer_materials: z.unknown().optional(),
  mr_items: z.array(z.unknown()).optional(),
  total_planned_qty: z.number().optional(),
  total_produced_qty: z.number().optional(),
  status: z
    .enum([
      "Draft",
      "Submitted",
      "Not Started",
      "In Process",
      "Completed",
      "Closed",
      "Cancelled",
      "Material Requested",
    ])
    .optional(),
  warehouses: z.array(z.unknown()).optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ProductionPlanCreateSchema = ProductionPlanSchema.pick({
  naming_series: true,
  company: true,
  posting_date: true,
  po_items: true,
}).extend({});

export const ProductionPlanUpdateSchema = ProductionPlanSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ProductionPlanSchemaType = z.infer<typeof ProductionPlanSchema>;

/**
 * Job Card Zod Schema
 * @doctype Job Card
 * @generated 2026-01-14T18:05:48.302Z
 */
export const JobCardSchema = z.object({
  naming_series: z.string().min(1, "Naming Series is required"),
  work_order: z.string().min(1, "Work Order is required"),
  bom_no: z.string().optional(),
  production_item: z.string().optional(),
  employee: z.array(z.unknown()).optional(),
  posting_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  for_quantity: z.number().optional(),
  total_completed_qty: z.number().optional(),
  process_loss_qty: z.number().optional(),
  expected_start_date: z.string().optional(),
  time_required: z.number().optional(),
  expected_end_date: z.string().optional(),
  scheduled_time_logs: z.array(z.unknown()).optional(),
  time_logs: z.array(z.unknown()).optional(),
  actual_start_date: z.string().optional(),
  total_time_in_mins: z.number().optional(),
  actual_end_date: z.string().optional(),
  operation: z.string().min(1, "Operation is required"),
  wip_warehouse: z.string().min(1, "WIP Warehouse is required"),
  workstation_type: z.string().optional(),
  workstation: z.string().min(1, "Workstation is required"),
  quality_inspection_template: z.string().optional(),
  quality_inspection: z.string().optional(),
  sub_operations: z.array(z.unknown()).optional(),
  items: z.array(z.unknown()).optional(),
  scrap_items: z.array(z.unknown()).optional(),
  for_job_card: z.string().optional(),
  is_corrective_job_card: z.union([z.literal(0), z.literal(1)]).optional(),
  hour_rate: z.number().optional(),
  for_operation: z.string().optional(),
  project: z.string().optional(),
  item_name: z.string().optional(),
  transferred_qty: z.number().optional(),
  requested_qty: z.number().optional(),
  status: z
    .enum([
      "Open",
      "Work In Progress",
      "Material Transferred",
      "On Hold",
      "Submitted",
      "Cancelled",
      "Completed",
    ])
    .optional(),
  operation_row_number: z.string().optional(),
  operation_id: z.string().optional(),
  sequence_id: z.number().int().optional(),
  remarks: z.string().optional(),
  serial_and_batch_bundle: z.string().optional(),
  batch_no: z.string().optional(),
  serial_no: z.string().optional(),
  barcode: z.string().optional(),
  job_started: z.union([z.literal(0), z.literal(1)]).optional(),
  started_time: z.string().optional(),
  current_time: z.number().int().optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const JobCardCreateSchema = JobCardSchema.pick({
  naming_series: true,
  work_order: true,
  company: true,
  operation: true,
  wip_warehouse: true,
  workstation: true,
}).extend({});

export const JobCardUpdateSchema = JobCardSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type JobCardSchemaType = z.infer<typeof JobCardSchema>;

/**
 * Downtime Entry Zod Schema
 * @doctype Downtime Entry
 * @generated 2026-01-14T18:05:48.302Z
 */
export const DowntimeEntrySchema = z.object({
  naming_series: z.string().min(1, "Naming Series is required"),
  workstation: z.string().min(1, "Workstation / Machine is required"),
  operator: z.string().min(1, "Operator is required"),
  from_time: z.string().min(1, "From Time is required"),
  to_time: z.string().min(1, "To Time is required"),
  downtime: z.number().optional(),
  stop_reason: z.string().min(1, "Stop Reason is required"),
  remarks: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const DowntimeEntryCreateSchema = DowntimeEntrySchema.pick({
  naming_series: true,
  workstation: true,
  operator: true,
  from_time: true,
  to_time: true,
  stop_reason: true,
}).extend({});

export const DowntimeEntryUpdateSchema = DowntimeEntrySchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type DowntimeEntrySchemaType = z.infer<typeof DowntimeEntrySchema>;

/**
 * Task Zod Schema
 * @doctype Task
 * @generated 2026-01-14T18:05:48.302Z
 */
export const TaskSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  project: z.string().optional(),
  issue: z.string().optional(),
  type: z.string().optional(),
  color: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
  is_template: z.union([z.literal(0), z.literal(1)]).optional(),
  status: z
    .enum([
      "Open",
      "Working",
      "Pending Review",
      "Overdue",
      "Template",
      "Completed",
      "Cancelled",
    ])
    .optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  task_weight: z.number().optional(),
  parent_task: z.string().optional(),
  completed_by: z.string().optional(),
  completed_on: z.string().optional(),
  exp_start_date: z.string().optional(),
  expected_time: z.number().optional(),
  start: z.number().int().optional(),
  exp_end_date: z.string().optional(),
  progress: z.number().optional(),
  duration: z.number().int().optional(),
  is_milestone: z.union([z.literal(0), z.literal(1)]).optional(),
  description: z.string().optional(),
  depends_on: z.array(z.unknown()).optional(),
  depends_on_tasks: z.string().optional(),
  act_start_date: z.string().optional(),
  actual_time: z.number().optional(),
  act_end_date: z.string().optional(),
  total_costing_amount: z.number().optional(),
  total_billing_amount: z.number().optional(),
  review_date: z.string().optional(),
  closing_date: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  lft: z.number().int().optional(),
  rgt: z.number().int().optional(),
  old_parent: z.string().optional(),
  template_task: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const TaskCreateSchema = TaskSchema.pick({
  subject: true,
}).extend({
  description: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const TaskUpdateSchema = TaskSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type TaskSchemaType = z.infer<typeof TaskSchema>;

/**
 * Activity Type Zod Schema
 * @doctype Activity Type
 * @generated 2026-01-14T18:05:48.302Z
 */
export const ActivityTypeSchema = z.object({
  activity_type: z.string().min(1, "Activity Type is required"),
  costing_rate: z.number().optional(),
  billing_rate: z.number().optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ActivityTypeCreateSchema = ActivityTypeSchema.pick({
  activity_type: true,
}).extend({
  disabled: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const ActivityTypeUpdateSchema = ActivityTypeSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ActivityTypeSchemaType = z.infer<typeof ActivityTypeSchema>;

/**
 * Timesheet Zod Schema
 * @doctype Timesheet
 * @generated 2026-01-14T18:05:48.302Z
 */
export const TimesheetSchema = z.object({
  title: z.string().optional(),
  naming_series: z.string().min(1, "Series is required"),
  company: z.string().optional(),
  customer: z.string().optional(),
  currency: z.string().optional(),
  exchange_rate: z.number().optional(),
  sales_invoice: z.string().optional(),
  status: z
    .enum(["Draft", "Submitted", "Billed", "Payslip", "Completed", "Cancelled"])
    .optional(),
  parent_project: z.string().optional(),
  employee: z.string().optional(),
  employee_name: z.string().optional(),
  department: z.string().optional(),
  user: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  time_logs: z.array(z.unknown()),
  total_hours: z.number().optional(),
  total_billable_hours: z.number().optional(),
  base_total_billable_amount: z.number().optional(),
  base_total_billed_amount: z.number().optional(),
  base_total_costing_amount: z.number().optional(),
  total_billed_hours: z.number().optional(),
  total_billable_amount: z.number().optional(),
  total_billed_amount: z.number().optional(),
  total_costing_amount: z.number().optional(),
  per_billed: z.number().optional(),
  note: z.string().optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const TimesheetCreateSchema = TimesheetSchema.pick({
  naming_series: true,
  time_logs: true,
}).extend({});

export const TimesheetUpdateSchema = TimesheetSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type TimesheetSchemaType = z.infer<typeof TimesheetSchema>;

/**
 * Project Type Zod Schema
 * @doctype Project Type
 * @generated 2026-01-14T18:05:48.302Z
 */
export const ProjectTypeSchema = z.object({
  project_type: z.string().min(1, "Project Type is required"),
  description: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ProjectTypeCreateSchema = ProjectTypeSchema.pick({
  project_type: true,
}).extend({
  description: z.string().optional(),
});

export const ProjectTypeUpdateSchema = ProjectTypeSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ProjectTypeSchemaType = z.infer<typeof ProjectTypeSchema>;

/**
 * Issue Zod Schema
 * @doctype Issue
 * @generated 2026-01-14T18:05:48.302Z
 */
export const IssueSchema = z.object({
  naming_series: z.enum(["ISS-.YYYY.-"]).optional(),
  subject: z.string().min(1, "Subject is required"),
  customer: z.string().optional(),
  raised_by: z.string().optional(),
  status: z
    .enum(["Open", "Replied", "On Hold", "Resolved", "Closed"])
    .optional(),
  priority: z.string().optional(),
  issue_type: z.string().optional(),
  issue_split_from: z.string().optional(),
  description: z.string().optional(),
  service_level_agreement: z.string().optional(),
  response_by: z.string().optional(),
  reset_service_level_agreement: z.unknown().optional(),
  agreement_status: z
    .enum(["First Response Due", "Resolution Due", "Fulfilled", "Failed"])
    .optional(),
  sla_resolution_by: z.string().optional(),
  service_level_agreement_creation: z.string().optional(),
  on_hold_since: z.string().optional(),
  total_hold_time: z.string().optional(),
  first_response_time: z.string().optional(),
  first_responded_on: z.string().optional(),
  avg_response_time: z.string().optional(),
  resolution_details: z.string().optional(),
  opening_date: z.string().optional(),
  opening_time: z.string().optional(),
  sla_resolution_date: z.string().optional(),
  resolution_time: z.string().optional(),
  user_resolution_time: z.string().optional(),
  lead: z.string().optional(),
  contact: z.string().optional(),
  email_account: z.string().optional(),
  customer_name: z.string().optional(),
  project: z.string().optional(),
  company: z.string().optional(),
  via_customer_portal: z.union([z.literal(0), z.literal(1)]).optional(),
  attachment: z.string().optional(),
  content_type: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const IssueCreateSchema = IssueSchema.pick({
  subject: true,
}).extend({
  description: z.string().optional(),
});

export const IssueUpdateSchema = IssueSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type IssueSchemaType = z.infer<typeof IssueSchema>;

/**
 * Warranty Claim Zod Schema
 * @doctype Warranty Claim
 * @generated 2026-01-14T18:05:48.302Z
 */
export const WarrantyClaimSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  status: z.string().min(1, "Status is required"),
  complaint_date: z.string().min(1, "Issue Date is required"),
  customer: z.string().min(1, "Customer is required"),
  serial_no: z.string().optional(),
  complaint: z.string().min(1, "Issue is required"),
  item_code: z.string().optional(),
  item_name: z.string().optional(),
  description: z.string().optional(),
  warranty_amc_status: z
    .enum(["Under Warranty", "Out of Warranty", "Under AMC", "Out of AMC"])
    .optional(),
  warranty_expiry_date: z.string().optional(),
  amc_expiry_date: z.string().optional(),
  resolution_date: z.string().optional(),
  resolved_by: z.string().optional(),
  resolution_details: z.string().optional(),
  customer_name: z.string().optional(),
  contact_person: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  territory: z.string().optional(),
  customer_group: z.string().optional(),
  customer_address: z.string().optional(),
  address_display: z.string().optional(),
  service_address: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  complaint_raised_by: z.string().optional(),
  from_company: z.string().optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const WarrantyClaimCreateSchema = WarrantyClaimSchema.pick({
  naming_series: true,
  status: true,
  complaint_date: true,
  customer: true,
  complaint: true,
  company: true,
}).extend({
  description: z.string().optional(),
});

export const WarrantyClaimUpdateSchema = WarrantyClaimSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type WarrantyClaimSchemaType = z.infer<typeof WarrantyClaimSchema>;

/**
 * Maintenance Visit Zod Schema
 * @doctype Maintenance Visit
 * @generated 2026-01-14T18:05:48.302Z
 */
export const MaintenanceVisitSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  customer: z.string().min(1, "Customer is required"),
  customer_name: z.string().optional(),
  address_display: z.string().optional(),
  contact_display: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  maintenance_schedule: z.string().optional(),
  maintenance_schedule_detail: z.string().optional(),
  mntc_date: z.string().min(1, "Maintenance Date is required"),
  mntc_time: z.string().optional(),
  completion_status: z.string().min(1, "Completion Status is required"),
  maintenance_type: z.string().min(1, "Maintenance Type is required"),
  purposes: z.array(z.unknown()).optional(),
  customer_feedback: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  amended_from: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  customer_address: z.string().optional(),
  contact_person: z.string().optional(),
  territory: z.string().optional(),
  customer_group: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const MaintenanceVisitCreateSchema = MaintenanceVisitSchema.pick({
  naming_series: true,
  customer: true,
  mntc_date: true,
  completion_status: true,
  maintenance_type: true,
  status: true,
  company: true,
}).extend({});

export const MaintenanceVisitUpdateSchema =
  MaintenanceVisitSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type MaintenanceVisitSchemaType = z.infer<typeof MaintenanceVisitSchema>;

/**
 * Maintenance Schedule Zod Schema
 * @doctype Maintenance Schedule
 * @generated 2026-01-14T18:05:48.302Z
 */
export const MaintenanceScheduleSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  customer: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  transaction_date: z.string().min(1, "Transaction Date is required"),
  items: z.array(z.unknown()),
  generate_schedule: z.unknown().optional(),
  schedules: z.array(z.unknown()).optional(),
  customer_name: z.string().optional(),
  contact_person: z.string().optional(),
  contact_mobile: z.string().optional(),
  contact_email: z.string().optional(),
  contact_display: z.string().optional(),
  customer_address: z.string().optional(),
  address_display: z.string().optional(),
  territory: z.string().optional(),
  customer_group: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const MaintenanceScheduleCreateSchema = MaintenanceScheduleSchema.pick({
  naming_series: true,
  status: true,
  transaction_date: true,
  items: true,
  company: true,
}).extend({});

export const MaintenanceScheduleUpdateSchema =
  MaintenanceScheduleSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type MaintenanceScheduleSchemaType = z.infer<
  typeof MaintenanceScheduleSchema
>;

/**
 * Customer Zod Schema
 * @doctype Customer
 * @generated 2026-01-14T18:05:48.297Z
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
 * Sales Partner Type Zod Schema
 * @doctype Sales Partner Type
 * @generated 2026-01-18T10:13:46.765Z
 */
export const SalesPartnerTypeSchema = z.object({
  sales_partner_type: z.string().min(1, "Sales Partner Type is required"),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const SalesPartnerTypeCreateSchema = SalesPartnerTypeSchema.pick({
  sales_partner_type: true,
}).extend({});

export const SalesPartnerTypeUpdateSchema =
  SalesPartnerTypeSchema.partial().omit({
    name: true,
    creation: true,
    owner: true,
    docstatus: true,
  });

export type SalesPartnerTypeSchemaType = z.infer<typeof SalesPartnerTypeSchema>;

/**
 * Project Zod Schema
 * @doctype Project
 * @generated 2026-01-14T18:05:48.302Z
 */
export const ProjectSchema = z.object({
  naming_series: z.string().min(1, "Series is required"),
  project_name: z.string().min(1, "Project Name is required"),
  status: z.enum(["Open", "Completed", "Cancelled"]).optional(),
  project_type: z.string().optional(),
  is_active: z.enum(["Yes", "No"]).optional(),
  percent_complete_method: z
    .enum(["Manual", "Task Completion", "Task Progress", "Task Weight"])
    .optional(),
  percent_complete: z.number().optional(),
  project_template: z.string().optional(),
  expected_start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  priority: z.enum(["Medium", "Low", "High"]).optional(),
  department: z.string().optional(),
  customer: z.string().optional(),
  sales_order: z.string().optional(),
  users: z.array(z.unknown()).optional(),
  copied_from: z.string().optional(),
  notes: z.string().optional(),
  actual_start_date: z.string().optional(),
  actual_time: z.number().optional(),
  actual_end_date: z.string().optional(),
  estimated_costing: z.number().optional(),
  total_costing_amount: z.number().optional(),
  total_purchase_cost: z.number().optional(),
  company: z.string().min(1, "Company is required"),
  total_sales_amount: z.number().optional(),
  total_billable_amount: z.number().optional(),
  total_billed_amount: z.number().optional(),
  total_consumed_material_cost: z.number().optional(),
  cost_center: z.string().optional(),
  gross_margin: z.number().optional(),
  per_gross_margin: z.number().optional(),
  collect_progress: z.union([z.literal(0), z.literal(1)]).optional(),
  holiday_list: z.string().optional(),
  frequency: z.enum(["Hourly", "Twice Daily", "Daily", "Weekly"]).optional(),
  from_time: z.string().optional(),
  to_time: z.string().optional(),
  first_email: z.string().optional(),
  second_email: z.string().optional(),
  daily_time_to_send: z.string().optional(),
  day_to_send: z
    .enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .optional(),
  weekly_time_to_send: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const ProjectCreateSchema = ProjectSchema.pick({
  naming_series: true,
  project_name: true,
  company: true,
  customer: true,
  expected_start_date: true,
  expected_end_date: true,
  status: true,
  priority: true,
}).extend({
  customer: z.string().optional(),
  expected_start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
});

export const ProjectUpdateSchema = ProjectSchema.partial().omit({
  name: true,
  creation: true,
  owner: true,
  docstatus: true,
});

export type ProjectSchemaType = z.infer<typeof ProjectSchema>;

/**
 * Driver Zod Schema
 * @doctype Driver
 * @generated 2026-01-25T20:02:44.967Z
 */
export const DriverSchema = z.object({
  naming_series: z.enum(["HR-DRI-.YYYY.-"]).optional(),
  full_name: z.string().min(1, "Full Name is required"),
  status: z.string().min(1, "Status is required"),
  transporter: z.string().optional(),
  employee: z.string().optional(),
  cell_number: z.string().optional(),
  address: z.string().optional(),
  license_number: z.string().optional(),
  issuing_date: z.string().optional(),
  expiry_date: z.string().optional(),
  driving_license_category: z.array(z.unknown()).optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const DriverCreateSchema = z.object({
  full_name: z.string().min(1, "Driver name is required"),
  status: z.enum(["Active", "Left"]).default("Active"),
  employee: z.string().optional(),
  license_number: z.string().optional(),
  issuing_date: z.string().optional(),
  expiry_date: z.string().optional(),
  cell_number: z.string().optional(),
  transporter: z.string().optional(),
});

export const DriverUpdateSchema = DriverCreateSchema.partial();
export type DriverFormData = z.input<typeof DriverCreateSchema>;
export type DriverSchemaType = z.infer<typeof DriverSchema>;

/**
 * Vehicle Zod Schema
 * @doctype Vehicle
 * @generated 2026-01-25T20:02:44.967Z
 */
export const VehicleSchema = z.object({
  license_plate: z.string().min(1, "License Plate is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  last_odometer: z.number().int(),
  acquisition_date: z.string().optional(),
  location: z.string().optional(),
  chassis_no: z.string().optional(),
  vehicle_value: z.number().optional(),
  employee: z.string().optional(),
  insurance_company: z.string().optional(),
  policy_no: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  fuel_type: z.string().min(1, "Fuel Type is required"),
  uom: z.string().min(1, "Fuel UOM is required"),
  carbon_check_date: z.string().optional(),
  color: z.string().optional(),
  wheels: z.number().int().optional(),
  doors: z.number().int().optional(),
  amended_from: z.string().optional(),
  name: z.string().min(1, "ID is required"),
  owner: z.string().optional(),
  creation: z.string().optional(),
  modified: z.string().optional(),
  modified_by: z.string().optional(),
  docstatus: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

export const VehicleCreateSchema = z.object({
  license_plate: z.string().min(1, "License plate is required"),
  make: z.string().optional(),
  model: z.string().optional(),
  fuel_type: z.enum(["Petrol", "Diesel", "Natural Gas", "Electric"]).optional(),
  acquisition_date: z.string().optional(),
  location: z.string().optional(),
  insurance_company: z.string().optional(),
  policy_no: z.string().optional(),
});

export const VehicleUpdateSchema = VehicleCreateSchema.partial();
export type VehicleFormData = z.input<typeof VehicleCreateSchema>;
export type VehicleSchemaType = z.infer<typeof VehicleSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTING MODULE - CONSOLIDATED SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

// --- Setup & Master Data ---

export const AccountCreateSchema = z.object({
  account_name: z.string().min(1, "Account name is required"),
  account_number: z.string().optional(),
  parent_account: z.string().min(1, "Parent account is required"),
  company: z.string().min(1, "Company is required"),
  root_type: z
    .enum(["Asset", "Liability", "Income", "Expense", "Equity"])
    .optional(),
  report_type: z.enum(["Balance Sheet", "Profit and Loss"]).optional(),
  account_type: z.string().optional(),
  account_currency: z.string().optional(),
  is_group: z.union([z.literal(0), z.literal(1)]).default(0),
  freeze_account: z.enum(["No", "Yes"]).default("No"),
  balance_must_be: z.enum(["Debit", "Credit"]).optional(),
  disabled: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const AccountUpdateSchema = AccountCreateSchema.partial();
export type AccountFormData = z.input<typeof AccountCreateSchema>;

export const CostCenterCreateSchema = z.object({
  cost_center_name: z.string().min(1, "Cost center name is required"),
  cost_center_number: z.string().optional(),
  parent_cost_center: z.string().min(1, "Parent cost center is required"),
  company: z.string().min(1, "Company is required"),
  is_group: z.union([z.literal(0), z.literal(1)]).default(0),
  disabled: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const CostCenterUpdateSchema = CostCenterCreateSchema.partial();
export type CostCenterFormData = z.input<typeof CostCenterCreateSchema>;

// --- Transactions: Invoices ---

export const SalesInvoiceItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.number().min(0.001, "Quantity must be greater than 0"),
  uom: z.string().optional(),
  rate: z.number().min(0, "Rate must be 0 or greater"),
  amount: z.number().optional(),
  income_account: z.string().optional(),
  cost_center: z.string().optional(),
  expense_account: z.string().optional(), // for update stock
  warehouse: z.string().optional(),
  target_warehouse: z.string().optional(),
  // References
  sales_order: z.string().optional(),
  so_detail: z.string().optional(),
  delivery_note: z.string().optional(),
  dn_detail: z.string().optional(),
});

export const SalesInvoiceCreateSchema = z.object({
  naming_series: z.string().default("ACC-SINV-.YYYY.-"),
  customer: z.string().min(1, "Customer is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  posting_time: z.string().optional(),
  due_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),

  // Items
  items: z
    .array(SalesInvoiceItemSchema)
    .min(1, "At least one item is required"),

  // Accounting
  debit_to: z.string().min(1, "Debit To (Receivable Account) is required"),
  cost_center: z.string().optional(),

  // Pricing
  currency: z.string().default("ETB"),
  conversion_rate: z.number().default(1),
  selling_price_list: z.string().optional(),

  // Taxes
  taxes_and_charges: z.string().optional(),
  taxes: z.array(z.any()).optional(),

  // Terms
  payment_terms_template: z.string().optional(),

  // Points/Offers
  redeem_loyalty_points: z.union([z.literal(0), z.literal(1)]).default(0),

  // Returns
  is_return: z.union([z.literal(0), z.literal(1)]).default(0),
  return_against: z.string().optional(),

  // Reference
  project: z.string().optional(),
  remarks: z.string().optional(),
});

export const SalesInvoiceUpdateSchema = SalesInvoiceCreateSchema.partial();

export const PurchaseInvoiceItemSchema = z.object({
  item_code: z.string().min(1, "Item is required"),
  item_name: z.string().optional(),
  description: z.string().optional(),
  qty: z.number().min(0.001, "Quantity must be greater than 0"),
  uom: z.string().optional(),
  rate: z.number().min(0, "Rate must be 0 or greater"),
  amount: z.number().optional(),
  expense_account: z.string().optional(),
  cost_center: z.string().optional(),
  warehouse: z.string().optional(),
  purchase_order: z.string().optional(),
  po_detail: z.string().optional(),
  purchase_receipt: z.string().optional(),
  pr_detail: z.string().optional(),
});

export const PurchaseInvoiceCreateSchema = z.object({
  naming_series: z.string().default("ACC-PINV-.YYYY.-"),
  supplier: z.string().min(1, "Supplier is required"),
  posting_date: z.string().min(1, "Posting date is required"),
  posting_time: z.string().optional(),
  due_date: z.string().optional(),
  company: z.string().min(1, "Company is required"),
  bill_no: z.string().optional(),
  bill_date: z.string().optional(),
  items: z
    .array(PurchaseInvoiceItemSchema)
    .min(1, "At least one item is required"),
  credit_to: z.string().min(1, "Credit To (Payable Account) is required"),
  cost_center: z.string().optional(),
  currency: z.string().default("ETB"),
  conversion_rate: z.number().default(1),
  buying_price_list: z.string().optional(),
  taxes_and_charges: z.string().optional(),
  taxes: z.array(z.any()).optional(),
  payment_terms_template: z.string().optional(),
  is_return: z.union([z.literal(0), z.literal(1)]).default(0),
  return_against: z.string().optional(),
  project: z.string().optional(),
  remarks: z.string().optional(),
});

export const PurchaseInvoiceUpdateSchema =
  PurchaseInvoiceCreateSchema.partial();

// --- Transactions: Payments & Journals ---

export const PaymentEntryReferenceSchema = z.object({
  reference_doctype: z.enum([
    "Sales Invoice",
    "Purchase Invoice",
    "Journal Entry",
  ]),
  reference_name: z.string().min(1),
  allocated_amount: z.number().min(0),
  exchange_rate: z.number().default(1),
});

export const PaymentEntryCreateSchema = z.object({
  naming_series: z.string().default("ACC-PAY-.YYYY.-"),
  payment_type: z.enum(["Receive", "Pay", "Internal Transfer"]),
  posting_date: z.string().min(1, "Posting date is required"),
  company: z.string().min(1, "Company is required"),

  // Party
  party_type: z
    .enum(["Customer", "Supplier", "Shareholder", "Employee"])
    .optional(),
  party: z.string().optional(),

  // Accounts
  paid_from: z.string().min(1, "Paid from account is required"),
  paid_to: z.string().min(1, "Paid to account is required"),

  // Amounts
  paid_amount: z.number().min(0),
  received_amount: z.number().min(0),

  // Mode & Reference
  mode_of_payment: z.string().optional(),
  reference_no: z.string().optional(),
  reference_date: z.string().optional(),

  // Allocated References
  references: z.array(PaymentEntryReferenceSchema).optional(),

  // Others
  project: z.string().optional(),
  cost_center: z.string().optional(),
  remarks: z.string().optional(),
});

export const PaymentEntryUpdateSchema = PaymentEntryCreateSchema.partial();

export const JournalEntryAccountSchema = z.object({
  account: z.string().min(1, "Account is required"),
  debit: z.number().default(0),
  credit: z.number().default(0),
  debit_in_account_currency: z.number().optional(),
  credit_in_account_currency: z.number().optional(),
  exchange_rate: z.number().default(1),
  party_type: z.string().optional(),
  party: z.string().optional(),
  cost_center: z.string().optional(),
  project: z.string().optional(),
  reference_type: z.string().optional(),
  reference_name: z.string().optional(),
  user_remark: z.string().optional(),
});

export const JournalEntryCreateSchema = z.object({
  naming_series: z.string().default("ACC-JV-.YYYY.-"),
  voucher_type: z
    .enum([
      "Journal Entry",
      "Inter Company Journal Entry",
      "Bank Entry",
      "Cash Entry",
      "Credit Note",
      "Debit Note",
      "Opening Entry",
      "Depreciation Entry",
    ])
    .default("Journal Entry"),
  posting_date: z.string().min(1, "Posting date is required"),
  company: z.string().min(1, "Company is required"),
  accounts: z
    .array(JournalEntryAccountSchema)
    .min(2, "At least two accounts are required for a journal entry"),
  cheque_no: z.string().optional(),
  cheque_date: z.string().optional(),
  user_remark: z.string().optional(),
  remark: z.string().optional(),
});

export const JournalEntryUpdateSchema = JournalEntryCreateSchema.partial();

export type SalesInvoiceFormData = z.input<typeof SalesInvoiceCreateSchema>;
export type SalesInvoiceItemData = z.input<typeof SalesInvoiceItemSchema>;
export type PurchaseInvoiceFormData = z.input<
  typeof PurchaseInvoiceCreateSchema
>;
export type PurchaseInvoiceItemData = z.input<typeof PurchaseInvoiceItemSchema>;
export type PaymentEntryFormData = z.input<typeof PaymentEntryCreateSchema>;
export type PaymentEntryReferenceData = z.input<
  typeof PaymentEntryReferenceSchema
>;
export type JournalEntryFormData = z.input<typeof JournalEntryCreateSchema>;
export type JournalEntryAccountData = z.input<typeof JournalEntryAccountSchema>;
