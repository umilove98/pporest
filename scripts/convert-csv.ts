/**
 * 공공데이터 CSV → 정적 JSON 변환 스크립트
 *
 * 사용법:
 *   npx tsx scripts/convert-csv.ts
 *   npx tsx scripts/convert-csv.ts --region 서울
 *   npx tsx scripts/convert-csv.ts --region 경기
 *
 * 입력: data/public-restrooms.csv (data.go.kr에서 다운로드)
 * 출력: public/data/public-restrooms.json
 */

import * as fs from "fs";
import * as path from "path";

const CSV_PATH = path.resolve(__dirname, "../data/public-restrooms.csv");
const OUTPUT_PATH = path.resolve(__dirname, "../public/data/public-restrooms.json");

const regionArg = process.argv.find((_, i) => process.argv[i - 1] === "--region");

function decodeCP949(buffer: Buffer): string {
  const decoder = new TextDecoder("euc-kr");
  return decoder.decode(buffer);
}

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
          i++;
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

interface PublicRestroom {
  id: string;          // public_data_id (조회키)
  name: string;
  address: string;
  lat: number;
  lng: number;
  disabled: boolean;   // 장애인 화장실
  diaper: boolean;     // 기저귀 교환대
  hours: string | null; // 개방시간
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV 파일을 찾을 수 없습니다: ${CSV_PATH}`);
    console.error("");
    console.error("다운로드 방법:");
    console.error("  1. https://www.data.go.kr/data/15012892/standard.do 접속");
    console.error("  2. CSV 다운로드");
    console.error("  3. data/public-restrooms.csv 에 배치");
    process.exit(1);
  }

  console.log("CSV 파일 읽는 중...");
  const buffer = fs.readFileSync(CSV_PATH);

  let content: string;
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    content = buffer.toString("utf-8");
  } else {
    try {
      content = decodeCP949(buffer);
    } catch {
      content = buffer.toString("utf-8");
    }
  }

  const lines = content.split("\n").filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]);

  const col = (name: string) => headers.findIndex((h) => h.includes(name));

  const iName = col("화장실명");
  const iRoadAddr = col("소재지도로명주소");
  const iJibunAddr = col("소재지지번주소");
  const iLat = col("위도");
  const iLng = col("경도");
  const iMaleDisabled = col("남성용-장애인용대변기수");
  const iFemaleDisabled = col("여성용-장애인용대변기수");
  const iDiaper = col("기저귀교환대");
  const iHours = col("개방시간상세");
  const iHoursBasic = col("개방시간");

  console.log(`컬럼: 화장실명=${iName}, 주소=${iRoadAddr}, 위도=${iLat}, 경도=${iLng}`);

  if (iName === -1 || iLat === -1 || iLng === -1) {
    console.error("필수 컬럼을 찾을 수 없습니다.");
    console.error("헤더:", headers.join(" | "));
    process.exit(1);
  }

  if (regionArg) console.log(`지역 필터: ${regionArg}`);

  const results: PublicRestroom[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const f = parseCSVLine(lines[i]);
    if (f.length < Math.max(iName, iLat, iLng) + 1) { skipped++; continue; }

    const name = f[iName];
    const address = (iRoadAddr !== -1 ? f[iRoadAddr] : "") || (iJibunAddr !== -1 ? f[iJibunAddr] : "");
    const lat = parseFloat(f[iLat]);
    const lng = parseFloat(f[iLng]);

    if (!name || !address || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) { skipped++; continue; }
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) { skipped++; continue; }
    if (regionArg && !address.startsWith(regionArg)) continue;

    const mDisabled = iMaleDisabled !== -1 ? parseInt(f[iMaleDisabled]) || 0 : 0;
    const fDisabled = iFemaleDisabled !== -1 ? parseInt(f[iFemaleDisabled]) || 0 : 0;
    const diaperField = iDiaper !== -1 ? f[iDiaper] : "";
    const hours = (iHours !== -1 ? f[iHours] : "") || (iHoursBasic !== -1 ? f[iHoursBasic] : "") || null;

    results.push({
      id: `pd-${i}`,
      name,
      address,
      lat,
      lng,
      disabled: mDisabled > 0 || fDisabled > 0,
      diaper: diaperField !== "" && diaperField !== "해당없음" && diaperField !== "없음",
      hours,
    });
  }

  console.log(`\n유효: ${results.length}건, 스킵: ${skipped}건`);

  // JSON 저장 (키를 짧게 하여 용량 절약)
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results));

  const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`\n저장 완료: ${OUTPUT_PATH} (${sizeMB} MB)`);
  console.log("Next.js 빌드 시 /data/public-restrooms.json 으로 서빙됩니다.");
}

main();
