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

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

type Row = {
  id: string;
  title: string;
  notes: string | null;
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

function taskToRow(t: Task, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    notes: t.notes,
    date: t.date,
    start_time: t.startTime,
    duration: t.duration,
    priority: t.priority,
    completed: t.completed,
    updated_at: new Date(t.updatedAt).toISOString(),
  };
}

async function loadLocal(): Promise<Task[]> {
  return (await store.getItem<Task[]>(STORE_KEY)) ?? [];
}
async function saveLocal(tasks: Task[]) {
  await store.setItem(STORE_KEY, tasks);
}

/** Merge cloud rows + local, newer updatedAt wins. */
function mergeTasks(local: Task[], cloud: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const t of local) map.set(t.id, t);
  for (const c of cloud) {
    const existing = map.get(c.id);
    if (!existing || c.updatedAt >= existing.updatedAt) map.set(c.id, c);
  }
  return [...map.values()];
}

let syncing = false;
/** Pull from cloud + push local; safe to call anytime. Silent on failure. */
export async function syncTasks(): Promise<Task[] | null> {
  if (syncing) return null;
  const uid = await currentUserId();
  if (!uid || !isOnline()) return null;
  syncing = true;
  try {
    const local = await loadLocal();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", uid);
    if (error || !data) return null;
    const cloud = (data as Row[]).map(rowToTask);
    const merged = mergeTasks(local, cloud);
    await saveLocal(merged);

    // Push anything local has that's newer or missing in cloud
    const cloudMap = new Map(cloud.map((c) => [c.id, c]));
    const toPush = merged.filter((t) => {
      const c = cloudMap.get(t.id);
      return !c || t.updatedAt > c.updatedAt;
    });
    if (toPush.length > 0) {
      await supabase
        .from("tasks")
        .upsert(toPush.map((t) => taskToRow(t, uid)), { onConflict: "id" });
    }
    return merged;
  } catch {
    return null;
  } finally {
    syncing = false;
  }
}

async function pushOne(task: Task) {
  const uid = await currentUserId();
  if (!uid || !isOnline()) return;
  try {
    await supabase
      .from("tasks")
      .upsert(taskToRow(task, uid), { onConflict: "id" });
  } catch {
    /* ignore, will sync later */
  }
}

async function deleteOne(id: string) {
  const uid = await currentUserId();
  if (!uid || !isOnline()) return;
  try {
    await supabase.from("tasks").delete().eq("id", id).eq("user_id", uid);
  } catch {
    /* ignore */
  }
}

export async function loadTasks(): Promise<Task[]> {
  return loadLocal();
}

export async function upsertTask(task: Task): Promise<Task[]> {
  const tasks = await loadLocal();
  const idx = tasks.findIndex((t) => t.id === task.id);
  const next = [...tasks];
  const withTs = { ...task, updatedAt: Date.now() };
  if (idx >= 0) next[idx] = withTs;
  else next.push(withTs);
  await saveLocal(next);
  void pushOne(withTs);
  return next;
}

export async function deleteTask(id: string): Promise<Task[]> {
  const next = (await loadLocal()).filter((t) => t.id !== id);
  await saveLocal(next);
  void deleteOne(id);
  return next;
}

export async function toggleTask(id: string): Promise<Task[]> {
  const now = Date.now();
  const next = (await loadLocal()).map((t) =>
    t.id === id ? { ...t, completed: !t.completed, updatedAt: now } : t,
  );
  await saveLocal(next);
  const changed = next.find((t) => t.id === id);
  if (changed) void pushOne(changed);
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
