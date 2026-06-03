// types/ai-types.ts
// Obsidian ERP v4.0 - AI Type Definitions
// Per Architecture V4 Part 3 §3.2

/**
 * AI Context provided to the LLM for each conversation
 * Contains structured metadata only — never raw user content
 */
export interface AIContext {
  /** Current user ID */
  userId: string;
  /** User's primary role */
  userRole: string;
  /** Tenant identifier */
  tenantId: string;
  /** Available doctypes for this user's role */
  availableDocTypes: string[];
  /** Current page/context the user is viewing */
  currentContext?: {
    doctype?: string;
    name?: string;
    action?: string;
  };
}

/**
 * AI Tool definition — generated from DocTypeConfig
 */
export interface AITool {
  /** Unique tool name (e.g., "create_sales_order") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema for the tool's arguments */
  parameters: Record<string, unknown>;
  /** The API route this tool calls */
  apiRoute: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Whether this tool requires confirmation before execution */
  requiresConfirmation: boolean;
}

/**
 * AI Action — a proposed action from the AI that requires user confirmation
 */
export interface AIAction {
  /** Unique action ID */
  id: string;
  /** Tool that generated this action */
  toolName: string;
  /** Human-readable label */
  label: string;
  /** Description of what this action will do */
  description: string;
  /** The arguments to pass to the tool */
  arguments: Record<string, unknown>;
  /** Whether this action has been confirmed by the user */
  confirmed: boolean;
  /** Result after execution */
  result?: AIActionResult;
}

/**
 * Result of an AI action execution
 */
export interface AIActionResult {
  /** Whether the action succeeded */
  success: boolean;
  /** The created/updated document name (if applicable) */
  documentName?: string;
  /** URL to view the document */
  documentUrl?: string;
  /** Error message if failed */
  error?: string;
  /** Additional details */
  details?: string;
}

/**
 * AI Message in a conversation
 */
export interface AIMessage {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: "user" | "assistant" | "system";
  /** Message content */
  content: string;
  /** Attached actions (for assistant messages) */
  actions?: AIAction[];
  /** Timestamp */
  timestamp: string;
}

/**
 * AI Session state
 */
export interface AISessionState {
  /** Session ID */
  sessionId: string;
  /** Messages in this session */
  messages: AIMessage[];
  /** Number of creations in this session (for guardrail) */
  creationCount: number;
  /** Session start time */
  startedAt: string;
  /** Whether the session is active */
  isActive: boolean;
}

/**
 * AI Guardrails configuration
 * Per DECISIONS.md B1(c) — enforced server-side
 */
export interface AIGuardrails {
  /** Operations that AI cannot perform */
  blockedOperations: readonly string[];
  /** Fields that AI cannot modify */
  protectedFields: readonly string[];
  /** Max document creations per session */
  maxCreationsPerSession: number;
  /** Max bulk update size */
  maxBulkUpdateSize: number;
  /** Max API requests per hour */
  maxRequestsPerHour: number;
}

/**
 * AI Audit Log entry
 */
export interface AIAuditLogEntry {
  /** Unique log ID */
  id: string;
  /** User who initiated the action */
  userId: string;
  /** Tenant context */
  tenantId: string;
  /** Session ID */
  sessionId: string;
  /** The action that was executed */
  action: string;
  /** Tool used */
  toolName: string;
  /** Arguments passed */
  arguments: Record<string, unknown>;
  /** Result of the action */
  result: AIActionResult;
  /** Model used for this interaction */
  model: string;
  /** Timestamp */
  timestamp: string;
}
