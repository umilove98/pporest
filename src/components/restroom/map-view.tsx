"use client";

import { useEffect, useRef, useState } from "react";
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
  className?: string;
}

export function MapView({ restrooms, className = "" }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(false);

  // 카카오맵 SDK 스크립트 로드
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
    if (!apiKey) {
      setError(true);
      return;
    }

    if (window.kakao?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => setMapLoaded(true));
    };
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, []);

  // 지도 초기화 + 마커
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || restrooms.length === 0) return;

    const { kakao } = window;
    const centerRestroom = restrooms[0];
    const center = new kakao.maps.LatLng(centerRestroom.lat, centerRestroom.lng);

    const map = new kakao.maps.Map(mapRef.current, {
      center,
      level: 5,
    });

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
  }, [mapLoaded, restrooms]);

  // API 키 없거나 로드 실패 시 placeholder
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
    <div className={`relative h-48 rounded-lg overflow-hidden bg-muted ${className}`}>
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
        </div>
      )}
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
