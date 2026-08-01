import { useDay } from "@/lib/use-journal";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/tasks";

/** Read-only record of a given day: water, satisfied/unsatisfied notes, AI report. */
export function DayRecord({
  date,
  tasks,
  className,
}: {
  date: string;
  tasks: Task[];
  className?: string;
}) {
  const { data: day } = useDay(date);
  const completed = tasks.filter((t) => t.completed).length;

  if (!day) return null;

  const hasNotes = day.satisfied.length > 0 || day.unsatisfied.length > 0;
  const hasAny = hasNotes || day.waterCount > 0 || tasks.length > 0 || !!day.reportMessage;

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Day record
      </h3>

      {!hasAny ? (
        <p className="mt-2 text-sm text-muted-foreground">No record saved for this day.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Tasks done" value={`${completed}/${tasks.length}`} />
            <Stat label="Water" value={`${day.waterCount}/${day.waterGoal} glasses`} />
          </div>

          <NoteList title="Satisfied" items={day.satisfied} tone="good" />
          <NoteList title="Unsatisfied" items={day.unsatisfied} tone="bad" />

          {day.reportMessage && (
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI report
                </span>
                {typeof day.reportRating === "number" && (
                  <span className="text-sm font-semibold">
                    {day.reportRating.toFixed(1)} / 5 ★
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {day.reportMessage}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function NoteList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad";
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              tone === "good"
                ? "bg-primary/10 text-foreground"
                : "bg-destructive/10 text-foreground",
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
