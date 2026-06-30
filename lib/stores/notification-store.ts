"use client";

// lib/stores/notification-store.ts
// B9: Global notification store — captures every toast + guided resolution.
// Uses subscribe/getSnapshot pattern for useSyncExternalStore compatibility.
// F7: Persists to localStorage; hydrates on load; stable getServerSnapshot.

const STORAGE_KEY = "obsidian-notifications";
const CAP = 100;

export interface NotificationAction {
  label: string;
  href?: string;
  run?: () => void;
}

export interface Notification {
  id: string;
  kind: "success" | "error" | "info" | "guided";
  title: string;
  message?: string;
  /** F7: detail view — explanation + actionable steps */
  detail?: string;
  actions?: NotificationAction[];
  timestamp: number;
  read: boolean;
  href?: string;
  /** 2V P1-1 — CRUD context: which doctype, doc name, and operation */
  doctype?: string;
  docName?: string;
  operation?: "created" | "updated" | "submitted" | "cancelled" | string;
  /** Human-readable summary of what changed (e.g. "qty: 10 → 15") */
  summary?: string;
}

// ---------------------------------------------------------------------------
// localStorage helpers (safe for SSR)
// ---------------------------------------------------------------------------
function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): Notification[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, CAP);
  } catch {
    // corrupted — start fresh
  }
  return [];
}

function persistToStorage(items: Notification[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, CAP)));
  } catch {
    // storage full — silently drop
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let _notifications: Notification[] = [];
let _hydrated = false;
const _listeners: Set<() => void> = new Set();

function _ensureHydrated(): void {
  if (_hydrated) return;
  _hydrated = true;
  _notifications = loadFromStorage();
}

function _notify(): void {
  for (const listener of _listeners) {
    listener();
  }
}

function _persist(): void {
  persistToStorage(_notifications);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function addNotification(
  entry: Omit<Notification, "id" | "timestamp" | "read">,
): void {
  _ensureHydrated();
  const notification: Notification = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    read: false,
    ...entry,
  };
  _notifications = [notification, ..._notifications].slice(0, CAP);
  _persist();
  _notify();
}

export function markRead(id: string): void {
  _ensureHydrated();
  _notifications = _notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  _persist();
  _notify();
}

export function markAllRead(): void {
  _ensureHydrated();
  _notifications = _notifications.map((n) => ({ ...n, read: true }));
  _persist();
  _notify();
}

/**
 * 2L P1 — Dismiss a notification (remove it from the list). Returns the
 * removed notification, or undefined if not found.
 */
export function dismiss(id: string): Notification | undefined {
  _ensureHydrated();
  const idx = _notifications.findIndex((n) => n.id === id);
  if (idx < 0) return undefined;
  const [removed] = _notifications.splice(idx, 1);
  _persist();
  _notify();
  return removed;
}

/**
 * 2L P1 — Dismiss all notifications.
 */
export function dismissAll(): void {
  _ensureHydrated();
  _notifications = [];
  _persist();
  _notify();
}

export function getNotificationById(id: string): Notification | undefined {
  _ensureHydrated();
  return _notifications.find((n) => n.id === id);
}

export function getUnreadCount(): number {
  _ensureHydrated();
  return _notifications.filter((n) => !n.read).length;
}

export function getNotifications(): Notification[] {
  _ensureHydrated();
  return _notifications;
}

// React-compatible subscription for useSyncExternalStore
export function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

export function getSnapshot(): Notification[] {
  _ensureHydrated();
  return _notifications;
}

const EMPTY: Notification[] = [];
export function getServerSnapshot(): Notification[] {
  return EMPTY;
}

// ---------------------------------------------------------------------------
// 2T §7 — Unified notification sink.
// Every toast the system shows should ALSO persist to the notification
// panel. `notify()` is the single call site: it fires a sonner toast AND
// writes to the notification store in one call.
// ---------------------------------------------------------------------------
import { toast as sonnerToast } from "sonner";

type NotifyKind = "success" | "error" | "info";

interface NotifyOptions {
  /** The toast message (also stored as notification title). */
  message: string;
  /** Optional detail text for the notification panel. */
  detail?: string;
  /** Link to the created/updated doc. */
  href?: string;
  /** Override toast duration (ms). Default: 4000 for success, 6000 for error. */
  duration?: number;
  /** 2V P1-1 — CRUD context for rich notification display */
  doctype?: string;
  docName?: string;
  operation?: "created" | "updated" | "submitted" | "cancelled" | string;
  /** Human-readable summary of what changed */
  summary?: string;
}

/**
 * Unified notification sink — fires a sonner toast AND persists to the
 * notification store. Use this instead of calling `toast.*` directly
 * for any CRUD/operation event that should appear in the notification panel.
 */
export function notify(kind: NotifyKind, opts: NotifyOptions): void {
  // 1. Fire the ephemeral toast
  const duration = opts.duration ?? (kind === "error" ? 6000 : 4000);
  if (kind === "success") {
    sonnerToast.success(opts.message, { duration });
  } else if (kind === "error") {
    sonnerToast.error(opts.message, { duration });
  } else {
    sonnerToast.info(opts.message, { duration });
  }

  // 2. Persist to the notification store (panel)
  addNotification({
    kind,
    title: opts.message,
    detail: opts.detail,
    href: opts.href,
    // 2V P1-1 — CRUD context surfaced in the notification panel
    doctype: opts.doctype,
    docName: opts.docName,
    operation: opts.operation,
    summary: opts.summary,
  });
}
