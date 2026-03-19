import { Camera } from "lucide-react";

export function PhotoGrid({ count = 4 }: { count?: number }) {
  const visible = Math.min(count, 4);
  const extra = count - visible;

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: visible }, (_, i) => (
        <div
          key={i}
          className="relative flex aspect-square items-center justify-center rounded-md bg-muted"
        >
          <Camera className="h-5 w-5 text-muted-foreground" />
          {i === visible - 1 && extra > 0 && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
              <span className="text-sm font-medium text-white">+{extra}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
