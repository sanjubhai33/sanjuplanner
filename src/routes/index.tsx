import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTasks } from "@/lib/use-tasks";
import { todayISO } from "@/lib/tasks";
import { TaskRow } from "@/components/task-row";
import { AddButton } from "@/components/add-button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Daily Planner" },
      { name: "description", content: "Your timeline for today. Offline daily planner." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { data: tasks = [] } = useTasks();
  const today = todayISO();

  const todays = useMemo(
    () =>
      tasks
        .filter((t) => t.date === today)
        .sort((a, b) => {
          if (!a.startTime && !b.startTime) return a.createdAt - b.createdAt;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        }),
    [tasks, today],
  );

  const done = todays.filter((t) => t.completed).length;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-md px-5 pt-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {todays.length === 0
            ? "Nothing planned yet. Tap + to add your first task."
            : `${done} of ${todays.length} complete`}
        </p>
      </header>

      {todays.length > 0 ? (
        <Timeline tasks={todays} />
      ) : (
        <EmptyState />
      )}

      <AddButton date={today} />
    </div>
  );
}

function Timeline({ tasks }: { tasks: ReturnType<typeof useTasks>["data"] extends infer T ? T extends undefined ? never : NonNullable<T> : never }) {
  const timed = tasks.filter((t) => t.startTime);
  const allDay = tasks.filter((t) => !t.startTime);
  return (
    <div className="space-y-6">
      {allDay.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            All day
          </h2>
          <ul className="space-y-2">
            {allDay.map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
        </section>
      )}
      {timed.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline
          </h2>
          <ul className="space-y-3">
            {timed.map((t) => (
              <li key={t.id} className="flex gap-3">
                <div className="w-14 shrink-0 pt-3 text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {t.startTime}
                </div>
                <div className="relative flex-1">
                  <div className="absolute -left-1.5 top-4 h-2 w-2 rounded-full bg-primary" />
                  <div className="border-l border-dashed border-border pl-4">
                    <ul>
                      <TaskRow task={t} />
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v8M8 12h8" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">A quiet day.</p>
      <Link to="/task/new" className="mt-3 inline-block text-sm font-medium text-primary">
        Plan something →
      </Link>
    </div>
  );
}
