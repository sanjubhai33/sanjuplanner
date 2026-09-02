import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google-calendar/status")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/server/google-api.server")).json({ ok: true }),
      GET: async ({ request }) => {
        const { apiHandler } = await import("@/server/google-api.server");
        return apiHandler(request, async ({ userId }) => {
          const { googleCalendarStatus } = await import("@/server/google-calendar.server");
          const connected = await googleCalendarStatus(userId);
          return { connected };
        });
      },
    },
  },
});