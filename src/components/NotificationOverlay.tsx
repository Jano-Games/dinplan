import { useState, useEffect, useCallback } from "react";
import { X, Bell, Clock } from "lucide-react";

interface NotificationData {
  title: string;
  body: string;
  reminderId?: string;
}

export function NotificationOverlay() {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showNotification = useCallback((data: NotificationData) => {
    setNotification(data);
    setIsVisible(true);

    // Vibrate strongly if supported
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300, 100, 300]);
    }

    // Play notification sound
    try {
      const audio = new Audio("/notification.wav");
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setNotification(null), 300);
  }, []);

  useEffect(() => {
    // Listen for SW postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK") {
        showNotification({
          title: event.data.title,
          body: event.data.body,
          reminderId: event.data.reminderId,
        });
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    // Check URL params (when app opens from notification)
    const params = new URLSearchParams(window.location.search);
    if (params.get("notification") === "true") {
      showNotification({
        title: params.get("title") || "Reminder",
        body: params.get("body") || "",
        reminderId: params.get("id") || undefined,
      });
      // Clean URL
      window.history.replaceState({}, "", "/");
    }

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [showNotification]);

  if (!notification) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={dismiss} />

      {/* Notification Card */}
      <div
        className={`relative z-10 mx-4 w-full max-w-sm transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 font-medium">DinPlan Reminder</p>
              <h2 className="text-lg font-bold text-white truncate">
                {notification.title}
              </h2>
            </div>
            <button
              onClick={dismiss}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {notification.body || "Time for your reminder!"}
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-5 flex gap-3">
            <button
              onClick={dismiss}
              className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
            <button
              onClick={() => {
                dismiss();
                // TODO: implement snooze via SW or API
              }}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Snooze 5m
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
