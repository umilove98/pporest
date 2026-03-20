import { supabase } from "./supabase";
import { PublicRestroom, Restroom, Review, UserRestroom } from "./types";

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
