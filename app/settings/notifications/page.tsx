// app/settings/notifications/page.tsx
// Obsidian ERP v4.0 — Browser Push opt-in (2P Part 7).
//
// "Opt-in permission prompt in Settings." A simple page that shows
// the current browser permission state and offers a one-click
// "Enable browser push" button. The in-app notification store
// (`lib/stores/notification-store.ts`) persists to localStorage
// (F7), so enabling push just lets the page fire OS-level
// notifications on new events.

"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  XCircle,
  BellOff,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/smart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPushPermission,
  requestPushPermission,
  type PushPermission,
} from "@/lib/push/web-push";

export default function NotificationsSettingsPage() {
  const prefersReducedMotion = useReducedMotion();
  const [perm, setPerm] = useState<PushPermission>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPerm(getPushPermission());
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const next = await requestPushPermission();
      setPerm(next);
    } finally {
      setBusy(false);
    }
  }

  const isGranted = perm === "granted";
  const isDenied = perm === "denied";
  const isUnsupported = perm === "unsupported";

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Notifications"
        subtitle="Browser push for payment received, low-stock reorder, job-shortfall, and document activity."
      />

      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm shadow-black/5 sm:p-8"
        data-testid="push-permission-card"
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              isGranted
                ? "bg-success/15 text-success"
                : isDenied
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/10 text-primary",
            )}
          >
            {isGranted ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : isDenied || isUnsupported ? (
              <BellOff className="h-6 w-6" />
            ) : (
              <Bell className="h-6 w-6" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              {isGranted
                ? "Browser push is on"
                : isDenied
                  ? "Browser push is blocked"
                  : isUnsupported
                    ? "Browser push not supported"
                    : "Browser push is off"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGranted
                ? "You'll get an OS-level notification when a tracked event happens in another tab/session. Click the notification to deep-link to the doc."
                : isDenied
                  ? "Your browser is blocking notifications. Re-enable in the browser's site settings (usually in the address bar's lock/info icon), then reload."
                  : isUnsupported
                    ? "This browser does not support the Notification API. Use Chrome/Edge/Firefox/Safari 16+ for browser push."
                    : "Click the button below. Your browser will prompt you for permission."}
            </p>
            {!isGranted && !isUnsupported && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="rounded-full"
                  onClick={handleEnable}
                  disabled={busy || isDenied}
                  data-testid="enable-push"
                >
                  <Bell className="mr-1.5 h-4 w-4" />
                  {busy
                    ? "Requesting…"
                    : isDenied
                      ? "Blocked — check browser settings"
                      : "Enable browser push"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <section className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          What you'll get notified for
        </h3>
        <ul className="space-y-2 text-sm">
          {[
            "Payment received — when a customer PE is submitted in another tab/session",
            "Low-stock reorder — when an item drops below its reorder level",
            "Job shortfall — when a Work Order's required items are short",
            "Document activity — when a doc is submitted/cancelled by someone else",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          In-app notifications
        </h3>
        <p className="text-xs text-muted-foreground">
          Always on. The bell icon in the top-right of every page opens
          the Notifications panel. Items persist in your browser's
          localStorage and deep-link to the source doc.
        </p>
      </section>
    </div>
  );
}
