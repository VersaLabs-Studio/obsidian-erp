/**
 * Implicit company source for DB-per-tenant architecture.
 * Each tenant is one company. "Pana" is the first tenant.
 * B7: company is tenant-implicit, never user-entered, changeable only in Settings.
 */

const ACTIVE_COMPANY_KEY = "obsidian_active_company";
const DEFAULT_COMPANY = "Pana";

let _activeCompany: string | null = null;

/**
 * Get the active company for the current session.
 * Defaults to "Pana" if not configured.
 */
export function getActiveCompany(): string {
  if (_activeCompany) return _activeCompany;

  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
      if (stored) {
        _activeCompany = stored;
        return stored;
      }
    } catch {
      // SSR or storage unavailable
    }
  }

  return DEFAULT_COMPANY;
}

/**
 * Set the active company (e.g., from Settings page).
 */
export function setActiveCompany(company: string): void {
  _activeCompany = company;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(ACTIVE_COMPANY_KEY, company);
    } catch {
      // Storage unavailable
    }
  }
}

/**
 * React hook for components that need the active company.
 */
export function useActiveCompany(): string {
  return getActiveCompany();
}
