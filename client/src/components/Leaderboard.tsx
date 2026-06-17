import React from "react";
import type { LeaderboardEntry } from "../socket";
import "./Leaderboard.css";

interface Props {
  entries: LeaderboardEntry[];
  myId: string | null;
  totalCells: number;
}

export default function Leaderboard({ entries, myId, totalCells }: Props) {
  const totalClaimed = entries.reduce((s, e) => s + e.score, 0);

  return (
    <aside className="leaderboard">
      <div className="leaderboard__header">
        <span className="leaderboard__title">Leaderboard</span>
        <span className="leaderboard__sub">
          {totalClaimed}/{totalCells} claimed
        </span>
      </div>

      <div className="leaderboard__progress-track">
        <div
          className="leaderboard__progress-fill"
          style={{ width: `${(totalClaimed / totalCells) * 100}%` }}
        />
      </div>

      <ul className="leaderboard__list">
        {entries.length === 0 && (
          <li className="leaderboard__empty">No captures yet</li>
        )}
        {entries.map((entry, i) => {
          const pct = totalCells > 0 ? (entry.score / totalCells) * 100 : 0;
          return (
            <li
              key={entry.id}
              className={[
                "leaderboard__item",
                entry.id === myId ? "leaderboard__item--me" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="leaderboard__rank">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <span
                className="leaderboard__dot"
                style={{ background: entry.color, boxShadow: `0 0 6px ${entry.color}` }}
              />
              <span className="leaderboard__name">{entry.name}</span>
              <span className="leaderboard__score">{entry.score}</span>

              {/* progress bar */}
              <div className="leaderboard__bar-track">
                <div
                  className="leaderboard__bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: entry.color,
                    boxShadow: `0 0 6px ${entry.color}40`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
