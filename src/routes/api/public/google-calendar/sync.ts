import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google-calendar/sync")({
  server: {
    handlers: {
      OPTIONS: async () => (await import("@/server/google-api.server")).json({ ok: true }),
      POST: async ({ request }) => {
        const { apiHandler, userScopedClient } = await import("@/server/google-api.server");
        return apiHandler(request, async ({ userId, token, supabaseUrl, publishableKey }) => {
          const client = userScopedClient(supabaseUrl, publishableKey, token);
          const { syncGoogleCalendarForUser } = await import("@/server/google-calendar.server");
          return syncGoogleCalendarForUser(client, userId);
        });
      },
    },
  },
});