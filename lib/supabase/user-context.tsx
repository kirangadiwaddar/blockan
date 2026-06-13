"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type UserCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  displayName: string;
  email: string;
  avatarUrl: string;
  initials: string;
  bio: string;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<UserCtx>({
  user: null,
  profile: null,
  loading: true,
  displayName: "",
  email: "",
  avatarUrl: "",
  initials: "",
  bio: "",
  refreshProfile: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, userMeta?: Record<string, string>) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, bio")
      .eq("id", userId)
      .single();
    if (data) {
      // If DB has no full_name (e.g. trigger overwrote it), patch from user_metadata
      if (!data.full_name && userMeta?.full_name) {
        await supabase
          .from("profiles")
          .update({ full_name: userMeta.full_name })
          .eq("id", userId);
        data.full_name = userMeta.full_name;
      }
      setProfile(data as Profile);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id, u.user_metadata as Record<string, string>).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id, u.user_metadata as Record<string, string>);
      else setProfile(null);
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const email = user?.email ?? "";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || "";
  const bio = profile?.bio ?? "";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Ctx.Provider value={{ user, profile, loading, displayName, email, avatarUrl, initials, bio, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useUser() {
  return useContext(Ctx);
}
