import { supabase } from "./supabase";
import { EditRequest, PublicRestroom, Restroom, Review, UserRestroom } from "./types";

// === 정적 공공데이터 로드 ===

let publicDataCache: PublicRestroom[] | null = null;

/**
 * 정적 JSON에서 공공 화장실 데이터 로드
 */
export async function loadPublicRestrooms(): Promise<PublicRestroom[]> {
  if (publicDataCache) return publicDataCache;

  const res = await fetch("/data/public-restrooms.json");
  if (!res.ok) throw new Error("공공 화장실 데이터를 불러올 수 없습니다.");
  publicDataCache = await res.json();
  return publicDataCache!;
}

/**
 * PublicRestroom → Restroom 변환 (화면 표시용)
 */
export function toRestroom(
  p: PublicRestroom,
  stats?: { rating: number; review_count: number }
): Restroom {
  const tags: string[] = ["무료"];
  if (p.disabled) tags.push("장애인 접근 가능");
  if (p.diaper) tags.push("기저귀 교환대");
  if (p.hours?.includes("24시간")) tags.push("24시간");

  return {
    id: p.id,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    tags,
    is_open: true,
    source: "public_data",
    status: "approved",
    has_disabled_access: p.disabled,
    has_diaper_table: p.diaper,
    has_bidet: false,
    is_free: true,
    open_hours: p.hours,
    male_toilet: p.male_toilet,
    male_urinal: p.male_urinal,
    female_toilet: p.female_toilet,
    emergency_bell: p.emergency_bell,
    cctv: p.cctv,
    data_date: p.data_date,
    created_at: "",
    rating: stats?.rating ?? 0,
    review_count: stats?.review_count ?? 0,
  };
}

// === DB: 유저 등록 화장실 ===

/**
 * 승인된 유저 등록 화장실 목록 (DB 없으면 빈 배열 반환)
 */
export async function getUserRestrooms(): Promise<Restroom[]> {
  try {
    const { data, error } = await supabase
      .from("user_restrooms")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) return [];

    return (data as UserRestroom[]).map((r) => ({
      ...r,
      source: "user" as const,
      rating: 0,
      review_count: 0,
    }));
  } catch {
    return [];
  }
}

/**
 * 화장실 등록 (유저 제출 — pending 상태)
 */
export async function createUserRestroom(restroom: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
  submitted_by: string;
  has_disabled_access: boolean;
  has_diaper_table: boolean;
  has_bidet: boolean;
  is_free: boolean;
  open_hours: string | null;
  gender_type: "mixed" | "separated" | "male_only" | "female_only";
  male_stalls: number | null;
  female_stalls: number | null;
  photo_urls: string[];
}): Promise<UserRestroom> {
  const { data, error } = await supabase
    .from("user_restrooms")
    .insert({
      ...restroom,
      status: "pending",
      is_open: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as UserRestroom;
}

// === DB: 리뷰 ===

/**
 * 특정 화장실의 리뷰 목록
 */
export async function getReviewsByKey(restroomKey: string): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("restroom_id", restroomKey)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as Review[];
  } catch {
    return [];
  }
}

/**
 * 리뷰 등록
 */
export async function createReview(review: {
  restroom_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  has_photo?: boolean;
  photo_url?: string;
}): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

/**
 * 특정 사용자의 리뷰 목록 (에러 시 빈 배열)
 */
export async function getReviewsByUserId(userId: string): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []) as Review[];
  } catch {
    return [];
  }
}

/**
 * 검색 (정적 데이터에서 클라이언트 검색)
 */
export function searchPublicRestrooms(
  restrooms: PublicRestroom[],
  query: string,
  filters: string[]
): PublicRestroom[] {
  let results = restrooms;

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (r) => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q)
    );
  }

  if (filters.includes("장애인 접근 가능")) {
    results = results.filter((r) => r.disabled);
  }
  if (filters.includes("기저귀 교환대")) {
    results = results.filter((r) => r.diaper);
  }
  if (filters.includes("24시간")) {
    results = results.filter((r) => r.hours?.includes("24시간"));
  }

  return results;
}

// === 수정 요청 ===

/**
 * 공공데이터 화장실 정보 수정 요청
 */
export async function createEditRequest(req: {
  restroom_id: string;
  submitted_by: string;
  field: string;
  current_value: string;
  suggested_value: string;
  reason: string;
}): Promise<EditRequest> {
  const { data, error } = await supabase
    .from("edit_requests")
    .insert({ ...req, status: "pending" })
    .select()
    .single();

  if (error) throw error;
  return data as EditRequest;
}

// === 관리자 기능 ===

/**
 * 현재 로그인한 유저가 관리자인지 확인
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

/**
 * 대기 중인 유저 등록 화장실 목록
 */
export async function getPendingRestrooms(): Promise<UserRestroom[]> {
  const { data, error } = await supabase
    .from("user_restrooms")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserRestroom[];
}

/**
 * 화장실 등록 승인
 */
export async function approveRestroom(id: string): Promise<void> {
  const { error } = await supabase
    .from("user_restrooms")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw error;
}

/**
 * 화장실 등록 거절 (삭제)
 */
export async function rejectRestroom(id: string): Promise<void> {
  const { error } = await supabase
    .from("user_restrooms")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * 대기 중인 수정 요청 목록
 */
export async function getPendingEditRequests(): Promise<EditRequest[]> {
  const { data, error } = await supabase
    .from("edit_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EditRequest[];
}

/**
 * 수정 요청 처리 (승인/거절)
 */
export async function resolveEditRequest(id: string, status: "approved" | "rejected"): Promise<void> {
  const { error } = await supabase
    .from("edit_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// === 안전 확인 (오늘도 안전해요!) ===

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 오늘의 안전 확인 횟수 조회
 */
export async function getSafetyCount(restroomId: string): Promise<number> {
  const today = getTodayStr();
  const { count, error } = await supabase
    .from("safety_checks")
    .select("*", { count: "exact", head: true })
    .eq("restroom_id", restroomId)
    .eq("checked_date", today);

  if (error) return 0;
  return count ?? 0;
}

/**
 * 안전 확인 등록 (1일 1회, unique 제약으로 중복 방지)
 */
export async function checkSafety(restroomId: string, userId: string): Promise<boolean> {
  const today = getTodayStr();
  const { error } = await supabase
    .from("safety_checks")
    .insert({
      restroom_id: restroomId,
      user_id: userId,
      checked_date: today,
    });

  // unique 제약 위반 = 이미 오늘 체크함
  if (error) return false;
  return true;
}

/**
 * 오늘 이미 확인했는지 여부
 */
export async function hasCheckedSafetyToday(restroomId: string, userId: string): Promise<boolean> {
  const today = getTodayStr();
  const { count, error } = await supabase
    .from("safety_checks")
    .select("*", { count: "exact", head: true })
    .eq("restroom_id", restroomId)
    .eq("user_id", userId)
    .eq("checked_date", today);

  if (error) return false;
  return (count ?? 0) > 0;
}
