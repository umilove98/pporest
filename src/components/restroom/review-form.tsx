"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";
import { createReview, analyzeAndUpdateSentiment, uploadPhoto, moderatePhoto, moderateComment } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";

const PHOTO_UPLOAD_MSGS = [
  "사진을 업로드하고 있어요...",
  "서버에 사진을 전송 중...",
  "잠시만 기다려주세요...",
];

const PHOTO_CHECK_MSGS = [
  "사진을 확인하고 있어요...",
  "화장실 관련 사진인지 분석 중...",
  "부적절한 내용이 없는지 검사 중...",
  "거의 다 됐어요!",
];

const COMMENT_CHECK_MSGS = [
  "리뷰 내용을 확인하고 있어요...",
  "부적절한 표현이 없는지 검토 중...",
  "커뮤니티 가이드라인 준수 여부 확인 중...",
  "거의 다 됐어요!",
];

const SAVE_MSGS = [
  "리뷰를 등록하고 있어요...",
  "소중한 후기를 저장 중...",
];

function useRotatingMessage(active: boolean, messages: string[]) {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!active) {
      setMsg("");
      return;
    }
    let idx = 0;
    setMsg(messages[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setMsg(messages[idx]);
    }, 1500);
    return () => clearInterval(timer);
  }, [active, messages]);

  return msg;
}

interface ReviewFormProps {
  restroomId: string;
  onSubmit?: () => void;
}

export function ReviewForm({ restroomId, onSubmit }: ReviewFormProps) {
  const { user, nickname } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 사진 관련 상태
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // 등록 단계 상태
  const [submitPhase, setSubmitPhase] = useState<"photo" | "comment" | "save" | null>(null);

  const uploadMsg = useRotatingMessage(photoUploading, PHOTO_UPLOAD_MSGS);
  const submitMsg = useRotatingMessage(
    submitPhase !== null,
    submitPhase === "photo" ? PHOTO_CHECK_MSGS
      : submitPhase === "comment" ? COMMENT_CHECK_MSGS
      : SAVE_MSGS,
  );

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("사진 크기는 5MB 이하만 가능합니다.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPhotoError("");
    setPhotoUploading(true);

    try {
      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // 업로드만 수행 (검증은 등록 시)
      const url = await uploadPhoto(file, `reviews/${restroomId}`);
      setPhotoUrl(url);
      setPhotoFile(file);
    } catch {
      setPhotoError("사진 업로드에 실패했습니다. 다시 시도해주세요.");
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoUrl(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setLoading(true);
    setError("");

    try {
      // 1단계: 사진 검증 (있는 경우)
      if (photoFile) {
        setSubmitPhase("photo");
        const photoResult = await moderatePhoto(photoFile);
        if (!photoResult.allowed) {
          setError(`등록 실패: ${photoResult.reason || "부적절한 사진입니다."}`);
          removePhoto();
          setLoading(false);
          setSubmitPhase(null);
          return;
        }
      }

      // 2단계: 리뷰 내용 검증
      if (comment.trim()) {
        setSubmitPhase("comment");
        const modResult = await moderateComment(comment);
        if (!modResult.allowed) {
          setError(`등록 실패: ${modResult.reason || "부적절한 내용이 포함되어 있습니다."}`);
          setLoading(false);
          setSubmitPhase(null);
          return;
        }
      }

      // 3단계: 리뷰 저장
      if (user) {
        setSubmitPhase("save");
        const created = await createReview({
          restroom_id: restroomId,
          user_id: user.id,
          user_name: nickname || "익명",
          rating,
          comment,
          has_photo: !!photoUrl,
          photo_url: photoUrl || undefined,
        });
        analyzeAndUpdateSentiment(created.id, comment, rating);
      }
      setSubmitted(true);
      onSubmit?.();
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setComment("");
        removePhoto();
      }, 2000);
    } catch {
      setError("리뷰 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
      setSubmitPhase(null);
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
          disabled={photoUploading}
        />

        {photoPreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="리뷰 사진 미리보기"
              className="h-24 w-24 rounded-md object-cover"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
          >
            {photoUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                사진 업로드 중
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                사진 추가
              </>
            )}
          </Button>
        )}

        {photoUploading && (
          <p className="mt-1.5 text-xs text-muted-foreground animate-pulse">{uploadMsg}</p>
        )}
        {photoError && <p className="mt-1 text-xs text-red-500">{photoError}</p>}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <Button type="submit" className="w-full" disabled={rating === 0 || loading || photoUploading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              등록 중...
            </span>
          ) : "리뷰 등록하기"}
        </Button>
        {loading && submitMsg && (
          <p className="mt-1.5 text-center text-xs text-muted-foreground animate-pulse">{submitMsg}</p>
        )}
      </div>
    </form>
  );
}
