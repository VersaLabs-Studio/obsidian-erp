// types/flow-types.ts
// Obsidian ERP v4.0 - Flow Engine Type Definitions
// Per Architecture V4 Part 1 §6.4 and Workflow Part 3

/**
 * Flow stage status
 */
export type FlowStageStatus =
  | "completed"
  | "current"
  | "pending"
  | "skipped"
  | "blocked";

/**
 * A single stage in a flow
 */
export interface FlowStage {
  /** Unique stage ID */
  id: string;
  /** Display label */
  label: string;
  /** DocType this stage represents */
  doctype: string;
  /** Current status of this stage */
  status: FlowStageStatus;
  /** Document name if created */
  documentName?: string;
  /** URL to view the document */
  documentUrl?: string;
  /** Whether this stage can create a downstream document */
  canCreateDownstream?: boolean;
  /** Action to create downstream (e.g., "create_work_orders") */
  createAction?: string;
  /** Icon for the stage */
  icon?: string;
  /** Whether this stage is optional (e.g., Work Order — can be skipped) */
  isOptional?: boolean;
}

/**
 * Flow definition — describes a complete business process
 */
export interface FlowDefinition {
  /** Unique flow ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Ordered stages in this flow */
  stages: FlowStage[];
  /** The doctype this flow starts from */
  sourceDoctype: string;
  /** The doctype this flow ends at */
  targetDoctype: string;
}

/**
 * Result of resolving a flow chain for a document
 */
export interface FlowChainResult {
  /** The flow definition used */
  flowId: string;
  /** All stages with their resolved status */
  stages: FlowStage[];
  /** Index of the current stage (-1 if not found) */
  currentIndex: number;
  /** Number of completed stages */
  completedCount: number;
  /** Number of pending stages */
  pendingCount: number;
  /** Whether the flow is fully complete */
  isComplete: boolean;
  /** Next action the user can take */
  nextAction?: {
    label: string;
    stageId: string;
    action: string;
  };
}

/**
 * Auto-fill mapping — maps fields from source to target doctype
 */
export interface AutoFillMapping {
  /** Source field name */
  sourceField: string;
  /** Target field name */
  targetField: string;
  /** Whether this field is read-only after auto-fill */
  isReadOnly: boolean;
  /** Optional transformation function name */
  transform?: string;
  /** Source label for display */
  sourceLabel?: string;
}

/**
 * Auto-fill registry entry — complete mapping for a doctype pair
 */
export interface AutoFillRegistryEntry {
  /** Source doctype */
  sourceDoctype: string;
  /** Target doctype */
  targetDoctype: string;
  /** Optional guard — return false to skip auto-fill entirely (e.g. Quotation→SO when quotation_to=Lead) */
  autoFillGuard?: (sourceDoc: Record<string, unknown>) => boolean;
  /** Header field mappings */
  headerMappings: AutoFillMapping[];
  /** Child table field mappings */
  itemMappings: AutoFillMapping[];
  /** Fields the user must fill manually */
  userMustFill: string[];
  /** Default values for fields not in the source */
  defaults?: Record<string, unknown>;
}

/**
 * Status transition definition
 */
export interface StatusTransition {
  /** From status */
  from: string;
  /** To status */
  to: string;
  /** Action that triggers this transition */
  action: string;
  /** Whether this transition requires confirmation */
  requiresConfirmation?: boolean;
  /** Side effects of this transition */
  sideEffects?: string[];
  /** Validation rules to check before transition */
  validations?: string[];
}

/**
 * Status machine definition for a doctype
 */
export interface StatusMachine {
  /** DocType this machine applies to */
  doctype: string;
  /** All possible statuses */
  statuses: string[];
  /** Allowed transitions */
  transitions: StatusTransition[];
  /** Default status for new documents */
  defaultStatus: string;
  /** Whether this doctype uses document status (docstatus) */
  usesDocStatus?: boolean;
}

/**
 * FlowTracker configuration
 */
export interface FlowTrackerConfig {
  /** The flow to display */
  flowId: string;
  /** Current document being viewed */
  currentDoctype: string;
  /** Current document name */
  currentName: string;
  /** Whether to show create buttons on pending stages */
  showCreateButtons?: boolean;
  /** Whether to compact the view for mobile */
  compact?: boolean;
}

/**
 * Wizard step definition
 */
export interface WizardStep {
  /** Step ID */
  id: string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Zod schema for this step's validation */
  schema: unknown;
  /** Fields to display in this step */
  fields: string[];
  /** Whether this step is auto-filled */
  isAutoFilled?: boolean;
  /** Icon for the step */
  icon?: string;
}

/**
 * Wizard state
 */
export interface WizardState {
  /** Current step index */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Whether the wizard is submitting */
  isSubmitting: boolean;
  /** Form data accumulated across steps */
  formData: Record<string, unknown>;
  /** Validation errors per step */
  errors: Record<string, Record<string, string>>;
  /** Whether each step is valid */
  stepValid: boolean[];
}
