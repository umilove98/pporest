import { MapPin } from "lucide-react";

export function MapPlaceholder() {
  return (
    <div className="relative flex h-48 items-center justify-center rounded-lg bg-muted">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <MapPin className="h-8 w-8" />
        <span className="text-sm">지도 영역 (준비 중)</span>
      </div>
      {/* Fake map dots */}
      <div className="absolute left-1/4 top-1/3 h-3 w-3 rounded-full bg-primary/60" />
      <div className="absolute right-1/3 top-1/2 h-3 w-3 rounded-full bg-primary/60" />
      <div className="absolute bottom-1/4 left-1/2 h-4 w-4 rounded-full bg-primary" />
      <div className="absolute right-1/4 top-1/4 h-3 w-3 rounded-full bg-primary/40" />
    </div>
  );
}
