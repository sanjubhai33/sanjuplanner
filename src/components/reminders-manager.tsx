import { useEffect } from "react";
import { useTasks } from "@/lib/use-tasks";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureReminders,
  scheduleTaskReminders,
  scheduleAutoReport,
} from "@/lib/reminders";
import { generateDailyReport } from "@/lib/report.functions";
import { loadDay, saveDay, todayISO } from "@/lib/journal";
import { loadTasks } from "@/lib/tasks";
import { useSession, useDisplayName } from "@/lib/session";

/** Mounts inside the app shell — schedules water/journal/task/report reminders. */
export function RemindersManager() {
  const { data: tasks } = useTasks();
  const runReport = useServerFn(generateDailyReport);
  const { user } = useSession();
  const userName = useDisplayName(user);

  // Water + journal + report daily reminders (permission + schedule)
  useEffect(() => {
    ensureReminders();
  }, []);

  // Reschedule task reminders whenever tasks change
  useEffect(() => {
    if (!tasks) return;
    scheduleTaskReminders(tasks);
  }, [tasks]);

  // Auto AI report at 11:59 PM
  useEffect(() => {
    scheduleAutoReport(async () => {
      const date = todayISO();
      const [day, allTasks] = await Promise.all([loadDay(date), loadTasks()]);
      const todays = allTasks.filter((t) => t.date === date);
      const completed = todays.filter((t) => t.completed).length;
      try {
        const result = await runReport({
          data: {
            date,
            totalTasks: todays.length,
            completedTasks: completed,
            waterCount: day.waterCount,
            waterGoal: day.waterGoal,
            satisfied: day.satisfied,
            unsatisfied: day.unsatisfied,
            userName,
          },
        });
        await saveDay({
          ...day,
          reportRating: result.rating,
          reportTone: result.tone,
          reportMessage: result.message,
          reportGeneratedAt: Date.now(),
        });
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Daily rating ready", {
              body: `${result.rating.toFixed(1)}/5 — open Journal to read your report.`,
              icon: "/icon-512.png",
            });
          }
        } catch {}
      } catch {}
    });
  }, [runReport, userName]);

  return null;
}
