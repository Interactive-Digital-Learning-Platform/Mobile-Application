import { League } from "@/types/battleModuleTypes";

// `border` is a darker shade of that same league's own `color` (same hue,
// scaled toward black) -- for outlining a shape filled with `color`, not
// for text (a same-hue accent didn't hold up as text contrast against
// every league color; a fixed white-on-dark backdrop is used for that
// instead, see VersusIntro.tsx).
export const LEAGUE_STYLES: Record<
  League,
  { bg: string; text: string; dot: string; color: string; border: string }
> = {
  Bronze:   { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500", color: "#B87333", border: "#6E451F" },
  Silver:   { bg: "bg-slate-200",   text: "text-slate-600",   dot: "bg-slate-400",  color: "#B8C2CC", border: "#5B636B" },
  Gold:     { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500",  color: "#F5C542", border: "#8A6B1E" },
  Platinum: { bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "bg-cyan-500",   color: "#38BFD8", border: "#1E6E80" },
  Diamond:  { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500", color: "#8B5CF6", border: "#4C2FA8" },
};

export type BattleResultTheme = "win" | "loss" | "draw" | "forfeit";

export const BATTLE_RESULT_STYLES: Record<
  BattleResultTheme,
  { bg: string; label: string; sub: string }
> = {
  win:     { bg: "bg-emerald-600", label: "Victory!",     sub: "You won the match" },
  loss:    { bg: "bg-rose-600",    label: "Defeat",       sub: "Better luck next time" },
  draw:    { bg: "bg-slate-600",   label: "Draw",         sub: "An even match" },
  forfeit: { bg: "bg-slate-700",   label: "Match Ended",  sub: "Resolved by forfeit" },
};

export function getLeagueStyle(league: League | string | undefined | null) {
  return LEAGUE_STYLES[(league as League) ?? "Bronze"] ?? LEAGUE_STYLES.Bronze;
}
