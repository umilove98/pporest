import { RestroomTier } from "@/lib/types";

const tierStyles: Record<string, string> = {
  S: "bg-amber-400 text-amber-950 ring-amber-500/30",
  A: "bg-emerald-400 text-emerald-950 ring-emerald-500/30",
  B: "bg-sky-400 text-sky-950 ring-sky-500/30",
  C: "bg-slate-300 text-slate-700 ring-slate-400/30",
};

export function TierBadge({ tier }: { tier: RestroomTier }) {
  if (!tier) return null;

  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold ring-1 ${tierStyles[tier]}`}
    >
      {tier}
    </span>
  );
}
