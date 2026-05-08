import { useApp } from "./store";
import SelectScreen from "./pages/SelectScreen";
import Dashboard from "./pages/Dashboard";
import Standings from "./pages/Standings";
import Roster from "./pages/Roster";
import Playoffs from "./pages/Playoffs";
import Champion from "./pages/Champion";
import TopBar from "./components/TopBar";

export default function App() {
  const view = useApp((s) => s.view);
  const league = useApp((s) => s.league);

  if (!league || !league.userTeamId) {
    return (
      <div className="app-shell">
        <SelectScreen />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar />
      <main className="content">
        {view === "dashboard" && <Dashboard />}
        {view === "standings" && <Standings />}
        {view === "roster" && <Roster />}
        {view === "playoffs" && <Playoffs />}
        {view === "champion" && <Champion />}
        {view === "select" && <SelectScreen />}
      </main>
    </div>
  );
}
