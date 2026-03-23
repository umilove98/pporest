"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getOrCreateNickname, getAvatarUrl } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  nickname: string | null;
  avatarUrl: string | null;
  loading: boolean;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  nickname: null,
  avatarUrl: null,
  loading: true,
  refreshProfile: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback((userId: string) => {
    getOrCreateNickname(userId)
      .then(setNickname)
      .catch(() => setNickname(null));
    getAvatarUrl(userId)
      .then(setAvatarUrl)
      .catch(() => setAvatarUrl(null));
  }, []);

  const refreshProfile = useCallback(() => {
    if (user) loadProfile(user.id);
  }, [user, loadProfile]);

  // 유저 변경 시 프로필 조회
  useEffect(() => {
    if (!user) {
      setNickname(null);
      setAvatarUrl(null);
      return;
    }
    loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, nickname, avatarUrl, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
