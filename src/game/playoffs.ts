import { Game, LeagueState, PlayoffSeries, Team } from "./types";
import {
  applyResultToStandings,
  simulateGame,
  tickInjuries,
  winPct,
} from "./sim";
import { Rng } from "./random";

// 取例行賽戰績前 4 名
export function topFourSeeds(state: LeagueState): string[] {
  const sorted = Object.values(state.standings)
    .slice()
    .sort((a, b) => {
      const wp = winPct(b) - winPct(a);
      if (wp !== 0) return wp;
      return b.wins - a.wins;
    });
  return sorted.slice(0, 4).map((s) => s.teamId);
}

// 建立分區賽:1v4, 2v3。再從勝者打冠軍 (聯盟賽 → 世界大賽合併)
export function buildPlayoffBracket(state: LeagueState): PlayoffSeries[] {
  const seeds = topFourSeeds(state);
  return [
    {
      round: "DS",
      label: "分區系列賽 #1",
      highSeedTeamId: seeds[0],
      lowSeedTeamId: seeds[3],
      highSeedWins: 0,
      lowSeedWins: 0,
    },
    {
      round: "DS",
      label: "分區系列賽 #2",
      highSeedTeamId: seeds[1],
      lowSeedTeamId: seeds[2],
      highSeedWins: 0,
      lowSeedWins: 0,
    },
  ];
}

// 模擬一場系列賽下一場
export function playSeriesGame(
  rng: Rng,
  state: LeagueState,
  series: PlayoffSeries,
  gameInSeries: number,
): Game {
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const high = teamMap.get(series.highSeedTeamId)!;
  const low = teamMap.get(series.lowSeedTeamId)!;
  // 主場 1,2,5,7 由高種子;3,4,6 由低種子
  const highHome = [1, 2, 5, 7].includes(gameInSeries);
  const home = highHome ? high : low;
  const away = highHome ? low : high;
  const g: Game = {
    id: `po_${series.round}_${series.highSeedTeamId}_${series.lowSeedTeamId}_${gameInSeries}`,
    month: 10,
    day: gameInSeries,
    homeTeamId: home.id,
    awayTeamId: away.id,
    played: false,
    series: {
      round: series.round,
      label: series.label,
      gameInSeries,
    },
  };
  simulateGame(rng, home, away, g);
  // 季後賽不計入例行賽戰績,但可顯示
  // 更新系列賽勝場
  const homeWin = (g.homeScore ?? 0) > (g.awayScore ?? 0);
  const winnerId = homeWin ? home.id : away.id;
  if (winnerId === series.highSeedTeamId) series.highSeedWins += 1;
  else series.lowSeedWins += 1;
  if (series.highSeedWins >= 4) series.winnerTeamId = series.highSeedTeamId;
  else if (series.lowSeedWins >= 4) series.winnerTeamId = series.lowSeedTeamId;
  return g;
}

// 推進到下一輪
export function advancePlayoffRound(state: LeagueState) {
  const winners = state.playoffs
    .filter((s) => s.winnerTeamId)
    .map((s) => s.winnerTeamId!);
  if (winners.length < 2) return;
  // DS → CS
  if (state.currentPlayoffRound === 0) {
    const next: PlayoffSeries = {
      round: "CS",
      label: "聯盟冠軍賽",
      highSeedTeamId: winners[0],
      lowSeedTeamId: winners[1],
      highSeedWins: 0,
      lowSeedWins: 0,
    };
    state.playoffs.push(next);
    state.currentPlayoffRound = 1;
  } else if (state.currentPlayoffRound === 1) {
    // CS 完成 → 直接進入冠軍 (此 MVP 結構簡化:CS 勝者就是冠軍)
    const champion = winners[winners.length - 1];
    state.championTeamId = champion;
    state.phase = "champion";
  }
}

export function tickPlayoffsDay(rng: Rng, state: LeagueState) {
  // 對當輪所有未結束的系列賽進行下一場 (無論場數,讓進度推進有節奏)
  const currentSeries = state.playoffs.filter(
    (s) =>
      !s.winnerTeamId &&
      ((state.currentPlayoffRound === 0 && s.round === "DS") ||
        (state.currentPlayoffRound === 1 && s.round === "CS")),
  );
  if (currentSeries.length === 0) return;
  for (const s of currentSeries) {
    const totalGames = s.highSeedWins + s.lowSeedWins;
    if (s.winnerTeamId) continue;
    playSeriesGame(rng, state, s, totalGames + 1);
  }
  tickInjuries(state.teams);
  // 看本輪是否結束
  const allDone = currentSeries.every((s) => s.winnerTeamId);
  if (allDone) advancePlayoffRound(state);
}

// 例行賽結束後切換到季後賽
export function startPlayoffs(state: LeagueState) {
  state.playoffs = buildPlayoffBracket(state);
  state.currentPlayoffRound = 0;
  state.phase = "playoffs";
  state.currentMonth = 10;
}

// 模擬指定的某一天 (該天全部 6 場)
export function simulateDay(
  rng: Rng,
  state: LeagueState,
  month: number,
  day: number,
): import("./types").Game[] {
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const dayGames = state.schedule.filter(
    (g) => g.month === month && g.day === day && !g.played,
  );
  for (const g of dayGames) {
    const home = teamMap.get(g.homeTeamId)!;
    const away = teamMap.get(g.awayTeamId)!;
    simulateGame(rng, home, away, g);
    applyResultToStandings(g, state.standings);
  }
  tickInjuries(state.teams);
  return dayGames;
}

// 用於畫面:取得當月所有比賽 (含未戰)
export function gamesForMonth(state: LeagueState, month: number): Game[] {
  return state.schedule.filter((g) => g.month === month);
}

export function getTeam(state: LeagueState, id: string): Team | undefined {
  return state.teams.find((t) => t.id === id);
}
