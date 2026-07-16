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

let migratedForUser: string | null = null;
async function migrateLocalIfNeeded(userId: string) {
  if (migratedForUser === userId) return;
  migratedForUser = userId;
  const flagKey = `migrated_journal_${userId}`;
  const already = await store.getItem<boolean>(flagKey);
  if (already) return;
  type JournalInsert = {
    user_id: string;
    date: string;
    water_count: number;
    water_goal: number;
    satisfied: string[];
    unsatisfied: string[];
    report_rating: number | null;
    report_message: string | null;
    report_tone: string | null;
    report_generated_at: number | null;
  };
  const rows: JournalInsert[] = [];
  await store.iterate<DayEntry, void>((val, key) => {
    if (key.startsWith("migrated_")) return;
    if (!val || typeof val !== "object" || !("date" in val)) return;
    rows.push({
      user_id: userId,
      date: val.date,
      water_count: val.waterCount ?? 0,
      water_goal: val.waterGoal ?? 8,
      satisfied: val.satisfied ?? [],
      unsatisfied: val.unsatisfied ?? [],
      report_rating: val.reportRating ?? null,
      report_message: val.reportMessage ?? null,
      report_tone: val.reportTone ?? null,
      report_generated_at: val.reportGeneratedAt ?? null,
    });
  });
  if (rows.length > 0) {
    await supabase.from("journal_days").upsert(rows, { onConflict: "user_id,date" });
  }
  await store.setItem(flagKey, true);
}

export async function loadDay(date: string): Promise<DayEntry> {
  const uid = await currentUserId();
  if (!uid) {
    const raw = await store.getItem<DayEntry>(date);
    return raw ?? emptyDay(date);
  }
  await migrateLocalIfNeeded(uid);
  const { data } = await supabase
    .from("journal_days")
    .select("*")
    .eq("user_id", uid)
    .eq("date", date)
    .maybeSingle();
  if (!data) return emptyDay(date);
  return rowToDay(data as Row);
}

export async function saveDay(day: DayEntry): Promise<DayEntry> {
  return updateDay(day.date, day);
}

export async function updateDay(
  date: string,
  patch: Partial<DayEntry>,
): Promise<DayEntry> {
  const uid = await currentUserId();
  if (!uid) {
    const current = await loadDay(date);
    const next: DayEntry = { ...current, ...patch, date, updatedAt: Date.now() };
    await store.setItem(date, next);
    return next;
  }
  const current = await loadDay(date);
  const merged: DayEntry = { ...current, ...patch, date, updatedAt: Date.now() };
  await supabase.from("journal_days").upsert(
    {
      user_id: uid,
      date,
      water_count: merged.waterCount,
      water_goal: merged.waterGoal,
      satisfied: merged.satisfied,
      unsatisfied: merged.unsatisfied,
      report_rating: merged.reportRating ?? null,
      report_message: merged.reportMessage ?? null,
      report_tone: merged.reportTone ?? null,
      report_generated_at: merged.reportGeneratedAt ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  );
  return merged;
}
