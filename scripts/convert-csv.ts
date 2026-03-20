/**
 * 공공데이터 CSV → JSON / Supabase import용 CSV 변환 스크립트
 *
 * 사용법:
 *   npx tsx scripts/convert-csv.ts          # JSON 출력 (기본)
 *   npx tsx scripts/convert-csv.ts --csv    # Supabase import용 CSV 출력
 *
 * data/ 폴더에 있는 모든 CSV 파일을 읽어서 변환합니다.
 * 파일명 예시:
 *   - 공중화장실정보_서울특별시.csv
 *   - 공중화장실정보_경기도.csv
 *
 * 출력:
 *   JSON: public/data/public-restrooms.json
 *   CSV:  public/data/public-restrooms-import.csv (Supabase Table Editor에서 import 가능)
 */

import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.resolve(__dirname, "../data");
const OUTPUT_JSON = path.resolve(__dirname, "../public/data/public-restrooms.json");
const OUTPUT_CSV = path.resolve(__dirname, "../public/data/public-restrooms-import.csv");
const MODE = process.argv.includes("--csv") ? "csv" : "json";

function decodeFile(buffer: Buffer): string {
  // UTF-8 BOM
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString("utf-8");
  }
  // CP949/EUC-KR 시도
  try {
    const decoded = new TextDecoder("euc-kr").decode(buffer);
    // 한글이 포함되어 있으면 CP949으로 간주
    if (/[가-힣]/.test(decoded)) return decoded;
  } catch { /* ignore */ }
  return buffer.toString("utf-8");
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
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  disabled: boolean;
  diaper: boolean;
  hours: string | null;
  male_toilet: number;
  male_urinal: number;
  female_toilet: number;
  emergency_bell: boolean;
  cctv: boolean;
  data_date: string | null;
}

function processCSV(filePath: string, startId: number): { results: PublicRestroom[]; skipped: number } {
  const buffer = fs.readFileSync(filePath);
  const content = decodeFile(buffer);
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return { results: [], skipped: 0 };

  const headers = parseCSVLine(lines[0]);
  const col = (name: string) => headers.findIndex((h) => h.includes(name));

  const iName = col("화장실명");
  const iRoadAddr = col("소재지도로명주소");
  const iJibunAddr = col("소재지지번주소");
  const iLat = col("위도");
  const iLng = col("경도");
  const iMaleToilet = col("남성용-대변기수");
  const iMaleUrinal = col("남성용-소변기수");
  const iMaleDisabled = col("남성용-장애인용대변기수");
  const iFemaleToilet = col("여성용-대변기수");
  const iFemaleDisabled = col("여성용-장애인용대변기수");
  const iDiaper = col("기저귀교환대");
  const iEmergencyBell = col("비상벨설치여부");
  const iCCTV = col("CCTV설치");
  const iDataDate = col("데이터기준일자");
  const iHours = col("개방시간상세");
  const iHoursBasic = col("개방시간");

  if (iName === -1 || iLat === -1 || iLng === -1) {
    console.error(`  필수 컬럼을 찾을 수 없습니다. 헤더: ${headers.slice(0, 10).join(" | ")}...`);
    return { results: [], skipped: 0 };
  }

  const results: PublicRestroom[] = [];
  let skipped = 0;
  let id = startId;

  for (let i = 1; i < lines.length; i++) {
    const f = parseCSVLine(lines[i]);
    if (f.length < Math.max(iName, iLat, iLng) + 1) { skipped++; continue; }

    const name = f[iName];
    const address = (iRoadAddr !== -1 ? f[iRoadAddr] : "") || (iJibunAddr !== -1 ? f[iJibunAddr] : "");
    const lat = parseFloat(f[iLat]);
    const lng = parseFloat(f[iLng]);

    if (!name || !address || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) { skipped++; continue; }
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) { skipped++; continue; }

    const maleToilet = iMaleToilet !== -1 ? parseInt(f[iMaleToilet]) || 0 : 0;
    const maleUrinal = iMaleUrinal !== -1 ? parseInt(f[iMaleUrinal]) || 0 : 0;
    const mDisabled = iMaleDisabled !== -1 ? parseInt(f[iMaleDisabled]) || 0 : 0;
    const femaleToilet = iFemaleToilet !== -1 ? parseInt(f[iFemaleToilet]) || 0 : 0;
    const fDisabled = iFemaleDisabled !== -1 ? parseInt(f[iFemaleDisabled]) || 0 : 0;
    const diaperField = iDiaper !== -1 ? f[iDiaper] : "";
    const bellField = iEmergencyBell !== -1 ? f[iEmergencyBell] : "";
    const cctvField = iCCTV !== -1 ? f[iCCTV] : "";
    const dataDate = iDataDate !== -1 ? f[iDataDate] || null : null;
    const hours = (iHours !== -1 ? f[iHours] : "") || (iHoursBasic !== -1 ? f[iHoursBasic] : "") || null;

    results.push({
      id: `pd-${id++}`,
      name,
      address,
      lat,
      lng,
      disabled: mDisabled > 0 || fDisabled > 0,
      diaper: diaperField !== "" && diaperField !== "해당없음" && diaperField !== "없음",
      hours,
      male_toilet: maleToilet,
      male_urinal: maleUrinal,
      female_toilet: femaleToilet,
      emergency_bell: bellField === "Y" || bellField === "있음",
      cctv: cctvField === "Y" || cctvField === "있음",
      data_date: dataDate,
    });
  }

  return { results, skipped };
}

