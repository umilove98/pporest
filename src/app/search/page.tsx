"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { useAuth } from "@/components/auth/auth-provider";
import { searchPublicRestroomsWithStats, searchUserRestroomsDB, userRestroomToRestroom, enrichRestroomsWithStats, getUserPreferences, calculateTiers } from "@/lib/api";
import { Restroom, RestroomTier, UserPreferences } from "@/lib/types";
import { getCachedTiers, setCachedTiers } from "@/lib/tier-cache";

const filters = ["장애인 접근 가능", "기저귀 교환대", "24시간"];
const TIER_FILTERS: RestroomTier[] = ["S", "A", "B", "C"];

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [restrooms, setRestrooms] = useState<Restroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [tierMap, setTierMap] = useState<Map<string, RestroomTier>>(new Map());
  const [tierFilter, setTierFilter] = useState<RestroomTier | null>(null);

  // 유저 취향 로드
  useEffect(() => {
    if (!user) {
      setPreferences(null);
      setTierMap(new Map());
      return;
    }
    getUserPreferences(user.id).then(setPreferences).catch(() => {});
  }, [user]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const [publicRestrooms, userResults] = await Promise.all([
        searchPublicRestroomsWithStats(query, activeFilters, 30),
        searchUserRestroomsDB(query, activeFilters),
      ]);
      // 유저 화장실만 별점 보강 필요
      const userRestrooms = userResults.map((u) => userRestroomToRestroom(u));
      const enrichedUser = userRestrooms.length > 0
        ? await enrichRestroomsWithStats(userRestrooms)
        : userRestrooms;
      const all = [...publicRestrooms, ...enrichedUser];
      setRestrooms(all);
      if (preferences) {
        const ids = all.map((r) => r.id);
        const cached = getCachedTiers(ids, preferences);
        const uncached = all.filter((r) => !cached.has(r.id));
        const computed = calculateTiers(uncached, preferences);
        if (computed.size > 0) setCachedTiers(computed, preferences);
        const merged = new Map<string, RestroomTier>();
        cached.forEach((v, k) => merged.set(k, v));
        computed.forEach((v, k) => merged.set(k, v));
        setTierMap(merged);
      }
    } catch {
      setRestrooms([]);
    } finally {
      setLoading(false);
    }
  }, [query, activeFilters, preferences]);

  useEffect(() => {
    // 검색어나 필터가 없으면 검색하지 않음
    if (!query && activeFilters.length === 0) {
      setRestrooms([]);
      return;
    }
    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [doSearch, query, activeFilters]);

  // 티어 필터 적용
  const displayRestrooms = tierFilter
    ? restrooms.filter((r) => tierMap.get(r.id) === tierFilter)
    : restrooms;

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <h1 className="mb-3 text-lg font-bold">검색</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="화장실 이름, 주소 검색..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <Badge
              key={filter}
              variant={activeFilters.includes(filter) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleFilter(filter)}
            >
              {filter}
            </Badge>
          ))}
          {preferences && tierMap.size > 0 && (
            <>
              <span className="mx-0.5 self-center text-muted-foreground/40">|</span>
              {TIER_FILTERS.map((t) => (
                <Badge
                  key={t}
                  variant={tierFilter === t ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setTierFilter(tierFilter === t ? null : t)}
                >
                  {t}티어
                </Badge>
              ))}
            </>
          )}
        </div>
      </header>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">검색 중...</p>
          </div>
        ) : displayRestrooms.length > 0 ? (
          <div className="flex flex-col gap-3 pb-4">
            {displayRestrooms.map((restroom) => (
              <RestroomCard key={restroom.id} restroom={restroom} tier={tierMap.get(restroom.id)} preferences={preferences} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Search className="h-8 w-8" />
            <p className="text-sm">
              {tierFilter ? `${tierFilter}티어 검색 결과가 없습니다` : "검색 결과가 없습니다"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
