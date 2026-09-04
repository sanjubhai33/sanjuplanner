import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Daily Planner" },
      {
        name: "description",
        content:
          "How Daily Planner stores your tasks, journal notes and Google Calendar data, and how you can disconnect or delete it.",
      },
      { property: "og:title", content: "Privacy Policy — Daily Planner" },
      {
        property: "og:description",
        content: "How Daily Planner handles your tasks, journal and Google Calendar data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-sm leading-relaxed text-foreground">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated: 3 September 2026</p>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold">What this app is</h2>
        <p className="text-muted-foreground">
          Daily Planner is a personal task, water and journal planner. Each person sees only their
          own data.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold">What we store</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Your account email and the display name you enter.</li>
          <li>Your tasks, water intake, and satisfied / unsatisfied journal notes.</li>
          <li>
            If you connect Google Calendar: the event title, date, start time and duration of your
            calendar events, saved as planner tasks.
          </li>
        </ul>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold">Google Calendar access</h2>
        <p className="text-muted-foreground">
          The app requests read-only access to your Google Calendar
          (<code>calendar.readonly</code>) plus your basic email and profile. It never creates,
          edits or deletes anything in your Google account, and calendar data is never sold or
          shared with third parties. The access token is stored encrypted (AES-256-GCM) on the
          server and is only used to fetch your own events.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold">How to disconnect or delete</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Open the Calendar tab and tap <strong>Disconnect</strong> on the Google Calendar sync
            card. Access is revoked and the stored key is deleted immediately.
          </li>
          <li>
            You can also remove access at{" "}
            <a
              className="underline"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              myaccount.google.com/permissions
            </a>
            .
          </li>
          <li>
            To delete your planner data, email the address below and your account and its data will
            be removed.
          </li>
        </ul>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold">Security</h2>
        <p className="text-muted-foreground">
          Data is stored in a managed cloud database with row-level security, so a signed-in user
          can only read and write their own rows. Traffic is encrypted in transit (HTTPS).
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-base font-semibold">Contact</h2>
        <p className="text-muted-foreground">sanjeevkummar31@gmail.com</p>
      </section>
    </main>
  );
}
