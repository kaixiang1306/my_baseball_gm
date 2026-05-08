import { Player, Position, Team, Game, LeagueState, Standing } from "./types";
import { Rng, makeRng, randInt, pick, gauss, clamp } from "./random";
import {
  SURNAMES,
  GIVEN_NAMES,
  TEAM_CITIES,
  TEAM_NAMES,
  TEAM_COLORS,
  TEAM_ABBRS,
} from "./names";

const NUM_TEAMS = 12;
const GAMES_PER_DAY = NUM_TEAMS / 2;
// 例行賽 4-9 月,每月 27 天,每天 6 場 → 每隊每月 27 場 → 賽季共 162 場
const MONTHS = [4, 5, 6, 7, 8, 9];
const DAYS_PER_MONTH = 27;

function randomName(rng: Rng): string {
  return pick(rng, SURNAMES) + pick(rng, GIVEN_NAMES);
}

// 生成在 mean 附近、限制在 [40, 99] 的能力值
function rollAttribute(rng: Rng, mean: number, stdDev = 10): number {
  return Math.round(clamp(gauss(rng, mean, stdDev), 40, 99));
}

function makePlayer(
  rng: Rng,
  position: Position,
  teamStrength: number,
): Player {
  const isPitcher = position === "SP" || position === "RP";
  const base = teamStrength;
  return {
    id: crypto.randomUUID(),
    name: randomName(rng),
    position,
    age: randInt(rng, 20, 38),
    hitting: rollAttribute(rng, isPitcher ? base - 25 : base, 8),
    pitching: rollAttribute(rng, isPitcher ? base : base - 25, 8),
    fielding: rollAttribute(rng, base - 5, 8),
    stamina: rollAttribute(rng, base, 8),
    injury: null,
    stats: {
      games: 0,
      atBats: 0,
      hits: 0,
      homeRuns: 0,
      rbi: 0,
      runs: 0,
      inningsPitched: 0,
      earnedRuns: 0,
      wins: 0,
      losses: 0,
      saves: 0,
      strikeouts: 0,
    },
  };
}

// 球隊陣容組合 (25 人)
const ROSTER_TEMPLATE: Position[] = [
  // 5 先發 + 6 中繼/後援
  "SP", "SP", "SP", "SP", "SP",
  "RP", "RP", "RP", "RP", "RP", "RP",
  // 14 野手 (每位置主力 + 替補)
  "C", "C",
  "1B", "1B",
  "2B", "2B",
  "3B", "3B",
  "SS", "SS",
  "LF", "CF", "RF", "DH",
];

function makeTeam(rng: Rng, idx: number): Team {
  const teamStrength = randInt(rng, 60, 80); // 全聯盟平均 70 上下
  const players = ROSTER_TEMPLATE.map((pos) =>
    makePlayer(rng, pos, teamStrength),
  );
  return {
    id: `team_${idx}`,
    city: TEAM_CITIES[idx],
    name: TEAM_NAMES[idx],
    abbr: TEAM_ABBRS[idx],
    color: TEAM_COLORS[idx],
    players,
    rotationIndex: 0,
  };
}

// 簡單對戰排程:每天把 12 隊配成 6 對
// 用 round-robin (Berger table) 生成 11 個輪次,每月重複/打散
function buildSchedule(rng: Rng, teams: Team[]): Game[] {
  const ids = teams.map((t) => t.id);
  const games: Game[] = [];
  let gameId = 0;

  for (const month of MONTHS) {
    for (let day = 1; day <= DAYS_PER_MONTH; day++) {
      // 生成當天的 6 對配對 (Berger round-robin)
      const round = (month * DAYS_PER_MONTH + day) % (NUM_TEAMS - 1);
      const matchups = bergerRound(ids, round);
      // 隨機決定主客
      for (const [a, b] of matchups) {
        const homeFirst = rng() < 0.5;
        const homeTeamId = homeFirst ? a : b;
        const awayTeamId = homeFirst ? b : a;
        games.push({
          id: `g${gameId++}`,
          month,
          day,
          awayTeamId,
          homeTeamId,
          played: false,
        });
      }
    }
  }
  // 確保總場數正確
  if (games.length !== MONTHS.length * DAYS_PER_MONTH * GAMES_PER_DAY) {
    throw new Error("schedule size mismatch");
  }
  return games;
}

// 標準 round-robin: 12 隊有 11 個輪次,固定隊 0,其它輪轉
function bergerRound(ids: string[], r: number): [string, string][] {
  const n = ids.length;
  const half = n / 2;
  const fixed = ids[0];
  const rotating = ids.slice(1);
  const len = rotating.length; // n - 1
  // 旋轉 r 次
  const rot = rotating.slice(r % len).concat(rotating.slice(0, r % len));
  const matchups: [string, string][] = [];
  matchups.push([fixed, rot[0]]);
  for (let i = 1; i < half; i++) {
    matchups.push([rot[i], rot[len - i]]);
  }
  return matchups;
}

function emptyStanding(teamId: string): Standing {
  return {
    teamId,
    wins: 0,
    losses: 0,
    runsScored: 0,
    runsAllowed: 0,
    last10: [],
    streak: { type: "W", count: 0 },
  };
}

export function generateLeague(seed: number): LeagueState {
  const rng = makeRng(seed);
  const teams = Array.from({ length: NUM_TEAMS }, (_, i) => makeTeam(rng, i));
  const schedule = buildSchedule(rng, teams);
  const standings: Record<string, Standing> = {};
  for (const t of teams) standings[t.id] = emptyStanding(t.id);
  return {
    seed,
    teams,
    schedule,
    standings,
    userTeamId: null,
    currentMonth: 4,
    currentDay: 1,
    playoffs: [],
    currentPlayoffRound: 0,
    championTeamId: null,
    phase: "select",
  };
}
