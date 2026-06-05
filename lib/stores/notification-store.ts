"use client";

// lib/stores/notification-store.ts
// B9: Global notification store — captures every toast + guided resolution.
// Uses subscribe/getSnapshot pattern for useSyncExternalStore compatibility.

export interface Notification {
  id: string;
  kind: "success" | "error" | "info" | "guided";
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  href?: string;
}

let _notifications: Notification[] = [];
const _listeners: Set<() => void> = new Set();

function _notify() {
  for (const listener of _listeners) {
    listener();
  }
}

export function addNotification(
  entry: Omit<Notification, "id" | "timestamp" | "read">,
): void {
  const notification: Notification = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    read: false,
    ...entry,
  };
  _notifications = [notification, ..._notifications].slice(0, 100);
  _notify();
}

export function markRead(id: string): void {
  _notifications = _notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  _notify();
}

export function markAllRead(): void {
  _notifications = _notifications.map((n) => ({ ...n, read: true }));
  _notify();
}

export function getUnreadCount(): number {
  return _notifications.filter((n) => !n.read).length;
}

export function getNotifications(): Notification[] {
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
  return _notifications;
}
