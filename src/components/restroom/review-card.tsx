import { Camera, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "./star-rating";
import { Review } from "@/lib/types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {review.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={review.avatar_url}
                alt={review.user_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{review.user_name}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(review.created_at)}</span>
            </div>
            <StarRating rating={review.rating} />
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{review.comment}</p>
        {review.has_photo && (
          <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-md bg-muted">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
