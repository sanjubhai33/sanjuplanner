import localforage from "localforage";
import { supabase } from "@/integrations/supabase/client";

export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  notes: string;
  date: string;
  startTime: string | null;
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
});

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

type Row = {
  id: string;
  title: string;
  notes: string;
  date: string;
  start_time: string | null;
  duration: number;
  priority: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

function rowToTask(r: Row): Task {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes ?? "",
    date: r.date,
    startTime: r.start_time,
    duration: r.duration,
    priority: (r.priority as Priority) ?? "medium",
    completed: r.completed,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

async function loadLocal(): Promise<Task[]> {
  return (await store.getItem<Task[]>(STORE_KEY)) ?? [];
}
async function saveLocal(tasks: Task[]) {
  await store.setItem(STORE_KEY, tasks);
}

let migratedForUser: string | null = null;
async function migrateLocalIfNeeded(userId: string) {
  if (migratedForUser === userId) return;
  migratedForUser = userId;
  const flagKey = `migrated_tasks_${userId}`;
  const already = await store.getItem<boolean>(flagKey);
  if (already) return;
  const local = await loadLocal();
  if (local.length > 0) {
    const rows = local.map((t) => ({
      id: t.id,
      user_id: userId,
      title: t.title,
      notes: t.notes,
      date: t.date,
      start_time: t.startTime,
      duration: t.duration,
      priority: t.priority,
      completed: t.completed,
    }));
    await supabase.from("tasks").upsert(rows, { onConflict: "id" });
  }
  await store.setItem(flagKey, true);
}

export async function loadTasks(): Promise<Task[]> {
  const uid = await currentUserId();
  if (!uid) return loadLocal();
  await migrateLocalIfNeeded(uid);
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", uid)
    .order("date", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(rowToTask);
}

export async function upsertTask(task: Task): Promise<Task[]> {
  const uid = await currentUserId();
  if (!uid) {
    const tasks = await loadLocal();
    const idx = tasks.findIndex((t) => t.id === task.id);
    const next = [...tasks];
    const withTs = { ...task, updatedAt: Date.now() };
    if (idx >= 0) next[idx] = withTs;
    else next.push(withTs);
    await saveLocal(next);
    return next;
  }
  await supabase.from("tasks").upsert(
    {
      id: task.id,
      user_id: uid,
      title: task.title,
      notes: task.notes,
      date: task.date,
      start_time: task.startTime,
      duration: task.duration,
      priority: task.priority,
      completed: task.completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return loadTasks();
}

export async function deleteTask(id: string): Promise<Task[]> {
  const uid = await currentUserId();
  if (!uid) {
    const next = (await loadLocal()).filter((t) => t.id !== id);
    await saveLocal(next);
    return next;
  }
  await supabase.from("tasks").delete().eq("id", id).eq("user_id", uid);
  return loadTasks();
}

export async function toggleTask(id: string): Promise<Task[]> {
  const uid = await currentUserId();
  if (!uid) {
    const next = (await loadLocal()).map((t) =>
      t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t,
    );
    await saveLocal(next);
    return next;
  }
  const { data } = await supabase
    .from("tasks")
    .select("completed")
    .eq("id", id)
    .eq("user_id", uid)
    .maybeSingle();
  if (data) {
    await supabase
      .from("tasks")
      .update({ completed: !data.completed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", uid);
  }
  return loadTasks();
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
