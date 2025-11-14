import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
};

export function useSupplierNotifications(supplierId: string) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let socket: WebSocket | null = null;
    if (typeof window !== "undefined" && "WebSocket" in window && supplierId) {
      try {
        socket = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"}/supplier/${supplierId}`);
        socket.onmessage = (event) => {
          const notification = JSON.parse(event.data);
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(notification.title, { body: notification.message });
          }
        };
      } catch {
        // fallback to polling
      }
    }
    return () => socket?.close();
  }, [supplierId]);

  useEffect(() => {
    const fetchExisting = async () => {
      const response = await fetch(`${API_BASE_URL}/api/supplier-portal/notifications?supplier_id=${supplierId}`, {
        headers: { "X-Tenant-ID": "tenant_demo" },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items ?? []);
        setUnreadCount((data.items ?? []).filter((n: NotificationRecord) => !n.is_read).length);
      }
    };
    if (supplierId) {
      fetchExisting();
    }
  }, [supplierId]);

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return { notifications, unreadCount, markAsRead };
}
