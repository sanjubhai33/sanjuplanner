import { supabase } from "@/integrations/supabase/client";

const PUBLISHED_API_BASE = "https://sanjuplanner.lovable.app";

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function isGoogleNativePlatform(): boolean {
  return isNative();
}

function getApiBase(): string {
  return isNative() ? PUBLISHED_API_BASE : "";
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<any> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Google Calendar sync needs internet.");
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in before connecting Google Calendar.");

  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function startGoogleConnect(returnOrigin?: string) {
  const native = isNative();
  // APK me window.location.origin "localhost" hota hai — Google wahan wapas
  // nahi aa sakta, isliye published site par return karate hain.
  const origin =
    returnOrigin ??
    (native
      ? PUBLISHED_API_BASE
      : typeof window !== "undefined"
        ? window.location.origin
        : undefined);
  return authedFetch("/api/public/google-calendar/start", {
    method: "POST",
    body: JSON.stringify({ returnOrigin: origin, native }),
  });
}

export async function completeGoogleConnect(code: string) {
  return authedFetch("/api/public/google-calendar/complete", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getGoogleCalendarStatus() {
  return authedFetch("/api/public/google-calendar/status", { method: "GET" });
}

export async function syncGoogleCalendarNow() {
  return authedFetch("/api/public/google-calendar/sync", { method: "POST" });
}

export async function disconnectGoogleCalendar() {
  return authedFetch("/api/public/google-calendar/disconnect", { method: "POST" });
}