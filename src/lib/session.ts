import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function readCachedSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Session | { currentSession?: Session | null } | null;
      if (parsed && "access_token" in parsed && parsed.access_token) return parsed as Session;
      if (parsed && "currentSession" in parsed && parsed.currentSession?.access_token) {
        return parsed.currentSession;
      }
    }
  } catch {
    /* storage can be unavailable on some WebViews; fall through safely */
  }
  return null;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => readCachedSession());
  const [loading, setLoading] = useState(() => !readCachedSession());

  useEffect(() => {
    let settled = Boolean(readCachedSession());
    const finish = (s: Session | null, final = false) => {
      if (final && settled) return;
      settled = true;
      setSession(s);
      setLoading(false);
    };

    let sub: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const listener = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        setLoading(false);
        settled = true;
      });
      sub = listener.data;
    } catch (e) {
      console.error("auth listener failed", e);
    }

    try {
      supabase.auth
        .getSession()
        .then(({ data }) => finish(data.session))
        .catch((e) => {
          console.error("getSession failed", e);
          finish(readCachedSession(), true);
        });
    } catch (e) {
      console.error("getSession threw", e);
      finish(readCachedSession(), true);
    }

    // Hard timeout so APK never gets stuck on Loading if storage/network hangs.
    const t = setTimeout(() => finish(readCachedSession(), true), 2500);

    return () => {
      clearTimeout(t);
      sub?.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useDisplayName(user: User | null) {
  const [name, setName] = useState<string>("");
  useEffect(() => {
    if (!user) {
      setName("");
      return;
    }
    let cancelled = false;
    const fallback =
      (user.user_metadata?.display_name as string) ||
      (user.user_metadata?.full_name as string) ||
      user.email?.split("@")[0] ||
      "";
    setName(fallback);
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setName(data?.display_name || fallback);
      } catch {
        /* offline; keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);
  return name;
}
