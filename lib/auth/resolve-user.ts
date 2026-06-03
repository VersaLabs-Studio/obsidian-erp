// lib/auth/resolve-user.ts
// Obsidian ERP v4.0 - User Resolution Utility
// Phase 0 stub — full implementation in Phase 4

import type { NextRequest } from "next/server";

/**
 * Resolved user context from the request
 * Used by factory routes and AI executor
 */
export interface UserContext {
  /** Frappe user ID (e.g., "Administrator", "user@example.com") */
  userId: string;
  /** Primary role (e.g., "Sales User", "Accounts Manager") */
  userRole: string;
  /** Tenant identifier (subdomain or "default" for single-tenant) */
  tenantId: string;
  /** Frappe session cookie value to forward in API calls */
  frappeSession: string;
}

/**
 * Custom error for unauthorized access
 */
export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Resolve user context from the incoming request
 *
 * Phase 0: Returns a hardcoded dev user for local development
 * Phase 4: Full implementation with Frappe session validation + tenant resolution
 *
 * @param request - The incoming Next.js request
 * @returns UserContext with userId, role, tenant, and session
 */
export async function resolveUserContext(
  request: NextRequest
): Promise<UserContext> {
  // Phase 0 stub: return dev user
  // In Phase 4, this will:
  // 1. Extract Frappe session cookie from request
  // 2. Validate session with Frappe (GET /api/method/frappe.auth.get_logged_user)
  // 3. Resolve tenant from subdomain
  // 4. Get user roles from Frappe

  return {
    userId: "Administrator",
    userRole: "System Manager",
    tenantId: "default",
    frappeSession: "",
  };
}

/**
 * Create a scoped FrappeClient with user-specific credentials
 *
 * Phase 1: Implementation that creates a per-request FrappeClient
 * Used by factory routes to execute as the actual user
 */
export function createScopedFrappeClient(
  _apiKey: string,
  _apiSecret: string
) {
  // Will be implemented in Phase 1
  // Creates a FrappeClient instance with user-specific credentials
  throw new Error("createScopedFrappeClient not yet implemented — Phase 1");
}
