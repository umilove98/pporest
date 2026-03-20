/**
 * Supabase 시드 데이터 스크립트
 * 실행: npx tsx src/lib/seed.ts
 *
 * 서울/경기 지역 공공 화장실 데이터 (공공데이터포털 전국공중화장실표준데이터 기반)
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

// 서울/경기 지역 공공 화장실 데이터
const publicRestrooms = [
  // === 서울 ===
  { name: "광화문광장 공중화장실", address: "서울 종로구 세종대로 172", lat: 37.5719, lng: 126.9768, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "24시간", public_data_id: "PD-SEOUL-001", source: "public_data" as const, status: "approved" as const },
  { name: "종로3가역 공중화장실", address: "서울 종로구 종로 지하 130", lat: 37.5710, lng: 126.9916, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-002", source: "public_data" as const, status: "approved" as const },
  { name: "서울역 지하 공중화장실", address: "서울 용산구 한강대로 405", lat: 37.5547, lng: 126.9707, tags: ["무료", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "05:00-24:00", public_data_id: "PD-SEOUL-003", source: "public_data" as const, status: "approved" as const },
  { name: "명동 공중화장실", address: "서울 중구 명동길 74", lat: 37.5636, lng: 126.9860, tags: ["무료", "깨끗함"], is_open: true, has_disabled_access: false, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "06:00-23:00", public_data_id: "PD-SEOUL-004", source: "public_data" as const, status: "approved" as const },
  { name: "을지로입구역 공중화장실", address: "서울 중구 을지로 지하 65", lat: 37.5660, lng: 126.9825, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-005", source: "public_data" as const, status: "approved" as const },
  { name: "동대문 디자인플라자 공중화장실", address: "서울 중구 을지로 281", lat: 37.5671, lng: 127.0095, tags: ["무료", "깨끗함", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: true, is_free: true, open_hours: "10:00-22:00", public_data_id: "PD-SEOUL-006", source: "public_data" as const, status: "approved" as const },
  { name: "잠실역 공중화장실", address: "서울 송파구 올림픽로 지하 240", lat: 37.5133, lng: 127.1001, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-007", source: "public_data" as const, status: "approved" as const },
  { name: "강남역 공중화장실", address: "서울 강남구 강남대로 지하 396", lat: 37.4980, lng: 127.0276, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-008", source: "public_data" as const, status: "approved" as const },
  { name: "홍대입구역 공중화장실", address: "서울 마포구 양화로 160", lat: 37.5573, lng: 126.9255, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-009", source: "public_data" as const, status: "approved" as const },
  { name: "여의도공원 공중화장실", address: "서울 영등포구 여의공원로 68", lat: 37.5265, lng: 126.9224, tags: ["무료", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "06:00-22:00", public_data_id: "PD-SEOUL-010", source: "public_data" as const, status: "approved" as const },
  { name: "신촌역 공중화장실", address: "서울 서대문구 신촌로 지하 90", lat: 37.5551, lng: 126.9369, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-011", source: "public_data" as const, status: "approved" as const },
  { name: "이태원역 공중화장실", address: "서울 용산구 이태원로 지하 177", lat: 37.5346, lng: 126.9946, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-012", source: "public_data" as const, status: "approved" as const },
  { name: "남산타워 공중화장실", address: "서울 용산구 남산공원길 105", lat: 37.5512, lng: 126.9882, tags: ["무료", "깨끗함"], is_open: true, has_disabled_access: false, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "09:00-21:00", public_data_id: "PD-SEOUL-013", source: "public_data" as const, status: "approved" as const },
  { name: "합정역 공중화장실", address: "서울 마포구 양화로 지하 45", lat: 37.5495, lng: 126.9136, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-014", source: "public_data" as const, status: "approved" as const },
  { name: "건대입구역 공중화장실", address: "서울 광진구 아차산로 지하 246", lat: 37.5404, lng: 127.0693, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-015", source: "public_data" as const, status: "approved" as const },
  { name: "북한산 국립공원 둘레길 화장실", address: "서울 강북구 삼양로 181길 349", lat: 37.6583, lng: 126.9963, tags: ["무료"], is_open: true, has_disabled_access: false, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "06:00-20:00", public_data_id: "PD-SEOUL-016", source: "public_data" as const, status: "approved" as const },
  { name: "노원역 공중화장실", address: "서울 노원구 상계로 70", lat: 37.6554, lng: 127.0614, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-017", source: "public_data" as const, status: "approved" as const },
  { name: "사당역 공중화장실", address: "서울 동작구 동작대로 지하 109", lat: 37.4765, lng: 126.9816, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-SEOUL-018", source: "public_data" as const, status: "approved" as const },
  { name: "올림픽공원 공중화장실", address: "서울 송파구 올림픽로 424", lat: 37.5209, lng: 127.1219, tags: ["무료", "장애인 접근 가능", "깨끗함"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "05:00-22:00", public_data_id: "PD-SEOUL-019", source: "public_data" as const, status: "approved" as const },
  { name: "서울숲 공중화장실", address: "서울 성동구 뚝섬로 273", lat: 37.5444, lng: 127.0374, tags: ["무료", "깨끗함", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "05:00-22:00", public_data_id: "PD-SEOUL-020", source: "public_data" as const, status: "approved" as const },

  // === 경기도 ===
  { name: "판교역 공중화장실", address: "경기 성남시 분당구 판교역로 지하 160", lat: 37.3948, lng: 127.1113, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-GG-001", source: "public_data" as const, status: "approved" as const },
  { name: "수원역 공중화장실", address: "경기 수원시 팔달구 덕영대로 924", lat: 37.2661, lng: 127.0010, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "24시간", public_data_id: "PD-GG-002", source: "public_data" as const, status: "approved" as const },
  { name: "수원화성 팔달문 공중화장실", address: "경기 수원시 팔달구 정조로 780", lat: 37.2796, lng: 127.0150, tags: ["무료", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "06:00-22:00", public_data_id: "PD-GG-003", source: "public_data" as const, status: "approved" as const },
  { name: "일산 호수공원 공중화장실", address: "경기 고양시 일산동구 호수로 595", lat: 37.6705, lng: 126.7730, tags: ["무료", "깨끗함", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "06:00-22:00", public_data_id: "PD-GG-004", source: "public_data" as const, status: "approved" as const },
  { name: "용인 에버랜드 입구 공중화장실", address: "경기 용인시 처인구 포곡읍 에버랜드로 199", lat: 37.2943, lng: 127.2024, tags: ["무료", "깨끗함", "기저귀 교환대"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "08:00-21:00", public_data_id: "PD-GG-005", source: "public_data" as const, status: "approved" as const },
  { name: "의정부역 공중화장실", address: "경기 의정부시 의정부로 지하 1", lat: 37.7381, lng: 127.0458, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-GG-006", source: "public_data" as const, status: "approved" as const },
  { name: "안양 중앙공원 공중화장실", address: "경기 안양시 만안구 예술공원로 103", lat: 37.3943, lng: 126.9232, tags: ["무료", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "06:00-22:00", public_data_id: "PD-GG-007", source: "public_data" as const, status: "approved" as const },
  { name: "분당 서현역 공중화장실", address: "경기 성남시 분당구 분당로 지하 53", lat: 37.3850, lng: 127.1233, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-GG-008", source: "public_data" as const, status: "approved" as const },
  { name: "파주 임진각 공중화장실", address: "경기 파주시 문산읍 임진각로 148-53", lat: 37.8874, lng: 126.7411, tags: ["무료", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "06:00-21:00", public_data_id: "PD-GG-009", source: "public_data" as const, status: "approved" as const },
  { name: "남양주 다산신도시 공중화장실", address: "경기 남양주시 다산중앙로 105", lat: 37.6120, lng: 127.1548, tags: ["무료", "깨끗함"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: true, is_free: true, open_hours: "06:00-22:00", public_data_id: "PD-GG-010", source: "public_data" as const, status: "approved" as const },
  { name: "광명역 공중화장실", address: "경기 광명시 광명역로 21", lat: 37.4155, lng: 126.8842, tags: ["무료", "깨끗함"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "05:00-24:00", public_data_id: "PD-GG-011", source: "public_data" as const, status: "approved" as const },
  { name: "부천 중앙공원 공중화장실", address: "경기 부천시 길주로 1", lat: 37.5033, lng: 126.7660, tags: ["무료", "장애인 접근 가능"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "06:00-22:00", public_data_id: "PD-GG-012", source: "public_data" as const, status: "approved" as const },
  { name: "하남 스타필드 공중화장실", address: "경기 하남시 미사대로 750", lat: 37.5454, lng: 127.2233, tags: ["깨끗함", "비데", "기저귀 교환대"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: true, is_free: true, open_hours: "10:00-22:00", public_data_id: "PD-GG-013", source: "public_data" as const, status: "approved" as const },
  { name: "김포공항역 공중화장실", address: "경기 김포시 고촌읍 아라육로 152", lat: 37.5622, lng: 126.8015, tags: ["무료", "24시간"], is_open: true, has_disabled_access: true, has_diaper_table: true, has_bidet: false, is_free: true, open_hours: "24시간", public_data_id: "PD-GG-014", source: "public_data" as const, status: "approved" as const },
  { name: "평택역 공중화장실", address: "경기 평택시 평택로 55", lat: 36.9922, lng: 127.0858, tags: ["무료"], is_open: true, has_disabled_access: true, has_diaper_table: false, has_bidet: false, is_free: true, open_hours: "05:30-24:00", public_data_id: "PD-GG-015", source: "public_data" as const, status: "approved" as const },
];

async function seed() {
  console.log("서울/경기 공공 화장실 시드 데이터 삽입 시작...");
  console.log(`총 ${publicRestrooms.length}개 데이터`);

  // 배치 삽입 (50개씩)
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < publicRestrooms.length; i += batchSize) {
    const batch = publicRestrooms.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from("restrooms")
      .upsert(batch, { onConflict: "public_data_id" })
      .select();

    if (error) {
      console.error(`배치 ${i / batchSize + 1} 삽입 실패:`, error);
      continue;
    }

    inserted += data.length;
    console.log(`  배치 ${Math.floor(i / batchSize) + 1}: ${data.length}개 삽입/업데이트`);
  }

  console.log(`\n완료! 총 ${inserted}개 화장실 데이터 삽입됨`);
  console.log("서울: 20개, 경기: 15개");
}

seed();
