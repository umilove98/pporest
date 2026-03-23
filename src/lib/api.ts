import { supabase } from "./supabase";
import { EditRequest, PreferenceKey, PublicRestroom, Restroom, RestroomTier, Review, UserPreferences, UserRestroom } from "./types";

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
 * RPC: 상세 페이지용 화장실 + 리뷰통계 + 안전확인 한방 조회
 */
export interface RestroomDetailResult {
  restroom: Restroom;
  safetyCount: number;
  alreadyChecked: boolean;
}

export async function getRestroomDetail(
  restroomId: string,
  userId?: string,
): Promise<RestroomDetailResult | null> {
  // RPC 시도 → 실패 시 개별 쿼리 fallback
  const { data, error } = await supabase.rpc("get_restroom_detail", {
    p_restroom_id: restroomId,
    p_user_id: userId ?? null,
  });

  if (!error && data) {
    const d = data as {
      public: PublicRestroom | null;
      user: UserRestroom | null;
      stats: { rating: number; review_count: number };
      safety_count: number;
      already_checked: boolean;
    };

    const stats = d.stats.review_count > 0
      ? { rating: Number(d.stats.rating), review_count: d.stats.review_count }
      : { rating: 0, review_count: 0 };

    let restroom: Restroom | null = null;
    if (d.public) {
      restroom = toRestroom(d.public, stats);
    } else if (d.user) {
      restroom = userRestroomToRestroom(d.user);
      restroom.rating = stats.rating;
      restroom.review_count = stats.review_count;
    }

    if (restroom) {
      return {
        restroom,
        safetyCount: d.safety_count,
        alreadyChecked: d.already_checked,
      };
    }
  }

  // Fallback: RPC 실패 또는 데이터 없음 → 개별 쿼리
  const restroom = await getRestroomById(restroomId);
  if (!restroom) return null;

  const today = getTodayStr();
  const [safetyCount, alreadyChecked] = await Promise.all([
    getSafetyCount(restroomId),
    userId
      ? supabase
          .from("safety_checks")
          .select("*", { count: "exact", head: true })
          .eq("restroom_id", restroomId)
          .eq("user_id", userId)
          .eq("checked_date", today)
          .then(({ count }) => (count ?? 0) > 0)
      : Promise.resolve(false),
  ]);

  return { restroom, safetyCount, alreadyChecked };
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

const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  cleanliness: "청결도",
  gender_separated: "남녀분리",
  bidet: "비데",
  stall_count: "칸 수",
  accessibility: "접근성",
  safety: "안전",
};

/**
 * 사용자의 상위 취향 목록을 한글 라벨로 반환 (우선순위 1~3)
 */
async function getUserTopPreferences(userId: string): Promise<string[]> {
  const prefs = await getUserPreferences(userId);
  if (!prefs) return [];

  const entries = (Object.keys(PREFERENCE_LABELS) as PreferenceKey[])
    .filter((k) => prefs[k] != null)
    .sort((a, b) => (prefs[a] as number) - (prefs[b] as number))
    .slice(0, 3);

  return entries.map((k) => PREFERENCE_LABELS[k]);
}

/**
 * 사용자의 현재 평균 리뷰 평점
 */
async function getUserAvgRating(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) return null;
  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return Math.round(avg * 10) / 10;
}

/**
 * 리뷰 등록 (작성 시점 사용자 평균평점 + 취향 스냅샷 포함)
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
  // 스냅샷 데이터 병렬 조회
  const [avgRating, topPrefs] = await Promise.all([
    getUserAvgRating(review.user_id),
    getUserTopPreferences(review.user_id),
  ]);

  console.log("[createReview] snapshot →", { avgRating, topPrefs });

  const insertPayload = {
    ...review,
    user_avg_rating: avgRating,
    user_top_preferences: topPrefs.length > 0 ? topPrefs : null,
  };
  console.log("[createReview] insert payload →", insertPayload);

  const { data, error } = await supabase
    .from("reviews")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("[createReview] insert error →", error);
    throw error;
  }
  console.log("[createReview] saved →", data);
  return data as Review;
}

/**
 * 리뷰 감성 분석 후 DB 업데이트 (비동기 — 실패해도 리뷰 등록에 영향 없음)
 */
export async function analyzeAndUpdateSentiment(
  reviewId: string,
  comment: string,
  rating: number
): Promise<void> {
  try {
    const res = await fetch("/api/analyze-sentiment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment, rating }),
    });
    if (!res.ok) {
      console.error("Sentiment API error:", res.status);
      return;
    }
    const { sentiment } = await res.json();
    if (sentiment) {
      await supabase
        .from("reviews")
        .update({ sentiment })
        .eq("id", reviewId);
    }
  } catch (err) {
    console.error("Sentiment analysis failed:", err);
  }
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

    if (error || !data || data.length === 0) return [];

    const reviews = (data ?? []) as Review[];

    // 화장실 이름 매핑
    const restroomIds = Array.from(new Set(reviews.map((r) => r.restroom_id)));
    const [pubRes, userRes] = await Promise.all([
      supabase.from("public_restrooms").select("id, name").in("id", restroomIds),
      supabase.from("user_restrooms").select("id, name").in("id", restroomIds),
    ]);
    const nameMap = new Map<string, string>();
    (pubRes.data ?? []).forEach((r: { id: string; name: string }) => nameMap.set(r.id, r.name));
    (userRes.data ?? []).forEach((r: { id: string; name: string }) => nameMap.set(r.id, r.name));
    reviews.forEach((r) => { r.restroom_name = nameMap.get(r.restroom_id); });

    return enrichReviewsWithProfiles(reviews);
  } catch {
    return [];
  }
}


