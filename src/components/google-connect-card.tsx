import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, RefreshCw, Unplug, CalendarClock } from "lucide-react";
import {
  completeGoogleConnect,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  isGoogleNativePlatform,
  startGoogleConnect,
syncGoogleCalendarNow,
} from "@/lib/google-calendar";
import { syncTasks } from "@/lib/tasks";

function waitForOAuthCompletion(popup: Window): Promise<string | null> {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== "google_calendar" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve(typeof event.data?.code === "string" ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error("Google connection was not completed."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("OAuth window closed before completion."));
    }, 500);
  });
}

export function GoogleConnectCard({
  className = "",
  onStateChange,
}: {
  className?: string;
  onStateChange?: () => void;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const native = isGoogleNativePlatform();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: getGoogleCalendarStatus,
    staleTime: 60_000,
    retry: 1,
  });
  const connected = Boolean(status?.connected);

  async function doSync(silent = false) {
    if (silent) {
      try {
        const result = await syncGoogleCalendarNow();
        if (result?.synced) {
          setNotice(`Synced ${result.synced} calendar events.`);
        } else {
          setNotice("Calendar is up to date.");
        }
      } catch {
        // silent — background sync errors are not user-facing
      }
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
try {
      const result = await syncGoogleCalendarNow();
      await syncTasks(); // pull freshly synced Google rows into localforage
      setNotice(
        result?.synced ? `Synced ${result.synced} calendar events.` : "Calendar is up to date.",
      );
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onStateChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { authorizationUrl } = await startGoogleConnect();

      if (native) {
        // APK: Google consent phone ke browser me kholte hain; connection
        // server par complete hoti hai, app me wapas aakar status refresh.
        window.open(authorizationUrl, "_system");
        setNotice(
          "Browser me Google se allow karo, phir app me wapas aakar 'Refresh' dabao — connection ho jayega.",
        );
        return;
      }

      const popup = window.open("", "lovable-oauth", "width=600,height=720");
      if (!popup) throw new Error("Popup blocked. Allow popups and try again.");
      const completion = waitForOAuthCompletion(popup);
      popup.location.href = authorizationUrl;
      const code = await completion;
      if (code) await completeGoogleConnect(code);
      setNotice("Connected! Syncing your Google Calendar…");
      await doSync();
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed.";
      setError(
        /access_denied|blocked|verification/i.test(msg)
          ? "Google ne block kiya (app abhi Testing mode me hai). Google Cloud Console → Audience me apna Gmail 'Test users' me add karo, ya app ko Publish karo — phir dobara try karo."
          : msg,
      );

    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google Calendar? Tasks already in your planner stay saved.")) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await disconnectGoogleCalendar();
      setNotice("Google Calendar disconnected.");
      await refetch();
      qc.invalidateQueries();
      onStateChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Google Calendar sync</p>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Checking…"
                : connected
                  ? "Connected — your Google Calendar events appear as tasks."
                  : "Connect to bring your Google Calendar events into this planner."}
            </p>
          </div>
        </div>
        {connected && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
            <Check className="h-3 w-3" /> On
          </span>
        )}
      </div>

      {(error || notice) && (
        <p className={`mt-3 text-xs ${error ? "text-destructive" : "text-emerald-600"}`}>
          {error || notice}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!connected ? (
          <button
            onClick={connect}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Connecting…" : "Connect Google Calendar"}
          </button>
        ) : null}
        {!connected && native ? (
          <button
            onClick={() => void refetch()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        ) : null}
        {connected ? (
          <>
            <button
              onClick={() => doSync()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {busy ? "Syncing…" : "Sync now"}
            </button>
            <button
              onClick={disconnect}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              <Unplug className="h-4 w-4" /> Disconnect
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}