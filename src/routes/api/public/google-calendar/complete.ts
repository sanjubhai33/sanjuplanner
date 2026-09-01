import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/google-calendar/complete")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/server/google-api.server")).json({ ok: true }),
      POST: async ({ request }) => {
        const { apiHandler } = await import("@/server/google-api.server");
        return apiHandler(request, async ({ userId, request: req }) => {
          const body = await req.json().catch(() => ({}));
          const parsed = z.object({ code: z.string().min(1) }).safeParse(body);
          if (!parsed.success) throw new Error("Invalid request");

          const { completeGoogleOAuth } = await import("@/server/google-calendar.server");
          await completeGoogleOAuth(userId, parsed.data.code);
          return { ok: true };
        });
      },
    },
  },
});