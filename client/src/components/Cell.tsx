import React, { memo, useCallback, useRef } from "react";
import type { CellPayload } from "../socket";
import "./Cell.css";

interface Props {
  cell: CellPayload;
  isMe: boolean;
  isCooldown: boolean;
  onClaim: (row: number, col: number) => void;
}

function Cell({ cell, isMe, isCooldown, onClaim }: Props) {
  const claimed = cell.ownerId !== null;
  const ref = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    if (isCooldown && !isMe) return;
    const el = ref.current;
    if (el) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }
    onClaim(cell.row, cell.col);
  }, [cell.row, cell.col, isMe, isCooldown, onClaim]);

  const title = claimed
    ? `${cell.ownerName}${isMe ? " (you)" : ""} • ${
        cell.capturedAt ? new Date(cell.capturedAt).toLocaleTimeString() : ""
      }`
    : "Unclaimed — click to capture";

  return (
    <button
      ref={ref}
      className={[
        "cell",
        claimed ? "cell--claimed" : "cell--empty",
        isMe ? "cell--mine" : "",
        isCooldown && !isMe ? "cell--locked" : "",
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
