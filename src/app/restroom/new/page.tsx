"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { ArrowLeft, MapPin, CheckCircle, Loader2, Camera, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { createUserRestroom, uploadPhoto } from "@/lib/api";

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

const STEPS = [
  { id: "basic", title: "기본 정보", required: true },
  { id: "gender", title: "화장실 구분", required: true },
  { id: "stalls", title: "칸 수 정보", required: false },
  { id: "hours", title: "운영 정보", required: false },
  { id: "facilities", title: "시설 & 태그", required: false },
  { id: "photos", title: "사진 첨부", required: false },
  { id: "confirm", title: "확인", required: true },
] as const;

export default function NewRestroomPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
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
  const [kakaoReady, setKakaoReady] = useState(false);
  const pendingCoords = useRef<{ lat: number; lng: number } | null>(null);

  const KAKAO_API_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
  const currentStep = STEPS[step];

  useEffect(() => {
    if (window.kakao?.maps?.services) setKakaoReady(true);
  }, []);

  const handleKakaoLoad = useCallback(() => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => {
        setKakaoReady(true);
        if (pendingCoords.current) {
          const { lat: pLat, lng: pLng } = pendingCoords.current;
          pendingCoords.current = null;
          doReverseGeocode(pLat, pLng);
        }
      });
    }
  }, []);

  const doReverseGeocode = (latitude: number, longitude: number) => {
    if (!window.kakao?.maps?.services) return;
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(longitude, latitude, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK && result[0]) {
        const addr = result[0].road_address?.address_name || result[0].address.address_name;
        setAddress(addr);
      }
    });
  };

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setUseCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        if (kakaoReady) {
          doReverseGeocode(latitude, longitude);
        } else {
          pendingCoords.current = { lat: latitude, lng: longitude };
        }
        setUseCurrentLocation(false);
      },
      () => setUseCurrentLocation(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [kakaoReady]);

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
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const url = await uploadPhoto(photo.file, user.id);
        photoUrls.push(url);
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

  const canProceed = () => {
    if (currentStep.id === "basic") {
      return name.trim() && address.trim() && lat !== null && lng !== null;
    }
    return true;
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => {
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  // 미로그인
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
          <p className="text-sm text-muted-foreground">화장실을 등록하려면 로그인이 필요합니다.</p>
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

  const genderLabel = GENDER_OPTIONS.find((g) => g.value === genderType)?.label ?? "";

  return (
    <div className="flex flex-col min-h-screen">
      {KAKAO_API_KEY && !kakaoReady && (
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`}
          onLoad={handleKakaoLoad}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 py-3">
        <button onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">화장실 등록</h1>
        <span className="ml-auto text-xs text-muted-foreground">{step + 1} / {STEPS.length}</span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-6">
        <h2 className="mb-1 text-lg font-semibold">{currentStep.title}</h2>
        {!currentStep.required && (
          <p className="mb-4 text-xs text-muted-foreground">선택사항 — 건너뛸 수 있습니다</p>
        )}

        {/* Step 1: 기본 정보 */}
        {currentStep.id === "basic" && (
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">화장실 이름 *</label>
              <Input
                placeholder="예: OO공원 공중화장실"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">위치 좌표 *</label>
              <Button
                variant="outline"
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
                <p className="text-xs text-emerald-600">위치가 설정되었습니다</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">주소 *</label>
              <Input
                placeholder="예: 서울 강남구 테헤란로 123"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              {lat !== null && !address && (
                <p className="text-xs text-muted-foreground">위치 설정 시 자동으로 채워집니다</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: 화장실 구분 */}
        {currentStep.id === "gender" && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {GENDER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGenderType(value)}
                className={`rounded-xl border-2 px-4 py-4 text-sm transition-all ${
                  genderType === value
                    ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700 shadow-sm"
                    : "border-muted hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Step 3: 칸 수 */}
        {currentStep.id === "stalls" && (
          <div className="flex flex-col gap-4 mt-4">
            {(genderType === "mixed" || genderType === "separated" || genderType === "male_only") && (
              <div className="flex items-center gap-3">
                <label className="w-24 text-sm">남자 화장실</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="칸 수"
                  value={maleStalls}
                  onChange={(e) => setMaleStalls(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">칸</span>
              </div>
            )}
            {(genderType === "mixed" || genderType === "separated" || genderType === "female_only") && (
              <div className="flex items-center gap-3">
                <label className="w-24 text-sm">여자 화장실</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="칸 수"
                  value={femaleStalls}
                  onChange={(e) => setFemaleStalls(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">칸</span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: 운영 정보 */}
        {currentStep.id === "hours" && (
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">운영 시간</label>
              <Input
                placeholder="예: 24시간, 06:00-22:00"
                value={openHours}
                onChange={(e) => setOpenHours(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFree(!isFree)}
                className={`flex h-6 w-6 items-center justify-center rounded border-2 ${
                  isFree ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground"
                }`}
              >
                {isFree && <CheckCircle className="h-4 w-4" />}
              </button>
              <span className="text-sm">무료 화장실</span>
            </div>
          </div>
        )}

        {/* Step 5: 시설 & 태그 */}
        {currentStep.id === "facilities" && (
          <div className="flex flex-col gap-5 mt-4">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">시설 정보</label>
              {FACILITY_OPTIONS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFacility(key)}
                    className={`flex h-6 w-6 items-center justify-center rounded border-2 ${
                      facilities[key]
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground"
                    }`}
                  >
                    {facilities[key] && <CheckCircle className="h-4 w-4" />}
                  </button>
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">태그</label>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer text-sm px-3 py-1 ${
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
            </div>
          </div>
        )}

        {/* Step 6: 사진 */}
        {currentStep.id === "photos" && (
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-sm text-muted-foreground">최대 5장까지 첨부할 수 있습니다</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt={`사진 ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-emerald-400 hover:text-emerald-500"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">추가</span>
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
          </div>
        )}

        {/* Step 7: 확인 */}
        {currentStep.id === "confirm" && (
          <div className="flex flex-col gap-3 mt-4">
            <Card>
              <CardContent className="flex flex-col gap-2.5 p-4">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">이름</span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">주소</span>
                  <span className="text-sm text-right max-w-[60%]">{address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">구분</span>
                  <span className="text-sm">{genderLabel}</span>
                </div>
                {(maleStalls || femaleStalls) && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">칸 수</span>
                    <span className="text-sm">
                      {maleStalls ? `남 ${maleStalls}칸` : ""}
                      {maleStalls && femaleStalls ? " / " : ""}
                      {femaleStalls ? `여 ${femaleStalls}칸` : ""}
                    </span>
                  </div>
                )}
                {openHours && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">운영시간</span>
                    <span className="text-sm">{openHours}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">요금</span>
                  <span className="text-sm">{isFree ? "무료" : "유료"}</span>
                </div>
                {selectedTags.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-muted-foreground pt-0.5">태그</span>
                    <div className="flex flex-wrap justify-end gap-1 max-w-[60%]">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {photos.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">사진</span>
                    <span className="text-sm">{photos.length}장</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3">
                <p className="text-xs text-amber-800">
                  등록된 화장실은 관리자 검토 후 지도에 공개됩니다.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="sticky bottom-16 border-t bg-background px-4 py-3">
        {currentStep.id === "confirm" ? (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
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
        ) : (
          <div className="flex gap-2">
            {!currentStep.required && (
              <Button variant="ghost" className="flex-1" onClick={goNext}>
                건너뛰기
              </Button>
            )}
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className={`bg-emerald-500 hover:bg-emerald-600 gap-1 ${currentStep.required ? "flex-1" : "flex-1"}`}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

