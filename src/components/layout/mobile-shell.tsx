"use client";

import { useState, useCallback, useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { SplashScreen } from "./splash-screen";

export function MobileShell({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // 세션 내 첫 마운트에서만 스플래시 표시 (탭 이동 시에는 미표시)
    if (!sessionStorage.getItem("pporest_splash_done")) {
      setShowSplash(true);
    }
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem("pporest_splash_done", "1");
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <main className="pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
