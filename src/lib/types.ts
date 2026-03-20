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
  created_at: string;
  // 집계 필드 (DB 리뷰에서 조회)
  rating: number;
  review_count: number;
  // 클라이언트 계산 필드
  distance?: string;
}

export interface Review {
  id: string;
  restroom_key: string; // public_data_id 또는 user_restroom uuid
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  has_photo: boolean;
  photo_url?: string;
  created_at: string;
}
