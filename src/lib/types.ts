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
  created_at: string;
}
