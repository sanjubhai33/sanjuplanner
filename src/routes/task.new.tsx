import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  newTask,
  type Priority,
  type Task,
} from "@/lib/tasks";
import { useTasks, useUpsertTask, useDeleteTask } from "@/lib/use-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  date: z.string().optional(),
});

export const Route = createFileRoute("/task/new")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "New task — Daily Planner" },
      { name: "description", content: "Add a new task to your planner." },
    ],
  }),
  component: NewTaskPage,
});

function NewTaskPage() {
  const search = Route.useSearch();
  const [task] = useState<Task>(() =>
    newTask(search.date ? { date: search.date } : {}),
  );
  return <TaskEditor initial={task} isNew />;
}

export function TaskEditor({
  initial,
  isNew,
}: {
  initial: Task;
  isNew?: boolean;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const upsert = useUpsertTask();
  const remove = useDeleteTask();
  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime ?? "");
  const [duration, setDuration] = useState(String(initial.duration));
  const [priority, setPriority] = useState<Priority>(initial.priority);

  async function save() {
    if (!title.trim()) return;
    await upsert.mutateAsync({
      ...initial,
      title: title.trim(),
      notes: notes.trim(),
      date,
      startTime: startTime || null,
      duration: Math.max(0, Number(duration) || 0),
      priority,
    });
    router.history.back();
  }

  async function del() {
    if (!confirm("Delete this task?")) return;
    await remove.mutateAsync(initial.id);
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.history.back()}
          className="text-sm font-medium text-muted-foreground"
        >
          ← Back
        </button>
        {!isNew && (
          <button onClick={del} className="text-sm font-medium text-destructive">
            Delete
          </button>
        )}
      </div>

      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        {isNew ? "New task" : "Edit task"}
      </h1>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            autoFocus={isNew}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className="mt-1 text-base"
          />
        </div>

        <div>
          <Label htmlFor="notes">Details</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes, links, sub-steps…"
            rows={4}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="time">Start time</Label>
            <Input
              id="time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="dur">Duration (minutes)</Label>
          <Input
            id="dur"
            type="number"
            min={0}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Priority</Label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  priority === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={save}
          disabled={!title.trim() || upsert.isPending}
          className="w-full h-12 text-base"
        >
          {isNew ? "Add task" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
