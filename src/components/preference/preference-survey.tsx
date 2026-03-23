"use client";

import { useState, useCallback } from "react";
import { GripVertical, Check, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
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
  // 초기 순서 복원: 기존 설정이 있으면 priority 순으로 정렬
  const getInitialOrder = (): PreferenceKey[] => {
    if (!initialPreferences) return PREFERENCE_ITEMS.map((i) => i.key);

    const withPriority: { key: PreferenceKey; priority: number }[] = [];
    const withoutPriority: PreferenceKey[] = [];

    for (const item of PREFERENCE_ITEMS) {
      const p = initialPreferences[item.key];
      if (p != null) {
        withPriority.push({ key: item.key, priority: p });
      } else {
        withoutPriority.push(item.key);
      }
    }

    withPriority.sort((a, b) => a.priority - b.priority);
    return [...withPriority.map((i) => i.key), ...withoutPriority];
  };

  const getInitialEnabled = (): Set<PreferenceKey> => {
    if (!initialPreferences) return new Set();
    const set = new Set<PreferenceKey>();
    for (const key of PREFERENCE_ITEMS.map((i) => i.key)) {
      if (initialPreferences[key] != null) set.add(key);
    }
    return set;
  };

  const [order, setOrder] = useState<PreferenceKey[]>(getInitialOrder);
  const [enabled, setEnabled] = useState<Set<PreferenceKey>>(getInitialEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleItem = useCallback((key: PreferenceKey) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setSaved(false);
  }, []);

  const moveItem = useCallback((index: number, direction: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
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

      // 활성화된 항목만 순서 기반 priority 할당
      let priority = 1;
      for (const key of order) {
        if (enabled.has(key)) {
          prefs[key] = priority;
          priority++;
        }
      }

      await onSave(prefs);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const itemMap = new Map(PREFERENCE_ITEMS.map((i) => [i.key, i]));

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div className="text-center">
          <h3 className="text-base font-semibold">내 화장실 취향 설정</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            중요한 항목을 선택하고, 순서를 조정하세요.
            <br />
            위에 있을수록 더 중요하게 반영됩니다.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {order.map((key, index) => {
          const item = itemMap.get(key)!;
          const isEnabled = enabled.has(key);
          return (
            <Card
              key={key}
              className={`transition-all ${
                isEnabled
                  ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                  : "opacity-60"
              }`}
            >
              <CardContent className="flex items-center gap-2 p-3">
                {/* 순서 이동 버튼 */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === order.length - 1}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />

                {/* 우선순위 번호 */}
                {isEnabled && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                    {Array.from(enabled).filter((k) => order.indexOf(k) <= index).length}
                  </span>
                )}

                {/* 항목 정보 */}
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => toggleItem(key)}
                >
                  <span className="text-base">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{item.description}</p>
                  </div>
                </button>

                {/* 활성/비활성 토글 */}
                <button
                  type="button"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isEnabled
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-muted-foreground/30"
                  }`}
                  onClick={() => toggleItem(key)}
                >
                  {isEnabled && <Check className="h-3.5 w-3.5" />}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || enabled.size === 0}
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
              {enabled.size > 0
                ? `${enabled.size}개 항목 저장`
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
