/**
 * 공공 화장실 정적 JSON → Supabase DB 시드 스크립트
 *
 * 사용법:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npx tsx scripts/seed-public-restrooms.ts
 *
 * 또는 .env.local 파일이 있으면:
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-public-restrooms.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수를 설정하세요.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function main() {
  const jsonPath = resolve(__dirname, "../public/data/public-restrooms.json");
  const raw = readFileSync(jsonPath, "utf-8");
  const data: PublicRestroom[] = JSON.parse(raw);

  console.log(`총 ${data.length}건 로드 완료`);

  // Supabase insert는 한번에 1000건 제한이 있으므로 배치 처리
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("public_restrooms")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`배치 ${i}-${i + batch.length} 실패:`, error.message);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`${inserted} / ${data.length} 삽입 완료`);
  }

  console.log(`완료! ${inserted}건 삽입됨`);
}

main();
