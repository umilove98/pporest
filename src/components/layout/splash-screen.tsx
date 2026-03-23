"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0); // 0: 초기, 1: 배경, 2: 나무, 3: 핀, 4: 페이드아웃

  useEffect(() => {
    // 순차 애니메이션 타이밍
    const t1 = setTimeout(() => setPhase(1), 100);   // 배경 페이드인
    const t2 = setTimeout(() => setPhase(2), 500);   // 나무 슬라이드업
    const t3 = setTimeout(() => setPhase(3), 900);   // 핀 바운스인
    const t4 = setTimeout(() => setPhase(4), 1800);  // 전체 페이드아웃
    const t5 = setTimeout(() => onComplete(), 2200);  // 제거

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-400 ${
        phase >= 4 ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* 배경 레이어 */}
      <img
        src="/splash/splash-bg.png"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          phase >= 1 ? "opacity-100" : "opacity-0"
        }`}
        draggable={false}
      />

      {/* 나무 레이어 — 하단에서 슬라이드업 */}
      <img
        src="/splash/splash-trees.png"
        alt=""
        className={`absolute inset-x-0 bottom-0 w-full object-contain transition-all duration-500 ${
          phase >= 2 ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        draggable={false}
      />

      {/* 핀 아이콘 — 중앙에서 스케일+바운스 */}
      <img
        src="/splash/splash-pin.png"
        alt="PPORest"
        className={`relative z-10 w-28 transition-all duration-500 ${
          phase >= 3 ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
        style={phase >= 3 ? { animation: "splash-bounce 0.6s ease-out" } : undefined}
        draggable={false}
      />

      {/* 앱 이름 */}
      <p
        className={`absolute bottom-24 text-center text-xl font-light tracking-wide text-white drop-shadow-md transition-all duration-500 ${
          phase >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        PPO<span className="font-bold">Rest</span>
      </p>
    </div>
  );
}
