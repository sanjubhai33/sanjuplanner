// Reminder scheduling for water, tasks, journal and auto AI report.
// - On native (Capacitor Android/iOS) uses @capacitor/local-notifications so
//   reminders fire even when the app is closed.
// - On the web / installed PWA falls back to Notification API scheduled from
//   an in-page setTimeout while the app/tab is alive.

import type { Task } from "./tasks";

const WATER_TIMES: { hour: number; minute: number; id: number; label: string }[] = [
  { hour: 7, minute: 0, id: 7001, label: "Good morning! Drink a glass of water 💧" },
  { hour: 23, minute: 0, id: 7002, label: "Before bed — hydrate. Drink a glass of water 💧" },
];

// Fixed IDs for daily journal + report reminders
const JOURNAL_ID = 7101; // 11:00 PM — write satisfied/unsatisfied
const REPORT_ID = 7102; // 11:59 PM — auto AI rating

// Task reminder id space: 10_000_000 + hash-ish; we use offsets per lead-time.
const TASK_LEADS: { minutes: number; offset: number; label: string }[] = [
  { minutes: 30, offset: 1, label: "in 30 minutes" },
  { minutes: 15, offset: 2, label: "in 15 minutes" },
  { minutes: 5, offset: 3, label: "in 5 minutes" },
];

function isNative() {
  return typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor?.isNativePlatform?.();
}

async function ensurePermission(): Promise<"native" | "web" | null> {
  if (typeof window === "undefined") return null;
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") return null;
      return "native";
    } catch {
      return null;
    }
  }
  if (!("Notification" in window)) return null;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {}
  }
  if (Notification.permission !== "granted") return null;
  return "web";
}

/** Called on app load to set up water + journal + report reminders. */
export async function ensureReminders() {
  const mode = await ensurePermission();
  if (!mode) return;

  if (mode === "native") {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const ids = [
      ...WATER_TIMES.map((r) => ({ id: r.id })),
      { id: JOURNAL_ID },
      { id: REPORT_ID },
    ];
    await LocalNotifications.cancel({ notifications: ids });
    await LocalNotifications.schedule({
      notifications: [
        ...WATER_TIMES.map((r) => ({
          id: r.id,
          title: "Water reminder",
          body: r.label,
          schedule: {
            on: { hour: r.hour, minute: r.minute },
            allowWhileIdle: true,
            repeats: true,
          },
        })),
        {
          id: JOURNAL_ID,
          title: "Journal time",
          body: "Write today's satisfied ✅ and unsatisfied ⚠️ notes.",
          schedule: {
            on: { hour: 23, minute: 0 },
            allowWhileIdle: true,
            repeats: true,
          },
        },
        {
          id: REPORT_ID,
          title: "Daily rating",
          body: "Generating your AI rating for today's tasks and slips…",
          schedule: {
            on: { hour: 23, minute: 59 },
            allowWhileIdle: true,
            repeats: true,
          },
        },
      ],
    });
    return;
  }

  // Web fallback
  scheduleWebDaily(7, 0, "Water reminder", WATER_TIMES[0].label);
  scheduleWebDaily(23, 0, "Water reminder", WATER_TIMES[1].label);
  scheduleWebDaily(23, 0, "Journal time", "Write today's satisfied ✅ and unsatisfied ⚠️ notes.");
  // report handled by scheduleAutoReport
}

/** Schedule per-task reminders 30/15/5 min before each task's start time. */
export async function scheduleTaskReminders(tasks: Task[]) {
  const mode = await ensurePermission();
  if (!mode) return;

  const now = Date.now();
  const upcoming: { task: Task; startMs: number }[] = [];
  for (const t of tasks) {
    if (t.completed || !t.startTime) continue;
    const [h, m] = t.startTime.split(":").map(Number);
    const [y, mo, d] = t.date.split("-").map(Number);
    const startMs = new Date(y, mo - 1, d, h, m, 0, 0).getTime();
    if (startMs > now) upcoming.push({ task: t, startMs });
  }

  if (mode === "native") {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    // Best-effort: cancel a wide window of task ids and reschedule.
    const cancelIds: { id: number }[] = [];
    for (const { task } of upcoming) {
      for (const lead of TASK_LEADS) {
        cancelIds.push({ id: taskNotifId(task.id, lead.offset) });
      }
    }
    if (cancelIds.length) {
      try {
        await LocalNotifications.cancel({ notifications: cancelIds });
      } catch {}
    }
    const notifs = [];
    for (const { task, startMs } of upcoming) {
      for (const lead of TASK_LEADS) {
        const at = new Date(startMs - lead.minutes * 60_000);
        if (at.getTime() <= now) continue;
        notifs.push({
          id: taskNotifId(task.id, lead.offset),
          title: `Task ${lead.label}`,
          body: `${task.title || "Untitled task"} — starts at ${task.startTime}`,
          schedule: { at, allowWhileIdle: true },
        });
      }
    }
    if (notifs.length) await LocalNotifications.schedule({ notifications: notifs });
    return;
  }

  // Web fallback via setTimeout
  for (const { task, startMs } of upcoming) {
    for (const lead of TASK_LEADS) {
      const delay = startMs - lead.minutes * 60_000 - now;
      if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) continue;
      window.setTimeout(() => {
        try {
          new Notification(`Task ${lead.label}`, {
            body: `${task.title || "Untitled task"} — starts at ${task.startTime}`,
            icon: "/icon-512.png",
          });
        } catch {}
      }, delay);
    }
  }
}

/** Schedule an auto AI report at 11:59 PM (web fallback / in-page). */
export async function scheduleAutoReport(run: () => void | Promise<void>) {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__autoReportScheduled) return;
  w.__autoReportScheduled = true;

  const tick = () => {
    const now = new Date();
    const next = new Date();
    next.setHours(23, 59, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    window.setTimeout(async () => {
      try {
        await run();
      } catch {}
      tick();
    }, delay);
  };
  tick();
}

function taskNotifId(taskId: string, offset: number): number {
  // Deterministic 31-bit id from taskId + offset
  let h = 0;
  for (let i = 0; i < taskId.length; i++) {
    h = (h * 31 + taskId.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1_000_000) * 10 + offset + 100_000_000;
}

function scheduleWebDaily(hour: number, minute: number, title: string, body: string) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  window.setTimeout(() => {
    try {
      new Notification(title, { body, icon: "/icon-512.png" });
    } catch {}
    window.setInterval(() => {
      try {
        new Notification(title, { body, icon: "/icon-512.png" });
      } catch {}
    }, 24 * 60 * 60 * 1000);
  }, delay);
}
