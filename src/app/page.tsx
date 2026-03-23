"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapView, MapBounds, MarkerData } from "@/components/restroom/map-view";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { useAuth } from "@/components/auth/auth-provider";
import { getPublicRestroomsWithStatsByBounds, getUserRestroomsByBounds, userRestroomToRestroom, enrichRestroomsWithStats, getUserPreferences, calculateTiers } from "@/lib/api";
import { Restroom, RestroomTier, UserPreferences } from "@/lib/types";
import { getDistanceMeters, formatDistance } from "@/lib/utils";
import { getCachedTiers, setCachedTiers } from "@/lib/tier-cache";

const MAX_LIST_ITEMS = 15;
const MAX_MARKERS = 30;

const TIER_FILTERS: RestroomTier[] = ["S", "A", "B", "C"];

// 페이지 이동 후 복귀 시 즉시 복원할 마지막 위치/주소 캐시 (모듈 스코프)
let cachedLocation: { lat: number; lng: number } | null = null;
let cachedAddress: string | null = null;

export default function HomePage() {
  const { user } = useAuth();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(cachedLocation);
  const [locationReady, setLocationReady] = useState(!!cachedLocation);
  const [currentAddress, setCurrentAddress] = useState<string | null>(cachedAddress);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [filteredMarkers, setFilteredMarkers] = useState<MarkerData[]>([]);
  const [visibleRestrooms, setVisibleRestrooms] = useState<Restroom[]>([]);
  const [loading, setLoading] = useState(false);
  const boundsRef = useRef<MapBounds | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const [tierMap, setTierMap] = useState<Map<string, RestroomTier>>(new Map());
  const [tierFilter, setTierFilter] = useState<RestroomTier | null>(null);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // 유저 취향 로드
  useEffect(() => {
    if (!user) {
      setPreferences(null);
      setTierMap(new Map());
      return;
    }
    getUserPreferences(user.id).then(setPreferences).catch(() => {});
  }, [user]);

  // 1. 현재 위치 가져오기 — 캐시 우선, 없으면 GPS
  useEffect(() => {
    // 캐시가 있으면 이미 state에 반영됨 (useState 초기값) — GPS 스킵
    if (cachedLocation) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geo = (window as any).__geo as { p: Promise<{ lat: number; lng: number } | null>; result?: { lat: number; lng: number } } | undefined;

    const apply = (loc: { lat: number; lng: number }) => {
      cachedLocation = loc;
      setLocation(loc);
      setLocationReady(true);
    };

    if (geo) {
      if (geo.result) {
        apply(geo.result);
      } else {
        geo.p.then((loc) => {
          if (loc) apply(loc);
          else setLocationReady(true);
        });
      }
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => apply({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
          cachedAddress = addr;
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

  // 2. bounds 변경 시 DB에서 조회 (location/preferences는 ref로 참조 — 불필요한 재fetch 방지)
  useEffect(() => {
    if (!mapBounds) return;
    boundsRef.current = mapBounds;

    async function load() {
      setLoading(true);
      try {
        const { sw, ne } = mapBounds!;
        const loc = locationRef.current;
        const prefs = preferencesRef.current;

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
        if (loc) {
          allRestrooms.sort((a, b) => {
            const distA = getDistanceMeters(loc.lat, loc.lng, a.lat, a.lng);
            const distB = getDistanceMeters(loc.lat, loc.lng, b.lat, b.lng);
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
          if (loc) {
            r.distance = formatDistance(
              getDistanceMeters(loc.lat, loc.lng, r.lat, r.lng)
            );
          }
          return r;
        });
        setVisibleRestrooms(listItems);
        setLoading(false);

        // 티어 계산 (캐시 우선)
        if (prefs) {
          const ids = allRestrooms.map((r) => r.id);
          const cached = getCachedTiers(ids, prefs);
          const uncachedRestrooms = allRestrooms.filter((r) => !cached.has(r.id));
          const computed = calculateTiers(uncachedRestrooms, prefs);
          if (computed.size > 0) setCachedTiers(computed, prefs);
          // 합치기
          const merged = new Map<string, RestroomTier>();
          cached.forEach((v, k) => merged.set(k, v));
          computed.forEach((v, k) => merged.set(k, v));
          setTierMap(merged);
        }

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
  }, [mapBounds]);

  // 3. preferences 변경 시 티어만 재계산 (데이터 재fetch 없음)
  useEffect(() => {
    if (!preferences || visibleRestrooms.length === 0) return;
    const ids = visibleRestrooms.map((r) => r.id);
    const cached = getCachedTiers(ids, preferences);
    const uncached = visibleRestrooms.filter((r) => !cached.has(r.id));
    const computed = calculateTiers(uncached, preferences);
    if (computed.size > 0) setCachedTiers(computed, preferences);
    const merged = new Map<string, RestroomTier>();
    cached.forEach((v, k) => merged.set(k, v));
    computed.forEach((v, k) => merged.set(k, v));
    setTierMap(merged);
  }, [preferences, visibleRestrooms]);

  // 티어 필터 적용
  const displayRestrooms = tierFilter
    ? visibleRestrooms.filter((r) => tierMap.get(r.id) === tierFilter)
    : visibleRestrooms;

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
            <span className="text-xs text-muted-foreground">{displayRestrooms.length}개</span>
            <Link
              href="/restroom/new"
              className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600"
            >
              <Plus className="h-3 w-3" />
              등록
            </Link>
          </div>
        </div>

        {/* 티어 필터 (취향 설정 시에만 표시) */}
        {preferences && tierMap.size > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge
              variant={tierFilter === null ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setTierFilter(null)}
            >
              전체
            </Badge>
            {TIER_FILTERS.map((t) => (
              <Badge
                key={t}
                variant={tierFilter === t ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setTierFilter(tierFilter === t ? null : t)}
              >
                {t}티어
              </Badge>
            ))}
          </div>
        )}

        {!mapBounds ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">지도가 준비되면 주변 화장실이 표시됩니다</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
          </div>
        ) : displayRestrooms.length === 0 ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">
              {tierFilter ? `${tierFilter}티어 화장실이 없습니다` : "지도 영역 내 화장실이 없습니다. 지도를 이동해보세요."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {displayRestrooms.map((restroom) => (
              <RestroomCard key={restroom.id} restroom={restroom} tier={tierMap.get(restroom.id)} preferences={preferences} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
