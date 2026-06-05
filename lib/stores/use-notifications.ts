"use client";

import { useSyncExternalStore } from "react";
import {
  subscribe,
  getSnapshot,
  markRead,
  markAllRead,
  type Notification,
} from "./notification-store";

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
} {
  const notifications = useSyncExternalStore(subscribe, getSnapshot);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount, markRead, markAllRead };
}
