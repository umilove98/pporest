/** 공공데이터 정적 JSON에서 로드되는 화장실 (경량) */
export interface PublicRestroom {
  id: string;          // "pd-1" 형태의 공공데이터 키
  name: string;
  address: string;
  lat: number;
  lng: number;
  disabled: boolean;   // 장애인 화장실 여부
  diaper: boolean;     // 기저귀 교환대 여부
  hours: string | null; // 개방시간
  male_toilet: number;  // 남성용 대변기 수
  male_urinal: number;  // 남성용 소변기 수
  female_toilet: number; // 여성용 대변기 수
  emergency_bell: boolean; // 비상벨 설치 여부
  cctv: boolean;        // 입구 CCTV 설치 여부
  data_date: string | null; // 데이터 기준일자
}

/** 유저가 등록한 화장실 (DB 저장) */
export interface UserRestroom {
  id: string;           // uuid
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
  is_open: boolean;
  status: "approved" | "pending";
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
  created_at: string;
}

/** 공공데이터 수정 요청 */
export interface EditRequest {
  id: string;
  restroom_id: string;    // 대상 화장실 ID (pd-xxx 또는 uuid)
  submitted_by: string;
  field: string;          // 수정 대상 필드명
  current_value: string;  // 현재 값
  suggested_value: string; // 제안 값
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

/** 화면에 표시되는 통합 화장실 (정적 + DB 합쳐서 사용) */
export interface Restroom {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
  is_open: boolean;
  source: "public_data" | "user";
  status: "approved" | "pending";
  has_disabled_access: boolean;
  has_diaper_table: boolean;
  has_bidet: boolean;
  is_free: boolean;
  open_hours: string | null;
  gender_type?: "mixed" | "separated" | "male_only" | "female_only";
  male_toilet?: number;
  male_urinal?: number;
  female_toilet?: number;
  emergency_bell?: boolean;
  cctv?: boolean;
  data_date?: string | null;
  male_stalls?: number | null;
  female_stalls?: number | null;
  photo_urls?: string[];
  created_at: string;
  // 집계 필드 (DB 리뷰에서 조회)
  rating: number;
  review_count: number;
  // 클라이언트 계산 필드
  distance?: string;
}

/** 사용자 취향 설문 (화장실 선호도) */
export interface UserPreferences {
  user_id: string;
  cleanliness: number | null;    // 청결도
  gender_separated: number | null; // 남녀분리
  bidet: number | null;          // 비데
  stall_count: number | null;    // 칸 수 (대기시간)
  accessibility: number | null;  // 장애인 접근성
  safety: number | null;         // 안전 (비상벨/CCTV)
}

/** 취향 설문 항목 키 */
export type PreferenceKey = "cleanliness" | "gender_separated" | "bidet" | "stall_count" | "accessibility" | "safety";

/** 화장실 개인 티어 */
export type RestroomTier = "S" | "A" | "B" | "C" | null;

export type ReviewSentiment = "positive" | "negative" | "neutral";

export interface Review {
  id: string;
  restroom_id: string; // public_data_id 또는 user_restroom uuid
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  has_photo: boolean;
  photo_url?: string;
  avatar_url?: string | null;
  sentiment?: ReviewSentiment | null;
  created_at: string;
  // 리뷰 작성 시점 스냅샷 (DB 저장)
  user_avg_rating?: number | null;
  user_top_preferences?: string[] | null;
  // 프로필 내 리뷰 표시용 (클라이언트에서 매핑)
  restroom_name?: string;
}
