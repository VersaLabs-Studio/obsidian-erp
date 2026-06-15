// components/errors/GuidedErrorDialog.tsx
// Obsidian ERP v4.0 — Guided Error Dialog
// Renders a Resolution from frappe-error-resolver as a glass-panel dialog.
// Never shows raw technical text — always human explanation + actions.
// 2M Part 2B: info-severity resolutions are surfaced as a toast, never as
// a dialog. The dialog only renders for warning/error severities.

"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { addNotification } from "@/lib/stores/notification-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Info,
} from "lucide-react";
import type { Resolution, ResolutionAction } from "@/lib/errors/frappe-error-resolver";

// ---------------------------------------------------------------------------
// Hook: useGuidedError
// Manages open state + the current Resolution. Wire into any page with two lines.
// ---------------------------------------------------------------------------
export function useGuidedError() {
  const [resolution, setResolution] = useState<Resolution | null>(null);

  const showError = useCallback((r: Resolution) => {
    // 2M Part 2B: info-severity resolutions are surfaced as a toast, never
    // as a GuidedErrorDialog. The caller is informed of an informational
    // server message; it is not a rejection. We still record it as a
    // notification so the user can re-read it from the bell.
    if (r.severity === "info") {
      toast.info(r.explanation, { description: r.title });
      addNotification({
        kind: "info",
        title: r.title,
        message: r.explanation,
      });
      return;
    }
    setResolution(r);
    // B9 + G5 + R7: Capture to notification store WITH detail + actions so
    // clicking the bell item opens the full guided-error panel with working
    // redirects (Reporting Contract: detail+redirect must reach the user).
    const navigateAction = r.actions.find((a) => a.kind === "navigate" && a.href);
    addNotification({
      kind: "guided",
      title: r.title,
      message: r.explanation,
      detail:
        [r.explanation, ...(r.details ?? [])].filter(Boolean).join(" — ") ||
        undefined,
      actions: r.actions
        .filter((a) => a.href || a.run)
        .map((a) => ({
          label: a.label,
          href: a.href,
          run: a.run,
        })),
      href: navigateAction?.href, // G5: deep-link to the relevant doc
    });
  }, []);

  const dismiss = useCallback(() => {
    setResolution(null);
  }, []);

  return { resolution, showError, dismiss };
}

// ---------------------------------------------------------------------------
// Dialog component
// ---------------------------------------------------------------------------
interface GuidedErrorDialogProps {
  resolution: Resolution | null;
  onDismiss: () => void;
}

export function GuidedErrorDialog({
  resolution,
  onDismiss,
}: GuidedErrorDialogProps) {
  // 2M Part 2B: info-severity resolutions are handled via toast in
  // useGuidedError (showError) and never set the resolution state, but
  // guard the dialog as well in case a future caller sets one.
  if (!resolution || resolution.severity === "info") return null;

  const handleAction = async (action: ResolutionAction) => {
    await action.run();
    if (action.kind === "dismiss" || action.kind === "navigate") {
      onDismiss();
    }
  };

  return (
    <Dialog open={!!resolution} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl shadow-xl rounded-2xl border border-border/40">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {resolution.severity === "warning" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            )}
            <div>
              <DialogTitle className="text-base font-semibold">
                {resolution.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                {resolution.explanation}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Details */}
        {resolution.details && resolution.details.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-xl bg-muted/30 p-4">
            {resolution.details.map((detail, i) => (
              <p key={i} className="text-sm text-foreground">
                {detail}
              </p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          {resolution.actions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant ?? "default"}
              size="sm"
              className="rounded-full"
              onClick={() => handleAction(action)}
            >
              {action.kind === "navigate" && (
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              )}
              {action.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Inline variant (for embedding in pages without a dialog)
// ---------------------------------------------------------------------------
export function GuidedErrorInline({
  resolution,
  onDismiss,
  className,
}: {
  resolution: Resolution;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 space-y-3",
        resolution.severity === "warning"
          ? "bg-warning/5 border border-warning/20"
          : "bg-destructive/5 border border-destructive/20",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {resolution.severity === "warning" ? (
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {resolution.title}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {resolution.explanation}
          </p>
        </div>
      </div>

      {resolution.details && resolution.details.length > 0 && (
        <div className="space-y-1 rounded-lg bg-background/50 p-3">
          {resolution.details.map((d, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {d}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {resolution.actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? "default"}
            size="sm"
            className="rounded-full text-xs"
            onClick={() => action.run()}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
