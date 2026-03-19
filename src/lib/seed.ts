/**
 * Supabase 시드 데이터 스크립트
 * 실행: npx tsx src/lib/seed.ts
 *
 * 주의: .env.local에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되어 있어야 합니다.
 * 또한 supabase/schema.sql이 먼저 실행되어 있어야 합니다.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const restrooms = [
  { name: "센트럴파크 공용화장실", address: "서울 중구 을지로 지하 170", lat: 37.5665, lng: 126.978, tags: ["무료", "장애인 접근 가능", "기저귀 교환대"], is_open: true },
  { name: "강남역 지하상가 화장실", address: "서울 강남구 강남대로 396", lat: 37.498, lng: 127.0276, tags: ["무료", "24시간"], is_open: true },
  { name: "롯데마트 잠실점 화장실", address: "서울 송파구 올림픽로 240", lat: 37.5133, lng: 127.1028, tags: ["깨끗함", "기저귀 교환대", "비데"], is_open: true },
  { name: "홍대입구역 2번 출구 화장실", address: "서울 마포구 양화로 160", lat: 37.5573, lng: 126.9255, tags: ["무료", "24시간"], is_open: true },
  { name: "코엑스몰 B1 화장실", address: "서울 강남구 영동대로 513", lat: 37.512, lng: 127.059, tags: ["깨끗함", "장애인 접근 가능", "비데", "기저귀 교환대"], is_open: true },
  { name: "이태원 공영화장실", address: "서울 용산구 이태원로 177", lat: 37.5346, lng: 126.9946, tags: ["무료"], is_open: false },
  { name: "여의도 IFC몰 화장실", address: "서울 영등포구 국제금융로 10", lat: 37.5251, lng: 126.9256, tags: ["깨끗함", "비데", "장애인 접근 가능"], is_open: true },
];

async function seed() {
  console.log("시드 데이터 삽입 시작...");

  // 화장실 삽입
  const { data: insertedRestrooms, error: restroomError } = await supabase
    .from("restrooms")
    .insert(restrooms)
    .select();

  if (restroomError) {
    console.error("화장실 삽입 실패:", restroomError);
    process.exit(1);
  }

  console.log(`화장실 ${insertedRestrooms.length}개 삽입 완료`);

  // 리뷰는 user_id(auth.users FK)가 필요하므로
  // 인증 구현 후 별도로 삽입하거나, RLS를 일시적으로 비활성화해야 합니다.
  console.log("리뷰 데이터는 인증 구현 후 삽입할 수 있습니다.");
  console.log("시드 완료!");
}

seed();