/**
 * 사진 적절성 검증 (Gemini Vision)
 */
export async function moderatePhoto(
  file: File
): Promise<{ allowed: boolean; reason: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/moderate-photo", {
    method: "POST",
    body: formData,
  });
  return res.json();
}

/**
 * 리뷰 텍스트 적절성 검증 (성희롱/차별 등 차단, 일반 욕설 허용)
 */
export async function moderateComment(
  comment: string
): Promise<{ allowed: boolean; reason: string }> {
  const res = await fetch("/api/moderate-comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  return res.json();
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

// === 사용자 취향 설문 ===

const PREFERENCE_KEYS: PreferenceKey[] = [
  "cleanliness", "gender_separated", "bidet", "stall_count", "accessibility", "safety",
];

/**
 * 사용자 취향 조회
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserPreferences;
}

/**
 * 사용자 취향 저장 (upsert)
 */
export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  const { error } = await supabase
    .from("user_preferences")
    .upsert({
      user_id: prefs.user_id,
      cleanliness: prefs.cleanliness,
      gender_separated: prefs.gender_separated,
      bidet: prefs.bidet,
      stall_count: prefs.stall_count,
      accessibility: prefs.accessibility,
      safety: prefs.safety,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

/**
 * 사용자 취향 설정 여부
 */
export async function hasUserPreferences(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("user_preferences")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return false;
  return (count ?? 0) > 0;
}

// === 티어 계산 ===

/**
 * 화장실 정보 + 사용자 취향 → 개인 티어 (S/A/B/C)
 *
 * 각 항목별 점수(0~1)를 계산하고, 우선순위 가중치로 가중평균.
 * 가중치: priority 1 → 6점, priority 2 → 5점, ... priority 6 → 1점
 * 최종 점수: 0~1 → S(≥0.8), A(≥0.6), B(≥0.4), C(<0.4)
 */
export function calculateTier(restroom: Restroom, prefs: UserPreferences): RestroomTier {
  // 활성화된 항목만 (priority가 null이 아닌 것)
  const activeKeys = PREFERENCE_KEYS.filter((k) => prefs[k] != null);
  if (activeKeys.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of activeKeys) {
    const priority = prefs[key]!;
    const weight = (PREFERENCE_KEYS.length + 1) - priority; // priority 1 → 6, priority 6 → 1
    const score = getItemScore(restroom, key);
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;

  const finalScore = weightedSum / totalWeight;

  if (finalScore >= 0.8) return "S";
  if (finalScore >= 0.6) return "A";
  if (finalScore >= 0.4) return "B";
  return "C";
}

/**
 * 화장실의 특정 항목 점수 (0~1)
 */
function getItemScore(restroom: Restroom, key: PreferenceKey): number {
  switch (key) {
    case "cleanliness":
      // 별점 기반: 5점 → 1.0, 0점 → 0.0
      return restroom.rating > 0 ? restroom.rating / 5 : 0.5; // 리뷰 없으면 중립

    case "gender_separated":
      if (restroom.gender_type === "separated") return 1.0;
      if (restroom.gender_type === "mixed") return 0.2;
      // 공공데이터: male_toilet과 female_toilet 모두 있으면 분리로 추정
      if ((restroom.male_toilet ?? 0) > 0 && (restroom.female_toilet ?? 0) > 0) return 0.8;
      return 0.5; // 정보 없음 → 중립

    case "bidet":
      if (restroom.has_bidet) return 1.0;
      // 공공데이터는 비데 정보 없음 → 중립
      if (restroom.source === "public_data") return 0.4;
      return 0.1; // 유저 등록인데 비데 없음

    case "stall_count": {
      // 총 칸 수 기반 (많을수록 좋음)
      const maleStalls = restroom.male_stalls ?? restroom.male_toilet ?? 0;
      const femaleStalls = restroom.female_stalls ?? restroom.female_toilet ?? 0;
      const total = maleStalls + femaleStalls + (restroom.male_urinal ?? 0);
      if (total === 0) return 0.5; // 정보 없음
      if (total >= 10) return 1.0;
      if (total >= 6) return 0.8;
      if (total >= 3) return 0.6;
      return 0.3;
    }

    case "accessibility":
      if (restroom.has_disabled_access) return 1.0;
      return 0.2;

    case "safety":
      // 비상벨 + CCTV
      if (restroom.emergency_bell && restroom.cctv) return 1.0;
      if (restroom.emergency_bell || restroom.cctv) return 0.6;
      return 0.3;

    default:
      return 0.5;
  }
}

/**
 * Restroom 목록에 티어를 일괄 매핑
 */
export function calculateTiers(
  restrooms: Restroom[],
  prefs: UserPreferences | null,
): Map<string, RestroomTier> {
  const map = new Map<string, RestroomTier>();
  if (!prefs) return map;

  for (const r of restrooms) {
    map.set(r.id, calculateTier(r, prefs));
  }
  return map;
}
