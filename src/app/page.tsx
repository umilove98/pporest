"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MapView, MapBounds, MarkerData } from "@/components/restroom/map-view";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { getPublicRestroomsWithStatsByBounds, getUserRestroomsByBounds, userRestroomToRestroom, enrichRestroomsWithStats } from "@/lib/api";
import { Restroom } from "@/lib/types";
import { getDistanceMeters, formatDistance } from "@/lib/utils";

const MAX_LIST_ITEMS = 15;
const MAX_MARKERS = 30;

export default function HomePage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [filteredMarkers, setFilteredMarkers] = useState<MarkerData[]>([]);
  const [visibleRestrooms, setVisibleRestrooms] = useState<Restroom[]>([]);
  const [loading, setLoading] = useState(false);
  const boundsRef = useRef<MapBounds | null>(null);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // 1. 현재 위치 가져오기 — layout.tsx <head>에서 이미 시작된 GPS 결과 활용
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geo = (window as any).__geo as { p: Promise<{ lat: number; lng: number } | null>; result?: { lat: number; lng: number } } | undefined;

    if (geo) {
      // 이미 결과가 도착했으면 즉시 사용
      if (geo.result) {
        setLocation(geo.result);
        setLocationReady(true);
      } else {
        // 아직 대기 중이면 Promise 기다림
        geo.p.then((loc) => {
          if (loc) setLocation(loc);
          setLocationReady(true);
        });
      }
      // GPS 정밀 위치로 백그라운드 보정
      navigator.geolocation?.getCurrentPosition(
        (precise) => setLocation({ lat: precise.coords.latitude, lng: precise.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else if (navigator.geolocation) {
      // fallback: __geo가 없으면 직접 호출
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationReady(true);
        },
        () => setLocationReady(true),
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
      );
    } else {
      setLocationReady(true);
    }
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

  // 2. bounds 변경 시 DB에서 조회
  useEffect(() => {
    if (!mapBounds) return;
    boundsRef.current = mapBounds;

    async function load() {
      setLoading(true);
      try {
        const { sw, ne } = mapBounds!;
        // 공공 화장실은 RPC로 별점 포함 조회, 유저 화장실은 별도
        const [publicRestrooms, userData] = await Promise.all([
          getPublicRestroomsWithStatsByBounds(sw.lat, sw.lng, ne.lat, ne.lng, MAX_MARKERS),
          getUserRestroomsByBounds(sw.lat, sw.lng, ne.lat, ne.lng, MAX_MARKERS),
        ]);

        // 요청 사이에 bounds가 바뀌었으면 무시
        if (boundsRef.current !== mapBounds) return;

        // 유저 화장실만 별점 보강 필요
        const userRestrooms = userData.map((u) => userRestroomToRestroom(u));
        const allRestrooms: Restroom[] = [...publicRestrooms, ...userRestrooms];

        // 거리순 정렬 (위치 있을 때)
        if (location) {
          allRestrooms.sort((a, b) => {
            const distA = getDistanceMeters(location.lat, location.lng, a.lat, a.lng);
            const distB = getDistanceMeters(location.lat, location.lng, b.lat, b.lng);
            return distA - distB;
          });
        }

        // 마커용 (최대 50개)
        setFilteredMarkers(
          allRestrooms.slice(0, MAX_MARKERS).map((r) => ({
            id: r.id,
            name: r.name,
            lat: r.lat,
            lng: r.lng,
          }))
        );

        // 리스트용 (최대 20개) — 즉시 표시
        const listItems = allRestrooms.slice(0, MAX_LIST_ITEMS).map((r) => {
          if (location) {
            r.distance = formatDistance(
              getDistanceMeters(location.lat, location.lng, r.lat, r.lng)
            );
          }
          return r;
        });
        setVisibleRestrooms(listItems);
        setLoading(false);

        // 유저 화장실만 별점 비동기 보강 (공공 화장실은 RPC에서 이미 포함)
        const userItems = listItems.filter((r) => r.source === "user");
        if (userItems.length > 0) {
          enrichRestroomsWithStats(userItems).then((enriched) => {
            if (boundsRef.current === mapBounds) {
              const enrichedMap = new Map(enriched.map((r) => [r.id, r]));
              setVisibleRestrooms((prev) =>
                prev.map((r) => enrichedMap.get(r.id) ?? r)
              );
            }
          }).catch(() => {});
        }
        return; // finally에서 setLoading(false) 중복 방지
      } catch (err) {
        console.error("[홈] 화장실 데이터 조회 실패:", err);
        setFilteredMarkers([]);
        setVisibleRestrooms([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mapBounds, location]);

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
        ) : loading ? (
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
