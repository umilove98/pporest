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
        Marker: new (options: { position: unknown; map: KakaoMap }) => KakaoMarker;
        InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

interface KakaoMap {
  setCenter: (latlng: unknown) => void;
  relayout: () => void;
}

interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
}

interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

interface MapViewProps {
  restrooms: Restroom[];
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

const KAKAO_API_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;

export function MapView({ restrooms, userLocation, className = "" }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMap | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState(!KAKAO_API_KEY);

  // SDK가 이미 로드된 경우 체크 (Map 생성자 존재 여부로 판단)
  useEffect(() => {
    if (typeof window !== "undefined" && window.kakao?.maps?.Map) {
      setSdkReady(true);
    }
  }, []);

  // Script onLoad 핸들러
  const handleScriptLoad = useCallback(() => {
    if (window.kakao?.maps?.Map) {
      // 이미 load() 호출 완료된 경우
      setSdkReady(true);
    } else {
      // autoload=false이므로 load() 호출 필요
      window.kakao.maps.load(() => setSdkReady(true));
    }
  }, []);

  // 지도 초기화 + 마커
  useEffect(() => {
    if (!sdkReady || !mapRef.current || restrooms.length === 0) return;

    const { kakao } = window;

    // 사용자 위치가 있으면 사용자 위치를, 없으면 첫 번째 화장실을 중심으로
    const centerLat = userLocation?.lat ?? restrooms[0].lat;
    const centerLng = userLocation?.lng ?? restrooms[0].lng;
    const center = new kakao.maps.LatLng(centerLat, centerLng);

    const map = new kakao.maps.Map(mapRef.current, {
      center,
      level: 5,
    });
    mapInstanceRef.current = map;

    // 컨테이너 크기 변경 대응
    setTimeout(() => map.relayout(), 100);

    let openInfoWindow: KakaoInfoWindow | null = null;

    restrooms.forEach((r) => {
      const position = new kakao.maps.LatLng(r.lat, r.lng);
      const marker = new kakao.maps.Marker({ position, map });

      const infoWindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${r.name}</div>`,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        if (openInfoWindow) openInfoWindow.close();
        infoWindow.open(map, marker);
        openInfoWindow = infoWindow;
      });
    });
  }, [sdkReady, restrooms, userLocation]);

  // API 키 없으면 placeholder
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
      {/* next/script로 카카오맵 SDK 로드 — 중복 방지 내장 */}
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=false`}
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
