import localforage from "localforage";

export type DayEntry = {
  date: string; // YYYY-MM-DD
  waterCount: number; // glasses drunk
  waterGoal: number;
  satisfied: string[];
  unsatisfied: string[];
  reportRating?: number; // 0..5
  reportMessage?: string;
  reportTone?: "proud" | "shame" | "mixed";
  reportGeneratedAt?: number;
  updatedAt: number;
};

const store = localforage.createInstance({
  name: "daily-planner",
  storeName: "journal",
  description: "Daily journal, water, and AI reports",
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

export async function loadDay(date: string): Promise<DayEntry> {
  const raw = await store.getItem<DayEntry>(date);
  return raw ?? emptyDay(date);
}

export async function saveDay(day: DayEntry): Promise<DayEntry> {
  const next = { ...day, updatedAt: Date.now() };
  await store.setItem(next.date, next);
  return next;
}

export async function updateDay(
  date: string,
  patch: Partial<DayEntry>,
): Promise<DayEntry> {
  const current = await loadDay(date);
  const next: DayEntry = { ...current, ...patch, date, updatedAt: Date.now() };
  await store.setItem(date, next);
  return next;
}
