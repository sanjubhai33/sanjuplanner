import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google/return")({
  head: () => ({
    meta: [{ title: "Connecting Google Calendar — Daily Planner" }],
  }),
  component: OAuthReturnPage,
});

function OAuthReturnPage() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success") === "true";
    const code = params.get("code") ?? "";

    const notifyOpener = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", codeValue?: string) => {
      window.opener?.postMessage(
        { type, connectorId: "google_calendar", code: codeValue ?? null },
        window.location.origin,
      );
      window.close();
    };

    if (!success) {
      setMessage(params.get("error") ?? "OAuth did not complete.");
      notifyOpener("appUserConnectorOAuthFailed");
      return;
    }
    if (params.get("offline_access_allowed") === "false") {
      notifyOpener("appUserConnectorOAuthComplete");
      return;
    }
    if (!code) {
      setMessage("OAuth completed without an exchange code.");
      notifyOpener("appUserConnectorOAuthFailed");
      return;
    }
    notifyOpener("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}