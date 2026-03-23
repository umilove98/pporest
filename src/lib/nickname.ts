/** 깔끔하고 건강한 스타일의 닉네임 자동 생성 */

const ADJECTIVES = [
  "맑은", "푸른", "따뜻한", "고요한", "상쾌한",
  "빛나는", "싱그러운", "산뜻한", "은은한", "깨끗한",
  "포근한", "밝은", "잔잔한", "시원한", "향긋한",
  "소중한", "반짝이는", "평화로운", "건강한", "기분좋은",
  "활기찬", "단단한", "온화한", "청명한", "다정한",
];

const NOUNS = [
  "숲지기", "산책자", "하늘", "바람", "이슬",
  "나무", "시냇물", "햇살", "새벽", "풀잎",
  "돌멩이", "다람쥐", "꽃잎", "구름", "별빛",
  "호수", "봄날", "언덕", "솔바람", "달빛",
  "고양이", "참새", "소나무", "오솔길", "정원사",
];

/**
 * 랜덤 닉네임 기본형 생성 (형용사 + 명사, 번호 없음)
 * 예: "맑은 숲지기", "푸른 산책자"
 */
export function generateRandomNicknameBase(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}
