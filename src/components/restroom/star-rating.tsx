"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md";
  onChange?: (rating: number) => void;
}

export function StarRating({ rating, maxStars = 5, size = "sm", onChange }: StarRatingProps) {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-6 w-6";

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= rating;
        const halfFilled = !filled && starValue - 0.5 <= rating;

        return (
          <button
            key={i}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(starValue)}
            className={cn("p-0 disabled:cursor-default", onChange && "cursor-pointer")}
          >
            <Star
              className={cn(
                sizeClass,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : halfFilled
                  ? "fill-amber-400/50 text-amber-400"
                  : "fill-none text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
