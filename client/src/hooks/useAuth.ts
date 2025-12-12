import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { supabase } from "@/lib/supabaseClient";

export function useAuth() {
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setIsSessionLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setHasSession(!!session);
      },
    );

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const { data: user, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: hasSession,
    onError: () => {
      supabase.auth.signOut();
      setHasSession(false);
    },
  });

  return {
    user,
    // Route gating should rely on Supabase session presence only.
    // User fetch can be slower/optional; don't block navigation on it.
    isLoading: isSessionLoading,
    isAuthenticated: hasSession,
  };
}
