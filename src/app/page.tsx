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

  // 현재 위치 가져오기
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // 위치 권한 거부 시 무시
    );
  }, []);

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
        <h1 className="text-lg font-bold">PPORest</h1>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{location ? "현재 위치 기반" : "서울특별시 강남구 근처"}</span>
        </div>
      </header>

      {/* Map */}
      <div className="px-4 pt-4">
        <MapView restrooms={restroomsWithDistance} />
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
