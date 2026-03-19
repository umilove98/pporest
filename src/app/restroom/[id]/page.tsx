"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/restroom/star-rating";
import { PhotoGrid } from "@/components/restroom/photo-grid";
import { ReviewCard } from "@/components/restroom/review-card";
import { mockRestrooms, mockReviews } from "@/lib/mock-data";

export default function RestroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const restroom = mockRestrooms.find((r) => r.id === id);
  const reviews = mockReviews.filter((r) => r.restroomId === id);

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
            <span className="text-sm text-muted-foreground">({restroom.reviewCount} 리뷰)</span>
          </div>

          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{restroom.address}</span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            {restroom.isOpen ? (
              <span className="text-green-600">현재 이용 가능</span>
            ) : (
              <span className="text-red-500">현재 이용 불가</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {restroom.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
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
