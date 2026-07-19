import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const finish = (s: Session | null) => {
      if (done) return;
      done = true;
      setSession(s);
      setLoading(false);
    };

    let sub: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const listener = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        setLoading(false);
        done = true;
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
          finish(null);
        });
    } catch (e) {
      console.error("getSession threw", e);
      finish(null);
    }

    // Hard timeout so APK never gets stuck on Loading if storage/network hangs.
    const t = setTimeout(() => finish(null), 2500);

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
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setName(data?.display_name || fallback);
      })
      .catch(() => {
        /* offline; keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  return name;
}
