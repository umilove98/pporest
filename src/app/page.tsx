"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MapView, MapBounds } from "@/components/restroom/map-view";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { loadPublicRestrooms, toRestroom, getUserRestrooms } from "@/lib/api";
import { mockRestrooms } from "@/lib/mock-data";
import { Restroom } from "@/lib/types";
import { getDistanceMeters, formatDistance } from "@/lib/utils";

export default function HomePage() {
  const [restrooms, setRestrooms] = useState<Restroom[]>(mockRestrooms);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // 현재 위치 가져오기
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationReady(true);
      },
      () => setLocationReady(true),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // 역지오코딩: 좌표 → 주소 (Kakao Maps services)
  useEffect(() => {
    if (!location) return;
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
    const interval = setInterval(() => {
      if (tryGeocode()) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
  }, [location]);

  // 데이터 로드: 정적 JSON + DB 유저 등록 화장실
  useEffect(() => {
    async function load() {
      try {
        const publicData = await loadPublicRestrooms();
        const publicRestrooms = publicData.map((p) => toRestroom(p));

        // DB에서 유저 등록 화장실도 가져오기 (실패 시 무시)
        let userRestrooms: Restroom[] = [];
        try {
          userRestrooms = await getUserRestrooms();
        } catch {
          // Supabase 미연결 시 무시
        }

        setRestrooms([...publicRestrooms, ...userRestrooms]);
      } catch {
        // 정적 JSON 로드 실패 시 mock 사용
        setRestrooms(mockRestrooms);
      } finally {
        setLoading(false);
      }
    }
    load();
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

  // 지도 bounds 내 화장실만 필터링
  const visibleRestrooms = mapBounds
    ? restroomsWithDistance.filter(
        (r) =>
          r.lat >= mapBounds.sw.lat &&
          r.lat <= mapBounds.ne.lat &&
          r.lng >= mapBounds.sw.lng &&
          r.lng <= mapBounds.ne.lng
      )
    : restroomsWithDistance;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <h1 className="text-lg"><span className="font-light">PPO</span><span className="font-bold text-emerald-500">Rest</span></h1>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{currentAddress ? currentAddress : "현재 위치 확인 중..."}</span>
        </div>
      </header>

      {/* Map */}
      <div className="px-4 pt-4">
        {locationReady ? (
          <MapView restrooms={restroomsWithDistance} userLocation={location} onBoundsChange={handleBoundsChange} />
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-xl border bg-muted/30">
            <p className="text-sm text-muted-foreground">위치 확인 중...</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <Separator />
      </div>

      {/* Restroom List */}
      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">주변 화장실</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{visibleRestrooms.length}개</span>
            <Link
              href="/restroom/new"
              className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600"
            >
              <Plus className="h-3 w-3" />
              등록
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : visibleRestrooms.length === 0 ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">지도 영역 내 화장실이 없습니다. 지도를 이동해보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {visibleRestrooms.map((restroom) => (
              <RestroomCard key={restroom.id} restroom={restroom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
