"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MapView, MapBounds, MarkerData } from "@/components/restroom/map-view";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { loadPublicRestrooms, toRestroom } from "@/lib/api";
import { PublicRestroom, Restroom } from "@/lib/types";
import { getDistanceMeters, formatDistance } from "@/lib/utils";

const MAX_LIST_ITEMS = 20;
const MAX_MARKERS = 50;

export default function HomePage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [filteredMarkers, setFilteredMarkers] = useState<MarkerData[]>([]);
  const [visibleRestrooms, setVisibleRestrooms] = useState<Restroom[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const publicDataRef = useRef<PublicRestroom[]>([]);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // 1. 현재 위치 가져오기
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

  // 역지오코딩
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

  // 2. 지도 bounds가 정해지면 데이터 로드 (최초 1회만)
  useEffect(() => {
    if (!mapBounds || dataReady) return;
    async function load() {
      try {
        const data = await loadPublicRestrooms();
        publicDataRef.current = data;
        setDataReady(true);
      } catch {
        setDataReady(true);
      }
    }
    load();
  }, [mapBounds, dataReady]);

  // 3. bounds 변경 또는 데이터 로드 완료 시 → 범위 내 필터링
  useEffect(() => {
    if (!mapBounds || !dataReady) return;

    const data = publicDataRef.current;
    const { sw, ne } = mapBounds;

    // bounds 내 필터링
    const inBounds = data.filter(
      (r) => r.lat >= sw.lat && r.lat <= ne.lat && r.lng >= sw.lng && r.lng <= ne.lng
    );

    // 거리순 정렬 (위치 있을 때)
    if (location) {
      inBounds.sort((a, b) => {
        const distA = getDistanceMeters(location.lat, location.lng, a.lat, a.lng);
        const distB = getDistanceMeters(location.lat, location.lng, b.lat, b.lng);
        return distA - distB;
      });
    }

    // 마커용 (최대 50개, 경량)
    setFilteredMarkers(
      inBounds.slice(0, MAX_MARKERS).map((r) => ({
        id: r.id,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
      }))
    );

    // 리스트용 (최대 20개, 풀 변환)
    setVisibleRestrooms(
      inBounds.slice(0, MAX_LIST_ITEMS).map((p) => {
        const restroom = toRestroom(p);
        if (location) {
          restroom.distance = formatDistance(
            getDistanceMeters(location.lat, location.lng, p.lat, p.lng)
          );
        }
        return restroom;
      })
    );
  }, [mapBounds, dataReady, location]);

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

      {/* Map — 항상 먼저 렌더, 데이터는 나중에 전달 */}
      <div className="px-4 pt-4">
        {locationReady ? (
          <MapView restrooms={filteredMarkers} userLocation={location} onBoundsChange={handleBoundsChange} />
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
        {!mapBounds ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">지도가 준비되면 주변 화장실이 표시됩니다</p>
          </div>
        ) : !dataReady ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
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
