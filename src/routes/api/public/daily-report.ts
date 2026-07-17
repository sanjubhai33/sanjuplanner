import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

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
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      ...init?.headers,
    },
  });
}

export const Route = createFileRoute("/api/public/daily-report")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return json({ error: "Unauthorized" }, { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !publishableKey) {
          return json({ error: "Backend is not configured" }, { status: 500 });
        }

        const authClient = createClient(supabaseUrl, publishableKey, {
          global: {
            fetch: createSupabaseFetch(publishableKey),
          },
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        const { data: userData, error: userError } = await authClient.auth.getUser(token);
        if (userError || !userData.user) {
          return json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const { DailyReportInputSchema } = await import("@/lib/report.shared");
          const { generateDailyReportForInput } = await import("@/lib/report.server");
          const input = DailyReportInputSchema.parse(await request.json());
          const report = await generateDailyReportForInput(input);
          return json(report);
        } catch (error) {
          return json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Couldn't generate the daily report",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});