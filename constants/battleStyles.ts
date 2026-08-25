import { League } from "@/types/battleModuleTypes";

export const LEAGUE_STYLES: Record<League, { bg: string; text: string; dot: string }> = {
  Bronze:   { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500" },
  Silver:   { bg: "bg-slate-200",   text: "text-slate-600",   dot: "bg-slate-400" },
  Gold:     { bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500" },
  Platinum: { bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "bg-cyan-500" },
  Diamond:  { bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500" },
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
