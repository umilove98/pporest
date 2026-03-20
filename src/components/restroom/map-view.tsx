"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { MapPin } from "lucide-react";
import { Restroom } from "@/lib/types";

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMap;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { position: unknown; map?: KakaoMap; image?: unknown }) => KakaoMarker;
        MarkerImage: new (src: string, size: unknown, options?: { offset: unknown }) => unknown;
        Size: new (width: number, height: number) => unknown;
        Point: new (x: number, y: number) => unknown;
        InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
        services: {
          Geocoder: new () => KakaoGeocoder;
          Status: { OK: string };
        };
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
          removeListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

interface KakaoBounds {
  getSouthWest: () => { getLat: () => number; getLng: () => number };
  getNorthEast: () => { getLat: () => number; getLng: () => number };
}

interface KakaoMap {
  setCenter: (latlng: unknown) => void;
  relayout: () => void;
  getBounds: () => KakaoBounds;
}

interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
}

interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

interface KakaoGeocoder {
  coord2RegionCode: (
    lng: number,
    lat: number,
    callback: (result: Array<{ address_name: string; region_type: string }>, status: string) => void
  ) => void;
  coord2Address: (
    lng: number,
    lat: number,
    callback: (result: Array<{ address: { address_name: string }; road_address: { address_name: string } | null }>, status: string) => void
  ) => void;
}

export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

interface MapViewProps {
  restrooms: Restroom[];
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
  onBoundsChange?: (bounds: MapBounds) => void;
}

const KAKAO_API_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;

export function MapView({ restrooms, userLocation, className = "", onBoundsChange }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const initializedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState(!KAKAO_API_KEY);

  // 콜백 ref 최신 유지 (의존성 배열에 넣지 않기 위해)
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  // SDK 이미 로드된 경우 체크
  useEffect(() => {
    if (typeof window !== "undefined" && window.kakao?.maps?.Map) {
      setSdkReady(true);
    }
  }, []);

  const handleScriptLoad = useCallback(() => {
    if (window.kakao?.maps?.Map) {
      setSdkReady(true);
    } else {
      window.kakao.maps.load(() => setSdkReady(true));
    }
  }, []);

  // 지도 초기화 (한 번만)
  useEffect(() => {
    if (!sdkReady || !mapRef.current || initializedRef.current) return;

    const { kakao } = window;

    // 초기 중심: 유저 위치 > 첫 화장실 > 서울시청
    const centerLat = userLocation?.lat ?? restrooms[0]?.lat ?? 37.5665;
    const centerLng = userLocation?.lng ?? restrooms[0]?.lng ?? 126.978;
    const center = new kakao.maps.LatLng(centerLat, centerLng);

    const map = new kakao.maps.Map(mapRef.current, {
      center,
      level: 5,
    });
    mapInstanceRef.current = map;
    initializedRef.current = true;

    setTimeout(() => map.relayout(), 100);

    // idle 이벤트로 bounds 전달
    kakao.maps.event.addListener(map, "idle", () => {
      if (!onBoundsChangeRef.current) return;
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      onBoundsChangeRef.current({
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() },
      });
    });

    // 초기 bounds 전달
    setTimeout(() => {
      if (!onBoundsChangeRef.current) return;
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      onBoundsChangeRef.current({
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() },
      });
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  // 유저 위치 변경 시 지도 중심 이동 (재생성 아님)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    const { kakao } = window;
    mapInstanceRef.current.setCenter(new kakao.maps.LatLng(userLocation.lat, userLocation.lng));
  }, [userLocation]);

  // 마커 업데이트 (지도 재생성 없이 마커만 교체)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !sdkReady) return;

    const { kakao } = window;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 녹색 커스텀 마커
    const markerSvg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="#10b981"/><circle cx="14" cy="14" r="6" fill="white"/></svg>`
    );
    const markerImage = new kakao.maps.MarkerImage(
      `data:image/svg+xml,${markerSvg}`,
      new kakao.maps.Size(28, 40),
      { offset: new kakao.maps.Point(14, 40) }
    );

    let openInfoWindow: KakaoInfoWindow | null = null;

    restrooms.forEach((r) => {
      const position = new kakao.maps.LatLng(r.lat, r.lng);
      const marker = new kakao.maps.Marker({ position, map, image: markerImage });
      markersRef.current.push(marker);

      const infoWindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${r.name}</div>`,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        if (openInfoWindow) openInfoWindow.close();
        infoWindow.open(map, marker);
        openInfoWindow = infoWindow;
      });
    });
  }, [sdkReady, restrooms]);

  if (error) {
    return (
      <div className={`relative flex h-48 items-center justify-center rounded-lg bg-muted ${className}`}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPin className="h-8 w-8" />
          <span className="text-xs">지도 API 키를 설정해주세요</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        onError={() => setError(true)}
      />
      <div className={`relative h-48 rounded-lg overflow-hidden bg-muted ${className}`}>
        {!sdkReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
          </div>
        )}
        <div ref={mapRef} className="h-full w-full" />
      </div>
    </>
  );
}
