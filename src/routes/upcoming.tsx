import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTasks } from "@/lib/use-tasks";
import { todayISO } from "@/lib/tasks";
import { TaskRow } from "@/components/task-row";
import { AddButton } from "@/components/add-button";

export const Route = createFileRoute("/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming — Daily Planner" },
      { name: "description", content: "All your upcoming and past tasks, grouped by day." },
    ],
  }),
  component: UpcomingPage,
});

function UpcomingPage() {
  const { data: tasks = [] } = useTasks();
  const today = todayISO();

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (!groups.has(t.date)) groups.set(t.date, []);
      groups.get(t.date)!.push(t);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => ({
        date,
        list: list.sort((a, b) => {
          if (!a.startTime && !b.startTime) return a.createdAt - b.createdAt;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        }),
      }));
  }, [tasks]);

  const upcoming = grouped.filter((g) => g.date >= today);
  const past = grouped.filter((g) => g.date < today).reverse();

  return (
    <div className="mx-auto max-w-md px-5 pt-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Everything
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Upcoming</h1>
      </header>

      {tasks.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing planned yet.
        </p>
      )}

      {upcoming.map((g) => (
        <DayGroup key={g.date} date={g.date} tasks={g.list} today={today} />
      ))}

      {past.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Past ({past.reduce((n, g) => n + g.list.length, 0)})
          </summary>
          <div className="mt-4">
            {past.map((g) => (
              <DayGroup key={g.date} date={g.date} tasks={g.list} today={today} />
            ))}
          </div>
        </details>
      )}

      <AddButton />
    </div>
  );
}

function DayGroup({
  date,
  tasks,
  today,
}: {
  date: string;
  tasks: ReturnType<typeof useTasks>["data"] extends infer T ? T extends undefined ? never : NonNullable<T> : never;
  today: string;
}) {
  const label = formatDayLabel(date, today);
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h2>
      <ul className="space-y-2">
        {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
      </ul>
    </section>
  );
}

function formatDayLabel(iso: string, today: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const t = new Date(today.slice(0, 4) + "-" + today.slice(5, 7) + "-" + today.slice(8));
  const diff = Math.round((date.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}
