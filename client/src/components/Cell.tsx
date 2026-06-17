import React, { memo, useCallback, useRef } from "react";
import type { CellPayload } from "../socket";
import "./Cell.css";

interface Props {
  cell: CellPayload;
  isMe: boolean;
  isCooldown: boolean;
  disabled?: boolean;
  onClaim: (row: number, col: number) => void;
}

function Cell({ cell, isMe, isCooldown, disabled, onClaim }: Props) {
  const claimed = cell.ownerId !== null;
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (disabled || claimed || isCooldown) return;
    const el = ref.current;
    if (el) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
    onClaim(cell.row, cell.col);
  }, [cell.row, cell.col, disabled, claimed, isCooldown, onClaim]);

  const title = claimed
    ? `Captured by ${cell.ownerName}${isMe ? " (you)" : ""}${
        cell.capturedAt
          ? ` • ${new Date(cell.capturedAt).toLocaleTimeString()}`
          : ""
      }`
    : "Click to capture";

  return (
    <button
      ref={ref}
      disabled={claimed || disabled}
      className={[
        "cell",
        claimed ? "cell--claimed" : "cell--empty",
        isMe ? "cell--mine" : "",
        !claimed && isCooldown ? "cell--cooldown" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        claimed
          ? ({
              "--cell-color": cell.ownerColor ?? "#6366f1",
            } as React.CSSProperties)
          : undefined
      }
      onClick={handleClick}
      title={title}
      aria-label={title}
    />
  );
}

export default memo(Cell);
