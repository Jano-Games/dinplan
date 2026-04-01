import { useState, useEffect, useRef } from "react";
import { getActiveReminders, dismissReminder, snoozeReminder } from "@/lib/store";
import type { Reminder } from "@/types";
import { Bell, X, Clock } from "lucide-react";

// Send notification via Service Worker
async function sendSWNotification(title: string, body?: string) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "CHECK_REMINDERS",
      title,
      body: body || "Time!",
    });
    return;
  }
  // Fallback: browser Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body: body || "Time!", icon: "/favicon.svg" });
  }
}

export function AlarmOverlay() {
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const check = async () => {
      try {
        const reminders = await getActiveReminders();
        if (reminders.length > 0 && !activeReminder) {
          setActiveReminder(reminders[0]);
          // Send notification (works in background via SW)
          await sendSWNotification(reminders[0].title, reminders[0].body || undefined);
        }
      } catch { /* ignore */ }
    };

    check();
    intervalRef.current = setInterval(check, 15000); // Check every 15s
    return () => clearInterval(intervalRef.current);
  }, [activeReminder]);

  const handleDismiss = async () => {
    if (!activeReminder) return;
    await dismissReminder(activeReminder.id);
    setActiveReminder(null);
  };

  const handleSnooze = async (minutes: number) => {
    if (!activeReminder) return;
    await snoozeReminder(activeReminder.id, minutes);
    setActiveReminder(null);
  };

  if (!activeReminder) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-primary alarm-overlay flex flex-col items-center justify-center px-8 text-primary-foreground">
      {/* Pulsing bell */}
      <div className="h-24 w-24 rounded-full bg-white/10 flex items-center justify-center mb-8 animate-bounce">
        <Bell className="h-12 w-12" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-extrabold text-center mb-3">{activeReminder.title}</h1>
      {activeReminder.body && (
        <p className="text-lg text-white/70 text-center mb-12">{activeReminder.body}</p>
      )}

      {/* Actions */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleDismiss}
          className="w-full h-16 rounded-2xl bg-white text-primary font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <X className="h-5 w-5" /> Dismiss
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => handleSnooze(5)}
            className="flex-1 h-14 rounded-2xl bg-white/15 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Clock className="h-4 w-4" /> 5 min
          </button>
          <button
            onClick={() => handleSnooze(15)}
            className="flex-1 h-14 rounded-2xl bg-white/15 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Clock className="h-4 w-4" /> 15 min
          </button>
          <button
            onClick={() => handleSnooze(30)}
            className="flex-1 h-14 rounded-2xl bg-white/15 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <Clock className="h-4 w-4" /> 30 min
          </button>
        </div>
      </div>
    </div>
  );
}
