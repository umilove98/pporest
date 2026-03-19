"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MapPlaceholder } from "@/components/restroom/map-placeholder";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { getRestrooms } from "@/lib/api";
import { mockRestrooms } from "@/lib/mock-data";
import { Restroom } from "@/lib/types";

export default function HomePage() {
  const [restrooms, setRestrooms] = useState<Restroom[]>(mockRestrooms);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestrooms()
      .then(setRestrooms)
      .catch(() => setRestrooms(mockRestrooms))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold">PPORest</h1>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>서울특별시 강남구 근처</span>
        </div>
      </header>

      {/* Map */}
      <div className="px-4 pt-4">
        <MapPlaceholder />
      </div>

      <div className="px-4 py-3">
        <Separator />
      </div>

      {/* Restroom List */}
      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">주변 화장실</h2>
          <span className="text-xs text-muted-foreground">{restrooms.length}개</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {restrooms.map((restroom) => (
              <RestroomCard key={restroom.id} restroom={restroom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
