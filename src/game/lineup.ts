import { Player, Position, Team } from "./types";

export function isAvailable(p: Player): boolean {
  return p.injury === null || p.injury.daysOut <= 0;
}

// 取得指定位置可上場、評分最高的球員 (扣除已被前面位置佔走的)
function bestAt(
  team: Team,
  position: Position,
  used: Set<string>,
): Player | null {
  const candidates = team.players
    .filter(
      (p) =>
        p.position === position &&
        !used.has(p.id) &&
        isAvailable(p),
    )
    .sort((a, b) => b.hitting + b.fielding - (a.hitting + a.fielding));
  return candidates[0] ?? null;
}

// 自動決定打擊先發 (9 人)
export function startingLineup(team: Team): Player[] {
  const used = new Set<string>();
  const positions: Position[] = [
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
  const lineup: Player[] = [];
  for (const pos of positions) {
    const p = bestAt(team, pos, used);
    if (p) {
      lineup.push(p);
      used.add(p.id);
    }
  }
  // 若有位置缺人 (太多傷),從替補野手填補
  if (lineup.length < 9) {
    const fillers = team.players
      .filter(
        (p) =>
          !used.has(p.id) &&
          isAvailable(p) &&
          p.position !== "SP" &&
          p.position !== "RP",
      )
      .sort((a, b) => b.hitting - a.hitting);
    for (const f of fillers) {
      if (lineup.length >= 9) break;
      lineup.push(f);
      used.add(f.id);
    }
  }
  return lineup;
}

// 取得本場先發投手:依輪轉序選下一位健康的 SP
export function startingPitcher(team: Team): Player | null {
  const sps = team.players.filter((p) => p.position === "SP" && isAvailable(p));
  if (sps.length === 0) {
    // 沒有健康 SP → 用後援頂上
    const rps = team.players.filter(
      (p) => p.position === "RP" && isAvailable(p),
    );
    return rps[0] ?? null;
  }
  return sps[team.rotationIndex % sps.length];
}

export function bullpen(team: Team): Player[] {
  return team.players.filter((p) => p.position === "RP" && isAvailable(p));
}

// 隊伍打擊綜合評分 (起用先發 9 人)
export function offenseRating(team: Team): number {
  const lineup = startingLineup(team);
  if (lineup.length === 0) return 50;
  const avg = lineup.reduce((s, p) => s + p.hitting, 0) / lineup.length;
  return avg;
}

// 隊伍守備綜合評分
export function defenseRating(team: Team): number {
  const lineup = startingLineup(team);
  if (lineup.length === 0) return 50;
  const avg = lineup.reduce((s, p) => s + p.fielding, 0) / lineup.length;
  return avg;
}

// 隊伍投手綜合評分:本場 SP * 0.6 + 牛棚均值 * 0.4
export function pitchingRating(team: Team): number {
  const sp = startingPitcher(team);
  const pen = bullpen(team);
  const spRating = sp?.pitching ?? 50;
  const penAvg =
    pen.length > 0
      ? pen.reduce((s, p) => s + p.pitching, 0) / pen.length
      : 50;
  return spRating * 0.6 + penAvg * 0.4;
}

// 球員受傷狀態描述
export function injuryLabel(p: Player): string | null {
  if (!p.injury || p.injury.daysOut <= 0) return null;
  return `${p.injury.reason} (剩 ${p.injury.daysOut} 天)`;
}
