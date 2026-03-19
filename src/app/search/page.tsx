"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { mockRestrooms } from "@/lib/mock-data";

const filters = ["영업중", "장애인 접근 가능", "무료", "기저귀 교환대", "비데", "24시간"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const filtered = mockRestrooms.filter((r) => {
    const matchesQuery = query === "" || r.name.includes(query) || r.address.includes(query);
    const matchesFilters =
      activeFilters.length === 0 ||
      activeFilters.every((f) => {
        if (f === "영업중") return r.isOpen;
        return r.tags.includes(f);
      });
    return matchesQuery && matchesFilters;
  });

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
        </div>
      </header>

      <div className="px-4 pt-4">
        {filtered.length > 0 ? (
          <div className="flex flex-col gap-3 pb-4">
            {filtered.map((restroom) => (
              <RestroomCard key={restroom.id} restroom={restroom} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Search className="h-8 w-8" />
            <p className="text-sm">검색 결과가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
