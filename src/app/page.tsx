"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/restroom/map-view";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { getRestrooms } from "@/lib/api";
import { mockRestrooms } from "@/lib/mock-data";
import { Restroom } from "@/lib/types";
import { getDistanceMeters, formatDistance } from "@/lib/utils";

export default function HomePage() {
  const [restrooms, setRestrooms] = useState<Restroom[]>(mockRestrooms);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  // 현재 위치 가져오기
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // 위치 권한 거부 시 무시
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // 역지오코딩: 좌표 → 주소 변환
  useEffect(() => {
    if (!location) return;
    // 카카오맵 SDK가 로드될 때까지 대기
    const tryGeocode = () => {
      if (!window.kakao?.maps?.services) return false;
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(location.lng, location.lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          const addr = result[0].road_address?.address_name || result[0].address.address_name;
          setCurrentAddress(addr);
        }
      });
      return true;
    };
    if (tryGeocode()) return;
    // SDK 아직 안 로드됐으면 폴링
    const interval = setInterval(() => {
      if (tryGeocode()) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
  }, [location]);

  // 화장실 목록 로드
  useEffect(() => {
    getRestrooms()
      .then(setRestrooms)
      .catch(() => setRestrooms(mockRestrooms))
      .finally(() => setLoading(false));
  }, []);

  // 거리 계산 + 정렬
  const restroomsWithDistance = restrooms.map((r) => ({
    ...r,
    distance: location
      ? formatDistance(getDistanceMeters(location.lat, location.lng, r.lat, r.lng))
      : r.distance,
  }));

  if (location) {
    restroomsWithDistance.sort((a, b) => {
      const distA = getDistanceMeters(location.lat, location.lng, a.lat, a.lng);
      const distB = getDistanceMeters(location.lat, location.lng, b.lat, b.lng);
      return distA - distB;
    });
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <h1 className="text-lg"><span className="font-light">PPO</span><span className="font-bold text-emerald-500">Rest</span></h1>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{currentAddress ? currentAddress : location ? "현재 위치 확인 중..." : "서울특별시 강남구 근처"}</span>
        </div>
      </header>

      {/* Map */}
      <div className="px-4 pt-4">
        <MapView restrooms={restroomsWithDistance} userLocation={location} />
      </div>

      <div className="px-4 py-3">
        <Separator />
      </div>

      {/* Restroom List */}
      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">주변 화장실</h2>
          <span className="text-xs text-muted-foreground">{restroomsWithDistance.length}개</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {restroomsWithDistance.map((restroom) => (
              <RestroomCard key={restroom.id} restroom={restroom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
