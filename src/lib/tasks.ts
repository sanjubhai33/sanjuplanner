import localforage from "localforage";

export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  notes: string;
  /** ISO date only, YYYY-MM-DD */
  date: string;
  /** HH:mm 24h, or null for all-day */
  startTime: string | null;
  /** minutes */
  duration: number;
  priority: Priority;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

const STORE_KEY = "tasks";

const store = localforage.createInstance({
  name: "daily-planner",
  storeName: "tasks",
  description: "Offline daily planner tasks",
});

export async function loadTasks(): Promise<Task[]> {
  const raw = await store.getItem<Task[]>(STORE_KEY);
  return raw ?? [];
}

async function saveTasks(tasks: Task[]) {
  await store.setItem(STORE_KEY, tasks);
}

export async function upsertTask(task: Task): Promise<Task[]> {
  const tasks = await loadTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  const next = [...tasks];
  if (idx >= 0) next[idx] = { ...task, updatedAt: Date.now() };
  else next.push({ ...task, updatedAt: Date.now() });
  await saveTasks(next);
  return next;
}

export async function deleteTask(id: string): Promise<Task[]> {
  const tasks = await loadTasks();
  const next = tasks.filter((t) => t.id !== id);
  await saveTasks(next);
  return next;
}

export async function toggleTask(id: string): Promise<Task[]> {
  const tasks = await loadTasks();
  const next = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t,
  );
  await saveTasks(next);
  return next;
}

export function newTask(partial: Partial<Task> = {}): Task {
  const now = Date.now();
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(now) + Math.random().toString(36).slice(2),
    title: "",
    notes: "",
    date: `${y}-${m}-${d}`,
    startTime: null,
    duration: 30,
    priority: "medium",
    completed: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
