"use client";

import { useState, useCallback } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PreferenceKey, UserPreferences } from "@/lib/types";

interface PreferenceItem {
  key: PreferenceKey;
  label: string;
  description: string;
  emoji: string;
}

const PREFERENCE_ITEMS: PreferenceItem[] = [
  { key: "cleanliness", label: "청결도", description: "깨끗한 화장실이 중요해요", emoji: "✨" },
  { key: "gender_separated", label: "남녀분리", description: "남녀 화장실이 분리되어야 해요", emoji: "🚻" },
  { key: "bidet", label: "비데", description: "비데가 있어야 해요", emoji: "💧" },
  { key: "stall_count", label: "칸 수", description: "대기시간이 짧아야 해요 (칸 수 많은 곳)", emoji: "🚪" },
  { key: "accessibility", label: "접근성", description: "장애인 화장실이 있어야 해요", emoji: "♿" },
  { key: "safety", label: "안전", description: "비상벨/CCTV가 있어야 해요", emoji: "🛡️" },
];

interface PreferenceSurveyProps {
  initialPreferences?: UserPreferences | null;
  onSave: (prefs: UserPreferences) => Promise<void>;
  onSkip?: () => void;
  compact?: boolean;
}

export function PreferenceSurvey({ initialPreferences, onSave, onSkip, compact }: PreferenceSurveyProps) {
  // 초기 선택 순서 복원: 기존 설정이 있으면 priority 순으로
  const getInitialSelectedOrder = (): PreferenceKey[] => {
    if (!initialPreferences) return [];

    const withPriority: { key: PreferenceKey; priority: number }[] = [];
    for (const item of PREFERENCE_ITEMS) {
      const p = initialPreferences[item.key];
      if (p != null) {
        withPriority.push({ key: item.key, priority: p });
      }
    }
    withPriority.sort((a, b) => a.priority - b.priority);
    return withPriority.map((i) => i.key);
  };

  // 선택된 항목의 순서 배열 — 선택한 순서가 곧 우선순위
  const [selectedOrder, setSelectedOrder] = useState<PreferenceKey[]>(getInitialSelectedOrder);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleItem = useCallback((key: PreferenceKey) => {
    setSelectedOrder((prev) => {
      if (prev.includes(key)) {
        // 선택 해제
        return prev.filter((k) => k !== key);
      } else {
        // 선택 추가 — 맨 뒤에 추가 (선택 순서 = 우선순위)
        return [...prev, key];
      }
    });
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const prefs: UserPreferences = {
        user_id: initialPreferences?.user_id ?? "",
        cleanliness: null,
        gender_separated: null,
        bidet: null,
        stall_count: null,
        accessibility: null,
        safety: null,
      };

      // 선택 순서 기반 priority 할당
      selectedOrder.forEach((key, index) => {
        prefs[key] = index + 1;
      });

      await onSave(prefs);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div className="text-center">
          <h3 className="text-base font-semibold">내 화장실 취향 설정</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            중요한 항목을 순서대로 선택하세요.
            <br />
            먼저 선택할수록 더 중요하게 반영됩니다.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {PREFERENCE_ITEMS.map((item) => {
          const selectedIndex = selectedOrder.indexOf(item.key);
          const isEnabled = selectedIndex >= 0;
          return (
            <Card
              key={item.key}
              className={`cursor-pointer transition-all ${
                isEnabled
                  ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                  : "opacity-60"
              }`}
              onClick={() => toggleItem(item.key)}
            >
              <CardContent className="flex items-center gap-3 p-3">
                {/* 우선순위 번호 또는 빈 원 */}
                {isEnabled ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                    {selectedIndex + 1}
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30" />
                )}

                {/* 항목 정보 */}
                <span className="text-base">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{item.description}</p>
                </div>

                {/* 체크 표시 */}
                {isEnabled && (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || selectedOrder.length === 0}
          className="w-full gap-2"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              저장 중...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              저장 완료!
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {selectedOrder.length > 0
                ? `${selectedOrder.length}개 항목 저장`
                : "항목을 선택하세요"}
            </>
          )}
        </Button>

        {onSkip && (
          <button
            type="button"
            className="text-center text-sm text-muted-foreground"
            onClick={onSkip}
          >
            나중에 설정할게요
          </button>
        )}
      </div>
    </div>
  );
}
