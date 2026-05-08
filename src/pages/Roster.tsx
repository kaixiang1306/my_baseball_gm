import { useApp } from "../store";
import { Player, Position } from "../game/types";
import { isAvailable, startingLineup } from "../game/lineup";

export default function Roster() {
  const league = useApp((s) => s.league)!;
  const team = league.teams.find((t) => t.id === league.userTeamId)!;
  const lineup = startingLineup(team);
  const lineupIds = new Set(lineup.map((p) => p.id));

  const pitchers = team.players.filter(
    (p) => p.position === "SP" || p.position === "RP",
  );
  const hitters = team.players.filter(
    (p) => p.position !== "SP" && p.position !== "RP",
  );
  const injured = team.players.filter((p) => p.injury !== null);

  return (
    <div>
      <div className="page-header">
        <h1>{team.city}{team.name} · 球員名單</h1>
        <span className="sub">
          25 人陣容 · 傷兵 {injured.length} 名 · 先發已自動依能力選定
        </span>
      </div>

      {injured.length > 0 && (
        <div className="events" style={{ marginTop: 0, marginBottom: 16 }}>
          <h3>傷兵名單</h3>
          {injured.map((p) => (
            <div key={p.id} className="event-row injury">
              <div className="icon">!</div>
              <div>
                <strong>{p.name}</strong> ({p.position}) · {p.injury!.reason} · 剩 {p.injury!.daysOut} 天
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="roster-grid">
        <div className="roster-section">
          <h2>打者陣容</h2>
          <PlayerList players={hitters} isStarting={(p) => lineupIds.has(p.id)} mode="hitter" />
        </div>
        <div className="roster-section">
          <h2>投手陣容</h2>
          <PlayerList players={pitchers} isStarting={() => false} mode="pitcher" />
        </div>
      </div>
    </div>
  );
}

function PlayerList({
  players,
  isStarting,
  mode,
}: {
  players: Player[];
  isStarting: (p: Player) => boolean;
  mode: "hitter" | "pitcher";
}) {
  // 排序:健康先發 → 健康替補 → 傷兵
  const sorted = players.slice().sort((a, b) => {
    const aS = isStarting(a) ? 0 : isAvailable(a) ? 1 : 2;
    const bS = isStarting(b) ? 0 : isAvailable(b) ? 1 : 2;
    if (aS !== bS) return aS - bS;
    return primaryAttr(b, mode) - primaryAttr(a, mode);
  });
  return (
    <div>
      <div
        className="player-row"
        style={{ color: "var(--text-dim)", fontSize: 11, letterSpacing: 1 }}
      >
        <div>位置</div>
        <div>姓名</div>
        <div className="ovr">{mode === "pitcher" ? "投" : "打"}</div>
        <div className="ovr">{mode === "pitcher" ? "控" : "守"}</div>
        <div className="ovr">速</div>
        <div className="ovr">齡</div>
      </div>
      {sorted.map((p) => {
        const inj = p.injury && p.injury.daysOut > 0;
        return (
          <div className="player-row" key={p.id}>
            <div className="pos">{p.position}</div>
            <div className={`name ${inj ? "injured" : ""}`}>
              {p.name}
              {isStarting(p) && (
                <span style={{ color: "var(--accent)", marginLeft: 4 }}>★</span>
              )}
            </div>
            <div className="ovr">
              {mode === "pitcher" ? p.pitching : p.hitting}
            </div>
            <div className="ovr">
              {mode === "pitcher" ? p.stamina : p.fielding}
            </div>
            <div className="ovr">{p.stamina}</div>
            <div className="ovr" style={{ color: "var(--text-dim)" }}>
              {p.age}
            </div>
            {inj && (
              <div className="injury-tag">
                ⚠ {p.injury!.reason} · 剩 {p.injury!.daysOut} 天
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function primaryAttr(p: Player, mode: "hitter" | "pitcher"): number {
  return mode === "pitcher" ? p.pitching : p.hitting;
}

export type { Position };
