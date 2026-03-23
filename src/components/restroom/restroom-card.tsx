import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./star-rating";
import { TierBadge } from "@/components/preference/tier-badge";
import { PreferenceKey, Restroom, RestroomTier, UserPreferences } from "@/lib/types";

/** 취향 키 → 태그/속성 매핑 (해당하면 강조) */
function getHighlightedTags(restroom: Restroom, prefs: UserPreferences | null): Set<string> {
  const highlighted = new Set<string>();
  if (!prefs) return highlighted;

  const active = (k: PreferenceKey) => prefs[k] != null;

  if (active("accessibility") && restroom.has_disabled_access) highlighted.add("장애인 접근 가능");
  if (active("safety")) {
    if (restroom.emergency_bell || restroom.cctv) highlighted.add("__safety");
  }
  if (active("bidet") && restroom.has_bidet) highlighted.add("__bidet");
  if (active("gender_separated") && restroom.gender_type === "separated") highlighted.add("__separated");
  if (active("stall_count")) {
    const total = (restroom.male_stalls ?? restroom.male_toilet ?? 0) +
      (restroom.female_stalls ?? restroom.female_toilet ?? 0) +
      (restroom.male_urinal ?? 0);
    if (total >= 6) highlighted.add("__many_stalls");
  }
  if (active("cleanliness") && restroom.rating >= 4) highlighted.add("__clean");

  return highlighted;
}

/** 화장실 속성 기반 추가 태그 생성 */
function getExtraTags(restroom: Restroom, highlighted: Set<string>): { label: string; key: string; isHighlighted: boolean }[] {
  const extras: { label: string; key: string; isHighlighted: boolean }[] = [];

  if (restroom.has_bidet) {
    extras.push({ label: "비데", key: "__bidet", isHighlighted: highlighted.has("__bidet") });
  }
  if (restroom.gender_type === "separated") {
    extras.push({ label: "남녀분리", key: "__separated", isHighlighted: highlighted.has("__separated") });
  }
  if (restroom.emergency_bell || restroom.cctv) {
    const parts = [];
    if (restroom.emergency_bell) parts.push("비상벨");
    if (restroom.cctv) parts.push("CCTV");
    extras.push({ label: parts.join("/"), key: "__safety", isHighlighted: highlighted.has("__safety") });
  }

  return extras;
}

interface RestroomCardProps {
  restroom: Restroom;
  tier?: RestroomTier;
  preferences?: UserPreferences | null;
}

export function RestroomCard({ restroom, tier, preferences }: RestroomCardProps) {
  const highlighted = getHighlightedTags(restroom, preferences ?? null);
  const extraTags = getExtraTags(restroom, highlighted);

  return (
    <Link href={`/restroom/${restroom.id}${tier ? `?tier=${tier}` : ""}`}>
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
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      highlighted.has(tag)
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : ""
                    }`}
                  >
                    {tag}
                  </Badge>
                ))}
                {extraTags.map(({ label, key, isHighlighted }) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      isHighlighted
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : ""
                    }`}
                  >
                    {label}
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
