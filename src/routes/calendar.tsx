import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTasks } from "@/lib/use-tasks";
import { todayISO } from "@/lib/tasks";
import { TaskRow } from "@/components/task-row";
import { AddButton } from "@/components/add-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Daily Planner" },
      { name: "description", content: "Browse any day and see its tasks." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const [selected, setSelected] = useState(todayISO());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const countsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) m.set(t.date, (m.get(t.date) ?? 0) + 1);
    return m;
  }, [tasks]);

  const dayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.date === selected)
        .sort((a, b) => (a.startTime ?? "z").localeCompare(b.startTime ?? "z")),
    [tasks, selected],
  );

  return (
    <div className="mx-auto max-w-md px-5 pt-10">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Calendar
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h1>
        </div>
        <div className="flex gap-1">
          <button
            aria-label="Previous month"
            onClick={() =>
              setCursor((c) =>
                c.month === 0
                  ? { year: c.year - 1, month: 11 }
                  : { year: c.year, month: c.month - 1 },
              )
            }
            className="h-9 w-9 rounded-full border border-border bg-card"
          >
            ‹
          </button>
          <button
            aria-label="Next month"
            onClick={() =>
              setCursor((c) =>
                c.month === 11
                  ? { year: c.year + 1, month: 0 }
                  : { year: c.year, month: c.month + 1 },
              )
            }
            className="h-9 w-9 rounded-full border border-border bg-card"
          >
            ›
          </button>
        </div>
      </header>

      <MonthGrid
        year={cursor.year}
        month={cursor.month}
        selected={selected}
        onSelect={setSelected}
        counts={countsByDate}
      />

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {new Date(selected + "T00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        {dayTasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No tasks on this day.
          </p>
        ) : (
          <ul className="space-y-2">
            {dayTasks.map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
        )}
      </section>

      <AddButton date={selected} />
    </div>
  );
}

function MonthGrid({
  year,
  month,
  selected,
  onSelect,
  counts,
}: {
  year: number;
  month: number;
  selected: string;
  onSelect: (iso: string) => void;
  counts: Map<string, number>;
}) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ iso, day: d });
  }
  const today = todayISO();
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {weekdays.map((w, i) => <div key={i} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const isSelected = c.iso === selected;
          const isToday = c.iso === today;
          const count = counts.get(c.iso) ?? 0;
          return (
            <button
              key={i}
              onClick={() => onSelect(c.iso)}
              className={cn(
                "relative aspect-square rounded-lg text-sm transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-secondary",
              )}
            >
              {c.day}
              {count > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
