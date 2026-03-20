"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { createUserRestroom } from "@/lib/api";

const FACILITY_OPTIONS = [
  { key: "has_disabled_access", label: "장애인 접근 가능" },
  { key: "has_diaper_table", label: "기저귀 교환대" },
  { key: "has_bidet", label: "비데" },
] as const;

const TAG_OPTIONS = ["무료", "24시간", "깨끗함", "장애인 접근 가능", "비데", "기저귀 교환대"];

type FacilityKey = (typeof FACILITY_OPTIONS)[number]["key"];

export default function NewRestroomPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<Record<FacilityKey, boolean>>({
    has_disabled_access: false,
    has_diaper_table: false,
    has_bidet: false,
  });
  const [isFree, setIsFree] = useState(true);
  const [openHours, setOpenHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // 현재 위치 가져오기
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setUseCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        // 역지오코딩으로 주소 자동 입력
        if (window.kakao?.maps?.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(pos.coords.longitude, pos.coords.latitude, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK && result[0]) {
              const addr = result[0].road_address?.address_name || result[0].address.address_name;
              setAddress(addr);
            }
          });
        }
        setUseCurrentLocation(false);
      },
      () => setUseCurrentLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 로그인 안 되어 있으면 안내
  useEffect(() => {
    if (user === null) {
      // auth가 로딩 완료된 후 null이면 미로그인 상태
    }
  }, [user]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleFacility = (key: FacilityKey) => {
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!user || !name.trim() || !address.trim() || lat === null || lng === null) return;

    setSubmitting(true);
    try {
      await createUserRestroom({
        name: name.trim(),
        address: address.trim(),
        lat,
        lng,
        tags: selectedTags,
        submitted_by: user.id,
        has_disabled_access: facilities.has_disabled_access,
        has_diaper_table: facilities.has_diaper_table,
        has_bidet: facilities.has_bidet,
        is_free: isFree,
        open_hours: openHours.trim() || null,
      });
      setSubmitted(true);
    } catch {
      alert("등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 미로그인 상태
  if (!user) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3">
          <button onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">화장실 등록</h1>
        </header>
        <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            화장실을 등록하려면 로그인이 필요합니다.
          </p>
          <Button onClick={() => router.push("/profile")} className="bg-emerald-500 hover:bg-emerald-600">
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  // 등록 완료
  if (submitted) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3">
          <button onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">화장실 등록</h1>
        </header>
        <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500" />
          <h2 className="text-lg font-semibold">등록 요청 완료!</h2>
          <p className="text-sm text-muted-foreground">
            관리자 승인 후 지도에 표시됩니다.<br />
            검토까지 1~2일 정도 소요될 수 있습니다.
          </p>
          <Button onClick={() => router.push("/")} className="bg-emerald-500 hover:bg-emerald-600">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const isValid = name.trim() && address.trim() && lat !== null && lng !== null;

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3">
        <button onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">화장실 등록</h1>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        {/* 기본 정보 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">기본 정보</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">화장실 이름 *</label>
            <Input
              placeholder="예: OO공원 공중화장실"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">주소 *</label>
            <Input
              placeholder="예: 서울 강남구 테헤란로 123"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">위치 좌표 *</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={useCurrentLocation}
              className="w-full justify-start gap-2"
            >
              {useCurrentLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {lat !== null
                ? `${lat.toFixed(4)}, ${lng!.toFixed(4)}`
                : "현재 위치로 설정하기"}
            </Button>
            {lat !== null && (
              <p className="text-xs text-muted-foreground">
                위치가 설정되었습니다. 화장실 위치에서 등록해주세요.
              </p>
            )}
          </div>
        </section>

        {/* 운영 정보 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">운영 정보</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">운영 시간</label>
            <Input
              placeholder="예: 24시간, 06:00-22:00"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFree(!isFree)}
              className={`flex h-5 w-5 items-center justify-center rounded border ${
                isFree ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground"
              }`}
            >
              {isFree && <CheckCircle className="h-3.5 w-3.5" />}
            </button>
            <span className="text-sm">무료 화장실</span>
          </div>
        </section>

        {/* 시설 정보 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">시설 정보</h2>
          <Card>
            <CardContent className="flex flex-col gap-3 p-3">
              {FACILITY_OPTIONS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFacility(key)}
                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                      facilities[key]
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground"
                    }`}
                  >
                    {facilities[key] && <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 태그 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">태그 선택</h2>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer ${
                  selectedTags.includes(tag)
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </section>

        {/* 안내 */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3">
            <p className="text-xs text-amber-800">
              등록된 화장실은 관리자 검토 후 지도에 공개됩니다.
              허위 정보 등록 시 계정이 제한될 수 있습니다.
            </p>
          </CardContent>
        </Card>

        {/* 제출 */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              등록 중...
            </>
          ) : (
            "화장실 등록 요청"
          )}
        </Button>
      </div>
    </div>
  );
}
