import { Camera, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "./star-rating";
import { Review } from "@/lib/types";

export function ReviewCard({ review }: { review: Review }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{review.userName}</span>
              <span className="text-xs text-muted-foreground">{review.createdAt}</span>
            </div>
            <StarRating rating={review.rating} />
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">{review.comment}</p>
        {review.hasPhoto && (
          <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-md bg-muted">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
