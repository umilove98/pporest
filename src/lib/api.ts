import { supabase } from "./supabase";
import { Restroom, Review } from "./types";

/**
 * 전체 화장실 목록 조회 (평균 평점/리뷰 수 포함)
 */
export async function getRestrooms(): Promise<Restroom[]> {
  const { data, error } = await supabase
    .from("restroom_stats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Restroom[];
}

/**
 * 단일 화장실 상세 조회
 */
export async function getRestroomById(id: string): Promise<Restroom | null> {
  const { data, error } = await supabase
    .from("restroom_stats")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return data as Restroom;
}

/**
 * 특정 화장실의 리뷰 목록 조회
 */
export async function getReviewsByRestroomId(restroomId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("restroom_id", restroomId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Review[];
}

/**
 * 검색 및 필터링
 */
export async function searchRestrooms(
  query: string,
  filters: string[]
): Promise<Restroom[]> {
  let q = supabase.from("restroom_stats").select("*");

  if (query) {
    q = q.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
  }

  if (filters.includes("영업중")) {
    q = q.eq("is_open", true);
  }

  const tagFilters = filters.filter((f) => f !== "영업중");
  if (tagFilters.length > 0) {
    q = q.contains("tags", tagFilters);
  }

  const { data, error } = await q.order("rating", { ascending: false });

  if (error) throw error;
  return data as Restroom[];
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
 * 화장실 등록 (유저 제출 — pending 상태)
 */
export async function createRestroom(restroom: {
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
}): Promise<Restroom> {
  const { data, error } = await supabase
    .from("restrooms")
    .insert({
      ...restroom,
      source: "user",
      status: "pending",
      is_open: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Restroom;
}

/**
 * 특정 사용자의 리뷰 목록 조회
 */
export async function getReviewsByUserId(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Review[];
}
