import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { syncTasks } from "@/lib/tasks";
import { syncJournal } from "@/lib/journal";

/** Fires two-way sync on login and when the device regains connectivity. */
export function SyncManager() {
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const runSync = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        await Promise.all([syncTasks(), syncJournal()]);
        if (!mounted) return;
        qc.invalidateQueries({ queryKey: ["tasks"] });
        qc.invalidateQueries({ queryKey: ["journal"] });
      } catch (error) {
        console.info("Sync skipped until internet/backend is reachable.", error);
      }
    };

    // Initial sync
    void runSync();

    // Sync on sign-in
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void runSync();
    });

    // Sync when we come back online
    const onOnline = () => void runSync();
    window.addEventListener("online", onOnline);

    // Periodic light sync (5 min) while app is open
    const timer = setInterval(runSync, 5 * 60 * 1000);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [qc]);

  return null;
}
