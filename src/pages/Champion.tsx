import { useApp } from "../store";

export default function Champion() {
  const league = useApp((s) => s.league)!;
  const reset = useApp((s) => s.reset);
  const champ = league.teams.find((t) => t.id === league.championTeamId);
  const isUser = league.championTeamId === league.userTeamId;
  if (!champ) return null;

  return (
    <div className="champion-screen">
      <div className="trophy">🏆</div>
      <h1>冠軍</h1>
      <div style={{ fontSize: 28, color: champ.color, fontWeight: 800, marginBottom: 8 }}>
        {champ.city}{champ.name}
      </div>
      <div style={{ color: "var(--text-dim)", marginBottom: 32 }}>
        {isUser
          ? "恭喜你帶領球隊奪下冠軍!王朝之路已經開啟。"
          : "你的球隊本季止步,期待下個賽季捲土重來。"}
      </div>
      <button className="btn" onClick={reset}>
        開啟新賽季
      </button>
    </div>
  );
}
