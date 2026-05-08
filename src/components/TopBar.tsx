import { useApp, useUserTeam } from "../store";

export default function TopBar() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const league = useApp((s) => s.league);
  const team = useUserTeam();
  const reset = useApp((s) => s.reset);

  const inPlayoffs = league?.phase === "playoffs" || league?.phase === "champion";

  return (
    <header className="topbar">
      <div className="brand">
        棒球<span className="alt">經理人</span>
      </div>
      <nav className="nav">
        <button
          className={view === "dashboard" ? "active" : ""}
          onClick={() => setView("dashboard")}
        >
          儀表板
        </button>
        <button
          className={view === "standings" ? "active" : ""}
          onClick={() => setView("standings")}
        >
          戰績榜
        </button>
        <button
          className={view === "roster" ? "active" : ""}
          onClick={() => setView("roster")}
        >
          球員名單
        </button>
        {inPlayoffs && (
          <button
            className={view === "playoffs" || view === "champion" ? "active" : ""}
            onClick={() => setView(league?.phase === "champion" ? "champion" : "playoffs")}
          >
            季後賽
          </button>
        )}
        <button onClick={() => {
          if (confirm("確定要重新開始?目前進度會消失。")) reset();
        }}>
          新賽季
        </button>
      </nav>
      {team && (
        <div className="team-pill">
          <span className="team-dot" style={{ background: team.color }} />
          {team.city}{team.name}
        </div>
      )}
    </header>
  );
}
