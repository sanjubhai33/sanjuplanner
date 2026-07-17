import { supabase } from "@/integrations/supabase/client";
import type { DailyReportInput, DailyReportOutput } from "./report.server";

const PUBLISHED_API_BASE = "https://sanjuplanner.lovable.app";

function getReportEndpoint() {
  if (typeof window === "undefined") return "/api/public/daily-report";
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.()
    ? `${PUBLISHED_API_BASE}/api/public/daily-report`
    : "/api/public/daily-report";
}

export async function generateDailyReportOnline(
  input: DailyReportInput,
): Promise<DailyReportOutput> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("AI report needs internet. Your offline planner data is still saved.");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in before generating a report.");

  const response = await fetch(getReportEndpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Couldn't reach the AI report service.");
  }

  return (await response.json()) as DailyReportOutput;
}