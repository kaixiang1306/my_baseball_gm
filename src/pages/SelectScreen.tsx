import { useApp } from "../store";
import { offenseRating, pitchingRating } from "../game/lineup";

export default function SelectScreen() {
  const league = useApp((s) => s.league);
  const newGame = useApp((s) => s.newGame);
  const pickTeam = useApp((s) => s.pickTeam);

  if (!league) {
    return (
      <div className="welcome">
        <h1>棒球 經理人</h1>
        <div className="tagline">建立你的王朝。從選一支球隊開始。</div>
        <button className="btn" onClick={() => newGame()}>
          開始新賽季
        </button>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-header">
        <h1>選擇你要執掌的球隊</h1>
        <span className="sub">12 支球隊隨機生成 · 賽季 162 場</span>
      </div>
      <div className="team-grid">
        {league.teams.map((t) => {
          const off = Math.round(offenseRating(t));
          const pit = Math.round(pitchingRating(t));
          return (
            <div
              key={t.id}
              className="team-card"
              onClick={() => pickTeam(t.id)}
            >
              <div className="badge" style={{ background: t.color }}>
                {t.abbr}
              </div>
              <div className="name">{t.city}{t.name}</div>
              <div className="meta">{t.players.length} 名球員</div>
              <div className="stats">
                <span>打擊 {off}</span>
                <span>投手 {pit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
