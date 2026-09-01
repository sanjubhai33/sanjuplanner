import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google-calendar/disconnect")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/server/google-api.server")).json({ ok: true }),
      POST: async ({ request }) => {
        const { apiHandler } = await import("@/server/google-api.server");
        return apiHandler(request, async ({ userId }) => {
          const { disconnectGoogleCalendar } = await import("@/server/google-calendar.server");
          await disconnectGoogleCalendar(userId);
          return { ok: true };
        });
      },
    },
  },
});