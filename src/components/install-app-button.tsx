import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  // iOS Safari
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(mq || iosStandalone);
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIos()) {
      setShowIosHint((v) => !v);
    }
  };

  // Chrome/Android with prompt ready
  if (deferred) {
    return (
      <button
        onClick={handleClick}
        className="text-xs font-medium rounded-full border border-primary/40 text-primary px-3 py-1 hover:bg-primary/10"
      >
        Install app
      </button>
    );
  }

  // iOS: no beforeinstallprompt, show hint on tap
  if (isIos()) {
    return (
      <div className="relative">
        <button
          onClick={handleClick}
          className="text-xs font-medium rounded-full border border-primary/40 text-primary px-3 py-1 hover:bg-primary/10"
        >
          Install app
        </button>
        {showIosHint && (
          <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card p-2 text-[11px] leading-snug text-muted-foreground shadow-lg z-50">
            Safari me Share button dabao → <b>Add to Home Screen</b>.
          </div>
        )}
      </div>
    );
  }

  return null;
}
