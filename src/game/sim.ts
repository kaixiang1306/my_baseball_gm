import { Game, InjuryEvent, Player, Standing, Team } from "./types";
import { Rng, gauss, randInt, pick } from "./random";
import {
  bullpen,
  defenseRating,
  offenseRating,
  pitchingRating,
  startingLineup,
  startingPitcher,
} from "./lineup";

// 每隊每場受傷機率 (約全季 5 次傷)
const INJURY_PROB_PER_TEAM_PER_GAME = 0.03;

const INJURY_REASONS = [
  "腿後腱拉傷",
  "肩膀疲勞",
  "手肘發炎",
  "腳踝扭傷",
  "腰部不適",
  "手腕挫傷",
  "脹氣不適",
  "暈船",
  "感冒",
];

// 輸入兩隊評分,模擬一場比賽得分
function simulateScores(
  rng: Rng,
  homeOff: number,
  homePit: number,
  homeDef: number,
  awayOff: number,
  awayPit: number,
  awayDef: number,
): { homeScore: number; awayScore: number } {
  // 期望分數 = 4.5 + (打擊優勢 - 對方守備修正) * 縮放
  const baseRuns = 4.5;
  const homeAdvantage = 0.3;
  const homeExp = Math.max(
    0.5,
    baseRuns + (homeOff - awayPit - awayDef * 0.2) / 12 + homeAdvantage,
  );
  const awayExp = Math.max(
    0.5,
    baseRuns + (awayOff - homePit - homeDef * 0.2) / 12,
  );
  let homeScore = Math.max(0, Math.round(gauss(rng, homeExp, 2.4)));
  let awayScore = Math.max(0, Math.round(gauss(rng, awayExp, 2.4)));
  // 不允許和局 → 抽簽延長
  while (homeScore === awayScore) {
    if (rng() < 0.5) homeScore += randInt(rng, 1, 3);
    else awayScore += randInt(rng, 1, 3);
  }
  return { homeScore, awayScore };
}

function rollInjury(rng: Rng, team: Team): InjuryEvent | null {
  if (rng() >= INJURY_PROB_PER_TEAM_PER_GAME) return null;
  // 從健康球員中隨機選一位
  const healthy = team.players.filter((p) => p.injury === null);
  if (healthy.length === 0) return null;
  const victim = pick(rng, healthy);
  const reason = pick(rng, INJURY_REASONS);
  // 缺賽天數依嚴重度
  const r = rng();
  let daysOut: number;
  if (r < 0.5) daysOut = randInt(rng, 5, 14);
  else if (r < 0.85) daysOut = randInt(rng, 15, 30);
  else daysOut = randInt(rng, 31, 70);
  victim.injury = { reason, daysOut, totalDays: daysOut };
  return {
    playerId: victim.id,
    playerName: victim.name,
    teamId: team.id,
    reason,
    daysOut,
  };
}

// 累積打擊統計到先發名單 (粗略分配,team-level sim 不精算)
function accumulateBattingStats(rng: Rng, team: Team, runsScored: number) {
  const lineup = startingLineup(team);
  if (lineup.length === 0) return;
  // 9 個打者各 4 個打席,從中隨機分配安打
  // 隊伍打擊率 ≈ 0.25 + (offense - 70) / 200
  const teamAvg = 0.25 + (offenseRating(team) - 70) / 200;
  for (const p of lineup) {
    const ab = 4;
    const indivAvg = teamAvg + (p.hitting - 70) / 400;
    let hits = 0;
    for (let i = 0; i < ab; i++) if (rng() < indivAvg) hits++;
    p.stats.games += 1;
    p.stats.atBats += ab;
    p.stats.hits += hits;
  }
  // 全壘打、打點、得分按 runsScored 大致分配
  let runsLeft = runsScored;
  let rbiLeft = runsScored;
  // 全壘打:每場期望值 ~1
  const hrCount = Math.min(runsScored, randInt(rng, 0, 2));
  for (let i = 0; i < hrCount; i++) {
    const slugger = lineup
      .slice()
      .sort((a, b) => b.hitting - a.hitting)[i % lineup.length];
    slugger.stats.homeRuns += 1;
  }
  while (runsLeft > 0) {
    const p = pick(rng, lineup);
    p.stats.runs += 1;
    runsLeft--;
  }
  while (rbiLeft > 0) {
    const p = pick(rng, lineup);
    p.stats.rbi += 1;
    rbiLeft--;
  }
}

