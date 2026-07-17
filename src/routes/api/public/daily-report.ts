import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

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

        const { DailyReportInputSchema, generateDailyReportForInput } = await import(
          "@/lib/report.server"
        );
        const input = DailyReportInputSchema.parse(await request.json());
        const report = await generateDailyReportForInput(input);
        return json(report);
      },
    },
  },
});