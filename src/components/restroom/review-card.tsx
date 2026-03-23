"use client";

import { useState } from "react";
import { Camera, User, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";
import { Review, ReviewSentiment } from "@/lib/types";
import { useAuth } from "@/components/auth/auth-provider";
import { updateReview, deleteReview } from "@/lib/api";

const SENTIMENT_LABELS: Record<ReviewSentiment, { text: string; className: string }> = {
  positive: { text: "긍정", className: "bg-emerald-100 text-emerald-700" },
  negative: { text: "부정", className: "bg-red-100 text-red-700" },
  neutral: { text: "중립", className: "bg-slate-100 text-slate-600" },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface ReviewCardProps {
  review: Review;
  onUpdated?: () => void;
}

export function ReviewCard({ review, onUpdated }: ReviewCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === review.user_id;

  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editComment, setEditComment] = useState(review.comment);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (editRating === 0) return;
    setSaving(true);
    try {
      await updateReview(review.id, { rating: editRating, comment: editComment });
      setEditing(false);
      onUpdated?.();
    } catch {
      alert("리뷰 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteReview(review.id);
      onUpdated?.();
    } catch {
      alert("리뷰 삭제에 실패했습니다.");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {review.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={review.avatar_url}
                alt={review.user_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{review.user_name}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(review.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {editing ? (
                <StarRating rating={editRating} size="sm" onChange={setEditRating} />
              ) : (
                <StarRating rating={review.rating} />
              )}
              {!editing && review.sentiment && (
                <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SENTIMENT_LABELS[review.sentiment].className}`}>
                  {SENTIMENT_LABELS[review.sentiment].text}
                </span>
              )}
            </div>
          </div>
        </div>

        {editing ? (
          <div className="mt-3 space-y-2">
            <Textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditRating(review.rating);
                  setEditComment(review.comment);
                }}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || editRating === 0}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed">{review.comment}</p>
            {review.has_photo && (
              <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-md bg-muted">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </>
        )}

        {/* 본인 리뷰: 수정/삭제 버튼 */}
        {isOwner && !editing && (
          <div className="mt-2 flex justify-end gap-1">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">삭제할까요?</span>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={saving} className="h-7 text-xs px-2">
                  {saving ? "삭제 중..." : "확인"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={saving} className="h-7 text-xs px-2">
                  취소
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2 text-muted-foreground"
                  onClick={() => setEditing(true)}
                >
                  수정
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2 text-muted-foreground"
                  onClick={() => setConfirmDelete(true)}
                >
                  삭제
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
