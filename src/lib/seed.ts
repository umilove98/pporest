/**
 * 공공데이터 화장실 CSV → Supabase 시드 스크립트
 *
 * 사용법:
 *   1. data.go.kr에서 전국공중화장실표준데이터 CSV 다운로드
 *   2. data/public-restrooms.csv 에 배치
 *   3. npx tsx src/lib/seed.ts
 *
 * 옵션:
 *   npx tsx src/lib/seed.ts --region 서울    # 서울만
 *   npx tsx src/lib/seed.ts --region 경기    # 경기만
 *   npx tsx src/lib/seed.ts                  # 전체
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CSV 파일 경로
const CSV_PATH = path.resolve(__dirname, "../../data/public-restrooms.csv");

// 지역 필터 (--region 인자)
const regionArg = process.argv.find((_, i) => process.argv[i - 1] === "--region");

/**
 * cp949 바이너리 → UTF-8 문자열 변환
 * Node.js의 TextDecoder가 euc-kr을 지원
 */
function decodeCP949(buffer: Buffer): string {
  const decoder = new TextDecoder("euc-kr");
  return decoder.decode(buffer);
}

/**
 * 간단한 CSV 파서 (쌍따옴표 이스케이프 처리 포함)
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

interface ParsedRestroom {
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
  is_open: boolean;
  source: "public_data";
  status: "approved";
  has_disabled_access: boolean;
  has_diaper_table: boolean;
  has_bidet: boolean;
  is_free: boolean;
  open_hours: string | null;
  public_data_id: string;
}

function parseCSV(content: string): ParsedRestroom[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    console.error("CSV 파일에 데이터가 없습니다.");
    process.exit(1);
  }

  // 헤더 파싱
  const headers = parseCSVLine(lines[0]);
  const colIndex = (name: string) => {
    const idx = headers.findIndex((h) => h.includes(name));
    return idx;
  };

  // 필수 컬럼 인덱스
  const iName = colIndex("화장실명");
  const iRoadAddr = colIndex("소재지도로명주소");
  const iJibunAddr = colIndex("소재지지번주소");
  const iLat = colIndex("위도");
  const iLng = colIndex("경도");
  const iMaleDisabledToilet = colIndex("남성용-장애인용대변기수");
  const iFemaleDisabledToilet = colIndex("여성용-장애인용대변기수");
  const iDiaperTable = colIndex("기저귀교환대");
  const iOpenHours = colIndex("개방시간상세");
  const iOpenHoursBasic = colIndex("개방시간");
  console.log("컬럼 매핑 확인:");
  console.log(`  화장실명: ${iName}, 도로명주소: ${iRoadAddr}, 위도: ${iLat}, 경도: ${iLng}`);

  if (iName === -1 || iLat === -1 || iLng === -1) {
    console.error("필수 컬럼(화장실명, 위도, 경도)을 찾을 수 없습니다.");
    console.error("헤더:", headers.join(" | "));
    process.exit(1);
  }

  const results: ParsedRestroom[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < Math.max(iName, iLat, iLng) + 1) {
      skipped++;
      continue;
    }

    const name = fields[iName];
    const roadAddr = iRoadAddr !== -1 ? fields[iRoadAddr] : "";
    const jibunAddr = iJibunAddr !== -1 ? fields[iJibunAddr] : "";
    const address = roadAddr || jibunAddr;
    const lat = parseFloat(fields[iLat]);
    const lng = parseFloat(fields[iLng]);

    // 유효성 검사
    if (!name || !address || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      skipped++;
      continue;
    }

    // 한국 범위 체크 (33~39°N, 124~132°E)
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      skipped++;
      continue;
    }

    // 지역 필터
    if (regionArg && !address.startsWith(regionArg)) {
      continue;
    }

    // 장애인 화장실 여부
    const maleDisabled = iMaleDisabledToilet !== -1 ? parseInt(fields[iMaleDisabledToilet]) || 0 : 0;
    const femaleDisabled = iFemaleDisabledToilet !== -1 ? parseInt(fields[iFemaleDisabledToilet]) || 0 : 0;
    const hasDisabledAccess = maleDisabled > 0 || femaleDisabled > 0;

    // 기저귀 교환대
    const diaperField = iDiaperTable !== -1 ? fields[iDiaperTable] : "";
    const hasDiaperTable = diaperField !== "" && diaperField !== "해당없음" && diaperField !== "없음";

    // 개방시간
    const openHours = (iOpenHours !== -1 ? fields[iOpenHours] : "") ||
                      (iOpenHoursBasic !== -1 ? fields[iOpenHoursBasic] : "") || null;

    // 태그 자동 생성
    const tags: string[] = ["무료"];
    if (hasDisabledAccess) tags.push("장애인 접근 가능");
    if (hasDiaperTable) tags.push("기저귀 교환대");
    if (openHours?.includes("24시간")) tags.push("24시간");

    // 행번호 + 좌표 기반 고유 ID
    const publicDataId = `PD-${i}-${lat.toFixed(4)}-${lng.toFixed(4)}`;

    results.push({
      name,
      address,
      lat,
      lng,
      tags,
      is_open: true,
      source: "public_data",
      status: "approved",
      has_disabled_access: hasDisabledAccess,
      has_diaper_table: hasDiaperTable,
      has_bidet: false, // 공공데이터에 비데 정보 없음
      is_free: true,    // 공중화장실은 기본 무료
      open_hours: openHours,
      public_data_id: publicDataId,
    });
  }

  console.log(`\n파싱 결과: ${results.length}건 유효, ${skipped}건 스킵`);
  return results;
}

async function seed() {
  // CSV 파일 존재 확인
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV 파일을 찾을 수 없습니다: ${CSV_PATH}`);
    console.error("");
    console.error("📥 다운로드 방법:");
    console.error("  1. https://www.data.go.kr/data/15012892/standard.do 접속");
    console.error("  2. CSV 다운로드");
    console.error("  3. data/public-restrooms.csv 에 배치");
    process.exit(1);
  }

  console.log("CSV 파일 읽는 중...");
  const buffer = fs.readFileSync(CSV_PATH);

  // 인코딩 자동 감지: UTF-8 BOM 체크
  let content: string;
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    content = buffer.toString("utf-8");
    console.log("인코딩: UTF-8 (BOM)");
  } else {
    // cp949 시도
    try {
      content = decodeCP949(buffer);
      console.log("인코딩: EUC-KR/CP949");
    } catch {
      content = buffer.toString("utf-8");
      console.log("인코딩: UTF-8 (fallback)");
    }
  }

  if (regionArg) {
    console.log(`지역 필터: "${regionArg}" 포함 주소만`);
  }

  const restrooms = parseCSV(content);

  if (restrooms.length === 0) {
    console.error("삽입할 데이터가 없습니다.");
    process.exit(1);
  }

  console.log(`\nSupabase에 ${restrooms.length}건 삽입 시작...`);

  // 배치 삽입 (100개씩)
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < restrooms.length; i += batchSize) {
    const batch = restrooms.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(restrooms.length / batchSize);

    const { data, error } = await supabase
      .from("restrooms")
      .upsert(batch, { onConflict: "public_data_id" })
      .select("id");

    if (error) {
      console.error(`  배치 ${batchNum}/${totalBatches} 실패:`, error.message);
      errors++;
      continue;
    }

    inserted += data.length;
    process.stdout.write(`\r  진행: ${batchNum}/${totalBatches} 배치 (${inserted}건 삽입)`);
  }

  console.log(`\n\n완료!`);
  console.log(`  성공: ${inserted}건`);
  if (errors > 0) console.log(`  실패 배치: ${errors}개`);
}

seed();
