import { useEffect } from "react";
import { useTasks } from "@/lib/use-tasks";
import { useDay } from "@/lib/use-journal";
import { todayISO } from "@/lib/journal";

/**
 * Mirrors today's summary into native storage so the Android home-screen
 * widget can render it without opening the app. No-op on the web.
 */
export function WidgetSync() {
  const date = todayISO();
  const { data: tasks } = useTasks();
  const { data: day } = useDay(date);

  useEffect(() => {
    if (!tasks) return;
    const todays = tasks.filter((t) => t.date === date);
    const done = todays.filter((t) => t.completed).length;
    const next = todays
      .filter((t) => !t.completed)
      .sort((a, b) => (a.startTime ?? "z").localeCompare(b.startTime ?? "z"))[0];

    const summary = {
      date,
      total: todays.length,
      done,
      water: day?.waterCount ?? 0,
      waterGoal: day?.waterGoal ?? 8,
      nextTitle: next?.title ?? "",
      nextTime: next?.startTime ?? "",
      rating: day?.reportRating ?? null,
      updatedAt: Date.now(),
    };

    let cancelled = false;
    (async () => {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        if (cancelled) return;
        await Preferences.set({ key: "widget_summary", value: JSON.stringify(summary) });
      } catch {
        // Web build or plugin unavailable — widget simply stays stale.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tasks, day, date]);

  return null;
}
