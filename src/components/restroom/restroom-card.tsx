import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import { TierBadge } from "@/components/preference/tier-badge";
import { Restroom, RestroomTier } from "@/lib/types";

export function RestroomCard({ restroom, tier }: { restroom: Restroom; tier?: RestroomTier }) {
  return (
    <Link href={`/restroom/${restroom.id}`}>
      <Card className="transition-colors active:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {tier && <TierBadge tier={tier} />}
                <h3 className="font-semibold text-sm leading-tight">{restroom.name}</h3>
                {restroom.is_open ? (
                  <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                    영업중
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0 bg-red-100 text-red-600 text-[10px] px-1.5 py-0">
                    닫힘
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{restroom.address}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={restroom.rating} />
                <span className="text-xs text-muted-foreground">
                  {restroom.rating} ({restroom.review_count})
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {restroom.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-primary ml-2">
              {restroom.distance}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
