import { useApp } from "../store";

export default function Playoffs() {
  const league = useApp((s) => s.league)!;
  const tick = useApp((s) => s.simulatePlayoffsStep);
  const teamLookup = new Map(league.teams.map((t) => [t.id, t]));

  const dsSeries = league.playoffs.filter((s) => s.round === "DS");
  const csSeries = league.playoffs.filter((s) => s.round === "CS");

  const allDsDone = dsSeries.every((s) => s.winnerTeamId);
  const allCsDone = csSeries.length > 0 && csSeries.every((s) => s.winnerTeamId);
  const canStep = !allCsDone;

  return (
    <div>
      <div className="page-header">
        <h1>季後賽</h1>
        <span className="sub">七戰四勝 · 系列賽勝者晉級</span>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn" onClick={tick} disabled={!canStep}>
            模擬下一場
          </button>
        </div>
      </div>

      <div className="bracket">
        <div className="bracket-column">
          <div style={{ color: "var(--text-dim)", letterSpacing: 2, fontSize: 12 }}>
            分區系列賽
          </div>
          {dsSeries.map((s, i) => (
            <SeriesCard
              key={i}
              series={s}
              teamLookup={teamLookup}
              userTeamId={league.userTeamId!}
            />
          ))}
        </div>
        <div className="bracket-column">
          <div style={{ color: "var(--text-dim)", letterSpacing: 2, fontSize: 12 }}>
            冠軍賽
          </div>
          {csSeries.length === 0 ? (
            <div
              className="series-card"
              style={{ color: "var(--text-dim)", textAlign: "center" }}
            >
              {allDsDone ? "推進中..." : "等待分區賽結束"}
            </div>
          ) : (
            csSeries.map((s, i) => (
              <SeriesCard
                key={i}
                series={s}
                teamLookup={teamLookup}
                userTeamId={league.userTeamId!}
              />
            ))
          )}
        </div>
        <div className="bracket-column">
          <div style={{ color: "var(--text-dim)", letterSpacing: 2, fontSize: 12 }}>
            冠軍
          </div>
          <div
            className="series-card"
            style={{ textAlign: "center", padding: 32 }}
          >
            {league.championTeamId ? (
              <ChampionPreview teamLookup={teamLookup} id={league.championTeamId} />
            ) : (
              <div style={{ color: "var(--text-dim)" }}>?</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChampionPreview({
  teamLookup,
  id,
}: {
  teamLookup: Map<string, { abbr: string; city: string; name: string; color: string }>;
  id: string;
}) {
  const t = teamLookup.get(id)!;
  return (
    <div>
      <div style={{ fontSize: 32 }}>🏆</div>
      <div style={{ color: t.color, fontSize: 18, fontWeight: 800 }}>
        {t.city}{t.name}
      </div>
    </div>
  );
}

function SeriesCard({
  series,
  teamLookup,
  userTeamId,
}: {
  series: import("../game/types").PlayoffSeries;
  teamLookup: Map<string, { abbr: string; city: string; name: string; color: string }>;
  userTeamId: string;
}) {
  const high = teamLookup.get(series.highSeedTeamId)!;
  const low = teamLookup.get(series.lowSeedTeamId)!;
  const winner = series.winnerTeamId;
  return (
    <div className="series-card">
      <h3>{series.label}</h3>
      <div className={`series-row ${winner === high.abbr || winner === series.highSeedTeamId ? "winner" : ""}`}>
        <span style={{ color: high.color, fontWeight: 700 }}>
          {high.abbr} {high.city}{high.name}
          {series.highSeedTeamId === userTeamId && " (你)"}
        </span>
        <span className="wins">{series.highSeedWins}</span>
      </div>
      <div className={`series-row ${winner === series.lowSeedTeamId ? "winner" : ""}`}>
        <span style={{ color: low.color, fontWeight: 700 }}>
          {low.abbr} {low.city}{low.name}
          {series.lowSeedTeamId === userTeamId && " (你)"}
        </span>
        <span className="wins">{series.lowSeedWins}</span>
      </div>
      {winner && (
        <div style={{ color: "var(--accent)", fontSize: 12, marginTop: 8 }}>
          晉級
        </div>
      )}
    </div>
  );
}
