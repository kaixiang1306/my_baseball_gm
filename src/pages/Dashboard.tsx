import { useApp } from "../store";
import { Game, InjuryEvent } from "../game/types";
import {
  offenseRating,
  pitchingRating,
  startingPitcher,
} from "../game/lineup";

const MONTH_NAMES: Record<number, string> = {
  4: "四月",
  5: "五月",
  6: "六月",
  7: "七月",
  8: "八月",
  9: "九月",
};

export default function Dashboard() {
  const league = useApp((s) => s.league)!;
  const sim = useApp((s) => s.simulateNextGame);
  const userTeamId = league.userTeamId!;

  const month = league.currentMonth;
  const day = league.currentDay;
  const monthGames = league.schedule.filter((g) => g.month === month);
  const userTeam = league.teams.find((t) => t.id === userTeamId)!;
  const teamLookup = new Map(league.teams.map((t) => [t.id, t]));

  // 下一場使用者比賽 = 當前 month/day 的使用者比賽
  const nextGame = monthGames.find(
    (g) =>
      g.day === day &&
      (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId),
  );

  // 上一場結果 (剛模擬完的那場)
  const lastUserGame = [...league.schedule]
    .reverse()
    .find(
      (g) =>
        g.played &&
        (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId),
    );

  const userPlayedGames = league.schedule.filter(
    (g) =>
      g.played &&
      (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId),
  );
  const wins = userPlayedGames.filter((g) => didUserWin(g, userTeamId)).length;
  const losses = userPlayedGames.length - wins;

  const monthPlayed = monthGames.filter(
    (g) =>
      g.played &&
      (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId),
  );
  const monthWins = monthPlayed.filter((g) => didUserWin(g, userTeamId)).length;
  const monthLosses = monthPlayed.length - monthWins;

  return (
    <div>
      <div className="page-header">
        <h1>{userTeam.city}{userTeam.name}</h1>
        <span className="sub">
          全季 {wins}-{losses} · 本月 {monthWins}-{monthLosses}
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn" onClick={sim} disabled={!nextGame}>
            {nextGame ? `模擬 ${MONTH_NAMES[month]} ${day} 日比賽` : "本季已結束"}
          </button>
        </div>
      </div>

      {nextGame && (
        <NextGameCard game={nextGame} userTeamId={userTeamId} />
      )}

      {lastUserGame && (
        <LastGameRecap game={lastUserGame} userTeamId={userTeamId} />
      )}

      <div className="month-header" style={{ marginTop: 20 }}>
        <div className="month-name">{MONTH_NAMES[month]}</div>
        <div style={{ color: "var(--text-dim)" }}>
          目前在第 {day} / 27 天
        </div>
      </div>

      <Calendar
        games={monthGames}
        userTeamId={userTeamId}
        currentDay={day}
        teamLookup={teamLookup}
      />
    </div>
  );
}

function NextGameCard({
  game,
  userTeamId,
}: {
  game: Game;
  userTeamId: string;
}) {
  const league = useApp((s) => s.league)!;
  const teamLookup = new Map(league.teams.map((t) => [t.id, t]));
  const isHome = game.homeTeamId === userTeamId;
  const opp = teamLookup.get(isHome ? game.awayTeamId : game.homeTeamId)!;
  const me = teamLookup.get(userTeamId)!;
  const myOff = Math.round(offenseRating(me));
  const myPit = Math.round(pitchingRating(me));
  const oppOff = Math.round(offenseRating(opp));
  const oppPit = Math.round(pitchingRating(opp));
  const mySP = startingPitcher(me);
  const oppSP = startingPitcher(opp);

  return (
    <div
      className="series-card"
      style={{ display: "flex", gap: 24, alignItems: "center", padding: 20 }}
    >
      <div style={{ flex: 1, textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1 }}>
          {isHome ? "主場" : "客場"}
        </div>
        <div style={{ color: me.color, fontSize: 22, fontWeight: 800 }}>
          {me.abbr}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {me.city}{me.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
          打 {myOff} / 投 {myPit}
        </div>
        {mySP && (
          <div style={{ fontSize: 11, marginTop: 4 }}>
            先發 <strong>{mySP.name}</strong> ({mySP.pitching})
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 24,
          letterSpacing: 4,
          color: "var(--accent)",
          fontWeight: 800,
        }}
      >
        VS
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: 1 }}>
          {isHome ? "客場" : "主場"}
        </div>
        <div style={{ color: opp.color, fontSize: 22, fontWeight: 800 }}>
          {opp.abbr}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {opp.city}{opp.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
          打 {oppOff} / 投 {oppPit}
        </div>
        {oppSP && (
          <div style={{ fontSize: 11, marginTop: 4 }}>
            先發 <strong>{oppSP.name}</strong> ({oppSP.pitching})
          </div>
        )}
      </div>
    </div>
  );
}

