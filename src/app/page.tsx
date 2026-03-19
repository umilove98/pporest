"use client";

import { MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MapPlaceholder } from "@/components/restroom/map-placeholder";
import { RestroomCard } from "@/components/restroom/restroom-card";
import { mockRestrooms } from "@/lib/mock-data";

export default function HomePage() {
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
          <span className="text-xs text-muted-foreground">{mockRestrooms.length}개</span>
        </div>
        <div className="flex flex-col gap-3 pb-4">
          {mockRestrooms.map((restroom) => (
            <RestroomCard key={restroom.id} restroom={restroom} />
          ))}
        </div>
      </div>
    </div>
  );
}
