import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { RemindersManager } from "@/components/reminders-manager";
import { SyncManager } from "@/components/sync-manager";
import { useSession, useDisplayName } from "@/lib/session";
import { useTasks, useToggleTask, useUpsertTask, useDeleteTask } from "@/lib/use-tasks";
import { newTask, todayISO as taskTodayISO, type Priority, type Task } from "@/lib/tasks";
import { todayISO, loadRecentDays, type DayEntry } from "@/lib/journal";
import { useDay, useUpdateDay } from "@/lib/use-journal";
import { ensureReminders } from "@/lib/reminders";
import { generateDailyReportOnline } from "@/lib/report-client";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient();

type Tab = "today" | "upcoming" | "calendar" | "journal";

export function MobileApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileErrorBoundary>
        <MobileRuntime />
      </MobileErrorBoundary>
    </QueryClientProvider>
  );
}

function MobileErrorBoundary({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => setError(event.message || "App failed to start.");
    const onRejection = (event: PromiseRejectionEvent) =>
      setError(event.reason instanceof Error ? event.reason.message : "App failed to start.");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-background px-5 py-10 text-foreground">
        <h1 className="text-2xl font-semibold">Daily Planner</h1>
        <p className="mt-3 text-sm text-destructive">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Restart app
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function MobileRuntime() {
  const { session, user, loading } = useSession();

  if (loading) return <LoadingScreen />;
  if (!session) return <MobileAuth />;
  return <MobileShell user={user} />;
}

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-5 text-center text-sm text-muted-foreground">
      Loading Daily Planner…
    </div>
  );
}

