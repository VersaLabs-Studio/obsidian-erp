// components/ui/list-error-state.tsx
// Obsidian ERP v4.0 — Premium error state for list pages.
//
// 2Q Part 2 (F-A1): read/list 403 used to render a flat
// "Failed to load X" with no explanation. The Frappe server was returning
// a rich `_server_messages` reason (e.g. "User hannah@ does not have
// doctype access via role permission for document Payment Entry") and
// the UI was swallowing it. This component routes the error through
// `extractFrappeMessage` so the human reason surfaces — the same quality
// as the create-submit `GuidedErrorDialog`.
//
// 403 → render the permission reason verbatim (it's exactly what the user
// needs to see to understand "why am I blocked?"). 5xx → fall back to a
// friendly generic + a small retry CTA so the UI doesn't expose server
// internals or look broken.

"use client";

import React from "react";
import { AlertTriangle, Ban, RotateCw, ShieldAlert } from "lucide-react";
import { extractFrappeMessage } from "@/lib/errors/extract-frappe-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ListErrorStateProps {
  /** The raw error thrown by useFrappeList / fetch (any shape). */
  error: unknown;
  /**
   * Human-friendly label of what we were trying to load, e.g.
   * "customers", "payment entries". Lowercase. Used in the heading.
   */
  label: string;
  /**
   * Optional retry handler — render a "Try again" button. When omitted,
   * no button is shown (the list page typically refetches on its own).
   */
  onRetry?: () => void;
  className?: string;
}

/**
 * Detect whether the error is a 403 / PermissionError. Frappe returns
 * `_server_messages` and HTTP 403; the SDK may surface it as an object
 * with `httpStatus` or as a thrown Error with a permission reason in
 * the message. We do a best-effort check.
 */
function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  if (e.httpStatus === 403 || e.httpStatus === 401) return true;
  if (typeof e.status === "number" && (e.status === 403 || e.status === 401)) return true;
  if (e.exc_type === "PermissionError") return true;
  // Frappe permission errors mention "permission" in the message.
  const msg = extractFrappeMessage(error).toLowerCase();
  return (
    msg.includes("permission") ||
    msg.includes("not have") ||
    msg.includes("not allowed")
  );
}

export function ListErrorState({
  error,
  label,
  onRetry,
  className,
}: ListErrorStateProps) {
  const message = extractFrappeMessage(error);
  const isPermission = isPermissionError(error);

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-border/40 bg-card p-6 shadow-sm shadow-black/5",
        isPermission
          ? "border-warning/30 bg-warning/5"
          : "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isPermission
              ? "bg-warning/10 text-warning"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {isPermission ? (
            <ShieldAlert className="h-4 w-4" />
          ) : (
            <Ban className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              isPermission ? "text-warning" : "text-destructive",
            )}
          >
            {isPermission
              ? `You don't have access to ${label}`
              : `Couldn't load ${label}`}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
          {!isPermission && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <AlertTriangle className="h-3 w-3" />
              The server may be temporarily unavailable. Try again in a moment.
            </p>
          )}
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="mt-3 gap-1.5"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListErrorState;
