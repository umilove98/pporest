"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getOrCreateNickname } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  nickname: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  nickname: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 유저 변경 시 닉네임 조회/생성
  useEffect(() => {
    if (!user) {
      setNickname(null);
      return;
    }
    getOrCreateNickname(user.id)
      .then(setNickname)
      .catch(() => setNickname(null));
  }, [user]);

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
    <AuthContext.Provider value={{ user, nickname, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
