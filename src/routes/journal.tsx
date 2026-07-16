import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { todayISO, loadRecentDays, type DayEntry } from "@/lib/journal";
import { useDay, useUpdateDay } from "@/lib/use-journal";
import { useTasks } from "@/lib/use-tasks";
import { ensureReminders } from "@/lib/reminders";
import { generateDailyReport } from "@/lib/report.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Journal — Daily Planner" },
      { name: "description", content: "Water tracker, satisfied and unsatisfied notes, and your AI daily report." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const date = todayISO();
  const { data: day } = useDay(date);
  const { data: tasks = [] } = useTasks();
  const update = useUpdateDay(date);

  const [recentDays, setRecentDays] = useState<DayEntry[]>([]);
  useEffect(() => {
    ensureReminders();
    loadRecentDays(8).then(setRecentDays);
  }, [day?.updatedAt]);

  const todaysTasks = tasks.filter((t) => t.date === date);
  const completed = todaysTasks.filter((t) => t.completed).length;

  const history = useMemo(() => {
    return recentDays
      .filter((d) => d.date !== date)
      .map((d) => {
        const dayTasks = tasks.filter((t) => t.date === d.date);
        return {
          date: d.date,
          totalTasks: dayTasks.length,
          completedTasks: dayTasks.filter((t) => t.completed).length,
          waterCount: d.waterCount,
          waterGoal: d.waterGoal,
          satisfiedCount: d.satisfied.length,
          unsatisfiedCount: d.unsatisfied.length,
          rating: d.reportRating,
        };
      });
  }, [recentDays, tasks, date]);

  if (!day) return null;

  return (
    <div className="mx-auto max-w-md px-5 pt-10 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Today's Journal
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reflect</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track water, note wins and slips, and get your daily AI report.
        </p>
      </header>

      <WaterCard
        count={day.waterCount}
        goal={day.waterGoal}
        onChange={(waterCount) => update.mutate({ waterCount })}
        onGoal={(waterGoal) => update.mutate({ waterGoal })}
      />

      <NoteList
        title="Satisfied ✅"
        subtitle="Things you're proud of today"
        placeholder="e.g. Finished study, prayed, workout…"
        items={day.satisfied}
        accent="satisfied"
        onChange={(satisfied) => update.mutate({ satisfied })}
      />

      <NoteList
        title="Unsatisfied ⚠️"
        subtitle="Slips, distractions, things to avoid"
        placeholder="e.g. Wasted time on Instagram, chatting…"
        items={day.unsatisfied}
        accent="unsatisfied"
        onChange={(unsatisfied) => update.mutate({ unsatisfied })}
      />

      <ReportCard
        date={date}
        totalTasks={todaysTasks.length}
        completedTasks={completed}
        waterCount={day.waterCount}
        waterGoal={day.waterGoal}
        satisfied={day.satisfied}
        unsatisfied={day.unsatisfied}
        rating={day.reportRating}
        tone={day.reportTone}
        message={day.reportMessage}
        onReport={(r) =>
          update.mutate({
            reportRating: r.rating,
            reportTone: r.tone,
            reportMessage: r.message,
            reportGeneratedAt: Date.now(),
          })
        }
      />

      <p className="text-center text-xs text-muted-foreground pb-4">
        Reminders scheduled for 7:00 AM and 11:00 PM 💧
      </p>
    </div>
  );
}

function WaterCard({
  count,
  goal,
  onChange,
  onGoal,
}: {
  count: number;
  goal: number;
  onChange: (n: number) => void;
  onGoal: (n: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Water
          </h2>
          <p className="mt-1 text-2xl font-semibold">
            {count}
            <span className="text-muted-foreground">/{goal}</span>
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              glasses
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Remove one glass"
            onClick={() => onChange(Math.max(0, count - 1))}
            className="h-10 w-10 rounded-full border border-border bg-background text-lg"
          >
            −
          </button>
          <button
            aria-label="Add one glass"
            onClick={() => onChange(count + 1)}
            className="h-10 w-10 rounded-full bg-primary text-primary-foreground text-lg"
          >
            +
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: goal }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full",
              i < count ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Goal:</span>
        <Input
          type="number"
          min={1}
          max={20}
          value={goal}
          onChange={(e) => onGoal(Math.max(1, Number(e.target.value) || 1))}
          className="h-8 w-16 text-xs"
        />
        <span>glasses/day</span>
      </div>
    </section>
  );
}

function NoteList({
  title,
  subtitle,
  placeholder,
  items,
  accent,
  onChange,
}: {
  title: string;
  subtitle: string;
  placeholder: string;
  items: string[];
  accent: "satisfied" | "unsatisfied";
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
              accent === "satisfied"
                ? "border-primary/30 bg-primary/5"
                : "border-destructive/30 bg-destructive/5",
            )}
          >
            <span className="flex-1 whitespace-pre-wrap break-words">{it}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-xs text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground">Nothing yet.</li>
        )}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = draft.trim();
          if (!v) return;
          onChange([...items, v]);
          setDraft("");
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>
    </section>
  );
}

function ReportCard(props: {
  date: string;
  totalTasks: number;
  completedTasks: number;
  waterCount: number;
  waterGoal: number;
  satisfied: string[];
  unsatisfied: string[];
  rating?: number;
  tone?: "proud" | "shame" | "mixed";
  message?: string;
  onReport: (r: { rating: number; tone: "proud" | "shame" | "mixed"; message: string }) => void;
}) {
  const runReport = useServerFn(generateDailyReport);
  const m = useMutation({
    mutationFn: () =>
      runReport({
        data: {
          date: props.date,
          totalTasks: props.totalTasks,
          completedTasks: props.completedTasks,
          waterCount: props.waterCount,
          waterGoal: props.waterGoal,
          satisfied: props.satisfied,
          unsatisfied: props.unsatisfied,
        },
      }),
    onSuccess: (data) => props.onReport(data),
  });

  const tone = props.tone;
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        tone === "proud" && "border-primary/40 bg-primary/5",
        tone === "shame" && "border-destructive/40 bg-destructive/5",
        (!tone || tone === "mixed") && "border-border bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Daily AI Report
        </h2>
        {props.rating !== undefined && <Stars value={props.rating} />}
      </div>
      {props.message ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {props.message}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a report to see your rating and message.
        </p>
      )}
      <Button
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="mt-3 w-full"
      >
        {m.isPending
          ? "Judging your day…"
          : props.message
            ? "Re-generate report"
            : "Generate today's report"}
      </Button>
      {m.isError && (
        <p className="mt-2 text-xs text-destructive">
          Couldn't reach the AI. Check your connection and try again.
        </p>
      )}
    </section>
  );
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={cn(
            "h-4 w-4",
            i <= full ? "fill-primary text-primary" : "fill-muted text-muted",
          )}
        >
          <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-medium tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}