function LastGameRecap({
  game,
  userTeamId,
}: {
  game: Game;
  userTeamId: string;
}) {
  const league = useApp((s) => s.league)!;
  const teamLookup = new Map(league.teams.map((t) => [t.id, t]));
  const isHome = game.homeTeamId === userTeamId;
  const opp = teamLookup.get(isHome ? game.awayTeamId : game.homeTeamId)!;
  const myScore = isHome ? game.homeScore! : game.awayScore!;
  const oppScore = isHome ? game.awayScore! : game.homeScore!;
  const won = myScore > oppScore;
  const myInjuries: InjuryEvent[] =
    game.injuries?.filter((i) => i.teamId === userTeamId) ?? [];

  return (
    <div className="events" style={{ marginTop: 16 }}>
      <h3>上一場結果 · {MONTH_NAMES[game.month] ?? `${game.month}月`} {game.day} 日</h3>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "8px 0",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: won ? "var(--win)" : "var(--loss)",
            letterSpacing: 2,
          }}
        >
          {won ? "勝" : "敗"} {myScore}-{oppScore}
        </div>
        <div style={{ color: "var(--text-dim)" }}>
          對 <span style={{ color: opp.color, fontWeight: 700 }}>{opp.abbr}</span> {opp.city}{opp.name}
        </div>
      </div>
      {myInjuries.map((inj, i) => (
        <div key={i} className="event-row injury">
          <div className="icon">!</div>
          <div>
            <strong>{inj.playerName}</strong> · {inj.reason} · 預估缺賽 {inj.daysOut} 天
          </div>
        </div>
      ))}
    </div>
  );
}

function didUserWin(g: Game, userTeamId: string): boolean {
  if (!g.played) return false;
  const isHome = g.homeTeamId === userTeamId;
  const myScore = isHome ? g.homeScore! : g.awayScore!;
  const oppScore = isHome ? g.awayScore! : g.homeScore!;
  return myScore > oppScore;
}

function Calendar({
  games,
  userTeamId,
  currentDay,
  teamLookup,
}: {
  games: Game[];
  userTeamId: string;
  currentDay: number;
  teamLookup: Map<string, { abbr: string; color: string }>;
}) {
  const byDay = new Map<number, Game[]>();
  for (const g of games) {
    if (!byDay.has(g.day)) byDay.set(g.day, []);
    byDay.get(g.day)!.push(g);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <div className="calendar">
      {days.map((d) => {
        const dayGames = byDay.get(d)!;
        const userGame = dayGames.find(
          (g) => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId,
        );
        const isCurrent = d === currentDay;
        if (!userGame) {
          return (
            <div key={d} className={`cal-cell ${isCurrent ? "current-day" : ""}`}>
              <div className="day-label">日 {d}</div>
              <div className="matchup" style={{ color: "var(--text-dim)" }}>
                休息
              </div>
            </div>
          );
        }
        const isHome = userGame.homeTeamId === userTeamId;
        const opp = teamLookup.get(
          isHome ? userGame.awayTeamId : userGame.homeTeamId,
        )!;
        const myScore = isHome ? userGame.homeScore : userGame.awayScore;
        const oppScore = isHome ? userGame.awayScore : userGame.homeScore;
        const win = userGame.played && (myScore ?? 0) > (oppScore ?? 0);
        const loss = userGame.played && (myScore ?? 0) < (oppScore ?? 0);
        return (
          <div
            key={d}
            className={`cal-cell user-game ${userGame.played ? "played" : ""} ${
              isCurrent ? "current-day" : ""
            }`}
          >
            <div className="day-label">日 {d}</div>
            <div className="matchup">
              {isHome ? "vs" : "@"}{" "}
              <span style={{ color: opp.color }}>{opp.abbr}</span>
            </div>
            {userGame.played ? (
              <div className={`score ${win ? "win" : loss ? "loss" : "neutral"}`}>
                {win ? "W " : "L "}
                {myScore}-{oppScore}
              </div>
            ) : (
              <div className="score neutral">--</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
