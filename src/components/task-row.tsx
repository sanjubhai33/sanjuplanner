import { Link } from "@tanstack/react-router";
import type { Task } from "@/lib/tasks";
import { useToggleTask } from "@/lib/use-tasks";
import { cn } from "@/lib/utils";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-primary",
  high: "bg-destructive",
};

export function TaskRow({ task }: { task: Task }) {
  const toggle = useToggleTask();
  return (
    <li className="group flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
      <button
        type="button"
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        onClick={() => toggle.mutate(task.id)}
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center",
          task.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 bg-transparent",
        )}
      >
        {task.completed && (
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
      <Link
        to="/task/$id"
        params={{ id: task.id }}
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex-1 truncate text-sm font-medium",
              task.completed && "text-muted-foreground line-through",
            )}
          >
            {task.title || "Untitled task"}
          </span>
          <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[task.priority])} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {task.startTime ? (
            <span>
              {task.startTime} · {formatDuration(task.duration)}
            </span>
          ) : (
            <span>All day</span>
          )}
          {task.notes && <span className="truncate">· {task.notes}</span>}
        </div>
      </Link>
    </li>
  );
}

function formatDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
