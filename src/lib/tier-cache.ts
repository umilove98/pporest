import { PreferenceKey, RestroomTier, UserPreferences } from "./types";

const CACHE_KEY = "pporest_tier_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1시간

interface TierCacheEntry {
  tier: RestroomTier;
  timestamp: number;
}

interface TierCacheData {
  prefsHash: string;
  entries: Record<string, TierCacheEntry>;
}

/** 취향 설정을 해시 문자열로 변환 — 취향 변경 시 캐시 무효화 */
function hashPreferences(prefs: UserPreferences): string {
  const keys: PreferenceKey[] = [
    "cleanliness", "gender_separated", "bidet", "stall_count", "accessibility", "safety",
  ];
  return keys.map((k) => `${k}:${prefs[k] ?? "-"}`).join("|");
}

function loadCache(): TierCacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TierCacheData;
  } catch {
    return null;
  }
}

function saveCache(data: TierCacheData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage full 등 무시
  }
}

/** 캐시에서 티어 조회 — 취향이 다르거나 TTL 만료 시 null */
export function getCachedTier(restroomId: string, prefs: UserPreferences): RestroomTier | undefined {
  const cache = loadCache();
  if (!cache) return undefined;

  const hash = hashPreferences(prefs);
  if (cache.prefsHash !== hash) return undefined;

  const entry = cache.entries[restroomId];
  if (!entry) return undefined;

  if (Date.now() - entry.timestamp > CACHE_TTL) return undefined;

  return entry.tier;
}

/** 티어를 캐시에 저장 */
export function setCachedTier(restroomId: string, tier: RestroomTier, prefs: UserPreferences): void {
  const hash = hashPreferences(prefs);
  let cache = loadCache();

  // 취향이 바뀌었으면 캐시 초기화
  if (!cache || cache.prefsHash !== hash) {
    cache = { prefsHash: hash, entries: {} };
  }

  cache.entries[restroomId] = { tier, timestamp: Date.now() };
  saveCache(cache);
}

/** 여러 티어를 일괄 캐시 저장 */
export function setCachedTiers(tierMap: Map<string, RestroomTier>, prefs: UserPreferences): void {
  const hash = hashPreferences(prefs);
  let cache = loadCache();

  if (!cache || cache.prefsHash !== hash) {
    cache = { prefsHash: hash, entries: {} };
  }

  tierMap.forEach((tier, id) => {
    cache.entries[id] = { tier, timestamp: Date.now() };
  });
  saveCache(cache);
}

/** 여러 화장실의 캐시된 티어를 일괄 조회 */
export function getCachedTiers(restroomIds: string[], prefs: UserPreferences): Map<string, RestroomTier> {
  const map = new Map<string, RestroomTier>();
  const cache = loadCache();
  if (!cache) return map;

  const hash = hashPreferences(prefs);
  if (cache.prefsHash !== hash) return map;

  const now = Date.now();
  for (const id of restroomIds) {
    const entry = cache.entries[id];
    if (entry && now - entry.timestamp <= CACHE_TTL) {
      map.set(id, entry.tier);
    }
  }
  return map;
}
