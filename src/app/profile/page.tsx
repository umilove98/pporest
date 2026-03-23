"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewCard } from "@/components/restroom/review-card";
import { LoginForm } from "@/components/auth/login-form";
import { PreferenceSurvey } from "@/components/preference/preference-survey";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/auth";
import { getReviewsByUserId, checkIsAdmin, updateAvatar, getUserPreferences, saveUserPreferences } from "@/lib/api";
import { Review, UserPreferences } from "@/lib/types";

export default function ProfilePage() {
  const { user, nickname, avatarUrl, loading, refreshProfile, needsPreferenceSurvey, setNeedsPreferenceSurvey } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [showPreferenceSurvey, setShowPreferenceSurvey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 회원가입 후속: 취향 미설정 시 자동 표시
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 모든 데이터 병렬 로딩
  useEffect(() => {
    if (!user) return;

    setReviewsLoading(true);
    setPrefsLoading(true);

    // 3개 요청 동시 시작
    const reviewsP = getReviewsByUserId(user.id);
    const adminP = checkIsAdmin();
    const prefsP = getUserPreferences(user.id);

    reviewsP
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));

    adminP.then(setIsAdmin).catch(() => setIsAdmin(false));

    prefsP
      .then((p) => {
        setPreferences(p);
        if (!p && needsPreferenceSurvey) setShowOnboarding(true);
      })
      .catch(() => setPreferences(null))
      .finally(() => setPrefsLoading(false));
  }, [user, needsPreferenceSurvey]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      await updateAvatar(user.id, file);
      refreshProfile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "사진 업로드에 실패했습니다.";
      alert(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReviewUpdated = () => {
    if (!user) return;
    getReviewsByUserId(user.id).then(setReviews).catch(() => {});
  };

  const photoCount = reviews.filter((r) => r.has_photo).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold">프로필</h1>
      </header>

      <div className="flex flex-col items-center px-4 pt-8">
        {user ? (
          <>
            {/* 프로필 사진 */}
            <button
              className="relative group"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt="프로필 사진"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">사진을 눌러 변경</p>

            <h2 className="mt-2 text-lg font-semibold">
              {nickname || "로딩 중..."}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>

            {/* 통계 */}
            <div className="mt-6 flex w-full gap-3">
              <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
                <span className="text-xl font-bold">{reviews.length}</span>
                <span className="text-xs text-muted-foreground">리뷰</span>
              </div>
              <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
                <span className="text-xl font-bold">{photoCount}</span>
                <span className="text-xs text-muted-foreground">사진</span>
              </div>
              <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
                <span className="text-xl font-bold">{avgRating}</span>
                <span className="text-xs text-muted-foreground">평균 평점</span>
              </div>
            </div>

            {/* 회원가입 후속 취향 설문 배너 */}
            {showOnboarding && !showPreferenceSurvey && (
              <Card className="mt-6 w-full border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-950/20">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-semibold">환영합니다!</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    취향을 설정하면 나만의 화장실 등급을 볼 수 있어요
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setShowPreferenceSurvey(true);
                      setShowOnboarding(false);
                    }}
                  >
                    지금 설정하기
                  </Button>
                  <button
                    className="mt-2 block w-full text-xs text-muted-foreground"
                    onClick={() => {
                      setShowOnboarding(false);
                      setNeedsPreferenceSurvey(false);
                    }}
                  >
                    나중에 할게요
                  </button>
                </CardContent>
              </Card>
            )}

            <Separator className="my-6" />

            {/* 내 취향 설정 */}
            <div className="w-full">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">내 취향</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowPreferenceSurvey(!showPreferenceSurvey)}
                >
                  {preferences ? "수정" : "설정하기"}
                </Button>
              </div>

              {showPreferenceSurvey ? (
                <PreferenceSurvey
                  initialPreferences={preferences ? { ...preferences, user_id: user.id } : null}
                  onSave={async (prefs) => {
                    prefs.user_id = user.id;
                    await saveUserPreferences(prefs);
                    setPreferences(prefs);
                    setNeedsPreferenceSurvey(false);
                    setShowPreferenceSurvey(false);
                  }}
                  compact
                />
              ) : prefsLoading ? (
                <div className="animate-pulse rounded-lg border p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-6 w-16 rounded-full bg-muted" />
                    ))}
                  </div>
                </div>
              ) : preferences ? (
                <PreferenceSummary preferences={preferences} />
              ) : (
                <button
                  className="w-full rounded-lg border-2 border-dashed border-muted-foreground/20 p-4 text-center text-sm text-muted-foreground hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                  onClick={() => setShowPreferenceSurvey(true)}
                >
                  취향을 설정하면 화장실마다 나만의 티어를 볼 수 있어요!
                </button>
              )}
            </div>

            <Separator className="my-6" />

            {/* 내 리뷰 목록 */}
            <div className="w-full">
              <h3 className="mb-3 text-sm font-semibold">내 리뷰</h3>
              {reviewsLoading ? (
                <div className="flex flex-col gap-3 pb-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse rounded-lg border p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-20 rounded bg-muted" />
                          <div className="h-3 w-24 rounded bg-muted" />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-3 w-2/3 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="flex flex-col gap-3 pb-4">
                  {reviews.map((review) => (
                    <div key={review.id}>
                      {review.restroom_name && (
                        <Link
                          href={`/restroom/${review.restroom_id}`}
                          className="mb-1 block text-xs text-emerald-600 hover:underline truncate"
                        >
                          {review.restroom_name}
                        </Link>
                      )}
                      <ReviewCard review={review} onUpdated={handleReviewUpdated} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  아직 작성한 리뷰가 없습니다.
                </p>
              )}
            </div>

            <div className="flex w-full flex-col gap-2 pb-4">
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" className="w-full">
                    관리자 페이지
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signOut()}
              >
                로그아웃
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* 비로그인 상태 */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mt-3 text-lg font-semibold">게스트 사용자</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              로그인하여 리뷰를 관리하세요
            </p>
            <div className="w-full">
              <LoginForm />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const PREF_LABELS: Record<string, { label: string }> = {
  cleanliness: { label: "청결도" },
  gender_separated: { label: "남녀분리" },
  bidet: { label: "비데" },
  stall_count: { label: "칸 수" },
  accessibility: { label: "접근성" },
  safety: { label: "안전" },
};

function PreferenceSummary({ preferences }: { preferences: UserPreferences }) {
  const items = Object.entries(PREF_LABELS)
    .filter(([key]) => preferences[key as keyof UserPreferences] != null)
    .sort(
      ([a], [b]) =>
        (preferences[a as keyof UserPreferences] as number) -
        (preferences[b as keyof UserPreferences] as number)
    );

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([key, { label }]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <span>{preferences[key as keyof UserPreferences]}.</span>
          <span>{label}</span>
        </span>
      ))}
    </div>
  );
}
