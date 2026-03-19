export interface Restroom {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
  is_open: boolean;
  created_at: string;
  // 집계 필드 (restroom_stats 뷰에서 조회)
  rating: number;
  review_count: number;
  // 클라이언트 계산 필드
  distance?: string;
}

export interface Review {
  id: string;
  restroom_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  has_photo: boolean;
  photo_url?: string;
  created_at: string;
}
