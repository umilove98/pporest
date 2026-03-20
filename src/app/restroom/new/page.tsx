"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CheckCircle, Loader2, Camera, X } from "lucide-react";
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

const GENDER_OPTIONS = [
  { value: "separated", label: "남녀분리" },
  { value: "mixed", label: "남녀공용" },
  { value: "male_only", label: "남자화장실" },
  { value: "female_only", label: "여자화장실" },
] as const;

type FacilityKey = (typeof FACILITY_OPTIONS)[number]["key"];
type GenderType = (typeof GENDER_OPTIONS)[number]["value"];

export default function NewRestroomPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [genderType, setGenderType] = useState<GenderType>("separated");
  const [maleStalls, setMaleStalls] = useState("");
  const [femaleStalls, setFemaleStalls] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  // 좌표 → 주소 변환 (Kakao SDK 있으면 사용, 없으면 Nominatim fallback)
  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    // 1) Kakao Maps SDK (이미 로드된 경우)
    if (window.kakao?.maps?.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(longitude, latitude, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          const addr = result[0].road_address?.address_name || result[0].address.address_name;
          setAddress(addr);
        }
      });
      return;
    }

    // 2) Nominatim (OpenStreetMap) 무료 역지오코딩
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ko`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          // "대한민국" 접두사 제거, 우편번호 제거
          const addr = data.display_name
            .replace(/대한민국,?\s*/g, "")
            .replace(/\d{5},?\s*/g, "")
            .trim();
          setAddress(addr);
        }
      }
    } catch {
      // 역지오코딩 실패해도 좌표는 이미 설정됨
    }
  }, []);

  // 현재 위치 가져오기
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setUseCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        reverseGeocode(latitude, longitude);
        setUseCurrentLocation(false);
      },
      () => setUseCurrentLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [reverseGeocode]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleFacility = (key: FacilityKey) => {
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).slice(0, 5 - photos.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!user || !name.trim() || !address.trim() || lat === null || lng === null) return;

    setSubmitting(true);
    try {
      // 사진은 base64로 localStorage에 저장 (Supabase Storage 미연결 시)
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const base64 = await fileToBase64(photo.file);
        photoUrls.push(base64);
      }

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
        gender_type: genderType,
        male_stalls: maleStalls ? parseInt(maleStalls) : null,
        female_stalls: femaleStalls ? parseInt(femaleStalls) : null,
        photo_urls: photoUrls,
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

        {/* 화장실 구분 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">화장실 구분</h2>
          <div className="grid grid-cols-2 gap-2">
            {GENDER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGenderType(value)}
                className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  genderType === value
                    ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-700"
                    : "border-muted hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* 칸 수 정보 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">칸 수 정보</h2>
          <Card>
            <CardContent className="flex flex-col gap-3 p-3">
              {(genderType === "mixed" || genderType === "separated" || genderType === "male_only") && (
                <div className="flex items-center gap-3">
                  <label className="w-20 text-sm text-muted-foreground">남자 화장실</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="칸 수"
                    value={maleStalls}
                    onChange={(e) => setMaleStalls(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">칸</span>
                </div>
              )}
              {(genderType === "mixed" || genderType === "separated" || genderType === "female_only") && (
                <div className="flex items-center gap-3">
                  <label className="w-20 text-sm text-muted-foreground">여자 화장실</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="칸 수"
                    value={femaleStalls}
                    onChange={(e) => setFemaleStalls(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">칸</span>
                </div>
              )}
            </CardContent>
          </Card>
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

        {/* 사진 첨부 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">사진 첨부 (최대 5장)</h2>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt={`사진 ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-emerald-400 hover:text-emerald-500"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px]">추가</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoAdd}
            className="hidden"
          />
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
