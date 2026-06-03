// types/tenant-types.ts
// Obsidian ERP v4.0 - Multi-Tenant Type Definitions
// Per Architecture V4 Part 4

/**
 * Tenant information
 */
export interface TenantInfo {
  /** Unique tenant identifier (subdomain) */
  tenantId: string;
  /** Display name */
  name: string;
  /** Frappe site name (for X-Frappe-Site-Name header) */
  frappeSiteName: string;
  /** Whether this tenant is active */
  isActive: boolean;
  /** Tenant creation date */
  createdAt: string;
  /** Subscription plan */
  plan?: string;
  /** Max users allowed */
  maxUsers?: number;
}

/**
 * Tenant branding configuration
 */
export interface TenantBranding {
  /** Tenant ID */
  tenantId: string;
  /** Logo URL */
  logoUrl?: string;
  /** Primary brand color (OKLCH) */
  primaryColor?: string;
  /** Company name for display */
  companyName?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Custom CSS variables override */
  customTokens?: Record<string, string>;
}

/**
 * Tenant configuration — full tenant setup
 */
export interface TenantConfig {
  /** Tenant info */
  tenant: TenantInfo;
  /** Branding */
  branding: TenantBranding;
  /** Enabled modules for this tenant */
  enabledModules: string[];
  /** Feature flags */
  features: {
    aiEnabled: boolean;
    manufacturingEnabled: boolean;
    hrEnabled: boolean;
    assetsEnabled: boolean;
  };
  /** Frappe connection details */
  frappe: {
    apiUrl: string;
    siteName: string;
  };
}
