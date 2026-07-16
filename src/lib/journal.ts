import localforage from "localforage";
import { supabase } from "@/integrations/supabase/client";

export type DayEntry = {
  date: string;
  waterCount: number;
  waterGoal: number;
  satisfied: string[];
  unsatisfied: string[];
  reportRating?: number;
  reportMessage?: string;
  reportTone?: "proud" | "shame" | "mixed";
  reportGeneratedAt?: number;
  updatedAt: number;
};

const store = localforage.createInstance({
  name: "daily-planner",
  storeName: "journal",
});

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function emptyDay(date: string): DayEntry {
  return {
    date,
    waterCount: 0,
    waterGoal: 8,
    satisfied: [],
    unsatisfied: [],
    updatedAt: Date.now(),
  };
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

type Row = {
  date: string;
  water_count: number;
  water_goal: number;
  satisfied: unknown;
  unsatisfied: unknown;
  report_rating: number | null;
  report_message: string | null;
  report_tone: string | null;
  report_generated_at: number | null;
  updated_at: string;
};

function rowToDay(r: Row): DayEntry {
  return {
    date: r.date,
    waterCount: r.water_count,
    waterGoal: r.water_goal,
    satisfied: Array.isArray(r.satisfied) ? (r.satisfied as string[]) : [],
    unsatisfied: Array.isArray(r.unsatisfied) ? (r.unsatisfied as string[]) : [],
    reportRating: r.report_rating ?? undefined,
    reportMessage: r.report_message ?? undefined,
    reportTone: (r.report_tone as DayEntry["reportTone"]) ?? undefined,
    reportGeneratedAt: r.report_generated_at ?? undefined,
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

function dayToRow(d: DayEntry, userId: string) {
  return {
    user_id: userId,
    date: d.date,
    water_count: d.waterCount,
    water_goal: d.waterGoal,
    satisfied: d.satisfied,
    unsatisfied: d.unsatisfied,
    report_rating: d.reportRating ?? null,
    report_message: d.reportMessage ?? null,
    report_tone: d.reportTone ?? null,
    report_generated_at: d.reportGeneratedAt ?? null,
    updated_at: new Date(d.updatedAt).toISOString(),
  };
}

export async function loadDay(date: string): Promise<DayEntry> {
  const raw = await store.getItem<DayEntry>(date);
  return raw ?? emptyDay(date);
}

/** Load last N days including today, from local. Used for trend context. */
export async function loadRecentDays(n: number): Promise<DayEntry[]> {
  const out: DayEntry[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const raw = await store.getItem<DayEntry>(iso);
    if (raw) out.push(raw);
  }
  return out;
}

async function pushDay(day: DayEntry) {
  const uid = await currentUserId();
  if (!uid || !isOnline()) return;
  try {
    await supabase
      .from("journal_days")
      .upsert(dayToRow(day, uid), { onConflict: "user_id,date" });
  } catch {
    /* ignore */
  }
}

export async function saveDay(day: DayEntry): Promise<DayEntry> {
  return updateDay(day.date, day);
}

export async function updateDay(
  date: string,
  patch: Partial<DayEntry>,
): Promise<DayEntry> {
  const current = await loadDay(date);
  const next: DayEntry = { ...current, ...patch, date, updatedAt: Date.now() };
  await store.setItem(date, next);
  void pushDay(next);
  return next;
}

let syncing = false;
/** Pull cloud journal, merge into local (newer wins), push local newer. */
export async function syncJournal(): Promise<void> {
  if (syncing) return;
  const uid = await currentUserId();
  if (!uid || !isOnline()) return;
  syncing = true;
  try {
    const { data, error } = await supabase
      .from("journal_days")
      .select("*")
      .eq("user_id", uid);
    if (error || !data) return;
    const cloudMap = new Map<string, DayEntry>();
    for (const r of data as Row[]) {
      const d = rowToDay(r);
      cloudMap.set(d.date, d);
    }

    // Collect local days
    const localMap = new Map<string, DayEntry>();
    await store.iterate<DayEntry, void>((val, key) => {
      if (!val || typeof val !== "object" || !("date" in val)) return;
      if (typeof key !== "string" || key.startsWith("migrated_")) return;
      localMap.set(val.date, val);
    });

    // Merge cloud into local
    for (const [date, cloud] of cloudMap) {
      const local = localMap.get(date);
      if (!local || cloud.updatedAt >= local.updatedAt) {
        await store.setItem(date, cloud);
        localMap.set(date, cloud);
      }
    }

    // Push local newer/missing
    const toPush: DayEntry[] = [];
    for (const [date, local] of localMap) {
      const cloud = cloudMap.get(date);
      if (!cloud || local.updatedAt > cloud.updatedAt) toPush.push(local);
    }
    if (toPush.length > 0) {
      await supabase
        .from("journal_days")
        .upsert(toPush.map((d) => dayToRow(d, uid)), {
          onConflict: "user_id,date",
        });
    }
  } catch {
    /* ignore */
  } finally {
    syncing = false;
  }
}
