import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/google-calendar/complete-native")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/server/google-api.server")).json({ ok: true }),
      POST: async ({ request }) => {
        const { json } = await import("@/server/google-api.server");
        try {
          const body = await request.json().catch(() => ({}));
          const parsed = z
            .object({ token: z.string().min(20), code: z.string().min(1) })
            .safeParse(body);
          if (!parsed.success) throw new Error("Invalid request");

          const { completeGoogleOAuthWithToken } = await import(
            "@/server/google-calendar.server"
          );
          await completeGoogleOAuthWithToken(parsed.data.token, parsed.data.code);
          return json({ ok: true });
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : "Request failed" },
            { status: 400 },
          );
        }
      },
    },
  },
});
