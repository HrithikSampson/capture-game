import React from "react";
import type { UserPayload } from "../socket";
import "./Header.css";

interface Props {
  me: UserPayload | null;
  onlineCount: number;
  cooldownMs: number;
  totalCells: number;
}

export default function Header({ me, onlineCount, cooldownMs, totalCells }: Props) {
  const cooldownPct = Math.max(0, Math.min(100, (cooldownMs / 1500) * 100));
  const isCooling = cooldownMs > 0;

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">⬛</span>
        <span className="header__title">Capture</span>
      </div>

      <div className="header__center">
        {me && (
          <div className="header__user">
            <span
              className="header__color-dot"
              style={{ background: me.color, boxShadow: `0 0 8px ${me.color}` }}
            />
            <span className="header__username">{me.name}</span>
            <span className="header__score">
              {me.score}
              <span className="header__score-label"> tiles</span>
            </span>
          </div>
        )}
        {isCooling && (
          <div className="header__cooldown">
            <div
              className="header__cooldown-bar"
              style={{ width: `${cooldownPct}%` }}
            />
          </div>
        )}
      </div>

      <div className="header__meta">
        <div className="header__stat">
          <span className="header__stat-value">{onlineCount}</span>
          <span className="header__stat-label">online</span>
        </div>
        <div className="header__stat">
          <span className="header__stat-value">{totalCells}</span>
          <span className="header__stat-label">tiles</span>
        </div>
      </div>
    </header>
  );
}