// 累積投手統計
function accumulatePitchingStats(
  rng: Rng,
  team: Team,
  runsAllowed: number,
  isWin: boolean,
  isLoss: boolean,
) {
  const sp = startingPitcher(team);
  const pen = bullpen(team);
  if (!sp) return;
  // 先發投 6 局,後援分掉剩下 3 局
  const spIp = 6;
  const spER = Math.round(runsAllowed * 0.7);
  sp.stats.inningsPitched += spIp;
  sp.stats.earnedRuns += spER;
  sp.stats.strikeouts += randInt(rng, 3, 8);
  if (isWin) sp.stats.wins += 1;
  if (isLoss) sp.stats.losses += 1;
  if (pen.length > 0) {
    const closer = pen[0];
    const remainER = runsAllowed - spER;
    closer.stats.inningsPitched += 3;
    closer.stats.earnedRuns += Math.max(0, remainER);
    closer.stats.strikeouts += randInt(rng, 1, 4);
    if (isWin && remainER === 0) closer.stats.saves += 1;
  }
  team.rotationIndex = (team.rotationIndex + 1) % 5;
}

export function simulateGame(rng: Rng, home: Team, away: Team, game: Game) {
  const homeOff = offenseRating(home);
  const homePit = pitchingRating(home);
  const homeDef = defenseRating(home);
  const awayOff = offenseRating(away);
  const awayPit = pitchingRating(away);
  const awayDef = defenseRating(away);
  const { homeScore, awayScore } = simulateScores(
    rng,
    homeOff,
    homePit,
    homeDef,
    awayOff,
    awayPit,
    awayDef,
  );
  game.played = true;
  game.homeScore = homeScore;
  game.awayScore = awayScore;
  // 受傷判定
  const injuries: InjuryEvent[] = [];
  const homeInj = rollInjury(rng, home);
  if (homeInj) injuries.push(homeInj);
  const awayInj = rollInjury(rng, away);
  if (awayInj) injuries.push(awayInj);
  game.injuries = injuries;
  // 累積球員統計
  accumulateBattingStats(rng, home, homeScore);
  accumulateBattingStats(rng, away, awayScore);
  accumulatePitchingStats(
    rng,
    home,
    awayScore,
    homeScore > awayScore,
    homeScore < awayScore,
  );
  accumulatePitchingStats(
    rng,
    away,
    homeScore,
    awayScore > homeScore,
    awayScore < homeScore,
  );
  return injuries;
}

export function applyResultToStandings(
  game: Game,
  standings: Record<string, Standing>,
) {
  if (!game.played || game.homeScore === undefined || game.awayScore === undefined)
    return;
  const home = standings[game.homeTeamId];
  const away = standings[game.awayTeamId];
  home.runsScored += game.homeScore;
  home.runsAllowed += game.awayScore;
  away.runsScored += game.awayScore;
  away.runsAllowed += game.homeScore;
  const homeWin = game.homeScore > game.awayScore;
  const winner = homeWin ? home : away;
  const loser = homeWin ? away : home;
  winner.wins += 1;
  loser.losses += 1;
  pushLast10(winner, "W");
  pushLast10(loser, "L");
  bumpStreak(winner, "W");
  bumpStreak(loser, "L");
}

function pushLast10(s: Standing, r: "W" | "L") {
  s.last10.push(r);
  if (s.last10.length > 10) s.last10.shift();
}

function bumpStreak(s: Standing, r: "W" | "L") {
  if (s.streak.type === r) s.streak.count += 1;
  else s.streak = { type: r, count: 1 };
}

// 在賽季時間流動時遞減傷兵天數 (每天呼叫一次)
export function tickInjuries(teams: Team[]) {
  for (const t of teams) {
    for (const p of t.players) {
      if (p.injury) {
        p.injury.daysOut -= 1;
        if (p.injury.daysOut <= 0) p.injury = null;
      }
    }
  }
}

export function winPct(s: Standing): number {
  const total = s.wins + s.losses;
  return total === 0 ? 0 : s.wins / total;
}

export function gamesBack(leader: Standing, s: Standing): number {
  return ((leader.wins - s.wins) + (s.losses - leader.losses)) / 2;
}

export type { Player };
