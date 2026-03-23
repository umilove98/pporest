"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, MessageSquare, Camera, LogOut, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/restroom/star-rating";
import { LoginForm } from "@/components/auth/login-form";
import { useAuth } from "@/components/auth/auth-provider";
import { signOut } from "@/lib/auth";
import { getReviewsByUserId, checkIsAdmin } from "@/lib/api";
import { Review } from "@/lib/types";

export default function ProfilePage() {
  const { user, nickname, loading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    setReviewsLoading(true);
    getReviewsByUserId(user.id)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
    checkIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user]);

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
            {/* 프로필 정보 */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mt-3 text-lg font-semibold">
              {nickname || "로딩 중..."}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>

            {/* 통계 */}
            <div className="mt-6 flex w-full gap-3">
              <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span className="mt-1 text-xl font-bold">{reviews.length}</span>
                <span className="text-xs text-muted-foreground">리뷰</span>
              </div>
              <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="mt-1 text-xl font-bold">{photoCount}</span>
                <span className="text-xs text-muted-foreground">사진</span>
              </div>
              <div className="flex flex-1 flex-col items-center rounded-lg border p-4">
                <Star className="h-5 w-5 text-muted-foreground" />
                <span className="mt-1 text-xl font-bold">{avgRating}</span>
                <span className="text-xs text-muted-foreground">평균 평점</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* 내 리뷰 목록 */}
            <div className="w-full">
              <h3 className="mb-3 text-sm font-semibold">내 리뷰</h3>
              {reviewsLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">로딩 중...</p>
              ) : reviews.length > 0 ? (
                <div className="flex flex-col gap-3 pb-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <StarRating rating={review.rating} />
                          <span className="text-xs text-muted-foreground">{review.created_at}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed">{review.comment}</p>
                      </CardContent>
                    </Card>
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
                  <Button variant="outline" className="w-full gap-2">
                    <Shield className="h-4 w-4" />
                    관리자 페이지
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* 비로그인 상태 */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
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
