import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google/return")({
  head: () => ({
    meta: [
      { title: "Connecting Google Calendar — Daily Planner" },
      {
        name: "description",
        content: "Finishing the secure Google Calendar connection for your Daily Planner account.",
      },
    ],
  }),
  component: OAuthReturnPage,
});

function OAuthReturnPage() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success") === "true";
    const code = params.get("code") ?? "";
    const pendingToken = params.get("t") ?? "";

    // APK flow: koi opener window nahi hoti, isliye server hi connection
    // complete karta hai one-time token se.
    if (pendingToken) {
      if (!success || !code) {
        setMessage(params.get("error") ?? "Google connection was not completed. Please try again.");
        return;
      }
      void (async () => {
        try {
          const res = await fetch("/api/public/google-calendar/complete-native", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: pendingToken, code }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body?.error || "Connection failed");
          setMessage("Google Calendar connected. You can close this tab and go back to the app.");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Connection failed.");
        }
      })();
      return;
    }

    const notifyOpener = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      codeValue?: string,
    ) => {
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
