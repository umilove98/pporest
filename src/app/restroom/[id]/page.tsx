"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Clock, Accessibility, Baby, Droplets, Banknote, PenLine, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/restroom/star-rating";
import { PhotoGrid } from "@/components/restroom/photo-grid";
import { ReviewCard } from "@/components/restroom/review-card";
import { Input } from "@/components/ui/input";
import { loadPublicRestrooms, toRestroom, getReviewsByKey, createEditRequest } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { mockRestrooms, mockReviews } from "@/lib/mock-data";
import { Restroom, Review } from "@/lib/types";

export default function RestroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [restroom, setRestroom] = useState<Restroom | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState("");
  const [editCurrentValue, setEditCurrentValue] = useState("");
  const [editSuggestedValue, setEditSuggestedValue] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSubmitted, setEditSubmitted] = useState(false);

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
          setReviews(mockReviews.filter((r) => r.restroom_id === id));
        }
      } catch {
        setRestroom(mockRestrooms.find((r) => r.id === id) ?? null);
        setReviews(mockReviews.filter((r) => r.restroom_id === id));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const EDITABLE_FIELDS = [
    { key: "name", label: "화장실 이름" },
    { key: "address", label: "주소" },
    { key: "open_hours", label: "운영 시간" },
    { key: "is_free", label: "무료 여부" },
    { key: "has_disabled_access", label: "장애인 접근 가능" },
    { key: "has_diaper_table", label: "기저귀 교환대" },
  ];

  const handleEditSubmit = async () => {
    if (!user || !editSuggestedValue.trim()) return;
    setEditSubmitting(true);
    try {
      await createEditRequest({
        restroom_id: id,
        submitted_by: user.id,
        field: editField,
        current_value: editCurrentValue,
        suggested_value: editSuggestedValue.trim(),
        reason: editReason.trim(),
      });
      setEditSubmitted(true);
    } catch {
      alert("수정 요청에 실패했습니다.");
    } finally {
      setEditSubmitting(false);
    }
  };

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

        {/* 칸 수 / 성별 구분 (유저 등록 화장실인 경우) */}
        {restroom.gender_type && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              {restroom.gender_type === "mixed" ? "남녀공용" :
               restroom.gender_type === "separated" ? "남녀분리" :
               restroom.gender_type === "male_only" ? "남자화장실" : "여자화장실"}
            </span>
            {restroom.male_stalls != null && <span>남자 {restroom.male_stalls}칸</span>}
            {restroom.female_stalls != null && <span>여자 {restroom.female_stalls}칸</span>}
          </div>
        )}

        {/* 정보 수정 요청 */}
        {restroom.source === "public_data" && user && (
          <div>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline"
            >
              <PenLine className="h-3.5 w-3.5" />
              정보가 다른가요? 수정 요청하기
            </button>
          </div>
        )}

        {/* 수정 요청 모달 */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowEditModal(false)}>
            <div
              className="w-full max-w-md rounded-t-2xl bg-background p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              {editSubmitted ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                  <p className="text-sm font-medium">수정 요청이 접수되었습니다!</p>
                  <p className="text-xs text-muted-foreground">검토 후 반영됩니다.</p>
                  <Button size="sm" onClick={() => setShowEditModal(false)}>닫기</Button>
                </div>
              ) : (
                <>
                  <h3 className="mb-4 text-base font-semibold">정보 수정 요청</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">수정 항목</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EDITABLE_FIELDS.map(({ key, label }) => (
                          <Badge
                            key={key}
                            variant={editField === key ? "default" : "outline"}
                            className={`cursor-pointer text-xs ${
                              editField === key ? "bg-emerald-500" : ""
                            }`}
                            onClick={() => {
                              setEditField(key);
                              const val = restroom[key as keyof Restroom];
                              setEditCurrentValue(val != null ? String(val) : "");
                            }}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {editField && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">현재 값</label>
                          <p className="rounded bg-muted px-3 py-2 text-sm">{editCurrentValue || "(없음)"}</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">수정 제안 *</label>
                          <Input
                            placeholder="올바른 정보를 입력해주세요"
                            value={editSuggestedValue}
                            onChange={(e) => setEditSuggestedValue(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">사유 (선택)</label>
                          <Input
                            placeholder="수정 이유를 간단히 적어주세요"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                        취소
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                        disabled={!editField || !editSuggestedValue.trim() || editSubmitting}
                        onClick={handleEditSubmit}
                      >
                        {editSubmitting ? "제출 중..." : "수정 요청"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
