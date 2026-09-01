import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function createSupabaseFetch(supabaseKey: string): typeof fetch {
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

export function json(body: unknown, init?: ResponseInit) {
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

export function userScopedClient(supabaseUrl: string, publishableKey: string, token: string) {
  return createClient<Database>(supabaseUrl, publishableKey, {
    global: {
      fetch: createSupabaseFetch(publishableKey),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export function safeOrigin(value: string): boolean {
  return /^(https?|capacitor):\/\//.test(value);
}

export interface ApiContext {
  userId: string;
  token: string;
  supabaseUrl: string;
  publishableKey: string;
  request: Request;
}

/**
 * Verifies the bearer token, runs the handler, and normalizes errors into a
 * JSON response with CORS headers (web and mobile APK both call these routes).
 */
export async function apiHandler(
  request: Request,
  fn: (ctx: ApiContext) => Promise<Response | unknown>,
): Promise<Response> {
  try {
    const { userId, token, supabaseUrl, publishableKey } = await verifyUser(request);
    const result = await fn({ userId, token, supabaseUrl, publishableKey, request });
    return result instanceof Response ? result : json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return json({ error: message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}