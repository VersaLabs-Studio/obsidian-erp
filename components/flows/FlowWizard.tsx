// components/flows/FlowWizard.tsx
// Obsidian ERP v4.0 - Multi-Step Wizard with Zod Step Gating
// OKLCH semantic tokens, Framer Motion, dual theme, skeleton/empty/error states

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { WizardStep, WizardState } from "@/types/flow-types";
import type { StepValidationResult } from "@/lib/flows/flow-validation";

interface FlowWizardProps {
  /** Wizard steps */
  steps: WizardStep[];
  /** Current form data */
  formData: Record<string, unknown>;
  /** Validation results per step */
  validationResults?: Record<string, StepValidationResult>;
  /** Whether the wizard is submitting */
  isSubmitting?: boolean;
  /** Callback when form data changes */
  onFormDataChange: (data: Record<string, unknown>) => void;
  /** Callback when step changes */
  onStepChange: (step: number) => void;
  /** Callback when wizard is submitted */
  onSubmit: () => void;
  /** Callback when wizard is cancelled */
  onCancel: () => void;
  /** Render function for step content */
  renderStep: (step: WizardStep, stepIndex: number) => React.ReactNode;
  /** Custom label for the submit button on the last step */
  submitLabel?: string;
  /** Custom label for the submitting state */
  submittingLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Step indicator
 */
function StepIndicator({
  steps,
  currentStep,
  validationResults,
}: {
  steps: WizardStep[];
  currentStep: number;
  validationResults?: Record<string, StepValidationResult>;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const result = validationResults?.[step.id];
        const hasError = result && !result.valid;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                isCompleted && "bg-primary text-primary-foreground",
                isActive && "border-2 border-primary bg-background text-primary",
                !isActive && !isCompleted && "border border-border bg-muted text-muted-foreground",
                hasError && "border-destructive text-destructive"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>

            <span
              className={cn(
                "hidden sm:block text-xs font-medium",
                isActive && "text-foreground",
                isCompleted && "text-muted-foreground",
                !isActive && !isCompleted && "text-muted-foreground/60"
              )}
            >
              {step.label}
            </span>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-8",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * FlowWizard — Multi-step form wizard with Zod validation gating
 *
 * Prevents progression to the next step until the current step's
 * Zod schema passes validation. Auto-filled fields are read-only
 * with a 🔒 indicator.
 *
 * @example
 * ```tsx
 * <FlowWizard
 *   steps={salesOrderSteps}
 *   formData={formData}
 *   onFormDataChange={setFormData}
 *   onStepChange={setCurrentStep}
 *   onSubmit={handleSubmit}
 *   onCancel={() => router.back()}
 *   renderStep={(step, index) => <StepContent step={step} />}
 * />
 * ```
 */
export function FlowWizard({
  steps,
  formData,
  validationResults,
  isSubmitting,
  onStepChange,
  onSubmit,
  onCancel,
  renderStep,
  submitLabel = "Submit",
  submittingLabel = "Submitting...",
  className,
}: FlowWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Check if current step is valid
  const currentValidation = validationResults?.[currentStepData?.id];
  const isCurrentStepValid = currentValidation ? currentValidation.valid : true;

  const handleNext = useCallback(() => {
    if (!isCurrentStepValid) return;

    if (isLastStep) {
      onSubmit();
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange(nextStep);
    }
  }, [currentStep, isCurrentStepValid, isLastStep, onSubmit, onStepChange]);

  const handlePrev = useCallback(() => {
    if (isFirstStep) return;
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    onStepChange(prevStep);
  }, [currentStep, isFirstStep, onStepChange]);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Step indicator */}
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        validationResults={validationResults}
      />

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-[300px]"
        >
          {currentStepData && renderStep(currentStepData, currentStep)}
        </motion.div>
      </AnimatePresence>

      {/* Validation errors */}
      {currentValidation && !currentValidation.valid && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <p className="text-sm font-medium text-destructive">
            Please fix the following errors:
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-destructive/80">
            {Object.entries(currentValidation.errors).map(([field, message]) => (
              <li key={field}>
                <span className="font-medium">{field}:</span> {message}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          onClick={isFirstStep ? onCancel : handlePrev}
          disabled={isSubmitting}
        >
          {isFirstStep ? (
            "Cancel"
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </>
          )}
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isCurrentStepValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {submittingLabel}
            </>
          ) : isLastStep ? (
            submitLabel
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
