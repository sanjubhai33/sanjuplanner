import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  saveConnectionKeyForUser,
  getConnectionKeyForUser,
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

function buildReturnUrl(request: Request): string {
  const url = new URL(request.url);
  const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return new URL("/oauth/google/return", sandboxHost ? `https://${sandboxHost}` : url.origin).toString();
}

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientApiKey = requireClientApiKey();
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");

    const returnUrl = buildReturnUrl(request);
    const existingKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientApiKey,
      returnUrl,
      connectionAPIKey: existingKey ?? undefined,
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });

    return { authorizationUrl };
  });

export const completeGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    const parsed = z.object({ code: z.string().min(1) }).safeParse(input);
    if (!parsed.success) throw new Error("Invalid OAuth code");
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, data.code);
    if (connectorId !== CONNECTOR_ID) {
      throw new Error("OAuth completion returned the wrong connector");
    }
    await saveConnectionKeyForUser(context.userId, CONNECTOR_ID, connectionAPIKey);
    return { ok: true };
  });

export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    return { connected: Boolean(key) };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      await disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: CONNECTOR_ID,
      });
    }
    await deleteConnectionKeyForUser(context.userId, CONNECTOR_ID);
    return { ok: true };
  });

interface GoogleCalendar {
  id: string;
  summary: string;
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

function eventToTask(
  event: GoogleEvent,
  calendarId: string,
  userId: string,
  existingId?: string,
): {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  date: string;
  start_time: string | null;
  duration: number;
  priority: string;
  completed: boolean;
  google_event_id: string;
  google_calendar_id: string;
  google_etag: string | null;
  updated_at: string;
} {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  let date = "";
  let startTime: string | null = null;
  let duration = 60;

  if (event.start?.dateTime) {
    const s = new Date(event.start.dateTime);
    date = toISODate(s);
    startTime = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
    if (event.end?.dateTime) {
      duration = Math.max(0, Math.round((new Date(event.end.dateTime).getTime() - s.getTime()) / 60000));
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

  if (!date) {
    date = toISODate(new Date());
  }

  return {
    id: existingId ?? crypto.randomUUID(),
    user_id: userId,
    title: event.summary || "Calendar event",
    notes: event.description || "",
    date,
    start_time: startTime,
    duration,
    priority: "medium",
    completed: false,
    google_event_id: event.id,
    google_calendar_id: calendarId,
    google_etag: event.etag ?? null,
    updated_at: new Date().toISOString(),
  };
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const syncGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
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
    const calBody = (await calRes.json()) as { items?: GoogleCalendar[] };
    const calendars = calBody.items ?? [];

    const allEvents: GoogleEvent[] = [];
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
        allEvents.push({ ...ev, etag: ev.etag ?? (ev as unknown as { iCalUID?: string }).iCalUID });
      }
    }

    // Load existing Google-linked tasks for this user
    const { data: existingRows, error: fetchError } = await context.supabase
      .from("tasks")
      .select("id, google_event_id")
      .eq("user_id", context.userId)
      .not("google_event_id", "is", null);
    if (fetchError) throw fetchError;

    const existingByEventId = new Map<string, string>();
    for (const row of (existingRows ?? []) as { id: string; google_event_id: string }[]) {
      existingByEventId.set(row.google_event_id, row.id);
    }

    const cancelledIds: string[] = [];
    const toUpsert: ReturnType<typeof eventToTask>[] = [];

    for (const ev of allEvents) {
      if (ev.status === "cancelled") {
        const id = existingByEventId.get(ev.id);
        if (id) cancelledIds.push(id);
        continue;
      }
      toUpsert.push(eventToTask(ev, "primary", context.userId, existingByEventId.get(ev.id)));
    }

    if (toUpsert.length > 0) {
      const { error } = await context.supabase.from("tasks").upsert(toUpsert, { onConflict: "id" });
      if (error) throw error;
    }

    if (cancelledIds.length > 0) {
      const { error } = await context.supabase
        .from("tasks")
        .delete()
        .in("id", cancelledIds)
        .eq("user_id", context.userId);
      if (error) throw error;
    }

    return { synced: toUpsert.length, removed: cancelledIds.length };
  });
