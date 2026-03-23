import { Camera } from "lucide-react";

export function PhotoGrid({ photos = [] }: { photos?: string[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Camera className="mb-2 h-6 w-6" />
        <p className="text-sm">등록된 사진이 없습니다.</p>
      </div>
    );
  }

  const visible = photos.slice(0, 4);
  const extra = photos.length - visible.length;

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {visible.map((url, i) => (
        <div
          key={i}
          className="relative aspect-square overflow-hidden rounded-md bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`사진 ${i + 1}`}
            className="h-full w-full object-cover"
          />
          {i === visible.length - 1 && extra > 0 && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
              <span className="text-sm font-medium text-white">+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
