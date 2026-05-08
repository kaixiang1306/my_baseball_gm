import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LeagueState } from "@/game/types";
import { generateLeague } from "@/game/generator";
import { makeRng } from "@/game/random";
import {
  simulateDay,
  startPlayoffs,
  tickPlayoffsDay,
  getTeam,
} from "@/game/playoffs";

interface AppState {
  league: LeagueState | null;
  view: "select" | "dashboard" | "standings" | "roster" | "playoffs" | "champion";
  setView: (v: AppState["view"]) => void;
  newGame: (seed?: number) => void;
  pickTeam: (teamId: string) => void;
  simulateNextGame: () => void;
  simulatePlayoffsStep: () => void;
  reset: () => void;
}

const REGULAR_LAST_MONTH = 9;
const DAYS_PER_MONTH = 27;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      league: null,
      view: "select",
      setView: (v) => set({ view: v }),
      newGame: (seed) => {
        const s = seed ?? Math.floor(Math.random() * 1e9);
        const league = generateLeague(s);
        set({ league, view: "select" });
      },
      pickTeam: (teamId) => {
        const league = get().league;
        if (!league) return;
        league.userTeamId = teamId;
        league.phase = "regular";
        set({ league: { ...league }, view: "dashboard" });
      },
      simulateNextGame: () => {
        const league = get().league;
        if (!league) return;
        if (league.phase !== "regular") return;
        const rng = makeRng(
          league.seed + league.currentMonth * 1000 + league.currentDay,
        );
        simulateDay(rng, league, league.currentMonth, league.currentDay);
        // 推進日期
        if (league.currentDay >= DAYS_PER_MONTH) {
          if (league.currentMonth >= REGULAR_LAST_MONTH) {
            startPlayoffs(league);
            set({ league: { ...league }, view: "playoffs" });
            return;
          }
          league.currentMonth += 1;
          league.currentDay = 1;
        } else {
          league.currentDay += 1;
        }
        set({ league: { ...league } });
      },
      simulatePlayoffsStep: () => {
        const league = get().league;
        if (!league) return;
        if (league.phase !== "playoffs") return;
        const rng = makeRng(
          league.seed + 9999 + league.currentPlayoffRound * 100,
        );
        tickPlayoffsDay(rng, league);
        const becameChampion = (league.phase as string) === "champion";
        set({
          league: { ...league },
          view: becameChampion ? "champion" : "playoffs",
        });
      },
      reset: () => set({ league: null, view: "select" }),
    }),
    {
      name: "baseball-gm-state",
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as { league: LeagueState | null; view: AppState["view"] };
        if (version < 2 && s.league && (s.league as LeagueState).currentDay === undefined) {
          (s.league as LeagueState).currentDay = 1;
        }
        return s as Partial<AppState>;
      },
    },
  ),
);

export function useUserTeam() {
  const league = useApp((s) => s.league);
  if (!league || !league.userTeamId) return null;
  return getTeam(league, league.userTeamId) ?? null;
}
