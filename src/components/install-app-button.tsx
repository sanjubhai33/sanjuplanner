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

function isAndroid() {
  if (typeof window === "undefined") return false;
  return /android/i.test(window.navigator.userAgent);
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setReady(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    const displayMode = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode?.addEventListener?.("change", onDisplayModeChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode?.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  if (!ready || installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isAndroid()) {
      setShowIosHint((v) => !v);
    }
    if (isIos()) {
      setShowIosHint((v) => !v);
    }
  };

  const buttonClass =
    "shrink-0 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  // Chrome/Android with prompt ready
  if (deferred) {
    return (
      <button
        onClick={handleClick}
        className={buttonClass}
        type="button"
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
          className={buttonClass}
          type="button"
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

  if (isAndroid()) {
    return (
      <div className="relative">
        <button onClick={handleClick} className={buttonClass} type="button">
          Install app
        </button>
        {showIosHint && (
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-md border border-border bg-card p-2 text-[11px] leading-snug text-muted-foreground shadow-lg">
            Chrome menu (⋮) dabao → <b>Install app</b> ya <b>Add to Home Screen</b>.
          </div>
        )}
      </div>
    );
  }

  return null;
}
