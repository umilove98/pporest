import { supabase } from "./supabase";
import { EditRequest, PublicRestroom, Restroom, Review, UserRestroom } from "./types";

// === 유저 프로필 (닉네임) ===

/**
 * DB 중복 검사 기반 유니크 닉네임 생성
 * "맑은 숲지기" 가 이미 있으면 "맑은 숲지기 2", "맑은 숲지기 3" ... 순차 부여
 */
export async function generateUniqueNickname(): Promise<string> {
  const { generateRandomNicknameBase } = await import("./nickname");
  const base = generateRandomNicknameBase(); // "맑은 숲지기" (번호 없음)

  // 동일 base로 시작하는 닉네임 중 가장 큰 번호 조회
  const { data } = await supabase
    .from("user_profiles")
    .select("nickname")
    .like("nickname", `${base}%`);

  if (!data || data.length === 0) return base;

  // 기존 번호 파싱
  let maxNum = 0;
  for (const row of data) {
    if (row.nickname === base) {
      maxNum = Math.max(maxNum, 1);
    } else {
      const suffix = row.nickname.slice(base.length).trim();
      const num = parseInt(suffix, 10);
      if (!isNaN(num)) maxNum = Math.max(maxNum, num);
    }
  }

  return `${base} ${maxNum + 1}`;
}

/**
 * 유저 닉네임 조회 — 없으면 user_metadata에서 가져와 프로필 생성
 * user_metadata에 항상 닉네임을 백업하여 DB 실패 시에도 동일 닉네임 유지
 */
export async function getOrCreateNickname(userId: string): Promise<string> {
  // 1) 기존 프로필 조회
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.nickname) return existing.nickname;

  // 2) 가입 시 설정한 닉네임을 user_metadata에서 가져옴
  const { data: { user } } = await supabase.auth.getUser();
  const metaNickname = user?.user_metadata?.nickname;

  // 3) metadata에도 없으면 유니크 랜덤 생성 후 metadata에 저장 (영구 고정)
  let nickname: string;
  if (metaNickname) {
    nickname = metaNickname;
  } else {
    nickname = await generateUniqueNickname();
    await supabase.auth.updateUser({ data: { nickname } });
  }

  // 4) user_profiles 테이블에 저장 시도
  const { data: created, error: insertError } = await supabase
    .from("user_profiles")
    .insert({ user_id: userId, nickname })
    .select("nickname")
    .single();

  if (insertError) {
    // 동시 insert 충돌 시 다시 조회, 실패해도 metadata 닉네임 반환
    const { data: retry } = await supabase
      .from("user_profiles")
      .select("nickname")
      .eq("user_id", userId)
      .maybeSingle();
    return retry?.nickname ?? nickname;
  }

  return created.nickname;
}

/**
 * 유저 닉네임 조회 (읽기 전용, 없으면 null)
 */
export async function getNickname(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.nickname ?? null;
}

/**
 * 프로필 사진 URL 조회
 */
export async function getAvatarUrl(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("avatar_url")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.avatar_url ?? null;
}

/**
 * 프로필 사진 업로드 및 URL 저장
 */
export async function updateAvatar(userId: string, file: File): Promise<string> {
  // 파일 크기 제한 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("사진 크기는 5MB 이하만 가능합니다.");
  }

  const ext = file.name.split(".").pop() || "jpg";
  // 본인 폴더에 고정 파일명으로 덮어쓰기
  const fileName = `${userId}/profile.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { contentType: file.type, upsert: true });

  if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`);

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  // 브라우저 캐시 방지용 쿼리 파라미터
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

  // avatar_url만 업데이트 (프로필은 가입 시 이미 생성됨)
  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId);

  if (updateError) throw new Error(`프로필 저장 실패: ${updateError.message}`);

  return avatarUrl;
}

// === 공공 화장실 DB 조회 ===

/** RPC 결과 → Restroom 변환 (별점 포함) */
function rpcRowToRestroom(row: {
  id: string; name: string; address: string; lat: number; lng: number;
  disabled: boolean; diaper: boolean; hours: string | null;
  male_toilet: number; male_urinal: number; female_toilet: number;
  emergency_bell: boolean; cctv: boolean; data_date: string | null;
  avg_rating: number; review_count: number;
}): Restroom {
  const tags: string[] = ["무료"];
  if (row.disabled) tags.push("장애인 접근 가능");
  if (row.diaper) tags.push("기저귀 교환대");
  if (row.hours?.includes("24시간")) tags.push("24시간");

  return {
    id: row.id, name: row.name, address: row.address,
    lat: row.lat, lng: row.lng, tags,
    is_open: true, source: "public_data", status: "approved",
    has_disabled_access: row.disabled, has_diaper_table: row.diaper,
    has_bidet: false, is_free: true, open_hours: row.hours,
    male_toilet: row.male_toilet, male_urinal: row.male_urinal,
    female_toilet: row.female_toilet, emergency_bell: row.emergency_bell,
    cctv: row.cctv, data_date: row.data_date, created_at: "",
    rating: Number(row.avg_rating),
    review_count: Number(row.review_count),
  };
}

