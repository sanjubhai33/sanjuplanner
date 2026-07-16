import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
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
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setName(
          data?.display_name ||
            (user.user_metadata?.display_name as string) ||
            (user.user_metadata?.full_name as string) ||
            user.email?.split("@")[0] ||
            "",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  return name;
}
