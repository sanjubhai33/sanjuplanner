import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/google-calendar/start")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/server/google-api.server")).json({ ok: true }),
      POST: async ({ request }) => {
        const { apiHandler, safeOrigin } = await import("@/server/google-api.server");
        return apiHandler(request, async ({ userId, request: req }) => {
          const body = await req.json().catch(() => ({}));
          const parsed = z.object({ returnOrigin: z.string().optional() }).safeParse(body);
          if (!parsed.success) throw new Error("Invalid request");

          const origin =
            parsed.data.returnOrigin && safeOrigin(parsed.data.returnOrigin)
              ? parsed.data.returnOrigin
              : new URL(req.url).origin;
          const returnUrl = `${origin.replace(/\/$/, "")}/oauth/google/return`;

          const { startGoogleOAuth } = await import("@/server/google-calendar.server");
          const authorizationUrl = await startGoogleOAuth(userId, returnUrl);
          return { authorizationUrl };
        });
      },
    },
  },
});