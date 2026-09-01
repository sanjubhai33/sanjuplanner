import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      ...init?.headers,
    },
  });
}

async function verifyUser(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Unauthorized");

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Backend is not configured");
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { fetch: createSupabaseFetch(publishableKey) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Unauthorized");

  return { userId: userData.user.id, token, supabaseUrl, publishableKey };
}

function userScopedClient(supabaseUrl: string, publishableKey: string, token: string) {
  return createClient<Database>(supabaseUrl, publishableKey, {
    global: {
      fetch: createSupabaseFetch(publishableKey),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function safeOrigin(value: string): boolean {
  return /^(https?|capacitor):\/\//.test(value);
}

export const Route = createFileRoute("/api/public/google-calendar")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      GET: async ({ request }) => {
        try {
          const { userId } = await verifyUser(request);
          const { googleCalendarStatus } = await import("@/server/google-calendar.server");
          const connected = await googleCalendarStatus(userId);
          return json({ connected });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Request failed";
          return json({ error: message }, { status: message === "Unauthorized" ? 401 : 400 });
        }
      },
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const { userId, token, supabaseUrl, publishableKey } = await verifyUser(request);
          const body = await request.json().catch(() => ({}));

          if (url.pathname.endsWith("/start")) {
            const parsed = z
              .object({ returnOrigin: z.string().optional() })
              .safeParse(body);
            if (!parsed.success) throw new Error("Invalid request");
            const origin =
              parsed.data.returnOrigin && safeOrigin(parsed.data.returnOrigin)
                ? parsed.data.returnOrigin
                : new URL(request.url).origin;
            const returnUrl = `${origin.replace(/\/$/, "")}/oauth/google/return`;
            const { startGoogleOAuth } = await import("@/server/google-calendar.server");
            const authorizationUrl = await startGoogleOAuth(userId, returnUrl);
            return json({ authorizationUrl });
          }

          if (url.pathname.endsWith("/complete")) {
            const parsed = z.object({ code: z.string().min(1) }).safeParse(body);
            if (!parsed.success) throw new Error("Invalid request");
            const { completeGoogleOAuth } = await import("@/server/google-calendar.server");
            await completeGoogleOAuth(userId, parsed.data.code);
            return json({ ok: true });
          }

          if (url.pathname.endsWith("/sync")) {
            const client = userScopedClient(supabaseUrl, publishableKey, token);
            const { syncGoogleCalendarForUser } = await import("@/server/google-calendar.server");
            const result = await syncGoogleCalendarForUser(client, userId);
            return json(result);
          }

          if (url.pathname.endsWith("/disconnect")) {
            const { disconnectGoogleCalendar } = await import("@/server/google-calendar.server");
            await disconnectGoogleCalendar(userId);
            return json({ ok: true });
          }

          return json({ error: "Not found" }, { status: 404 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Request failed";
          return json({ error: message }, { status: message === "Unauthorized" ? 401 : 400 });
        }
      },
    },
  },
});