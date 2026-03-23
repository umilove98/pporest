"use client";

import { useState } from "react";
import { Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";
import { createReview, analyzeAndUpdateSentiment } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";

interface ReviewFormProps {
  restroomId: string;
  onSubmit?: () => void;
}

export function ReviewForm({ restroomId, onSubmit }: ReviewFormProps) {
  const { user, nickname } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [photoAdded, setPhotoAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setLoading(true);
    setError("");

    try {
      if (user) {
        const created = await createReview({
          restroom_id: restroomId,
          user_id: user.id,
          user_name: nickname || "익명",
          rating,
          comment,
          has_photo: photoAdded,
        });
        // 감성 분석은 비동기로 — 리뷰 등록 UX에 영향 없음
        analyzeAndUpdateSentiment(created.id, comment, rating);
      }
      setSubmitted(true);
      onSubmit?.();
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setComment("");
        setPhotoAdded(false);
      }, 2000);
    } catch {
      setError("리뷰 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted-foreground">리뷰를 작성하려면 로그인이 필요합니다.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <p className="font-medium">리뷰가 등록되었습니다!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">별점</label>
        <StarRating rating={rating} size="md" onChange={setRating} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">후기</label>
        <Textarea
          placeholder="이 화장실에 대한 경험을 공유해주세요..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => setPhotoAdded(!photoAdded)}
        >
          <Camera className="h-4 w-4" />
          {photoAdded ? "사진 추가됨" : "사진 추가"}
        </Button>
        {photoAdded && (
          <div className="mt-2 flex h-20 w-20 items-center justify-center rounded-md bg-muted">
            <Camera className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={rating === 0 || loading}>
        {loading ? "등록 중..." : "리뷰 등록하기"}
      </Button>
    </form>
  );
}
