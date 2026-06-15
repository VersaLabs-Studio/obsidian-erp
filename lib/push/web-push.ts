// lib/push/web-push.ts
// Obsidian ERP v4.0 — Browser Push helper (2P Part 7).
//
// Wraps the Web Notification API (NOT a full Web-Push-with-VAPID
// server-push flow — that requires backend infrastructure; the
// handoff asks for browser push in the simpler "Notification" API
// sense, which fires an OS-level notification when the page is
// backgrounded). Used to surface notifications from the in-app
// notification store when a doc event happens in another tab/session
// (the polling layer triggers; this is the actual OS notification).
//
// The browser permission must be granted by the user (Settings →
// Notifications). Once granted, `firePush(notification)` shows an
// OS-level notification that deep-links to `notification.href` when
// clicked.

"use client";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function getPushPermission(): PushPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return (Notification.permission as PushPermission) ?? "default";
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const result = await Notification.requestPermission();
    return (result as PushPermission) ?? "default";
  } catch {
    return "denied";
  }
}

/**
 * Fire a browser push for the given notification. Falls back to a
 * no-op when the user hasn't granted permission (the in-app
 * notification is still visible). Returns true when an OS notification
 * was actually shown.
 */
export function firePush(opts: {
  title: string;
  body?: string;
  href?: string;
  tag?: string;
}): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: "/favicon.ico",
    });
    if (opts.href) {
      n.onclick = () => {
        try {
          window.focus();
          window.location.href = opts.href!;
          n.close();
        } catch {
          // navigation blocked — ignore
        }
      };
    }
    return true;
  } catch {
    return false;
  }
}
