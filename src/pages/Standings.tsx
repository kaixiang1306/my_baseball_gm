import { useApp } from "../store";
import { gamesBack, winPct } from "../game/sim";

export default function Standings() {
  const league = useApp((s) => s.league)!;
  const sortedStandings = Object.values(league.standings)
    .slice()
    .sort((a, b) => {
      const wp = winPct(b) - winPct(a);
      if (wp !== 0) return wp;
      return b.wins - a.wins;
    });
  const leader = sortedStandings[0];
  const teamLookup = new Map(league.teams.map((t) => [t.id, t]));

  return (
    <div>
      <div className="page-header">
        <h1>戰績榜</h1>
        <span className="sub">前 4 名晉級季後賽 (★)</span>
      </div>
      <table className="standings-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>球隊</th>
            <th>勝</th>
            <th>負</th>
            <th>勝率</th>
            <th>勝差</th>
            <th>得分</th>
            <th>失分</th>
            <th>連勝/負</th>
            <th>近 10 場</th>
          </tr>
        </thead>
        <tbody>
          {sortedStandings.map((s, i) => {
            const t = teamLookup.get(s.teamId)!;
            const isUser = s.teamId === league.userTeamId;
            const inPlayoff = i < 4;
            return (
              <tr
                key={s.teamId}
                className={`${isUser ? "user-row" : ""} ${inPlayoff ? "playoff-row" : ""}`}
              >
                <td>{i + 1}</td>
                <td>
                  <span style={{ color: t.color, fontWeight: 700 }}>
                    {t.abbr}
                  </span>{" "}
                  {t.city}{t.name}
                </td>
                <td>{s.wins}</td>
                <td>{s.losses}</td>
                <td>{winPct(s).toFixed(3).slice(1)}</td>
                <td>{i === 0 ? "-" : gamesBack(leader, s).toFixed(1)}</td>
                <td>{s.runsScored}</td>
                <td>{s.runsAllowed}</td>
                <td>
                  {s.streak.count > 0 ? `${s.streak.count}${s.streak.type}` : "-"}
                </td>
                <td>
                  <div className="last10">
                    {s.last10.map((r, j) => (
                      <span key={j} className={r} />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
