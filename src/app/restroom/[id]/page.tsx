"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Clock, Accessibility, Baby, Droplets, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/restroom/star-rating";
import { PhotoGrid } from "@/components/restroom/photo-grid";
import { ReviewCard } from "@/components/restroom/review-card";
import { loadPublicRestrooms, toRestroom, getReviewsByKey } from "@/lib/api";
import { mockRestrooms, mockReviews } from "@/lib/mock-data";
import { Restroom, Review } from "@/lib/types";

export default function RestroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restroom, setRestroom] = useState<Restroom | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 정적 데이터에서 화장실 찾기
        const publicData = await loadPublicRestrooms();
        const found = publicData.find((p) => p.id === id);

        if (found) {
          setRestroom(toRestroom(found));
        } else {
          // mock fallback
          setRestroom(mockRestrooms.find((r) => r.id === id) ?? null);
        }

        // DB에서 리뷰 조회
        try {
          const revs = await getReviewsByKey(id);
          setReviews(revs);
        } catch {
          setReviews(mockReviews.filter((r) => r.restroom_key === id));
        }
      } catch {
        setRestroom(mockRestrooms.find((r) => r.id === id) ?? null);
        setReviews(mockReviews.filter((r) => r.restroom_key === id));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!restroom) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">화장실 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background px-2 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold truncate">{restroom.name}</h1>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <StarRating rating={restroom.rating} size="md" />
              <span className="ml-1 text-lg font-bold">{restroom.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">({restroom.review_count} 리뷰)</span>
          </div>

          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{restroom.address}</span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            {restroom.is_open ? (
              <span className="text-green-600">현재 이용 가능</span>
            ) : (
              <span className="text-red-500">현재 이용 불가</span>
            )}
            {restroom.open_hours && (
              <span className="ml-1">· {restroom.open_hours}</span>
            )}
          </div>

          {/* 시설 정보 아이콘 */}
          <div className="mt-3 flex flex-wrap gap-3">
            {restroom.has_disabled_access && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Accessibility className="h-4 w-4 text-blue-500" />
                <span>장애인</span>
              </div>
            )}
            {restroom.has_diaper_table && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Baby className="h-4 w-4 text-pink-500" />
                <span>기저귀대</span>
              </div>
            )}
            {restroom.has_bidet && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Droplets className="h-4 w-4 text-cyan-500" />
                <span>비데</span>
              </div>
            )}
            {restroom.is_free && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Banknote className="h-4 w-4 text-emerald-500" />
                <span>무료</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {restroom.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {restroom.source === "user" && (
              <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                유저 등록
              </Badge>
            )}
          </div>
        </div>

        {/* Photos */}
        <div>
          <h2 className="mb-2 text-sm font-semibold">사진</h2>
          <PhotoGrid count={6} />
        </div>

        <Separator />

        {/* Reviews */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">리뷰 ({reviews.length})</h2>
          </div>
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {reviews.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                아직 리뷰가 없습니다. 첫 리뷰를 남겨주세요!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="sticky bottom-16 border-t bg-background p-4">
        <Link href={`/restroom/${id}/review`}>
          <Button className="w-full">리뷰 작성하기</Button>
        </Link>
      </div>
    </div>
  );
}
