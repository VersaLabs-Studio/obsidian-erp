// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: 2026-01-14T17:57:59.373Z
// Source: Frappe DocType Metadata API
// Script: scripts/generate-types.js

/**
 * User DocType
 * @doctype User
 * @generated 2026-01-14T18:05:48.282Z
 */
export interface User {
  /** Enabled */
  enabled?: 0 | 1;
  /** Email */
  email: string;
  /** First Name */
  first_name: string;
  /** Middle Name */
  middle_name?: string;
  /** Last Name */
  last_name?: string;
  /** Full Name */
  full_name?: string;
  /** Username */
  username?: string;
  /** Language */
  language?: string;
  /** Time Zone */
  time_zone?: unknown;
  /** Send Welcome Email */
  send_welcome_email?: 0 | 1;
  /** Unsubscribed */
  unsubscribed?: 0 | 1;
  /** User Image - Get your globally recognized avatar from Gravatar.com */
  user_image?: string;
  /** Role Profile */
  role_profile_name?: string;
  /** Roles HTML */
  roles_html?: string;
  /** Roles Assigned */
  roles?: unknown[];
  /** Module Profile */
  module_profile?: string;
  /** Modules HTML */
  modules_html?: string;
  /** Block Modules */
  block_modules?: unknown[];
  /** Home Settings */
  home_settings?: string;
  /** Gender */
  gender?: string;
  /** Birth Date */
  birth_date?: string;
  /** Interests */
  interest?: string;
  /** Phone */
  phone?: string;
  /** Location */
  location?: string;
  /** Bio */
  bio?: string;
  /** Mobile No */
  mobile_no?: string;
  /** Mute Sounds */
  mute_sounds?: 0 | 1;
  /** Desk Theme */
  desk_theme?: "Light" | "Dark" | "Automatic";
  /** Banner Image */
  banner_image?: string;
  /** Search Bar */
  search_bar?: 0 | 1;
  /** Notifications */
  notifications?: 0 | 1;
  /** Sidebar */
  list_sidebar?: 0 | 1;
  /** Bulk Actions */
  bulk_actions?: 0 | 1;
  /** View Switcher */
  view_switcher?: 0 | 1;
  /** Sidebar */
  form_sidebar?: 0 | 1;
  /** Timeline */
  timeline?: 0 | 1;
  /** Dashboard */
  dashboard?: 0 | 1;
  /** Set New Password */
  new_password?: string;
  /** Logout From All Devices After Changing Password */
  logout_all_sessions?: 0 | 1;
  /** Reset Password Key */
  reset_password_key?: string;
  /** Last Reset Password Key Generated On - Stores the datetime when the last reset password key was generated. */
  last_reset_password_key_generated_on?: string;
  /** Last Password Reset Date */
  last_password_reset_date?: string;
  /** Redirect URL */
  redirect_url?: string;
  /** Send Notifications For Documents Followed By Me */
  document_follow_notify?: 0 | 1;
  /** Frequency */
  document_follow_frequency?: "Hourly" | "Daily" | "Weekly";
  /** Auto follow documents that you create */
  follow_created_documents?: 0 | 1;
  /** Auto follow documents that you comment on */
  follow_commented_documents?: 0 | 1;
  /** Auto follow documents that you Like */
  follow_liked_documents?: 0 | 1;
  /** Auto follow documents that are assigned to you */
  follow_assigned_documents?: 0 | 1;
  /** Auto follow documents that are shared with you */
  follow_shared_documents?: 0 | 1;
  /** Email Signature */
  email_signature?: string;
  /** Send Notifications For Email Threads */
  thread_notify?: 0 | 1;
  /** Send Me A Copy of Outgoing Emails */
  send_me_a_copy?: 0 | 1;
  /** Allowed In Mentions */
  allowed_in_mentions?: 0 | 1;
  /** User Emails */
  user_emails?: unknown[];
  /** Default Workspace - If left empty, the default workspace will be the last visited workspace */
  default_workspace?: string;
  /** Default App - Redirect to the selected app after login */
  default_app?: string;
  /** User Defaults - Enter default value fields (keys) and values. If you add multiple values for a field, the first one will be picked. These defaults are also used to set "match" permission rules. To see list of fields, go to "Customize Form". */
  defaults?: unknown[];
  /** Simultaneous Sessions */
  simultaneous_sessions?: number;
  /** Restrict IP - Restrict user from this IP address only. Multiple IP addresses can be added by separating with commas. Also accepts partial IP addresses like (111.111.111) */
  restrict_ip?: string;
  /** Last IP */
  last_ip?: string;
  /** Login After - Allow user to login only after this hour (0-24) */
  login_after?: number;
  /** User Type - If the user has any role checked, then the user becomes a "System User". "System User" has access to the desktop */
  user_type?: string;
  /** Last Active */
  last_active?: string;
  /** Login Before - Allow user to login only before this hour (0-24) */
  login_before?: number;
  /** Bypass Restricted IP Address Check If Two Factor Auth Enabled - If enabled,  user can login from any IP Address using Two Factor Auth, this can also be set for all users in System Settings */
  bypass_restrict_ip_check_if_2fa_enabled?: 0 | 1;
  /** Last Login */
  last_login?: string;
  /** Last Known Versions - Stores the JSON of last known versions of various installed apps. It is used to show release notes. */
  last_known_versions?: string;
  /** Social Logins */
  social_logins?: unknown[];
  /** API Key - API Key cannot be regenerated */
  api_key?: string;
  /** Generate Keys - <a href="https://docs.frappe.io/framework/user/en/api/rest#1-token-based-authentication" target="_blank">
  Click here to learn about token-based authentication
</a> */
  generate_keys?: unknown;
  /** API Secret */
  api_secret?: string;
  /** Onboarding Status */
  onboarding_status?: string;
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
 * User Create Request
 * Fields required to create a new User
 */
export type UserCreateRequest = Pick<User, "email" | "first_name"> &
  Partial<
    Pick<
      User,
      | "enabled"
      | "middle_name"
      | "last_name"
      | "full_name"
      | "username"
      | "language"
      | "time_zone"
      | "send_welcome_email"
      | "unsubscribed"
      | "user_image"
    >
  >;

/**
 * User Update Request
 * All fields optional for update
 */
export type UserUpdateRequest = Partial<
  Omit<User, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Company DocType
 * @doctype Company
 * @generated 2026-01-14T18:05:48.284Z
 */
export interface Company {
  /** Company */
  company_name: string;
  /** Abbr */
  abbr: string;
  /** Default Currency */
  default_currency: string;
  /** Country */
  country: string;
  /** Is Group */
  is_group?: 0 | 1;
  /** Default Holiday List */
  default_holiday_list?: string;
  /** Default Letter Head */
  default_letter_head?: string;
  /** Tax ID */
  tax_id?: string;
  /** Domain */
  domain?: string;
  /** Date of Establishment */
  date_of_establishment?: string;
  /** Parent Company */
  parent_company?: string;
  /** Company Logo */
  company_logo?: string;
  /** Date of Incorporation */
  date_of_incorporation?: string;
  /** Phone No */
  phone_no?: string;
  /** Email */
  email?: string;
  /** Company Description */
  company_description?: string;
  /** Date of Commencement */
  date_of_commencement?: string;
  /** Fax */
  fax?: string;
  /** Website */
  website?: string;
  address_html?: string;
  /** Registration Details - Company registration numbers for your reference. Tax numbers etc. */
  registration_details?: string;
  /** Lft */
  lft?: number;
  /** Rgt */
  rgt?: number;
  /** old_parent */
  old_parent?: string;
  /** Create Chart Of Accounts Based On */
  create_chart_of_accounts_based_on?: "Standard Template" | "Existing Company";
  /** Existing Company  */
  existing_company?: string;
  /** Chart Of Accounts Template */
  chart_of_accounts?: string;
  /** Default Bank Account */
  default_bank_account?: string;
  /** Default Cash Account */
  default_cash_account?: string;
  /** Default Receivable Account */
  default_receivable_account?: string;
  /** Default Payable Account */
  default_payable_account?: string;
  /** Write Off Account */
  write_off_account?: string;
  /** Unrealized Profit / Loss Account */
  unrealized_profit_loss_account?: string;
  /** Allow Account Creation Against Child Company */
  allow_account_creation_against_child_company?: 0 | 1;
  /** Default Cost of Goods Sold Account */
  default_expense_account?: string;
  /** Default Income Account */
  default_income_account?: string;
  /** Default Payment Discount Account */
  default_discount_account?: string;
  /** Default Payment Terms Template */
  payment_terms?: string;
  /** Default Cost Center */
  cost_center?: string;
  /** Default Finance Book */
  default_finance_book?: string;
  /** Exchange Gain / Loss Account */
  exchange_gain_loss_account?: string;
  /** Unrealized Exchange Gain/Loss Account */
  unrealized_exchange_gain_loss_account?: string;
  /** Round Off Account */
  round_off_account?: string;
  /** Round Off Cost Center */
  round_off_cost_center?: string;
  /** Round Off for Opening */
  round_off_for_opening?: string;
  /** Default Deferred Revenue Account */
  default_deferred_revenue_account?: string;
  /** Default Deferred Expense Account */
  default_deferred_expense_account?: string;
  /** Book Advance Payments in Separate Party Account - Enabling this option will allow you to record - <br><br> 1. Advances Received in a <b>Liability Account</b> instead of the <b>Asset Account</b><br><br>2. Advances Paid in an <b>Asset Account</b> instead of the <b> Liability Account</b> */
  book_advance_payments_in_separate_party_account?: 0 | 1;
  /** Reconcile on Advance Payment Date - If <b>Enabled</b> - Reconciliation happens on the <b>Advance Payment posting date</b><br>
If <b>Disabled</b> - Reconciliation happens on oldest of 2 Dates: <b>Invoice Date</b> or the <b>Advance Payment posting date</b><br>
 */
  reconcile_on_advance_payment_date?: 0 | 1;
  /** Reconciliation Takes Effect On */
  reconciliation_takes_effect_on?:
    | "Advance Payment Date"
    | "Oldest Of Invoice Or Advance"
    | "Reconciliation Date";
  /** Default Advance Received Account - Only 'Payment Entries' made against this advance account are supported. */
  default_advance_received_account?: string;
  /** Default Advance Paid Account - Only 'Payment Entries' made against this advance account are supported. */
  default_advance_paid_account?: string;
  /** Auto Create Exchange Rate Revaluation */
  auto_exchange_rate_revaluation?: 0 | 1;
  /** Frequency */
  auto_err_frequency?: "Daily" | "Weekly" | "Monthly";
  /** Submit ERR Journals? - Upon enabling this, the JV will be submitted for a different exchange rate. */
  submit_err_jv?: 0 | 1;
  /** Exception Budget Approver Role */
  exception_budget_approver_role?: string;
  /** Accumulated Depreciation Account */
  accumulated_depreciation_account?: string;
  /** Depreciation Expense Account */
  depreciation_expense_account?: string;
  /** Series for Asset Depreciation Entry (Journal Entry) */
  series_for_depreciation_entry?: string;
  /** Expenses Included In Asset Valuation */
  expenses_included_in_asset_valuation?: string;
  /** Gain/Loss Account on Asset Disposal */
  disposal_account?: string;
  /** Asset Depreciation Cost Center */
  depreciation_cost_center?: string;
  /** Capital Work In Progress Account */
  capital_work_in_progress_account?: string;
  /** Asset Received But Not Billed */
  asset_received_but_not_billed?: string;
  /** Default Buying Terms */
  default_buying_terms?: string;
  /** Sales Monthly History */
  sales_monthly_history?: string;
  /** Monthly Sales Target */
  monthly_sales_target?: number;
  /** Total Monthly Sales */
  total_monthly_sales?: number;
  /** Default Selling Terms */
  default_selling_terms?: string;
  /** Default Sales Contact */
  default_sales_contact?: string;
  /** Default Warehouse for Sales Return */
  default_warehouse_for_sales_return?: string;
  /** Credit Limit */
  credit_limit?: number;
  /** Transactions Annual History */
  transactions_annual_history?: string;
  /** Enable Perpetual Inventory */
  enable_perpetual_inventory?: 0 | 1;
  /** Enable Provisional Accounting For Non Stock Items */
  enable_provisional_accounting_for_non_stock_items?: 0 | 1;
  /** Default Inventory Account */
  default_inventory_account?: string;
  /** Stock Adjustment Account */
  stock_adjustment_account?: string;
  /** Default In-Transit Warehouse */
  default_in_transit_warehouse?: string;
  /** Stock Received But Not Billed */
  stock_received_but_not_billed?: string;
  /** Default Provisional Account */
  default_provisional_account?: string;
  /** Expenses Included In Valuation */
  expenses_included_in_valuation?: string;
  /** Default Operating Cost Account */
  default_operating_cost_account?: string;
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
 * Company Create Request
 * Fields required to create a new Company
 */
export type CompanyCreateRequest = Pick<
  Company,
  "company_name" | "abbr" | "default_currency" | "country"
> &
  Partial<
    Pick<
      Company,
      | "is_group"
      | "default_holiday_list"
      | "default_letter_head"
      | "tax_id"
      | "domain"
      | "date_of_establishment"
      | "parent_company"
      | "company_logo"
      | "date_of_incorporation"
      | "phone_no"
    >
  >;

/**
 * Company Update Request
 * All fields optional for update
 */
export type CompanyUpdateRequest = Partial<
  Omit<Company, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Currency DocType
 * @doctype Currency
 * @generated 2026-01-14T18:05:48.284Z
 */
export interface Currency {
  /** Currency Name */
  currency_name: string;
  /** Enabled */
  enabled?: 0 | 1;
  /** Fraction - Sub-currency. For e.g. "Cent" */
  fraction?: string;
  /** Fraction Units - 1 Currency = [?] Fraction
For e.g. 1 USD = 100 Cent */
  fraction_units?: number;
  /** Smallest Currency Fraction Value - Smallest circulating fraction unit (coin). For e.g. 1 cent for USD and it should be entered as 0.01 */
  smallest_currency_fraction_value?: number;
  /** Symbol - A symbol for this currency. For e.g. $ */
  symbol?: string;
  /** Show Currency Symbol on Right Side */
  symbol_on_right?: 0 | 1;
  /** Number Format - How should this currency be formatted? If not set, will use system defaults */
  number_format?:
    | "#,###.##"
    | "#.###,##"
    | "# ###.##"
    | "# ###,##"
    | "#'###.##"
    | "#, ###.##"
    | "#,##,###.##"
    | "#,###.###"
    | "#.###"
    | "#,###";
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
 * Currency Create Request
 * Fields required to create a new Currency
 */
export type CurrencyCreateRequest = Pick<Currency, "currency_name"> &
  Partial<
    Pick<
      Currency,
      | "enabled"
      | "fraction"
      | "fraction_units"
      | "smallest_currency_fraction_value"
      | "symbol"
      | "symbol_on_right"
      | "number_format"
    >
  >;

/**
 * Currency Update Request
 * All fields optional for update
 */
export type CurrencyUpdateRequest = Partial<
  Omit<Currency, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Country DocType
 * @doctype Country
 * @generated 2026-01-14T18:05:48.284Z
 */
export interface Country {
  /** Country Name */
  country_name: string;
  /** Date Format */
  date_format?: string;
  /** Time format */
  time_format?: string;
  /** Time Zones */
  time_zones?: string;
  /** Code */
  code?: string;
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
 * Country Create Request
 * Fields required to create a new Country
 */
export type CountryCreateRequest = Pick<Country, "country_name"> &
  Partial<Pick<Country, "date_format" | "time_format" | "time_zones" | "code">>;

/**
 * Country Update Request
 * All fields optional for update
 */
export type CountryUpdateRequest = Partial<
  Omit<Country, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Territory DocType
 * @doctype Territory
 * @generated 2026-01-14T18:05:48.284Z
 */
export interface Territory {
  /** Territory Name */
  territory_name: string;
  /** Parent Territory */
  parent_territory?: string;
  /** Is Group - Only leaf nodes are allowed in transaction */
  is_group?: 0 | 1;
  /** Territory Manager - For reference */
  territory_manager?: string;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** old_parent */
  old_parent?: string;
  /** Targets */
  targets?: unknown[];
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
 * Territory Create Request
 * Fields required to create a new Territory
 */
export type TerritoryCreateRequest = Pick<Territory, "territory_name"> &
  Partial<
    Pick<
      Territory,
      | "parent_territory"
      | "is_group"
      | "territory_manager"
      | "lft"
      | "rgt"
      | "old_parent"
      | "targets"
    >
  >;

/**
 * Territory Update Request
 * All fields optional for update
 */
export type TerritoryUpdateRequest = Partial<
  Omit<Territory, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Department DocType
 * @doctype Department
 * @generated 2026-01-14T18:05:48.284Z
 */
export interface Department {
  /** Department */
  department_name: string;
  /** Parent Department */
  parent_department?: string;
  /** Company */
  company: string;
  /** Is Group */
  is_group?: 0 | 1;
  /** Disabled */
  disabled?: 0 | 1;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** Old Parent */
  old_parent?: string;
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
 * Department Create Request
 * Fields required to create a new Department
 */
export type DepartmentCreateRequest = Pick<
  Department,
  "department_name" | "company"
> &
  Partial<
    Pick<
      Department,
      | "parent_department"
      | "is_group"
      | "disabled"
      | "lft"
      | "rgt"
      | "old_parent"
    >
  >;

/**
 * Department Update Request
 * All fields optional for update
 */
export type DepartmentUpdateRequest = Partial<
  Omit<Department, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Designation DocType
 * @doctype Designation
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface Designation {
  /** Designation */
  designation_name: string;
  /** Description */
  description?: string;
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
 * Designation Create Request
 * Fields required to create a new Designation
 */
export type DesignationCreateRequest = Pick<Designation, "designation_name"> &
  Partial<Pick<Designation, "description">>;

/**
 * Designation Update Request
 * All fields optional for update
 */
export type DesignationUpdateRequest = Partial<
  Omit<Designation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Branch DocType
 * @doctype Branch
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface Branch {
  /** Branch */
  branch: string;
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
 * Branch Create Request
 * Fields required to create a new Branch
 */
export type BranchCreateRequest = Pick<Branch, "branch">;

/**
 * Branch Update Request
 * All fields optional for update
 */
export type BranchUpdateRequest = Partial<
  Omit<Branch, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Employee DocType
 * @doctype Employee
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface Employee {
  /** Employee */
  employee?: string;
  /** Series */
  naming_series?: "HR-EMP-";
  /** First Name */
  first_name: string;
  /** Middle Name */
  middle_name?: string;
  /** Last Name */
  last_name?: string;
  /** Full Name */
  employee_name?: string;
  /** Gender */
  gender: string;
  /** Date of Birth */
  date_of_birth: string;
  /** Salutation */
  salutation?: string;
  /** Date of Joining */
  date_of_joining: string;
  /** Image */
  image?: string;
  /** Status */
  status: "Active" | "Inactive" | "Suspended" | "Left";
  /** User ID - System User (login) ID. If set, it will become default for all HR forms. */
  user_id?: string;
  /** Create User */
  create_user?: unknown;
  /** Create User Permission - This will restrict user access to other employee records */
  create_user_permission?: 0 | 1;
  /** Company */
  company: string;
  /** Department */
  department?: string;
  /** Employee Number */
  employee_number?: string;
  /** Designation */
  designation?: string;
  /** Reports to */
  reports_to?: string;
  /** Branch */
  branch?: string;
  /** Offer Date */
  scheduled_confirmation_date?: string;
  /** Confirmation Date */
  final_confirmation_date?: string;
  /** Contract End Date */
  contract_end_date?: string;
  /** Notice (days) */
  notice_number_of_days?: number;
  /** Date Of Retirement */
  date_of_retirement?: string;
  /** Mobile */
  cell_number?: string;
  /** Personal Email */
  personal_email?: string;
  /** Company Email - Provide Email Address registered in company */
  company_email?: string;
  /** Prefered Contact Email */
  prefered_contact_email?: "Company Email" | "Personal Email" | "User ID";
  /** Prefered Email */
  prefered_email?: string;
  /** Unsubscribed */
  unsubscribed?: 0 | 1;
  /** Current Address */
  current_address?: string;
  /** Current Address Is */
  current_accommodation_type?: "Rented" | "Owned";
  /** Permanent Address */
  permanent_address?: string;
  /** Permanent Address Is */
  permanent_accommodation_type?: "Rented" | "Owned";
  /** Emergency Contact Name */
  person_to_be_contacted?: string;
  /** Emergency Phone */
  emergency_phone_number?: string;
  /** Relation */
  relation?: string;
  /** Attendance Device ID (Biometric/RF tag ID) */
  attendance_device_id?: string;
  /** Holiday List - Applicable Holiday List */
  holiday_list?: string;
  /** Cost to Company (CTC) */
  ctc?: number;
  /** Salary Currency */
  salary_currency?: string;
  /** Salary Mode */
  salary_mode?: "Bank" | "Cash" | "Cheque";
  /** Bank Name */
  bank_name?: string;
  /** Bank A/C No. */
  bank_ac_no?: string;
  /** IBAN */
  iban?: string;
  /** Marital Status */
  marital_status?: "Single" | "Married" | "Divorced" | "Widowed";
  /** Family Background - Here you can maintain family details like name and occupation of parent, spouse and children */
  family_background?: string;
  /** Blood Group */
  blood_group?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  /** Health Details - Here you can maintain height, weight, allergies, medical concerns etc */
  health_details?: string;
  /** Passport Number */
  passport_number?: string;
  /** Valid Upto */
  valid_upto?: string;
  /** Date of Issue */
  date_of_issue?: string;
  /** Place of Issue */
  place_of_issue?: string;
  /** Bio / Cover Letter - Short biography for website and other publications. */
  bio?: string;
  /** Education */
  education?: unknown[];
  /** External Work History */
  external_work_history?: unknown[];
  /** Internal Work History */
  internal_work_history?: unknown[];
  /** Resignation Letter Date */
  resignation_letter_date?: string;
  /** Relieving Date */
  relieving_date?: string;
  /** Exit Interview Held On */
  held_on?: string;
  /** New Workplace */
  new_workplace?: string;
  /** Leave Encashed? */
  leave_encashed?: "Yes" | "No";
  /** Encashment Date */
  encashment_date?: string;
  /** Reason for Leaving */
  reason_for_leaving?: string;
  /** Feedback */
  feedback?: string;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** Old Parent */
  old_parent?: string;
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
 * Employee Create Request
 * Fields required to create a new Employee
 */
export type EmployeeCreateRequest = Pick<
  Employee,
  | "first_name"
  | "gender"
  | "date_of_birth"
  | "date_of_joining"
  | "status"
  | "company"
> &
  Partial<
    Pick<
      Employee,
      | "employee"
      | "naming_series"
      | "middle_name"
      | "last_name"
      | "employee_name"
      | "salutation"
      | "image"
      | "user_id"
      | "create_user"
      | "create_user_permission"
    >
  >;

/**
 * Employee Update Request
 * All fields optional for update
 */
export type EmployeeUpdateRequest = Partial<
  Omit<Employee, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Salutation DocType
 * @doctype Salutation
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface Salutation {
  /** Salutation */
  salutation?: string;
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
 * Salutation Update Request
 * All fields optional for update
 */
export type SalutationUpdateRequest = Partial<
  Omit<Salutation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Gender DocType
 * @doctype Gender
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface Gender {
  /** Gender */
  gender?: string;
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
 * Gender Update Request
 * All fields optional for update
 */
export type GenderUpdateRequest = Partial<
  Omit<Gender, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Letter Head DocType
 * @doctype Letter Head
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface LetterHead {
  /** Letter Head Name */
  letter_head_name: string;
  /** Letter Head Based On */
  source?: "Image" | "HTML";
  /** Footer Based On */
  footer_source?: "Image" | "HTML";
  /** Disabled */
  disabled?: 0 | 1;
  /** Default Letter Head */
  is_default?: 0 | 1;
  /** Image */
  image?: string;
  /** Image Height */
  image_height?: number;
  /** Image Width */
  image_width?: number;
  /** Align */
  align?: "Left" | "Right" | "Center";
  /** Header HTML - Letter Head in HTML */
  content?: string;
  /** Footer HTML - Footer will display correctly only in PDF */
  footer?: string;
  /** Image */
  footer_image?: string;
  /** Image Height */
  footer_image_height?: number;
  /** Image Width */
  footer_image_width?: number;
  /** Align */
  footer_align?: "Left" | "Right" | "Center";
  /** Header Script */
  header_script?: string;
  /** Footer Script */
  footer_script?: string;
  /** Instructions */
  instructions?: string;
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
 * Letter Head Create Request
 * Fields required to create a new Letter Head
 */
export type LetterHeadCreateRequest = Pick<LetterHead, "letter_head_name"> &
  Partial<
    Pick<
      LetterHead,
      | "source"
      | "footer_source"
      | "disabled"
      | "is_default"
      | "image"
      | "image_height"
      | "image_width"
      | "align"
      | "content"
      | "footer"
    >
  >;

/**
 * Letter Head Update Request
 * All fields optional for update
 */
export type LetterHeadUpdateRequest = Partial<
  Omit<LetterHead, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Print Heading DocType
 * @doctype Print Heading
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface PrintHeading {
  /** Print Heading */
  print_heading: string;
  /** Description */
  description?: string;
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
 * Print Heading Create Request
 * Fields required to create a new Print Heading
 */
export type PrintHeadingCreateRequest = Pick<PrintHeading, "print_heading"> &
  Partial<Pick<PrintHeading, "description">>;

/**
 * Print Heading Update Request
 * All fields optional for update
 */
export type PrintHeadingUpdateRequest = Partial<
  Omit<PrintHeading, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Terms and Conditions DocType
 * @doctype Terms and Conditions
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface TermsAndConditions {
  /** Title */
  title: string;
  /** Disabled */
  disabled?: 0 | 1;
  /** Selling */
  selling?: 0 | 1;
  /** Buying */
  buying?: 0 | 1;
  /** Terms and Conditions */
  terms?: string;
  /** Terms and Conditions Help */
  terms_and_conditions_help?: string;
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
 * Terms and Conditions Create Request
 * Fields required to create a new Terms and Conditions
 */
export type TermsAndConditionsCreateRequest = Pick<
  TermsAndConditions,
  "title"
> &
  Partial<
    Pick<
      TermsAndConditions,
      "disabled" | "selling" | "buying" | "terms" | "terms_and_conditions_help"
    >
  >;

/**
 * Terms and Conditions Update Request
 * All fields optional for update
 */
export type TermsAndConditionsUpdateRequest = Partial<
  Omit<TermsAndConditions, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Lead DocType
 * @doctype Lead
 * @generated 2026-01-14T18:05:48.285Z
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
  status:
    | "Lead"
    | "Open"
    | "Replied"
    | "Opportunity"
    | "Quotation"
    | "Lost Quotation"
    | "Interested"
    | "Converted"
    | "Do Not Contact";
  /** From Customer */
  customer?: string;
  /** Lead Type */
  type?: "Client" | "Channel Partner" | "Consultant";
  /** Request Type */
  request_type?:
    | "Product Enquiry"
    | "Request for Information"
    | "Suggestions"
    | "Other";
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
  no_of_employees?:
    | "1-10"
    | "11-50"
    | "51-200"
    | "201-500"
    | "501-1000"
    | "1000+";
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
export type LeadCreateRequest = Pick<Lead, "status"> &
  Partial<
    Pick<
      Lead,
      | "naming_series"
      | "salutation"
      | "first_name"
      | "middle_name"
      | "last_name"
      | "lead_name"
      | "job_title"
      | "gender"
      | "source"
      | "lead_owner"
      | "email_id"
      | "mobile_no"
      | "phone"
      | "company_name"
      | "industry"
      | "territory"
      | "type"
      | "request_type"
      | "disabled"
    >
  >;

/**
 * Lead Update Request
 * All fields optional for update
 */
export type LeadUpdateRequest = Partial<
  Omit<Lead, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Lead Source DocType
 * @doctype Lead Source
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface LeadSource {
  /** Source Name */
  source_name: string;
  /** Details */
  details?: string;
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
 * Lead Source Create Request
 * Fields required to create a new Lead Source
 */
export type LeadSourceCreateRequest = Pick<LeadSource, "source_name"> &
  Partial<Pick<LeadSource, "details">>;

/**
 * Lead Source Update Request
 * All fields optional for update
 */
export type LeadSourceUpdateRequest = Partial<
  Omit<LeadSource, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Industry Type DocType
 * @doctype Industry Type
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface IndustryType {
  /** Industry */
  industry: string;
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
 * Industry Type Create Request
 * Fields required to create a new Industry Type
 */
export type IndustryTypeCreateRequest = Pick<IndustryType, "industry">;

/**
 * Industry Type Update Request
 * All fields optional for update
 */
export type IndustryTypeUpdateRequest = Partial<
  Omit<IndustryType, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Opportunity DocType
 * @doctype Opportunity
 * @generated 2026-01-14T18:05:48.285Z
 */
export interface Opportunity {
  /** Series */
  naming_series: "CRM-OPP-.YYYY.-";
  /** Opportunity From */
  opportunity_from: string;
  /** Party */
  party_name: string;
  /** Customer Name */
  customer_name?: string;
  /** Status */
  status: "Open" | "Quotation" | "Converted" | "Lost" | "Replied" | "Closed";
  /** Opportunity Type */
  opportunity_type?: string;
  /** Source */
  source?: string;
  /** Opportunity Owner */
  opportunity_owner?: string;
  /** Sales Stage */
  sales_stage?: string;
  /** Expected Closing Date */
  expected_closing?: string;
  /** Probability (%) */
  probability?: number;
  /** No of Employees */
  no_of_employees?:
    | "1-10"
    | "11-50"
    | "51-200"
    | "201-500"
    | "501-1000"
    | "1000+";
  /** Annual Revenue */
  annual_revenue?: number;
  /** Customer Group */
  customer_group?: string;
  /** Industry */
  industry?: string;
  /** Market Segment */
  market_segment?: string;
  /** Website */
  website?: string;
  /** City */
  city?: string;
  /** State/Province */
  state?: string;
  /** Country */
  country?: string;
  /** Territory */
  territory?: string;
  /** Currency */
  currency?: string;
  /** Exchange Rate */
  conversion_rate?: number;
  /** Opportunity Amount */
  opportunity_amount?: number;
  /** Opportunity Amount (Company Currency) */
  base_opportunity_amount?: number;
  /** Company */
  company: string;
  /** Campaign - Enter name of campaign if source of enquiry is campaign */
  campaign?: string;
  /** Opportunity Date */
  transaction_date: string;
  /** Print Language */
  language?: string;
  /** Amended From */
  amended_from?: string;
  /** Title */
  title?: string;
  /** First Response Time */
  first_response_time?: string;
  /** Lost Reasons */
  lost_reasons?: unknown[];
  /** Detailed Reason */
  order_lost_reason?: string;
  /** Competitors */
  competitors?: unknown[];
  /** Contact Person */
  contact_person?: string;
  /** Job Title */
  job_title?: string;
  /** Contact Email */
  contact_email?: string;
  /** Contact Mobile */
  contact_mobile?: string;
  /** WhatsApp */
  whatsapp?: string;
  /** Phone */
  phone?: string;
  /** Phone Ext. */
  phone_ext?: string;
  /** Address HTML */
  address_html?: string;
  /** Customer / Lead Address */
  customer_address?: string;
  /** Address */
  address_display?: string;
  /** Contact HTML */
  contact_html?: string;
  /** Contact */
  contact_display?: string;
  /** Items */
  items?: unknown[];
  /** Total (Company Currency) */
  base_total?: number;
  /** Total */
  total?: number;
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
 * Opportunity Create Request
 * Fields required to create a new Opportunity
 */
export type OpportunityCreateRequest = Pick<
  Opportunity,
  | "naming_series"
  | "opportunity_from"
  | "party_name"
  | "status"
  | "company"
  | "transaction_date"
> &
  Partial<
    Pick<
      Opportunity,
      | "customer_name"
      | "opportunity_type"
      | "source"
      | "opportunity_owner"
      | "sales_stage"
      | "expected_closing"
      | "probability"
      | "no_of_employees"
      | "annual_revenue"
      | "customer_group"
    >
  >;

/**
 * Opportunity Update Request
 * All fields optional for update
 */
export type OpportunityUpdateRequest = Partial<
  Omit<Opportunity, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Customer Group DocType
 * @doctype Customer Group
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface CustomerGroup {
  /** Customer Group Name */
  customer_group_name: string;
  /** Parent Customer Group */
  parent_customer_group?: string;
  /** Is Group - Only leaf nodes are allowed in transaction */
  is_group?: 0 | 1;
  /** Default Price List */
  default_price_list?: string;
  /** Default Payment Terms Template */
  payment_terms?: string;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** old_parent */
  old_parent?: string;
  /** Accounts - Mention if non-standard receivable account applicable */
  accounts?: unknown[];
  /** Credit Limit */
  credit_limits?: unknown[];
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
 * Customer Group Create Request
 * Fields required to create a new Customer Group
 */
export type CustomerGroupCreateRequest = Pick<
  CustomerGroup,
  "customer_group_name"
> &
  Partial<
    Pick<
      CustomerGroup,
      | "parent_customer_group"
      | "is_group"
      | "default_price_list"
      | "payment_terms"
      | "lft"
      | "rgt"
      | "old_parent"
      | "accounts"
      | "credit_limits"
    >
  >;

/**
 * Customer Group Update Request
 * All fields optional for update
 */
export type CustomerGroupUpdateRequest = Partial<
  Omit<CustomerGroup, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Contact DocType
 * @doctype Contact
 * @generated 2026-01-14T18:05:48.286Z
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
export type ContactUpdateRequest = Partial<
  Omit<Contact, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Address DocType
 * @doctype Address
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface Address {
  /** Address Title */
  address_title?: string;
  /** Address Type */
  address_type:
    | "Billing"
    | "Shipping"
    | "Office"
    | "Personal"
    | "Plant"
    | "Postal"
    | "Shop"
    | "Subsidiary"
    | "Warehouse"
    | "Current"
    | "Permanent"
    | "Other";
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
export type AddressCreateRequest = Pick<
  Address,
  "address_type" | "address_line1" | "city" | "country"
> &
  Partial<
    Pick<
      Address,
      | "address_title"
      | "address_line2"
      | "county"
      | "state"
      | "pincode"
      | "email_id"
      | "phone"
      | "fax"
      | "is_primary_address"
      | "is_shipping_address"
    >
  >;

/**
 * Address Update Request
 * All fields optional for update
 */
export type AddressUpdateRequest = Partial<
  Omit<Address, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Quotation DocType
 * @doctype Quotation
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface Quotation {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "SAL-QTN-.YYYY.-";
  /** Quotation To */
  quotation_to: string;
  /** Party */
  party_name?: string;
  /** Customer Name */
  customer_name?: string;
  /** Date */
  transaction_date: string;
  /** Valid Till */
  valid_till?: string;
  /** Order Type */
  order_type: "Sales" | "Maintenance" | "Shopping Cart";
  /** Company */
  company: string;
  /** Has Unit Price Items */
  has_unit_price_items?: 0 | 1;
  /** Amended From */
  amended_from?: string;
  /** Currency */
  currency: string;
  /** Exchange Rate - Rate at which customer's currency is converted to company's base currency */
  conversion_rate: number;
  /** Price List */
  selling_price_list: string;
  /** Price List Currency */
  price_list_currency: string;
  /** Price List Exchange Rate - Rate at which Price list currency is converted to company's base currency */
  plc_conversion_rate: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Items */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total?: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Category */
  tax_category?: string;
  /** Sales Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Sales Taxes and Charges */
  taxes?: unknown[];
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Grand Total (Company Currency) */
  base_grand_total?: number;
  /** Rounding Adjustment (Company Currency) */
  base_rounding_adjustment?: number;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** In Words (Company Currency) */
  base_in_words?: string;
  /** Grand Total */
  grand_total?: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Rounded Total */
  rounded_total?: number;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** In Words */
  in_words?: string;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Coupon Code */
  coupon_code?: string;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Referral Sales Partner */
  referral_sales_partner?: string;
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Bundle Items */
  packed_items?: unknown[];
  /** Pricing Rule Detail */
  pricing_rules?: unknown[];
  /** Customer Address */
  customer_address?: string;
  /** Address */
  address_display?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Shipping Address */
  shipping_address_name?: string;
  /** Shipping Address */
  shipping_address?: string;
  /** Company Address Name */
  company_address?: string;
  /** Company Address */
  company_address_display?: string;
  /** Company Contact Person */
  company_contact_person?: string;
  /** Payment Terms Template */
  payment_terms_template?: string;
  /** Payment Schedule */
  payment_schedule?: unknown[];
  /** Terms */
  tc_name?: string;
  /** Term Details */
  terms?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Update Auto Repeat Reference */
  update_auto_repeat_reference?: unknown;
  /** Letter Head */
  letter_head?: string;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** Lost Reasons */
  lost_reasons?: unknown[];
  /** Competitors */
  competitors?: unknown[];
  /** Detailed Reason */
  order_lost_reason?: string;
  /** Status */
  status:
    | "Draft"
    | "Open"
    | "Replied"
    | "Partially Ordered"
    | "Ordered"
    | "Lost"
    | "Cancelled"
    | "Expired";
  /** Customer Group */
  customer_group?: string;
  /** Territory */
  territory?: string;
  /** Campaign */
  campaign?: string;
  /** Source */
  source?: string;
  /** Opportunity */
  opportunity?: string;
  /** Supplier Quotation */
  supplier_quotation?: string;
  /** Opportunity Item */
  enq_det?: string;
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
 * Quotation Create Request
 * Fields required to create a new Quotation
 */
export type QuotationCreateRequest = Pick<
  Quotation,
  | "naming_series"
  | "quotation_to"
  | "transaction_date"
  | "order_type"
  | "company"
  | "currency"
  | "conversion_rate"
  | "selling_price_list"
  | "price_list_currency"
  | "plc_conversion_rate"
  | "items"
  | "status"
> &
  Partial<
    Pick<
      Quotation,
      | "title"
      | "party_name"
      | "customer_name"
      | "valid_till"
      | "has_unit_price_items"
      | "amended_from"
      | "ignore_pricing_rule"
      | "scan_barcode"
      | "last_scanned_warehouse"
      | "total_qty"
    >
  >;

/**
 * Quotation Update Request
 * All fields optional for update
 */
export type QuotationUpdateRequest = Partial<
  Omit<Quotation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Sales Order DocType
 * @doctype Sales Order
 * @generated 2026-01-17T16:29:14.093Z
 */
export interface SalesOrder {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "SAL-ORD-.YYYY.-";
  /** Customer */
  customer: string;
  /** Customer Name */
  customer_name?: string;
  /** Tax Id */
  tax_id?: string;
  /** Order Type */
  order_type: "Sales" | "Maintenance" | "Shopping Cart";
  /** Date */
  transaction_date: string;
  /** Delivery Date */
  delivery_date?: string;
  /** Customer's Purchase Order */
  po_no?: string;
  /** Customer's Purchase Order Date */
  po_date?: string;
  /** Company */
  company: string;
  /** Skip Delivery Note */
  skip_delivery_note?: 0 | 1;
  /** Has Unit Price Items */
  has_unit_price_items?: 0 | 1;
  /** Amended From */
  amended_from?: string;
  /** Cost Center */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Currency */
  currency: string;
  /** Exchange Rate - Rate at which customer's currency is converted to company's base currency */
  conversion_rate: number;
  /** Price List */
  selling_price_list: string;
  /** Price List Currency */
  price_list_currency: string;
  /** Price List Exchange Rate - Rate at which Price list currency is converted to company's base currency */
  plc_conversion_rate: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Set Source Warehouse */
  set_warehouse?: string;
  /** Reserve Stock - If checked, Stock will be reserved on <b>Submit</b> */
  reserve_stock?: 0 | 1;
  /** Items */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total?: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Category */
  tax_category?: string;
  /** Sales Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Sales Taxes and Charges */
  taxes?: unknown[];
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Grand Total (Company Currency) */
  base_grand_total?: number;
  /** Rounding Adjustment (Company Currency) */
  base_rounding_adjustment?: number;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** In Words (Company Currency) - In Words will be visible once you save the Sales Order. */
  base_in_words?: string;
  /** Grand Total */
  grand_total?: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Rounded Total */
  rounded_total?: number;
  /** In Words */
  in_words?: string;
  /** Advance Paid */
  advance_paid?: number;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Coupon Code */
  coupon_code?: string;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Packed Items */
  packed_items?: unknown[];
  /** Pricing Rule Detail */
  pricing_rules?: unknown[];
  /** Customer Address */
  customer_address?: string;
  /** Address */
  address_display?: string;
  /** Customer Group */
  customer_group?: string;
  /** Territory */
  territory?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Phone */
  contact_phone?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Shipping Address Name */
  shipping_address_name?: string;
  /** Shipping Address */
  shipping_address?: string;
  /** Dispatch Address Name */
  dispatch_address_name?: string;
  /** Dispatch Address */
  dispatch_address?: string;
  /** Company Address Name */
  company_address?: string;
  /** Company Address */
  company_address_display?: string;
  /** Company Contact Person */
  company_contact_person?: string;
  /** Payment Terms Template */
  payment_terms_template?: string;
  /** Payment Schedule */
  payment_schedule?: unknown[];
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions Details */
  terms?: string;
  /** Status */
  status:
    | "Draft"
    | "On Hold"
    | "To Deliver and Bill"
    | "To Bill"
    | "To Deliver"
    | "Completed"
    | "Cancelled"
    | "Closed";
  /** Delivery Status */
  delivery_status?:
    | "Not Delivered"
    | "Fully Delivered"
    | "Partly Delivered"
    | "Closed"
    | "Not Applicable";
  /** %  Delivered - % of materials delivered against this Sales Order */
  per_delivered?: number;
  /** % Amount Billed - % of materials billed against this Sales Order */
  per_billed?: number;
  /** % Picked */
  per_picked?: number;
  /** Billing Status */
  billing_status?: "Not Billed" | "Fully Billed" | "Partly Billed" | "Closed";
  /** Sales Partner */
  sales_partner?: string;
  /** Amount Eligible for Commission */
  amount_eligible_for_commission?: number;
  /** Commission Rate */
  commission_rate?: number;
  /** Total Commission */
  total_commission?: number;
  /** Sales Team */
  sales_team?: unknown[];
  /** Loyalty Points */
  loyalty_points?: number;
  /** Loyalty Amount */
  loyalty_amount?: number;
  /** From Date */
  from_date?: string;
  /** To Date */
  to_date?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Update Auto Repeat Reference */
  update_auto_repeat_reference?: unknown;
  /** Letter Head */
  letter_head?: string;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** Is Internal Customer */
  is_internal_customer?: 0 | 1;
  /** Represents Company */
  represents_company?: string;
  /** Source */
  source?: string;
  /** Inter Company Order Reference */
  inter_company_order_reference?: string;
  /** Campaign */
  campaign?: string;
  /** Party Account Currency */
  party_account_currency?: string;
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
 * Sales Order Create Request
 * Fields required to create a new Sales Order
 */
export type SalesOrderCreateRequest = Pick<
  SalesOrder,
  | "naming_series"
  | "customer"
  | "order_type"
  | "transaction_date"
  | "company"
  | "currency"
  | "conversion_rate"
  | "selling_price_list"
  | "price_list_currency"
  | "plc_conversion_rate"
  | "items"
  | "status"
> &
  Partial<
    Pick<
      SalesOrder,
      | "title"
      | "customer_name"
      | "tax_id"
      | "delivery_date"
      | "po_no"
      | "po_date"
      | "skip_delivery_note"
      | "has_unit_price_items"
      | "amended_from"
      | "cost_center"
    >
  >;

/**
 * Sales Order Update Request
 * All fields optional for update
 */
export type SalesOrderUpdateRequest = Partial<
  Omit<SalesOrder, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Sales Partner DocType
 * @doctype Sales Partner
 * @generated 2026-01-17T16:29:14.100Z
 */
export interface SalesPartner {
  /** Sales Partner Name */
  partner_name: string;
  /** Partner Type */
  partner_type?: string;
  /** Territory */
  territory: string;
  /** Commission Rate */
  commission_rate: number;
  /** Address Desc */
  address_desc?: string;
  /** Address HTML */
  address_html?: string;
  /** Contact Desc */
  contact_desc?: string;
  /** Contact HTML */
  contact_html?: string;
  /** Targets */
  targets?: unknown[];
  /** Show In Website */
  show_in_website?: 0 | 1;
  /** Referral Code - To Track inbound purchase */
  referral_code?: string;
  /** Route */
  route?: string;
  /** Logo */
  logo?: string;
  /** Partner website */
  partner_website?: string;
  /** Introduction */
  introduction?: string;
  /** Description */
  description?: string;
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
 * Sales Partner Create Request
 * Fields required to create a new Sales Partner
 */
export type SalesPartnerCreateRequest = Pick<
  SalesPartner,
  "partner_name" | "territory" | "commission_rate"
> &
  Partial<
    Pick<
      SalesPartner,
      | "partner_type"
      | "address_desc"
      | "address_html"
      | "contact_desc"
      | "contact_html"
      | "targets"
      | "show_in_website"
      | "referral_code"
      | "route"
      | "logo"
    >
  >;

/**
 * Sales Partner Update Request
 * All fields optional for update
 */
export type SalesPartnerUpdateRequest = Partial<
  Omit<SalesPartner, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Sales Person DocType
 * @doctype Sales Person
 * @generated 2026-01-17T16:29:14.099Z
 */
export interface SalesPerson {
  /** Sales Person Name */
  sales_person_name: string;
  /** Parent Sales Person - Select company name first. */
  parent_sales_person?: string;
  /** Commission Rate */
  commission_rate?: string;
  /** Is Group */
  is_group: 0 | 1;
  /** Enabled */
  enabled?: 0 | 1;
  /** Employee */
  employee?: string;
  /** Department */
  department?: string;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** old_parent */
  old_parent?: string;
  /** Targets */
  targets?: unknown[];
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
 * Sales Person Create Request
 * Fields required to create a new Sales Person
 */
export type SalesPersonCreateRequest = Pick<
  SalesPerson,
  "sales_person_name" | "is_group"
> &
  Partial<
    Pick<
      SalesPerson,
      | "parent_sales_person"
      | "commission_rate"
      | "enabled"
      | "employee"
      | "department"
      | "lft"
      | "rgt"
      | "old_parent"
      | "targets"
    >
  >;

/**
 * Sales Person Update Request
 * All fields optional for update
 */
export type SalesPersonUpdateRequest = Partial<
  Omit<SalesPerson, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Blanket Order DocType
 * @doctype Blanket Order
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface BlanketOrder {
  /** Series */
  naming_series: "MFG-BLR-.YYYY.-";
  /** Order Type */
  blanket_order_type: "Selling" | "Purchasing";
  /** Customer */
  customer?: string;
  /** Customer Name */
  customer_name?: string;
  /** Supplier */
  supplier?: string;
  /** Supplier Name */
  supplier_name?: string;
  /** Order No */
  order_no?: string;
  /** Order Date */
  order_date?: string;
  /** From Date */
  from_date: string;
  /** To Date */
  to_date: string;
  /** Company */
  company: string;
  /** Item */
  items: unknown[];
  /** Amended From */
  amended_from?: string;
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions Details */
  terms?: string;
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
 * Blanket Order Create Request
 * Fields required to create a new Blanket Order
 */
export type BlanketOrderCreateRequest = Pick<
  BlanketOrder,
  | "naming_series"
  | "blanket_order_type"
  | "from_date"
  | "to_date"
  | "company"
  | "items"
> &
  Partial<
    Pick<
      BlanketOrder,
      | "customer"
      | "customer_name"
      | "supplier"
      | "supplier_name"
      | "order_no"
      | "order_date"
      | "amended_from"
      | "tc_name"
      | "terms"
    >
  >;

/**
 * Blanket Order Update Request
 * All fields optional for update
 */
export type BlanketOrderUpdateRequest = Partial<
  Omit<BlanketOrder, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Installation Note DocType
 * @doctype Installation Note
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface InstallationNote {
  /** Series */
  naming_series: "MAT-INS-.YYYY.-";
  /** Customer */
  customer: string;
  /** Customer Address */
  customer_address?: string;
  /** Contact Person */
  contact_person?: string;
  /** Name */
  customer_name?: string;
  /** Address */
  address_display?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Territory */
  territory: string;
  /** Customer Group */
  customer_group?: string;
  /** Installation Date */
  inst_date: string;
  /** Installation Time */
  inst_time?: string;
  /** Status */
  status: "Draft" | "Submitted" | "Cancelled";
  /** Company */
  company: string;
  /** Amended From */
  amended_from?: string;
  /** Remarks */
  remarks?: string;
  /** Items */
  items: unknown[];
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
 * Installation Note Create Request
 * Fields required to create a new Installation Note
 */
export type InstallationNoteCreateRequest = Pick<
  InstallationNote,
  | "naming_series"
  | "customer"
  | "territory"
  | "inst_date"
  | "status"
  | "company"
  | "items"
> &
  Partial<
    Pick<
      InstallationNote,
      | "customer_address"
      | "contact_person"
      | "customer_name"
      | "address_display"
      | "contact_display"
      | "contact_mobile"
      | "contact_email"
      | "customer_group"
      | "inst_time"
      | "amended_from"
    >
  >;

/**
 * Installation Note Update Request
 * All fields optional for update
 */
export type InstallationNoteUpdateRequest = Partial<
  Omit<InstallationNote, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Supplier DocType
 * @doctype Supplier
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface Supplier {
  /** Series */
  naming_series?: "SUP-.YYYY.-";
  /** Supplier Name */
  supplier_name: string;
  /** Country */
  country?: string;
  /** Supplier Group */
  supplier_group?: string;
  /** Supplier Type */
  supplier_type: "Company" | "Individual" | "Partnership";
  /** Is Transporter */
  is_transporter?: 0 | 1;
  /** Image */
  image?: string;
  /** Billing Currency */
  default_currency?: string;
  /** Default Company Bank Account */
  default_bank_account?: string;
  /** Price List */
  default_price_list?: string;
  /** Is Internal Supplier */
  is_internal_supplier?: 0 | 1;
  /** Represents Company */
  represents_company?: string;
  /** Allowed To Transact With */
  companies?: unknown[];
  /** Supplier Details - Statutory info and other general information about your Supplier */
  supplier_details?: string;
  /** Website */
  website?: string;
  /** Print Language */
  language?: string;
  /** Tax ID */
  tax_id?: string;
  /** Tax Category */
  tax_category?: string;
  /** Tax Withholding Category */
  tax_withholding_category?: string;
  /** Address HTML */
  address_html?: string;
  /** Contact HTML */
  contact_html?: string;
  /** Supplier Primary Address - Reselect, if the chosen address is edited after save */
  supplier_primary_address?: string;
  /** Primary Address */
  primary_address?: string;
  /** Supplier Primary Contact - Reselect, if the chosen contact is edited after save */
  supplier_primary_contact?: string;
  /** Mobile No */
  mobile_no?: string;
  /** Email Id */
  email_id?: string;
  /** Default Payment Terms Template */
  payment_terms?: string;
  /** Accounts - Mention if non-standard payable account */
  accounts?: unknown[];
  /** Allow Purchase Invoice Creation Without Purchase Order */
  allow_purchase_invoice_creation_without_purchase_order?: 0 | 1;
  /** Allow Purchase Invoice Creation Without Purchase Receipt */
  allow_purchase_invoice_creation_without_purchase_receipt?: 0 | 1;
  /** Is Frozen */
  is_frozen?: 0 | 1;
  /** Disabled */
  disabled?: 0 | 1;
  /** Warn RFQs */
  warn_rfqs?: 0 | 1;
  /** Warn POs */
  warn_pos?: 0 | 1;
  /** Prevent RFQs */
  prevent_rfqs?: 0 | 1;
  /** Prevent POs */
  prevent_pos?: 0 | 1;
  /** Block Supplier */
  on_hold?: 0 | 1;
  /** Hold Type */
  hold_type?: "All" | "Invoices" | "Payments";
  /** Release Date - Leave blank if the Supplier is blocked indefinitely */
  release_date?: string;
  /** Supplier Portal Users */
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
 * Supplier Create Request
 * Fields required to create a new Supplier
 */
export type SupplierCreateRequest = Pick<
  Supplier,
  "supplier_name" | "supplier_type"
> &
  Partial<
    Pick<
      Supplier,
      | "naming_series"
      | "country"
      | "supplier_group"
      | "is_transporter"
      | "image"
      | "default_currency"
      | "default_bank_account"
      | "default_price_list"
      | "is_internal_supplier"
      | "represents_company"
    >
  >;

/**
 * Supplier Update Request
 * All fields optional for update
 */
export type SupplierUpdateRequest = Partial<
  Omit<Supplier, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Supplier Group DocType
 * @doctype Supplier Group
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface SupplierGroup {
  /** Supplier Group Name */
  supplier_group_name: string;
  /** Parent Supplier Group */
  parent_supplier_group?: string;
  /** Is Group - Only leaf nodes are allowed in transaction */
  is_group?: 0 | 1;
  /** Default Payment Terms Template */
  payment_terms?: string;
  /** Accounts - Mention if non-standard receivable account applicable */
  accounts?: unknown[];
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** Old Parent */
  old_parent?: string;
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
 * Supplier Group Create Request
 * Fields required to create a new Supplier Group
 */
export type SupplierGroupCreateRequest = Pick<
  SupplierGroup,
  "supplier_group_name"
> &
  Partial<
    Pick<
      SupplierGroup,
      | "parent_supplier_group"
      | "is_group"
      | "payment_terms"
      | "accounts"
      | "lft"
      | "rgt"
      | "old_parent"
    >
  >;

/**
 * Supplier Group Update Request
 * All fields optional for update
 */
export type SupplierGroupUpdateRequest = Partial<
  Omit<SupplierGroup, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Material Request DocType
 * @doctype Material Request
 * @generated 2026-01-14T18:05:48.286Z
 */
export interface MaterialRequest {
  /** Series */
  naming_series: "MAT-MR-.YYYY.-";
  /** Title */
  title?: string;
  /** Purpose */
  material_request_type:
    | "Purchase"
    | "Material Transfer"
    | "Material Issue"
    | "Manufacture"
    | "Customer Provided";
  /** Customer */
  customer?: string;
  /** Company */
  company: string;
  /** Transaction Date */
  transaction_date: string;
  /** Required By */
  schedule_date?: string;
  /** Price List */
  buying_price_list?: string;
  /** Amended From */
  amended_from?: string;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Set Source Warehouse */
  set_from_warehouse?: string;
  /** Set Target Warehouse */
  set_warehouse?: string;
  /** Items */
  items: unknown[];
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions Content */
  terms?: string;
  /** Status */
  status?:
    | "Draft"
    | "Submitted"
    | "Stopped"
    | "Cancelled"
    | "Pending"
    | "Partially Ordered"
    | "Partially Received"
    | "Ordered"
    | "Issued"
    | "Transferred"
    | "Received";
  /** % Ordered */
  per_ordered?: number;
  /** Transfer Status */
  transfer_status?: "Not Started" | "In Transit" | "Completed";
  /** % Received */
  per_received?: number;
  /** Letter Head */
  letter_head?: string;
  /** Print Heading */
  select_print_heading?: string;
  /** Job Card */
  job_card?: string;
  /** Work Order */
  work_order?: string;
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
 * Material Request Create Request
 * Fields required to create a new Material Request
 */
export type MaterialRequestCreateRequest = Pick<
  MaterialRequest,
  | "naming_series"
  | "material_request_type"
  | "company"
  | "transaction_date"
  | "items"
> &
  Partial<
    Pick<
      MaterialRequest,
      | "title"
      | "customer"
      | "schedule_date"
      | "buying_price_list"
      | "amended_from"
      | "scan_barcode"
      | "last_scanned_warehouse"
      | "set_from_warehouse"
      | "set_warehouse"
      | "tc_name"
    >
  >;

/**
 * Material Request Update Request
 * All fields optional for update
 */
export type MaterialRequestUpdateRequest = Partial<
  Omit<MaterialRequest, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Request for Quotation DocType
 * @doctype Request for Quotation
 * @generated 2026-01-14T18:05:48.287Z
 */
export interface RequestForQuotation {
  /** Series */
  naming_series: "PUR-RFQ-.YYYY.-";
  /** Company */
  company: string;
  /** Company Billing Address */
  billing_address?: string;
  /** Billing Address Details */
  billing_address_display?: string;
  /** Supplier - For individual supplier */
  vendor?: string;
  /** Date */
  transaction_date: string;
  /** Required Date */
  schedule_date?: string;
  /** Status */
  status: "Draft" | "Submitted" | "Cancelled";
  /** Has Unit Price Items */
  has_unit_price_items?: 0 | 1;
  /** Amended From */
  amended_from?: string;
  /** Suppliers */
  suppliers: unknown[];
  /** Items */
  items: unknown[];
  /** Email Template */
  email_template?: string;
  /** Preview Email */
  preview?: unknown;
  html_llwp?: string;
  /** Send Attached Files - If enabled, all files attached to this document will be attached to each email */
  send_attached_files?: 0 | 1;
  /** Send Document Print - If enabled, a print of this document will be attached to each email */
  send_document_print?: 0 | 1;
  /** Message for Supplier */
  message_for_supplier: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions */
  terms?: string;
  /** Print Heading */
  select_print_heading?: string;
  /** Letter Head */
  letter_head?: string;
  /** Opportunity */
  opportunity?: string;
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
 * Request for Quotation Create Request
 * Fields required to create a new Request for Quotation
 */
export type RequestForQuotationCreateRequest = Pick<
  RequestForQuotation,
  | "naming_series"
  | "company"
  | "transaction_date"
  | "status"
  | "suppliers"
  | "items"
  | "message_for_supplier"
> &
  Partial<
    Pick<
      RequestForQuotation,
      | "billing_address"
      | "billing_address_display"
      | "vendor"
      | "schedule_date"
      | "has_unit_price_items"
      | "amended_from"
      | "email_template"
      | "preview"
      | "html_llwp"
      | "send_attached_files"
    >
  >;

/**
 * Request for Quotation Update Request
 * All fields optional for update
 */
export type RequestForQuotationUpdateRequest = Partial<
  Omit<RequestForQuotation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Supplier Quotation DocType
 * @doctype Supplier Quotation
 * @generated 2026-01-14T18:05:48.287Z
 */
export interface SupplierQuotation {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "PUR-SQTN-.YYYY.-";
  /** Supplier */
  supplier: string;
  /** Supplier Name */
  supplier_name?: string;
  /** Company */
  company: string;
  /** Status */
  status: "Draft" | "Submitted" | "Stopped" | "Cancelled" | "Expired";
  /** Date */
  transaction_date: string;
  /** Valid Till */
  valid_till?: string;
  /** Quotation Number */
  quotation_number?: string;
  /** Has Unit Price Items */
  has_unit_price_items?: 0 | 1;
  /** Amended From */
  amended_from?: string;
  /** Cost Center */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Currency */
  currency: string;
  /** Exchange Rate */
  conversion_rate: number;
  /** Price List */
  buying_price_list?: string;
  /** Price List Currency */
  price_list_currency?: string;
  /** Price List Exchange Rate */
  plc_conversion_rate?: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Items */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total?: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Category */
  tax_category?: string;
  /** Purchase Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Purchase Taxes and Charges */
  taxes?: unknown[];
  /** Taxes and Charges Added (Company Currency) */
  base_taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted (Company Currency) */
  base_taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Taxes and Charges Added */
  taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted */
  taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Grand Total (Company Currency) */
  base_grand_total?: number;
  /** Rounding Adjustment (Company Currency */
  base_rounding_adjustment?: number;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** In Words (Company Currency) */
  base_in_words?: string;
  /** Grand Total */
  grand_total?: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Rounded Total */
  rounded_total?: number;
  /** In Words */
  in_words?: string;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Pricing Rule Detail */
  pricing_rules?: unknown[];
  /** Supplier Address */
  supplier_address?: string;
  /** Address */
  address_display?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Shipping Address */
  shipping_address?: string;
  /** Shipping Address Details */
  shipping_address_display?: string;
  /** Company Billing Address */
  billing_address?: string;
  /** Billing Address Details */
  billing_address_display?: string;
  /** Terms Template */
  tc_name?: string;
  /** Terms and Conditions */
  terms?: string;
  /** Letter Head */
  letter_head?: string;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Update Auto Repeat Reference */
  update_auto_repeat_reference?: unknown;
  /** Is Subcontracted */
  is_subcontracted?: 0 | 1;
  /** Opportunity */
  opportunity?: string;
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
 * Supplier Quotation Create Request
 * Fields required to create a new Supplier Quotation
 */
export type SupplierQuotationCreateRequest = Pick<
  SupplierQuotation,
  | "naming_series"
  | "supplier"
  | "company"
  | "status"
  | "transaction_date"
  | "currency"
  | "conversion_rate"
  | "items"
> &
  Partial<
    Pick<
      SupplierQuotation,
      | "title"
      | "supplier_name"
      | "valid_till"
      | "quotation_number"
      | "has_unit_price_items"
      | "amended_from"
      | "cost_center"
      | "project"
      | "buying_price_list"
      | "price_list_currency"
    >
  >;

/**
 * Supplier Quotation Update Request
 * All fields optional for update
 */
export type SupplierQuotationUpdateRequest = Partial<
  Omit<SupplierQuotation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Purchase Order DocType
 * @doctype Purchase Order
 * @generated 2026-01-14T18:05:48.287Z
 */
export interface PurchaseOrder {
  /** Title */
  title: string;
  /** Series */
  naming_series: "PUR-ORD-.YYYY.-";
  /** Supplier */
  supplier: string;
  /** Supplier Name */
  supplier_name?: string;
  /** Order Confirmation No */
  order_confirmation_no?: string;
  /** Order Confirmation Date */
  order_confirmation_date?: string;
  /** Get Items from Open Material Requests - Fetch items based on Default Supplier. */
  get_items_from_open_material_requests?: unknown;
  /** Date */
  transaction_date: string;
  /** Required By */
  schedule_date?: string;
  /** Company */
  company: string;
  /** Apply Tax Withholding Amount */
  apply_tds?: 0 | 1;
  /** Tax Withholding Category */
  tax_withholding_category?: string;
  /** Is Subcontracted */
  is_subcontracted?: 0 | 1;
  /** Has Unit Price Items */
  has_unit_price_items?: 0 | 1;
  /** Supplier Warehouse */
  supplier_warehouse?: string;
  /** Amended From */
  amended_from?: string;
  /** Cost Center */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Currency */
  currency: string;
  /** Exchange Rate */
  conversion_rate: number;
  /** Price List */
  buying_price_list?: string;
  /** Price List Currency */
  price_list_currency?: string;
  /** Price List Exchange Rate */
  plc_conversion_rate?: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Set From Warehouse */
  set_from_warehouse?: string;
  /** Set Target Warehouse */
  set_warehouse?: string;
  /** Items */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total?: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Withholding Net Total */
  tax_withholding_net_total?: number;
  /** Base Tax Withholding Net Total */
  base_tax_withholding_net_total?: number;
  /** Purchase Order Pricing Rule */
  pricing_rules?: unknown[];
  /** Set Reserve Warehouse */
  set_reserve_warehouse?: string;
  /** Supplied Items */
  supplied_items?: unknown[];
  /** Tax Category */
  tax_category?: string;
  /** Purchase Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Purchase Taxes and Charges */
  taxes?: unknown[];
  /** Taxes and Charges Added (Company Currency) */
  base_taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted (Company Currency) */
  base_taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Taxes and Charges Added */
  taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted */
  taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Grand Total (Company Currency) */
  base_grand_total?: number;
  /** Rounding Adjustment (Company Currency) */
  base_rounding_adjustment?: number;
  /** In Words (Company Currency) */
  base_in_words?: string;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** Grand Total */
  grand_total?: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Rounded Total */
  rounded_total?: number;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** In Words */
  in_words?: string;
  /** Advance Paid */
  advance_paid?: number;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Supplier Address */
  supplier_address?: string;
  /** Supplier Address Details */
  address_display?: string;
  /** Supplier Contact */
  contact_person?: string;
  /** Contact Name */
  contact_display?: string;
  /** Contact Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Dispatch Address */
  dispatch_address?: string;
  /** Dispatch Address Details */
  dispatch_address_display?: string;
  /** Shipping Address */
  shipping_address?: string;
  /** Shipping Address Details */
  shipping_address_display?: string;
  /** Company Billing Address */
  billing_address?: string;
  /** Billing Address Details */
  billing_address_display?: string;
  /** Customer */
  customer?: string;
  /** Customer Name */
  customer_name?: string;
  /** Customer Contact */
  customer_contact_person?: string;
  /** Customer Contact */
  customer_contact_display?: string;
  /** Customer Mobile No */
  customer_contact_mobile?: string;
  /** Customer Contact Email */
  customer_contact_email?: string;
  /** Payment Terms Template */
  payment_terms_template?: string;
  /** Payment Schedule */
  payment_schedule?: unknown[];
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions */
  terms?: string;
  /** Status */
  status:
    | "Draft"
    | "On Hold"
    | "Pending Approval"
    | "Approved"
    | "To Receive and Bill"
    | "To Bill"
    | "To Receive"
    | "Completed"
    | "Cancelled"
    | "Closed"
    | "Delivered";
  /** % Billed */
  per_billed?: number;
  /** % Received */
  per_received?: number;
  /** Letter Head */
  letter_head?: string;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** From Date */
  from_date?: string;
  /** To Date */
  to_date?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Update Auto Repeat Reference */
  update_auto_repeat_reference?: unknown;
  /** Is Internal Supplier */
  is_internal_supplier?: 0 | 1;
  /** Represents Company */
  represents_company?: string;
  /** Supplier Quotation */
  ref_sq?: string;
  /** Party Account Currency */
  party_account_currency?: string;
  /** Inter Company Order Reference */
  inter_company_order_reference?: string;
  /** Is Old Subcontracting Flow */
  is_old_subcontracting_flow?: 0 | 1;
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
 * Purchase Order Create Request
 * Fields required to create a new Purchase Order
 */
export type PurchaseOrderCreateRequest = Pick<
  PurchaseOrder,
  | "title"
  | "naming_series"
  | "supplier"
  | "transaction_date"
  | "company"
  | "currency"
  | "conversion_rate"
  | "items"
  | "status"
> &
  Partial<
    Pick<
      PurchaseOrder,
      | "supplier_name"
      | "order_confirmation_no"
      | "order_confirmation_date"
      | "get_items_from_open_material_requests"
      | "schedule_date"
      | "apply_tds"
      | "tax_withholding_category"
      | "is_subcontracted"
      | "has_unit_price_items"
      | "supplier_warehouse"
    >
  >;

/**
 * Purchase Order Update Request
 * All fields optional for update
 */
export type PurchaseOrderUpdateRequest = Partial<
  Omit<PurchaseOrder, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Purchase Receipt DocType
 * @doctype Purchase Receipt
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface PurchaseReceipt {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "MAT-PRE-.YYYY.-" | "MAT-PR-RET-.YYYY.-";
  /** Supplier */
  supplier: string;
  /** Supplier Name */
  supplier_name?: string;
  /** Supplier Delivery Note */
  supplier_delivery_note?: string;
  /** Subcontracting Receipt */
  subcontracting_receipt?: string;
  /** Date */
  posting_date: string;
  /** Posting Time */
  posting_time: string;
  /** Edit Posting Date and Time */
  set_posting_time?: 0 | 1;
  /** Company */
  company: string;
  /** Apply Putaway Rule */
  apply_putaway_rule?: 0 | 1;
  /** Is Return */
  is_return?: 0 | 1;
  /** Return Against Purchase Receipt */
  return_against?: string;
  /** Cost Center */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Currency */
  currency: string;
  /** Exchange Rate - Rate at which supplier's currency is converted to company's base currency */
  conversion_rate: number;
  /** Price List */
  buying_price_list?: string;
  /** Price List Currency */
  price_list_currency?: string;
  /** Price List Exchange Rate */
  plc_conversion_rate?: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Accepted Warehouse */
  set_warehouse?: string;
  /** Set From Warehouse */
  set_from_warehouse?: string;
  /** Rejected Warehouse */
  rejected_warehouse?: string;
  /** Is Subcontracted */
  is_subcontracted?: 0 | 1;
  /** Supplier Warehouse */
  supplier_warehouse?: string;
  /** Items */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Withholding Net Total */
  tax_withholding_net_total?: number;
  /** Base Tax Withholding Net Total */
  base_tax_withholding_net_total?: number;
  /** Tax Category */
  tax_category?: string;
  /** Purchase Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Purchase Taxes and Charges */
  taxes?: unknown[];
  /** Taxes and Charges Added (Company Currency) */
  base_taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted (Company Currency) */
  base_taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Taxes and Charges Added */
  taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted */
  taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Grand Total (Company Currency) */
  base_grand_total?: number;
  /** Rounding Adjustment (Company Currency) */
  base_rounding_adjustment?: number;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** In Words (Company Currency) */
  base_in_words?: string;
  /** Grand Total */
  grand_total?: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Rounded Total */
  rounded_total?: number;
  /** In Words */
  in_words?: string;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Pricing Rule Detail */
  pricing_rules?: unknown[];
  /** Get Current Stock */
  get_current_stock?: unknown;
  /** Consumed Items */
  supplied_items?: unknown[];
  /** Supplier Address */
  supplier_address?: string;
  /** Address */
  address_display?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Dispatch Address Template */
  dispatch_address?: string;
  /** Dispatch Address */
  dispatch_address_display?: string;
  /** Shipping Address Template */
  shipping_address?: string;
  /** Shipping Address */
  shipping_address_display?: string;
  /** Billing Address */
  billing_address?: string;
  /** Billing Address */
  billing_address_display?: string;
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions */
  terms?: string;
  /** Status */
  status:
    | "Draft"
    | "Partly Billed"
    | "To Bill"
    | "Completed"
    | "Return"
    | "Return Issued"
    | "Cancelled"
    | "Closed";
  /** % Amount Billed */
  per_billed?: number;
  /** % Returned */
  per_returned?: number;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Letter Head */
  letter_head?: string;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** Transporter Name */
  transporter_name?: string;
  /** Vehicle Number */
  lr_no?: string;
  /** Vehicle Date */
  lr_date?: string;
  /** Instructions */
  instructions?: string;
  /** Is Internal Supplier */
  is_internal_supplier?: 0 | 1;
  /** Represents Company */
  represents_company?: string;
  /** Inter Company Reference */
  inter_company_reference?: string;
  /** Remarks */
  remarks?: string;
  /** Range */
  range?: string;
  /** Amended From */
  amended_from?: string;
  /** Is Old Subcontracting Flow */
  is_old_subcontracting_flow?: 0 | 1;
  /** Other Details */
  other_details?: string;
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
 * Purchase Receipt Create Request
 * Fields required to create a new Purchase Receipt
 */
export type PurchaseReceiptCreateRequest = Pick<
  PurchaseReceipt,
  | "naming_series"
  | "supplier"
  | "posting_date"
  | "posting_time"
  | "company"
  | "currency"
  | "conversion_rate"
  | "items"
  | "base_net_total"
  | "status"
> &
  Partial<
    Pick<
      PurchaseReceipt,
      | "title"
      | "supplier_name"
      | "supplier_delivery_note"
      | "subcontracting_receipt"
      | "set_posting_time"
      | "apply_putaway_rule"
      | "is_return"
      | "return_against"
      | "cost_center"
      | "project"
    >
  >;

/**
 * Purchase Receipt Update Request
 * All fields optional for update
 */
export type PurchaseReceiptUpdateRequest = Partial<
  Omit<PurchaseReceipt, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Purchase Invoice DocType
 * @doctype Purchase Invoice
 * @generated 2026-01-26T11:14:16.769Z
 */
export interface PurchaseInvoice {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "ACC-PINV-.YYYY.-" | "ACC-PINV-RET-.YYYY.-";
  /** Supplier */
  supplier: string;
  /** Supplier Name */
  supplier_name?: string;
  /** Tax Id */
  tax_id?: string;
  /** Company */
  company?: string;
  /** Date */
  posting_date: string;
  /** Posting Time */
  posting_time?: string;
  /** Edit Posting Date and Time */
  set_posting_time?: 0 | 1;
  /** Due Date */
  due_date?: string;
  /** Is Paid */
  is_paid?: 0 | 1;
  /** Is Return (Debit Note) */
  is_return?: 0 | 1;
  /** Return Against Purchase Invoice */
  return_against?: string;
  /** Update Outstanding for Self - Debit Note will update it's own outstanding amount, even if 'Return Against' is specified. */
  update_outstanding_for_self?: 0 | 1;
  /** Update Billed Amount in Purchase Order */
  update_billed_amount_in_purchase_order?: 0 | 1;
  /** Update Billed Amount in Purchase Receipt */
  update_billed_amount_in_purchase_receipt?: 0 | 1;
  /** Apply Tax Withholding Amount */
  apply_tds?: 0 | 1;
  /** Tax Withholding Category */
  tax_withholding_category?: string;
  /** Amended From */
  amended_from?: string;
  /** Supplier Invoice No */
  bill_no?: string;
  /** Supplier Invoice Date */
  bill_date?: string;
  /** Cost Center */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Currency */
  currency?: string;
  /** Exchange Rate */
  conversion_rate?: number;
  /** Use Transaction Date Exchange Rate */
  use_transaction_date_exchange_rate?: 0 | 1;
  /** Price List */
  buying_price_list?: string;
  /** Price List Currency */
  price_list_currency?: string;
  /** Price List Exchange Rate */
  plc_conversion_rate?: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Update Stock */
  update_stock?: 0 | 1;
  /** Set Accepted Warehouse */
  set_warehouse?: string;
  /** Set From Warehouse */
  set_from_warehouse?: string;
  /** Is Subcontracted */
  is_subcontracted?: 0 | 1;
  /** Rejected Warehouse */
  rejected_warehouse?: string;
  /** Supplier Warehouse */
  supplier_warehouse?: string;
  /** Items */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total?: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Withholding Net Total */
  tax_withholding_net_total?: number;
  /** Base Tax Withholding Net Total */
  base_tax_withholding_net_total?: number;
  /** Tax Category */
  tax_category?: string;
  /** Purchase Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Purchase Taxes and Charges */
  taxes?: unknown[];
  /** Taxes and Charges Added (Company Currency) */
  base_taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted (Company Currency) */
  base_taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Taxes and Charges Added */
  taxes_and_charges_added?: number;
  /** Taxes and Charges Deducted */
  taxes_and_charges_deducted?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Grand Total (Company Currency) */
  base_grand_total?: number;
  /** Rounding Adjustment (Company Currency) */
  base_rounding_adjustment?: number;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** In Words (Company Currency) */
  base_in_words?: string;
  /** Grand Total */
  grand_total?: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Use Company Default Round Off Cost Center */
  use_company_roundoff_cost_center?: 0 | 1;
  /** Rounded Total */
  rounded_total?: number;
  /** In Words */
  in_words?: string;
  /** Total Advance */
  total_advance?: number;
  /** Outstanding Amount */
  outstanding_amount?: number;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Tax Withheld Vouchers */
  tax_withheld_vouchers?: unknown[];
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Pricing Rule Detail */
  pricing_rules?: unknown[];
  /** Supplied Items */
  supplied_items?: unknown[];
  /** Mode of Payment */
  mode_of_payment?: string;
  /** Paid Amount (Company Currency) */
  base_paid_amount?: number;
  /** Clearance Date */
  clearance_date?: string;
  /** Cash/Bank Account */
  cash_bank_account?: string;
  /** Paid Amount */
  paid_amount?: number;
  /** Set Advances and Allocate (FIFO) */
  allocate_advances_automatically?: 0 | 1;
  /** Only Include Allocated Payments - Advance payments allocated against orders will only be fetched */
  only_include_allocated_payments?: 0 | 1;
  /** Get Advances Paid */
  get_advances?: unknown;
  /** Advances */
  advances?: unknown[];
  /** Advance Tax */
  advance_tax?: unknown[];
  /** Write Off Amount */
  write_off_amount?: number;
  /** Write Off Amount (Company Currency) */
  base_write_off_amount?: number;
  /** Write Off Account */
  write_off_account?: string;
  /** Write Off Cost Center */
  write_off_cost_center?: string;
  /** Select Supplier Address */
  supplier_address?: string;
  /** Address */
  address_display?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Select Dispatch Address  */
  dispatch_address?: string;
  /** Dispatch Address */
  dispatch_address_display?: string;
  /** Select Shipping Address */
  shipping_address?: string;
  /** Shipping Address */
  shipping_address_display?: string;
  /** Select Billing Address */
  billing_address?: string;
  /** Billing Address */
  billing_address_display?: string;
  /** Payment Terms Template */
  payment_terms_template?: string;
  /** Ignore Default Payment Terms Template */
  ignore_default_payment_terms_template?: 0 | 1;
  /** Payment Schedule */
  payment_schedule?: unknown[];
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions */
  terms?: string;
  /** Status */
  status?:
    | "Draft"
    | "Return"
    | "Debit Note Issued"
    | "Submitted"
    | "Paid"
    | "Partly Paid"
    | "Unpaid"
    | "Overdue"
    | "Cancelled"
    | "Internal Transfer";
  /** Per Received */
  per_received?: number;
  /** Credit To */
  credit_to: string;
  /** Party Account Currency */
  party_account_currency?: string;
  /** Is Opening Entry */
  is_opening?: "No" | "Yes";
  /** Against Expense Account */
  against_expense_account?: string;
  /** Unrealized Profit / Loss Account - Unrealized Profit/Loss account for intra-company transfers */
  unrealized_profit_loss_account?: string;
  /** Subscription */
  subscription?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Update Auto Repeat Reference */
  update_auto_repeat_reference?: unknown;
  /** From Date - Start date of current invoice's period */
  from_date?: string;
  /** To Date - End date of current invoice's period */
  to_date?: string;
  /** Letter Head */
  letter_head?: string;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** Hold Invoice */
  on_hold?: 0 | 1;
  /** Release Date - Once set, this invoice will be on hold till the set date */
  release_date?: string;
  /** Reason For Putting On Hold */
  hold_comment?: string;
  /** Is Internal Supplier */
  is_internal_supplier?: 0 | 1;
  /** Represents Company - Company which internal supplier represents */
  represents_company?: string;
  /** Supplier Group */
  supplier_group?: string;
  /** Inter Company Invoice Reference */
  inter_company_invoice_reference?: string;
  /** Is Old Subcontracting Flow */
  is_old_subcontracting_flow?: 0 | 1;
  /** Remarks */
  remarks?: string;
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
 * Purchase Invoice Create Request
 * Fields required to create a new Purchase Invoice
 */
export type PurchaseInvoiceCreateRequest = Pick<
  PurchaseInvoice,
  "naming_series" | "supplier" | "posting_date" | "items" | "credit_to"
> &
  Partial<
    Pick<
      PurchaseInvoice,
      | "title"
      | "supplier_name"
      | "tax_id"
      | "company"
      | "posting_time"
      | "set_posting_time"
      | "due_date"
      | "is_paid"
      | "is_return"
      | "return_against"
    >
  >;

/**
 * Purchase Invoice Update Request
 * All fields optional for update
 */
export type PurchaseInvoiceUpdateRequest = Partial<
  Omit<PurchaseInvoice, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Item DocType
 * @doctype Item
 * @generated 2026-01-14T18:05:48.288Z
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

/**
 * Item Group DocType
 * @doctype Item Group
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface ItemGroup {
  /** Item Group Name */
  item_group_name: string;
  /** Parent Item Group */
  parent_item_group?: string;
  /** Is Group - Only leaf nodes are allowed in transaction */
  is_group?: 0 | 1;
  /** Image */
  image?: string;
  /** Item Group Defaults */
  item_group_defaults?: unknown[];
  /** Taxes */
  taxes?: unknown[];
  /** lft */
  lft?: number;
  /** old_parent */
  old_parent?: string;
  /** rgt */
  rgt?: number;
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
 * Item Group Create Request
 * Fields required to create a new Item Group
 */
export type ItemGroupCreateRequest = Pick<ItemGroup, "item_group_name"> &
  Partial<
    Pick<
      ItemGroup,
      | "parent_item_group"
      | "is_group"
      | "image"
      | "item_group_defaults"
      | "taxes"
      | "lft"
      | "old_parent"
      | "rgt"
    >
  >;

/**
 * Item Group Update Request
 * All fields optional for update
 */
export type ItemGroupUpdateRequest = Partial<
  Omit<ItemGroup, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Item Price DocType
 * @doctype Item Price
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface ItemPrice {
  /** Item Code */
  item_code: string;
  /** UOM */
  uom: string;
  /** Packing Unit - Quantity  that must be bought or sold per UOM */
  packing_unit?: number;
  /** Item Name */
  item_name?: string;
  /** Brand */
  brand?: string;
  /** Item Description */
  item_description?: string;
  /** Price List */
  price_list: string;
  /** Customer */
  customer?: string;
  /** Supplier */
  supplier?: string;
  /** Batch No */
  batch_no?: string;
  /** Buying */
  buying?: 0 | 1;
  /** Selling */
  selling?: 0 | 1;
  /** Currency */
  currency?: string;
  /** Rate */
  price_list_rate: number;
  /** Valid From */
  valid_from?: string;
  /** Lead Time in days */
  lead_time_days?: number;
  /** Valid Upto */
  valid_upto?: string;
  /** Note */
  note?: string;
  /** Reference */
  reference?: string;
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
 * Item Price Create Request
 * Fields required to create a new Item Price
 */
export type ItemPriceCreateRequest = Pick<
  ItemPrice,
  "item_code" | "uom" | "price_list" | "price_list_rate"
> &
  Partial<
    Pick<
      ItemPrice,
      | "packing_unit"
      | "item_name"
      | "brand"
      | "item_description"
      | "customer"
      | "supplier"
      | "batch_no"
      | "buying"
      | "selling"
      | "currency"
    >
  >;

/**
 * Item Price Update Request
 * All fields optional for update
 */
export type ItemPriceUpdateRequest = Partial<
  Omit<ItemPrice, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Product Bundle DocType
 * @doctype Product Bundle
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface ProductBundle {
  /** Parent Item */
  new_item_code: string;
  /** Description */
  description?: string;
  /** Disabled */
  disabled?: 0 | 1;
  /** Items */
  items: unknown[];
  about?: string;
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
 * Product Bundle Create Request
 * Fields required to create a new Product Bundle
 */
export type ProductBundleCreateRequest = Pick<
  ProductBundle,
  "new_item_code" | "items"
> &
  Partial<Pick<ProductBundle, "description" | "disabled" | "about">>;

/**
 * Product Bundle Update Request
 * All fields optional for update
 */
export type ProductBundleUpdateRequest = Partial<
  Omit<ProductBundle, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Warehouse DocType
 * @doctype Warehouse
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface Warehouse {
  /** Disabled */
  disabled?: 0 | 1;
  /** Warehouse Name */
  warehouse_name: string;
  /** Is Group Warehouse */
  is_group?: 0 | 1;
  /** Parent Warehouse */
  parent_warehouse?: string;
  /** Is Rejected Warehouse - If yes, then this warehouse will be used to store rejected materials */
  is_rejected_warehouse?: 0 | 1;
  /** Account - If blank, parent Warehouse Account or company default will be considered in transactions */
  account?: string;
  /** Company */
  company: string;
  /** Address HTML */
  address_html?: string;
  /** Contact HTML */
  contact_html?: string;
  /** Email Address */
  email_id?: string;
  /** Phone No */
  phone_no?: string;
  /** Mobile No */
  mobile_no?: string;
  /** Address Line 1 */
  address_line_1?: string;
  /** Address Line 2 */
  address_line_2?: string;
  /** City */
  city?: string;
  /** State/Province */
  state?: string;
  /** PIN */
  pin?: string;
  /** Warehouse Type */
  warehouse_type?: string;
  /** Default In-Transit Warehouse */
  default_in_transit_warehouse?: string;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** Old Parent */
  old_parent?: string;
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
 * Warehouse Create Request
 * Fields required to create a new Warehouse
 */
export type WarehouseCreateRequest = Pick<
  Warehouse,
  "warehouse_name" | "company"
> &
  Partial<
    Pick<
      Warehouse,
      | "disabled"
      | "is_group"
      | "parent_warehouse"
      | "is_rejected_warehouse"
      | "account"
      | "address_html"
      | "contact_html"
      | "email_id"
      | "phone_no"
      | "mobile_no"
    >
  >;

/**
 * Warehouse Update Request
 * All fields optional for update
 */
export type WarehouseUpdateRequest = Partial<
  Omit<Warehouse, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * UOM DocType
 * @doctype UOM
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface Uom {
  /** Enabled */
  enabled?: 0 | 1;
  /** UOM Name */
  uom_name: string;
  /** Must be Whole Number - Check this to disallow fractions. (for Nos) */
  must_be_whole_number?: 0 | 1;
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
 * UOM Create Request
 * Fields required to create a new UOM
 */
export type UomCreateRequest = Pick<Uom, "uom_name"> &
  Partial<Pick<Uom, "enabled" | "must_be_whole_number">>;

/**
 * UOM Update Request
 * All fields optional for update
 */
export type UomUpdateRequest = Partial<
  Omit<Uom, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Brand DocType
 * @doctype Brand
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface Brand {
  /** Brand Name */
  brand: string;
  /** Image */
  image?: string;
  /** Description */
  description?: string;
  /** Brand Defaults */
  brand_defaults?: unknown[];
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
 * Brand Create Request
 * Fields required to create a new Brand
 */
export type BrandCreateRequest = Pick<Brand, "brand"> &
  Partial<Pick<Brand, "image" | "description" | "brand_defaults">>;

/**
 * Brand Update Request
 * All fields optional for update
 */
export type BrandUpdateRequest = Partial<
  Omit<Brand, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Stock Entry DocType
 * @doctype Stock Entry
 * @generated 2026-01-14T18:05:48.288Z
 */
export interface StockEntry {
  /** Series */
  naming_series: "MAT-STE-.YYYY.-";
  /** Stock Entry Type */
  stock_entry_type: string;
  /** Stock Entry (Outward GIT) */
  outgoing_stock_entry?: string;
  /** Purpose */
  purpose?:
    | "Material Issue"
    | "Material Receipt"
    | "Material Transfer"
    | "Material Transfer for Manufacture"
    | "Material Consumption for Manufacture"
    | "Manufacture"
    | "Repack"
    | "Send to Subcontractor"
    | "Disassemble";
  /** Add to Transit */
  add_to_transit?: 0 | 1;
  /** Work Order */
  work_order?: string;
  /** Purchase Order */
  purchase_order?: string;
  /** Subcontracting Order */
  subcontracting_order?: string;
  /** Delivery Note No */
  delivery_note_no?: string;
  /** Sales Invoice No */
  sales_invoice_no?: string;
  /** Pick List */
  pick_list?: string;
  /** Purchase Receipt No */
  purchase_receipt_no?: string;
  /** Asset Repair */
  asset_repair?: string;
  /** Company */
  company: string;
  /** Posting Date */
  posting_date?: string;
  /** Posting Time */
  posting_time?: string;
  /** Edit Posting Date and Time */
  set_posting_time?: 0 | 1;
  /** Inspection Required */
  inspection_required?: 0 | 1;
  /** Apply Putaway Rule */
  apply_putaway_rule?: 0 | 1;
  /** From BOM */
  from_bom?: 0 | 1;
  /** Use Multi-Level BOM - Including items for sub assemblies */
  use_multi_level_bom?: 0 | 1;
  /** BOM No */
  bom_no?: string;
  /** Finished Good Quantity  - As per Stock UOM */
  fg_completed_qty?: number;
  /** Get Items */
  get_items?: unknown;
  /** % Process Loss */
  process_loss_percentage?: number;
  /** Process Loss Qty */
  process_loss_qty?: number;
  /** Default Source Warehouse - Sets 'Source Warehouse' in each row of the items table. */
  from_warehouse?: string;
  /** Source Warehouse Address Link */
  source_warehouse_address?: string;
  /** Source Warehouse Address */
  source_address_display?: string;
  /** Default Target Warehouse - Sets 'Target Warehouse' in each row of the items table. */
  to_warehouse?: string;
  /** Target Warehouse Address Link */
  target_warehouse_address?: string;
  /** Target Warehouse Address */
  target_address_display?: string;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Items */
  items: unknown[];
  /** Update Rate and Availability */
  get_stock_and_rate?: unknown;
  /** Total Outgoing Value (Consumption) */
  total_outgoing_value?: number;
  /** Total Incoming Value (Receipt) */
  total_incoming_value?: number;
  /** Total Value Difference (Incoming - Outgoing) */
  value_difference?: number;
  /** Additional Costs */
  additional_costs?: unknown[];
  /** Total Additional Costs */
  total_additional_costs?: number;
  /** Supplier */
  supplier?: string;
  /** Supplier Name */
  supplier_name?: string;
  /** Supplier Address */
  supplier_address?: string;
  /** Address */
  address_display?: string;
  /** Project */
  project?: string;
  /** Print Heading */
  select_print_heading?: string;
  /** Letter Head */
  letter_head?: string;
  /** Is Opening */
  is_opening?: "No" | "Yes";
  /** Remarks */
  remarks?: string;
  /** Per Transferred */
  per_transferred?: number;
  /** Total Amount */
  total_amount?: number;
  /** Job Card */
  job_card?: string;
  /** Amended From */
  amended_from?: string;
  /** Credit Note */
  credit_note?: string;
  /** Is Return */
  is_return?: 0 | 1;
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
 * Stock Entry Create Request
 * Fields required to create a new Stock Entry
 */
export type StockEntryCreateRequest = Pick<
  StockEntry,
  "naming_series" | "stock_entry_type" | "company" | "items"
> &
  Partial<
    Pick<
      StockEntry,
      | "outgoing_stock_entry"
      | "purpose"
      | "add_to_transit"
      | "work_order"
      | "purchase_order"
      | "subcontracting_order"
      | "delivery_note_no"
      | "sales_invoice_no"
      | "pick_list"
      | "purchase_receipt_no"
    >
  >;

/**
 * Stock Entry Update Request
 * All fields optional for update
 */
export type StockEntryUpdateRequest = Partial<
  Omit<StockEntry, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Delivery Note DocType
 * @doctype Delivery Note
 * @generated 2026-01-14T18:05:48.289Z
 */
export interface DeliveryNote {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "MAT-DN-.YYYY.-" | "MAT-DN-RET-.YYYY.-";
  /** Customer */
  customer: string;
  /** Tax Id */
  tax_id?: string;
  /** Customer Name */
  customer_name?: string;
  /** Date */
  posting_date: string;
  /** Posting Time */
  posting_time: string;
  /** Edit Posting Date and Time */
  set_posting_time?: 0 | 1;
  /** Company */
  company: string;
  /** Amended From */
  amended_from?: string;
  /** Is Return */
  is_return?: 0 | 1;
  /** Issue Credit Note */
  issue_credit_note?: 0 | 1;
  /** Return Against Delivery Note */
  return_against?: string;
  /** Cost Center */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Currency */
  currency: string;
  /** Exchange Rate - Rate at which customer's currency is converted to company's base currency */
  conversion_rate: number;
  /** Price List */
  selling_price_list: string;
  /** Price List Currency */
  price_list_currency: string;
  /** Price List Exchange Rate - Rate at which Price list currency is converted to company's base currency */
  plc_conversion_rate: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Set Source Warehouse */
  set_warehouse?: string;
  /** Set Target Warehouse */
  set_target_warehouse?: string;
  /** Delivery Note Item */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total?: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Category */
  tax_category?: string;
  /** Sales Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Sales Taxes and Charges */
  taxes?: unknown[];
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Grand Total (Company Currency) */
  base_grand_total?: number;
  /** Rounding Adjustment (Company Currency) */
  base_rounding_adjustment?: number;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** In Words (Company Currency) - In Words will be visible once you save the Delivery Note. */
  base_in_words?: string;
  /** Grand Total */
  grand_total?: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Rounded Total */
  rounded_total?: number;
  /** In Words - In Words (Export) will be visible once you save the Delivery Note. */
  in_words?: string;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Packed Items */
  packed_items?: unknown[];
  /** Product Bundle Help */
  product_bundle_help?: string;
  /** Pricing Rule Detail */
  pricing_rules?: unknown[];
  /** Billing Address Name */
  customer_address?: string;
  /** Billing Address */
  address_display?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Shipping Address */
  shipping_address_name?: string;
  /** Shipping Address */
  shipping_address?: string;
  /** Dispatch Address Name */
  dispatch_address_name?: string;
  /** Dispatch Address */
  dispatch_address?: string;
  /** Company Address Name */
  company_address?: string;
  /** Company Address */
  company_address_display?: string;
  /** Company Contact Person */
  company_contact_person?: string;
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions Details */
  terms?: string;
  /** % Amount Billed */
  per_billed?: number;
  /** Status */
  status:
    | "Draft"
    | "To Bill"
    | "Completed"
    | "Return"
    | "Return Issued"
    | "Cancelled"
    | "Closed";
  /** % Installed */
  per_installed?: number;
  /** Installation Status */
  installation_status?: string;
  /** % Returned */
  per_returned?: number;
  /** Transporter */
  transporter?: string;
  /** Driver */
  driver?: string;
  /** Transport Receipt No */
  lr_no?: string;
  /** Vehicle No */
  vehicle_no?: string;
  /** Transporter Name */
  transporter_name?: string;
  /** Driver Name */
  driver_name?: string;
  /** Transport Receipt Date */
  lr_date?: string;
  /** Customer's Purchase Order No */
  po_no?: string;
  /** Customer's Purchase Order Date */
  po_date?: string;
  /** Sales Partner */
  sales_partner?: string;
  /** Amount Eligible for Commission */
  amount_eligible_for_commission?: number;
  /** Commission Rate (%) */
  commission_rate?: number;
  /** Total Commission */
  total_commission?: number;
  /** Sales Team */
  sales_team?: unknown[];
  /** Auto Repeat */
  auto_repeat?: string;
  /** Letter Head */
  letter_head?: string;
  /** Print Without Amount */
  print_without_amount?: 0 | 1;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** Is Internal Customer */
  is_internal_customer?: 0 | 1;
  /** Represents Company - Company which internal customer represents. */
  represents_company?: string;
  /** Inter Company Reference */
  inter_company_reference?: string;
  /** Customer Group */
  customer_group?: string;
  /** Territory */
  territory?: string;
  /** Source */
  source?: string;
  /** Campaign */
  campaign?: string;
  /** Excise Page Number */
  excise_page?: string;
  /** Instructions */
  instructions?: string;
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
 * Delivery Note Create Request
 * Fields required to create a new Delivery Note
 */
export type DeliveryNoteCreateRequest = Pick<
  DeliveryNote,
  | "naming_series"
  | "customer"
  | "posting_date"
  | "posting_time"
  | "company"
  | "currency"
  | "conversion_rate"
  | "selling_price_list"
  | "price_list_currency"
  | "plc_conversion_rate"
  | "items"
  | "status"
> &
  Partial<
    Pick<
      DeliveryNote,
      | "title"
      | "tax_id"
      | "customer_name"
      | "set_posting_time"
      | "amended_from"
      | "is_return"
      | "issue_credit_note"
      | "return_against"
      | "cost_center"
      | "project"
    >
  >;

/**
 * Delivery Note Update Request
 * All fields optional for update
 */
export type DeliveryNoteUpdateRequest = Partial<
  Omit<DeliveryNote, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Stock Reconciliation DocType
 * @doctype Stock Reconciliation
 * @generated 2026-01-14T18:05:48.289Z
 */
export interface StockReconciliation {
  /** Series */
  naming_series: "MAT-RECO-.YYYY.-";
  /** Company */
  company: string;
  /** Purpose */
  purpose: "Opening Stock" | "Stock Reconciliation";
  /** Posting Date */
  posting_date: string;
  /** Posting Time */
  posting_time: string;
  /** Edit Posting Date and Time */
  set_posting_time?: 0 | 1;
  /** Default Warehouse */
  set_warehouse?: string;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Scan Mode - Disables auto-fetching of existing quantity */
  scan_mode?: 0 | 1;
  /** Items */
  items: unknown[];
  /** Difference Account */
  expense_account?: string;
  /** Difference Amount */
  difference_amount?: number;
  /** Amended From */
  amended_from?: string;
  /** Cost Center */
  cost_center?: string;
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
 * Stock Reconciliation Create Request
 * Fields required to create a new Stock Reconciliation
 */
export type StockReconciliationCreateRequest = Pick<
  StockReconciliation,
  | "naming_series"
  | "company"
  | "purpose"
  | "posting_date"
  | "posting_time"
  | "items"
> &
  Partial<
    Pick<
      StockReconciliation,
      | "set_posting_time"
      | "set_warehouse"
      | "scan_barcode"
      | "last_scanned_warehouse"
      | "scan_mode"
      | "expense_account"
      | "difference_amount"
      | "amended_from"
      | "cost_center"
    >
  >;

/**
 * Stock Reconciliation Update Request
 * All fields optional for update
 */
export type StockReconciliationUpdateRequest = Partial<
  Omit<StockReconciliation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Batch DocType
 * @doctype Batch
 * @generated 2026-01-14T18:05:48.289Z
 */
export interface Batch {
  /** Disabled */
  disabled?: 0 | 1;
  /** Use Batch-wise Valuation */
  use_batchwise_valuation?: 0 | 1;
  /** Batch ID */
  batch_id: string;
  /** Item */
  item: string;
  /** Item Name */
  item_name?: string;
  /** image */
  image?: string;
  /** Parent Batch */
  parent_batch?: string;
  /** Manufacturing Date */
  manufacturing_date?: string;
  /** Batch Quantity */
  batch_qty?: number;
  /** Batch UOM */
  stock_uom?: string;
  /** Expiry Date */
  expiry_date?: string;
  /** Supplier */
  supplier?: string;
  /** Source Document Type */
  reference_doctype?: string;
  /** Source Document Name */
  reference_name?: string;
  /** Batch Description */
  description?: string;
  /** Qty To Produce */
  qty_to_produce?: number;
  /** Produced Qty */
  produced_qty?: number;
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
 * Batch Create Request
 * Fields required to create a new Batch
 */
export type BatchCreateRequest = Pick<Batch, "batch_id" | "item"> &
  Partial<
    Pick<
      Batch,
      | "disabled"
      | "use_batchwise_valuation"
      | "item_name"
      | "image"
      | "parent_batch"
      | "manufacturing_date"
      | "batch_qty"
      | "stock_uom"
      | "expiry_date"
      | "supplier"
    >
  >;

/**
 * Batch Update Request
 * All fields optional for update
 */
export type BatchUpdateRequest = Partial<
  Omit<Batch, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Serial No DocType
 * @doctype Serial No
 * @generated 2026-01-14T18:05:48.289Z
 */
export interface SerialNo {
  /** Serial No */
  serial_no: string;
  /** Item Code */
  item_code: string;
  /** Batch No */
  batch_no?: string;
  /** Warehouse */
  warehouse?: string;
  /** Incoming Rate */
  purchase_rate?: number;
  /** Customer */
  customer?: string;
  /** Status */
  status?: "Active" | "Inactive" | "Consumed" | "Delivered" | "Expired";
  /** Item Name */
  item_name?: string;
  /** Description */
  description?: string;
  /** Item Group */
  item_group?: string;
  /** Brand */
  brand?: string;
  /** Asset */
  asset?: string;
  /** Asset Status */
  asset_status?: "Issue" | "Receipt" | "Transfer";
  /** Location */
  location?: string;
  /** Employee */
  employee?: string;
  /** Warranty Expiry Date */
  warranty_expiry_date?: string;
  /** AMC Expiry Date */
  amc_expiry_date?: string;
  /** Maintenance Status */
  maintenance_status?:
    | "Under Warranty"
    | "Out of Warranty"
    | "Under AMC"
    | "Out of AMC";
  /** Warranty Period (Days) */
  warranty_period?: number;
  /** Company */
  company: string;
  /** Work Order */
  work_order?: string;
  /** Creation Document No */
  purchase_document_no?: string;
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
 * Serial No Create Request
 * Fields required to create a new Serial No
 */
export type SerialNoCreateRequest = Pick<
  SerialNo,
  "serial_no" | "item_code" | "company"
> &
  Partial<
    Pick<
      SerialNo,
      | "batch_no"
      | "warehouse"
      | "purchase_rate"
      | "customer"
      | "status"
      | "item_name"
      | "description"
      | "item_group"
      | "brand"
      | "asset"
    >
  >;

/**
 * Serial No Update Request
 * All fields optional for update
 */
export type SerialNoUpdateRequest = Partial<
  Omit<SerialNo, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Quality Inspection DocType
 * @doctype Quality Inspection
 * @generated 2026-01-14T18:05:48.289Z
 */
export interface QualityInspection {
  /** Series */
  naming_series: "MAT-QA-.YYYY.-";
  /** Company */
  company?: string;
  /** Report Date */
  report_date: string;
  /** Status */
  status: "Accepted" | "Rejected";
  /** Child Row Reference */
  child_row_reference?: string;
  /** Inspection Type */
  inspection_type: "Incoming" | "Outgoing" | "In Process";
  /** Reference Type */
  reference_type:
    | "Purchase Receipt"
    | "Purchase Invoice"
    | "Subcontracting Receipt"
    | "Delivery Note"
    | "Sales Invoice"
    | "Stock Entry"
    | "Job Card";
  /** Reference Name */
  reference_name: string;
  /** Item Code */
  item_code: string;
  /** Item Serial No */
  item_serial_no?: string;
  /** Batch No */
  batch_no?: string;
  /** Sample Size */
  sample_size: number;
  /** Item Name */
  item_name?: string;
  /** Description */
  description?: string;
  /** BOM No */
  bom_no?: string;
  /** Quality Inspection Template */
  quality_inspection_template?: string;
  /** Manual Inspection */
  manual_inspection?: 0 | 1;
  /** Readings */
  readings?: unknown[];
  /** Inspected By */
  inspected_by: string;
  /** Verified By */
  verified_by?: string;
  /** Remarks */
  remarks?: string;
  /** Amended From */
  amended_from?: string;
  /** Letter Head */
  letter_head?: string;
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
 * Quality Inspection Create Request
 * Fields required to create a new Quality Inspection
 */
export type QualityInspectionCreateRequest = Pick<
  QualityInspection,
  | "naming_series"
  | "report_date"
  | "status"
  | "inspection_type"
  | "reference_type"
  | "reference_name"
  | "item_code"
  | "sample_size"
  | "inspected_by"
> &
  Partial<
    Pick<
      QualityInspection,
      | "company"
      | "child_row_reference"
      | "item_serial_no"
      | "batch_no"
      | "item_name"
      | "description"
      | "bom_no"
      | "quality_inspection_template"
      | "manual_inspection"
      | "readings"
    >
  >;

/**
 * Quality Inspection Update Request
 * All fields optional for update
 */
export type QualityInspectionUpdateRequest = Partial<
  Omit<QualityInspection, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Landed Cost Voucher DocType
 * @doctype Landed Cost Voucher
 * @generated 2026-01-14T18:05:48.289Z
 */
export interface LandedCostVoucher {
  /** Series */
  naming_series: "MAT-LCV-.YYYY.-";
  /** Company */
  company: string;
  /** Posting Date */
  posting_date: string;
  /** Purchase Receipts */
  purchase_receipts: unknown[];
  /** Get Items From Purchase Receipts */
  get_items_from_purchase_receipts?: unknown;
  /** Purchase Receipt Items */
  items: unknown[];
  /** Taxes and Charges */
  taxes: unknown[];
  /** Total Taxes and Charges (Company Currency) */
  total_taxes_and_charges: number;
  /** Distribute Charges Based On */
  distribute_charges_based_on: "Qty" | "Amount" | "Distribute Manually";
  /** Amended From */
  amended_from?: string;
  /** Landed Cost Help */
  landed_cost_help?: string;
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
 * Landed Cost Voucher Create Request
 * Fields required to create a new Landed Cost Voucher
 */
export type LandedCostVoucherCreateRequest = Pick<
  LandedCostVoucher,
  | "naming_series"
  | "company"
  | "posting_date"
  | "purchase_receipts"
  | "items"
  | "taxes"
  | "total_taxes_and_charges"
  | "distribute_charges_based_on"
> &
  Partial<
    Pick<
      LandedCostVoucher,
      "get_items_from_purchase_receipts" | "amended_from" | "landed_cost_help"
    >
  >;

/**
 * Landed Cost Voucher Update Request
 * All fields optional for update
 */
export type LandedCostVoucherUpdateRequest = Partial<
  Omit<LandedCostVoucher, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Stock Ledger Entry DocType
 * @doctype Stock Ledger Entry
 * @generated 2026-01-14T18:05:48.289Z
 */
export interface StockLedgerEntry {
  /** Item Code */
  item_code?: string;
  /** Warehouse */
  warehouse?: string;
  /** Posting Date */
  posting_date?: string;
  /** Posting Time */
  posting_time?: string;
  /** Posting Datetime */
  posting_datetime?: string;
  /** Is Adjustment Entry */
  is_adjustment_entry?: 0 | 1;
  /** Auto Created Serial and Batch Bundle */
  auto_created_serial_and_batch_bundle?: 0 | 1;
  /** Voucher Type */
  voucher_type?: string;
  /** Voucher No */
  voucher_no?: string;
  /** Voucher Detail No */
  voucher_detail_no?: string;
  /** Serial and Batch Bundle */
  serial_and_batch_bundle?: string;
  /** Dependant SLE Voucher Detail No */
  dependant_sle_voucher_detail_no?: string;
  /** Recalculate Incoming/Outgoing Rate */
  recalculate_rate?: 0 | 1;
  /** Qty Change */
  actual_qty?: number;
  /** Qty After Transaction */
  qty_after_transaction?: number;
  /** Incoming Rate */
  incoming_rate?: number;
  /** Outgoing Rate */
  outgoing_rate?: number;
  /** Valuation Rate */
  valuation_rate?: number;
  /** Balance Stock Value */
  stock_value?: number;
  /** Change in Stock Value */
  stock_value_difference?: number;
  /** FIFO Stock Queue (qty, rate) */
  stock_queue?: string;
  /** Company */
  company?: string;
  /** Stock UOM */
  stock_uom?: string;
  /** Project */
  project?: string;
  /** Fiscal Year */
  fiscal_year?: string;
  /** Has Batch No */
  has_batch_no?: 0 | 1;
  /** Has Serial No */
  has_serial_no?: 0 | 1;
  /** Is Cancelled */
  is_cancelled?: 0 | 1;
  /** To Rename */
  to_rename?: 0 | 1;
  /** Serial No */
  serial_no?: string;
  /** Batch No */
  batch_no?: string;
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
 * Stock Ledger Entry Update Request
 * All fields optional for update
 */
export type StockLedgerEntryUpdateRequest = Partial<
  Omit<StockLedgerEntry, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Account DocType
 * @doctype Account
 * @generated 2026-01-26T11:14:16.770Z
 */
export interface Account {
  /** Disable */
  disabled?: 0 | 1;
  /** Account Name */
  account_name: string;
  /** Account Number */
  account_number?: string;
  /** Is Group */
  is_group?: 0 | 1;
  /** Company */
  company: string;
  /** Root Type */
  root_type?: "Asset" | "Liability" | "Income" | "Expense" | "Equity";
  /** Report Type */
  report_type?: "Balance Sheet" | "Profit and Loss";
  /** Currency */
  account_currency?: string;
  /** Parent Account */
  parent_account: string;
  /** Account Type - Setting Account Type helps in selecting this Account in transactions. */
  account_type?: string;
  /** Tax Rate - Rate at which this tax is applied */
  tax_rate?: number;
  /** Frozen - If the account is frozen, entries are allowed to restricted users. */
  freeze_account?: "No" | "Yes";
  /** Balance must be */
  balance_must_be?: "Debit" | "Credit";
  /** Lft */
  lft?: number;
  /** Rgt */
  rgt?: number;
  /** Old Parent */
  old_parent?: string;
  /** Include in gross */
  include_in_gross?: 0 | 1;
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
 * Account Create Request
 * Fields required to create a new Account
 */
export type AccountCreateRequest = Pick<
  Account,
  "account_name" | "company" | "parent_account"
> &
  Partial<
    Pick<
      Account,
      | "disabled"
      | "account_number"
      | "is_group"
      | "root_type"
      | "report_type"
      | "account_currency"
      | "account_type"
      | "tax_rate"
      | "freeze_account"
      | "balance_must_be"
    >
  >;

/**
 * Account Update Request
 * All fields optional for update
 */
export type AccountUpdateRequest = Partial<
  Omit<Account, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Cost Center DocType
 * @doctype Cost Center
 * @generated 2026-01-26T11:14:16.770Z
 */
export interface CostCenter {
  /** Cost Center Name */
  cost_center_name: string;
  /** Cost Center Number */
  cost_center_number?: string;
  /** Parent Cost Center */
  parent_cost_center: string;
  /** Company */
  company: string;
  /** Is Group */
  is_group?: 0 | 1;
  /** Disabled */
  disabled?: 0 | 1;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** old_parent */
  old_parent?: string;
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
 * Cost Center Create Request
 * Fields required to create a new Cost Center
 */
export type CostCenterCreateRequest = Pick<
  CostCenter,
  "cost_center_name" | "parent_cost_center" | "company"
> &
  Partial<
    Pick<
      CostCenter,
      | "cost_center_number"
      | "is_group"
      | "disabled"
      | "lft"
      | "rgt"
      | "old_parent"
    >
  >;

/**
 * Cost Center Update Request
 * All fields optional for update
 */
export type CostCenterUpdateRequest = Partial<
  Omit<CostCenter, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Journal Entry DocType
 * @doctype Journal Entry
 * @generated 2026-01-26T11:14:16.769Z
 */
export interface JournalEntry {
  /** Is System Generated */
  is_system_generated?: 0 | 1;
  /** Title */
  title?: string;
  /** Entry Type */
  voucher_type:
    | "Journal Entry"
    | "Inter Company Journal Entry"
    | "Bank Entry"
    | "Cash Entry"
    | "Credit Card Entry"
    | "Debit Note"
    | "Credit Note"
    | "Contra Entry"
    | "Excise Entry"
    | "Write Off Entry"
    | "Opening Entry"
    | "Depreciation Entry"
    | "Exchange Rate Revaluation"
    | "Exchange Gain Or Loss"
    | "Deferred Revenue"
    | "Deferred Expense";
  /** Series */
  naming_series: "ACC-JV-.YYYY.-";
  /** Finance Book */
  finance_book?: string;
  /** Process Deferred Accounting */
  process_deferred_accounting?: string;
  /** Reversal Of */
  reversal_of?: string;
  /** Tax Withholding Category */
  tax_withholding_category?: string;
  /** From Template */
  from_template?: string;
  /** Company */
  company: string;
  /** Posting Date */
  posting_date: string;
  /** Apply Tax Withholding Amount  */
  apply_tds?: 0 | 1;
  /** Accounting Entries */
  accounts: unknown[];
  /** Reference Number */
  cheque_no?: string;
  /** Reference Date */
  cheque_date?: string;
  /** User Remark */
  user_remark?: string;
  /** Total Debit */
  total_debit?: number;
  /** Total Credit */
  total_credit?: number;
  /** Difference (Dr - Cr) */
  difference?: number;
  /** Make Difference Entry */
  get_balance?: unknown;
  /** Multi Currency */
  multi_currency?: 0 | 1;
  /** Total Amount Currency */
  total_amount_currency?: string;
  /** Total Amount */
  total_amount?: number;
  /** Total Amount in Words */
  total_amount_in_words?: string;
  /** Clearance Date */
  clearance_date?: string;
  /** Remark */
  remark?: string;
  /** Paid Loan */
  paid_loan?: string;
  /** Inter Company Journal Entry Reference */
  inter_company_journal_entry_reference?: string;
  /** Bill No */
  bill_no?: string;
  /** Bill Date */
  bill_date?: string;
  /** Due Date */
  due_date?: string;
  /** Write Off Based On */
  write_off_based_on?: "Accounts Receivable" | "Accounts Payable";
  /** Get Outstanding Invoices */
  get_outstanding_invoices?: unknown;
  /** Write Off Amount */
  write_off_amount?: number;
  /** Pay To / Recd From */
  pay_to_recd_from?: string;
  /** Letter Head */
  letter_head?: string;
  /** Print Heading */
  select_print_heading?: string;
  /** Mode of Payment */
  mode_of_payment?: string;
  /** Payment Order */
  payment_order?: string;
  /** Party Not Required */
  party_not_required?: 0 | 1;
  /** Is Opening */
  is_opening?: "No" | "Yes";
  /** Stock Entry */
  stock_entry?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Amended From */
  amended_from?: string;
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
 * Journal Entry Create Request
 * Fields required to create a new Journal Entry
 */
export type JournalEntryCreateRequest = Pick<
  JournalEntry,
  "voucher_type" | "naming_series" | "company" | "posting_date" | "accounts"
> &
  Partial<
    Pick<
      JournalEntry,
      | "is_system_generated"
      | "title"
      | "finance_book"
      | "process_deferred_accounting"
      | "reversal_of"
      | "tax_withholding_category"
      | "from_template"
      | "apply_tds"
      | "cheque_no"
      | "cheque_date"
    >
  >;

/**
 * Journal Entry Update Request
 * All fields optional for update
 */
export type JournalEntryUpdateRequest = Partial<
  Omit<JournalEntry, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Payment Entry DocType
 * @doctype Payment Entry
 * @generated 2026-01-26T11:14:16.769Z
 */
export interface PaymentEntry {
  /** Series */
  naming_series: "ACC-PAY-.YYYY.-";
  /** Payment Type */
  payment_type: "Receive" | "Pay" | "Internal Transfer";
  /** Payment Order Status */
  payment_order_status?: "Initiated" | "Payment Ordered";
  /** Posting Date */
  posting_date: string;
  /** Company */
  company: string;
  /** Mode of Payment */
  mode_of_payment?: string;
  /** Party Type */
  party_type?: string;
  /** Party */
  party?: string;
  /** Party Name */
  party_name?: string;
  /** Book Advance Payments in Separate Party Account */
  book_advance_payments_in_separate_party_account?: 0 | 1;
  /** Reconcile on Advance Payment Date */
  reconcile_on_advance_payment_date?: 0 | 1;
  /** Company Bank Account */
  bank_account?: string;
  /** Party Bank Account */
  party_bank_account?: string;
  /** Contact */
  contact_person?: string;
  /** Email */
  contact_email?: string;
  /** Party Balance */
  party_balance?: number;
  /** Account Paid From */
  paid_from: string;
  /** Paid From Account Type */
  paid_from_account_type?: string;
  /** Account Currency (From) */
  paid_from_account_currency: string;
  /** Account Balance (From) */
  paid_from_account_balance?: number;
  /** Account Paid To */
  paid_to: string;
  /** Paid To Account Type */
  paid_to_account_type?: string;
  /** Account Currency (To) */
  paid_to_account_currency: string;
  /** Account Balance (To) */
  paid_to_account_balance?: number;
  /** Paid Amount */
  paid_amount: number;
  /** Paid Amount After Tax */
  paid_amount_after_tax?: number;
  /** Source Exchange Rate */
  source_exchange_rate: number;
  /** Paid Amount (Company Currency) */
  base_paid_amount: number;
  /** Paid Amount After Tax (Company Currency) */
  base_paid_amount_after_tax?: number;
  /** Received Amount */
  received_amount: number;
  /** Received Amount After Tax */
  received_amount_after_tax?: number;
  /** Target Exchange Rate */
  target_exchange_rate: number;
  /** Received Amount (Company Currency) */
  base_received_amount: number;
  /** Received Amount After Tax (Company Currency) */
  base_received_amount_after_tax?: number;
  /** Get Outstanding Invoices */
  get_outstanding_invoices?: unknown;
  /** Get Outstanding Orders */
  get_outstanding_orders?: unknown;
  /** Payment References */
  references?: unknown[];
  /** Total Allocated Amount */
  total_allocated_amount?: number;
  /** Total Allocated Amount (Company Currency) */
  base_total_allocated_amount?: number;
  /** Unallocated Amount */
  unallocated_amount?: number;
  /** Difference Amount (Company Currency) */
  difference_amount?: number;
  /** Write Off Difference Amount */
  write_off_difference_amount?: unknown;
  /** Purchase Taxes and Charges Template */
  purchase_taxes_and_charges_template?: string;
  /** Sales Taxes and Charges Template */
  sales_taxes_and_charges_template?: string;
  /** Apply Tax Withholding Amount */
  apply_tax_withholding_amount?: 0 | 1;
  /** Tax Withholding Category */
  tax_withholding_category?: string;
  /** Advance Taxes and Charges */
  taxes?: unknown[];
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Payment Deductions or Loss */
  deductions?: unknown[];
  /** Cheque/Reference No */
  reference_no?: string;
  /** Cheque/Reference Date */
  reference_date?: string;
  /** Clearance Date */
  clearance_date?: string;
  /** Project */
  project?: string;
  /** Cost Center */
  cost_center?: string;
  /** Status */
  status?: "Draft" | "Submitted" | "Cancelled";
  /** Custom Remarks */
  custom_remarks?: 0 | 1;
  /** Remarks */
  remarks?: string;
  /** In Words (Company Currency) */
  base_in_words?: string;
  /** Is Opening */
  is_opening?: "No" | "Yes";
  /** Letter Head */
  letter_head?: string;
  /** Print Heading */
  print_heading?: string;
  /** Bank */
  bank?: string;
  /** Bank Account No */
  bank_account_no?: string;
  /** Payment Order */
  payment_order?: string;
  /** In Words */
  in_words?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** Amended From */
  amended_from?: string;
  /** Title */
  title?: string;
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
 * Payment Entry Create Request
 * Fields required to create a new Payment Entry
 */
export type PaymentEntryCreateRequest = Pick<
  PaymentEntry,
  | "naming_series"
  | "payment_type"
  | "posting_date"
  | "company"
  | "paid_from"
  | "paid_from_account_currency"
  | "paid_to"
  | "paid_to_account_currency"
  | "paid_amount"
  | "source_exchange_rate"
  | "base_paid_amount"
  | "received_amount"
  | "target_exchange_rate"
  | "base_received_amount"
> &
  Partial<
    Pick<
      PaymentEntry,
      | "payment_order_status"
      | "mode_of_payment"
      | "party_type"
      | "party"
      | "party_name"
      | "book_advance_payments_in_separate_party_account"
      | "reconcile_on_advance_payment_date"
      | "bank_account"
      | "party_bank_account"
      | "contact_person"
    >
  >;

/**
 * Payment Entry Update Request
 * All fields optional for update
 */
export type PaymentEntryUpdateRequest = Partial<
  Omit<PaymentEntry, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Sales Invoice DocType
 * @doctype Sales Invoice
 * @generated 2026-01-26T11:14:16.760Z
 */
export interface SalesInvoice {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "ACC-SINV-.YYYY.-" | "ACC-SINV-RET-.YYYY.-";
  /** Customer */
  customer?: string;
  /** Customer Name */
  customer_name?: string;
  /** Tax Id */
  tax_id?: string;
  /** Company */
  company: string;
  /** Company Tax ID */
  company_tax_id?: string;
  /** Date */
  posting_date: string;
  /** Posting Time */
  posting_time?: string;
  /** Edit Posting Date and Time */
  set_posting_time?: 0 | 1;
  /** Payment Due Date */
  due_date?: string;
  /** Include Payment (POS) */
  is_pos?: 0 | 1;
  /** POS Profile */
  pos_profile?: string;
  /** Is Consolidated */
  is_consolidated?: 0 | 1;
  /** Is Return (Credit Note) */
  is_return?: 0 | 1;
  /** Return Against */
  return_against?: string;
  /** Update Outstanding for Self - Credit Note will update it's own outstanding amount, even if 'Return Against' is specified. */
  update_outstanding_for_self?: 0 | 1;
  /** Update Billed Amount in Sales Order */
  update_billed_amount_in_sales_order?: 0 | 1;
  /** Update Billed Amount in Delivery Note */
  update_billed_amount_in_delivery_note?: 0 | 1;
  /** Is Rate Adjustment Entry (Debit Note) - Issue a debit note with 0 qty against an existing Sales Invoice */
  is_debit_note?: 0 | 1;
  /** Amended From */
  amended_from?: string;
  /** Cost Center */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Currency */
  currency: string;
  /** Exchange Rate - Rate at which Customer Currency is converted to customer's base currency */
  conversion_rate: number;
  /** Price List */
  selling_price_list: string;
  /** Price List Currency */
  price_list_currency: string;
  /** Price List Exchange Rate - Rate at which Price list currency is converted to customer's base currency */
  plc_conversion_rate: number;
  /** Ignore Pricing Rule */
  ignore_pricing_rule?: 0 | 1;
  /** Scan Barcode */
  scan_barcode?: string;
  /** Update Stock */
  update_stock?: 0 | 1;
  /** Last Scanned Warehouse */
  last_scanned_warehouse?: string;
  /** Source Warehouse */
  set_warehouse?: string;
  /** Set Target Warehouse */
  set_target_warehouse?: string;
  /** Items */
  items: unknown[];
  /** Total Quantity */
  total_qty?: number;
  /** Total Net Weight */
  total_net_weight?: number;
  /** Total (Company Currency) */
  base_total?: number;
  /** Net Total (Company Currency) */
  base_net_total: number;
  /** Total */
  total?: number;
  /** Net Total */
  net_total?: number;
  /** Tax Category */
  tax_category?: string;
  /** Sales Taxes and Charges Template */
  taxes_and_charges?: string;
  /** Shipping Rule */
  shipping_rule?: string;
  /** Incoterm */
  incoterm?: string;
  /** Named Place */
  named_place?: string;
  /** Sales Taxes and Charges */
  taxes?: unknown[];
  /** Total Taxes and Charges (Company Currency) */
  base_total_taxes_and_charges?: number;
  /** Total Taxes and Charges */
  total_taxes_and_charges?: number;
  /** Grand Total (Company Currency) */
  base_grand_total: number;
  /** Rounding Adjustment (Company Currency) */
  base_rounding_adjustment?: number;
  /** Rounded Total (Company Currency) */
  base_rounded_total?: number;
  /** In Words (Company Currency) - In Words will be visible once you save the Sales Invoice. */
  base_in_words?: string;
  /** Grand Total */
  grand_total: number;
  /** Rounding Adjustment */
  rounding_adjustment?: number;
  /** Use Company default Cost Center for Round off */
  use_company_roundoff_cost_center?: 0 | 1;
  /** Rounded Total */
  rounded_total?: number;
  /** In Words */
  in_words?: string;
  /** Total Advance */
  total_advance?: number;
  /** Outstanding Amount */
  outstanding_amount?: number;
  /** Disable Rounded Total */
  disable_rounded_total?: 0 | 1;
  /** Apply Additional Discount On */
  apply_discount_on?: "Grand Total" | "Net Total";
  /** Additional Discount Amount (Company Currency) */
  base_discount_amount?: number;
  /** Is Cash or Non Trade Discount */
  is_cash_or_non_trade_discount?: 0 | 1;
  /** Discount Account */
  additional_discount_account?: string;
  /** Additional Discount Percentage */
  additional_discount_percentage?: number;
  /** Additional Discount Amount */
  discount_amount?: number;
  /** Taxes and Charges Calculation */
  other_charges_calculation?: string;
  /** Pricing Rule Detail */
  pricing_rules?: unknown[];
  /** Packed Items */
  packed_items?: unknown[];
  /** Product Bundle Help */
  product_bundle_help?: string;
  /** Time Sheets */
  timesheets?: unknown[];
  /** Total Billing Hours */
  total_billing_hours?: number;
  /** Total Billing Amount */
  total_billing_amount?: number;
  /** Cash/Bank Account */
  cash_bank_account?: string;
  /** Sales Invoice Payment */
  payments?: unknown[];
  /** Paid Amount (Company Currency) */
  base_paid_amount?: number;
  /** Paid Amount */
  paid_amount?: number;
  /** Base Change Amount (Company Currency) */
  base_change_amount?: number;
  /** Change Amount */
  change_amount?: number;
  /** Account for Change Amount */
  account_for_change_amount?: string;
  /** Allocate Advances Automatically (FIFO) */
  allocate_advances_automatically?: 0 | 1;
  /** Only Include Allocated Payments - Advance payments allocated against orders will only be fetched */
  only_include_allocated_payments?: 0 | 1;
  /** Get Advances Received */
  get_advances?: unknown;
  /** Advances */
  advances?: unknown[];
  /** Write Off Amount */
  write_off_amount?: number;
  /** Write Off Amount (Company Currency) */
  base_write_off_amount?: number;
  /** Write Off Outstanding Amount */
  write_off_outstanding_amount_automatically?: 0 | 1;
  /** Write Off Account */
  write_off_account?: string;
  /** Write Off Cost Center */
  write_off_cost_center?: string;
  /** Redeem Loyalty Points */
  redeem_loyalty_points?: 0 | 1;
  /** Loyalty Points */
  loyalty_points?: number;
  /** Loyalty Amount */
  loyalty_amount?: number;
  /** Loyalty Program */
  loyalty_program?: string;
  /** Redemption Account */
  loyalty_redemption_account?: string;
  /** Redemption Cost Center */
  loyalty_redemption_cost_center?: string;
  /** Customer Address */
  customer_address?: string;
  /** Address */
  address_display?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Territory */
  territory?: string;
  /** Shipping Address Name */
  shipping_address_name?: string;
  /** Shipping Address */
  shipping_address?: string;
  /** Dispatch Address Name */
  dispatch_address_name?: string;
  /** Dispatch Address */
  dispatch_address?: string;
  /** Company Address Name */
  company_address?: string;
  /** Company Address */
  company_address_display?: string;
  /** Company Contact Person */
  company_contact_person?: string;
  /** Ignore Default Payment Terms Template */
  ignore_default_payment_terms_template?: 0 | 1;
  /** Payment Terms Template */
  payment_terms_template?: string;
  /** Payment Schedule */
  payment_schedule?: unknown[];
  /** Terms */
  tc_name?: string;
  /** Terms and Conditions Details */
  terms?: string;
  /** Customer's Purchase Order */
  po_no?: string;
  /** Customer's Purchase Order Date */
  po_date?: string;
  /** Debit To */
  debit_to: string;
  /** Party Account Currency */
  party_account_currency?: string;
  /** Is Opening Entry */
  is_opening?: "No" | "Yes";
  /** Unrealized Profit / Loss Account - Unrealized Profit / Loss account for intra-company transfers */
  unrealized_profit_loss_account?: string;
  /** Against Income Account */
  against_income_account?: string;
  /** Sales Partner */
  sales_partner?: string;
  /** Amount Eligible for Commission */
  amount_eligible_for_commission?: number;
  /** Commission Rate (%) */
  commission_rate?: number;
  /** Total Commission */
  total_commission?: number;
  /** Sales Contributions and Incentives */
  sales_team?: unknown[];
  /** Letter Head */
  letter_head?: string;
  /** Group same items */
  group_same_items?: 0 | 1;
  /** Print Heading */
  select_print_heading?: string;
  /** Print Language */
  language?: string;
  /** Subscription */
  subscription?: string;
  /** From Date */
  from_date?: string;
  /** Auto Repeat */
  auto_repeat?: string;
  /** To Date */
  to_date?: string;
  /** Update Auto Repeat Reference */
  update_auto_repeat_reference?: unknown;
  /** Status */
  status?:
    | "Draft"
    | "Return"
    | "Credit Note Issued"
    | "Submitted"
    | "Paid"
    | "Partly Paid"
    | "Unpaid"
    | "Unpaid and Discounted"
    | "Partly Paid and Discounted"
    | "Overdue and Discounted"
    | "Overdue"
    | "Cancelled"
    | "Internal Transfer";
  /** Inter Company Invoice Reference */
  inter_company_invoice_reference?: string;
  /** Campaign */
  campaign?: string;
  /** Represents Company - Company which internal customer represents */
  represents_company?: string;
  /** Source */
  source?: string;
  /** Customer Group */
  customer_group?: string;
  /** Is Internal Customer */
  is_internal_customer?: 0 | 1;
  /** Is Discounted */
  is_discounted?: 0 | 1;
  /** Remarks */
  remarks?: string;
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
 * Sales Invoice Create Request
 * Fields required to create a new Sales Invoice
 */
export type SalesInvoiceCreateRequest = Pick<
  SalesInvoice,
  | "naming_series"
  | "company"
  | "posting_date"
  | "currency"
  | "conversion_rate"
  | "selling_price_list"
  | "price_list_currency"
  | "plc_conversion_rate"
  | "items"
  | "base_net_total"
  | "base_grand_total"
  | "grand_total"
  | "debit_to"
> &
  Partial<
    Pick<
      SalesInvoice,
      | "title"
      | "customer"
      | "customer_name"
      | "tax_id"
      | "company_tax_id"
      | "posting_time"
      | "set_posting_time"
      | "due_date"
      | "is_pos"
      | "pos_profile"
    >
  >;

/**
 * Sales Invoice Update Request
 * All fields optional for update
 */
export type SalesInvoiceUpdateRequest = Partial<
  Omit<SalesInvoice, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Payment Terms Template DocType
 * @doctype Payment Terms Template
 * @generated 2026-01-26T11:14:16.770Z
 */
export interface PaymentTermsTemplate {
  /** Template Name */
  template_name?: string;
  /** Allocate Payment Based On Payment Terms - If this checkbox is checked, paid amount will be splitted and allocated as per the amounts in payment schedule against each payment term */
  allocate_payment_based_on_payment_terms?: 0 | 1;
  /** Payment Terms */
  terms: unknown[];
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
 * Payment Terms Template Create Request
 * Fields required to create a new Payment Terms Template
 */
export type PaymentTermsTemplateCreateRequest = Pick<
  PaymentTermsTemplate,
  "terms"
> &
  Partial<
    Pick<
      PaymentTermsTemplate,
      "template_name" | "allocate_payment_based_on_payment_terms"
    >
  >;

/**
 * Payment Terms Template Update Request
 * All fields optional for update
 */
export type PaymentTermsTemplateUpdateRequest = Partial<
  Omit<PaymentTermsTemplate, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Mode of Payment DocType
 * @doctype Mode of Payment
 * @generated 2026-01-26T11:14:16.770Z
 */
export interface ModeOfPayment {
  /** Mode of Payment */
  mode_of_payment: string;
  /** Enabled */
  enabled?: 0 | 1;
  /** Type */
  type?: "Cash" | "Bank" | "General" | "Phone";
  /** Accounts */
  accounts?: unknown[];
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
 * Mode of Payment Create Request
 * Fields required to create a new Mode of Payment
 */
export type ModeOfPaymentCreateRequest = Pick<
  ModeOfPayment,
  "mode_of_payment"
> &
  Partial<Pick<ModeOfPayment, "enabled" | "type" | "accounts">>;

/**
 * Mode of Payment Update Request
 * All fields optional for update
 */
export type ModeOfPaymentUpdateRequest = Partial<
  Omit<ModeOfPayment, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Fiscal Year DocType
 * @doctype Fiscal Year
 * @generated 2026-01-26T11:14:16.770Z
 */
export interface FiscalYear {
  /** Year Name - For e.g. 2012, 2012-13 */
  year: string;
  /** Disabled */
  disabled?: 0 | 1;
  /** Is Short/Long Year - More/Less than 12 months. */
  is_short_year?: 0 | 1;
  /** Year Start Date */
  year_start_date: string;
  /** Year End Date */
  year_end_date: string;
  /** Companies */
  companies?: unknown[];
  /** Auto Created */
  auto_created?: 0 | 1;
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
 * Fiscal Year Create Request
 * Fields required to create a new Fiscal Year
 */
export type FiscalYearCreateRequest = Pick<
  FiscalYear,
  "year" | "year_start_date" | "year_end_date"
> &
  Partial<
    Pick<
      FiscalYear,
      "disabled" | "is_short_year" | "companies" | "auto_created"
    >
  >;

/**
 * Fiscal Year Update Request
 * All fields optional for update
 */
export type FiscalYearUpdateRequest = Partial<
  Omit<FiscalYear, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Period Closing Voucher DocType
 * @doctype Period Closing Voucher
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface PeriodClosingVoucher {
  /** Transaction Date */
  transaction_date?: string;
  /** Company */
  company: string;
  /** Fiscal Year */
  fiscal_year: string;
  /** Period Start Date */
  period_start_date: string;
  /** Period End Date */
  period_end_date: string;
  /** Amended From */
  amended_from?: string;
  /** Closing Account Head - The account head under Liability or Equity, in which Profit/Loss will be booked */
  closing_account_head: string;
  /** GL Entry Processing Status */
  gle_processing_status?: "In Progress" | "Completed" | "Failed";
  /** Remarks */
  remarks: string;
  /** Error Message */
  error_message?: string;
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
 * Period Closing Voucher Create Request
 * Fields required to create a new Period Closing Voucher
 */
export type PeriodClosingVoucherCreateRequest = Pick<
  PeriodClosingVoucher,
  | "company"
  | "fiscal_year"
  | "period_start_date"
  | "period_end_date"
  | "closing_account_head"
  | "remarks"
> &
  Partial<
    Pick<
      PeriodClosingVoucher,
      | "transaction_date"
      | "amended_from"
      | "gle_processing_status"
      | "error_message"
    >
  >;

/**
 * Period Closing Voucher Update Request
 * All fields optional for update
 */
export type PeriodClosingVoucherUpdateRequest = Partial<
  Omit<PeriodClosingVoucher, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Asset DocType
 * @doctype Asset
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface Asset {
  /** Company */
  company: string;
  /** Item Code */
  item_code: string;
  /** Item Name */
  item_name?: string;
  /** Asset Owner */
  asset_owner?: "Company" | "Supplier" | "Customer";
  /** Asset Owner Company */
  asset_owner_company?: string;
  /** Is Existing Asset */
  is_existing_asset?: 0 | 1;
  /** Is Composite Asset */
  is_composite_asset?: 0 | 1;
  /** Supplier */
  supplier?: string;
  /** Customer */
  customer?: string;
  /** Image */
  image?: string;
  /** Journal Entry for Scrap */
  journal_entry_for_scrap?: string;
  /** Naming Series */
  naming_series?: "ACC-ASS-.YYYY.-";
  /** Asset Name */
  asset_name: string;
  /** Asset Category */
  asset_category?: string;
  /** Location */
  location: string;
  /** Split From */
  split_from?: string;
  /** Custodian */
  custodian?: string;
  /** Department */
  department?: string;
  /** Disposal Date */
  disposal_date?: string;
  /** Cost Center */
  cost_center?: string;
  /** Purchase Receipt */
  purchase_receipt?: string;
  /** Purchase Receipt Item */
  purchase_receipt_item?: string;
  /** Purchase Invoice */
  purchase_invoice?: string;
  /** Purchase Invoice Item */
  purchase_invoice_item?: string;
  /** Purchase Date */
  purchase_date: string;
  /** Available-for-use Date */
  available_for_use_date?: string;
  /** Net Purchase Amount */
  gross_purchase_amount?: number;
  /** Asset Quantity */
  asset_quantity?: number;
  /** Additional Asset Cost */
  additional_asset_cost?: number;
  /** Total Asset Cost */
  total_asset_cost?: number;
  /** Calculate Depreciation */
  calculate_depreciation?: 0 | 1;
  /** Opening Accumulated Depreciation */
  opening_accumulated_depreciation?: number;
  /** Opening Number of Booked Depreciations */
  opening_number_of_booked_depreciations?: number;
  /** Is Fully Depreciated */
  is_fully_depreciated?: 0 | 1;
  /** Finance Books */
  finance_books?: unknown[];
  /** Depreciation Method */
  depreciation_method?: "Straight Line" | "Double Declining Balance" | "Manual";
  /** Value After Depreciation */
  value_after_depreciation?: number;
  /** Total Number of Depreciations */
  total_number_of_depreciations?: number;
  /** Frequency of Depreciation (Months) */
  frequency_of_depreciation?: number;
  /** Next Depreciation Date */
  next_depreciation_date?: string;
  /** Depreciation Schedule View */
  depreciation_schedule_view?: string;
  /** Policy number */
  policy_number?: string;
  /** Insurer */
  insurer?: string;
  /** Insured value */
  insured_value?: string;
  /** Insurance Start Date */
  insurance_start_date?: string;
  /** Insurance End Date */
  insurance_end_date?: string;
  /** Comprehensive Insurance */
  comprehensive_insurance?: string;
  /** Maintenance Required - Check if Asset requires Preventive Maintenance or Calibration */
  maintenance_required?: 0 | 1;
  /** Status */
  status?:
    | "Draft"
    | "Submitted"
    | "Cancelled"
    | "Partially Depreciated"
    | "Fully Depreciated"
    | "Sold"
    | "Scrapped"
    | "In Maintenance"
    | "Out of Order"
    | "Issue"
    | "Receipt"
    | "Capitalized"
    | "Work In Progress";
  /** Booked Fixed Asset */
  booked_fixed_asset?: 0 | 1;
  /** Purchase Amount */
  purchase_amount?: number;
  /** Default Finance Book */
  default_finance_book?: string;
  /** Depreciation Entry Posting Status */
  depr_entry_posting_status?: "Successful" | "Failed";
  /** Amended From */
  amended_from?: string;
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
 * Asset Create Request
 * Fields required to create a new Asset
 */
export type AssetCreateRequest = Pick<
  Asset,
  "company" | "item_code" | "asset_name" | "location" | "purchase_date"
> &
  Partial<
    Pick<
      Asset,
      | "item_name"
      | "asset_owner"
      | "asset_owner_company"
      | "is_existing_asset"
      | "is_composite_asset"
      | "supplier"
      | "customer"
      | "image"
      | "journal_entry_for_scrap"
      | "naming_series"
    >
  >;

/**
 * Asset Update Request
 * All fields optional for update
 */
export type AssetUpdateRequest = Partial<
  Omit<Asset, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Asset Category DocType
 * @doctype Asset Category
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface AssetCategory {
  /** Asset Category Name */
  asset_category_name: string;
  /** Enable Capital Work in Progress Accounting */
  enable_cwip_accounting?: 0 | 1;
  /** Non Depreciable Category */
  non_depreciable_category?: 0 | 1;
  /** Finance Books */
  finance_books?: unknown[];
  /** Accounts */
  accounts: unknown[];
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
 * Asset Category Create Request
 * Fields required to create a new Asset Category
 */
export type AssetCategoryCreateRequest = Pick<
  AssetCategory,
  "asset_category_name" | "accounts"
> &
  Partial<
    Pick<
      AssetCategory,
      "enable_cwip_accounting" | "non_depreciable_category" | "finance_books"
    >
  >;

/**
 * Asset Category Update Request
 * All fields optional for update
 */
export type AssetCategoryUpdateRequest = Partial<
  Omit<AssetCategory, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Asset Movement DocType
 * @doctype Asset Movement
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface AssetMovement {
  /** Company */
  company: string;
  /** Purpose */
  purpose: "Issue" | "Receipt" | "Transfer" | "Transfer and Issue";
  /** Transaction Date */
  transaction_date: string;
  /** Assets */
  assets: unknown[];
  /** Reference Document Type */
  reference_doctype?: string;
  /** Reference Document Name */
  reference_name?: string;
  /** Amended From */
  amended_from?: string;
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
 * Asset Movement Create Request
 * Fields required to create a new Asset Movement
 */
export type AssetMovementCreateRequest = Pick<
  AssetMovement,
  "company" | "purpose" | "transaction_date" | "assets"
> &
  Partial<
    Pick<AssetMovement, "reference_doctype" | "reference_name" | "amended_from">
  >;

/**
 * Asset Movement Update Request
 * All fields optional for update
 */
export type AssetMovementUpdateRequest = Partial<
  Omit<AssetMovement, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Work Order DocType
 * @doctype Work Order
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface WorkOrder {
  /** Series */
  naming_series: "MFG-WO-.YYYY.-";
  /** Status */
  status:
    | "Draft"
    | "Submitted"
    | "Not Started"
    | "In Process"
    | "Completed"
    | "Stopped"
    | "Closed"
    | "Cancelled";
  /** Item To Manufacture */
  production_item: string;
  /** Item Name */
  item_name?: string;
  /** Image */
  image?: string;
  /** BOM No */
  bom_no: string;
  /** Sales Order */
  sales_order?: string;
  /** Company */
  company: string;
  /** Qty To Manufacture */
  qty: number;
  /** Material Transferred for Manufacturing */
  material_transferred_for_manufacturing?: number;
  /** Manufactured Qty */
  produced_qty?: number;
  /** Disassembled Qty */
  disassembled_qty?: number;
  /** Process Loss Qty */
  process_loss_qty?: number;
  /** Project */
  project?: string;
  /** Required Items */
  required_items?: unknown[];
  /** Allow Alternative Item */
  allow_alternative_item?: 0 | 1;
  /** Use Multi-Level BOM - Plan material for sub-assemblies */
  use_multi_level_bom?: 0 | 1;
  /** Skip Material Transfer to WIP Warehouse - Check if material transfer entry is not required */
  skip_transfer?: 0 | 1;
  /** Backflush Raw Materials From Work-in-Progress Warehouse */
  from_wip_warehouse?: 0 | 1;
  /** Update Consumed Material Cost In Project */
  update_consumed_material_cost_in_project?: 0 | 1;
  /** Source Warehouse - This is a location where raw materials are available. */
  source_warehouse?: string;
  /** Work-in-Progress Warehouse - This is a location where operations are executed. */
  wip_warehouse?: string;
  /** Target Warehouse - This is a location where final product stored. */
  fg_warehouse: string;
  /** Scrap Warehouse - This is a location where scraped materials are stored. */
  scrap_warehouse?: string;
  /** Has Serial No */
  has_serial_no?: 0 | 1;
  /** Has Batch No */
  has_batch_no?: 0 | 1;
  /** Batch Size */
  batch_size?: number;
  /** Transfer Material Against */
  transfer_material_against?: "Work Order" | "Job Card";
  /** Operations */
  operations?: unknown[];
  /** Planned Start Date */
  planned_start_date: string;
  /** Planned End Date */
  planned_end_date?: string;
  /** Expected Delivery Date */
  expected_delivery_date?: string;
  /** Actual Start Date */
  actual_start_date?: string;
  /** Actual End Date */
  actual_end_date?: string;
  /** Lead Time - In Mins */
  lead_time?: number;
  /** Planned Operating Cost */
  planned_operating_cost?: number;
  /** Actual Operating Cost */
  actual_operating_cost?: number;
  /** Additional Operating Cost */
  additional_operating_cost?: number;
  /** Corrective Operation Cost - From Corrective Job Card */
  corrective_operation_cost?: number;
  /** Total Operating Cost */
  total_operating_cost?: number;
  /** Item Description */
  description?: string;
  /** Stock UOM */
  stock_uom?: string;
  /** Material Request - Manufacture against Material Request */
  material_request?: string;
  /** Material Request Item */
  material_request_item?: string;
  /** Sales Order Item */
  sales_order_item?: string;
  /** Production Plan */
  production_plan?: string;
  /** Production Plan Item */
  production_plan_item?: string;
  /** Production Plan Sub-assembly Item */
  production_plan_sub_assembly_item?: string;
  /** Product Bundle Item */
  product_bundle_item?: string;
  /** Amended From */
  amended_from?: string;
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
 * Work Order Create Request
 * Fields required to create a new Work Order
 */
export type WorkOrderCreateRequest = Pick<
  WorkOrder,
  | "naming_series"
  | "status"
  | "production_item"
  | "bom_no"
  | "company"
  | "qty"
  | "fg_warehouse"
  | "planned_start_date"
> &
  Partial<
    Pick<
      WorkOrder,
      | "item_name"
      | "image"
      | "sales_order"
      | "material_transferred_for_manufacturing"
      | "produced_qty"
      | "disassembled_qty"
      | "process_loss_qty"
      | "project"
      | "required_items"
      | "allow_alternative_item"
    >
  >;

/**
 * Work Order Update Request
 * All fields optional for update
 */
export type WorkOrderUpdateRequest = Partial<
  Omit<WorkOrder, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * BOM DocType
 * @doctype BOM
 * @generated 2026-01-20T21:36:13.957Z
 */
export interface Bom {
  /** Item - Item to be manufactured or repacked */
  item: string;
  /** Company */
  company: string;
  /** Item UOM */
  uom?: string;
  /** Quantity - Quantity of item obtained after manufacturing / repacking from given quantities of raw materials */
  quantity: number;
  /** Is Active */
  is_active?: 0 | 1;
  /** Is Default */
  is_default?: 0 | 1;
  /** Allow Alternative Item */
  allow_alternative_item?: 0 | 1;
  /** Set rate of sub-assembly item based on BOM */
  set_rate_of_sub_assembly_item_based_on_bom?: 0 | 1;
  /** Project */
  project?: string;
  /** Image */
  image?: string;
  /** Rate Of Materials Based On */
  rm_cost_as_per?: "Valuation Rate" | "Last Purchase Rate" | "Price List";
  /** Price List */
  buying_price_list?: string;
  /** Price List Currency */
  price_list_currency?: string;
  /** Price List Exchange Rate */
  plc_conversion_rate?: number;
  /** Currency */
  currency: string;
  /** Conversion Rate */
  conversion_rate: number;
  /** Items */
  items: unknown[];
  /** With Operations - Manage cost of operations */
  with_operations?: 0 | 1;
  /** Transfer Material Against */
  transfer_material_against?: "Work Order" | "Job Card";
  /** Routing */
  routing?: string;
  /** Finished Goods based Operating Cost */
  fg_based_operating_cost?: 0 | 1;
  /** Operating Cost Per BOM Quantity */
  operating_cost_per_bom_quantity?: number;
  /** Operations */
  operations?: unknown[];
  /** Scrap Items */
  scrap_items?: unknown[];
  /** % Process Loss */
  process_loss_percentage?: number;
  /** Process Loss Qty */
  process_loss_qty?: number;
  /** Operating Cost */
  operating_cost?: number;
  /** Raw Material Cost */
  raw_material_cost?: number;
  /** Scrap Material Cost */
  scrap_material_cost?: number;
  /** Operating Cost (Company Currency) */
  base_operating_cost?: number;
  /** Raw Material Cost (Company Currency) */
  base_raw_material_cost?: number;
  /** Scrap Material Cost(Company Currency) */
  base_scrap_material_cost?: number;
  /** Total Cost */
  total_cost?: number;
  /** Total Cost (Company Currency) */
  base_total_cost?: number;
  /** Item Name */
  item_name?: string;
  /** Item Description */
  description?: string;
  /** Has Variants */
  has_variants?: 0 | 1;
  /** Quality Inspection Required */
  inspection_required?: 0 | 1;
  /** Quality Inspection Template */
  quality_inspection_template?: string;
  /** Exploded Items */
  exploded_items?: unknown[];
  /** Show in Website */
  show_in_website?: 0 | 1;
  /** Route */
  route?: string;
  /** Website Image - Item Image (if not slideshow) */
  website_image?: string;
  /** Thumbnail */
  thumbnail?: string;
  /** Show Items */
  show_items?: 0 | 1;
  /** Show Operations */
  show_operations?: 0 | 1;
  /** Website Description */
  web_long_description?: string;
  /** BOM Creator */
  bom_creator?: string;
  /** BOM Creator Item */
  bom_creator_item?: string;
  /** Amended From */
  amended_from?: string;
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
 * BOM Create Request
 * Fields required to create a new BOM
 */
export type BomCreateRequest = Pick<
  Bom,
  "item" | "company" | "quantity" | "currency" | "conversion_rate" | "items"
> &
  Partial<
    Pick<
      Bom,
      | "uom"
      | "is_active"
      | "is_default"
      | "allow_alternative_item"
      | "set_rate_of_sub_assembly_item_based_on_bom"
      | "project"
      | "image"
      | "rm_cost_as_per"
      | "buying_price_list"
      | "price_list_currency"
    >
  >;

/**
 * BOM Update Request
 * All fields optional for update
 */
export type BomUpdateRequest = Partial<
  Omit<Bom, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Workstation DocType
 * @doctype Workstation
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface Workstation {
  /** Workstation Dashboard */
  workstation_dashboard?: string;
  /** Workstation Name */
  workstation_name: string;
  /** Workstation Type */
  workstation_type?: string;
  /** Plant Floor */
  plant_floor?: string;
  /** Job Capacity - Run parallel job cards in a workstation */
  production_capacity: number;
  /** Warehouse */
  warehouse?: string;
  /** Status */
  status?: "Production" | "Off" | "Idle" | "Problem" | "Maintenance" | "Setup";
  /** Active Status */
  on_status_image?: string;
  /** Inactive Status */
  off_status_image?: string;
  /** Electricity Cost - per hour */
  hour_rate_electricity?: number;
  /** Consumable Cost - per hour */
  hour_rate_consumable?: number;
  /** Rent Cost - per hour */
  hour_rate_rent?: number;
  /** Wages - Wages per hour */
  hour_rate_labour?: number;
  /** Net Hour Rate - per hour */
  hour_rate?: number;
  /** Description */
  description?: string;
  /** Holiday List */
  holiday_list?: string;
  /** Working Hours */
  working_hours?: unknown[];
  /** Total Working Hours */
  total_working_hours?: number;
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
 * Workstation Create Request
 * Fields required to create a new Workstation
 */
export type WorkstationCreateRequest = Pick<
  Workstation,
  "workstation_name" | "production_capacity"
> &
  Partial<
    Pick<
      Workstation,
      | "workstation_dashboard"
      | "workstation_type"
      | "plant_floor"
      | "warehouse"
      | "status"
      | "on_status_image"
      | "off_status_image"
      | "hour_rate_electricity"
      | "hour_rate_consumable"
      | "hour_rate_rent"
    >
  >;

/**
 * Workstation Update Request
 * All fields optional for update
 */
export type WorkstationUpdateRequest = Partial<
  Omit<Workstation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Operation DocType
 * @doctype Operation
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface Operation {
  /** Default Workstation */
  workstation?: string;
  /** Is Corrective Operation */
  is_corrective_operation?: 0 | 1;
  /** Create Job Card based on Batch Size */
  create_job_card_based_on_batch_size?: 0 | 1;
  /** Quality Inspection Template */
  quality_inspection_template?: string;
  /** Batch Size */
  batch_size?: number;
  sub_operations?: unknown[];
  /** Total Operation Time - Time in mins. */
  total_operation_time?: number;
  /** Description */
  description?: string;
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
 * Operation Update Request
 * All fields optional for update
 */
export type OperationUpdateRequest = Partial<
  Omit<Operation, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Production Plan DocType
 * @doctype Production Plan
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface ProductionPlan {
  /** Naming Series */
  naming_series: "MFG-PP-.YYYY.-";
  /** Company */
  company: string;
  /** Get Items From */
  get_items_from?: "Sales Order" | "Material Request";
  /** Posting Date */
  posting_date: string;
  /** Item Code */
  item_code?: string;
  /** Customer */
  customer?: string;
  /** Warehouse */
  warehouse?: string;
  /** Project */
  project?: string;
  /** Sales Order Status */
  sales_order_status?: "To Deliver and Bill" | "To Bill" | "To Deliver";
  /** From Date */
  from_date?: string;
  /** To Date */
  to_date?: string;
  /** From Delivery Date */
  from_delivery_date?: string;
  /** To Delivery Date */
  to_delivery_date?: string;
  /** Get Sales Orders */
  get_sales_orders?: unknown;
  /** Sales Orders */
  sales_orders?: unknown[];
  /** Get Material Request */
  get_material_request?: unknown;
  /** Material Requests */
  material_requests?: unknown[];
  /** Get Finished Goods for Manufacture */
  get_items?: unknown;
  /** Consolidate Sales Order Items */
  combine_items?: 0 | 1;
  /** Assembly Items */
  po_items: unknown[];
  /** Production Plan Item Reference */
  prod_plan_references?: unknown[];
  /** Consolidate Sub Assembly Items */
  combine_sub_items?: 0 | 1;
  /** Sub Assembly Warehouse - When a parent warehouse is chosen, the system conducts stock checks against the associated child warehouses */
  sub_assembly_warehouse?: string;
  /** Skip Available Sub Assembly Items - If this checkbox is enabled, then the system won’t run the MRP for the available sub-assembly items. */
  skip_available_sub_assembly_item?: 0 | 1;
  /** Get Sub Assembly Items */
  get_sub_assembly_items?: unknown;
  sub_assembly_items?: unknown[];
  /** Download Required Materials */
  download_materials_required?: unknown;
  /** Include Non Stock Items */
  include_non_stock_items?: 0 | 1;
  /** Include Subcontracted Items */
  include_subcontracted_items?: 0 | 1;
  /** Consider Minimum Order Qty */
  consider_minimum_order_qty?: 0 | 1;
  /** Include Safety Stock in Required Qty Calculation */
  include_safety_stock?: 0 | 1;
  /** Ignore Available Stock - If enabled, the system will create material requests even if the stock exists in the 'Raw Materials Warehouse'. */
  ignore_existing_ordered_qty?: 0 | 1;
  /** Raw Materials Warehouse */
  for_warehouse?: string;
  /** Get Raw Materials for Purchase */
  get_items_for_mr?: unknown;
  /** Get Raw Materials for Transfer */
  transfer_materials?: unknown;
  /** Raw Materials */
  mr_items?: unknown[];
  /** Total Planned Qty */
  total_planned_qty?: number;
  /** Total Produced Qty */
  total_produced_qty?: number;
  /** Status */
  status?:
    | "Draft"
    | "Submitted"
    | "Not Started"
    | "In Process"
    | "Completed"
    | "Closed"
    | "Cancelled"
    | "Material Requested";
  /** Warehouses */
  warehouses?: unknown[];
  /** Amended From */
  amended_from?: string;
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
 * Production Plan Create Request
 * Fields required to create a new Production Plan
 */
export type ProductionPlanCreateRequest = Pick<
  ProductionPlan,
  "naming_series" | "company" | "posting_date" | "po_items"
> &
  Partial<
    Pick<
      ProductionPlan,
      | "get_items_from"
      | "item_code"
      | "customer"
      | "warehouse"
      | "project"
      | "sales_order_status"
      | "from_date"
      | "to_date"
      | "from_delivery_date"
      | "to_delivery_date"
    >
  >;

/**
 * Production Plan Update Request
 * All fields optional for update
 */
export type ProductionPlanUpdateRequest = Partial<
  Omit<ProductionPlan, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Job Card DocType
 * @doctype Job Card
 * @generated 2026-01-14T18:05:48.293Z
 */
export interface JobCard {
  /** Naming Series */
  naming_series: "PO-JOB.#####";
  /** Work Order */
  work_order: string;
  /** BOM No */
  bom_no?: string;
  /** Production Item */
  production_item?: string;
  /** Employee */
  employee?: unknown[];
  /** Posting Date */
  posting_date?: string;
  /** Company */
  company: string;
  /** Qty To Manufacture */
  for_quantity?: number;
  /** Total Completed Qty */
  total_completed_qty?: number;
  /** Process Loss Qty */
  process_loss_qty?: number;
  /** Expected Start Date */
  expected_start_date?: string;
  /** Expected Time Required (In Mins) */
  time_required?: number;
  /** Expected End Date */
  expected_end_date?: string;
  /** Scheduled Time Logs */
  scheduled_time_logs?: unknown[];
  /** Time Logs */
  time_logs?: unknown[];
  /** Actual Start Date */
  actual_start_date?: string;
  /** Total Time in Mins */
  total_time_in_mins?: number;
  /** Actual End Date */
  actual_end_date?: string;
  /** Operation */
  operation: string;
  /** WIP Warehouse */
  wip_warehouse: string;
  /** Workstation Type */
  workstation_type?: string;
  /** Workstation */
  workstation: string;
  /** Quality Inspection Template */
  quality_inspection_template?: string;
  /** Quality Inspection */
  quality_inspection?: string;
  /** Sub Operations */
  sub_operations?: unknown[];
  /** Items */
  items?: unknown[];
  /** Scrap Items */
  scrap_items?: unknown[];
  /** For Job Card */
  for_job_card?: string;
  /** Is Corrective Job Card */
  is_corrective_job_card?: 0 | 1;
  /** Hour Rate */
  hour_rate?: number;
  /** For Operation */
  for_operation?: string;
  /** Project */
  project?: string;
  /** Item Name */
  item_name?: string;
  /** FG Qty from Transferred Raw Materials */
  transferred_qty?: number;
  /** Requested Qty */
  requested_qty?: number;
  /** Status */
  status?:
    | "Open"
    | "Work In Progress"
    | "Material Transferred"
    | "On Hold"
    | "Submitted"
    | "Cancelled"
    | "Completed";
  /** Operation Row Number */
  operation_row_number?: string;
  /** Operation ID */
  operation_id?: string;
  /** Sequence Id */
  sequence_id?: number;
  /** Remarks */
  remarks?: string;
  /** Serial and Batch Bundle */
  serial_and_batch_bundle?: string;
  /** Batch No */
  batch_no?: string;
  /** Serial No */
  serial_no?: string;
  /** Barcode */
  barcode?: string;
  /** Job Started */
  job_started?: 0 | 1;
  /** Started Time */
  started_time?: string;
  /** Current Time */
  current_time?: number;
  /** Amended From */
  amended_from?: string;
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
 * Job Card Create Request
 * Fields required to create a new Job Card
 */
export type JobCardCreateRequest = Pick<
  JobCard,
  | "naming_series"
  | "work_order"
  | "company"
  | "operation"
  | "wip_warehouse"
  | "workstation"
> &
  Partial<
    Pick<
      JobCard,
      | "bom_no"
      | "production_item"
      | "employee"
      | "posting_date"
      | "for_quantity"
      | "total_completed_qty"
      | "process_loss_qty"
      | "expected_start_date"
      | "time_required"
      | "expected_end_date"
    >
  >;

/**
 * Job Card Update Request
 * All fields optional for update
 */
export type JobCardUpdateRequest = Partial<
  Omit<JobCard, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Downtime Entry DocType
 * @doctype Downtime Entry
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface DowntimeEntry {
  /** Naming Series */
  naming_series: "DT-";
  /** Workstation / Machine */
  workstation: string;
  /** Operator */
  operator: string;
  /** From Time */
  from_time: string;
  /** To Time */
  to_time: string;
  /** Downtime - In Mins */
  downtime?: number;
  /** Stop Reason */
  stop_reason:
    | "Excessive machine set up time"
    | "Unplanned machine maintenance"
    | "On-machine press checks"
    | "Machine operator errors"
    | "Machine malfunction"
    | "Electricity down"
    | "Other";
  /** Remarks */
  remarks?: string;
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
 * Downtime Entry Create Request
 * Fields required to create a new Downtime Entry
 */
export type DowntimeEntryCreateRequest = Pick<
  DowntimeEntry,
  | "naming_series"
  | "workstation"
  | "operator"
  | "from_time"
  | "to_time"
  | "stop_reason"
> &
  Partial<Pick<DowntimeEntry, "downtime" | "remarks">>;

/**
 * Downtime Entry Update Request
 * All fields optional for update
 */
export type DowntimeEntryUpdateRequest = Partial<
  Omit<DowntimeEntry, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Project DocType
 * @doctype Project
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface Project {
  /** Series */
  naming_series: "PROJ-.####";
  /** Project Name */
  project_name: string;
  /** Status */
  status?: "Open" | "Completed" | "Cancelled";
  /** Project Type */
  project_type?: string;
  /** Is Active */
  is_active?: "Yes" | "No";
  /** % Complete Method */
  percent_complete_method?:
    | "Manual"
    | "Task Completion"
    | "Task Progress"
    | "Task Weight";
  /** % Completed */
  percent_complete?: number;
  /** From Template */
  project_template?: string;
  /** Expected Start Date */
  expected_start_date?: string;
  /** Expected End Date */
  expected_end_date?: string;
  /** Priority */
  priority?: "Medium" | "Low" | "High";
  /** Department */
  department?: string;
  /** Customer */
  customer?: string;
  /** Sales Order */
  sales_order?: string;
  /** Users - Project will be accessible on the website to these users */
  users?: unknown[];
  /** Copied From */
  copied_from?: string;
  /** Notes */
  notes?: string;
  /** Actual Start Date (via Timesheet) */
  actual_start_date?: string;
  /** Actual Time in Hours (via Timesheet) */
  actual_time?: number;
  /** Actual End Date (via Timesheet) */
  actual_end_date?: string;
  /** Estimated Cost */
  estimated_costing?: number;
  /** Total Costing Amount (via Timesheet) */
  total_costing_amount?: number;
  /** Total Purchase Cost (via Purchase Invoice) */
  total_purchase_cost?: number;
  /** Company */
  company: string;
  /** Total Sales Amount (via Sales Order) */
  total_sales_amount?: number;
  /** Total Billable Amount (via Timesheet) */
  total_billable_amount?: number;
  /** Total Billed Amount (via Sales Invoice) */
  total_billed_amount?: number;
  /** Total Consumed Material Cost (via Stock Entry) */
  total_consumed_material_cost?: number;
  /** Default Cost Center */
  cost_center?: string;
  /** Gross Margin */
  gross_margin?: number;
  /** Gross Margin % */
  per_gross_margin?: number;
  /** Collect Progress */
  collect_progress?: 0 | 1;
  /** Holiday List */
  holiday_list?: string;
  /** Frequency To Collect Progress */
  frequency?: "Hourly" | "Twice Daily" | "Daily" | "Weekly";
  /** From Time */
  from_time?: string;
  /** To Time */
  to_time?: string;
  /** First Email */
  first_email?: string;
  /** Second Email */
  second_email?: string;
  /** Daily Time to send */
  daily_time_to_send?: string;
  /** Day to Send */
  day_to_send?:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  /** Weekly Time to send */
  weekly_time_to_send?: string;
  /** Subject */
  subject?: string;
  /** Message - Message will be sent to the users to get their status on the Project */
  message?: string;
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
 * Project Create Request
 * Fields required to create a new Project
 */
export type ProjectCreateRequest = Pick<
  Project,
  "naming_series" | "project_name" | "company"
> &
  Partial<
    Pick<
      Project,
      | "status"
      | "project_type"
      | "is_active"
      | "percent_complete_method"
      | "percent_complete"
      | "project_template"
      | "expected_start_date"
      | "expected_end_date"
      | "priority"
      | "department"
    >
  >;

/**
 * Project Update Request
 * All fields optional for update
 */
export type ProjectUpdateRequest = Partial<
  Omit<Project, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Task DocType
 * @doctype Task
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface Task {
  /** Subject */
  subject: string;
  /** Project */
  project?: string;
  /** Issue */
  issue?: string;
  /** Type */
  type?: string;
  /** Color */
  color?: string;
  /** Is Group */
  is_group?: 0 | 1;
  /** Is Template */
  is_template?: 0 | 1;
  /** Status */
  status?:
    | "Open"
    | "Working"
    | "Pending Review"
    | "Overdue"
    | "Template"
    | "Completed"
    | "Cancelled";
  /** Priority */
  priority?: "Low" | "Medium" | "High" | "Urgent";
  /** Weight */
  task_weight?: number;
  /** Parent Task */
  parent_task?: string;
  /** Completed By */
  completed_by?: string;
  /** Completed On */
  completed_on?: string;
  /** Expected Start Date */
  exp_start_date?: string;
  /** Expected Time (in hours) */
  expected_time?: number;
  /** Begin On (Days) */
  start?: number;
  /** Expected End Date */
  exp_end_date?: string;
  /** % Progress */
  progress?: number;
  /** Duration (Days) */
  duration?: number;
  /** Is Milestone */
  is_milestone?: 0 | 1;
  /** Task Description */
  description?: string;
  /** Dependent Tasks */
  depends_on?: unknown[];
  /** Depends on Tasks */
  depends_on_tasks?: string;
  /** Actual Start Date (via Timesheet) */
  act_start_date?: string;
  /** Actual Time in Hours (via Timesheet) */
  actual_time?: number;
  /** Actual End Date (via Timesheet) */
  act_end_date?: string;
  /** Total Costing Amount (via Timesheet) */
  total_costing_amount?: number;
  /** Total Billable Amount (via Timesheet) */
  total_billing_amount?: number;
  /** Review Date */
  review_date?: string;
  /** Closing Date */
  closing_date?: string;
  /** Department */
  department?: string;
  /** Company */
  company?: string;
  /** lft */
  lft?: number;
  /** rgt */
  rgt?: number;
  /** Old Parent */
  old_parent?: string;
  /** Template Task */
  template_task?: string;
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
 * Task Create Request
 * Fields required to create a new Task
 */
export type TaskCreateRequest = Pick<Task, "subject"> &
  Partial<
    Pick<
      Task,
      | "project"
      | "issue"
      | "type"
      | "color"
      | "is_group"
      | "is_template"
      | "status"
      | "priority"
      | "task_weight"
      | "parent_task"
    >
  >;

/**
 * Task Update Request
 * All fields optional for update
 */
export type TaskUpdateRequest = Partial<
  Omit<Task, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Activity Type DocType
 * @doctype Activity Type
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface ActivityType {
  /** Activity Type */
  activity_type: string;
  /** Default Costing Rate */
  costing_rate?: number;
  /** Default Billing Rate */
  billing_rate?: number;
  /** Disabled */
  disabled?: 0 | 1;
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
 * Activity Type Create Request
 * Fields required to create a new Activity Type
 */
export type ActivityTypeCreateRequest = Pick<ActivityType, "activity_type"> &
  Partial<Pick<ActivityType, "costing_rate" | "billing_rate" | "disabled">>;

/**
 * Activity Type Update Request
 * All fields optional for update
 */
export type ActivityTypeUpdateRequest = Partial<
  Omit<ActivityType, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Timesheet DocType
 * @doctype Timesheet
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface Timesheet {
  /** Title */
  title?: string;
  /** Series */
  naming_series: "TS-.YYYY.-";
  /** Company */
  company?: string;
  /** Customer */
  customer?: string;
  /** Currency */
  currency?: string;
  /** Exchange Rate */
  exchange_rate?: number;
  /** Sales Invoice */
  sales_invoice?: string;
  /** Status */
  status?:
    | "Draft"
    | "Submitted"
    | "Billed"
    | "Payslip"
    | "Completed"
    | "Cancelled";
  /** Project */
  parent_project?: string;
  /** Employee */
  employee?: string;
  /** Employee Name */
  employee_name?: string;
  /** Department */
  department?: string;
  /** User */
  user?: string;
  /** Start Date */
  start_date?: string;
  /** End Date */
  end_date?: string;
  /** Time Sheets */
  time_logs: unknown[];
  /** Total Working Hours */
  total_hours?: number;
  /** Total Billable Hours */
  total_billable_hours?: number;
  /** Base Total Billable Amount */
  base_total_billable_amount?: number;
  /** Base Total Billed Amount */
  base_total_billed_amount?: number;
  /** Base Total Costing Amount */
  base_total_costing_amount?: number;
  /** Total Billed Hours */
  total_billed_hours?: number;
  /** Total Billable Amount */
  total_billable_amount?: number;
  /** Total Billed Amount */
  total_billed_amount?: number;
  /** Total Costing Amount */
  total_costing_amount?: number;
  /** % Amount Billed */
  per_billed?: number;
  /** Note */
  note?: string;
  /** Amended From */
  amended_from?: string;
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
 * Timesheet Create Request
 * Fields required to create a new Timesheet
 */
export type TimesheetCreateRequest = Pick<
  Timesheet,
  "naming_series" | "time_logs"
> &
  Partial<
    Pick<
      Timesheet,
      | "title"
      | "company"
      | "customer"
      | "currency"
      | "exchange_rate"
      | "sales_invoice"
      | "status"
      | "parent_project"
      | "employee"
      | "employee_name"
    >
  >;

/**
 * Timesheet Update Request
 * All fields optional for update
 */
export type TimesheetUpdateRequest = Partial<
  Omit<Timesheet, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Project Type DocType
 * @doctype Project Type
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface ProjectType {
  /** Project Type */
  project_type: string;
  /** Description */
  description?: string;
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
 * Project Type Create Request
 * Fields required to create a new Project Type
 */
export type ProjectTypeCreateRequest = Pick<ProjectType, "project_type"> &
  Partial<Pick<ProjectType, "description">>;

/**
 * Project Type Update Request
 * All fields optional for update
 */
export type ProjectTypeUpdateRequest = Partial<
  Omit<ProjectType, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Issue DocType
 * @doctype Issue
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface Issue {
  /** Series */
  naming_series?: "ISS-.YYYY.-";
  /** Subject */
  subject: string;
  /** Customer */
  customer?: string;
  /** Raised By (Email) */
  raised_by?: string;
  /** Status */
  status?: "Open" | "Replied" | "On Hold" | "Resolved" | "Closed";
  /** Priority */
  priority?: string;
  /** Issue Type */
  issue_type?: string;
  /** Issue Split From */
  issue_split_from?: string;
  /** Description */
  description?: string;
  /** Service Level Agreement */
  service_level_agreement?: string;
  /** Response By */
  response_by?: string;
  /** Reset Service Level Agreement */
  reset_service_level_agreement?: unknown;
  /** Service Level Agreement Status */
  agreement_status?:
    | "First Response Due"
    | "Resolution Due"
    | "Fulfilled"
    | "Failed";
  /** Resolution By */
  sla_resolution_by?: string;
  /** Service Level Agreement Creation */
  service_level_agreement_creation?: string;
  /** On Hold Since */
  on_hold_since?: string;
  /** Total Hold Time */
  total_hold_time?: string;
  /** First Response Time */
  first_response_time?: string;
  /** First Responded On */
  first_responded_on?: string;
  /** Average Response Time */
  avg_response_time?: string;
  /** Resolution Details */
  resolution_details?: string;
  /** Opening Date */
  opening_date?: string;
  /** Opening Time */
  opening_time?: string;
  /** Resolution Date */
  sla_resolution_date?: string;
  /** Resolution Time */
  resolution_time?: string;
  /** User Resolution Time */
  user_resolution_time?: string;
  /** Lead */
  lead?: string;
  /** Contact */
  contact?: string;
  /** Email Account */
  email_account?: string;
  /** Customer Name */
  customer_name?: string;
  /** Project */
  project?: string;
  /** Company */
  company?: string;
  /** Via Customer Portal */
  via_customer_portal?: 0 | 1;
  /** Attachment */
  attachment?: string;
  /** Content Type */
  content_type?: string;
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
 * Issue Create Request
 * Fields required to create a new Issue
 */
export type IssueCreateRequest = Pick<Issue, "subject"> &
  Partial<
    Pick<
      Issue,
      | "naming_series"
      | "customer"
      | "raised_by"
      | "status"
      | "priority"
      | "issue_type"
      | "issue_split_from"
      | "description"
      | "service_level_agreement"
      | "response_by"
    >
  >;

/**
 * Issue Update Request
 * All fields optional for update
 */
export type IssueUpdateRequest = Partial<
  Omit<Issue, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Warranty Claim DocType
 * @doctype Warranty Claim
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface WarrantyClaim {
  /** Series */
  naming_series: "SER-WRN-.YYYY.-";
  /** Status */
  status: "Open" | "Closed" | "Work In Progress" | "Cancelled";
  /** Issue Date */
  complaint_date: string;
  /** Customer */
  customer: string;
  /** Serial No */
  serial_no?: string;
  /** Issue */
  complaint: string;
  /** Item Code */
  item_code?: string;
  /** Item Name */
  item_name?: string;
  /** Description */
  description?: string;
  /** Warranty / AMC Status */
  warranty_amc_status?:
    | "Under Warranty"
    | "Out of Warranty"
    | "Under AMC"
    | "Out of AMC";
  /** Warranty Expiry Date */
  warranty_expiry_date?: string;
  /** AMC Expiry Date */
  amc_expiry_date?: string;
  /** Resolution Date */
  resolution_date?: string;
  /** Resolved By */
  resolved_by?: string;
  /** Resolution Details */
  resolution_details?: string;
  /** Customer Name */
  customer_name?: string;
  /** Contact Person */
  contact_person?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Territory */
  territory?: string;
  /** Customer Group */
  customer_group?: string;
  /** Customer Address */
  customer_address?: string;
  /** Address */
  address_display?: string;
  /** Service Address - If different than customer address */
  service_address?: string;
  /** Company */
  company: string;
  /** Raised By */
  complaint_raised_by?: string;
  /** From Company */
  from_company?: string;
  /** Amended From */
  amended_from?: string;
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
 * Warranty Claim Create Request
 * Fields required to create a new Warranty Claim
 */
export type WarrantyClaimCreateRequest = Pick<
  WarrantyClaim,
  | "naming_series"
  | "status"
  | "complaint_date"
  | "customer"
  | "complaint"
  | "company"
> &
  Partial<
    Pick<
      WarrantyClaim,
      | "serial_no"
      | "item_code"
      | "item_name"
      | "description"
      | "warranty_amc_status"
      | "warranty_expiry_date"
      | "amc_expiry_date"
      | "resolution_date"
      | "resolved_by"
      | "resolution_details"
    >
  >;

/**
 * Warranty Claim Update Request
 * All fields optional for update
 */
export type WarrantyClaimUpdateRequest = Partial<
  Omit<WarrantyClaim, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Maintenance Visit DocType
 * @doctype Maintenance Visit
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface MaintenanceVisit {
  /** Series */
  naming_series: "MAT-MVS-.YYYY.-";
  /** Customer */
  customer: string;
  /** Customer Name */
  customer_name?: string;
  /** Address */
  address_display?: string;
  /** Contact */
  contact_display?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Maintenance Schedule */
  maintenance_schedule?: string;
  /** Maintenance Schedule Detail */
  maintenance_schedule_detail?: string;
  /** Maintenance Date */
  mntc_date: string;
  /** Maintenance Time */
  mntc_time?: string;
  /** Completion Status */
  completion_status: "Partially Completed" | "Fully Completed";
  /** Maintenance Type */
  maintenance_type: "Scheduled" | "Unscheduled" | "Breakdown";
  /** Purposes */
  purposes?: unknown[];
  /** Customer Feedback */
  customer_feedback?: string;
  /** Status */
  status: "Draft" | "Cancelled" | "Submitted";
  /** Amended From */
  amended_from?: string;
  /** Company */
  company: string;
  /** Customer Address */
  customer_address?: string;
  /** Contact Person */
  contact_person?: string;
  /** Territory */
  territory?: string;
  /** Customer Group */
  customer_group?: string;
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
 * Maintenance Visit Create Request
 * Fields required to create a new Maintenance Visit
 */
export type MaintenanceVisitCreateRequest = Pick<
  MaintenanceVisit,
  | "naming_series"
  | "customer"
  | "mntc_date"
  | "completion_status"
  | "maintenance_type"
  | "status"
  | "company"
> &
  Partial<
    Pick<
      MaintenanceVisit,
      | "customer_name"
      | "address_display"
      | "contact_display"
      | "contact_mobile"
      | "contact_email"
      | "maintenance_schedule"
      | "maintenance_schedule_detail"
      | "mntc_time"
      | "purposes"
      | "customer_feedback"
    >
  >;

/**
 * Maintenance Visit Update Request
 * All fields optional for update
 */
export type MaintenanceVisitUpdateRequest = Partial<
  Omit<MaintenanceVisit, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Maintenance Schedule DocType
 * @doctype Maintenance Schedule
 * @generated 2026-01-14T18:05:48.294Z
 */
export interface MaintenanceSchedule {
  /** Series */
  naming_series: "MAT-MSH-.YYYY.-";
  /** Customer */
  customer?: string;
  /** Status */
  status: "Draft" | "Submitted" | "Cancelled";
  /** Transaction Date */
  transaction_date: string;
  /** Items */
  items: unknown[];
  /** Generate Schedule */
  generate_schedule?: unknown;
  /** Schedules */
  schedules?: unknown[];
  /** Customer Name */
  customer_name?: string;
  /** Contact Person */
  contact_person?: string;
  /** Mobile No */
  contact_mobile?: string;
  /** Contact Email */
  contact_email?: string;
  /** Contact */
  contact_display?: string;
  /** Customer Address */
  customer_address?: string;
  /** Address */
  address_display?: string;
  /** Territory */
  territory?: string;
  /** Customer Group */
  customer_group?: string;
  /** Company */
  company: string;
  /** Amended From */
  amended_from?: string;
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
 * Maintenance Schedule Create Request
 * Fields required to create a new Maintenance Schedule
 */
export type MaintenanceScheduleCreateRequest = Pick<
  MaintenanceSchedule,
  "naming_series" | "status" | "transaction_date" | "items" | "company"
> &
  Partial<
    Pick<
      MaintenanceSchedule,
      | "customer"
      | "generate_schedule"
      | "schedules"
      | "customer_name"
      | "contact_person"
      | "contact_mobile"
      | "contact_email"
      | "contact_display"
      | "customer_address"
      | "address_display"
    >
  >;

/**
 * Maintenance Schedule Update Request
 * All fields optional for update
 */
export type MaintenanceScheduleUpdateRequest = Partial<
  Omit<MaintenanceSchedule, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Customer DocType
 * @doctype Customer
 * @generated 2026-01-14T18:05:48.285Z
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
export type CustomerCreateRequest = Pick<
  Customer,
  "customer_name" | "customer_type"
> &
  Partial<
    Pick<
      Customer,
      | "naming_series"
      | "salutation"
      | "customer_group"
      | "territory"
      | "gender"
      | "lead_name"
      | "opportunity_name"
      | "prospect_name"
      | "account_manager"
      | "image"
    >
  >;

/**
 * Customer Update Request
 * All fields optional for update
 */
export type CustomerUpdateRequest = Partial<
  Omit<Customer, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Sales Partner Type DocType
 * @doctype Sales Partner Type
 * @generated 2026-01-18T10:13:46.758Z
 */
export interface SalesPartnerType {
  /** Sales Partner Type */
  sales_partner_type: string;
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
 * Sales Partner Type Create Request
 * Fields required to create a new Sales Partner Type
 */
export type SalesPartnerTypeCreateRequest = Pick<
  SalesPartnerType,
  "sales_partner_type"
>;

/**
 * Sales Partner Type Update Request
 * All fields optional for update
 */
export type SalesPartnerTypeUpdateRequest = Partial<
  Omit<SalesPartnerType, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Driver DocType
 * @doctype Driver
 * @generated 2026-01-25T20:02:44.960Z
 */
export interface Driver {
  /** Series */
  naming_series?: "HR-DRI-.YYYY.-";
  /** Full Name */
  full_name: string;
  /** Status */
  status: "Active" | "Suspended" | "Left";
  /** Transporter - Applicable for external driver */
  transporter?: string;
  /** Employee */
  employee?: string;
  /** Cellphone Number */
  cell_number?: string;
  /** Address */
  address?: string;
  /** License Number */
  license_number?: string;
  /** Issuing Date */
  issuing_date?: string;
  /** Expiry Date */
  expiry_date?: string;
  /** Driving License Category */
  driving_license_category?: unknown[];
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
 * Driver Create Request
 * Fields required to create a new Driver
 */
export type DriverCreateRequest = Pick<Driver, "full_name" | "status"> &
  Partial<
    Pick<
      Driver,
      | "naming_series"
      | "transporter"
      | "employee"
      | "cell_number"
      | "address"
      | "license_number"
      | "issuing_date"
      | "expiry_date"
      | "driving_license_category"
    >
  >;

/**
 * Driver Update Request
 * All fields optional for update
 */
export type DriverUpdateRequest = Partial<
  Omit<Driver, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Vehicle DocType
 * @doctype Vehicle
 * @generated 2026-01-25T20:02:44.967Z
 */
export interface Vehicle {
  /** License Plate */
  license_plate: string;
  /** Make */
  make: string;
  /** Model */
  model: string;
  /** Odometer Value (Last) */
  last_odometer: number;
  /** Acquisition Date */
  acquisition_date?: string;
  /** Location */
  location?: string;
  /** Chassis No */
  chassis_no?: string;
  /** Vehicle Value */
  vehicle_value?: number;
  /** Employee */
  employee?: string;
  /** Insurance Company */
  insurance_company?: string;
  /** Policy No */
  policy_no?: string;
  /** Start Date */
  start_date?: string;
  /** End Date */
  end_date?: string;
  /** Fuel Type */
  fuel_type: "Petrol" | "Diesel" | "Natural Gas" | "Electric";
  /** Fuel UOM */
  uom: string;
  /** Last Carbon Check */
  carbon_check_date?: string;
  /** Color */
  color?: string;
  /** Wheels */
  wheels?: number;
  /** Doors */
  doors?: number;
  /** Amended From */
  amended_from?: string;
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
 * Vehicle Create Request
 * Fields required to create a new Vehicle
 */
export type VehicleCreateRequest = Pick<
  Vehicle,
  "license_plate" | "make" | "model" | "last_odometer" | "fuel_type" | "uom"
> &
  Partial<
    Pick<
      Vehicle,
      | "acquisition_date"
      | "location"
      | "chassis_no"
      | "vehicle_value"
      | "employee"
      | "insurance_company"
      | "policy_no"
      | "start_date"
      | "end_date"
      | "carbon_check_date"
    >
  >;

/**
 * Vehicle Update Request
 * All fields optional for update
 */
export type VehicleUpdateRequest = Partial<
  Omit<Vehicle, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Sales Invoice Item DocType
 * @doctype Sales Invoice Item
 * @generated 2026-01-26T11:14:16.769Z
 */
export interface SalesInvoiceItem {
  /** Barcode */
  barcode?: string;
  /** Has Item Scanned */
  has_item_scanned?: 0 | 1;
  /** Item */
  item_code?: string;
  /** Item Name */
  item_name: string;
  /** Customer's Item Code */
  customer_item_code?: string;
  /** Description */
  description?: string;
  /** Item Group */
  item_group?: string;
  /** Brand Name */
  brand?: string;
  /** Image */
  image?: string;
  /** Image View */
  image_view?: unknown;
  /** Quantity */
  qty?: number;
  /** Stock UOM */
  stock_uom?: string;
  /** UOM */
  uom: string;
  /** UOM Conversion Factor */
  conversion_factor: number;
  /** Qty as per Stock UOM */
  stock_qty?: number;
  /** Price List Rate */
  price_list_rate?: number;
  /** Price List Rate (Company Currency) */
  base_price_list_rate?: number;
  /** Margin Type */
  margin_type?: "Percentage" | "Amount";
  /** Margin Rate or Amount */
  margin_rate_or_amount?: number;
  /** Rate With Margin */
  rate_with_margin?: number;
  /** Discount (%) on Price List Rate with Margin */
  discount_percentage?: number;
  /** Discount Amount */
  discount_amount?: number;
  /** Distributed Discount Amount */
  distributed_discount_amount?: number;
  /** Rate With Margin (Company Currency) */
  base_rate_with_margin?: number;
  /** Rate */
  rate: number;
  /** Amount */
  amount: number;
  /** Item Tax Template */
  item_tax_template?: string;
  /** Rate (Company Currency) */
  base_rate: number;
  /** Amount (Company Currency) */
  base_amount: number;
  /** Pricing Rules */
  pricing_rules?: string;
  /** Rate of Stock UOM */
  stock_uom_rate?: number;
  /** Is Free Item */
  is_free_item?: 0 | 1;
  /** Grant Commission */
  grant_commission?: 0 | 1;
  /** Net Rate */
  net_rate?: number;
  /** Net Amount */
  net_amount?: number;
  /** Net Rate (Company Currency) */
  base_net_rate?: number;
  /** Net Amount (Company Currency) */
  base_net_amount?: number;
  /** Delivered By Supplier */
  delivered_by_supplier?: 0 | 1;
  /** Income Account */
  income_account: string;
  /** Is Fixed Asset */
  is_fixed_asset?: 0 | 1;
  /** Asset */
  asset?: string;
  /** Finance Book */
  finance_book?: string;
  /** Expense Account */
  expense_account?: string;
  /** Discount Account */
  discount_account?: string;
  /** Deferred Revenue Account */
  deferred_revenue_account?: string;
  /** Service Stop Date */
  service_stop_date?: string;
  /** Enable Deferred Revenue */
  enable_deferred_revenue?: 0 | 1;
  /** Service Start Date */
  service_start_date?: string;
  /** Service End Date */
  service_end_date?: string;
  /** Weight Per Unit */
  weight_per_unit?: number;
  /** Total Weight */
  total_weight?: number;
  /** Weight UOM */
  weight_uom?: string;
  /** Warehouse */
  warehouse?: string;
  /** Target Warehouse */
  target_warehouse?: string;
  /** Quality Inspection */
  quality_inspection?: string;
  /** Pick Serial / Batch No */
  pick_serial_and_batch?: unknown;
  /** Serial and Batch Bundle */
  serial_and_batch_bundle?: string;
  /** Use Serial No / Batch Fields */
  use_serial_batch_fields?: 0 | 1;
  /** Allow Zero Valuation Rate */
  allow_zero_valuation_rate?: 0 | 1;
  /** Incoming Rate (Costing) */
  incoming_rate?: number;
  /** Item Tax Rate */
  item_tax_rate?: string;
  /** Available Batch Qty at Warehouse */
  actual_batch_qty?: number;
  /** Serial No */
  serial_no?: string;
  /** Batch No */
  batch_no?: string;
  /** Qty (Warehouse) */
  actual_qty?: number;
  /** Qty (Company) */
  company_total_stock?: number;
  /** Sales Order */
  sales_order?: string;
  /** Sales Order Item */
  so_detail?: string;
  /** Sales Invoice Item */
  sales_invoice_item?: string;
  /** Delivery Note */
  delivery_note?: string;
  /** Delivery Note Item */
  dn_detail?: string;
  /** Delivered Qty */
  delivered_qty?: number;
  /** POS Invoice */
  pos_invoice?: string;
  /** POS Invoice Item */
  pos_invoice_item?: string;
  /** Purchase Order */
  purchase_order?: string;
  /** Purchase Order Item */
  purchase_order_item?: string;
  /** Cost Center */
  cost_center: string;
  /** Project */
  project?: string;
  /** Page Break */
  page_break?: 0 | 1;
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
 * Sales Invoice Item Create Request
 * Fields required to create a new Sales Invoice Item
 */
export type SalesInvoiceItemCreateRequest = Pick<
  SalesInvoiceItem,
  | "item_name"
  | "uom"
  | "conversion_factor"
  | "rate"
  | "amount"
  | "base_rate"
  | "base_amount"
  | "income_account"
  | "cost_center"
> &
  Partial<
    Pick<
      SalesInvoiceItem,
      | "barcode"
      | "has_item_scanned"
      | "item_code"
      | "customer_item_code"
      | "description"
      | "item_group"
      | "brand"
      | "image"
      | "image_view"
      | "qty"
    >
  >;

/**
 * Sales Invoice Item Update Request
 * All fields optional for update
 */
export type SalesInvoiceItemUpdateRequest = Partial<
  Omit<SalesInvoiceItem, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Purchase Invoice Item DocType
 * @doctype Purchase Invoice Item
 * @generated 2026-01-26T11:14:16.769Z
 */
export interface PurchaseInvoiceItem {
  /** Item */
  item_code?: string;
  /** Product Bundle */
  product_bundle?: string;
  /** Item Name */
  item_name: string;
  /** Description */
  description?: string;
  /** Brand */
  brand?: string;
  /** Item Group */
  item_group?: string;
  /** Image */
  image?: string;
  /** Image View */
  image_view?: unknown;
  /** Received Qty */
  received_qty?: number;
  /** Accepted Qty */
  qty: number;
  /** Rejected Qty */
  rejected_qty?: number;
  /** UOM */
  uom: string;
  /** UOM Conversion Factor */
  conversion_factor: number;
  /** Stock UOM */
  stock_uom?: string;
  /** Accepted Qty in Stock UOM */
  stock_qty: number;
  /** Price List Rate */
  price_list_rate?: number;
  /** Price List Rate (Company Currency) */
  base_price_list_rate?: number;
  /** Margin Type */
  margin_type?: "Percentage" | "Amount";
  /** Margin Rate or Amount */
  margin_rate_or_amount?: number;
  /** Rate With Margin */
  rate_with_margin?: number;
  /** Discount on Price List Rate (%) */
  discount_percentage?: number;
  /** Discount Amount */
  discount_amount?: number;
  /** Distributed Discount Amount */
  distributed_discount_amount?: number;
  /** Rate With Margin (Company Currency) */
  base_rate_with_margin?: number;
  /** Rate */
  rate: number;
  /** Amount */
  amount: number;
  /** Item Tax Template */
  item_tax_template?: string;
  /** Rate (Company Currency) */
  base_rate: number;
  /** Amount (Company Currency) */
  base_amount: number;
  /** Pricing Rules */
  pricing_rules?: string;
  /** Rate of Stock UOM */
  stock_uom_rate?: number;
  /** Is Free Item */
  is_free_item?: 0 | 1;
  /** Apply TDS */
  apply_tds?: 0 | 1;
  /** Net Rate */
  net_rate?: number;
  /** Net Amount */
  net_amount?: number;
  /** Net Rate (Company Currency) */
  base_net_rate?: number;
  /** Net Amount (Company Currency) */
  base_net_amount?: number;
  /** Valuation Rate */
  valuation_rate?: number;
  /** Sales Incoming Rate - Valuation rate for the item as per Sales Invoice (Only for Internal Transfers) */
  sales_incoming_rate?: number;
  /** Item Tax Amount Included in Value */
  item_tax_amount?: number;
  /** Landed Cost Voucher Amount */
  landed_cost_voucher_amount?: number;
  /** Raw Materials Supplied Cost */
  rm_supp_cost?: number;
  /** Accepted Warehouse */
  warehouse?: string;
  /** Add Serial / Batch No */
  add_serial_batch_bundle?: unknown;
  /** Serial and Batch Bundle */
  serial_and_batch_bundle?: string;
  /** Use Serial No / Batch Fields */
  use_serial_batch_fields?: 0 | 1;
  /** From Warehouse */
  from_warehouse?: string;
  /** Quality Inspection */
  quality_inspection?: string;
  /** Rejected Warehouse */
  rejected_warehouse?: string;
  /** Rejected Serial and Batch Bundle */
  rejected_serial_and_batch_bundle?: string;
  /** Serial No */
  serial_no?: string;
  /** Rejected Serial No */
  rejected_serial_no?: string;
  /** Batch No */
  batch_no?: string;
  /** Manufacturer */
  manufacturer?: string;
  /** Manufacturer Part Number */
  manufacturer_part_no?: string;
  /** Expense Head */
  expense_account?: string;
  /** WIP Composite Asset */
  wip_composite_asset?: string;
  /** Is Fixed Asset */
  is_fixed_asset?: 0 | 1;
  /** Asset Location */
  asset_location?: string;
  /** Asset Category */
  asset_category?: string;
  /** Deferred Expense Account */
  deferred_expense_account?: string;
  /** Service Stop Date */
  service_stop_date?: string;
  /** Enable Deferred Expense */
  enable_deferred_expense?: 0 | 1;
  /** Service Start Date */
  service_start_date?: string;
  /** Service End Date */
  service_end_date?: string;
  /** Allow Zero Valuation Rate */
  allow_zero_valuation_rate?: 0 | 1;
  /** Item Tax Rate - Tax detail table fetched from item master as a string and stored in this field.
Used for Taxes and Charges */
  item_tax_rate?: string;
  /** BOM */
  bom?: string;
  /** Include Exploded Items */
  include_exploded_items?: 0 | 1;
  /** Purchase Invoice Item */
  purchase_invoice_item?: string;
  /** Purchase Order */
  purchase_order?: string;
  /** Purchase Order Item */
  po_detail?: string;
  /** Purchase Receipt */
  purchase_receipt?: string;
  /** Purchase Receipt Detail */
  pr_detail?: string;
  /** Sales Invoice Item */
  sales_invoice_item?: string;
  /** Material Request */
  material_request?: string;
  /** Material Request Item */
  material_request_item?: string;
  /** Weight Per Unit */
  weight_per_unit?: number;
  /** Total Weight */
  total_weight?: number;
  /** Weight UOM */
  weight_uom?: string;
  /** Project */
  project?: string;
  /** Cost Center */
  cost_center?: string;
  /** Page Break */
  page_break?: 0 | 1;
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
 * Purchase Invoice Item Create Request
 * Fields required to create a new Purchase Invoice Item
 */
export type PurchaseInvoiceItemCreateRequest = Pick<
  PurchaseInvoiceItem,
  | "item_name"
  | "qty"
  | "uom"
  | "conversion_factor"
  | "stock_qty"
  | "rate"
  | "amount"
  | "base_rate"
  | "base_amount"
> &
  Partial<
    Pick<
      PurchaseInvoiceItem,
      | "item_code"
      | "product_bundle"
      | "description"
      | "brand"
      | "item_group"
      | "image"
      | "image_view"
      | "received_qty"
      | "rejected_qty"
      | "stock_uom"
    >
  >;

/**
 * Purchase Invoice Item Update Request
 * All fields optional for update
 */
export type PurchaseInvoiceItemUpdateRequest = Partial<
  Omit<PurchaseInvoiceItem, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Payment Entry Reference DocType
 * @doctype Payment Entry Reference
 * @generated 2026-01-26T11:14:16.769Z
 */
export interface PaymentEntryReference {
  /** Type */
  reference_doctype: string;
  /** Name */
  reference_name: string;
  /** Due Date */
  due_date?: string;
  /** Supplier Invoice No */
  bill_no?: string;
  /** Payment Term */
  payment_term?: string;
  /** Payment Term Outstanding */
  payment_term_outstanding?: number;
  /** Account Type */
  account_type?: string;
  /** Payment Type */
  payment_type?: string;
  /** Reconcile Effect On */
  reconcile_effect_on?: string;
  /** Grand Total */
  total_amount?: number;
  /** Outstanding */
  outstanding_amount?: number;
  /** Allocated */
  allocated_amount?: number;
  /** Exchange Rate */
  exchange_rate?: number;
  /** Exchange Gain/Loss */
  exchange_gain_loss?: number;
  /** Account */
  account?: string;
  /** Payment Request */
  payment_request?: string;
  /** Payment Request Outstanding */
  payment_request_outstanding?: number;
  /** Advance Voucher Type */
  advance_voucher_type?: string;
  /** Advance Voucher No */
  advance_voucher_no?: string;
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
 * Payment Entry Reference Create Request
 * Fields required to create a new Payment Entry Reference
 */
export type PaymentEntryReferenceCreateRequest = Pick<
  PaymentEntryReference,
  "reference_doctype" | "reference_name"
> &
  Partial<
    Pick<
      PaymentEntryReference,
      | "due_date"
      | "bill_no"
      | "payment_term"
      | "payment_term_outstanding"
      | "account_type"
      | "payment_type"
      | "reconcile_effect_on"
      | "total_amount"
      | "outstanding_amount"
      | "allocated_amount"
    >
  >;

/**
 * Payment Entry Reference Update Request
 * All fields optional for update
 */
export type PaymentEntryReferenceUpdateRequest = Partial<
  Omit<PaymentEntryReference, "name" | "creation" | "owner" | "docstatus">
>;

/**
 * Journal Entry Account DocType
 * @doctype Journal Entry Account
 * @generated 2026-01-26T11:14:16.770Z
 */
export interface JournalEntryAccount {
  /** Account */
  account: string;
  /** Account Type */
  account_type?: string;
  /** Bank Account */
  bank_account?: string;
  /** Party Type */
  party_type?: string;
  /** Party */
  party?: string;
  /** Cost Center - If Income or Expense */
  cost_center?: string;
  /** Project */
  project?: string;
  /** Account Currency */
  account_currency?: string;
  /** Exchange Rate */
  exchange_rate?: number;
  /** Debit */
  debit_in_account_currency?: number;
  /** Debit in Company Currency */
  debit?: number;
  /** Credit */
  credit_in_account_currency?: number;
  /** Credit in Company Currency */
  credit?: number;
  /** Reference Type */
  reference_type?:
    | "Sales Invoice"
    | "Purchase Invoice"
    | "Journal Entry"
    | "Sales Order"
    | "Purchase Order"
    | "Expense Claim"
    | "Asset"
    | "Loan"
    | "Payroll Entry"
    | "Employee Advance"
    | "Exchange Rate Revaluation"
    | "Invoice Discounting"
    | "Fees"
    | "Full and Final Statement"
    | "Payment Entry";
  /** Reference Name */
  reference_name?: string;
  /** Reference Due Date */
  reference_due_date?: string;
  /** Reference Detail No */
  reference_detail_no?: string;
  /** Advance Voucher Type */
  advance_voucher_type?: string;
  /** Advance Voucher No */
  advance_voucher_no?: string;
  /** Is Tax Withholding Account */
  is_tax_withholding_account?: 0 | 1;
  /** Is Advance */
  is_advance?: "No" | "Yes";
  /** User Remark */
  user_remark?: string;
  /** Against Account */
  against_account?: string;
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
 * Journal Entry Account Create Request
 * Fields required to create a new Journal Entry Account
 */
export type JournalEntryAccountCreateRequest = Pick<
  JournalEntryAccount,
  "account"
> &
  Partial<
    Pick<
      JournalEntryAccount,
      | "account_type"
      | "bank_account"
      | "party_type"
      | "party"
      | "cost_center"
      | "project"
      | "account_currency"
      | "exchange_rate"
      | "debit_in_account_currency"
      | "debit"
    >
  >;

/**
 * Journal Entry Account Update Request
 * All fields optional for update
 */
export type JournalEntryAccountUpdateRequest = Partial<
  Omit<JournalEntryAccount, "name" | "creation" | "owner" | "docstatus">
>;
