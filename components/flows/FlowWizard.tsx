// components/flows/FlowWizard.tsx
// Obsidian ERP v4.0 — Multi-Step Wizard with Zod Step Gating
// A1: No raw error dump. Errors are inline per-field, shown only after
//     touched or triedNext. First invalid field focused on Next attempt.
// A2: Full-width with real padding.
// A3: Elevation-first surfaces, no hard borders.
// A4: Copy teaches — each step explains itself.

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { WizardStep } from "@/types/flow-types";
import type { StepValidationResult } from "@/lib/flows/flow-validation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface FlowWizardProps {
  steps: WizardStep[];
  formData: Record<string, unknown>;
  validationResults?: Record<string, StepValidationResult>;
  isSubmitting?: boolean;
  onFormDataChange: (data: Record<string, unknown>) => void;
  onStepChange: (step: number) => void;
  onTriedNextChange?: (triedNext: Set<number>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  renderStep: (step: WizardStep, stepIndex: number) => React.ReactNode;
  submitLabel?: string;
  submittingLabel?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Step indicator — compact pill bar
// ---------------------------------------------------------------------------
function StepIndicator({
  steps,
  currentStep,
  triedNextSteps,
  validationResults,
}: {
  steps: WizardStep[];
  currentStep: number;
  triedNextSteps: Set<number>;
  validationResults?: Record<string, StepValidationResult>;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const result = validationResults?.[step.id];
        const hasError = result && !result.valid && triedNextSteps.has(index);

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                isCompleted && "bg-primary text-primary-foreground",
                isActive && "bg-primary/10 text-primary ring-2 ring-primary/30",
                !isActive &&
                  !isCompleted &&
                  "bg-muted text-muted-foreground/50",
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span>{index + 1}</span>
              )}
              {/* Error dot — only after triedNext */}
              {hasError && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
              )}
            </div>

            <span
              className={cn(
                "hidden sm:block text-xs font-medium",
                isActive && "text-foreground",
                isCompleted && "text-muted-foreground",
                !isActive && !isCompleted && "text-muted-foreground/50",
              )}
            >
              {step.label}
            </span>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-8",
                  isCompleted ? "bg-primary" : "bg-border/40",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlowWizard
// ---------------------------------------------------------------------------
export function FlowWizard({
  steps,
  formData,
  validationResults,
  isSubmitting,
  onStepChange,
  onTriedNextChange,
  onSubmit,
  onCancel,
  renderStep,
  submitLabel = "Submit",
  submittingLabel = "Submitting...",
  className,
}: FlowWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  // A1: Track which steps the user has attempted to leave (clicked Next)
  const [triedNextSteps, setTriedNextSteps] = useState<Set<number>>(new Set());
  const stepContentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Expose triedNextSteps to the parent for per-field error lighting
  useEffect(() => {
    onTriedNextChange?.(triedNextSteps);
  }, [triedNextSteps, onTriedNextChange]);

  const currentValidation = validationResults?.[currentStepData?.id];
  const isCurrentStepValid = currentValidation
    ? currentValidation.valid
    : validationResults
      ? false
      : true;

  if (validationResults && !currentValidation && process.env.NODE_ENV === "development") {
    console.warn(`[FlowWizard] Step "${currentStepData?.id}" not found in validationResults. Treating as invalid. Keys: ${Object.keys(validationResults).join(", ")}`);
  }

  // A1: When triedNext and invalid, focus the first invalid field
  useEffect(() => {
    if (
      triedNextSteps.has(currentStep) &&
      !isCurrentStepValid &&
      stepContentRef.current
    ) {
      // Find the first input/select with aria-invalid or the first form field
      const firstInvalid =
        stepContentRef.current.querySelector<HTMLElement>(
          "[aria-invalid='true'], .border-destructive, [data-invalid]",
        ) ??
        stepContentRef.current.querySelector<HTMLElement>(
          "input, select, textarea",
        );
      firstInvalid?.focus({ preventScroll: false });
      firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triedNextSteps, currentStep]);

  const handleNext = useCallback(() => {
    // A1: Mark this step as tried
    setTriedNextSteps((prev) => new Set(prev).add(currentStep));

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

  const showInlineHint =
    triedNextSteps.has(currentStep) && !isCurrentStepValid;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Step indicator */}
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        triedNextSteps={triedNextSteps}
        validationResults={validationResults}
      />

      {/* Step content — full width, real padding */}
      <div ref={stepContentRef} className="p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStepData && renderStep(currentStepData, currentStep)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation — hairline separator, elevation-first */}
      <div className="flex items-center justify-between border-t border-border/40 px-6 sm:px-8 py-4">
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

        <div className="flex items-center gap-3">
          {/* A2: Clear destructive hint — not a whisper */}
          {showInlineHint && (
            <span className="text-sm font-medium text-destructive">
              Complete the required fields to continue
            </span>
          )}

          <Button
            onClick={handleNext}
            disabled={isSubmitting}
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
    </div>
  );
}
