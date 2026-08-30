import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
  deleteConnectionKeyForUser,
} from "./appUserConnections.server";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";
const CLIENT_API_KEY_ENV = "GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function requireClientApiKey(): string {
  const key = process.env[CLIENT_API_KEY_ENV];
  if (!key) {
    throw new Error(`${CLIENT_API_KEY_ENV} is not set. Connect the Google Calendar App User Connector first.`);
  }
  return key;
}

export async function startGoogleOAuth(userId: string, returnUrl: string): Promise<string> {
  const clientApiKey = requireClientApiKey();
  const existingKey = await getConnectionKeyForUser(userId, CONNECTOR_ID);

  const { authorizationUrl } = await authorizeAppUserOAuth({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectorId: CONNECTOR_ID,
    appUserId: userId,
    clientAPIKey: clientApiKey,
    returnUrl,
    connectionAPIKey: existingKey ?? undefined,
    credentialsConfiguration: { scopes: GOOGLE_SCOPES },
  });

  return authorizationUrl;
}

export async function completeGoogleOAuth(userId: string, code: string): Promise<void> {
  const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, code);
  if (connectorId !== CONNECTOR_ID) {
    throw new Error("OAuth completion returned the wrong connector");
  }
  await saveConnectionKeyForUser(userId, CONNECTOR_ID, connectionAPIKey);
}

export async function googleCalendarStatus(userId: string): Promise<boolean> {
  return Boolean(await getConnectionKeyForUser(userId, CONNECTOR_ID));
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (key) {
    await disconnectAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
    });
  }
  await deleteConnectionKeyForUser(userId, CONNECTOR_ID);
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  status?: string;
  etag?: string;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Fetches the user's Google Calendar events (past 30 days, future 90 days)
 * and upserts them into the planner tasks table. Google is the source of
 * truth for title/date/time; the planner keeps its own "completed" state.
 * Cancelled events remove the matching planner tasks.
 */
export async function syncGoogleCalendarForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ synced: number; removed: number }> {
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (!key) throw new Error("Google Calendar is not connected");

  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const calRes = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: key,
    connectorId: CONNECTOR_ID,
    path: "/calendar/v3/users/me/calendarList",
  });
  if (!calRes.ok) {
    const text = await calRes.text();
    throw new Error(`Calendar list failed (${calRes.status}): ${text}`);
  }
  const calBody = (await calRes.json()) as { items?: { id: string }[] };
  const calendars = calBody.items ?? [];

  const events: { event: GoogleEvent; calendarId: string }[] = [];
  for (const cal of calendars) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const evRes = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params.toString()}`,
    });
    if (!evRes.ok) {
      const text = await evRes.text();
      console.error(`Events fetch failed for ${cal.id}: ${evRes.status} ${text}`);
      continue;
    }
    const evBody = (await evRes.json()) as { items?: GoogleEvent[] };
    for (const ev of evBody.items ?? []) {
      events.push({ event: ev, calendarId: cal.id });
    }
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from("tasks")
    .select("id, google_event_id, google_etag, completed")
    .eq("user_id", userId)
    .not("google_event_id", "is", null);
  if (fetchError) throw fetchError;

  const existing = new Map<
    string,
    { id: string; etag: string | null; completed: boolean }
  >();
  for (const row of existingRows ?? []) {
    existing.set(row.google_event_id, {
      id: row.id,
      etag: row.google_etag,
      completed: row.completed,
    });
  }

  const upserts: Record<string, unknown>[] = [];
  const deletes: string[] = [];
  let synced = 0;

  for (const { event, calendarId } of events) {
    if (event.status === "cancelled") {
      const prev = existing.get(event.id);
      if (prev) deletes.push(prev.id);
      continue;
    }
    const start = event.start?.dateTime ?? event.start?.date;
    if (!start) continue;

    const prev = existing.get(event.id);
    // Skip unchanged events (same etag) to avoid needless writes.
    if (prev && prev.etag && event.etag && prev.etag === event.etag) continue;

    const startDate = event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date ?? "");
    let date = "";
    let startTime: string | null = null;
    let duration = 60;
    if (event.start?.dateTime) {
      date = toISODate(startDate);
      startTime = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
      if (event.end?.dateTime) {
        duration = Math.max(0, Math.round((new Date(event.end.dateTime).getTime() - startDate.getTime()) / 60000));
      }
    } else if (event.start?.date) {
      date = event.start.date;
      startTime = null;
      if (event.end?.date) {
        const s = new Date(event.start.date);
        const e = new Date(event.end.date);
        duration = Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
      }
    }
    if (!date) continue;

    upserts.push({
      id: prev?.id ?? newId(),
      user_id: userId,
      title: event.summary || "Calendar event",
      notes: event.description || "",
      date,
      start_time: startTime,
      duration,
      priority: "medium",
      completed: prev?.completed ?? false,
      google_event_id: event.id,
      google_calendar_id: calendarId,
      google_etag: event.etag ?? null,
      updated_at: new Date().toISOString(),
    });
    synced++;
  }

  if (upserts.length > 0) {
    const { error } = await supabase.from("tasks").upsert(upserts, { onConflict: "id" });
    if (error) throw error;
  }
  if (deletes.length > 0) {
    const { error } = await supabase.from("tasks").delete().in("id", deletes).eq("user_id", userId);
    if (error) throw error;
  }

  return { synced, removed: deletes.length };
}