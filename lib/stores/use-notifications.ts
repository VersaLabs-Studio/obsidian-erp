"use client";

import { useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  markRead,
  markAllRead,
  getNotificationById,
  dismiss as dismissFn,
  dismissAll as dismissAllFn,
  type Notification,
} from "./notification-store";

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** 2L P1: dismiss (remove) a single notification from the list */
  dismiss: (id: string) => Notification | undefined;
  /** 2L P1: dismiss (clear) all notifications */
  dismissAll: () => void;
  getNotificationById: (id: string) => Notification | undefined;
} {
  const notifications = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    dismiss: dismissFn,
    dismissAll: dismissAllFn,
    getNotificationById,
  };
}
