"use client";

import { useState } from "react";
import { Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";

export function ReviewForm({ onSubmit }: { onSubmit?: (review: { rating: number; comment: string }) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [photoAdded, setPhotoAdded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    onSubmit?.({ rating, comment });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setRating(0);
      setComment("");
      setPhotoAdded(false);
    }, 2000);
  };

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

      <Button type="submit" className="w-full" disabled={rating === 0}>
        리뷰 등록하기
      </Button>
    </form>
  );
}