/**
 * bounds 내 공공 화장실 + 별점 통계 (RPC 한 번 호출)
 */
export async function getPublicRestroomsWithStatsByBounds(
  swLat: number, swLng: number, neLat: number, neLng: number,
  limit = 30
): Promise<Restroom[]> {
  const { data, error } = await supabase.rpc("get_public_restrooms_with_stats", {
    sw_lat: swLat, sw_lng: swLng, ne_lat: neLat, ne_lng: neLng, max_count: limit,
  });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => rpcRowToRestroom(row));
}

/**
 * 공공 화장실 검색 + 별점 통계 (RPC 한 번 호출)
 */
export async function searchPublicRestroomsWithStats(
  query: string,
  filters: string[],
  limit = 30
): Promise<Restroom[]> {
  const { data, error } = await supabase.rpc("search_public_restrooms_with_stats", {
    search_query: query,
    filter_disabled: filters.includes("장애인 접근 가능"),
    filter_diaper: filters.includes("기저귀 교환대"),
    filter_24h: filters.includes("24시간"),
    max_count: limit,
  });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => rpcRowToRestroom(row));
}

/**
 * bounds 내 공공 화장실 조회 (지도 표시용)
 */
export async function getPublicRestroomsByBounds(
  swLat: number, swLng: number, neLat: number, neLng: number,
  limit = 50
): Promise<PublicRestroom[]> {
  const { data, error } = await supabase
    .from("public_restrooms")
    .select("id,name,address,lat,lng,disabled,diaper,hours,male_toilet,male_urinal,female_toilet,emergency_bell,cctv,data_date")
    .gte("lat", swLat)
    .lte("lat", neLat)
    .gte("lng", swLng)
    .lte("lng", neLng)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PublicRestroom[];
}

/**
 * ID로 공공 화장실 단건 조회
 */