function main() {
  // data/ 폴더에서 CSV 파일 찾기
  const csvFiles = fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".csv"))
    .map((f) => path.join(DATA_DIR, f));

  if (csvFiles.length === 0) {
    console.error("data/ 폴더에 CSV 파일이 없습니다.");
    console.error("");
    console.error("다운로드 방법:");
    console.error("  1. https://www.data.go.kr/data/15012892/standard.do 접속");
    console.error("  2. 원하는 지역의 CSV 다운로드");
    console.error("  3. data/ 폴더에 배치");
    console.error("");
    console.error("예시: data/공중화장실정보_서울특별시.csv");
    process.exit(1);
  }

  console.log(`CSV 파일 ${csvFiles.length}개 발견:\n`);

  const allResults: PublicRestroom[] = [];
  let totalSkipped = 0;
  let nextId = 1;

  for (const csvFile of csvFiles) {
    const fileName = path.basename(csvFile);
    console.log(`  처리 중: ${fileName}`);

    const { results, skipped } = processCSV(csvFile, nextId);
    nextId += results.length;
    totalSkipped += skipped;

    console.log(`    → 유효: ${results.length}건, 스킵: ${skipped}건`);
    allResults.push(...results);
  }

  // 중복 제거 (같은 좌표 + 같은 이름)
  const seen = new Set<string>();
  const deduplicated = allResults.filter((r) => {
    const key = `${r.lat.toFixed(5)}_${r.lng.toFixed(5)}_${r.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const duplicates = allResults.length - deduplicated.length;
  if (duplicates > 0) {
    console.log(`\n  중복 제거: ${duplicates}건`);
  }

  // ID 재부여
  const final = deduplicated.map((r, i) => ({ ...r, id: `pd-${i + 1}` }));

  console.log(`\n총 결과: ${final.length}건 (스킵: ${totalSkipped}건)`);

  const outputDir = path.dirname(OUTPUT_JSON);
  fs.mkdirSync(outputDir, { recursive: true });

  if (MODE === "csv") {
    // Supabase import용 CSV 출력
    const csvHeader = "id,name,address,lat,lng,disabled,diaper,hours,male_toilet,male_urinal,female_toilet,emergency_bell,cctv,data_date";
    const csvRows = final.map((r) => {
      const esc = (v: string | null) => {
        if (v == null) return "";
        if (v.includes(",") || v.includes('"') || v.includes("\n")) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      };
      return [
        esc(r.id), esc(r.name), esc(r.address),
        r.lat, r.lng,
        r.disabled, r.diaper,
        esc(r.hours),
        r.male_toilet, r.male_urinal, r.female_toilet,
        r.emergency_bell, r.cctv,
        esc(r.data_date),
      ].join(",");
    });

    fs.writeFileSync(OUTPUT_CSV, [csvHeader, ...csvRows].join("\n"));
    const size = (fs.statSync(OUTPUT_CSV).size / 1024).toFixed(0);
    console.log(`\n저장 완료: public/data/public-restrooms-import.csv`);
    console.log(`파일 크기: ${size} KB`);
    console.log(`\nSupabase Table Editor → public_restrooms → Import data 에서 이 CSV를 업로드하세요.`);
  } else {
    // JSON 출력
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(final));
    const sizeKB = (fs.statSync(OUTPUT_JSON).size / 1024).toFixed(0);
    const sizeMB = (fs.statSync(OUTPUT_JSON).size / 1024 / 1024).toFixed(1);
    console.log(`\n저장 완료: public/data/public-restrooms.json`);
    console.log(`파일 크기: ${Number(sizeMB) >= 1 ? sizeMB + " MB" : sizeKB + " KB"}`);
  }
}

main();
