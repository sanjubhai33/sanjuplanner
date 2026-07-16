// Water reminder scheduling.
// - On native (Capacitor Android/iOS) uses @capacitor/local-notifications so
//   reminders fire even when the app is closed.
// - On the web / installed PWA falls back to Notification API scheduled from
//   an in-page setTimeout while the app/tab is alive.

const REMINDER_TIMES: { hour: number; minute: number; id: number; label: string }[] = [
  { hour: 7, minute: 0, id: 7001, label: "Good morning! Drink a glass of water 💧" },
  { hour: 23, minute: 0, id: 7002, label: "Before bed — hydrate. Drink a glass of water 💧" },
];

function isNative() {
  return typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor?.isNativePlatform?.();
}

export async function ensureReminders() {
  if (typeof window === "undefined") return;

  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") return;
      await LocalNotifications.cancel({
        notifications: REMINDER_TIMES.map((r) => ({ id: r.id })),
      });
      await LocalNotifications.schedule({
        notifications: REMINDER_TIMES.map((r) => ({
          id: r.id,
          title: "Water reminder",
          body: r.label,
          schedule: {
            on: { hour: r.hour, minute: r.minute },
            allowWhileIdle: true,
            repeats: true,
          },
        })),
      });
    } catch (e) {
      console.warn("Native reminders failed", e);
    }
    return;
  }

  // Web fallback
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {}
  }
  if (Notification.permission !== "granted") return;
  scheduleWebReminders();
}

function scheduleWebReminders() {
  for (const r of REMINDER_TIMES) {
    const now = new Date();
    const next = new Date();
    next.setHours(r.hour, r.minute, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    window.setTimeout(() => {
      try {
        new Notification("Water reminder", { body: r.label, icon: "/icon-512.png" });
      } catch {}
      // reschedule for the next day (24h)
      window.setInterval(() => {
        try {
          new Notification("Water reminder", { body: r.label, icon: "/icon-512.png" });
        } catch {}
      }, 24 * 60 * 60 * 1000);
    }, delay);
  }
}
