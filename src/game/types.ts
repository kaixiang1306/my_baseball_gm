export type Position =
  | "SP"
  | "RP"
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH";

export const HITTER_POSITIONS: Position[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
];

export interface Injury {
  reason: string;
  daysOut: number;        // 剩餘缺賽天數,推進時遞減
  totalDays: number;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  hitting: number;        // 1-99
  pitching: number;       // 1-99
  fielding: number;       // 1-99
  stamina: number;        // 1-99 (耐力,主要影響投手)
  injury: Injury | null;
  // 賽季統計
  stats: {
    games: number;
    atBats: number;
    hits: number;
    homeRuns: number;
    rbi: number;
    runs: number;
    inningsPitched: number;
    earnedRuns: number;
    wins: number;
    losses: number;
    saves: number;
    strikeouts: number;
  };
}

export interface Team {
  id: string;
  city: string;
  name: string;          // e.g. "台北勇士"
  abbr: string;          // e.g. "TPE"
  color: string;         // primary color
  players: Player[];
  rotationIndex: number; // 用來輪先發投手
}

export interface InjuryEvent {
  playerId: string;
  playerName: string;
  teamId: string;
  reason: string;
  daysOut: number;
}

export interface Game {
  id: string;
  month: number;          // 4-9 (4 月到 9 月例行賽);10 起為季後賽
  day: number;            // 該月第幾天 (1-30)
  awayTeamId: string;
  homeTeamId: string;
  played: boolean;
  awayScore?: number;
  homeScore?: number;
  injuries?: InjuryEvent[];
  // 季後賽用
  series?: {
    round: "DS" | "CS" | "WS"; // 分區/聯盟/世界大賽
    label: string;             // 顯示用
    gameInSeries: number;      // 1-7
  };
}

export interface PlayoffSeries {
  round: "DS" | "CS" | "WS";
  label: string;
  highSeedTeamId: string;
  lowSeedTeamId: string;
  highSeedWins: number;
  lowSeedWins: number;
  winnerTeamId?: string;
}

export interface Standing {
  teamId: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  last10: ("W" | "L")[];
  streak: { type: "W" | "L"; count: number };
}

export type Phase = "select" | "regular" | "playoffs" | "champion";

export interface LeagueState {
  seed: number;
  teams: Team[];
  schedule: Game[];
  standings: Record<string, Standing>;
  userTeamId: string | null;
  // 賽季時間進度
  currentMonth: number;     // 4-9 例行賽,10 起為季後賽月份
  currentDay: number;       // 該月第幾天 (1-27)
  // 季後賽
  playoffs: PlayoffSeries[];
  currentPlayoffRound: number;     // 0=DS, 1=CS, 2=WS
  championTeamId: string | null;
  phase: Phase;
}
