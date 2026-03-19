export interface Restroom {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  isOpen: boolean;
  lat: number;
  lng: number;
}

export interface Review {
  id: string;
  restroomId: string;
  userName: string;
  rating: number;
  comment: string;
  hasPhoto: boolean;
  createdAt: string;
}