export async function getPublicRestroomById(id: string): Promise<PublicRestroom | null> {
  const { data, error } = await supabase
    .from("public_restrooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PublicRestroom | null;
}

/**
 * 공공 화장실 검색 (DB ILIKE + 필터)
 */
export async function searchPublicRestroomsDB(
  query: string,
  filters: string[],
  limit = 50
): Promise<PublicRestroom[]> {
  let q = supabase.from("public_restrooms").select("*");

  if (query) {
    q = q.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
  }

  if (filters.includes("장애인 접근 가능")) {
    q = q.eq("disabled", true);
  }
  if (filters.includes("기저귀 교환대")) {
    q = q.eq("diaper", true);
  }
  if (filters.includes("24시간")) {
    q = q.ilike("hours", "%24시간%");
  }

  const { data, error } = await q.limit(limit);

  if (error) throw error;
  return (data ?? []) as PublicRestroom[];
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

/**
 * ID로 유저 등록 화장실 단건 조회
 */
export async function getUserRestroomById(id: string): Promise<UserRestroom | null> {
  const { data, error } = await supabase
    .from("user_restrooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data as UserRestroom | null;
}

/**
 * 특정 화장실의 리뷰 통계 (review_stats 뷰 사용)
 */
export async function getReviewStats(restroomId: string): Promise<{ rating: number; review_count: number }> {
  const { data, error } = await supabase
    .from("review_stats")
    .select("rating, review_count")
    .eq("restroom_id", restroomId)
    .maybeSingle();

  if (error || !data) {
    return { rating: 0, review_count: 0 };
  }

  return { rating: Number(data.rating), review_count: data.review_count };
}

/**
 * 여러 화장실의 리뷰 통계를 일괄 조회 (review_stats 뷰 사용)
 */
export async function getReviewStatsBatch(restroomIds: string[]): Promise<Map<string, { rating: number; review_count: number }>> {
  const map = new Map<string, { rating: number; review_count: number }>();
  if (restroomIds.length === 0) return map;

  const { data } = await supabase
    .from("review_stats")
    .select("restroom_id, rating, review_count")
    .in("restroom_id", restroomIds);

  for (const row of data ?? []) {
    map.set(row.restroom_id, { rating: Number(row.rating), review_count: row.review_count });
  }
  return map;
}

/**
 * Restroom 목록에 리뷰 통계를 일괄 매핑
 */
export async function enrichRestroomsWithStats(restrooms: Restroom[]): Promise<Restroom[]> {
  if (restrooms.length === 0) return restrooms;

  const ids = restrooms.map((r) => r.id);
  const statsMap = await getReviewStatsBatch(ids);

  return restrooms.map((r) => {
    const stats = statsMap.get(r.id);
    if (stats) {
      return { ...r, rating: stats.rating, review_count: stats.review_count };
    }
    return r;
  });
}

/**
 * ID로 화장실 조회 (공공 → 유저 순으로 탐색, 통합 Restroom 반환 + 리뷰 통계 포함)
 */
export async function getRestroomById(id: string): Promise<Restroom | null> {
  // 공공 화장실 먼저 조회
  const pub = await getPublicRestroomById(id);
  if (pub) {
    const stats = await getReviewStats(id);
    return toRestroom(pub, stats);
  }

  // 유저 등록 화장실 조회
  const ur = await getUserRestroomById(id);
  if (ur) {
    const stats = await getReviewStats(id);
    const restroom = userRestroomToRestroom(ur);
    restroom.rating = stats.rating;
    restroom.review_count = stats.review_count;
    return restroom;
  }

  return null;
}

/**
 * bounds 내 승인된 유저 등록 화장실 조회
 */
export async function getUserRestroomsByBounds(
  swLat: number, swLng: number, neLat: number, neLng: number,
  limit = 50
): Promise<UserRestroom[]> {
  const { data, error } = await supabase
    .from("user_restrooms")
    .select("*")
    .eq("status", "approved")
    .gte("lat", swLat)
    .lte("lat", neLat)
    .gte("lng", swLng)
    .lte("lng", neLng)
    .limit(limit);

  if (error) return [];
  return (data ?? []) as UserRestroom[];
}

/**
 * UserRestroom → Restroom 변환 (화면 표시용)
 */
export function userRestroomToRestroom(r: UserRestroom): Restroom {
  return {
    ...r,
    source: "user" as const,
    rating: 0,
    review_count: 0,
  };
}

/**
 * 승인된 유저 등록 화장실 검색 (이름/주소 ILIKE + 필터)
 */
export async function searchUserRestroomsDB(
  query: string,
  filters: string[],
  limit = 50
): Promise<UserRestroom[]> {
  let q = supabase
    .from("user_restrooms")
    .select("*")
    .eq("status", "approved");

  if (query) {
    q = q.or(`name.ilike.%${query}%,address.ilike.%${query}%`);
  }

  if (filters.includes("장애인 접근 가능")) {
    q = q.eq("has_disabled_access", true);
  }
  if (filters.includes("기저귀 교환대")) {
    q = q.eq("has_diaper_table", true);
  }
  if (filters.includes("24시간")) {
    q = q.ilike("open_hours", "%24시간%");
  }

  const { data, error } = await q.limit(limit);

  if (error) return [];
  return (data ?? []) as UserRestroom[];
}

// === 사진 업로드 (Supabase Storage) ===

/**
 * 사진 파일을 Storage에 업로드하고 공개 URL 반환
 */
export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("restroom-photos")
    .upload(fileName, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage
    .from("restroom-photos")
    .getPublicUrl(fileName);

  return data.publicUrl;
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
 * 리뷰 목록에 user_profiles의 실시간 닉네임/아바타를 매핑
 */
async function enrichReviewsWithProfiles(reviews: Review[]): Promise<Review[]> {
  if (reviews.length === 0) return reviews;

  const userIds = Array.from(new Set(reviews.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, nickname, avatar_url")
    .in("user_id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  return reviews.map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      ...r,
      user_name: profile?.nickname ?? r.user_name,
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}

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
    return enrichReviewsWithProfiles((data ?? []) as Review[]);
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
 * 리뷰 수정 (본인 리뷰만 — RLS로 보장)
 */
export async function updateReview(
  reviewId: string,
  updates: { rating: number; comment: string }
): Promise<void> {
  const { error } = await supabase
    .from("reviews")
    .update(updates)
    .eq("id", reviewId);

  if (error) throw error;
}

/**
 * 리뷰 삭제 (본인 리뷰만 — RLS로 보장)
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId);

  if (error) throw error;
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
    return enrichReviewsWithProfiles((data ?? []) as Review[]);
  } catch {
    return [];
  }
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
