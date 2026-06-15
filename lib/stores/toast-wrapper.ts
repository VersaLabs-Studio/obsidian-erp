// lib/stores/toast-wrapper.ts
// Drop-in replacement for Sonner toast that also captures to notification store.
// Pages can migrate to this incrementally — existing `import { toast } from "sonner"` still works.

import { toast as sonnerToast } from "sonner";
import { addNotification } from "./notification-store";

export function toastSuccess(
  message: string,
  opts?: { description?: string; href?: string },
) {
  sonnerToast.success(message, opts);
  addNotification({
    kind: "success",
    title: message,
    message: opts?.description,
    href: opts?.href,
  });
}

export function toastError(
  message: string,
  opts?: { description?: string; href?: string },
) {
  sonnerToast.error(message, opts);
  addNotification({
    kind: "error",
    title: message,
    message: opts?.description,
    href: opts?.href,
  });
}

export function toastInfo(
  message: string,
  opts?: { description?: string; href?: string },
) {
  sonnerToast(message, opts);
  addNotification({
    kind: "info",
    title: message,
    message: opts?.description,
    href: opts?.href,
  });
}

// Re-export original for advanced usage
export { sonnerToast as toast };