function MobileAuth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const displayName = name.trim();
        if (!displayName) throw new Error("Enter your name first.");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName, full_name: displayName },
          },
        });
        if (error) throw error;
        setMessage("Account created. If asked, sign in with the same email and password.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setMessage("");
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-bold">Daily Planner</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to keep your old data safe." : "Create your planner account."}
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-8 w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <TextField label="Your name" value={name} onChange={setName} autoComplete="name" placeholder="Your name" />
          )}
          <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
          <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" />
          <button
            type="submit"
            disabled={busy || !email.trim() || password.length < 6}
            className="h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message && <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-sm font-medium text-primary"
        >
          {mode === "signin" ? "New account" : "Already have an account"}
        </button>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function MobileShell({ user }: { user: ReturnType<typeof useSession>["user"] }) {
  const [tab, setTab] = useState<Tab>("today");
  const [editing, setEditing] = useState<Task | null>(null);
  const name = useDisplayName(user);
  const qc = useQueryClient();

  useEffect(() => {
    ensureReminders();
    const onFocus = () => ensureReminders();
    const onVisible = () => {
      if (!document.hidden) ensureReminders();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  }

  if (editing) {
    return <TaskEditor initial={editing} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <RemindersManager />
      <SyncManager />
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <div>
          <p className="text-xs text-muted-foreground">Hello</p>
          <h1 className="text-lg font-semibold">{name || "there"}</h1>
        </div>
        <button onClick={signOut} className="text-xs font-medium text-muted-foreground">
          Sign out
        </button>
      </header>

      <main className="pb-28">
        {tab === "today" && <TodayScreen onEdit={setEditing} />}
        {tab === "upcoming" && <UpcomingScreen onEdit={setEditing} />}
        {tab === "calendar" && <CalendarScreen onEdit={setEditing} />}
        {tab === "journal" && <JournalScreen />}
      </main>

      {tab !== "journal" && tab !== "calendar" && (
        <button
          type="button"
          onClick={() => setEditing(newTask({ date: taskTodayISO() }))}
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95"
          aria-label="Add task"
        >
          +
        </button>
      )}
      <MobileNav active={tab} onChange={setTab} />
    </div>
  );
}

function TodayScreen({ onEdit }: { onEdit: (task: Task) => void }) {
  const { data: tasks = [] } = useTasks();
  const today = taskTodayISO();
  const todays = useMemo(
    () => tasks.filter((task) => task.date === today).sort(sortTasks),
    [tasks, today],
  );
  const done = todays.filter((task) => task.completed).length;

  return (
    <section className="mx-auto max-w-md px-5 pt-8">
      <p className="text-xs uppercase text-muted-foreground">Today</p>
      <h2 className="mt-1 text-3xl font-semibold">Your tasks</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {todays.length ? `${done} of ${todays.length} complete` : "Nothing planned yet. Tap + to add a task."}
      </p>
      <TaskList className="mt-6" tasks={todays} onEdit={onEdit} />
    </section>
  );
}

function UpcomingScreen({ onEdit }: { onEdit: (task: Task) => void }) {
  const { data: tasks = [] } = useTasks();
  const today = taskTodayISO();
  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!map.has(task.date)) map.set(task.date, []);
      map.get(task.date)!.push(task);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  return (
    <section className="mx-auto max-w-md px-5 pt-8">
      <p className="text-xs uppercase text-muted-foreground">Everything</p>
      <h2 className="mt-1 text-3xl font-semibold">Upcoming</h2>
      <div className="mt-6 space-y-6">
        {groups.length === 0 && <EmptyBox text="Nothing planned yet." />}
        {groups.map(([date, list]) => (
          <div key={date}>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{formatDayLabel(date, today)}</h3>
            <TaskList tasks={[...list].sort(sortTasks)} onEdit={onEdit} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CalendarScreen({ onEdit }: { onEdit: (task: Task) => void }) {
  const { data: tasks = [] } = useTasks();
  const [selected, setSelected] = useState(taskTodayISO());
  const dayTasks = useMemo(
    () => tasks.filter((task) => task.date === selected).sort(sortTasks),
    [tasks, selected],
  );

  return (
    <section className="mx-auto max-w-md px-5 pt-8">
      <p className="text-xs uppercase text-muted-foreground">Calendar</p>
      <h2 className="mt-1 text-3xl font-semibold">Pick a date</h2>
      <input
        type="date"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="mt-5 h-12 w-full rounded-lg border border-border bg-card px-3 text-sm"
      />
      <TaskList className="mt-6" tasks={dayTasks} onEdit={onEdit} />
      <button
        type="button"
        onClick={() => onEdit(newTask({ date: selected }))}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95"
        aria-label="Add task"
      >
        +
      </button>
    </section>
  );
}

function TaskList({ tasks, onEdit, className }: { tasks: Task[]; onEdit: (task: Task) => void; className?: string }) {
  if (tasks.length === 0) return <EmptyBox className={className} text="A quiet day." />;
  return (
    <ul className={cn("space-y-2", className)}>
      {tasks.map((task) => (
        <MobileTaskRow key={task.id} task={task} onEdit={onEdit} />
      ))}
    </ul>
  );
}

function MobileTaskRow({ task, onEdit }: { task: Task; onEdit: (task: Task) => void }) {
  const toggle = useToggleTask();
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
      <button
        type="button"
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        onClick={() => toggle.mutate(task.id)}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          task.completed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {task.completed ? "✓" : ""}
      </button>
      <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
        <span className={cn("block truncate text-sm font-medium", task.completed && "text-muted-foreground line-through")}>{task.title || "Untitled task"}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {task.startTime ? `${task.startTime} · ${task.duration}m` : "All day"}
          {task.notes ? ` · ${task.notes}` : ""}
        </span>
      </button>
    </li>
  );
}

function TaskEditor({ initial, onClose }: { initial: Task; onClose: () => void }) {
  const upsert = useUpsertTask();
  const remove = useDeleteTask();
  const isNew = !initial.title;
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
    onClose();
  }

  async function deleteTask() {
    if (!window.confirm("Delete this task?")) return;
    await remove.mutateAsync(initial.id);
    onClose();
  }

  return (
    <div className="min-h-[100dvh] bg-background px-5 py-6 text-foreground">
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={onClose} className="text-sm font-medium text-muted-foreground">← Back</button>
          {!isNew && <button onClick={deleteTask} className="text-sm font-medium text-destructive">Delete</button>}
        </div>
        <h1 className="text-2xl font-semibold">{isNew ? "New task" : "Edit task"}</h1>
        <div className="mt-5 space-y-4">
          <TextField label="Title" value={title} onChange={setTitle} placeholder="What needs doing?" />
          <label className="block text-sm font-medium">
            <span className="text-xs text-muted-foreground">Details</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Notes, links, sub-steps…"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Date" type="date" value={date} onChange={setDate} />
            <TextField label="Start time" type="time" value={startTime} onChange={setStartTime} />
          </div>
          <TextField label="Duration minutes" type="number" value={duration} onChange={setDuration} />
          <div>
            <p className="text-xs text-muted-foreground">Priority</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as Priority[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPriority(item)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium capitalize",
                    priority === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={!title.trim()} className="h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
            Save task
          </button>
        </div>
      </div>
    </div>
  );
}

function JournalScreen() {
  const date = todayISO();
  const { data: day } = useDay(date);
  const { data: tasks = [] } = useTasks();
  const update = useUpdateDay(date);
  const { user } = useSession();
  const userName = useDisplayName(user);
  const [recentDays, setRecentDays] = useState<DayEntry[]>([]);

  useEffect(() => {
    loadRecentDays(8).then(setRecentDays);
  }, [day?.updatedAt]);

  const todaysTasks = tasks.filter((task) => task.date === date);
  const completed = todaysTasks.filter((task) => task.completed).length;
  const history = recentDays
    .filter((entry) => entry.date !== date)
    .map((entry) => {
      const dayTasks = tasks.filter((task) => task.date === entry.date);
      return {
        date: entry.date,
        totalTasks: dayTasks.length,
        completedTasks: dayTasks.filter((task) => task.completed).length,
        waterCount: entry.waterCount,
        waterGoal: entry.waterGoal,
        satisfiedCount: entry.satisfied.length,
        unsatisfiedCount: entry.unsatisfied.length,
        rating: entry.reportRating,
      };
    });

  if (!day) return <LoadingScreen />;

  return (
    <section className="mx-auto max-w-md space-y-5 px-5 pt-8">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Journal</p>
        <h2 className="mt-1 text-3xl font-semibold">Reflect</h2>
      </div>
      <WaterPanel count={day.waterCount} goal={day.waterGoal} onCount={(waterCount) => update.mutate({ waterCount })} onGoal={(waterGoal) => update.mutate({ waterGoal })} />
      <NotesPanel title="Satisfied ✅" items={day.satisfied} onChange={(satisfied) => update.mutate({ satisfied })} placeholder="Good work today…" />
      <NotesPanel title="Unsatisfied ⚠️" items={day.unsatisfied} onChange={(unsatisfied) => update.mutate({ unsatisfied })} placeholder="Slip or distraction…" />
      <ReportPanel
        input={{
          date,
          totalTasks: todaysTasks.length,
          completedTasks: completed,
          waterCount: day.waterCount,
          waterGoal: day.waterGoal,
          satisfied: day.satisfied,
          unsatisfied: day.unsatisfied,
          history,
          userName,
        }}
        rating={day.reportRating}
        message={day.reportMessage}
        onReport={(report) =>
          update.mutate({
            reportRating: report.rating,
            reportTone: report.tone,
            reportMessage: report.message,
            reportGeneratedAt: Date.now(),
          })
        }
      />
    </section>
  );
}

function WaterPanel({ count, goal, onCount, onGoal }: { count: number; goal: number; onCount: (value: number) => void; onGoal: (value: number) => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Water</h3>
          <p className="mt-1 text-2xl font-semibold">{count}<span className="text-muted-foreground">/{goal}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onCount(Math.max(0, count - 1))} className="h-10 w-10 rounded-full border border-border">−</button>
          <button onClick={() => onCount(count + 1)} className="h-10 w-10 rounded-full bg-primary text-primary-foreground">+</button>
        </div>
      </div>
      <label className="mt-3 block text-xs text-muted-foreground">
        Goal
        <input type="number" min={1} max={20} value={goal} onChange={(event) => onGoal(Math.max(1, Number(event.target.value) || 1))} className="ml-2 h-8 w-16 rounded border border-border bg-background px-2" />
      </label>
    </section>
  );
}

function NotesPanel({ title, items, onChange, placeholder }: { title: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="flex-1 whitespace-pre-wrap break-words">{item}</span>
            <button onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="text-muted-foreground">×</button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft.trim();
          if (!value) return;
          onChange([...items, value]);
          setDraft("");
        }}
      >
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Add</button>
      </form>
    </section>
  );
}

function ReportPanel({ input, rating, message, onReport }: { input: Parameters<typeof generateDailyReportOnline>[0]; rating?: number; message?: string; onReport: (report: { rating: number; tone: "proud" | "shame" | "mixed"; message: string }) => void }) {
  const mutation = useMutation({
    mutationFn: () => generateDailyReportOnline(input),
    onSuccess: onReport,
  });

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Daily report</h3>
        {rating !== undefined && <span className="text-sm font-semibold text-primary">{rating.toFixed(1)}/5</span>}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{message || "Generate your rating after completing tasks and journal."}</p>
      <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="mt-3 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {mutation.isPending ? "Checking…" : "Generate report"}
      </button>
    </section>
  );
}

function MobileNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "upcoming", label: "Upcoming" },
    { id: "calendar", label: "Calendar" },
    { id: "journal", label: "Journal" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => onChange(tab.id)} className={cn("py-4 text-xs font-medium", active === tab.id ? "text-primary" : "text-muted-foreground")}>{tab.label}</button>
        ))}
      </div>
    </nav>
  );
}

function EmptyBox({ text, className }: { text: string; className?: string }) {
  return <p className={cn("rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground", className)}>{text}</p>;
}

function sortTasks(a: Task, b: Task) {
  if (!a.startTime && !b.startTime) return a.createdAt - b.createdAt;
  if (!a.startTime) return 1;
  if (!b.startTime) return -1;
  return a.startTime.localeCompare(b.startTime);
}

function formatDayLabel(iso: string, today: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (iso === today) return "Today";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}