import React from "react";
import type { GamePayload, LeaderboardEntry } from "../socket";
import "./GameCompleteModal.css";

interface Props {
  game: GamePayload;
  leaderboard: LeaderboardEntry[];
  loading?: boolean;
  onStartNewGame: () => void;
}

export default function GameCompleteModal({
  game,
  leaderboard,
  loading = false,
  onStartNewGame,
}: Props) {
  const winners = game.winners ?? [];

  const handleStart = () => {
    onStartNewGame();
  };

  const winnerLabel =
    winners.length > 1
      ? "Co-winners"
      : winners.length === 1
        ? "Winner"
        : "No winner";

  return (
    <div className="game-complete-overlay" role="dialog" aria-modal="true">
      <div className="game-complete-modal">
        <div className="game-complete-modal__brand">
          <span className="game-complete-modal__logo">🏆</span>
          <h2 className="game-complete-modal__title">Game Completed</h2>
          <p className="game-complete-modal__subtitle">
            Every tile has been captured.
          </p>
        </div>

        {winners.length > 0 && (
          <div className="game-complete-modal__winners">
            <p className="game-complete-modal__winners-label">{winnerLabel}</p>
            <ul className="game-complete-modal__winner-list">
              {winners.map((w) => (
                <li key={w.id} className="game-complete-modal__winner">
                  <span
                    className="game-complete-modal__winner-dot"
                    style={{ background: w.color }}
                  />
                  <span className="game-complete-modal__winner-name">
                    {w.username}
                  </span>
                  <span className="game-complete-modal__winner-score">
                    {w.score} tiles
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="game-complete-modal__leaderboard">
            <p className="game-complete-modal__leaderboard-label">
              Final standings
            </p>
            <ol className="game-complete-modal__standings">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <li key={entry.id} className="game-complete-modal__standing">
                  <span className="game-complete-modal__rank">{i + 1}</span>
                  <span
                    className="game-complete-modal__standing-dot"
                    style={{ background: entry.color }}
                  />
                  <span className="game-complete-modal__standing-name">
                    {entry.username}
                  </span>
                  <span className="game-complete-modal__standing-score">
                    {entry.score}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <button
          type="button"
          className="game-complete-modal__btn"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? "Starting…" : "Start New Game"}
        </button>
        <p className="game-complete-modal__hint">
          Any player can start the next round for everyone.
        </p>
      </div>
    </div>
  );
}
